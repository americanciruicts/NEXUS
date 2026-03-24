from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import User, LaborEntry, Traveler, ProcessStep, NotificationType, WorkCenter, TravelerStatus, UserRole, PauseLog
from routers.auth import get_current_user
from services.notification_service import create_notification_for_admins

router = APIRouter()


def get_pause_data(db: Session, entry_id: int):
    """Get pause logs, total pause seconds, and count for a labor entry."""
    logs = db.query(PauseLog).filter(PauseLog.labor_entry_id == entry_id).order_by(PauseLog.paused_at).all()
    total_seconds = sum(l.duration_seconds or 0 for l in logs)
    return {
        "pause_logs": [PauseLogResponse.model_validate(l) for l in logs],
        "total_pause_seconds": round(total_seconds, 1) if logs else None,
        "pause_count": len(logs) if logs else None,
    }

def update_step_and_traveler_progress(db: Session, labor_entry: LaborEntry):
    """When a labor entry is completed, mark its linked process step as completed
    and update the traveler's status accordingly."""
    if not labor_entry.step_id:
        return

    step = db.query(ProcessStep).filter(ProcessStep.id == labor_entry.step_id).first()
    if not step or step.is_completed:
        return

    # Mark the step as completed
    step.is_completed = True
    step.completed_at = labor_entry.end_time or datetime.now()
    step.completed_by = labor_entry.employee_id

    # Update traveler status
    traveler = db.query(Traveler).filter(Traveler.id == labor_entry.traveler_id).first()
    if not traveler:
        return

    # Move to IN_PROGRESS if still in CREATED or DRAFT
    if traveler.status in (TravelerStatus.CREATED, TravelerStatus.DRAFT):
        traveler.status = TravelerStatus.IN_PROGRESS

    # Check if ALL steps are now complete → mark traveler COMPLETED
    all_steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == traveler.id).all()
    if all_steps and all(s.is_completed for s in all_steps):
        traveler.status = TravelerStatus.COMPLETED
        traveler.completed_at = datetime.now()

    db.flush()

class LaborEntryCreate(BaseModel):
    traveler_id: int
    step_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    description: str
    is_completed: Optional[bool] = None
    employee_id: Optional[int] = None  # Admin can specify a different employee
    comment: Optional[str] = None
    qty_completed: Optional[int] = None

class LaborEntryUpdate(BaseModel):
    pause_time: Optional[datetime] = None
    clear_pause: Optional[bool] = None  # Set to true to resume (clear pause_time)
    pause_comment: Optional[str] = None  # Comment for pause/resume
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    qty_completed: Optional[int] = None
    comment: Optional[str] = None
    start_time: Optional[datetime] = None

class PauseLogResponse(BaseModel):
    id: int
    paused_at: datetime
    resumed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    comment: Optional[str] = None

    class Config:
        from_attributes = True

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
    qty_completed: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    # Traveler information
    work_order: Optional[str] = None
    po_number: Optional[str] = None
    part_number: Optional[str] = None
    quantity: Optional[int] = None
    # Pause history
    pause_logs: Optional[List[PauseLogResponse]] = None
    total_pause_seconds: Optional[float] = None
    pause_count: Optional[int] = None

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
            import re
            def strip_numeric_prefix(s):
                """Strip leading numeric prefix like '18 WASH' → 'WASH', '5. SMT TOP' → 'SMT TOP'"""
                return re.sub(r'^\d+[\.\s]+', '', s).strip()

            for ps in process_steps:
                ps_operation_upper = ps.operation.upper() if ps.operation else ""
                wc_upper = work_center_from_desc.upper()

                # Also compare with numeric prefixes stripped
                ps_stripped = strip_numeric_prefix(ps_operation_upper)
                wc_stripped = strip_numeric_prefix(wc_upper)

                # Check various matching patterns
                if (
                    # Exact match (case-insensitive)
                    ps_operation_upper == wc_upper or
                    ps_operation_upper.replace('_', ' ') == wc_upper.replace('_', ' ') or
                    ps_operation_upper.replace(' ', '_') == wc_upper.replace(' ', '_') or
                    # Match with numeric prefix stripped (e.g., "18 WASH" matches "WASH")
                    ps_stripped == wc_stripped or
                    ps_operation_upper == wc_stripped or
                    ps_stripped == wc_upper or
                    ps_stripped.replace('_', ' ') == wc_stripped.replace('_', ' ') or
                    # One contains the other (e.g., "18 WASH" contains "WASH")
                    (len(ps_operation_upper) >= 3 and ps_operation_upper in wc_upper) or
                    (len(wc_upper) >= 3 and wc_upper in ps_operation_upper) or
                    # Handle common variations
                    (wc_stripped == 'AUTO_INSERTION' and ps_stripped == 'AUTO INSERT') or
                    (wc_stripped == 'AUTO INSERT' and ps_stripped == 'AUTO_INSERTION') or
                    (wc_stripped == 'E-TEST' and ps_stripped == 'ETEST') or
                    (wc_stripped == 'ETEST' and ps_stripped == 'E-TEST') or
                    (wc_stripped == 'MAKE_BOM' and ps_stripped == 'MAKE BOM') or
                    (wc_stripped == 'MAKE BOM' and ps_stripped == 'MAKE_BOM')
                ):
                    # Found matching step
                    step_id = ps.id
                    sequence_num = ps.step_number
                    work_center_name = ps.operation
                    break

            # If still no match found, use the work center from description as-is
            if not work_center_name:
                work_center_name = work_center_from_desc

    # Determine effective employee - admin can override
    effective_employee_id = current_user.id
    effective_employee = current_user
    if labor_data.employee_id and labor_data.employee_id != current_user.id:
        # Only admin can assign labor to another user
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create labor entries for other users"
            )
        target_employee = db.query(User).filter(User.id == labor_data.employee_id).first()
        if not target_employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified employee not found"
            )
        effective_employee_id = target_employee.id
        effective_employee = target_employee

    # Check if user has an active labor entry
    # BUT: Allow manual entries (which have end_time already set) even if user has active entry
    if not labor_data.end_time:  # Only check for active entry if this is NOT a manual entry
        active_entry = db.query(LaborEntry).filter(
            (LaborEntry.employee_id == effective_employee_id) &
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
        employee_id=effective_employee_id,
        start_time=labor_data.start_time,
        end_time=labor_data.end_time,  # Support manual entries with end_time
        description=labor_data.description,
        comment=labor_data.comment,
        is_completed=labor_data.is_completed if labor_data.is_completed is not None else False,
        qty_completed=labor_data.qty_completed,
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
    db.flush()

    # For manual entries (created with end_time), update step and traveler progress
    if labor_data.end_time and db_labor_entry.is_completed:
        update_step_and_traveler_progress(db, db_labor_entry)

    db.commit()
    db.refresh(db_labor_entry)

    # Add employee name and job number for response
    db_labor_entry.employee_name = f"{effective_employee.first_name} {effective_employee.last_name}"
    traveler = db.query(Traveler).filter(Traveler.id == db_labor_entry.traveler_id).first()
    db_labor_entry.job_number = traveler.job_number if traveler else None

    # Create notification for all admins
    created_by_label = current_user.username
    if effective_employee_id != current_user.id:
        created_by_label = f"{current_user.username} (for {effective_employee.first_name})"
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.LABOR_ENTRY_CREATED,
        title="New Labor Entry Started",
        message=f"{created_by_label} started labor entry for {traveler.job_number if traveler else 'Unknown Job'} - {work_center_name or 'Unknown Work Center'}",
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
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this labor entry"
        )

    # Capture original state before updates (for notification logic)
    had_end_time_before = labor_entry.end_time is not None

    # Log pause event
    if labor_data.pause_time:
        pause_log = PauseLog(
            labor_entry_id=labor_entry.id,
            paused_at=labor_data.pause_time,
            comment=labor_data.pause_comment
        )
        db.add(pause_log)

    # Handle resume (clear pause_time) and close the open pause log
    if labor_data.clear_pause:
        labor_entry.pause_time = None
        # Find the open pause log (no resumed_at) and close it
        open_pause = db.query(PauseLog).filter(
            PauseLog.labor_entry_id == labor_entry.id,
            PauseLog.resumed_at.is_(None)
        ).order_by(PauseLog.paused_at.desc()).first()
        if open_pause:
            now = datetime.now(open_pause.paused_at.tzinfo) if open_pause.paused_at.tzinfo else datetime.utcnow()
            open_pause.resumed_at = now
            open_pause.duration_seconds = (now - open_pause.paused_at).total_seconds()
            if labor_data.pause_comment:
                open_pause.comment = labor_data.pause_comment

    # Update fields
    update_data = labor_data.model_dump(exclude_unset=True, exclude={'clear_pause'})
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

        # Subtract total pause duration from worked time
        pause_logs = db.query(PauseLog).filter(PauseLog.labor_entry_id == labor_entry.id).all()
        total_pause_secs = sum(l.duration_seconds or 0 for l in pause_logs)
        effective_seconds = max(total_seconds - total_pause_secs, 0)

        hours_worked = round(effective_seconds / 3600, 2)

        # Final validation that hours are not negative
        if hours_worked < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Calculated hours ({hours_worked}) is negative. Please verify your times."
            )

        labor_entry.hours_worked = hours_worked

    # When labor entry is completed, update linked step and traveler progress
    if labor_data.end_time and labor_entry.is_completed:
        update_step_and_traveler_progress(db, labor_entry)

    db.commit()
    db.refresh(labor_entry)

    # Add employee name and job number for response
    employee = db.query(User).filter(User.id == labor_entry.employee_id).first()
    labor_entry.employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"
    traveler = db.query(Traveler).filter(Traveler.id == labor_entry.traveler_id).first()
    labor_entry.job_number = traveler.job_number if traveler else None

    # Create notification for all admins
    if labor_data.pause_time:
        action = "paused"
    elif labor_data.clear_pause:
        action = "resumed"
    elif labor_data.end_time and not had_end_time_before:
        action = "stopped"
    else:
        action = "updated"
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.LABOR_ENTRY_UPDATED,
        title=f"Labor Entry {action.capitalize()}",
        message=f"{current_user.username} {action} labor entry for {traveler.job_number if traveler else 'Unknown Job'} - {labor_entry.work_center or 'Unknown Work Center'}",
        reference_id=labor_entry.id,
        reference_type="labor_entry",
        created_by_username=current_user.username
    )

    # Build response with pause data
    response_dict = {
        "id": labor_entry.id,
        "traveler_id": labor_entry.traveler_id,
        "step_id": labor_entry.step_id,
        "employee_id": labor_entry.employee_id,
        "employee_name": labor_entry.employee_name,
        "job_number": labor_entry.job_number,
        "start_time": labor_entry.start_time,
        "pause_time": labor_entry.pause_time,
        "end_time": labor_entry.end_time,
        "hours_worked": labor_entry.hours_worked,
        "description": labor_entry.description,
        "is_completed": labor_entry.is_completed,
        "work_center": labor_entry.work_center,
        "sequence_number": labor_entry.sequence_number,
        "qty_completed": labor_entry.qty_completed,
        "comment": labor_entry.comment,
        "created_at": labor_entry.created_at,
        **get_pause_data(db, labor_entry.id)
    }
    return LaborEntryResponse(**response_dict)

@router.delete("/{labor_id}")
async def delete_labor_entry(
    labor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a labor entry (Admin only)"""

    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only administrators can delete labor entries. Your role: {current_user.role}"
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


class AdminPauseLogCreate(BaseModel):
    paused_at: datetime
    resumed_at: datetime
    comment: Optional[str] = None


@router.post("/{labor_id}/pauses")
async def add_pause_log(
    labor_id: int,
    pause_data: AdminPauseLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin: Add a pause log to a labor entry and recalculate hours"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    labor_entry = db.query(LaborEntry).filter(LaborEntry.id == labor_id).first()
    if not labor_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Labor entry not found")

    if pause_data.resumed_at <= pause_data.paused_at:
        raise HTTPException(status_code=400, detail="Resumed time must be after paused time")

    duration_seconds = (pause_data.resumed_at - pause_data.paused_at).total_seconds()

    pause_log = PauseLog(
        labor_entry_id=labor_id,
        paused_at=pause_data.paused_at,
        resumed_at=pause_data.resumed_at,
        duration_seconds=round(duration_seconds, 1),
        comment=pause_data.comment
    )
    db.add(pause_log)

    # Recalculate hours_worked subtracting all pauses
    if labor_entry.start_time and labor_entry.end_time:
        total_seconds = (labor_entry.end_time - labor_entry.start_time).total_seconds()
        all_pauses = db.query(PauseLog).filter(PauseLog.labor_entry_id == labor_id).all()
        total_pause_secs = sum(p.duration_seconds or 0 for p in all_pauses) + duration_seconds
        labor_entry.hours_worked = round(max(total_seconds - total_pause_secs, 0) / 3600, 2)

    db.commit()
    return {"message": "Pause added", "id": pause_log.id, "duration_seconds": pause_log.duration_seconds}


@router.delete("/{labor_id}/pauses/{pause_id}")
async def delete_pause_log(
    labor_id: int,
    pause_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin: Delete a pause log and recalculate hours"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    pause_log = db.query(PauseLog).filter(PauseLog.id == pause_id, PauseLog.labor_entry_id == labor_id).first()
    if not pause_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pause log not found")

    db.delete(pause_log)

    # Recalculate hours_worked
    labor_entry = db.query(LaborEntry).filter(LaborEntry.id == labor_id).first()
    if labor_entry and labor_entry.start_time and labor_entry.end_time:
        total_seconds = (labor_entry.end_time - labor_entry.start_time).total_seconds()
        remaining_pauses = db.query(PauseLog).filter(PauseLog.labor_entry_id == labor_id).all()
        total_pause_secs = sum(p.duration_seconds or 0 for p in remaining_pauses)
        labor_entry.hours_worked = round(max(total_seconds - total_pause_secs, 0) / 3600, 2)

    db.commit()
    return {"message": "Pause deleted", "id": pause_id}


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
            "quantity": traveler.quantity if traveler else None,
            "qty_completed": entry.qty_completed,
            "comment": entry.comment,
            **get_pause_data(db, entry.id)
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
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "job_number": traveler.job_number,
            "start_time": entry.start_time,
            "pause_time": entry.pause_time,
            "end_time": entry.end_time,
            "hours_worked": entry.hours_worked,
            "description": entry.description,
            "is_completed": entry.is_completed,
            "work_center": entry.work_center,
            "sequence_number": entry.sequence_number,
            "qty_completed": entry.qty_completed,
            "comment": entry.comment,
            "created_at": entry.created_at,
            **get_pause_data(db, entry.id)
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
    if current_user.role == UserRole.ADMIN:
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
            "qty_completed": entry.qty_completed,
            "comment": entry.comment,
            "created_at": entry.created_at,
            "work_order": traveler.work_order_number if traveler else None,
            "po_number": traveler.po_number if traveler else None,
            "part_number": traveler.part_number if traveler else None,
            "quantity": traveler.quantity if traveler else None,
            **get_pause_data(db, entry.id)
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
        "comment": active_entry.comment,
        "created_at": active_entry.created_at,
        **get_pause_data(db, active_entry.id)
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
    if current_user.role != UserRole.ADMIN:
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
            update_step_and_traveler_progress(db, entry)
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
        update_step_and_traveler_progress(db, entry)
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
    if current_user.role != UserRole.ADMIN:
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

@router.get("/category-report")
async def get_labor_by_category(
    category: Optional[str] = None,
    job_number: Optional[str] = None,
    work_order: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get labor entries grouped by work center category (e.g. SMT hrs. Actual, HAND hrs. Actual)"""
    from sqlalchemy import func as sql_func

    # Build a lookup of work center name -> category
    work_centers = db.query(WorkCenter).all()
    wc_category_map = {}
    for wc in work_centers:
        if wc.name and wc.category:
            wc_category_map[wc.name.upper().strip()] = wc.category

    # Get all labor entries
    query = db.query(LaborEntry)
    labor_entries = query.order_by(LaborEntry.created_at.desc()).all()

    # Batch-fetch related data
    employee_ids = list(set(e.employee_id for e in labor_entries if e.employee_id))
    traveler_ids = list(set(e.traveler_id for e in labor_entries if e.traveler_id))
    employees = {u.id: u for u in db.query(User).filter(User.id.in_(employee_ids)).all()} if employee_ids else {}
    travelers = {t.id: t for t in db.query(Traveler).filter(Traveler.id.in_(traveler_ids)).all()} if traveler_ids else {}

    results = []
    for entry in labor_entries:
        traveler = travelers.get(entry.traveler_id)
        employee = employees.get(entry.employee_id)

        # Determine category from work center name
        wc_name = (entry.work_center or '').upper().strip()
        entry_category = wc_category_map.get(wc_name, None)

        # Filter by category if specified
        if category and category.strip():
            if not entry_category or entry_category.lower() != category.lower():
                continue

        # Filter by job number
        if job_number and job_number.strip():
            job = traveler.job_number if traveler else ''
            if not job or job_number.lower() not in job.lower():
                continue

        # Filter by work order
        if work_order and work_order.strip():
            wo = traveler.work_order_number if traveler else ''
            if not wo or work_order.lower() not in wo.lower():
                continue

        # Filter by date range
        if start_date and entry.start_time:
            entry_date = entry.start_time.strftime('%Y-%m-%d')
            if entry_date < start_date:
                continue
        if end_date and entry.start_time:
            entry_date = entry.start_time.strftime('%Y-%m-%d')
            if entry_date > end_date:
                continue

        results.append({
            "id": entry.id,
            "traveler_id": entry.traveler_id,
            "employee_id": entry.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "job_number": traveler.job_number if traveler else None,
            "work_order": traveler.work_order_number if traveler else None,
            "po_number": traveler.po_number if traveler else None,
            "part_number": traveler.part_number if traveler else None,
            "quantity": traveler.quantity if traveler else None,
            "work_center": entry.work_center,
            "category": entry_category or "Uncategorized",
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "end_time": entry.end_time.isoformat() if entry.end_time else None,
            "hours_worked": entry.hours_worked or 0,
            "is_completed": entry.is_completed,
            "description": entry.description,
        })

    return results