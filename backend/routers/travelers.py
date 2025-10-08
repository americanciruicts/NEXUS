from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from models import User, Traveler, ProcessStep, SubStep, ManualStep, AuditLog, WorkOrder
from schemas.traveler_schemas import (
    TravelerCreate, Traveler as TravelerSchema, TravelerUpdate,
    TravelerList, ProcessStepCreate, ManualStepCreate
)
from routers.auth import get_current_user
from services.email_service import send_approval_notification

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
        from routers.auth import get_password_hash
        default_user = User(
            username="system",
            email="system@nexus.local",
            first_name="System",
            last_name="User",
            hashed_password=get_password_hash("system"),
            role="USER",
            is_approver=False
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Create traveler
    db_traveler = Traveler(
        job_number=traveler_data.job_number,
        work_order_number=traveler_data.work_order_number,
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
        created_by=default_user.id
    )

    db.add(db_traveler)
    db.commit()
    db.refresh(db_traveler)

    # Create process steps
    for step_data in traveler_data.process_steps:
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
        from routers.auth import get_password_hash
        default_user = User(
            username="system",
            email="system@nexus.local",
            first_name="System",
            last_name="User",
            hashed_password=get_password_hash("system"),
            role="USER",
            is_approver=False
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Update traveler fields
    traveler.job_number = traveler_data.job_number
    traveler.work_order_number = traveler_data.work_order_number
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

    # Delete existing process steps
    db.query(ProcessStep).filter(ProcessStep.traveler_id == traveler.id).delete()
    db.query(ManualStep).filter(ManualStep.traveler_id == traveler.id).delete()

    # Create new process steps
    for step_data in traveler_data.process_steps:
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

    return traveler

@router.delete("/{traveler_id}")
async def delete_traveler(
    traveler_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a traveler (admin only)"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete travelers"
        )

    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    db.delete(traveler)
    db.commit()
    return {"message": "Traveler deleted successfully"}