"""Add reason column to pause_logs for distinguishing 'BREAK' vs 'WAITING_PARTS' pauses.

Safe / idempotent: uses ADD COLUMN IF NOT EXISTS so re-running is a no-op.
Existing rows default to 'BREAK'.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pause_logs' AND column_name = 'reason'
            """
        ))
        if result.scalar():
            print("pause_logs.reason already exists, skipping.")
            return

        conn.execute(text(
            "ALTER TABLE pause_logs ADD COLUMN reason VARCHAR(32) DEFAULT 'BREAK'"
        ))
        # Backfill any NULLs (shouldn't be any with the default, but just in case)
        conn.execute(text(
            "UPDATE pause_logs SET reason = 'BREAK' WHERE reason IS NULL"
        ))
        conn.commit()
        print("Added pause_logs.reason column successfully.")


if __name__ == "__main__":
    migrate()
