from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    buying_purpose = Column(String(100), nullable=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    preferred_suburbs = Column(JSON, nullable=True)  # list of strings
    preferred_region_names = Column(JSON, nullable=True)  # list of strings
    preferred_property_types = Column(JSON, nullable=True)  # list of strings
    min_bedrooms = Column(Integer, nullable=True)
    min_bathrooms = Column(Integer, nullable=True)
    min_cars = Column(Integer, nullable=True)
    preferred_min_year_built = Column(Integer, nullable=True)
    risk_tolerance = Column(String(50), nullable=True)
    family_size = Column(Integer, nullable=True)
    has_children = Column(Boolean, nullable=True)
    work_location_text = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="dss_profile", uselist=False)
