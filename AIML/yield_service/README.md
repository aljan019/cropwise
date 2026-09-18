# Crop Yield API

This service predicts crop yield in **tonnes per hectare**. It intentionally does not use `Production`, because production would leak the answer into the model. The model is trained on `log1p(Yield)` and the API converts its result back to tonnes/hectare.

## Input

`POST /yield/predict`

```json
{
  "state": "Gujarat",
  "district": "Ahmedabad",
  "crop": "Wheat",
  "year": "2020-21",
  "season": "Rabi",
  "area": 2.0
}
```

## Local run

```powershell
python train.py --data "C:\Users\Hardik\Downloads\India Agriculture Crop Production.csv"
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` to try the API.

## Deploy to Render

1. Push this folder, including `artifacts/`, to a GitHub repository.
2. In Render, select **New > Web Service**, then select the repository.
3. Select Python 3.11. Use build command `pip install -r requirements.txt` and start command `uvicorn app:app --host 0.0.0.0 --port $PORT`.
4. Set the health check path to `/health`, deploy, and open `/docs`.
5. Change `CORS_ORIGINS` from `*` to your deployed frontend URL before production use.
