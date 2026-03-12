"""Pydantic schemas for the AI valuation module."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ModelVersionResponse(BaseModel):
    id: int
    model_name: str
    version: str
    algorithm: str
    target_column: str
    feature_list: Optional[List[str]] = None
    metrics: Optional[Dict[str, Any]] = None
    artifact_path: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    models: List[ModelVersionResponse]


class TrainRequest(BaseModel):
    n_estimators: int = 100
    test_size: float = 0.2


class TrainResponse(BaseModel):
    model_id: int
    version: str
    metrics: Dict[str, Any]
    message: str


class ValuationResponse(BaseModel):
    property_id: int
    predicted_price: float
    listed_price: Optional[float] = None
    valuation_label: Optional[str] = None
    valuation_gap: Optional[float] = None
    valuation_gap_percent: Optional[float] = None
    confidence_note: Optional[str] = None
    model_version_id: Optional[int] = None
    model_name: Optional[str] = None


class AIHealthResponse(BaseModel):
    status: str
    active_model: Optional[str] = None
    model_version: Optional[str] = None
    model_id: Optional[int] = None
    message: str


class CustomPredictRequest(BaseModel):
    features: Dict[str, Any]


class CustomPredictResponse(BaseModel):
    predicted_price: float
    confidence_note: str
    features_used: Dict[str, Any]
