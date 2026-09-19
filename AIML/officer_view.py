"""Aggregate existing SAR and yield services for the Officer View."""

from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List


BASE_DIR = Path(__file__).resolve().parent
SAR_DIR = BASE_DIR.parent / "sar_processing"
if str(SAR_DIR) not in sys.path:
    sys.path.insert(0, str(SAR_DIR))

from anomaly_detection import detect_flood, detect_moisture_anomaly
from config import MOISTURE_DELTA_THRESHOLD
from feature_extractor import compute_deltas
from gee_client import get_sar_means
from yield_service.app import YieldPredictionRequest, predict as predict_yield


ACRE_TO_HECTARE = 0.4047
MODEL_YEAR = "2020-21"


def _season_for(date: dt.date) -> str:
    """Use the same season names accepted by the existing yield endpoint."""
    if 6 <= date.month <= 10:
        return "Kharif"
    if date.month >= 11 or date.month <= 3:
        return "Rabi"
    return "Summer"


def _point_geometry(farmer: Dict[str, Any]) -> Dict[str, Any]:
    """Adapt the seed profile's GPS coordinate to the SAR client's GeoJSON input."""
    return {
        "type": "Point",
        "coordinates": [float(farmer["longitude"]), float(farmer["latitude"])],
    }


def _area_in_hectares(farmer: Dict[str, Any]) -> float:
    area = float(farmer.get("land_area") or 0)
    if area <= 0:
        raise ValueError(f"Farmer {farmer.get('id', 'unknown')} has no valid land_area")
    return area * ACRE_TO_HECTARE if str(farmer.get("land_unit", "")).lower() == "acre" else area


def _risk_score(flood_flag: bool, moisture_anomaly: str) -> int:
    """Map existing SAR classifications to a compact Officer View display score."""
    if flood_flag:
        return 100
    return {"high": 70, "low": 55, "normal": 15}.get(moisture_anomaly, 15)


def _alert_urgency(flood_flag: bool, moisture_anomaly: str) -> str:
    """Express the current SAR result using the dashboard's existing urgency labels."""
    if flood_flag:
        return "critical"
    if moisture_anomaly == "high":
        return "high"
    if moisture_anomaly == "low":
        return "medium"
    return "low"


def _bounded_score(value: Any) -> float:
    """Keep a supplied 0-100 signal safe for the Officer View formula."""
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def computeUrgencyScore(farmer: Dict[str, Any]) -> float:
    """Return the Officer View urgency score for one A3-enriched farmer.

    A3 exposes its SAR signal as ``riskScore``. It does not yet expose a
    disease-pressure score or a pending-insurance-claim flag, so those terms
    safely contribute zero until their source data is connected.
    """
    flood_risk = _bounded_score(farmer.get("riskScore"))
    disease_pressure = 0.0
    pending_insurance_claim = False
    score = (
        flood_risk * 0.4
        + disease_pressure * 0.3
        + (30 if pending_insurance_claim else 0) * 0.3
    )
    return round(max(0.0, min(100.0, score)), 2)


def getOfficerViewData(farmers: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Enrich farmer profiles with existing SAR and yield-model outputs.

    ``projectedYield`` is total expected production in tonnes, so the aggregate
    can be summed across farms. SAR is sampled for the current and preceding
    seven-day windows at each farmer's registered GPS point.
    """
    today = dt.date.today()
    seven_days = dt.timedelta(days=7)
    enriched_farmers: List[Dict[str, Any]] = []

    for farmer in farmers:
        geometry = _point_geometry(farmer)
        current_sar = get_sar_means(geometry, today - seven_days, today)
        previous_sar = get_sar_means(geometry, today - (seven_days * 2), today - seven_days)
        deltas = compute_deltas(current_sar, previous_sar)
        moisture_anomaly = detect_moisture_anomaly(
            deltas["vv_delta_7d"], MOISTURE_DELTA_THRESHOLD
        )
        flood_flag = detect_flood(current_sar.get("vv_mean"), current_sar.get("vh_mean"))

        area_hectares = _area_in_hectares(farmer)
        yield_result = predict_yield(
            YieldPredictionRequest(
                state=str(farmer["state"]),
                district=str(farmer["district"]),
                crop=str(farmer["primary_crop"]),
                year=MODEL_YEAR,
                season=_season_for(today),
                area=area_hectares,
            )
        )
        projected_yield = float(yield_result["predicted_yield"]) * area_hectares

        enriched_farmers.append(
            {
                **farmer,
                "riskScore": _risk_score(flood_flag, moisture_anomaly),
                "projectedYield": round(projected_yield, 2),
                "alertUrgency": _alert_urgency(flood_flag, moisture_anomaly),
            }
        )

    ranked_farmers = [
        {**farmer, "urgencyScore": computeUrgencyScore(farmer)}
        for farmer in enriched_farmers
    ]
    ranked_farmers.sort(key=lambda farmer: farmer["urgencyScore"], reverse=True)

    aggregate = {
        "totalProjectedYield": round(
            sum(farmer["projectedYield"] for farmer in ranked_farmers), 2
        ),
        "farmersAtCriticalRisk": sum(
            farmer["alertUrgency"] == "critical" for farmer in ranked_farmers
        ),
    }
    return {
        "farmers": ranked_farmers,
        "priorityQueue": ranked_farmers[:3],
        "aggregate": aggregate,
    }
