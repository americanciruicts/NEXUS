import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
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
    category: Optional[str] = None
    department: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: bool = True


class WorkCenterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    traveler_type: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class WorkCenterResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    traveler_type: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    sort_order: int = 0
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReorderRequest(BaseModel):
    items: List[ReorderItem]


@router.get("/", response_model=List[WorkCenterResponse])
@router.get("", response_model=List[WorkCenterResponse], include_in_schema=False)
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

    return query.order_by(WorkCenter.sort_order, WorkCenter.id).all()


@router.post("/", response_model=WorkCenterResponse)
@router.post("", response_model=WorkCenterResponse, include_in_schema=False)
async def create_work_center(
    wc_data: WorkCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new work center (Admin only) - added at the bottom"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create work centers")

    # Check if code already exists
    existing = db.query(WorkCenter).filter(WorkCenter.code == wc_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Work center with code '{wc_data.code}' already exists")

    # Determine sort_order: use provided value or append to bottom
    if wc_data.sort_order is not None and wc_data.sort_order > 0:
        target_order = wc_data.sort_order
        # Shift existing items at or after this position down by 1
        existing = db.query(WorkCenter).filter(
            WorkCenter.traveler_type == wc_data.traveler_type,
            WorkCenter.sort_order >= target_order
        ).all()
        for wc in existing:
            wc.sort_order += 1
    else:
        max_order = db.query(sql_func.max(WorkCenter.sort_order)).filter(
            WorkCenter.traveler_type == wc_data.traveler_type
        ).scalar() or 0
        target_order = max_order + 1

    db_wc = WorkCenter(
        name=wc_data.name,
        code=wc_data.code,
        description=wc_data.description,
        traveler_type=wc_data.traveler_type,
        category=wc_data.category,
        department=wc_data.department,
        sort_order=target_order,
        is_active=wc_data.is_active
    )
    db.add(db_wc)
    db.commit()
    db.refresh(db_wc)
    return db_wc


@router.put("/reorder", response_model=dict)
async def reorder_work_centers(
    reorder_data: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reorder work centers (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can reorder work centers")

    for item in reorder_data.items:
        wc = db.query(WorkCenter).filter(WorkCenter.id == item.id).first()
        if wc:
            wc.sort_order = item.sort_order

    db.commit()
    return {"message": f"Reordered {len(reorder_data.items)} work centers"}


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


@router.post("/reset-pcb-assembly")
async def reset_pcb_assembly(
    secret: str = "",
    db: Session = Depends(get_db),
):
    """Wipe all PCB_ASSEMBLY work centers and reinsert the correct 46 in order"""
    expected_secret = os.getenv("RESET_SECRET", "")
    if not expected_secret or secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")

    try:
        from sqlalchemy import text
        # Clear FK references in process_steps first, then delete work centers
        pcb_codes = [wc.code for wc in db.query(WorkCenter).filter(WorkCenter.traveler_type == 'PCB_ASSEMBLY').all()]
        if pcb_codes:
            db.execute(text("DELETE FROM process_steps WHERE work_center_code = ANY(:codes)"), {"codes": pcb_codes})
        deleted = db.query(WorkCenter).filter(WorkCenter.traveler_type == 'PCB_ASSEMBLY').delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

    PCB_ASSY = [
        ('ENGINEERING', 'Reverse engineering and design', 'Engineering/Prep', None),
        ('GENERATE CAD', 'Generate CAD design files', 'Engineering/Prep', None),
        ('VERIFY BOM', 'Verify no BOM or rev changes', 'Engineering/Prep', None),
        ('GENERATE GERBER', 'Generate Gerber files for PCB fabrication', 'Engineering/Prep', None),
        ('VERIFY GERBER', 'Verify Gerber files for accuracy', 'Engineering/Prep', None),
        ('MAKE SILKSCREEN', 'Create silkscreen layer for component identification', 'Engineering/Prep', None),
        ('CREATE BOM', 'Create Bill of Materials for the assembly', 'Engineering/Prep', None),
        ('KITTING', 'Pull parts from inventory to place in a kit for manufacturing', 'Receiving', None),
        ('COMPONENT PREP', 'Pre-bending of parts or any necessary alteration of a part prior to production', 'TH', None),
        ('PROGRAM PART', 'Parts that need to be programmed prior to SMT', 'Test/Soldering', 'SMT hrs. Actual'),
        ('HAND SOLDER', 'Anything that must be soldered by hand, no wave, no SMT', 'Soldering', 'HAND hrs. Actual'),
        ('SMT PROGRAMING', 'Programming the SMT placement machine', 'SMT', 'SMT hrs. Actual'),
        ('FEEDER LOAD', 'The time it takes to load all needed parts onto feeders/Matrix trays', 'SMT', 'SMT hrs. Actual'),
        ('SMT SET UP', 'The time it takes to align parts/make needed changes to programs', 'SMT', 'SMT hrs. Actual'),
        ('GLUE', 'Gluing done at SMT after paste to make sure parts stay on', 'SMT', 'SMT hrs. Actual'),
        ('SMT TOP', 'SMT top placed', 'SMT', 'SMT hrs. Actual'),
        ('SMT BOTTOM', 'SMT bottom placed', 'SMT', 'SMT hrs. Actual'),
        ('WASH', 'Process of cleaning a dirty PCB', 'ALL', 'HAND hrs. Actual'),
        ('X-RAY', 'Visual continuity check of components as requested by customer', 'SMT/Soldering/Test', None),
        ('MANUAL INSERTION', 'Install prepared parts before wave', 'TH', 'TH hrs. Actual'),
        ('WAVE', 'Wave soldering process', 'TH', 'TH hrs. Actual'),
        ('WASH', 'Post-wave cleaning process', 'ALL', 'HAND hrs. Actual'),
        ('CLEAN TEST', 'Use the ion tester to check cleanliness', 'ALL', None),
        ('TRIM', 'Cut excess leads on backside', 'TH/Soldering', 'HAND hrs. Actual'),
        ('PRESS FIT', 'Use pressure to insert a part on the PCB', 'Soldering', None),
        ('HAND ASSEMBLY', 'Assembly of parts after wave but before inspection', 'TH', 'HAND hrs. Actual'),
        ('AOI PROGRAMMING', 'Programming the AOI machine', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
        ('AOI', 'Automated Optical Inspection of the PCB', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
        ('SECONDARY ASSEMBLY', 'Anything assembled after ESS testing or inspection', 'Soldering', None),
        ('EPOXY', 'Anything that needs to be glued or epoxied', 'ALL', 'HAND hrs. Actual'),
        ('INTERNAL TESTING', 'In house test at ACI', 'Test', 'E-TEST hrs. Actual'),
        ('LABELING', 'Place a label on the board per BOM instructions', 'Shipping', 'Labelling, Packaging, Shipping hrs. Actual'),
        ('DEPANEL', 'Break panel into individual boards', 'Shipping', 'HAND hrs. Actual'),
        ('PRODUCT PICTURES', 'Take pictures of product before shipping', 'Quality/Shipping/Test', None),
        ('SEND TO EXTERNAL COATING', 'Operator to sign and ship to coating', 'Shipping', None),
        ('RETURN FROM EXTERNAL COATING', 'Operator to sign when received from coating', 'Receiving/Test', None),
        ('INTERNAL COATING', 'In house coating at ACI', 'Coating', 'HAND hrs. Actual'),
        ('INTERNAL TESTING', 'Post-coating in house test at ACI', 'Test', 'E-TEST hrs. Actual'),
        ('SEND TO ESS', 'Operator to sign and ship to ESS', 'Shipping', None),
        ('RETURN FROM ESS', 'Operator to sign when received from ESS', 'Receiving/Test', None),
        ('INTERNAL TESTING', 'Post-ESS in house test at ACI', 'Test', 'E-TEST hrs. Actual'),
        ('VISUAL INSPECTION', 'Human visual inspection parts and coating, no AOI', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
        ('MANUAL ASSEMBLY', 'Put the assembly together by hand', 'Soldering/Cable', 'TH hrs. Actual'),
        ('BOX ASSEMBLY', 'Mechanical build consisting of the PCBA, hardware, and/or housings', 'Soldering/Cable', 'HAND hrs. Actual'),
        ('HARDWARE', 'Adding screws, nuts, bolts, brackets, displays, etc.', 'Soldering/Cable', 'Labelling, Packaging, Shipping hrs. Actual'),
        ('SHIPPING', 'Send product to customer per packing request', 'Shipping', 'Labelling, Packaging, Shipping hrs. Actual'),
    ]

    try:
        used_codes = set()
        for idx, (name, desc, dept, cat) in enumerate(PCB_ASSY):
            base_code = f"PCB_ASSEMBLY_{name.replace(' ', '_').replace('/', '_').replace('&', 'AND').replace('-', '_').upper()}"
            code = base_code
            if code in used_codes:
                code = f"{base_code}_{idx+1}"
            used_codes.add(code)
            db.add(WorkCenter(
                name=name, code=code, description=desc,
                traveler_type='PCB_ASSEMBLY', department=dept,
                category=cat, sort_order=idx + 1, is_active=True
            ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Insert failed: {str(e)}")

    return {"message": f"Deleted {deleted} old entries, inserted {len(PCB_ASSY)} PCB_ASSEMBLY work centers"}


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
