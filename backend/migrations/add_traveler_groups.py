"""Add traveler_groups table and group fields on travelers for linking related travelers"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Create traveler_groups table
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'traveler_groups')"
        ))
        if result.scalar():
            print("traveler_groups table already exists, skipping table creation.")
        else:
            conn.execute(text("""
                CREATE TABLE traveler_groups (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_by INTEGER REFERENCES users(id)
                )
            """))
            print("Created traveler_groups table.")

        # Add group columns to travelers
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'travelers' AND column_name = 'group_id')"
        ))
        if result.scalar():
            print("group_id column already exists on travelers, skipping.")
        else:
            conn.execute(text("ALTER TABLE travelers ADD COLUMN group_id INTEGER REFERENCES traveler_groups(id)"))
            conn.execute(text("ALTER TABLE travelers ADD COLUMN group_sequence INTEGER"))
            conn.execute(text("ALTER TABLE travelers ADD COLUMN group_label VARCHAR(50)"))
            conn.execute(text("CREATE INDEX ix_travelers_group_id ON travelers (group_id)"))
            print("Added group_id, group_sequence, group_label columns to travelers.")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
