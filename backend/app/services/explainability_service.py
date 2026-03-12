import json
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.ahp_matrix import AHPMatrix
from app.models.ahp_matrix_entry import AHPMatrixEntry
from app.models.criteria import Criteria
from app.models.property import Property
from app.models.property_dss_score import PropertyDSSScore
from app.models.property_valuation import PropertyValuation
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.phase7 import (
    ExplainabilityCriteriaContribution,
    ExplainabilityFactor,
    ExplainabilityScoreComponent,
    PropertyExplainabilityResponse,
)
from app.services.ahp_service import compute_ahp_weights
from app.services.dss_combination_service import get_or_compute_property_dss
from app.services.dss_engine import CRITERIA_LABELS, calculate_property_fit
from app.services.property_scoring_service import (
    CRITERIA_PROPERTY_MAP,
    SCORABLE_CRITERIA_CODES,
    normalize_property_features,
)
from app.services.valuation_service import get_existing_valuation


COMPONENT_LABELS = {
    "ahp": "Mức phù hợp theo ưu tiên AHP",
    "ai": "Tín hiệu định giá AI",
    "fit": "Mức phù hợp với hồ sơ nhu cầu",
}


def _load_ahp_context(db: Session, user: User) -> Tuple[Optional[Dict[int, float]], Dict[str, int], Dict[str, str]]:
    matrix = (
        db.query(AHPMatrix)
        .filter(AHPMatrix.user_id == user.id)
        .order_by(AHPMatrix.updated_at.desc())
        .first()
    )
    if not matrix:
        return None, {}, {}

    entries = db.query(AHPMatrixEntry).filter(AHPMatrixEntry.matrix_id == matrix.id).all()
    if not entries:
        return None, {}, {}

    criteria_rows = (
        db.query(Criteria)
        .filter(Criteria.is_active == True)
        .order_by(Criteria.sort_order)
        .all()
    )
    criteria_map = {criteria.id: criteria for criteria in criteria_rows}
    used_criteria_ids = {entry.criteria_id_row for entry in entries} | {entry.criteria_id_col for entry in entries}
    used_criteria = [criteria_map[criteria_id] for criteria_id in used_criteria_ids if criteria_id in criteria_map]
    if not used_criteria:
        return None, {}, {}

    try:
        result = compute_ahp_weights(entries, [criteria.id for criteria in used_criteria])
    except Exception:
        return None, {}, {}

    code_to_id = {criteria.code: criteria.id for criteria in used_criteria}
    code_to_name = {criteria.code: criteria.name for criteria in used_criteria}
    return result["weights"], code_to_id, code_to_name


def _format_raw_value(prop: Property, code: str) -> Optional[str]:
    mapping = CRITERIA_PROPERTY_MAP.get(code)
    if not mapping:
        return None
    value = getattr(prop, mapping["attr"], None)
    if value is None:
        return None
    if code == "price":
        return f"${value:,.0f}"
    if code in {"area"}:
        return f"{value:,.0f} m2"
    if code in {"year_built", "bedrooms", "bathrooms", "parking"}:
        return str(int(value))
    return str(value)


def _component_note(key: str, record: PropertyDSSScore, valuation: Optional[PropertyValuation]) -> Optional[str]:
    if key == "ai" and valuation:
        if valuation.valuation_label == "Định giá thấp":
            return "Giá niêm yết đang thấp hơn mức AI dự đoán."
        if valuation.valuation_label == "Định giá cao":
            return "Giá niêm yết đang cao hơn mức AI dự đoán."
        if valuation.valuation_label == "Định giá hợp lý":
            return "Giá niêm yết đang gần với mức AI dự đoán."
    if key == "fit" and record.fit_score_basic is not None:
        return "Điểm này phản ánh mức độ khớp với hồ sơ nhu cầu hiện tại."
    if key == "ahp" and record.ahp_score is not None:
        return "Điểm này phản ánh mức phù hợp với trọng số tiêu chí bạn đã thiết lập."
    return None


def _ai_interpretation(prop: Property, valuation: Optional[PropertyValuation]) -> Optional[str]:
    if not valuation or prop.price is None:
        return None
    gap = valuation.valuation_gap or 0.0
    gap_percent = valuation.valuation_gap_percent or 0.0
    if valuation.valuation_label == "Định giá thấp":
        return (
            f"AI ước tính giá trị khoảng ${valuation.predicted_price:,.0f}, cao hơn giá niêm yết khoảng ${abs(gap):,.0f} "
            f"({abs(gap_percent):.1f}%). Đây là tín hiệu giá đang khá hấp dẫn so với mô hình."
        )
    if valuation.valuation_label == "Định giá cao":
        return (
            f"AI ước tính giá trị khoảng ${valuation.predicted_price:,.0f}, thấp hơn giá niêm yết khoảng ${abs(gap):,.0f} "
            f"({abs(gap_percent):.1f}%). Điều này cho thấy mức giá hiện tại cần được cân nhắc kỹ hơn."
        )
    return (
        f"AI ước tính giá trị khoảng ${valuation.predicted_price:,.0f}, khá sát với giá niêm yết hiện tại "
        f"(chênh lệch khoảng {abs(gap_percent):.1f}%)."
    )


def build_property_explainability(
    db: Session,
    prop: Property,
    user: User,
) -> Optional[PropertyExplainabilityResponse]:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return None

    record = get_or_compute_property_dss(db, prop, user)
    if not record:
        return None

    valuation = get_existing_valuation(db, prop.id)
    fit_result = calculate_property_fit(prop, profile)
    weights_json: Dict[str, Any] = {}
    if record.breakdown_json:
        try:
            weights_json = json.loads(record.breakdown_json)
        except Exception:
            weights_json = {}
    components_json = weights_json.get("components", {})

    score_components: List[ExplainabilityScoreComponent] = []
    for key in ("ahp", "ai", "fit"):
        component = components_json.get(key, {})
        raw_score = component.get("score")
        if raw_score is not None:
            raw_score = record.fit_score_basic if key == "fit" else round(raw_score * 100, 2)
        score_components.append(
            ExplainabilityScoreComponent(
                key=key,
                label=COMPONENT_LABELS[key],
                raw_score=raw_score,
                weight=round(float(component.get("weight", 0.0)) * 100, 2),
                weighted_score=component.get("weighted"),
                available=bool(component.get("available", False)),
                note=_component_note(key, record, valuation),
            )
        )

    ahp_weights, criteria_code_to_id, criteria_code_to_name = _load_ahp_context(db, user)
    criteria_contributions: List[ExplainabilityCriteriaContribution] = []
    positive_factors: List[ExplainabilityFactor] = []
    negative_factors: List[ExplainabilityFactor] = []

    if ahp_weights and criteria_code_to_id:
        all_properties = db.query(Property).all()
        scorable_codes = [code for code in criteria_code_to_id if code in SCORABLE_CRITERIA_CODES]
        normalized_values = normalize_property_features(all_properties, scorable_codes).get(prop.id, {}) if scorable_codes else {}
        for code in scorable_codes:
            criteria_id = criteria_code_to_id.get(code)
            if criteria_id is None:
                continue
            weight = float(ahp_weights.get(criteria_id, 0.0))
            normalized_value = float(normalized_values.get(code, 0.0))
            contribution_score = round(weight * normalized_value * 100, 2)
            criteria_name = criteria_code_to_name.get(code, code)
            direction = CRITERIA_PROPERTY_MAP.get(code, {}).get("direction")
            description = (
                f"{criteria_name} đóng góp {contribution_score:.1f} điểm dựa trên giá trị chuẩn hóa {normalized_value:.2f}."
            )
            sentiment = "positive" if normalized_value >= 0.6 else "negative" if normalized_value <= 0.35 and weight >= 0.12 else "neutral"
            criteria_contributions.append(
                ExplainabilityCriteriaContribution(
                    criteria_code=code,
                    criteria_name=criteria_name,
                    source="ahp",
                    weight=round(weight * 100, 2),
                    raw_value=_format_raw_value(prop, code),
                    normalized_value=round(normalized_value, 3),
                    contribution_score=contribution_score,
                    sentiment=sentiment,
                    description=description,
                )
            )
            if sentiment == "positive":
                positive_factors.append(
                    ExplainabilityFactor(
                        title=criteria_name,
                        detail=f"Giá trị hiện tại phù hợp tốt với ưu tiên AHP của bạn.",
                        category="ahp",
                        impact_score=contribution_score,
                    )
                )
            elif sentiment == "negative":
                detail = "Tiêu chí này đang cho tín hiệu yếu trong so sánh tương đối."
                if direction == "inverse":
                    detail = "Tiêu chí này đang kém lợi thế hơn vì mức giá chưa đủ cạnh tranh."
                negative_factors.append(
                    ExplainabilityFactor(
                        title=criteria_name,
                        detail=detail,
                        category="ahp",
                        impact_score=contribution_score,
                    )
                )

    total_fit_checks = max(len(fit_result.matched_criteria) + len(fit_result.unmatched_criteria), 1)
    rule_step = round(100 / total_fit_checks, 2)
    for code in fit_result.matched_criteria:
        criteria_name = CRITERIA_LABELS.get(code, code)
        criteria_contributions.append(
            ExplainabilityCriteriaContribution(
                criteria_code=code,
                criteria_name=criteria_name,
                source="rule",
                weight=None,
                raw_value="Đạt",
                normalized_value=None,
                contribution_score=rule_step,
                sentiment="positive",
                description=f"Bất động sản hiện đáp ứng tốt tiêu chí {criteria_name.lower()} trong hồ sơ nhu cầu.",
            )
        )
        positive_factors.append(
            ExplainabilityFactor(
                title=criteria_name,
                detail="Tiêu chí này đang khớp với hồ sơ nhu cầu hiện tại của bạn.",
                category="rule",
                impact_score=rule_step,
            )
        )

    for code in fit_result.unmatched_criteria:
        criteria_name = CRITERIA_LABELS.get(code, code)
        criteria_contributions.append(
            ExplainabilityCriteriaContribution(
                criteria_code=code,
                criteria_name=criteria_name,
                source="rule",
                weight=None,
                raw_value="Chưa đạt",
                normalized_value=None,
                contribution_score=-rule_step,
                sentiment="negative",
                description=f"Bất động sản này chưa đáp ứng tốt tiêu chí {criteria_name.lower()} trong hồ sơ nhu cầu.",
            )
        )
        negative_factors.append(
            ExplainabilityFactor(
                title=criteria_name,
                detail="Tiêu chí này đang là điểm cần cân nhắc theo hồ sơ nhu cầu của bạn.",
                category="rule",
                impact_score=rule_step,
            )
        )

    ai_valuation_interpretation = _ai_interpretation(prop, valuation)
    if valuation and valuation.valuation_gap_percent is not None:
        impact = abs(valuation.valuation_gap_percent)
        if valuation.valuation_label == "Định giá thấp":
            positive_factors.append(
                ExplainabilityFactor(
                    title="Tín hiệu giá từ AI",
                    detail="AI cho thấy giá niêm yết đang thấp hơn mức dự đoán.",
                    category="valuation",
                    impact_score=round(impact, 2),
                )
            )
        elif valuation.valuation_label == "Định giá cao":
            negative_factors.append(
                ExplainabilityFactor(
                    title="Tín hiệu giá từ AI",
                    detail="AI cho thấy giá niêm yết đang cao hơn mức dự đoán.",
                    category="valuation",
                    impact_score=round(impact, 2),
                )
            )

    criteria_contributions.sort(key=lambda item: abs(item.contribution_score), reverse=True)
    positive_factors.sort(key=lambda item: item.impact_score or 0.0, reverse=True)
    negative_factors.sort(key=lambda item: item.impact_score or 0.0, reverse=True)

    return PropertyExplainabilityResponse(
        property_id=prop.id,
        final_score=record.final_score,
        recommendation_label=record.recommendation_label,
        score_components=score_components,
        criteria_contributions=criteria_contributions[:10],
        strongest_positive_factors=positive_factors[:5],
        strongest_negative_factors=negative_factors[:5],
        ai_valuation_interpretation=ai_valuation_interpretation,
        final_explanation_text=record.explanation_summary or "Chưa đủ dữ liệu để tạo giải thích tổng hợp.",
    )