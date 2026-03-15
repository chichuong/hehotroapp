"""
Property Scoring Service — Normalize property features and compute AHP-based scores.

property_score = Σ (criteria_weight × normalized_criteria_value)
"""
from typing import Dict, List, Optional, Tuple

from app.models.property import Property

# Criteria code → property attribute mapping and normalization direction
# "positive" = higher is better, "inverse" = lower is better
CRITERIA_PROPERTY_MAP = {
    "price": {"attr": "price", "direction": "inverse"},
    "area": {"attr": "land_size", "direction": "positive"},
    "bedrooms": {"attr": "bedrooms", "direction": "positive"},
    "bathrooms": {"attr": "bathrooms", "direction": "positive"},
    "parking": {"attr": "cars", "direction": "positive"},
    "year_built": {"attr": "year_built", "direction": "positive"},
    # AHP-specific criteria (5 fixed criteria)
    "rooms": {"attr": "rooms", "direction": "positive"},
    "distance": {"attr": None, "direction": "inverse"},  # No direct field; handled via placeholder
}

# The 5 fixed AHP criteria codes and their config
AHP_CRITERIA_CODES = ["price", "distance", "rooms", "bedrooms", "year_built"]

# Mapping from AHP criteria code to normalization direction
AHP_CRITERIA_DIRECTION = {
    "price": "inverse",       # Giá → lower is better
    "distance": "inverse",    # Khoảng cách → lower is better
    "rooms": "positive",      # Số phòng → higher is better
    "bedrooms": "positive",   # Số phòng ngủ → higher is better
    "year_built": "positive", # Năm xây dựng → newer is better
}

# Mapping from AHP code to property attribute
AHP_CRITERIA_ATTR = {
    "price": "price",
    "distance": None,     # Not a direct field; use 0.5 as placeholder
    "rooms": "rooms",
    "bedrooms": "bedrooms",
    "year_built": "year_built",
}

# Criteria that can be scored from property data (original set)
SCORABLE_CRITERIA_CODES = set(CRITERIA_PROPERTY_MAP.keys()) - {"distance"}


def _get_property_value(prop: Property, attr: str) -> Optional[float]:
    """Safely extract a numeric value from a property."""
    val = getattr(prop, attr, None)
    if val is None:
        return None
    return float(val)


def normalize_property_features(
    properties: List[Property],
    criteria_codes: List[str],
) -> Dict[int, Dict[str, float]]:
    """
    Normalize property features using min-max normalization.

    Returns: {property_id: {criteria_code: normalized_value (0-1)}}
    """
    if not properties:
        return {}

    # Collect raw values per criteria
    raw_values: Dict[str, List[Tuple[int, float]]] = {}
    for code in criteria_codes:
        mapping = CRITERIA_PROPERTY_MAP.get(code)
        if not mapping:
            continue
        attr = mapping.get("attr")
        if not attr:
            continue
        raw_values[code] = []
        for prop in properties:
            val = _get_property_value(prop, attr)
            if val is not None:
                raw_values[code].append((prop.id, val))

    # Compute min/max per criteria
    result: Dict[int, Dict[str, float]] = {prop.id: {} for prop in properties}

    for code, values in raw_values.items():
        if not values:
            continue
        mapping = CRITERIA_PROPERTY_MAP[code]
        vals = [v for _, v in values]
        min_val = min(vals)
        max_val = max(vals)
        val_range = max_val - min_val

        for prop_id, val in values:
            if val_range == 0:
                normalized = 1.0  # All same value
            else:
                normalized = (val - min_val) / val_range

            # Inverse: lower is better (e.g., price)
            if mapping["direction"] == "inverse":
                normalized = 1.0 - normalized

            result[prop_id][code] = round(normalized, 6)

    return result


def normalize_ahp_alternatives(
    properties: List[Property],
) -> Dict[int, Dict[str, float]]:
    """
    Normalize property features specifically for the 5-criteria AHP matrix.

    AHP criteria:
      - price      → lower is better (inverse)
      - distance   → lower is better (no data → uniform 0.5)
      - rooms      → higher is better
      - bedrooms   → higher is better
      - year_built → higher (newer) is better

    Returns: {property_id: {criteria_code: normalized_value (0-1)}}
    """
    if not properties:
        return {}

    result: Dict[int, Dict[str, float]] = {prop.id: {} for prop in properties}

    for code in AHP_CRITERIA_CODES:
        attr = AHP_CRITERIA_ATTR.get(code)
        direction = AHP_CRITERIA_DIRECTION.get(code, "positive")

        if attr is None:
            # No data available — assign uniform value 0.5
            for prop in properties:
                result[prop.id][code] = 0.5
            continue

        raw: List[Tuple[int, float]] = []
        for prop in properties:
            val = _get_property_value(prop, attr)
            if val is not None:
                raw.append((prop.id, val))

        if not raw:
            for prop in properties:
                result[prop.id][code] = 0.5
            continue

        vals = [v for _, v in raw]
        min_val = min(vals)
        max_val = max(vals)
        val_range = max_val - min_val

        prop_id_to_norm: Dict[int, float] = {}
        for prop_id, val in raw:
            if val_range == 0:
                normalized = 1.0
            else:
                normalized = (val - min_val) / val_range
            if direction == "inverse":
                normalized = 1.0 - normalized
            prop_id_to_norm[prop_id] = round(normalized, 6)

        for prop in properties:
            result[prop.id][code] = prop_id_to_norm.get(prop.id, 0.5)

    return result


def calculate_criteria_values(
    prop: Property,
    all_properties: List[Property],
    criteria_codes: List[str],
) -> Dict[str, float]:
    """Get normalized criteria values for a single property in context of all properties."""
    normalized = normalize_property_features(all_properties, criteria_codes)
    return normalized.get(prop.id, {})


def calculate_ahp_property_score(
    prop: Property,
    weights: Dict[str, float],
    normalized_values: Dict[str, float],
    criteria_code_to_id: Dict[str, int],
) -> Tuple[float, Dict[str, float]]:
    """
    Compute AHP-weighted property score.

    Returns: (total_score, criteria_breakdown)
    where criteria_breakdown = {criteria_code: weighted_contribution}
    """
    total_score = 0.0
    breakdown: Dict[str, float] = {}

    for code, mapping in CRITERIA_PROPERTY_MAP.items():
        criteria_id = criteria_code_to_id.get(code)
        if criteria_id is None:
            continue
        weight = weights.get(criteria_id, 0.0)
        normalized_val = normalized_values.get(code, 0.0)
        contribution = weight * normalized_val
        breakdown[code] = round(contribution, 6)
        total_score += contribution

    return round(total_score, 6), breakdown


def calculate_ahp_score_from_normalized(
    normalized_values: Dict[str, float],
    weights_by_code: Dict[str, float],
) -> float:
    """
    Compute AHP score from normalized values and weights keyed by criteria code.

    Returns: total_score (0-1)
    """
    total = 0.0
    for code in AHP_CRITERIA_CODES:
        w = weights_by_code.get(code, 0.0)
        v = normalized_values.get(code, 0.0)
        total += w * v
    return round(total, 6)


def get_summary_label(score: float) -> str:
    """Return Vietnamese summary label based on AHP score."""
    if score >= 0.7:
        return "Ưu tiên xem"
    elif score >= 0.5:
        return "Đáng cân nhắc"
    elif score >= 0.3:
        return "Theo dõi thêm"
    else:
        return "Không phù hợp"
