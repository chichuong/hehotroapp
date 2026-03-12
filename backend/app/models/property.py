from sqlalchemy import Column, Integer, String, Float, DateTime, Text, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    address = Column(String(500), nullable=False)
    suburb = Column(String(255), nullable=True, index=True)
    region_name = Column(String(255), nullable=True)
    postcode = Column(String(20), nullable=True)
    property_type = Column(String(50), nullable=True)
    rooms = Column(Integer, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    cars = Column(Integer, nullable=True)
    land_size = Column(Float, nullable=True)
    building_area = Column(Float, nullable=True)
    year_built = Column(Integer, nullable=True)
    price = Column(Float, nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")
