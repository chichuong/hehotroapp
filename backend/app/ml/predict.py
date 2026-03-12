"""Inference module: load active model and predict property prices."""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, Tuple

from app.ml.preprocess import ALL_FEATURES
from app.ml.model_registry import get_active_model, load_artifact

# Cache loaded pipeline in memory to avoid reloading on every request
_cached_pipeline = None
_cached_model_id: Optional[int] = None


def load_active_pipeline(db) -> Tuple[Any, Any]:
    """Load the currently active model pipeline. Returns (pipeline, model_version) or raises."""
    global _cached_pipeline, _cached_model_id

    model_version = get_active_model(db)
    if model_version is None:
        raise RuntimeError("Không có mô hình AI nào đang hoạt động.")

    if _cached_pipeline is not None and _cached_model_id == model_version.id:
        return _cached_pipeline, model_version

    pipeline = load_artifact(model_version.artifact_path)
    _cached_pipeline = pipeline
    _cached_model_id = model_version.id
    return pipeline, model_version


def invalidate_cache():
    """Clear the cached pipeline (e.g., after activating a new model)."""
    global _cached_pipeline, _cached_model_id
    _cached_pipeline = None
    _cached_model_id = None


def predict_single(pipeline, features: Dict[str, Any]) -> float:
    """Predict price for a single property from a feature dict."""
    df = pd.DataFrame([features])
    # Ensure all expected columns exist
    for col in ALL_FEATURES:
        if col not in df.columns:
            df[col] = None

    df = df[ALL_FEATURES]
    prediction = pipeline.predict(df)[0]
    return max(float(prediction), 0)
