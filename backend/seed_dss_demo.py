import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.user_profile import UserProfile

def seed():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.full_name == "chichuong").first()
        if not user:
            # Maybe they use another name? Let's just use the first user.
            user = db.query(User).first()
            
        if not user:
            print("Không có user nào trong hệ thống!")
            return
            
        # Update or create profile
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if profile:
            profile.buying_purpose = "Để ở"
            profile.budget_min = 600000.0
            profile.budget_max = 1500000.0
            profile.preferred_suburbs = ["Richmond", "Abbotsford", "Brunswick"]
            profile.preferred_property_types = ["Nhà phố", "Biệt thự"]
            profile.min_bedrooms = 3
            profile.min_bathrooms = 2
            profile.min_cars = 1
            print("Updated profile successfully!")
        else:
            profile = UserProfile(
                user_id=user.id,
                buying_purpose="Để ở",
                budget_min=600000.0,
                budget_max=1500000.0,
                preferred_suburbs=["Richmond", "Abbotsford", "Brunswick"],
                preferred_property_types=["Nhà phố", "Biệt thự"],
                min_bedrooms=3,
                min_bathrooms=2,
                min_cars=1
            )
            db.add(profile)
            print("Created profile successfully!")
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
