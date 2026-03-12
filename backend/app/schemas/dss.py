from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# --- Constants ---

VALID_BUYING_PURPOSES = ["Để ở", "Đầu tư", "Cho thuê", "Kết hợp ở và đầu tư"]
VALID_RISK_TOLERANCES = ["low", "medium", "high"]
VALID_PRIORITY_LEVELS = ["low", "medium", "high", "critical"]

PRIORITY_LEVEL_SCORE_MAP = {
    "low": 25.0,
    "medium": 50.0,
    "high": 75.0,
    "critical": 100.0,
}


# --- User Profile Schemas ---

class UserProfileBase(BaseModel):
    buying_purpose: Optional[str] = None
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    preferred_suburbs: Optional[List[str]] = None
    preferred_region_names: Optional[List[str]] = None
    preferred_property_types: Optional[List[str]] = None
    min_bedrooms: Optional[int] = Field(None, ge=0)
    min_bathrooms: Optional[int] = Field(None, ge=0)
    min_cars: Optional[int] = Field(None, ge=0)
    preferred_min_year_built: Optional[int] = Field(None, ge=1800, le=2100)
    risk_tolerance: Optional[str] = None
    family_size: Optional[int] = Field(None, ge=1, le=20)
    has_children: Optional[bool] = None
    work_location_text: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("buying_purpose")
    @classmethod
    def validate_buying_purpose(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_BUYING_PURPOSES:
            raise ValueError(f"Mục đích mua phải là một trong: {', '.join(VALID_BUYING_PURPOSES)}")
        return v

    @field_validator("risk_tolerance")
    @classmethod
    def validate_risk_tolerance(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_RISK_TOLERANCES:
            raise ValueError(f"Mức chấp nhận rủi ro phải là: {', '.join(VALID_RISK_TOLERANCES)}")
        return v


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Criteria Schemas ---

class CriteriaResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


# --- User Criteria Preference Schemas ---

class CriteriaPreferenceItem(BaseModel):
    criteria_id: int
    priority_level: str = "medium"

    @field_validator("priority_level")
    @classmethod
    def validate_priority_level(cls, v: str) -> str:
        if v not in VALID_PRIORITY_LEVELS:
            raise ValueError(f"Mức ưu tiên phải là: {', '.join(VALID_PRIORITY_LEVELS)}")
        return v


class CriteriaPreferencesUpdate(BaseModel):
    preferences: List[CriteriaPreferenceItem]


class CriteriaPreferenceResponse(BaseModel):
    id: int
    criteria_id: int
    criteria_code: Optional[str] = None
    criteria_name: Optional[str] = None
    priority_level: str
    priority_score: float
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CriteriaPreferencesListResponse(BaseModel):
    preferences: List[CriteriaPreferenceResponse]


# --- Fit / Matching Schemas ---

class PropertyFitResponse(BaseModel):
    property_id: int
    fit_score_basic: float  # 0-100
    budget_match: Optional[bool] = None
    location_match: Optional[bool] = None
    bedroom_match: Optional[bool] = None
    bathroom_match: Optional[bool] = None
    parking_match: Optional[bool] = None
    property_type_match: Optional[bool] = None
    year_built_match: Optional[bool] = None
    family_suitability_match: Optional[bool] = None
    matched_criteria: List[str]
    unmatched_criteria: List[str]
    summary_label: str
    summary_explanation: str


class PropertyFitBrief(BaseModel):
    fit_score_basic: float
    fit_label: str
    fit_reason_short: str


# --- Phase 6: DSS Combination / Recommendation Schemas ---

class DSSScoreBreakdownComponent(BaseModel):
    score: Optional[float] = None
    weight: float
    weighted: Optional[float] = None
    available: bool
    # AI-specific
    valuation_label: Optional[str] = None
    # Fit-specific
    matched_criteria: Optional[List[str]] = None
    unmatched_criteria: Optional[List[str]] = None


class DSSScoreBreakdown(BaseModel):
    components: dict  # {ahp: ..., ai: ..., fit: ...}
    weight_config: dict  # default weights


class PropertyDSSScoreResponse(BaseModel):
    property_id: int
    ahp_score: Optional[float] = None
    ai_score: Optional[float] = None
    fit_score_basic: Optional[float] = None
    final_score: float
    recommendation_label: str
    explanation_summary: Optional[str] = None
    breakdown: Optional[DSSScoreBreakdown] = None

    class Config:
        from_attributes = True


class RecommendedPropertyItem(BaseModel):
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
    final_score: float
    recommendation_label: str
    explanation_summary_short: Optional[str] = None

    class Config:
        from_attributes = True


class RecommendationsResponse(BaseModel):
    items: List[RecommendedPropertyItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class RecommendationRefreshResponse(BaseModel):
    message: str
    properties_scored: int


class LabelCount(BaseModel):
    label: str
    count: int


class RecommendationsSummaryResponse(BaseModel):
    total_evaluated: int
    label_counts: List[LabelCount]
    top_suburbs: List[str]
    average_final_score: Optional[float] = None
