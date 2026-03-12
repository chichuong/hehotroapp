"""
CSV Import Script — Seeds property data from Melbourne housing CSV into PostgreSQL.
Usage: python -m app.scripts.seed_data
"""
import sys
import os
import math

import pandas as pd
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.db.base import Base
from app.db.session import engine
from app.models.property import Property
from app.models.property_image import PropertyImage
from app.core.config import settings

TYPE_MAP = {
    "h": "Nhà phố",
    "u": "Căn hộ",
    "t": "Nhà liền kề",
}

PLACEHOLDER_IMAGES = [
    "https://placehold.co/800x600/e2e8f0/64748b?text=H%C3%ACnh+1",
    "https://placehold.co/800x600/e2e8f0/64748b?text=H%C3%ACnh+2",
    "https://placehold.co/800x600/e2e8f0/64748b?text=H%C3%ACnh+3",
]


def generate_title(row: pd.Series) -> str:
    ptype = TYPE_MAP.get(str(row.get("Type", "")).strip().lower(), "Bất động sản")
    rooms = row.get("Rooms")
    suburb = row.get("Suburb", "")
    rooms_str = f" {int(rooms)} phòng" if pd.notna(rooms) else ""
    return f"{ptype}{rooms_str} tại {suburb}"


def clean_int(val) -> int | None:
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def clean_float(val) -> float | None:
    if pd.isna(val):
        return None
    try:
        v = float(val)
        return v if not math.isnan(v) else None
    except (ValueError, TypeError):
        return None


def seed_data():
    csv_path = settings.csv_file_path
    if not os.path.exists(csv_path):
        # Try relative to project root
        csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), csv_path)
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {settings.csv_file_path}")
        sys.exit(1)

    print(f"Reading CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Total rows in CSV: {len(df)}")

    # Drop rows without price
    df = df.dropna(subset=["Price"])
    print(f"Rows with valid price: {len(df)}")

    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        existing_count = db.query(Property).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} properties. Skipping import (idempotent).")
            return

        batch_size = 500
        total_imported = 0

        for idx, (_, row) in enumerate(df.iterrows()):
            title = generate_title(row)
            address = str(row.get("Address", "")) if pd.notna(row.get("Address")) else ""
            suburb = str(row.get("Suburb", "")) if pd.notna(row.get("Suburb")) else None
            region_name = str(row.get("RegionName", "")) if pd.notna(row.get("RegionName")) else None
            postcode = str(int(float(row["PostCode"]))) if pd.notna(row.get("PostCode")) else None
            property_type = TYPE_MAP.get(str(row.get("Type", "")).strip().lower(), "Khác")

            description = (
                f"{title}. Địa chỉ: {address}, {suburb or ''}. "
                f"Loại hình: {property_type}. "
                f"Khu vực: {region_name or 'N/A'}."
            )

            prop = Property(
                title=title,
                address=address,
                suburb=suburb,
                region_name=region_name,
                postcode=postcode,
                property_type=property_type,
                rooms=clean_int(row.get("Rooms")),
                bedrooms=clean_int(row.get("Bedrooms")),
                bathrooms=clean_int(row.get("Bathrooms")),
                cars=clean_int(row.get("Cars")),
                land_size=clean_float(row.get("Landsize") if "Landsize" in row.index else None),
                building_area=clean_float(row.get("BuildingArea") if "BuildingArea" in row.index else None),
                year_built=clean_int(row.get("YearBuilt")),
                price=clean_float(row.get("Price")),
                latitude=clean_float(row.get("Latitude")),
                longitude=clean_float(row.get("Longitude")),
                description=description,
            )
            db.add(prop)
            db.flush()

            # Add placeholder images
            for i, img_url in enumerate(PLACEHOLDER_IMAGES):
                img = PropertyImage(
                    property_id=prop.id,
                    image_url=img_url,
                    is_primary=(i == 0),
                )
                db.add(img)

            total_imported += 1
            if total_imported % batch_size == 0:
                db.commit()
                print(f"  Imported {total_imported} properties...")

        db.commit()
        print(f"Import complete. Total properties imported: {total_imported}")
    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
