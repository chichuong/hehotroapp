"""Feature builder: converts a Property DB row into a feature dict for inference."""

from typing import Optional, Dict, Any

from app.ml.preprocess import ALL_FEATURES


# Mapping from Property model field names to the CSV/training feature names
PROPERTY_TO_FEATURE_MAP = {
    "rooms": "Rooms",
    "bedrooms": "Bedrooms",
    "bathrooms": "Bathrooms",
    "cars": "Cars",
    "year_built": "YearBuilt",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "postcode": "PostCode",
    "property_type": "Type",
    "region_name": "RegionName",
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

    # Distance and PropertyCount are not stored directly,
    # so they will be None and handled by the imputer during inference
    features.setdefault("Distance", None)
    features.setdefault("PropertyCount", None)

    return features


def build_features_from_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Build feature dict from arbitrary input dict (for custom prediction endpoint)."""
    features = {}
    for feat in ALL_FEATURES:
        features[feat] = data.get(feat, None)
    return features
