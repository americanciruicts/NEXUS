"""Add pause_logs table for tracking pause history on labor entries"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pause_logs')"
        ))
        if result.scalar():
            print("pause_logs table already exists, skipping.")
            return

        conn.execute(text("""
            CREATE TABLE pause_logs (
                id SERIAL PRIMARY KEY,
                labor_entry_id INTEGER NOT NULL REFERENCES labor_entries(id) ON DELETE CASCADE,
                paused_at TIMESTAMPTZ NOT NULL,
                resumed_at TIMESTAMPTZ,
                duration_seconds FLOAT,
                comment TEXT
            )
        """))
        conn.execute(text("CREATE INDEX ix_pause_logs_labor_entry_id ON pause_logs (labor_entry_id)"))
        conn.commit()
        print("Created pause_logs table successfully.")

if __name__ == "__main__":
    migrate()
