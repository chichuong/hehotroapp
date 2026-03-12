from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.models.favorite import Favorite
from app.models.property import Property
from app.models.user import User
from app.schemas.property import PropertyListItem
from app.core.security import require_current_user

router = APIRouter()

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"


def _get_primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


@router.post("/{property_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản",
        )

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.property_id == property_id)
        .first()
    )
    if existing:
        return {"message": "Bất động sản đã có trong danh sách yêu thích", "favorited": True}

    fav = Favorite(user_id=user.id, property_id=property_id)
    db.add(fav)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"message": "Bất động sản đã có trong danh sách yêu thích", "favorited": True}

    return {"message": "Đã thêm vào danh sách yêu thích", "favorited": True}


@router.delete("/{property_id}")
def remove_favorite(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.property_id == property_id)
        .first()
    )
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bất động sản không có trong danh sách yêu thích",
        )
    db.delete(fav)
    db.commit()
    return {"message": "Đã xóa khỏi danh sách yêu thích", "favorited": False}


@router.get("", response_model=List[PropertyListItem])
def get_favorites(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    favs = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    property_ids = [f.property_id for f in favs]
    if not property_ids:
        return []

    properties = (
        db.query(Property)
        .options(joinedload(Property.images))
        .filter(Property.id.in_(property_ids))
        .all()
    )
    prop_map = {}
    for p in properties:
        if p.id not in prop_map:
            prop_map[p.id] = p

    items = []
    for pid in property_ids:
        p = prop_map.get(pid)
        if not p:
            continue
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
    return items


@router.get("/check/{property_id}")
def check_favorite(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.property_id == property_id)
        .first()
    )
    return {"favorited": fav is not None}
