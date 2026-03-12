"""Feature builder: converts a Property DB row into a feature dict for inference."""

from typing import Optional, Dict, Any


# Mapping from Property model field names to the CSV/training feature names
PROPERTY_TO_FEATURE_MAP = {
    "rooms": "Rooms",
    "bedrooms": "Bedrooms",
    "bathrooms": "Bathrooms",
    "cars": "Cars",
    "land_size": "Landsize",
    "building_area": "BuildingArea",
    "year_built": "YearBuilt",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "postcode": "Postcode",
    "property_type": "Type",
    "region_name": "Regionname",
}

# Map from Vietnamese property types back to CSV codes
PROPERTY_TYPE_REVERSE = {
    "Nhà phố": "h",
    "Căn hộ": "u",
    "Nhà liền kề": "t",
}


def build_features_from_property(prop: Any) -> Dict[str, Any]:
    """Convert a Property ORM object into a feature dictionary matching training columns."""
    features: Dict[str, Any] = {}

    for model_field, feature_name in PROPERTY_TO_FEATURE_MAP.items():
        value = getattr(prop, model_field, None)

        # Convert Vietnamese property type back to original CSV code
        if model_field == "property_type" and value:
            value = PROPERTY_TYPE_REVERSE.get(value, value)

        features[feature_name] = value

    # Distance and Propertycount are not stored on Property model directly,
    # so they will be None and handled by the imputer during inference
    features.setdefault("Distance", None)
    features.setdefault("Propertycount", None)

    return features


def build_features_from_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Build feature dict from arbitrary input dict (for custom prediction endpoint)."""
    from app.ml.preprocess import ALL_FEATURES
    features = {}
    for feat in ALL_FEATURES:
        features[feat] = data.get(feat, None)
    return features
