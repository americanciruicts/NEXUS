"""
Migration script to update user roles from 4 roles to 2 roles (ADMIN and OPERATOR)
This script will:
- Convert SUPERVISOR -> ADMIN (supervisors have elevated permissions)
- Convert VIEWER -> OPERATOR (viewers will have basic operator access)
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aci_admin:SecurePassword123!@db-consolidation-postgres-1:5432/aci_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_roles():
    """Migrate user roles from 4 to 2"""
    db = SessionLocal()
    try:
        # Convert SUPERVISOR to ADMIN
        result = db.execute(
            text("UPDATE users SET role = 'ADMIN' WHERE role = 'SUPERVISOR'")
        )
        supervisor_count = result.rowcount
        print(f"✓ Converted {supervisor_count} SUPERVISOR users to ADMIN")

        # Convert VIEWER to OPERATOR
        result = db.execute(
            text("UPDATE users SET role = 'OPERATOR' WHERE role = 'VIEWER'")
        )
        viewer_count = result.rowcount
        print(f"✓ Converted {viewer_count} VIEWER users to OPERATOR")

        db.commit()

        # Display current role distribution
        result = db.execute(text("SELECT role, COUNT(*) as count FROM users GROUP BY role"))
        print("\nCurrent user role distribution:")
        for row in result:
            print(f"  {row[0]}: {row[1]} users")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting role migration...")
    print("This will convert:")
    print("  - SUPERVISOR → ADMIN")
    print("  - VIEWER → OPERATOR")
    print()

    response = input("Continue? (yes/no): ")
    if response.lower() == 'yes':
        migrate_roles()
    else:
        print("Migration cancelled.")
