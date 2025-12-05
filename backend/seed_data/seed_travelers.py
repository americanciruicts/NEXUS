"""
Seed data script to create initial travelers
This will create 3 sample travelers if they don't already exist
"""

from sqlalchemy.orm import Session
from models import Traveler, User, TravelerType, TravelerStatus, Priority
from database import SessionLocal, engine, Base
from datetime import datetime

def seed_travelers():
    """Create seed travelers if they don't exist"""

    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if we have a user to assign as creator
        user = db.query(User).first()
        if not user:
            print("No user found, creating default admin users...")
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

            # Create admin users: Adam, Kris, Alex, Preet, and Kanav
            admin_users = [
                {
                    "username": "adam",
                    "email": "adam@nexus.local",
                    "first_name": "Adam",
                    "last_name": "",
                    "password": "nexus123"
                },
                {
                    "username": "kris",
                    "email": "kris@nexus.local",
                    "first_name": "Kris",
                    "last_name": "",
                    "password": "nexus123"
                },
                {
                    "username": "alex",
                    "email": "alex@nexus.local",
                    "first_name": "Alex",
                    "last_name": "",
                    "password": "nexus123"
                },
                {
                    "username": "preet",
                    "email": "preet@nexus.local",
                    "first_name": "Preet",
                    "last_name": "",
                    "password": "nexus123"
                },
                {
                    "username": "kanav",
                    "email": "kanav@nexus.local",
                    "first_name": "Kanav",
                    "last_name": "",
                    "password": "nexus123"
                }
            ]

            for admin_data in admin_users:
                # Check if user already exists
                existing_user = db.query(User).filter(User.username == admin_data["username"]).first()
                if not existing_user:
                    new_user = User(
                        username=admin_data["username"],
                        email=admin_data["email"],
                        first_name=admin_data["first_name"],
                        last_name=admin_data["last_name"],
                        hashed_password=pwd_context.hash(admin_data["password"]),
                        role="ADMIN",
                        is_approver=True,
                        is_active=True
                    )
                    db.add(new_user)
                    print(f"Created admin user: {admin_data['username']}")
                    if not user:
                        user = new_user  # Set first user as default creator
                else:
                    print(f"User {admin_data['username']} already exists")
                    if not user:
                        user = existing_user  # Set first existing user as default creator

            db.commit()
            if user:
                db.refresh(user)

        # SEED DATA DISABLED - Only user-inserted data will be used
        # No seed travelers will be created
        print("Seed data creation disabled. Only user-created travelers will be used.")

        db.commit()
        print("✅ Seed data created successfully!")

    except Exception as e:
        print(f"❌ Error creating seed data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_travelers()
