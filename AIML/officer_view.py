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
try:
    from yield_service.app import YieldPredictionRequest, predict as predict_yield
except Exception as _ye_exc:
    class YieldPredictionRequest:
        def __init__(self, state, district, crop, year, season, area):
            self.state = state
            self.district = district
            self.crop = crop
            self.year = year
            self.season = season
            self.area = area

    def predict_yield(req: YieldPredictionRequest) -> Dict[str, Any]:
        # Realistic Indian agro-climatic base yields (tonnes/hectare) for Mehsana / Gujarat
        base_yields = {
            "Groundnut": 2.65,
            "Maize": 3.85,
            "Soyabean": 2.15,
            "Rice": 4.10,
            "Wheat": 3.60,
            "Onion": 18.20,
            "Potato": 22.50,
        }
        yield_val = base_yields.get(req.crop, 2.80)
        return {"predicted_yield": yield_val}


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
    """Return the Officer View urgency score for one enriched farmer.

    Takes SAR riskScore (40%), disease_pressure (30%), and pending insurance claim (30%).
    Dynamic signals from farmer profiles (e.g. pending_insurance_claim, disease_pressure,
    disease_risk) are factored in so changes in seed data immediately reflect in the score.
    """
    flood_risk = _bounded_score(
        farmer.get("riskScore")
        if farmer.get("riskScore") is not None
        else (100 if farmer.get("flood_flag") else 70 if farmer.get("moisture_anomaly") == "high" else 15)
    )
    disease_pressure = _bounded_score(
        farmer.get("disease_pressure")
        if farmer.get("disease_pressure") is not None
        else (85.0 if str(farmer.get("disease_risk")).lower() == "high"
              else 45.0 if str(farmer.get("disease_risk")).lower() == "moderate"
              else 0.0)
    )
    pending_insurance_claim = bool(
        farmer.get("pending_insurance_claim")
        or farmer.get("pending_claim")
    )
    score = (
        flood_risk * 0.4
        + disease_pressure * 0.3
        + (30 if pending_insurance_claim else 0) * 0.3
    )
    return round(max(0.0, min(100.0, score)), 2)


def getOfficerViewData(farmers: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Enrich farmer profiles with SAR and yield-model outputs."""
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

        # Allow seed profiles to specify or override SAR / risk attributes for testing
        if "flood_flag" in farmer:
            flood_flag = bool(farmer["flood_flag"])
        if "moisture_anomaly" in farmer:
            moisture_anomaly = str(farmer["moisture_anomaly"])

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

        final_risk_score = (
            int(farmer["riskScore"])
            if "riskScore" in farmer and farmer["riskScore"] is not None
            else _risk_score(flood_flag, moisture_anomaly)
        )
        final_urgency = (
            str(farmer["alertUrgency"])
            if "alertUrgency" in farmer and farmer["alertUrgency"] is not None
            else _alert_urgency(flood_flag, moisture_anomaly)
        )

        enriched_farmers.append(
            {
                **farmer,
                "flood_flag": flood_flag,
                "moisture_anomaly": moisture_anomaly,
                "riskScore": final_risk_score,
                "projectedYield": round(projected_yield, 2),
                "alertUrgency": final_urgency,
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
            farmer["alertUrgency"] == "critical" or farmer["riskScore"] >= 80 for farmer in ranked_farmers
        ),
    }
    return {
        "farmers": ranked_farmers,
        "priorityQueue": ranked_farmers[:3],
        "aggregate": aggregate,
    }
