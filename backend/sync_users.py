from database import SessionLocal
from models import User, UserRole
from routers.auth import get_password_hash

# Users from USER_CRED.MD
users_data = [
    # Admin Users
    {"username": "pratiksha", "password": "Mango$42Tx", "email": "pratiksha@aci.local", "first_name": "Pratiksha", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "cathy", "password": "Blue7!River", "email": "cathy@aci.local", "first_name": "Cathy", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "preet", "password": "Star9#Moon", "email": "preet@aci.local", "first_name": "Preet", "last_name": "Singh", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "kanav", "password": "Rock5$Wave", "email": "kanav@aci.local", "first_name": "Kanav", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "kris", "password": "Fire3@Lake", "email": "kris@aci.local", "first_name": "Kris", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "adam", "password": "Wind8%Tree", "email": "adam@aci.local", "first_name": "Adam", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "alex", "password": "Snow6^Peak", "email": "alex@aci.local", "first_name": "Alex", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    {"username": "admin", "password": "Cloud1&Rain", "email": "admin@aci.local", "first_name": "System", "last_name": "Admin", "role": UserRole.ADMIN, "is_approver": True},
    # Operator Users
    {"username": "user1", "password": "Tiger4!Jump", "email": "user1@aci.local", "first_name": "User", "last_name": "One", "role": UserRole.OPERATOR, "is_approver": False},
    {"username": "user2", "password": "Eagle2#Fly", "email": "user2@aci.local", "first_name": "User", "last_name": "Two", "role": UserRole.OPERATOR, "is_approver": False},
]

db = SessionLocal()

try:
    for user_data in users_data:
        # Check if user exists
        existing_user = db.query(User).filter(User.username == user_data["username"]).first()

        if existing_user:
            # Update existing user
            existing_user.email = user_data["email"]
            existing_user.first_name = user_data["first_name"]
            existing_user.last_name = user_data["last_name"]
            existing_user.role = user_data["role"]
            existing_user.is_approver = user_data["is_approver"]
            existing_user.is_active = True
            print(f"Updated user: {user_data['username']}")
        else:
            # Create new user
            hashed_password = get_password_hash(user_data["password"])
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                hashed_password=hashed_password,
                role=user_data["role"],
                is_approver=user_data["is_approver"],
                is_active=True
            )
            db.add(new_user)
            print(f"Created user: {user_data['username']}")

    db.commit()
    print("\nAll users synced successfully!")

    # Print all active users
    print("\nActive users:")
    users = db.query(User).filter(User.is_active == True).all()
    for u in users:
        print(f"  - {u.username} ({u.email}) - {u.role.value} - Approver: {u.is_approver}")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
