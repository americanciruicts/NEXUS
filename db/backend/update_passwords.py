"""
Update NEXUS user passwords from USER_CRED.MD
"""
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User passwords from USER_CRED.MD
users = {
    'pratiksha': 'Mango$42Tx',
    'cathy': 'Blue7!River',
    'preet': 'Star9#Moon',
    'kanav': 'Rock5$Wave',
    'kris': 'Fire3@Lake',
    'adam': 'Wind8%Tree',
    'alex': 'Snow6^Peak',
    'admin': 'Cloud1&Rain'
}

def update_passwords():
    db = SessionLocal()

    try:
        for username, password in users.items():
            # Check if user exists
            user = db.query(User).filter(User.username == username).first()

            if user:
                # Update existing user
                user.hashed_password = pwd_context.hash(password)
                user.email = f"{username}@americancircuits.com"
                user.role = "ADMIN"
                user.is_active = True
                user.is_approver = True
                print(f"✓ Updated password for {username}")
            else:
                # Create new user
                new_user = User(
                    username=username,
                    email=f"{username}@americancircuits.com",
                    hashed_password=pwd_context.hash(password),
                    role="ADMIN",
                    is_active=True,
                    is_approver=True,
                    first_name=username.capitalize(),
                    last_name=""
                )
                db.add(new_user)
                print(f"✓ Created user {username}")

        db.commit()
        print("\n✅ All passwords updated successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_passwords()
