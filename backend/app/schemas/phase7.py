from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.dss import LabelCount


class ComparisonAddRequest(BaseModel):
    property_id: int = Field(..., gt=0)


class ComparisonPropertyItem(BaseModel):
    property_id: int
    title: str
    address: str
    suburb: Optional[str] = None
    property_type: Optional[str] = None
    primary_image: Optional[str] = None
    price: Optional[float] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    cars: Optional[int] = None
    year_built: Optional[int] = None
    ahp_score: Optional[float] = None
    predicted_price: Optional[float] = None
    valuation_label: Optional[str] = None
    final_dss_score: Optional[float] = None
    recommendation_label: Optional[str] = None
    added_at: Optional[datetime] = None


class ComparisonListResponse(BaseModel):
    max_items: int
    items: List[ComparisonPropertyItem]


class ExplainabilityScoreComponent(BaseModel):
    key: str
    label: str
    raw_score: Optional[float] = None
    weight: float
    weighted_score: Optional[float] = None
    available: bool
    note: Optional[str] = None


class ExplainabilityCriteriaContribution(BaseModel):
    criteria_code: str
    criteria_name: str
    source: Literal["ahp", "rule", "valuation"]
    weight: Optional[float] = None
    raw_value: Optional[str] = None
    normalized_value: Optional[float] = None
    contribution_score: float
    sentiment: Literal["positive", "negative", "neutral"]
    description: str


class ExplainabilityFactor(BaseModel):
    title: str
    detail: str
    category: Literal["ahp", "rule", "valuation"]
    impact_score: Optional[float] = None


class PropertyExplainabilityResponse(BaseModel):
    property_id: int
    final_score: float
    recommendation_label: str
    score_components: List[ExplainabilityScoreComponent]
    criteria_contributions: List[ExplainabilityCriteriaContribution]
    strongest_positive_factors: List[ExplainabilityFactor]
    strongest_negative_factors: List[ExplainabilityFactor]
    ai_valuation_interpretation: Optional[str] = None
    final_explanation_text: str


class UserDashboardSummaryResponse(BaseModel):
    favorites_count: int
    compared_count: int
    total_evaluated_recommendations: int
    average_saved_dss_score: Optional[float] = None
    highlighted_suburbs: List[str]
    quick_summary: str


class UserDashboardInsightsResponse(BaseModel):
    recommendation_distribution: List[LabelCount]
    top_recommended_suburbs: List[str]
    saved_properties_average_score: Optional[float] = None
    compared_properties_average_score: Optional[float] = None
    summary_note: str


class PropertyTypeDistributionItem(BaseModel):
    property_type: str
    count: int


class SuburbInsightItem(BaseModel):
    suburb: str
    property_count: int
    average_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    average_rooms: Optional[float] = None
    average_bathrooms: Optional[float] = None
    average_cars: Optional[float] = None


class MarketOverviewResponse(BaseModel):
    total_properties: int
    average_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    property_type_distribution: List[PropertyTypeDistributionItem]
    top_suburbs_by_count: List[SuburbInsightItem]
    note: str


class PriceDistributionBucket(BaseModel):
    label: str
    min_price: float
    max_price: float
    count: int


class PriceDistributionResponse(BaseModel):
    total_properties: int
    buckets: List[PriceDistributionBucket]
    note: str


class AdminActiveModelInfo(BaseModel):
    id: int
    model_name: str
    version: str
    algorithm: str
    metrics: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class AdminModelStatusResponse(BaseModel):
    total_models: int
    active_model: Optional[AdminActiveModelInfo] = None
    message: str


class AdminDataStatusResponse(BaseModel):
    property_count: int
    valuation_coverage_count: int
    dss_score_coverage_count: int
    missing_coordinate_count: int
    missing_key_feature_count: int


class AdminSystemSummaryResponse(BaseModel):
    user_count: int
    admin_count: int
    favorites_count: int
    comparison_item_count: int
    latest_model_created_at: Optional[datetime] = None
    active_model_name: Optional[str] = None
    note: str