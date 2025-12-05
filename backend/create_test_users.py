"""
Create users with unique passwords (8-12 characters with special characters and numbers)
"""
import sys
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import SessionLocal, engine
from models import User, UserRole, Base

# Create tables
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_users():
    db = SessionLocal()
    try:
        # Define all users with completely unique passwords
        users_data = [
            # ADMIN USERS
            {
                "username": "pratiksha",
                "email": "pratiksha@aci.local",
                "first_name": "Pratiksha",
                "last_name": "Admin",
                "password": "Mango$42Tx",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "cathy",
                "email": "cathy@aci.local",
                "first_name": "Cathy",
                "last_name": "Admin",
                "password": "Blue7!River",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "preet",
                "email": "preet@aci.local",
                "first_name": "Preet",
                "last_name": "Singh",
                "password": "Star9#Moon",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "kanav",
                "email": "kanav@aci.local",
                "first_name": "Kanav",
                "last_name": "Admin",
                "password": "Rock5$Wave",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "kris",
                "email": "kris@aci.local",
                "first_name": "Kris",
                "last_name": "Admin",
                "password": "Fire3@Lake",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "adam",
                "email": "adam@aci.local",
                "first_name": "Adam",
                "last_name": "Admin",
                "password": "Wind8%Tree",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "alex",
                "email": "alex@aci.local",
                "first_name": "Alex",
                "last_name": "Admin",
                "password": "Snow6^Peak",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            {
                "username": "admin",
                "email": "admin@aci.local",
                "first_name": "System",
                "last_name": "Admin",
                "password": "Cloud1&Rain",
                "role": UserRole.ADMIN,
                "is_approver": True
            },
            # OPERATOR USERS
            {
                "username": "user1",
                "email": "user1@aci.local",
                "first_name": "User",
                "last_name": "One",
                "password": "Tiger4!Jump",
                "role": UserRole.OPERATOR,
                "is_approver": False
            },
            {
                "username": "user2",
                "email": "user2@aci.local",
                "first_name": "User",
                "last_name": "Two",
                "password": "Eagle2#Fly",
                "role": UserRole.OPERATOR,
                "is_approver": False
            }
        ]

        created_users = []
        updated_users = []

        for user_data in users_data:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()

            if existing_user:
                # Update existing user's password and role
                existing_user.hashed_password = pwd_context.hash(user_data["password"])
                existing_user.role = user_data["role"]
                existing_user.is_approver = user_data["is_approver"]
                existing_user.is_active = True
                existing_user.first_name = user_data["first_name"]
                existing_user.last_name = user_data["last_name"]
                updated_users.append(user_data)
                print(f"Updated {user_data['username']} (role: {user_data['role'].value})")
            else:
                # Create new user
                new_user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    hashed_password=pwd_context.hash(user_data["password"]),
                    role=user_data["role"],
                    is_active=True,
                    is_approver=user_data["is_approver"]
                )
                db.add(new_user)
                created_users.append(user_data)
                print(f"Created {user_data['username']} (role: {user_data['role'].value})")

        db.commit()

        print("\n" + "="*60)
        print("USER CREDENTIALS")
        print("="*60)
        print("\nADMIN USERS:")
        print("-"*60)
        for user in users_data:
            if user["role"] == UserRole.ADMIN:
                print(f"  Username: {user['username']:<15} Password: {user['password']}")

        print("\nOPERATOR USERS:")
        print("-"*60)
        for user in users_data:
            if user["role"] == UserRole.OPERATOR:
                print(f"  Username: {user['username']:<15} Password: {user['password']}")

        print("\n" + "="*60)
        print(f"Total: {len(created_users)} created, {len(updated_users)} updated")
        print("="*60)

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_users()
