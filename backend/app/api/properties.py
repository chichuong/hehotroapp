import math
from typing import Optional, Literal, Union, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func as sa_func

from app.db.session import get_db
from app.models.property import Property
from app.models.property_image import PropertyImage
from app.models.user import User
from app.models.user_profile import UserProfile
from app.core.security import get_current_user
from app.schemas.property import (
    PropertyListItem,
    PropertyListResponse,
    PropertyDetail,
    PropertyMapItem,
    PropertyMapResponse,
)
from app.services.dss_engine import calculate_property_fit_brief
from app.services.valuation_service import get_existing_valuation
from app.models.property_dss_score import PropertyDSSScore

router = APIRouter()

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"

VALID_SORT_FIELDS = {"price", "rooms", "year_built", "created_at", "suburb"}


def _get_primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _build_filtered_query(db: Session, **kwargs):
    """Build a filtered query from keyword arguments."""
    query = db.query(Property)

    search = kwargs.get("search")
    suburb = kwargs.get("suburb")
    min_price = kwargs.get("min_price")
    max_price = kwargs.get("max_price")
    min_rooms = kwargs.get("min_rooms")
    max_rooms = kwargs.get("max_rooms")
    min_bedrooms = kwargs.get("min_bedrooms")
    min_bathrooms = kwargs.get("min_bathrooms")
    min_cars = kwargs.get("min_cars")
    property_type = kwargs.get("property_type")
    min_year_built = kwargs.get("min_year_built")
    max_year_built = kwargs.get("max_year_built")

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Property.title.ilike(like_term),
                Property.address.ilike(like_term),
                Property.suburb.ilike(like_term),
                Property.region_name.ilike(like_term),
            )
        )
    if suburb:
        query = query.filter(Property.suburb.ilike(f"%{suburb}%"))
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)
    if min_rooms is not None:
        query = query.filter(Property.rooms >= min_rooms)
    if max_rooms is not None:
        query = query.filter(Property.rooms <= max_rooms)
    if min_bedrooms is not None:
        query = query.filter(Property.bedrooms >= min_bedrooms)
    if min_bathrooms is not None:
        query = query.filter(Property.bathrooms >= min_bathrooms)
    if min_cars is not None:
        query = query.filter(Property.cars >= min_cars)
    if property_type:
        query = query.filter(Property.property_type == property_type)
    if min_year_built is not None:
        query = query.filter(Property.year_built >= min_year_built)
    if max_year_built is not None:
        query = query.filter(Property.year_built <= max_year_built)

    return query


@router.get("")
def list_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    suburb: Optional[str] = Query(None, max_length=200),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rooms: Optional[int] = Query(None, ge=0),
    max_rooms: Optional[int] = Query(None, ge=0),
    min_bedrooms: Optional[int] = Query(None, ge=0),
    min_bathrooms: Optional[int] = Query(None, ge=0),
    min_cars: Optional[int] = Query(None, ge=0),
    property_type: Optional[str] = Query(None, max_length=100),
    min_year_built: Optional[int] = Query(None),
    max_year_built: Optional[int] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[Literal["asc", "desc"]] = Query(None),
    view: Optional[str] = Query(None),
    include_fit: bool = Query(False),
    include_valuation: bool = Query(False),
    include_dss: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Union[PropertyListResponse, PropertyMapResponse]:
    query = _build_filtered_query(
        db,
        search=search,
        suburb=suburb,
        min_price=min_price,
        max_price=max_price,
        min_rooms=min_rooms,
        max_rooms=max_rooms,
        min_bedrooms=min_bedrooms,
        min_bathrooms=min_bathrooms,
        min_cars=min_cars,
        property_type=property_type,
        min_year_built=min_year_built,
        max_year_built=max_year_built,
    )

    # Map view mode — lightweight payload with coordinates only
    if view == "map":
        query = query.filter(
            Property.latitude.isnot(None),
            Property.longitude.isnot(None),
        )
        total = query.count()
        # Bounded to 2000 markers for performance
        properties = (
            query.options(joinedload(Property.images))
            .order_by(Property.id)
            .limit(2000)
            .all()
        )
        seen_ids: set[int] = set()
        items: List[PropertyMapItem] = []
        for p in properties:
            if p.id in seen_ids:
                continue
            seen_ids.add(p.id)
            items.append(
                PropertyMapItem(
                    id=p.id,
                    title=p.title,
                    price=p.price,
                    address=p.address,
                    suburb=p.suburb,
                    latitude=p.latitude,
                    longitude=p.longitude,
                    primary_image=_get_primary_image(p),
                )
            )
        return PropertyMapResponse(items=items, total=total)

    # Standard list mode
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Sorting
    order_col = Property.id  # default
    if sort_by and sort_by in VALID_SORT_FIELDS:
        order_col = getattr(Property, sort_by)
    order_dir = "asc" if sort_order != "desc" else "desc"

    if order_dir == "desc":
        query = query.order_by(order_col.desc().nullslast())
    else:
        query = query.order_by(order_col.asc().nullslast())

    offset = (page - 1) * page_size
    properties = (
        query.options(joinedload(Property.images))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    seen_ids_list: set[int] = set()
    items_list: List[PropertyListItem] = []

    # Load user profile for fit calculation if requested
    user_profile = None
    if include_fit and current_user:
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    for p in properties:
        if p.id in seen_ids_list:
            continue
        seen_ids_list.add(p.id)
        item = PropertyListItem(
            id=p.id,
            title=p.title,
            address=p.address,
            suburb=p.suburb,
            price=p.price,
            rooms=p.rooms,
            bathrooms=p.bathrooms,
            cars=p.cars,
            property_type=p.property_type,
            primary_image=_get_primary_image(p),
        )
        if user_profile:
            fit = calculate_property_fit_brief(p, user_profile)
            item.fit_score_basic = fit.fit_score_basic
            item.fit_label = fit.fit_label
            item.fit_reason_short = fit.fit_reason_short
        if include_valuation:
            val = get_existing_valuation(db, p.id)
            if val:
                item.predicted_price = val.predicted_price
                item.valuation_label = val.valuation_label
                item.valuation_gap_percent = val.valuation_gap_percent
        if include_dss and current_user:
            dss_rec = (
                db.query(PropertyDSSScore)
                .filter(
                    PropertyDSSScore.user_id == current_user.id,
                    PropertyDSSScore.property_id == p.id,
                )
                .first()
            )
            if dss_rec:
                item.dss_final_score = dss_rec.final_score
                item.dss_recommendation_label = dss_rec.recommendation_label
                exp = dss_rec.explanation_summary
                item.dss_explanation_short = (
                    exp if exp and len(exp) <= 120
                    else (exp[:120].rsplit(' ', 1)[0] + '…') if exp else None
                )
        items_list.append(item)

    return PropertyListResponse(
        items=items_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/suburbs")
def list_suburbs(db: Session = Depends(get_db)):
    """Return distinct suburb names for filter dropdowns."""
    rows = (
        db.query(Property.suburb)
        .filter(Property.suburb.isnot(None))
        .distinct()
        .order_by(Property.suburb)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/types")
def list_property_types(db: Session = Depends(get_db)):
    """Return distinct property types for filter dropdowns."""
    rows = (
        db.query(Property.property_type)
        .filter(Property.property_type.isnot(None))
        .distinct()
        .order_by(Property.property_type)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{property_id}", response_model=PropertyDetail)
def get_property(property_id: int, db: Session = Depends(get_db)):
    prop = (
        db.query(Property)
        .options(joinedload(Property.images))
        .filter(Property.id == property_id)
        .first()
    )
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản",
        )
    return PropertyDetail.model_validate(prop)


@router.get("/{property_id}/related", response_model=List[PropertyListItem])
def get_related_properties(
    property_id: int,
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản",
        )

    # Related: same suburb, similar price ±30%, similar rooms ±1
    query = (
        db.query(Property)
        .options(joinedload(Property.images))
        .filter(Property.id != property_id)
    )

    # Prefer same suburb
    candidates_same_suburb = query.filter(Property.suburb == prop.suburb)

    # Price range ±30%
    if prop.price:
        lo = prop.price * 0.7
        hi = prop.price * 1.3
        candidates_same_suburb = candidates_same_suburb.filter(
            Property.price.between(lo, hi)
        )

    results = candidates_same_suburb.limit(limit).all()

    # If not enough, broaden search
    if len(results) < limit:
        existing_ids = {r.id for r in results}
        existing_ids.add(property_id)
        broader = (
            db.query(Property)
            .options(joinedload(Property.images))
            .filter(Property.id.notin_(existing_ids))
        )
        if prop.rooms is not None:
            broader = broader.filter(
                Property.rooms.between(max(0, prop.rooms - 1), prop.rooms + 1)
            )
        if prop.price:
            lo = prop.price * 0.5
            hi = prop.price * 1.5
            broader = broader.filter(Property.price.between(lo, hi))
        fill = broader.limit(limit - len(results)).all()
        results.extend(fill)

    # Deduplicate and build response
    seen: set[int] = set()
    items: List[PropertyListItem] = []
    for p in results:
        if p.id in seen:
            continue
        seen.add(p.id)
        items.append(
            PropertyListItem(
                id=p.id,
                title=p.title,
                address=p.address,
                suburb=p.suburb,
                price=p.price,
                rooms=p.rooms,
                bathrooms=p.bathrooms,
                cars=p.cars,
                property_type=p.property_type,
                primary_image=_get_primary_image(p),
            )
        )
    return items[:limit]
