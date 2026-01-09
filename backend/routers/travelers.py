from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from database import get_db
from models import User, Traveler, ProcessStep, SubStep, ManualStep, AuditLog, WorkOrder, WorkCenter, TravelerTrackingLog, NotificationType
from schemas.traveler_schemas import (
    TravelerCreate, Traveler as TravelerSchema, TravelerUpdate,
    TravelerList, ProcessStepCreate, ManualStepCreate
)
from schemas.tracking_schemas import TrackingScanRequest, TrackingScanResponse, TrackingLogResponse
from routers.auth import get_current_user
from services.email_service import send_approval_notification
from services.notification_service import create_notification_for_admins

router = APIRouter()

# Memory store for manufacturing process steps
MANUFACTURING_STEPS = {
    "PCB": [
        {
            "step_number": 1,
            "operation": "INCOMING INSPECTION",
            "work_center_code": "INCOMING",
            "instructions": "Verify PCB against specifications",
            "sub_steps": [
                {"step_number": "1.1", "description": "Check part number and revision"},
                {"step_number": "1.2", "description": "Verify quantity received"},
                {"step_number": "1.3", "description": "Visual inspection for damage"},
                {"step_number": "1.4", "description": "Dimensional verification"},
                {"step_number": "1.5", "description": "Documentation review"}
            ],
            "estimated_time": 30,
            "is_required": True
        },
        {
            "step_number": 2,
            "operation": "PCB PREP",
            "work_center_code": "PCB_PREP",
            "instructions": "Prepare PCB for assembly process",
            "sub_steps": [
                {"step_number": "2.1", "description": "Clean PCB surface"},
                {"step_number": "2.2", "description": "Apply conformal coating if required"},
                {"step_number": "2.3", "description": "Mark identification numbers"},
                {"step_number": "2.4", "description": "Pre-heat if specified"}
            ],
            "estimated_time": 45,
            "is_required": True
        }
    ],
    "ASSY": [
        {
            "step_number": 1,
            "operation": "KIT PREPARATION",
            "work_center_code": "KITTING",
            "instructions": "Prepare all components for assembly",
            "sub_steps": [
                {"step_number": "1.1", "description": "Gather all required parts"},
                {"step_number": "1.2", "description": "Verify part numbers and quantities"},
                {"step_number": "1.3", "description": "Check for damaged components"}
            ],
            "estimated_time": 60,
            "is_required": True
        }
    ],
    "CABLE": [
        {
            "step_number": 1,
            "operation": "CABLE PREPARATION",
            "work_center_code": "CABLE_PREP",
            "instructions": "Prepare cable for assembly",
            "sub_steps": [
                {"step_number": "1.1", "description": "Cut cable to specified length"},
                {"step_number": "1.2", "description": "Strip wire ends"},
                {"step_number": "1.3", "description": "Identify conductor wires"}
            ],
            "estimated_time": 45,
            "is_required": True
        }
    ]
}

@router.get("/manufacturing-steps/{traveler_type}")
async def get_manufacturing_steps(traveler_type: str):
    """Get manufacturing process steps for a specific traveler type"""
    if traveler_type not in MANUFACTURING_STEPS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manufacturing steps not found for traveler type: {traveler_type}"
        )
    return MANUFACTURING_STEPS[traveler_type]

@router.get("/work-order/{identifier}")
async def get_work_order_data(identifier: str, db: Session = Depends(get_db)):
    """Auto-populate traveler data from job number or work order number"""
    work_order = db.query(WorkOrder).filter(
        (WorkOrder.job_number == identifier) |
        (WorkOrder.work_order_number == identifier)
    ).first()

    if not work_order:
        # Return mock data for demo purposes
        if identifier == "8414L":
            return {
                "job_number": "8414L",
                "work_order_number": "8414L",
                "traveler_type": "ASSY",
                "part_number": "METSHIFT",
                "part_description": "METSHIFT Assembly",
                "revision": "V0.2",
                "available_revisions": ["V0.1", "V0.2", "V1.0"],
                "quantity": 250,
                "customer_code": "750",
                "customer_name": "Customer Supply",
                "work_center": "ASSEMBLY",
                "priority": "NORMAL"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work order not found"
            )

    # Parse process template if available
    process_steps = []
    if work_order.process_template:
        try:
            process_steps = json.loads(work_order.process_template)
        except json.JSONDecodeError:
            pass

    return {
        "job_number": work_order.job_number,
        "work_order_number": work_order.work_order_number,
        "part_number": work_order.part_number,
        "part_description": work_order.part_description,
        "revision": work_order.revision,
        "quantity": work_order.quantity,
        "customer_code": work_order.customer_code,
        "customer_name": work_order.customer_name,
        "work_center": work_order.work_center,
        "priority": work_order.priority.value,
        "process_steps": process_steps
    }

@router.post("/", response_model=TravelerSchema)
async def create_traveler(
    traveler_data: TravelerCreate,
    db: Session = Depends(get_db)
):
    """Create a new traveler"""

    # For now, create travelers without authentication
    # TODO: Re-enable authentication when frontend auth is implemented

    # Get or create a default user for travelers created without auth
    default_user = db.query(User).filter(User.username == "system").first()
    if not default_user:
        # Create a default system user if it doesn't exist
        default_user = User(
            username="system",
            email="system@nexus.local",
            first_name="System",
            last_name="User",
            hashed_password="$2b$12$dummyhashforbackwardcompatibility",
            role="OPERATOR",
            is_approver=False
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Determine labor hours based on traveler type
    # PCB parts don't need labor hours, all others do by default
    include_labor_hours = traveler_data.include_labor_hours if traveler_data.traveler_type != "PCB" else False

    # Create traveler
    db_traveler = Traveler(
        job_number=traveler_data.job_number,
        work_order_number=traveler_data.work_order_number,
        po_number=traveler_data.po_number,
        traveler_type=traveler_data.traveler_type,
        part_number=traveler_data.part_number,
        part_description=traveler_data.part_description,
        revision=traveler_data.revision,
        quantity=traveler_data.quantity,
        customer_code=traveler_data.customer_code,
        customer_name=traveler_data.customer_name,
        priority=traveler_data.priority,
        work_center=traveler_data.work_center,
        notes=traveler_data.notes,
        specs=traveler_data.specs,
        specs_date=traveler_data.specs_date,
        from_stock=traveler_data.from_stock,
        to_stock=traveler_data.to_stock,
        ship_via=traveler_data.ship_via,
        comments=traveler_data.comments,
        due_date=traveler_data.due_date,
        ship_date=traveler_data.ship_date,
        include_labor_hours=include_labor_hours,
        created_by=default_user.id
    )

    db.add(db_traveler)
    db.commit()
    db.refresh(db_traveler)

    # Create process steps
    for step_data in traveler_data.process_steps:
        # Auto-create work center if it doesn't exist
        work_center = db.query(WorkCenter).filter(WorkCenter.code == step_data.work_center_code).first()
        if not work_center:
            work_center = WorkCenter(
                code=step_data.work_center_code,
                name=step_data.operation,
                description=f"Auto-created from traveler",
                is_active=True
            )
            db.add(work_center)
            db.commit()

        db_step = ProcessStep(
            traveler_id=db_traveler.id,
            step_number=step_data.step_number,
            operation=step_data.operation,
            work_center_code=step_data.work_center_code,
            instructions=step_data.instructions,
            estimated_time=step_data.estimated_time,
            is_required=step_data.is_required,
            quantity=step_data.quantity,
            accepted=step_data.accepted,
            rejected=step_data.rejected,
            sign=step_data.sign,
            completed_date=step_data.completed_date
        )
        db.add(db_step)
        db.commit()
        db.refresh(db_step)

        # Create sub-steps
        for sub_step_data in step_data.sub_steps:
            db_sub_step = SubStep(
                process_step_id=db_step.id,
                step_number=sub_step_data.step_number,
                description=sub_step_data.description
            )
            db.add(db_sub_step)

    # Create manual steps
    for manual_step_data in traveler_data.manual_steps:
        db_manual_step = ManualStep(
            traveler_id=db_traveler.id,
            description=manual_step_data.description,
            added_by=current_user.id
        )
        db.add(db_manual_step)

    db.commit()

    # Create audit log
    audit_log = AuditLog(
        traveler_id=db_traveler.id,
        user_id=default_user.id,
        action="CREATED",
        timestamp=db_traveler.created_at,
        ip_address="127.0.0.1",  # Get from request
        user_agent="NEXUS-Frontend"  # Get from request
    )
    db.add(audit_log)
    db.commit()

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRAVELER_CREATED,
        title="New Traveler Created",
        message=f"{default_user.username} created traveler {db_traveler.job_number} - {db_traveler.part_description}",
        reference_id=db_traveler.id,
        reference_type="traveler",
        created_by_username=default_user.username
    )

    return db_traveler

@router.get("/", response_model=List[TravelerList])
async def get_travelers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of travelers"""
    travelers = db.query(Traveler).offset(skip).limit(limit).all()
    return travelers

@router.get("/latest-revision")
async def get_latest_revision_traveler(
    job_number: str,
    work_order: str,
    db: Session = Depends(get_db)
):
    """Get the latest revision traveler for a given job number and work order"""
    from sqlalchemy.orm import joinedload

    travelers = db.query(Traveler).options(
        joinedload(Traveler.process_steps)
    ).filter(
        Traveler.job_number == job_number,
        Traveler.work_order_number == work_order
    ).order_by(Traveler.revision.desc()).all()

    if not travelers:
        return None

    # Return the traveler with the highest revision
    traveler = travelers[0]

    # Manually serialize to ensure process_steps are included
    result = {
        "id": traveler.id,
        "job_number": traveler.job_number,
        "work_order_number": traveler.work_order_number,
        "po_number": traveler.po_number,
        "traveler_type": traveler.traveler_type.value if hasattr(traveler.traveler_type, 'value') else str(traveler.traveler_type),
        "part_number": traveler.part_number,
        "part_description": traveler.part_description,
        "revision": traveler.revision,
        "quantity": traveler.quantity,
        "customer_code": traveler.customer_code,
        "customer_name": traveler.customer_name,
        "priority": traveler.priority.value if hasattr(traveler.priority, 'value') else str(traveler.priority),
        "work_center": traveler.work_center,
        "status": traveler.status.value if hasattr(traveler.status, 'value') else str(traveler.status),
        "is_active": traveler.is_active,
        "notes": traveler.notes,
        "specs": traveler.specs,
        "specs_date": traveler.specs_date,
        "from_stock": traveler.from_stock,
        "to_stock": traveler.to_stock,
        "ship_via": traveler.ship_via,
        "comments": traveler.comments,
        "due_date": traveler.due_date,
        "ship_date": traveler.ship_date,
        "include_labor_hours": traveler.include_labor_hours,
        "is_lead_free": getattr(traveler, 'is_lead_free', False),
        "is_itar": getattr(traveler, 'is_itar', False),
        "created_by": traveler.created_by,
        "created_at": traveler.created_at.isoformat() if traveler.created_at else None,
        "updated_at": traveler.updated_at.isoformat() if traveler.updated_at else None,
        "completed_at": traveler.completed_at.isoformat() if traveler.completed_at else None,
        "process_steps": [
            {
                "id": step.id,
                "step_number": step.step_number,
                "operation": step.operation,
                "work_center_code": step.work_center_code,
                "instructions": step.instructions,
                "quantity": step.quantity,
                "accepted": step.accepted,
                "rejected": step.rejected,
                "sign": step.sign,
                "completed_date": step.completed_date,
                "estimated_time": step.estimated_time,
                "is_required": step.is_required,
                "is_completed": step.is_completed,
            }
            for step in sorted(traveler.process_steps, key=lambda s: s.step_number)
        ]
    }

    print(f"Returning traveler with {len(result['process_steps'])} process steps")
    return result

@router.get("/by-job/{job_number}", response_model=TravelerSchema)
async def get_traveler_by_job(
    job_number: str,
    db: Session = Depends(get_db)
):
    """Get a specific traveler by job number"""
    traveler = db.query(Traveler).filter(Traveler.job_number == job_number).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )
    return traveler

@router.get("/{traveler_id}", response_model=TravelerSchema)
async def get_traveler(
    traveler_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific traveler by ID"""
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )
    return traveler

@router.put("/{traveler_id}", response_model=TravelerSchema)
async def update_traveler(
    traveler_id: int,
    traveler_data: TravelerCreate,
    db: Session = Depends(get_db)
):
    """Update a traveler"""
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Get or create a default user for travelers updated without auth
    default_user = db.query(User).filter(User.username == "system").first()
    if not default_user:
        default_user = User(
            username="system",
            email="system@nexus.local",
            first_name="System",
            last_name="User",
            hashed_password="$2b$12$dummyhashforbackwardcompatibility",
            role="OPERATOR",
            is_approver=False
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Determine labor hours based on traveler type
    # PCB parts don't need labor hours, all others do by default
    include_labor_hours = traveler_data.include_labor_hours if traveler_data.traveler_type != "PCB" else False

    # Update traveler fields
    traveler.job_number = traveler_data.job_number
    traveler.work_order_number = traveler_data.work_order_number
    traveler.po_number = traveler_data.po_number
    traveler.traveler_type = traveler_data.traveler_type
    traveler.part_number = traveler_data.part_number
    traveler.part_description = traveler_data.part_description
    traveler.revision = traveler_data.revision
    traveler.quantity = traveler_data.quantity
    traveler.customer_code = traveler_data.customer_code
    traveler.customer_name = traveler_data.customer_name
    traveler.priority = traveler_data.priority
    traveler.work_center = traveler_data.work_center
    traveler.notes = traveler_data.notes
    traveler.specs = traveler_data.specs
    traveler.specs_date = traveler_data.specs_date
    traveler.from_stock = traveler_data.from_stock
    traveler.to_stock = traveler_data.to_stock
    traveler.ship_via = traveler_data.ship_via
    traveler.comments = traveler_data.comments
    traveler.due_date = traveler_data.due_date
    traveler.ship_date = traveler_data.ship_date
    traveler.include_labor_hours = include_labor_hours

    # Delete existing process steps
    db.query(ProcessStep).filter(ProcessStep.traveler_id == traveler.id).delete()
    db.query(ManualStep).filter(ManualStep.traveler_id == traveler.id).delete()

    # Create new process steps
    for step_data in traveler_data.process_steps:
        # Auto-create work center if it doesn't exist
        work_center = db.query(WorkCenter).filter(WorkCenter.code == step_data.work_center_code).first()
        if not work_center:
            work_center = WorkCenter(
                code=step_data.work_center_code,
                name=step_data.operation,
                description=f"Auto-created from traveler",
                is_active=True
            )
            db.add(work_center)
            db.commit()

        db_step = ProcessStep(
            traveler_id=traveler.id,
            step_number=step_data.step_number,
            operation=step_data.operation,
            work_center_code=step_data.work_center_code,
            instructions=step_data.instructions,
            estimated_time=step_data.estimated_time,
            is_required=step_data.is_required,
            quantity=step_data.quantity,
            accepted=step_data.accepted,
            rejected=step_data.rejected,
            sign=step_data.sign,
            completed_date=step_data.completed_date
        )
        db.add(db_step)
        db.commit()
        db.refresh(db_step)

        # Create sub-steps
        for sub_step_data in step_data.sub_steps:
            db_sub_step = SubStep(
                process_step_id=db_step.id,
                step_number=sub_step_data.step_number,
                description=sub_step_data.description
            )
            db.add(db_sub_step)

    # Create manual steps
    for manual_step_data in traveler_data.manual_steps:
        db_manual_step = ManualStep(
            traveler_id=traveler.id,
            description=manual_step_data.description,
            added_by=default_user.id
        )
        db.add(db_manual_step)

    db.commit()
    db.refresh(traveler)

    # Create audit log
    audit_log = AuditLog(
        traveler_id=traveler.id,
        user_id=default_user.id,
        action="UPDATED",
        ip_address="127.0.0.1",
        user_agent="NEXUS-Frontend"
    )
    db.add(audit_log)
    db.commit()

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRAVELER_UPDATED,
        title="Traveler Updated",
        message=f"{default_user.username} updated traveler {traveler.job_number} - {traveler.part_description}",
        reference_id=traveler.id,
        reference_type="traveler",
        created_by_username=default_user.username
    )

    return traveler

@router.patch("/{traveler_id}")
async def patch_traveler(
    traveler_id: int,
    updates: dict,
    db: Session = Depends(get_db)
):
    """Partially update a traveler (e.g., toggle active status)"""
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Log the update for debugging
    print(f"PATCH traveler {traveler_id}: {updates}")

    # Update only the provided fields
    for key, value in updates.items():
        if hasattr(traveler, key):
            print(f"Setting {key} = {value} (was {getattr(traveler, key)})")
            setattr(traveler, key, value)

    db.commit()
    db.refresh(traveler)

    # Verify the update persisted
    print(f"After commit - is_active: {traveler.is_active}")

    return {
        "message": "Traveler updated successfully",
        "traveler": {
            "id": traveler.id,
            "job_number": traveler.job_number,
            "is_active": traveler.is_active
        }
    }

@router.delete("/{traveler_id}")
async def delete_traveler(
    traveler_id: int,
    db: Session = Depends(get_db)
):
    """Delete a traveler"""
    # For now, allow deletion without authentication
    # TODO: Re-enable admin-only restriction when frontend auth is fully implemented

    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Store traveler info for notification before deletion
    job_number = traveler.job_number
    part_description = traveler.part_description

    # Get user for notification
    default_user = db.query(User).filter(User.username == "system").first()
    if not default_user:
        default_user = User(
            username="system",
            email="system@nexus.local",
            first_name="System",
            last_name="User",
            hashed_password="$2b$12$dummyhashforbackwardcompatibility",
            role="OPERATOR",
            is_approver=False
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Delete related records first (cascade delete)
    # Import additional models for deletion
    from models import LaborEntry, TravelerTimeEntry, Approval, StepScanEvent

    db.query(ProcessStep).filter(ProcessStep.traveler_id == traveler.id).delete()
    db.query(ManualStep).filter(ManualStep.traveler_id == traveler.id).delete()
    db.query(AuditLog).filter(AuditLog.traveler_id == traveler.id).delete()
    db.query(TravelerTrackingLog).filter(TravelerTrackingLog.traveler_id == traveler.id).delete()
    db.query(LaborEntry).filter(LaborEntry.traveler_id == traveler.id).delete()
    db.query(TravelerTimeEntry).filter(TravelerTimeEntry.traveler_id == traveler.id).delete()
    db.query(Approval).filter(Approval.traveler_id == traveler.id).delete()
    db.query(StepScanEvent).filter(StepScanEvent.traveler_id == traveler.id).delete()

    db.delete(traveler)
    db.commit()

    # Create notification for all admins
    create_notification_for_admins(
        db=db,
        notification_type=NotificationType.TRAVELER_DELETED,
        title="Traveler Deleted",
        message=f"{default_user.username} deleted traveler {job_number} - {part_description}",
        reference_id=traveler_id,
        reference_type="traveler",
        created_by_username=default_user.username
    )

    return {"message": "Traveler deleted successfully"}

@router.post("/scan", response_model=TrackingScanResponse)
async def scan_tracking_code(
    scan_data: TrackingScanRequest,
    db: Session = Depends(get_db)
):
    """Record a barcode/QR code scan for traveler tracking"""

    # Validate scan type
    if scan_data.scan_type not in ["HEADER", "WORK_CENTER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_type must be 'HEADER' or 'WORK_CENTER'"
        )

    # For WORK_CENTER scans, work_center is required
    if scan_data.scan_type == "WORK_CENTER" and not scan_data.work_center:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="work_center is required for WORK_CENTER scan type"
        )

    # Find the traveler by job number
    traveler = db.query(Traveler).filter(Traveler.job_number == scan_data.job_number).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traveler with job number {scan_data.job_number} not found"
        )

    # Create tracking log entry
    tracking_log = TravelerTrackingLog(
        traveler_id=traveler.id,
        job_number=scan_data.job_number,
        work_center=scan_data.work_center,
        step_sequence=scan_data.step_sequence,
        scan_type=scan_data.scan_type,
        scanned_by=scan_data.scanned_by,
        notes=scan_data.notes
    )

    db.add(tracking_log)
    db.commit()
    db.refresh(tracking_log)

    return TrackingScanResponse(
        success=True,
        message=f"Scan recorded successfully for {scan_data.scan_type}",
        log_id=tracking_log.id,
        traveler_id=traveler.id
    )

@router.get("/tracking/logs", response_model=List[TrackingLogResponse])
async def get_tracking_logs(
    job_number: str = None,
    traveler_id: int = None,
    work_center: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get tracking logs with optional filters"""
    query = db.query(TravelerTrackingLog)

    if job_number:
        query = query.filter(TravelerTrackingLog.job_number == job_number)
    if traveler_id:
        query = query.filter(TravelerTrackingLog.traveler_id == traveler_id)
    if work_center:
        query = query.filter(TravelerTrackingLog.work_center == work_center)

    logs = query.order_by(TravelerTrackingLog.scanned_at.desc()).offset(skip).limit(limit).all()
    return logs

@router.get("/tracking/current-location/{job_number}")
async def get_current_location(
    job_number: str,
    db: Session = Depends(get_db)
):
    """Get the current location (last scanned work center) of a traveler"""

    # Find the traveler
    traveler = db.query(Traveler).filter(Traveler.job_number == job_number).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traveler with job number {job_number} not found"
        )

    # Get the most recent WORK_CENTER scan
    last_scan = db.query(TravelerTrackingLog).filter(
        TravelerTrackingLog.traveler_id == traveler.id,
        TravelerTrackingLog.scan_type == "WORK_CENTER"
    ).order_by(TravelerTrackingLog.scanned_at.desc()).first()

    if not last_scan:
        return {
            "job_number": job_number,
            "traveler_id": traveler.id,
            "current_location": None,
            "last_scan_time": None,
            "message": "No work center scans recorded yet"
        }

    return {
        "job_number": job_number,
        "traveler_id": traveler.id,
        "current_location": last_scan.work_center,
        "step_sequence": last_scan.step_sequence,
        "last_scan_time": last_scan.scanned_at,
        "scanned_by": last_scan.scanned_by
    }