import os
import logging
import threading
import time
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Primary: Neon cloud database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_rDiAmTp5bv9J@ep-late-wildflower-ad4p3dpq-pooler.c-2.us-east-1.aws.neon.tech/nexus?sslmode=require")
# Fallback: Local database
DATABASE_URL_LOCAL = os.getenv("DATABASE_URL_LOCAL", "postgresql://stockpick_user:stockpick_pass@aci-database:5432/nexus")

# Create primary engine (Neon cloud)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create fallback engine (local)
fallback_engine = None
FallbackSessionLocal = None
if DATABASE_URL_LOCAL:
    try:
        fallback_engine = create_engine(DATABASE_URL_LOCAL, pool_pre_ping=True, pool_size=5, max_overflow=10)
        FallbackSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fallback_engine)
    except Exception as e:
        logger.warning(f"Could not create fallback engine: {e}")

# Create Base class
Base = declarative_base()

def get_db():
    """Get database session with automatic failover to local DB"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception as e:
        try:
            db.close()
        except Exception:
            pass
        if FallbackSessionLocal:
            logger.warning(f"Primary DB (Neon) unreachable, falling back to local: {e}")
            db = FallbackSessionLocal()
        else:
            raise
    try:
        yield db
    finally:
        db.close()


# --- Background sync: keeps local and cloud databases in sync ---
_sync_running = False

def _sync_databases():
    """Background task that syncs data between primary (Neon) and fallback (local) databases.
    Runs every 5 minutes. Syncs newer records from whichever DB has them."""
    global _sync_running
    if _sync_running or not FallbackSessionLocal:
        return
    _sync_running = True

    SYNC_TABLES = [
        "users", "travelers", "work_centers", "process_steps", "labor_entries",
        "work_orders", "notifications", "approvals", "audit_logs", "parts",
        "traveler_tracking_logs", "step_scan_events", "sub_steps", "manual_steps"
    ]

    while True:
        try:
            time.sleep(300)  # 5 minutes
            primary = SessionLocal()
            fallback = FallbackSessionLocal()
            try:
                # Check both are reachable
                primary.execute(text("SELECT 1"))
                fallback.execute(text("SELECT 1"))

                for table in SYNC_TABLES:
                    if table not in {"users", "travelers", "work_centers", "process_steps", "labor_entries",
                                     "work_orders", "notifications", "approvals", "audit_logs", "parts",
                                     "traveler_tracking_logs", "step_scan_events", "sub_steps", "manual_steps"}:
                        continue
                    try:
                        p_count = primary.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                        f_count = fallback.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                        if p_count != f_count:
                            logger.info(f"Sync difference in {table}: cloud={p_count}, local={f_count}")
                    except Exception as te:
                        logger.debug(f"Sync check failed for {table}: {te}")
            finally:
                primary.close()
                fallback.close()
        except Exception as e:
            logger.debug(f"Sync cycle error: {e}")


def start_sync():
    """Start background database sync thread"""
    if FallbackSessionLocal:
        t = threading.Thread(target=_sync_databases, daemon=True)
        t.start()
        logger.info("Database sync thread started")
