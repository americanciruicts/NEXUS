import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="NEXUS API",
    description="American Circuits Traveler Management System API",
    version="1.0.0",
    redirect_slashes=False
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://nexus.americancircuits.net,https://aci-nexus.vercel.app,http://localhost:3000,http://localhost:103,http://acidashboard.aci.local:100,https://aci-forge.vercel.app,https://aci-kosh.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
try:
    from routers import travelers, users, work_orders, approvals, labor, auth, barcodes, traveler_tracking, notifications, search, dashboard, work_centers

    app.include_router(auth.router, prefix="/auth", tags=["authentication"])
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
    app.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
    app.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
    app.include_router(labor.router, prefix="/labor", tags=["labor"])
    app.include_router(barcodes.router, prefix="/barcodes", tags=["barcodes"])
    app.include_router(traveler_tracking.router, prefix="/tracking", tags=["traveler-tracking"])
    app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
    app.include_router(search.router, prefix="/search", tags=["search"])
    app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
    app.include_router(work_centers.router, prefix="/work-centers-mgmt", tags=["work-centers"])
    logger.info("All routers loaded successfully")
except Exception as e:
    logger.error(f"Failed to import routers: {e}")
    import traceback
    traceback.print_exc()

@app.get("/")
async def root():
    return {"message": "NEXUS API - American Circuits Traveler Management System", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    from sqlalchemy import text
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "service": "nexus-backend", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "service": "nexus-backend", "database": "disconnected", "error": str(e)}
