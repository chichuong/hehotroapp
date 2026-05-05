import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_admin():
    db = SessionLocal()
    email = "admin@bdsthongminh.vn"
    password = "admin"
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password_hash = hash_password(password)
            user.role = "admin"
            db.commit()
            print(f"Updated existing admin: {email} / Password: {password}")
        else:
            new_admin = User(
                full_name="Quản trị viên",
                email=email,
                password_hash=hash_password(password),
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print(f"Created new admin: {email} / Password: {password}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
        
if __name__ == "__main__":
    create_admin()
