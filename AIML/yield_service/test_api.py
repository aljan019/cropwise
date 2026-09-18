from fastapi.testclient import TestClient

from app import app


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["model_loaded"] is True


def test_prediction() -> None:
    payload = {
        "state": "Gujarat",
        "district": "Ahmedabad",
        "crop": "Wheat",
        "year": "2020-21",
        "season": "Rabi",
        "area": 2.0,
    }
    response = TestClient(app).post("/yield/predict", json=payload)
    assert response.status_code == 200
    assert response.json()["predicted_yield"] >= 0
