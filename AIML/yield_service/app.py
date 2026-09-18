"""Render-ready FastAPI service for crop-yield predictions."""

from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
ARTIFACT_DIR = Path(os.getenv("YIELD_ARTIFACT_DIR", BASE_DIR / "artifacts"))
MODEL_PATH = ARTIFACT_DIR / "yield_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"
KNOWN_VALUES_PATH = ARTIFACT_DIR / "known_values.json"

if not MODEL_PATH.exists():
    raise RuntimeError(f"Missing trained model: {MODEL_PATH}. Run train.py before starting the API.")

model = joblib.load(MODEL_PATH)
metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
known_values = json.loads(KNOWN_VALUES_PATH.read_text(encoding="utf-8"))

app = FastAPI(title="Crop Yield API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class YieldPredictionRequest(BaseModel):
    state: str = Field(min_length=1)
    district: str = Field(min_length=1)
    crop: str = Field(min_length=1)
    year: str = Field(min_length=1, examples=["2020-21"])
    season: str = Field(min_length=1)
    area: float = Field(gt=0, description="Farm area in hectares")


@app.get("/")
def root() -> dict:
    return {"service": "crop-yield-api", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": True,
        "test_log_r2": metrics["test"]["log_r2"],
        "test_raw_r2": metrics["test"]["raw_r2"],
    }


@app.get("/yield/metadata")
def metadata() -> dict:
    return {"metrics": metrics, "known_values": known_values}


@app.post("/yield/predict")
def predict(request: YieldPredictionRequest) -> dict:
    row = pd.DataFrame(
        [{
            "State": request.state.strip(),
            "District": request.district.strip(),
            "Crop": request.crop.strip(),
            "Year": request.year.strip(),
            "Season": request.season.strip(),
            "Area": request.area,
        }]
    )
    try:
        predicted_yield = max(0.0, float(np.expm1(model.predict(row)[0])))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Prediction could not be generated.") from exc

    return {
        "predicted_yield": round(predicted_yield, 4),
        "unit": "tonnes/hectare",
        "interpretation": f"Expected yield: {predicted_yield:.2f} tonnes per hectare",
        "input": request.model_dump(),
    }
