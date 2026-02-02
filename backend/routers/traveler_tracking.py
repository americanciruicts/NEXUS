"""
Traveler Time Tracking Router - Independent from Labor Entries
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import User, TravelerTimeEntry, Traveler, NotificationType
from routers.auth import get_current_user
from services.notification_service import create_notification_for_admins

router = APIRouter()

class TimeEntryCreate(BaseModel):
    job_number: str
    work_center: str
    operator_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    is_completed: Optional[bool] = False

class TimeEntryUpdate(BaseModel):
    pause_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_completed: Optional[bool] = None

class TimeEntryResponse(BaseModel):
    id: int
    traveler_id: int
    job_number: str
    work_center: str
    operator_name: str
    start_time: datetime
    pause_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    hours_worked: float
    pause_duration: float
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=TimeEntryResponse)
async def start_time_entry(
    entry_data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new traveler time tracking entry"""

    # Find traveler by job number
    traveler = db.query(Traveler).filter(Traveler.job_number == entry_data.job_number).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traveler with job number {entry_data.job_number} not found"
        )

    # Check if user has an active entry
    active_entry = db.query(TravelerTimeEntry).filter(
        (TravelerTimeEntry.created_by == current_user.id) &
        (TravelerTimeEntry.end_time.is_(None)) &
        (TravelerTimeEntry.is_completed == False)
    ).first()

    if active_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active tracking session. Please complete it first."
        )

    # Create time entry
    db_entry = TravelerTimeEntry(
        traveler_id=traveler.id,
        job_number=entry_data.job_number,
        work_center=entry_data.work_center,
        operator_name=entry_data.operator_name,
        start_time=entry_data.start_time,
        end_time=entry_data.end_time,
        is_completed=entry_data.is_completed or False,
        created_by=current_user.id
    )

    # Calculate hours if end_time is provided (for manual/completed entries)
    if entry_data.end_time:
        # Validate that end_time is after start_time (prevent negative hours)
        if entry_data.end_time <= entry_data.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time. Please check your times and try again."
            )
        time_diff = entry_data.end_time - entry_data.start_time
        hours_worked = round(time_diff.total_seconds() / 3600, 2)

        # Additional safety check for negative hours
        if hours_worked < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated hours ({hours_worked}) is negative. End time must be after start time."
            )

        db_entry.hours_worked = hours_worked

    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRACKING_ENTRY_CREATED,
        title="New Tracking Entry Started",
        message=f"{current_user.username} started tracking for {entry_data.job_number} - {entry_data.work_center}",
        reference_id=db_entry.id,
        reference_type="tracking_entry",
        created_by_username=current_user.username
    )

    return db_entry

@router.put("/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: int,
    entry_data: TimeEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update/complete a time tracking entry"""

    entry = db.query(TravelerTimeEntry).filter(TravelerTimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    # Update pause time
    if entry_data.pause_time:
        entry.pause_time = entry_data.pause_time

    # Update end time and calculate hours
    if entry_data.end_time:
        # Validate that end_time is after start_time (prevent negative hours)
        if entry_data.end_time <= entry.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time. Please check your times and try again."
            )

        entry.end_time = entry_data.end_time

        # Calculate total hours worked
        time_diff = entry_data.end_time - entry.start_time
        total_seconds = time_diff.total_seconds()

        # Additional safety check for negative seconds
        if total_seconds < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated time is negative. End time must be after start time."
            )

        # Subtract pause duration if paused
        if entry.pause_time and entry_data.end_time > entry.pause_time:
            pause_seconds = (entry_data.end_time - entry.pause_time).total_seconds()
            entry.pause_duration = round(pause_seconds / 3600, 2)

        hours_worked = round(total_seconds / 3600, 2)

        # Final validation that hours are not negative
        if hours_worked < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated hours ({hours_worked}) is negative. Please verify your times."
            )

        entry.hours_worked = hours_worked

    if entry_data.is_completed is not None:
        entry.is_completed = entry_data.is_completed

    db.commit()
    db.refresh(entry)

    # Create notification for all admins
    action = "completed" if entry_data.end_time else "updated"
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRACKING_ENTRY_UPDATED,
        title=f"Tracking Entry {action.capitalize()}",
        message=f"{current_user.username} {action} tracking for {entry.job_number} - {entry.work_center}",
        reference_id=entry.id,
        reference_type="tracking_entry",
        created_by_username=current_user.username
    )

    return entry

@router.delete("/{entry_id}")
async def delete_time_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a time entry (Admin only)"""

    from models import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete time entries"
        )

    entry = db.query(TravelerTimeEntry).filter(TravelerTimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    # Get info for notification before deletion
    job_number = entry.job_number
    work_center = entry.work_center

    db.delete(entry)
    db.commit()

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRACKING_ENTRY_DELETED,
        title="Tracking Entry Deleted",
        message=f"{current_user.username} deleted tracking entry for {job_number} - {work_center}",
        reference_id=entry_id,
        reference_type="tracking_entry",
        created_by_username=current_user.username
    )

    return {"message": "Time entry deleted successfully", "id": entry_id}

@router.get("/", response_model=List[TimeEntryResponse])
async def get_all_time_entries(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all time entries"""

    start_date = datetime.now() - timedelta(days=days)

    # Admin can see all entries
    if current_user.role.value == "ADMIN":
        entries = db.query(TravelerTimeEntry).filter(
            TravelerTimeEntry.created_at >= start_date
        ).order_by(TravelerTimeEntry.created_at.desc()).all()
    else:
        entries = db.query(TravelerTimeEntry).filter(
            (TravelerTimeEntry.created_by == current_user.id) &
            (TravelerTimeEntry.created_at >= start_date)
        ).order_by(TravelerTimeEntry.created_at.desc()).all()

    return entries

@router.get("/active", response_model=Optional[TimeEntryResponse])
async def get_active_entry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's active time entry"""

    active_entry = db.query(TravelerTimeEntry).filter(
        (TravelerTimeEntry.created_by == current_user.id) &
        (TravelerTimeEntry.end_time.is_(None)) &
        (TravelerTimeEntry.is_completed == False)
    ).first()

    return active_entry

@router.get("/check-auto-stop")
async def check_and_auto_stop(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if it's past 5pm and auto-stop any active entries
    This should be called when page loads to ensure entries are auto-stopped"""

    now = datetime.now()
    today = now.date()
    five_pm = datetime.combine(today, datetime.strptime("17:00:00", "%H:%M:%S").time())

    # Only process if current time is past 5pm
    if now < five_pm:
        return {
            "message": "Not yet 5pm, no auto-stop performed",
            "current_time": now.isoformat(),
            "cutoff_time": five_pm.isoformat(),
            "completed_count": 0
        }

    # Get all active entries that started before 5pm
    active_entries = db.query(TravelerTimeEntry).filter(
        (TravelerTimeEntry.end_time.is_(None)) &
        (TravelerTimeEntry.is_completed == False) &
        (TravelerTimeEntry.start_time < five_pm)
    ).all()

    completed_count = 0
    for entry in active_entries:
        entry.end_time = five_pm
        entry.is_completed = True
        time_diff = five_pm - entry.start_time
        entry.hours_worked = round(time_diff.total_seconds() / 3600, 2)
        completed_count += 1

    if completed_count > 0:
        db.commit()

    return {
        "message": f"Auto-stopped {completed_count} entries at 5pm cutoff",
        "current_time": now.isoformat(),
        "cutoff_time": five_pm.isoformat(),
        "completed_count": completed_count
    }
