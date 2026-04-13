"""Phase A: dedicated kitting timer subsystem.

Creates two tables:
  - kitting_timer_sessions: rows for ACTIVE / WAITING_PARTS intervals per traveler
  - kitting_event_logs: audit timeline of state transitions

Idempotent: safe to re-run. Note that Base.metadata.create_all() in main.py will
also auto-create these tables on next backend startup, so running this script is
optional — but it lets you verify creation independently.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text


def _table_exists(conn, name: str) -> bool:
    return conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :name)"
    ), {"name": name}).scalar()


def migrate():
    with engine.connect() as conn:
        if _table_exists(conn, "kitting_timer_sessions"):
            print("kitting_timer_sessions already exists, skipping.")
        else:
            conn.execute(text(
                """
                CREATE TABLE kitting_timer_sessions (
                    id SERIAL PRIMARY KEY,
                    traveler_id INTEGER NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
                    step_id INTEGER REFERENCES process_steps(id),
                    employee_id INTEGER REFERENCES users(id),
                    session_type VARCHAR(20) NOT NULL,
                    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    end_time TIMESTAMPTZ,
                    duration_seconds DOUBLE PRECISION,
                    note TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            ))
            conn.execute(text("CREATE INDEX ix_kts_traveler_id ON kitting_timer_sessions (traveler_id)"))
            conn.execute(text("CREATE INDEX ix_kts_open ON kitting_timer_sessions (traveler_id) WHERE end_time IS NULL"))
            conn.commit()
            print("Created kitting_timer_sessions.")

        if _table_exists(conn, "kitting_event_logs"):
            print("kitting_event_logs already exists, skipping.")
        else:
            conn.execute(text(
                """
                CREATE TABLE kitting_event_logs (
                    id SERIAL PRIMARY KEY,
                    traveler_id INTEGER NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
                    session_id INTEGER REFERENCES kitting_timer_sessions(id) ON DELETE SET NULL,
                    event_type VARCHAR(32) NOT NULL,
                    source VARCHAR(20) NOT NULL DEFAULT 'user',
                    actor_id INTEGER REFERENCES users(id),
                    payload TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            ))
            conn.execute(text("CREATE INDEX ix_kel_traveler_id ON kitting_event_logs (traveler_id)"))
            conn.execute(text("CREATE INDEX ix_kel_created_at ON kitting_event_logs (created_at)"))
            conn.commit()
            print("Created kitting_event_logs.")


if __name__ == "__main__":
    migrate()
    print("Done.")
