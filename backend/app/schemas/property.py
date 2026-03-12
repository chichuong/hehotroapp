from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PropertyImageResponse(BaseModel):
    id: int
    image_url: str
    is_primary: bool

    class Config:
        from_attributes = True


class PropertyListItem(BaseModel):
    id: int
    title: str
    address: str
    suburb: Optional[str] = None
    price: Optional[float] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    cars: Optional[int] = None
    property_type: Optional[str] = None
    primary_image: Optional[str] = None
    # DSS fit fields (optional, only when include_fit=true and user is authenticated)
    fit_score_basic: Optional[float] = None
    fit_label: Optional[str] = None
    fit_reason_short: Optional[str] = None
    # AI valuation fields (optional, only when include_valuation=true)
    predicted_price: Optional[float] = None
    valuation_label: Optional[str] = None
    valuation_gap_percent: Optional[float] = None
    # DSS combined fields (optional, only when include_dss=true)
    dss_final_score: Optional[float] = None
    dss_recommendation_label: Optional[str] = None
    dss_explanation_short: Optional[str] = None

    class Config:
        from_attributes = True


class PropertyMapItem(BaseModel):
    id: int
    title: str
    price: Optional[float] = None
    address: str
    suburb: Optional[str] = None
    latitude: float
    longitude: float
    primary_image: Optional[str] = None

    class Config:
        from_attributes = True


class PropertyDetail(BaseModel):
    id: int
    title: str
    address: str
    suburb: Optional[str] = None
    region_name: Optional[str] = None
    postcode: Optional[str] = None
    property_type: Optional[str] = None
    rooms: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    cars: Optional[int] = None
    land_size: Optional[float] = None
    building_area: Optional[float] = None
    year_built: Optional[int] = None
    price: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    images: List[PropertyImageResponse] = []

    class Config:
        from_attributes = True


class PropertyListResponse(BaseModel):
    items: List[PropertyListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class PropertyMapResponse(BaseModel):
    items: List[PropertyMapItem]
    total: int
