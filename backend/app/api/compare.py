from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.security import require_current_user
from app.db.session import get_db
from app.models.comparison_item import ComparisonItem
from app.models.property import Property
from app.models.user import User
from app.schemas.phase7 import ComparisonAddRequest, ComparisonListResponse, ComparisonPropertyItem
from app.services.dss_combination_service import get_or_compute_property_dss
from app.services.valuation_service import get_existing_valuation, predict_property_value

router = APIRouter()

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"
MAX_COMPARE_ITEMS = 4


def _primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _serialize_compare_items(db: Session, user: User, items: List[ComparisonItem]) -> ComparisonListResponse:
    property_ids = [item.property_id for item in items]
    if not property_ids:
        return ComparisonListResponse(max_items=MAX_COMPARE_ITEMS, items=[])

    properties = (
        db.query(Property)
        .options(joinedload(Property.images))
        .filter(Property.id.in_(property_ids))
        .all()
    )
    prop_map = {prop.id: prop for prop in properties}
    response_items: List[ComparisonPropertyItem] = []
    for item in items:
        prop = prop_map.get(item.property_id)
        if not prop:
            continue
        valuation = get_existing_valuation(db, prop.id)
        if valuation is None:
            try:
                valuation = predict_property_value(db, prop, user_id=user.id)
            except Exception:
                valuation = None
        dss_record = get_or_compute_property_dss(db, prop, user)
        response_items.append(
            ComparisonPropertyItem(
                property_id=prop.id,
                title=prop.title,
                address=prop.address,
                suburb=prop.suburb,
                property_type=prop.property_type,
                primary_image=_primary_image(prop),
                price=prop.price,
                rooms=prop.rooms,
                bathrooms=prop.bathrooms,
                cars=prop.cars,
                year_built=prop.year_built,
                ahp_score=dss_record.ahp_score if dss_record else None,
                predicted_price=valuation.predicted_price if valuation else None,
                valuation_label=valuation.valuation_label if valuation else None,
                final_dss_score=dss_record.final_score if dss_record else None,
                recommendation_label=dss_record.recommendation_label if dss_record else None,
                added_at=item.created_at,
            )
        )
    return ComparisonListResponse(max_items=MAX_COMPARE_ITEMS, items=response_items)


@router.get("", response_model=ComparisonListResponse)
def get_comparison_list(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id)
        .order_by(ComparisonItem.created_at.asc())
        .all()
    )
    return _serialize_compare_items(db, user, items)


@router.post("", response_model=ComparisonListResponse, status_code=status.HTTP_201_CREATED)
def add_to_comparison(
    payload: ComparisonAddRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == payload.property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bất động sản")

    existing = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id, ComparisonItem.property_id == payload.property_id)
        .first()
    )
    if existing:
        items = (
            db.query(ComparisonItem)
            .filter(ComparisonItem.user_id == user.id)
            .order_by(ComparisonItem.created_at.asc())
            .all()
        )
        return _serialize_compare_items(db, user, items)

    current_count = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id)
        .count()
    )
    if current_count >= MAX_COMPARE_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bạn chỉ có thể so sánh tối đa {MAX_COMPARE_ITEMS} bất động sản cùng lúc",
        )

    item = ComparisonItem(user_id=user.id, property_id=payload.property_id)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    items = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id)
        .order_by(ComparisonItem.created_at.asc())
        .all()
    )
    return _serialize_compare_items(db, user, items)


@router.delete("/{property_id}", response_model=ComparisonListResponse)
def remove_from_comparison(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id, ComparisonItem.property_id == property_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bất động sản không có trong danh sách so sánh")

    db.delete(item)
    db.commit()

    items = (
        db.query(ComparisonItem)
        .filter(ComparisonItem.user_id == user.id)
        .order_by(ComparisonItem.created_at.asc())
        .all()
    )
    return _serialize_compare_items(db, user, items)