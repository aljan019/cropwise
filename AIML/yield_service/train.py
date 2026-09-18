"""Train the tonnes-per-hectare crop-yield model without production leakage."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor


FEATURE_COLUMNS = ["State", "District", "Crop", "Year", "Season", "Area"]
CATEGORICAL_COLUMNS = ["State", "District", "Crop", "Year", "Season"]
NUMERIC_COLUMNS = ["Area"]
TARGET_COLUMN = "Yield"


def start_year(year: str) -> int:
    return int(str(year).strip().split("-")[0])


def load_clean_data(csv_path: Path) -> pd.DataFrame:
    data = pd.read_csv(csv_path)
    data = data.loc[
        (data["Production Units"] == "Tonnes")
        & (data["Area Units"] == "Hectare")
    ].copy()

    data = data.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    data["Area"] = pd.to_numeric(data["Area"], errors="coerce")
    data[TARGET_COLUMN] = pd.to_numeric(data[TARGET_COLUMN], errors="coerce")
    data = data.dropna(subset=["Area", TARGET_COLUMN])
    data = data.loc[(data["Area"] > 0) & (data[TARGET_COLUMN] >= 0)].copy()
    data["start_year"] = data["Year"].map(start_year)
    return data


def metrics(y_true: pd.Series, predicted_log_yield) -> dict[str, float]:
    predictions = np.maximum(0.0, np.expm1(predicted_log_yield))
    return {
        "mae_tonnes_per_hectare": round(float(mean_absolute_error(y_true, predictions)), 4),
        "rmse_tonnes_per_hectare": round(float(mean_squared_error(y_true, predictions) ** 0.5), 4),
        "raw_r2": round(float(r2_score(y_true, predictions)), 4),
        "log_r2": round(float(r2_score(np.log1p(y_true), predicted_log_yield)), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--output-dir", default=Path("artifacts"), type=Path)
    args = parser.parse_args()

    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    data = load_clean_data(args.data)

    # Chronological split: only evaluate on future crop years unseen during training.
    years = sorted(data["start_year"].unique())
    if len(years) < 6:
        raise ValueError("At least six crop years are required for a chronological split.")
    test_years = years[-3:]
    validation_years = years[-6:-3]
    train = data.loc[~data["start_year"].isin(validation_years + test_years)].copy()
    validation = data.loc[data["start_year"].isin(validation_years)].copy()
    test = data.loc[data["start_year"].isin(test_years)].copy()

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLUMNS),
            ("numeric", "passthrough", NUMERIC_COLUMNS),
        ]
    )
    regressor = XGBRegressor(
        n_estimators=650,
        learning_rate=0.045,
        max_depth=9,
        min_child_weight=4,
        subsample=0.85,
        colsample_bytree=0.9,
        reg_lambda=3.0,
        objective="reg:squarederror",
        tree_method="hist",
        n_jobs=-1,
        random_state=42,
    )
    pipeline = Pipeline([("preprocessor", preprocessor), ("regressor", regressor)])
    pipeline.fit(train[FEATURE_COLUMNS], np.log1p(train[TARGET_COLUMN]))

    validation_predictions = pipeline.predict(validation[FEATURE_COLUMNS])
    test_predictions = pipeline.predict(test[FEATURE_COLUMNS])
    report = {
        "target": "log1p(Yield)",
        "output_unit": "tonnes per hectare",
        "uses_production_input": False,
        "feature_columns": FEATURE_COLUMNS,
        "rows_after_cleaning": int(len(data)),
        "rows": {"train": int(len(train)), "validation": int(len(validation)), "test": int(len(test))},
        "years": {"train": [int(x) for x in years[:-6]], "validation": [int(x) for x in validation_years], "test": [int(x) for x in test_years]},
        "validation": metrics(validation[TARGET_COLUMN], validation_predictions),
        "test": metrics(test[TARGET_COLUMN], test_predictions),
        "cleaning": {
            "production_units": "Tonnes only",
            "area_units": "Hectare only",
            "dropped_missing": FEATURE_COLUMNS + [TARGET_COLUMN],
            "kept_zero_yield": True,
            "dropped_area_less_than_or_equal_to_zero": True,
        },
    }

    # Refit after evaluation so the deployed model can learn from every historical row.
    pipeline.fit(data[FEATURE_COLUMNS], np.log1p(data[TARGET_COLUMN]))
    joblib.dump(pipeline, output_dir / "yield_model.joblib")
    (output_dir / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (output_dir / "known_values.json").write_text(
        json.dumps(
            {
                column: sorted(data[column].astype(str).unique().tolist())
                for column in CATEGORICAL_COLUMNS
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))

    if report["test"]["log_r2"] < 0.70:
        raise SystemExit("Test log-scale R2 did not reach the requested 0.70 threshold.")


if __name__ == "__main__":
    main()
