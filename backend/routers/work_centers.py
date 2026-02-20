from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, WorkCenter, UserRole
from routers.auth import get_current_user

router = APIRouter()


class WorkCenterCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    traveler_type: Optional[str] = None
    is_active: bool = True


class WorkCenterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    traveler_type: Optional[str] = None
    is_active: Optional[bool] = None


class WorkCenterResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    traveler_type: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[WorkCenterResponse])
async def get_work_centers(
    traveler_type: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all work centers, optionally filtered by traveler type"""
    query = db.query(WorkCenter)

    if not include_inactive:
        query = query.filter(WorkCenter.is_active == True)

    if traveler_type:
        query = query.filter(WorkCenter.traveler_type == traveler_type)

    return query.order_by(WorkCenter.name).all()


@router.post("/", response_model=WorkCenterResponse)
async def create_work_center(
    wc_data: WorkCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new work center (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create work centers")

    # Check if code already exists
    existing = db.query(WorkCenter).filter(WorkCenter.code == wc_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Work center with code '{wc_data.code}' already exists")

    db_wc = WorkCenter(
        name=wc_data.name,
        code=wc_data.code,
        description=wc_data.description,
        traveler_type=wc_data.traveler_type,
        is_active=wc_data.is_active
    )
    db.add(db_wc)
    db.commit()
    db.refresh(db_wc)
    return db_wc


@router.put("/{wc_id}", response_model=WorkCenterResponse)
async def update_work_center(
    wc_id: int,
    wc_data: WorkCenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a work center (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update work centers")

    wc = db.query(WorkCenter).filter(WorkCenter.id == wc_id).first()
    if not wc:
        raise HTTPException(status_code=404, detail="Work center not found")

    # Check code uniqueness if changing
    if wc_data.code and wc_data.code != wc.code:
        existing = db.query(WorkCenter).filter(WorkCenter.code == wc_data.code).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Work center with code '{wc_data.code}' already exists")

    update_data = wc_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(wc, field, value)

    db.commit()
    db.refresh(wc)
    return wc


@router.delete("/{wc_id}")
async def delete_work_center(
    wc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a work center (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete work centers")

    wc = db.query(WorkCenter).filter(WorkCenter.id == wc_id).first()
    if not wc:
        raise HTTPException(status_code=404, detail="Work center not found")

    db.delete(wc)
    db.commit()
    return {"message": f"Work center '{wc.name}' deleted successfully", "id": wc_id}


@router.post("/sync-from-static")
async def sync_from_static_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync static work center data into the database (Admin only).
    This imports work centers from the frontend static data if they don't already exist."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can sync work centers")

    # This endpoint is called once to seed DB from static data
    # The frontend will call this on first load of the work center page
    return {"message": "Use frontend sync functionality to import static data"}
