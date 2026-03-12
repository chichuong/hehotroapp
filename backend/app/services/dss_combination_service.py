"""
DSS Combination Service — Combines AHP, AI valuation, and rule-based fit into a final DSS score.

final_score = w_ahp * ahp_component + w_ai * ai_component + w_fit * fit_component

Each component is normalized to 0–1 range before combination.
"""
import json
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.property import Property
from app.models.property_dss_score import PropertyDSSScore
from app.models.property_ahp_score import PropertyAHPScore
from app.models.property_valuation import PropertyValuation
from app.models.model_version import ModelVersion
from app.models.user_profile import UserProfile
from app.models.user import User
from app.models.criteria import Criteria
from app.models.ahp_matrix import AHPMatrix
from app.models.ahp_matrix_entry import AHPMatrixEntry
from app.services.dss_engine import calculate_property_fit, CRITERIA_LABELS
from app.services.property_scoring_service import (
    normalize_property_features,
    calculate_ahp_property_score,
    SCORABLE_CRITERIA_CODES,
)
from app.services.ahp_service import compute_ahp_weights
from app.services.valuation_service import get_existing_valuation

# ---------------------------------------------------------------------------
# Configurable Weights — adjust these to change the balance of components
# ---------------------------------------------------------------------------
DEFAULT_WEIGHT_AHP = 0.4
DEFAULT_WEIGHT_AI = 0.4
DEFAULT_WEIGHT_FIT = 0.2

# When a component is unavailable, redistribute its weight proportionally
# among the remaining components.

# ---------------------------------------------------------------------------
# Recommendation label thresholds (on final_score 0–100 scale)
# ---------------------------------------------------------------------------
LABEL_THRESHOLDS = [
    (75, "Ưu tiên lựa chọn"),
    (55, "Đáng cân nhắc"),
    (35, "Theo dõi thêm"),
    (0, "Không khuyến nghị"),
]


def get_recommendation_label(score: float) -> str:
    for threshold, label in LABEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "Không khuyến nghị"


# ---------------------------------------------------------------------------
# AI score conversion: valuation gap → 0–1 score
# ---------------------------------------------------------------------------

def _ai_gap_to_score(valuation: Optional[PropertyValuation]) -> Optional[float]:
    """Convert AI valuation gap into a 0–1 signal.

    Underpriced → higher score (good deal for buyer)
    Fair → moderate score
    Overpriced → lower score
    """
    if valuation is None or valuation.valuation_gap_percent is None:
        return None

    gap_pct = valuation.valuation_gap_percent  # positive = predicted > listed (underpriced)

    # Clamp gap_pct to [-50, 50] for scoring, then map to [0, 1]
    clamped = max(-50.0, min(50.0, gap_pct))
    # Linear mapping: -50 → 0, 0 → 0.5, +50 → 1.0
    return round((clamped + 50.0) / 100.0, 6)


# ---------------------------------------------------------------------------
# Fit score normalization: 0–100 → 0–1
# ---------------------------------------------------------------------------

def _normalize_fit(fit_score: float) -> float:
    return round(fit_score / 100.0, 6)


# ---------------------------------------------------------------------------
# Weight redistribution when components are missing
# ---------------------------------------------------------------------------

def _redistribute_weights(
    has_ahp: bool, has_ai: bool, has_fit: bool,
    w_ahp: float = DEFAULT_WEIGHT_AHP,
    w_ai: float = DEFAULT_WEIGHT_AI,
    w_fit: float = DEFAULT_WEIGHT_FIT,
) -> Dict[str, float]:
    """Redistribute weights proportionally among available components."""
    components = {}
    if has_ahp:
        components["ahp"] = w_ahp
    if has_ai:
        components["ai"] = w_ai
    if has_fit:
        components["fit"] = w_fit

    if not components:
        return {"ahp": 0.0, "ai": 0.0, "fit": 0.0}

    total = sum(components.values())
    result = {"ahp": 0.0, "ai": 0.0, "fit": 0.0}
    for key, val in components.items():
        result[key] = val / total
    return result


# ---------------------------------------------------------------------------
# Explanation generator
# ---------------------------------------------------------------------------

def _generate_explanation(
    ahp_score: Optional[float],
    ai_score: Optional[float],
    fit_score: Optional[float],
    valuation: Optional[PropertyValuation],
    matched_criteria: List[str],
    unmatched_criteria: List[str],
    final_score: float,
    label: str,
) -> str:
    """Generate a concise Vietnamese explanation for why a property received its score."""
    positives: List[str] = []
    negatives: List[str] = []

    # AHP contribution
    if ahp_score is not None:
        if ahp_score >= 0.6:
            positives.append("phù hợp tốt với mức ưu tiên tiêu chí của bạn (AHP)")
        elif ahp_score >= 0.4:
            positives.append("phù hợp ở mức trung bình với các tiêu chí ưu tiên")
        else:
            negatives.append("chưa phù hợp nhiều với mức ưu tiên tiêu chí của bạn")

    # AI contribution
    if ai_score is not None and valuation is not None:
        if valuation.valuation_label == "Định giá thấp":
            positives.append("có giá niêm yết thấp hơn mức dự đoán từ AI (cơ hội tốt)")
        elif valuation.valuation_label == "Định giá hợp lý":
            positives.append("có mức giá hợp lý theo đánh giá AI")
        elif valuation.valuation_label == "Định giá cao":
            negatives.append("giá niêm yết đang cao hơn mức AI ước tính")

    # Fit contribution
    if matched_criteria:
        matched_names = [CRITERIA_LABELS.get(c, c) for c in matched_criteria[:3]]
        positives.append(f"đáp ứng tiêu chí: {', '.join(matched_names)}")
    if unmatched_criteria:
        unmatched_names = [CRITERIA_LABELS.get(c, c) for c in unmatched_criteria[:3]]
        negatives.append(f"chưa đáp ứng tốt: {', '.join(unmatched_names)}")

    # Build summary
    parts: List[str] = []
    if positives:
        parts.append(f"Bất động sản này được đánh giá {'cao' if final_score >= 60 else 'khá'} vì {'; '.join(positives)}")
    if negatives:
        connector = ". Tuy nhiên, " if parts else "Bất động sản này "
        parts.append(f"{connector}{'; '.join(negatives)}")

    if not parts:
        return "Chưa đủ dữ liệu để đưa ra đánh giá chi tiết cho bất động sản này."

    return ". ".join(parts).replace(". . ", ". ") + "."


# ---------------------------------------------------------------------------
# Build breakdown JSON
# ---------------------------------------------------------------------------

def _build_breakdown(
    ahp_score: Optional[float],
    ai_score: Optional[float],
    fit_score: Optional[float],
    weights: Dict[str, float],
    valuation_label: Optional[str],
    matched_criteria: List[str],
    unmatched_criteria: List[str],
) -> Dict[str, Any]:
    return {
        "components": {
            "ahp": {
                "score": ahp_score,
                "weight": weights["ahp"],
                "weighted": round(ahp_score * weights["ahp"] * 100, 2) if ahp_score is not None else None,
                "available": ahp_score is not None,
            },
            "ai": {
                "score": ai_score,
                "weight": weights["ai"],
                "weighted": round(ai_score * weights["ai"] * 100, 2) if ai_score is not None else None,
                "available": ai_score is not None,
                "valuation_label": valuation_label,
            },
            "fit": {
                "score": fit_score,
                "weight": weights["fit"],
                "weighted": round(fit_score * weights["fit"] * 100, 2) if fit_score is not None else None,
                "available": fit_score is not None,
                "matched_criteria": matched_criteria,
                "unmatched_criteria": unmatched_criteria,
            },
        },
        "weight_config": {
            "ahp": DEFAULT_WEIGHT_AHP,
            "ai": DEFAULT_WEIGHT_AI,
            "fit": DEFAULT_WEIGHT_FIT,
        },
    }


# ---------------------------------------------------------------------------
# Core computation for a single property-user pair
# ---------------------------------------------------------------------------

def compute_dss_score_for_property(
    db: Session,
    prop: Property,
    user: User,
    profile: UserProfile,
    ahp_weights: Optional[Dict[int, float]],
    criteria_code_to_id: Optional[Dict[str, int]],
    all_properties: Optional[List[Property]],
    normalized_features: Optional[Dict[int, Dict[str, float]]],
    scorable_codes: Optional[List[str]],
) -> PropertyDSSScore:
    """Compute (or update) the DSS score for one property-user pair."""

    # --- AHP component ---
    ahp_val: Optional[float] = None
    if ahp_weights and criteria_code_to_id and normalized_features and scorable_codes:
        prop_values = normalized_features.get(prop.id, {})
        if prop_values:
            total_score, _ = calculate_ahp_property_score(
                prop, ahp_weights, prop_values, criteria_code_to_id
            )
            ahp_val = total_score  # already 0–1

    # --- AI component ---
    valuation = get_existing_valuation(db, prop.id)
    ai_val = _ai_gap_to_score(valuation)

    # --- Fit component ---
    fit_result = calculate_property_fit(prop, profile)
    fit_val = _normalize_fit(fit_result.fit_score_basic)
    matched = fit_result.matched_criteria
    unmatched = fit_result.unmatched_criteria

    # --- Combine ---
    weights = _redistribute_weights(
        has_ahp=ahp_val is not None,
        has_ai=ai_val is not None,
        has_fit=True,  # fit is always available if profile exists
    )

    raw_score = 0.0
    if ahp_val is not None:
        raw_score += ahp_val * weights["ahp"]
    if ai_val is not None:
        raw_score += ai_val * weights["ai"]
    raw_score += fit_val * weights["fit"]

    final_score = round(raw_score * 100, 2)  # scale to 0–100
    label = get_recommendation_label(final_score)
    valuation_label = valuation.valuation_label if valuation else None

    explanation = _generate_explanation(
        ahp_val, ai_val, fit_val, valuation,
        matched, unmatched, final_score, label,
    )
    breakdown = _build_breakdown(
        ahp_val, ai_val, fit_val, weights,
        valuation_label, matched, unmatched,
    )

    # Upsert
    existing = (
        db.query(PropertyDSSScore)
        .filter(
            PropertyDSSScore.user_id == user.id,
            PropertyDSSScore.property_id == prop.id,
        )
        .first()
    )

    if existing:
        existing.ahp_score = ahp_val
        existing.ai_score = ai_val
        existing.fit_score_basic = fit_result.fit_score_basic
        existing.final_score = final_score
        existing.recommendation_label = label
        existing.explanation_summary = explanation
        existing.breakdown_json = json.dumps(breakdown, ensure_ascii=False)
        existing.updated_at = datetime.utcnow()
        return existing
    else:
        record = PropertyDSSScore(
            user_id=user.id,
            property_id=prop.id,
            ahp_score=ahp_val,
            ai_score=ai_val,
            fit_score_basic=fit_result.fit_score_basic,
            final_score=final_score,
            recommendation_label=label,
            explanation_summary=explanation,
            breakdown_json=json.dumps(breakdown, ensure_ascii=False),
        )
        db.add(record)
        return record


# ---------------------------------------------------------------------------
# Batch computation helpers
# ---------------------------------------------------------------------------

def _load_ahp_context(db: Session, user: User):
    """Load AHP weights and normalization context for batch scoring.
    Returns (ahp_weights, criteria_code_to_id, scorable_codes) or Nones if not available.
    """
    matrix = (
        db.query(AHPMatrix)
        .filter(AHPMatrix.user_id == user.id)
        .order_by(AHPMatrix.updated_at.desc())
        .first()
    )
    if not matrix:
        return None, None, None

    entries = (
        db.query(AHPMatrixEntry)
        .filter(AHPMatrixEntry.matrix_id == matrix.id)
        .all()
    )

    criteria_list = (
        db.query(Criteria)
        .filter(Criteria.is_active == True)
        .order_by(Criteria.sort_order)
        .all()
    )
    entry_criteria_ids = set()
    for e in entries:
        entry_criteria_ids.add(e.criteria_id_row)
        entry_criteria_ids.add(e.criteria_id_col)
    criteria_list = [c for c in criteria_list if c.id in entry_criteria_ids]
    criteria_ids = [c.id for c in criteria_list]

    if not criteria_ids:
        return None, None, None

    try:
        ahp_result = compute_ahp_weights(entries, criteria_ids)
    except Exception:
        return None, None, None

    ahp_weights = ahp_result["weights"]
    criteria_code_to_id = {c.code: c.id for c in criteria_list}
    scorable_codes = [c.code for c in criteria_list if c.code in SCORABLE_CRITERIA_CODES]
    return ahp_weights, criteria_code_to_id, scorable_codes


def refresh_recommendations_for_user(
    db: Session,
    user: User,
    property_ids: Optional[List[int]] = None,
) -> int:
    """Recompute DSS scores for a user across all (or specified) properties.
    Returns the number of properties scored.
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return 0

    ahp_weights, criteria_code_to_id, scorable_codes = _load_ahp_context(db, user)

    # Load all properties for normalization
    if property_ids:
        query = db.query(Property).filter(Property.id.in_(property_ids))
        all_props_for_norm = db.query(Property).all()
    else:
        all_props_for_norm = db.query(Property).all()
        query = db.query(Property)

    properties = query.all()

    # Pre-compute normalized features for AHP
    normalized_features = None
    if ahp_weights and scorable_codes:
        normalized_features = normalize_property_features(all_props_for_norm, scorable_codes)

    count = 0
    for prop in properties:
        compute_dss_score_for_property(
            db, prop, user, profile,
            ahp_weights, criteria_code_to_id,
            all_props_for_norm, normalized_features, scorable_codes,
        )
        count += 1

    db.commit()
    return count


def get_or_compute_property_dss(
    db: Session,
    prop: Property,
    user: User,
) -> Optional[PropertyDSSScore]:
    """Get cached DSS score or compute on the fly for a single property."""
    existing = (
        db.query(PropertyDSSScore)
        .filter(
            PropertyDSSScore.user_id == user.id,
            PropertyDSSScore.property_id == prop.id,
        )
        .first()
    )
    if existing:
        return existing

    # Compute on the fly
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return None

    ahp_weights, criteria_code_to_id, scorable_codes = _load_ahp_context(db, user)

    all_properties = db.query(Property).all()
    normalized_features = None
    if ahp_weights and scorable_codes:
        normalized_features = normalize_property_features(all_properties, scorable_codes)

    record = compute_dss_score_for_property(
        db, prop, user, profile,
        ahp_weights, criteria_code_to_id,
        all_properties, normalized_features, scorable_codes,
    )
    db.commit()
    return record
