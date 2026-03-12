"""Training pipeline for the Random Forest property price model.

Usage:
    cd backend
    python -m app.ml.train_model
"""

import os
import sys
import json
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Ensure project root is on path when run as module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.ml.preprocess import (
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    ALL_FEATURES,
    TARGET_COLUMN,
    build_preprocessor,
)
from app.ml.model_registry import save_artifact, register_model
from app.core.config import settings
from app.db.session import SessionLocal


def load_training_data() -> pd.DataFrame:
    """Load the Melbourne housing CSV dataset."""
    csv_path = settings.csv_file_path
    # Try the path as-is first (works if running from backend/ with correct .env)
    if not os.path.exists(csv_path):
        # Try relative to the backend directory
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            settings.csv_file_path,
        )
    if not os.path.exists(csv_path):
        # Try from project root (one level above backend/)
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "melb_data.csv",
        )
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found. Tried: {settings.csv_file_path}")
    df = pd.read_csv(csv_path)
    return df


def prepare_data(df: pd.DataFrame):
    """Clean data and prepare feature/target arrays."""
    # Drop rows without price
    df = df.dropna(subset=[TARGET_COLUMN]).copy()

    # Remove extreme outliers (price < 50k or > 10M)
    df = df[(df[TARGET_COLUMN] >= 50_000) & (df[TARGET_COLUMN] <= 10_000_000)]

    X = df[ALL_FEATURES].copy()
    y = df[TARGET_COLUMN].copy()
    return X, y


def train(test_size: float = 0.2, random_state: int = 42, n_estimators: int = 100):
    """Train a RandomForest model and register it."""
    print("Loading training data...")
    df = load_training_data()
    print(f"  Dataset shape: {df.shape}")

    print("Preparing features...")
    X, y = prepare_data(df)
    print(f"  Training samples after cleaning: {len(X)}")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    print(f"  Train: {len(X_train)}, Validation: {len(X_val)}")

    print("Building preprocessing pipeline...")
    preprocessor = build_preprocessor()

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=-1,
        )),
    ])

    print("Training Random Forest model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = pipeline.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    rmse = np.sqrt(mean_squared_error(y_val, y_pred))
    r2 = r2_score(y_val, y_pred)

    metrics = {
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "r2": round(float(r2), 4),
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_estimators": n_estimators,
        "max_depth": 20,
    }
    print(f"  MAE:  ${mae:,.0f}")
    print(f"  RMSE: ${rmse:,.0f}")
    print(f"  R²:   {r2:.4f}")

    version_tag = datetime.now().strftime("%Y%m%d_%H%M%S")
    print("Saving model artifact...")
    artifact_path = save_artifact(pipeline, version_tag)
    print(f"  Saved to: {artifact_path}")

    print("Registering model in database...")
    db = SessionLocal()
    try:
        model_version = register_model(
            db=db,
            model_name="RandomForest_PropertyPrice",
            version=version_tag,
            algorithm="RandomForestRegressor",
            target_column=TARGET_COLUMN,
            feature_list=ALL_FEATURES,
            metrics=metrics,
            artifact_path=artifact_path,
            activate=True,
        )
        print(f"  Registered as model_version id={model_version.id}, active=True")
    finally:
        db.close()

    print("Training complete!")
    return metrics


if __name__ == "__main__":
    train()
