from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# --- AHP Matrix Schemas ---

class AHPMatrixEntryInput(BaseModel):
    criteria_id_row: int
    criteria_id_col: int
    value: float = Field(..., gt=0, le=9)


class AHPMatrixInput(BaseModel):
    entries: List[AHPMatrixEntryInput]


class AHPMatrixEntryResponse(BaseModel):
    criteria_id_row: int
    criteria_id_col: int
    value: float

    class Config:
        from_attributes = True


class AHPMatrixResponse(BaseModel):
    id: int
    user_id: int
    entries: List[AHPMatrixEntryResponse]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- AHP Weights Schemas ---

class CriteriaWeight(BaseModel):
    criteria_id: int
    criteria_code: str
    criteria_name: str
    weight: float


class AHPWeightsResponse(BaseModel):
    weights: List[CriteriaWeight]
    lambda_max: float
    ci: float
    cr: float
    is_consistent: bool


# --- AHP Consistency Schemas ---

class AHPConsistencyResponse(BaseModel):
    lambda_max: float
    ci: float
    cr: float
    ri: float
    is_consistent: bool
    n: int
    message: str


# --- Property AHP Score Schemas ---

class CriteriaBreakdownItem(BaseModel):
    criteria_code: str
    criteria_name: str
    weight: float
    normalized_value: float
    contribution: float


class PropertyAHPScoreResponse(BaseModel):
    property_id: int
    score: float
    summary_label: str
    criteria_breakdown: List[CriteriaBreakdownItem]
    weights_used: List[CriteriaWeight]


# --- Ranking Schemas ---

class RankedPropertyItem(BaseModel):
    rank: int
    property_id: int
    title: str
    address: str
    suburb: Optional[str] = None
    price: Optional[float] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    cars: Optional[int] = None
    property_type: Optional[str] = None
    primary_image: Optional[str] = None
    ahp_score: float
    summary_label: str


class RankingResponse(BaseModel):
    items: List[RankedPropertyItem]
    total: int
