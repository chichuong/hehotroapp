"""
DSS Fit Engine — Rule-based property fit scoring.

This is a practical pre-scoring layer for the DSS foundation.
It does NOT implement AHP mathematics or machine learning.
It generates basic rule-based fit signals based on explicit user preferences.

Future phases will plug in AHP pairwise weights and AI valuation on top of this foundation.
"""
from typing import Optional, List

from app.models.property import Property
from app.models.user_profile import UserProfile
from app.schemas.dss import PropertyFitResponse, PropertyFitBrief


# Criteria code → Vietnamese display name
CRITERIA_LABELS = {
    "budget": "Ngân sách",
    "location": "Vị trí",
    "bedrooms": "Phòng ngủ",
    "bathrooms": "Phòng tắm",
    "parking": "Chỗ đậu xe",
    "property_type": "Loại bất động sản",
    "year_built": "Năm xây dựng",
    "family_suitability": "Phù hợp gia đình",
}

# Score thresholds for summary labels
LABEL_THRESHOLDS = [
    (80, "Rất phù hợp"),
    (60, "Khá phù hợp"),
    (40, "Cần cân nhắc thêm"),
    (0, "Ít phù hợp"),
]


def _get_summary_label(score: float) -> str:
    for threshold, label in LABEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "Ít phù hợp"


def _build_explanation(matched: List[str], unmatched: List[str]) -> str:
    """Generate a concise Vietnamese explanation based on matched/unmatched criteria."""
    parts = []
    if matched:
        matched_names = [CRITERIA_LABELS.get(c, c) for c in matched]
        parts.append(f"Bất động sản này phù hợp với tiêu chí: {', '.join(matched_names)}")
    if unmatched:
        unmatched_names = [CRITERIA_LABELS.get(c, c) for c in unmatched]
        if parts:
            parts.append(f"nhưng chưa đáp ứng tốt: {', '.join(unmatched_names)}")
        else:
            parts.append(f"Bất động sản này chưa đáp ứng tốt các tiêu chí: {', '.join(unmatched_names)}")
    if not parts:
        return "Chưa đủ thông tin để đánh giá mức độ phù hợp."
    return ". ".join(parts) + "."


def _build_short_reason(matched: List[str], unmatched: List[str], label: str) -> str:
    """Build a short one-line reason for listing card display."""
    if not matched and not unmatched:
        return "Chưa đủ thông tin đánh giá"
    if len(unmatched) == 0:
        return "Phù hợp tất cả tiêu chí của bạn"
    if len(matched) > len(unmatched):
        unmatched_names = [CRITERIA_LABELS.get(c, c) for c in unmatched[:2]]
        return f"Cần cân nhắc: {', '.join(unmatched_names)}"
    matched_names = [CRITERIA_LABELS.get(c, c) for c in matched[:2]]
    if matched_names:
        return f"Phù hợp: {', '.join(matched_names)}"
    return label


def calculate_property_fit(
    prop: Property,
    profile: UserProfile,
) -> PropertyFitResponse:
    """Calculate a basic rule-based fit score for a property against a user profile."""
    matched: List[str] = []
    unmatched: List[str] = []
    checks_done = 0

    budget_match: Optional[bool] = None
    location_match: Optional[bool] = None
    bedroom_match: Optional[bool] = None
    bathroom_match: Optional[bool] = None
    parking_match: Optional[bool] = None
    property_type_match: Optional[bool] = None
    year_built_match: Optional[bool] = None
    family_suitability_match: Optional[bool] = None

    # 1) Budget match
    if prop.price is not None and (profile.budget_min is not None or profile.budget_max is not None):
        checks_done += 1
        in_budget = True
        if profile.budget_min is not None and prop.price < profile.budget_min:
            in_budget = False
        if profile.budget_max is not None and prop.price > profile.budget_max:
            in_budget = False
        budget_match = in_budget
        if in_budget:
            matched.append("budget")
        else:
            unmatched.append("budget")

    # 2) Location match (suburb in preferred list)
    if profile.preferred_suburbs and prop.suburb:
        checks_done += 1
        suburb_lower = prop.suburb.lower()
        preferred_lower = [s.lower() for s in profile.preferred_suburbs]
        if suburb_lower in preferred_lower:
            location_match = True
            matched.append("location")
        else:
            location_match = False
            unmatched.append("location")

    # 3) Bedroom match
    if profile.min_bedrooms is not None and prop.bedrooms is not None:
        checks_done += 1
        if prop.bedrooms >= profile.min_bedrooms:
            bedroom_match = True
            matched.append("bedrooms")
        else:
            bedroom_match = False
            unmatched.append("bedrooms")

    # 4) Bathroom match
    if profile.min_bathrooms is not None and prop.bathrooms is not None:
        checks_done += 1
        if prop.bathrooms >= profile.min_bathrooms:
            bathroom_match = True
            matched.append("bathrooms")
        else:
            bathroom_match = False
            unmatched.append("bathrooms")

    # 5) Parking match
    if profile.min_cars is not None and prop.cars is not None:
        checks_done += 1
        if prop.cars >= profile.min_cars:
            parking_match = True
            matched.append("parking")
        else:
            parking_match = False
            unmatched.append("parking")

    # 6) Property type match
    if profile.preferred_property_types and prop.property_type:
        checks_done += 1
        type_lower = prop.property_type.lower()
        preferred_types_lower = [t.lower() for t in profile.preferred_property_types]
        if type_lower in preferred_types_lower:
            property_type_match = True
            matched.append("property_type")
        else:
            property_type_match = False
            unmatched.append("property_type")

    # 7) Year built match
    if profile.preferred_min_year_built is not None and prop.year_built is not None:
        checks_done += 1
        if prop.year_built >= profile.preferred_min_year_built:
            year_built_match = True
            matched.append("year_built")
        else:
            year_built_match = False
            unmatched.append("year_built")

    # 8) Family suitability (basic inference from rooms/bedrooms + family_size)
    if profile.family_size is not None and prop.bedrooms is not None:
        checks_done += 1
        # Basic rule: at least 1 bedroom per 2 family members
        needed_bedrooms = max(1, (profile.family_size + 1) // 2)
        if prop.bedrooms >= needed_bedrooms:
            family_suitability_match = True
            matched.append("family_suitability")
        else:
            family_suitability_match = False
            unmatched.append("family_suitability")

    # Calculate score
    if checks_done == 0:
        fit_score = 0.0
    else:
        fit_score = round((len(matched) / checks_done) * 100, 1)

    summary_label = _get_summary_label(fit_score)
    summary_explanation = _build_explanation(matched, unmatched)

    return PropertyFitResponse(
        property_id=prop.id,
        fit_score_basic=fit_score,
        budget_match=budget_match,
        location_match=location_match,
        bedroom_match=bedroom_match,
        bathroom_match=bathroom_match,
        parking_match=parking_match,
        property_type_match=property_type_match,
        year_built_match=year_built_match,
        family_suitability_match=family_suitability_match,
        matched_criteria=matched,
        unmatched_criteria=unmatched,
        summary_label=summary_label,
        summary_explanation=summary_explanation,
    )


def calculate_property_fit_brief(
    prop: Property,
    profile: UserProfile,
) -> PropertyFitBrief:
    """Calculate brief fit info for listing card display."""
    full = calculate_property_fit(prop, profile)
    short_reason = _build_short_reason(
        full.matched_criteria, full.unmatched_criteria, full.summary_label
    )
    return PropertyFitBrief(
        fit_score_basic=full.fit_score_basic,
        fit_label=full.summary_label,
        fit_reason_short=short_reason,
    )
