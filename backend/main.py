from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn

from database import engine, get_db
from models import Base
from routers import travelers, users, work_orders, approvals, labor, auth, barcodes, traveler_tracking, notifications

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("NEXUS Backend starting up...")

    # Run seed data
    try:
        from seed_data.seed_travelers import seed_travelers
        print("Running seed data...")
        seed_travelers()
    except Exception as e:
        print(f"Warning: Could not run seed data: {e}")

    yield
    # Shutdown
    print("NEXUS Backend shutting down...")

app = FastAPI(
    title="NEXUS API",
    description="American Circuits Traveler Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
app.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
app.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
app.include_router(labor.router, prefix="/labor", tags=["labor"])
app.include_router(barcodes.router, prefix="/barcodes", tags=["barcodes"])
app.include_router(traveler_tracking.router, prefix="/tracking", tags=["traveler-tracking"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

@app.get("/")
async def root():
    return {"message": "NEXUS API - American Circuits Traveler Management System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "nexus-backend"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)