from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import User, LaborEntry, Traveler, ProcessStep, NotificationType
from routers.auth import get_current_user
from services.notification_service import create_notification_for_admins

router = APIRouter()

class LaborEntryCreate(BaseModel):
    traveler_id: int
    step_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    description: str
    is_completed: Optional[bool] = None

class LaborEntryUpdate(BaseModel):
    pause_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None

class LaborEntryResponse(BaseModel):
    id: int
    traveler_id: int
    step_id: Optional[int]
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    job_number: Optional[str] = None
    start_time: datetime
    pause_time: Optional[datetime] = None
    end_time: Optional[datetime]
    hours_worked: float
    description: str
    is_completed: bool
    work_center: Optional[str] = None
    sequence_number: Optional[int] = None
    created_at: datetime
    # Traveler information
    work_order: Optional[str] = None
    po_number: Optional[str] = None
    part_number: Optional[str] = None
    quantity: Optional[int] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=LaborEntryResponse)
@router.post("", response_model=LaborEntryResponse, include_in_schema=False)
async def start_labor_entry(
    labor_data: LaborEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new labor entry"""

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == labor_data.traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Verify step exists if provided and extract sequence number
    sequence_num = None
    work_center_name = None
    step_id = labor_data.step_id

    if step_id:
        step = db.query(ProcessStep).filter(ProcessStep.id == step_id).first()
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Process step not found"
            )
        sequence_num = step.step_number
        work_center_name = step.operation
    else:
        # If no step_id provided, try to find it from description
        # Description format: "WORK_CENTER - OPERATOR"
        if labor_data.description and ' - ' in labor_data.description:
            work_center_from_desc = labor_data.description.split(' - ')[0].strip()

            # Query all process steps for this traveler
            process_steps = db.query(ProcessStep).filter(
                ProcessStep.traveler_id == labor_data.traveler_id
            ).all()

            # Try to find matching step with fuzzy matching
            for ps in process_steps:
                ps_operation_upper = ps.operation.upper() if ps.operation else ""
                wc_upper = work_center_from_desc.upper()

                # Check various matching patterns
                if (
                    # Exact match (case-insensitive)
                    ps_operation_upper == wc_upper or
                    ps_operation_upper.replace('_', ' ') == wc_upper.replace('_', ' ') or
                    ps_operation_upper.replace(' ', '_') == wc_upper.replace(' ', '_') or
                    # Handle common variations
                    (wc_upper == 'AUTO_INSERTION' and ps_operation_upper == 'AUTO INSERT') or
                    (wc_upper == 'AUTO INSERT' and ps_operation_upper == 'AUTO_INSERTION') or
                    (wc_upper == 'E-TEST' and ps_operation_upper == 'ETEST') or
                    (wc_upper == 'ETEST' and ps_operation_upper == 'E-TEST') or
                    (wc_upper == 'MAKE_BOM' and ps_operation_upper == 'MAKE BOM') or
                    (wc_upper == 'MAKE BOM' and ps_operation_upper == 'MAKE_BOM')
                ):
                    # Found matching step
                    step_id = ps.id
                    sequence_num = ps.step_number
                    work_center_name = ps.operation
                    break

            # If still no match found, use the work center from description as-is
            if not work_center_name:
                work_center_name = work_center_from_desc

    # Check if user has an active labor entry
    # BUT: Allow manual entries (which have end_time already set) even if user has active entry
    if not labor_data.end_time:  # Only check for active entry if this is NOT a manual entry
        active_entry = db.query(LaborEntry).filter(
            (LaborEntry.employee_id == current_user.id) &
            (LaborEntry.end_time.is_(None)) &
            (LaborEntry.is_completed == False)
        ).first()

        if active_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active labor entry. Please complete it first."
            )

    # Create labor entry
    db_labor_entry = LaborEntry(
        traveler_id=labor_data.traveler_id,
        step_id=step_id,
        employee_id=current_user.id,
        start_time=labor_data.start_time,
        end_time=labor_data.end_time,  # Support manual entries with end_time
        description=labor_data.description,
        is_completed=labor_data.is_completed if labor_data.is_completed is not None else False,
        work_center=work_center_name,
        sequence_number=sequence_num
    )

    # If end_time is provided, calculate hours_worked automatically
    if labor_data.end_time:
        # Validate that end_time is after start_time (prevent negative hours)
        if labor_data.end_time <= labor_data.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time. Please check your times and try again."
            )

        duration = labor_data.end_time - labor_data.start_time
        total_seconds = duration.total_seconds()

        # Additional safety check for negative seconds
        if total_seconds < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated time is negative. End time must be after start time."
            )

        hours_worked = round(total_seconds / 3600, 2)

        # Final validation that hours are not negative
        if hours_worked < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated hours ({hours_worked}) is negative. Please verify your times."
            )

        db_labor_entry.hours_worked = hours_worked

    db.add(db_labor_entry)
    db.commit()
    db.refresh(db_labor_entry)

    # Add employee name and job number for response
    db_labor_entry.employee_name = f"{current_user.first_name} {current_user.last_name}"
    traveler = db.query(Traveler).filter(Traveler.id == db_labor_entry.traveler_id).first()
    db_labor_entry.job_number = traveler.job_number if traveler else None

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.LABOR_ENTRY_CREATED,
        title="New Labor Entry Started",
        message=f"{current_user.username} started labor entry for {traveler.job_number if traveler else 'Unknown Job'} - {work_center_name or 'Unknown Work Center'}",
        reference_id=db_labor_entry.id,
        reference_type="labor_entry",
        created_by_username=current_user.username
    )

    return db_labor_entry

@router.put("/{labor_id}", response_model=LaborEntryResponse)
async def update_labor_entry(
    labor_id: int,
    labor_data: LaborEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update/complete a labor entry"""

    labor_entry = db.query(LaborEntry).filter(LaborEntry.id == labor_id).first()
    if not labor_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Labor entry not found"
        )

    # Check if user owns this labor entry or is admin
    if (labor_entry.employee_id != current_user.id and
        current_user.role.value != "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this labor entry"
        )

    # Update fields
    update_data = labor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(labor_entry, field, value)

    # Calculate hours worked if end_time is provided
    if labor_data.end_time and labor_entry.start_time:
        # Validate that end_time is after start_time (prevent negative hours)
        if labor_data.end_time <= labor_entry.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time. Please check your times and try again."
            )

        time_diff = labor_data.end_time - labor_entry.start_time
        total_seconds = time_diff.total_seconds()

        # Additional safety check for negative seconds
        if total_seconds < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated time is negative. End time must be after start time."
            )

        hours_worked = round(total_seconds / 3600, 2)

        # Final validation that hours are not negative
        if hours_worked < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated hours ({hours_worked}) is negative. Please verify your times."
            )

        labor_entry.hours_worked = hours_worked

    db.commit()
    db.refresh(labor_entry)

    # Add employee name and job number for response
    employee = db.query(User).filter(User.id == labor_entry.employee_id).first()
    labor_entry.employee_name = f"{employee.first_name} {employee.last_name}"
    traveler = db.query(Traveler).filter(Traveler.id == labor_entry.traveler_id).first()
    labor_entry.job_number = traveler.job_number if traveler else None

    # Create notification for all admins
    action = "completed" if labor_data.end_time else "updated"
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.LABOR_ENTRY_UPDATED,
        title=f"Labor Entry {action.capitalize()}",
        message=f"{current_user.username} {action} labor entry for {traveler.job_number if traveler else 'Unknown Job'} - {labor_entry.work_center or 'Unknown Work Center'}",
        reference_id=labor_entry.id,
        reference_type="labor_entry",
        created_by_username=current_user.username
    )

    return labor_entry

@router.delete("/{labor_id}")
async def delete_labor_entry(
    labor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a labor entry (Admin only)"""

    # Check if user is admin
    from models import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only administrators can delete labor entries. Your role: {current_user.role.value if hasattr(current_user.role, 'value') else current_user.role}"
        )

    labor_entry = db.query(LaborEntry).filter(LaborEntry.id == labor_id).first()
    if not labor_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Labor entry not found"
        )

    # Get info for notification before deletion
    traveler = db.query(Traveler).filter(Traveler.id == labor_entry.traveler_id).first()
    job_number = traveler.job_number if traveler else 'Unknown Job'
    work_center = labor_entry.work_center or 'Unknown Work Center'

    db.delete(labor_entry)
    db.commit()

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.LABOR_ENTRY_DELETED,
        title="Labor Entry Deleted",
        message=f"{current_user.username} deleted labor entry for {job_number} - {work_center}",
        reference_id=labor_id,
        reference_type="labor_entry",
        created_by_username=current_user.username
    )

    return {"message": "Labor entry deleted successfully", "id": labor_id}

@router.get("/", response_model=List[LaborEntryResponse])
@router.get("", response_model=List[LaborEntryResponse], include_in_schema=False)
async def get_all_labor_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all labor entries"""

    labor_entries = db.query(LaborEntry).order_by(LaborEntry.created_at.desc()).all()

    # Batch-fetch all related users and travelers to avoid N+1 queries
    employee_ids = list(set(e.employee_id for e in labor_entries if e.employee_id))
    traveler_ids = list(set(e.traveler_id for e in labor_entries if e.traveler_id))

    employees = {u.id: u for u in db.query(User).filter(User.id.in_(employee_ids)).all()} if employee_ids else {}
    travelers = {t.id: t for t in db.query(Traveler).filter(Traveler.id.in_(traveler_ids)).all()} if traveler_ids else {}

    result = []
    for entry in labor_entries:
        employee = employees.get(entry.employee_id)
        traveler = travelers.get(entry.traveler_id)

        entry_dict = {
            "id": entry.id,
            "traveler_id": entry.traveler_id,
            "step_id": entry.step_id,
            "employee_id": entry.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "job_number": traveler.job_number if traveler else None,
            "start_time": entry.start_time,
            "pause_time": entry.pause_time,
            "end_time": entry.end_time,
            "hours_worked": entry.hours_worked,
            "description": entry.description,
            "is_completed": entry.is_completed,
            "work_center": entry.work_center,
            "sequence_number": entry.sequence_number,
            "created_at": entry.created_at,
            "work_order": traveler.work_order_number if traveler else None,
            "po_number": traveler.po_number if traveler else None,
            "part_number": traveler.part_number if traveler else None,
            "quantity": traveler.quantity if traveler else None
        }
        result.append(LaborEntryResponse(**entry_dict))

    return result

@router.get("/traveler/{traveler_id}", response_model=List[LaborEntryResponse])
async def get_traveler_labor_entries(
    traveler_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all labor entries for a traveler"""

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    labor_entries = db.query(LaborEntry).filter(LaborEntry.traveler_id == traveler_id).all()

    # Add employee names and job numbers
    result = []
    for entry in labor_entries:
        employee = db.query(User).filter(User.id == entry.employee_id).first()
        entry_dict = {
            "id": entry.id,
            "traveler_id": entry.traveler_id,
            "step_id": entry.step_id,
            "employee_id": entry.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "job_number": traveler.job_number,
            "start_time": entry.start_time,
            "pause_time": entry.pause_time,
            "end_time": entry.end_time,
            "hours_worked": entry.hours_worked,
            "description": entry.description,
            "is_completed": entry.is_completed,
            "work_center": entry.work_center,
            "sequence_number": entry.sequence_number,
            "created_at": entry.created_at
        }
        result.append(LaborEntryResponse(**entry_dict))

    return result

@router.get("/my-entries", response_model=List[LaborEntryResponse])
async def get_my_labor_entries(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get labor entries - for ADMIN shows all entries, for others shows only their entries"""

    start_date = datetime.now() - timedelta(days=days)

    # Admin can see all entries, others see only their own
    if current_user.role.value == "ADMIN":
        labor_entries = db.query(LaborEntry).filter(
            LaborEntry.created_at >= start_date
        ).order_by(LaborEntry.created_at.desc()).all()
    else:
        labor_entries = db.query(LaborEntry).filter(
            (LaborEntry.employee_id == current_user.id) &
            (LaborEntry.created_at >= start_date)
        ).order_by(LaborEntry.created_at.desc()).all()

    # Batch-fetch all related users and travelers to avoid N+1 queries
    employee_ids = list(set(e.employee_id for e in labor_entries if e.employee_id))
    traveler_ids = list(set(e.traveler_id for e in labor_entries if e.traveler_id))

    employees = {u.id: u for u in db.query(User).filter(User.id.in_(employee_ids)).all()} if employee_ids else {}
    travelers = {t.id: t for t in db.query(Traveler).filter(Traveler.id.in_(traveler_ids)).all()} if traveler_ids else {}

    result = []
    for entry in labor_entries:
        employee = employees.get(entry.employee_id)
        traveler = travelers.get(entry.traveler_id)

        entry_dict = {
            "id": entry.id,
            "traveler_id": entry.traveler_id,
            "step_id": entry.step_id,
            "employee_id": entry.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "job_number": traveler.job_number if traveler else None,
            "start_time": entry.start_time,
            "pause_time": entry.pause_time,
            "end_time": entry.end_time,
            "hours_worked": entry.hours_worked,
            "description": entry.description,
            "is_completed": entry.is_completed,
            "work_center": entry.work_center,
            "sequence_number": entry.sequence_number,
            "created_at": entry.created_at,
            "work_order": traveler.work_order_number if traveler else None,
            "po_number": traveler.po_number if traveler else None,
            "part_number": traveler.part_number if traveler else None,
            "quantity": traveler.quantity if traveler else None
        }
        result.append(LaborEntryResponse(**entry_dict))

    return result

@router.get("/active", response_model=Optional[LaborEntryResponse])
async def get_active_labor_entry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's active labor entry"""

    active_entry = db.query(LaborEntry).filter(
        (LaborEntry.employee_id == current_user.id) &
        (LaborEntry.end_time.is_(None)) &
        (LaborEntry.is_completed == False)
    ).first()

    if not active_entry:
        return None

    entry_dict = {
        "id": active_entry.id,
        "traveler_id": active_entry.traveler_id,
        "step_id": active_entry.step_id,
        "employee_id": active_entry.employee_id,
        "employee_name": f"{current_user.first_name} {current_user.last_name}",
        "start_time": active_entry.start_time,
        "pause_time": active_entry.pause_time,
        "end_time": active_entry.end_time,
        "hours_worked": active_entry.hours_worked,
        "description": active_entry.description,
        "is_completed": active_entry.is_completed,
        "work_center": active_entry.work_center,
        "sequence_number": active_entry.sequence_number,
        "created_at": active_entry.created_at
    }

    return LaborEntryResponse(**entry_dict)

@router.post("/auto-stop-5pm")
async def auto_stop_entries_at_5pm(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-stop all active labor entries at 5pm (17:00)
    This can be called by a scheduled task or manually by admin"""

    # Only admin can trigger this
    if current_user.role.value != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can trigger auto-stop"
        )

    # Get all active (uncompleted) entries
    active_entries = db.query(LaborEntry).filter(
        (LaborEntry.end_time.is_(None)) &
        (LaborEntry.is_completed == False)
    ).all()

    # Set end time to 5pm (17:00) of today
    today = datetime.now().date()
    end_time_5pm = datetime.combine(today, datetime.strptime("17:00:00", "%H:%M:%S").time())

    completed_count = 0
    for entry in active_entries:
        # Only auto-stop if entry started before 5pm
        if entry.start_time < end_time_5pm:
            entry.end_time = end_time_5pm
            entry.is_completed = True
            # Calculate hours worked
            time_diff = end_time_5pm - entry.start_time
            entry.hours_worked = round(time_diff.total_seconds() / 3600, 2)
            completed_count += 1

    db.commit()

    return {
        "message": f"Auto-stopped {completed_count} active entries at 5pm",
        "completed_count": completed_count,
        "end_time": end_time_5pm.isoformat()
    }

@router.get("/check-auto-stop")
async def check_and_auto_stop(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if it's past 5pm and auto-stop any active entries from today
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

    # Get all active entries that started today (or earlier) and before 5pm
    active_entries = db.query(LaborEntry).filter(
        (LaborEntry.end_time.is_(None)) &
        (LaborEntry.is_completed == False) &
        (LaborEntry.start_time < five_pm)
    ).all()

    completed_count = 0
    for entry in active_entries:
        entry.end_time = five_pm
        entry.is_completed = True
        # Calculate hours worked
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

@router.get("/summary")
async def get_labor_summary(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get labor summary statistics"""

    start_date = datetime.now() - timedelta(days=days)

    # Get labor entries for the period
    labor_entries = db.query(LaborEntry).filter(
        LaborEntry.created_at >= start_date
    )

    # For non-admin users, filter to their own entries
    if current_user.role.value != "ADMIN":
        labor_entries = labor_entries.filter(LaborEntry.employee_id == current_user.id)

    labor_entries = labor_entries.all()

    # Calculate statistics
    total_hours = sum(entry.hours_worked for entry in labor_entries)
    total_entries = len(labor_entries)
    completed_entries = len([entry for entry in labor_entries if entry.is_completed])
    active_entries = len([entry for entry in labor_entries if not entry.is_completed and entry.end_time is None])

    return {
        "period_days": days,
        "total_hours": round(total_hours, 2),
        "total_entries": total_entries,
        "completed_entries": completed_entries,
        "active_entries": active_entries,
        "completion_rate": round((completed_entries / total_entries * 100) if total_entries > 0 else 0, 1)
    }

@router.get("/hours-summary")
async def get_labor_hours_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get labor hours summary report with weekly and monthly breakdowns per employee"""

    from collections import defaultdict
    from datetime import date

    start_date = datetime.now() - timedelta(days=days)

    # Get labor entries for the period (completed only)
    labor_entries = db.query(LaborEntry).filter(
        (LaborEntry.created_at >= start_date) &
        (LaborEntry.is_completed == True) &
        (LaborEntry.end_time.isnot(None))
    ).all()

    # Group entries by employee
    employee_data = defaultdict(lambda: {
        "employee_id": None,
        "employee_name": "",
        "weekly_hours": defaultdict(float),
        "monthly_hours": defaultdict(float),
        "daily_hours": defaultdict(float),
        "total_hours": 0
    })

    for entry in labor_entries:
        # Get employee info
        employee = db.query(User).filter(User.id == entry.employee_id).first()
        if not employee:
            continue

        employee_key = entry.employee_id
        employee_name = f"{employee.first_name} {employee.last_name}"

        if employee_data[employee_key]["employee_id"] is None:
            employee_data[employee_key]["employee_id"] = entry.employee_id
            employee_data[employee_key]["employee_name"] = employee_name

        # Parse start time to get week and month
        entry_date = entry.start_time.date() if isinstance(entry.start_time, datetime) else entry.start_time

        # Calculate week start (Monday)
        week_start = entry_date - timedelta(days=entry_date.weekday())
        week_key = week_start.strftime("%Y-%m-%d")  # Week starting Monday

        # Calculate month
        month_key = entry_date.strftime("%Y-%m")  # YYYY-MM format

        # Calculate day
        day_key = entry_date.strftime("%Y-%m-%d")

        # Add hours to respective buckets
        hours = entry.hours_worked or 0
        employee_data[employee_key]["weekly_hours"][week_key] += hours
        employee_data[employee_key]["monthly_hours"][month_key] += hours
        employee_data[employee_key]["daily_hours"][day_key] += hours
        employee_data[employee_key]["total_hours"] += hours

    # Format response
    summary = []
    for emp_id, data in employee_data.items():
        # Convert weekly hours to list format
        weekly_breakdown = [
            {
                "week_start": week,
                "week_end": (datetime.strptime(week, "%Y-%m-%d") + timedelta(days=6)).strftime("%Y-%m-%d"),
                "hours": round(hours, 2)
            }
            for week, hours in sorted(data["weekly_hours"].items())
        ]

        # Convert monthly hours to list format
        monthly_breakdown = [
            {
                "month": month,
                "month_name": datetime.strptime(month + "-01", "%Y-%m-%d").strftime("%B %Y"),
                "hours": round(hours, 2)
            }
            for month, hours in sorted(data["monthly_hours"].items())
        ]

        # Convert daily hours to list format
        daily_breakdown = [
            {
                "date": day,
                "hours": round(hours, 2)
            }
            for day, hours in sorted(data["daily_hours"].items())
        ]

        summary.append({
            "employee_id": data["employee_id"],
            "employee_name": data["employee_name"],
            "total_hours": round(data["total_hours"], 2),
            "weekly_breakdown": weekly_breakdown,
            "monthly_breakdown": monthly_breakdown,
            "daily_breakdown": daily_breakdown
        })

    # Sort by employee name
    summary.sort(key=lambda x: x["employee_name"])

    return {
        "period_days": days,
        "employees": summary,
        "total_employees": len(summary)
    }