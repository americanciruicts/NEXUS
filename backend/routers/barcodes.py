from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Traveler, StepScanEvent
from routers.auth import get_current_user
from services.barcode_service import BarcodeService

router = APIRouter()

class BarcodeData(BaseModel):
    barcode: str

class QRCodeData(BaseModel):
    qr_code: str

class StepScanRequest(BaseModel):
    qr_code: str
    scan_action: str  # 'SCAN_IN' or 'SCAN_OUT'
    notes: Optional[str] = None

class TraverlerBarcodeResponse(BaseModel):
    traveler_id: int
    barcode_data: str
    barcode_image: str  # base64 encoded
    qr_code_image: str  # base64 encoded
    unique_id: str

@router.get("/traveler/{traveler_id}")
async def get_traveler_barcode(
    traveler_id: int,
    db: Session = Depends(get_db)
):
    """Get barcode and QR code for a specific traveler - No authentication required"""

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Generate barcode with work order
    barcode_image = BarcodeService.generate_traveler_barcode(
        traveler.id, traveler.job_number, traveler.work_order_number or ""
    )

    # Generate QR code
    qr_code_image = BarcodeService.generate_qr_code(
        traveler.id, traveler.job_number, traveler.part_number
    )

    # Generate unique ID
    unique_id = BarcodeService.generate_unique_traveler_id()

    # Build barcode data string - only job number
    barcode_data = traveler.job_number

    return {
        "traveler_id": traveler.id,
        "barcode_data": barcode_data,
        "barcode_image": barcode_image,
        "qr_code_image": qr_code_image,
        "unique_id": unique_id,
        "job_number": traveler.job_number,
        "part_number": traveler.part_number,
        "part_description": traveler.part_description
    }

@router.post("/scan/barcode")
async def scan_barcode(
    barcode_data: BarcodeData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan and parse barcode to get traveler information"""

    # Parse barcode
    parsed_data = BarcodeService.parse_barcode(barcode_data.barcode)

    if "error" in parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=parsed_data["error"]
        )

    # Find traveler by ID
    traveler = db.query(Traveler).filter(
        Traveler.id == parsed_data["traveler_id"]
    ).first()

    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found for this barcode"
        )

    # Verify job number matches
    if traveler.job_number != parsed_data["job_number"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barcode job number does not match traveler"
        )

    return {
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "work_order_number": traveler.work_order_number,
        "part_number": traveler.part_number,
        "part_description": traveler.part_description,
        "revision": traveler.revision,
        "quantity": traveler.quantity,
        "status": traveler.status.value,
        "work_center": traveler.work_center,
        "priority": traveler.priority.value,
        "created_at": traveler.created_at,
        "scan_successful": True
    }

@router.post("/scan/qr")
async def scan_qr_code(
    qr_data: QRCodeData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan and parse QR code to get traveler information"""

    # Parse QR code
    parsed_data = BarcodeService.parse_qr_code(qr_data.qr_code)

    if "error" in parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=parsed_data["error"]
        )

    # Find traveler by ID
    traveler = db.query(Traveler).filter(
        Traveler.id == parsed_data["traveler_id"]
    ).first()

    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found for this QR code"
        )

    # Verify data matches
    if (traveler.job_number != parsed_data["job_number"] or
        traveler.part_number != parsed_data["part_number"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code data does not match traveler"
        )

    return {
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "work_order_number": traveler.work_order_number,
        "part_number": traveler.part_number,
        "part_description": traveler.part_description,
        "revision": traveler.revision,
        "quantity": traveler.quantity,
        "status": traveler.status.value,
        "work_center": traveler.work_center,
        "priority": traveler.priority.value,
        "created_at": traveler.created_at,
        "scan_successful": True,
        "system": parsed_data["system"],
        "company": parsed_data["company"]
    }

@router.get("/traveler/{traveler_id}/label")
async def generate_traveler_label(
    traveler_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate printable label for traveler with barcode and QR code"""

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Prepare traveler data for label
    traveler_data = {
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "part_number": traveler.part_number,
        "part_description": traveler.part_description,
        "revision": traveler.revision,
        "quantity": traveler.quantity,
        "created_at": traveler.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

    # Generate label
    label_pdf = BarcodeService.generate_traveler_label(traveler_data)

    if not label_pdf:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate traveler label"
        )

    return {
        "traveler_id": traveler.id,
        "label_pdf": label_pdf,
        "filename": f"traveler_label_{traveler.job_number}_{traveler.id}.pdf"
    }

@router.get("/step/{step_id}/qr")
async def get_step_qr_code(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate QR code for a specific routing table step"""
    from models import ProcessStep

    # Verify step exists
    step = db.query(ProcessStep).filter(ProcessStep.id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Process step not found"
        )

    # Get traveler information
    traveler = db.query(Traveler).filter(Traveler.id == step.traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found for this step"
        )

    # Generate step-specific QR code
    qr_code_image = BarcodeService.generate_step_qr_code(
        traveler.id,
        traveler.job_number,
        step.work_center_code,
        step.id,
        "PROCESS"
    )

    return {
        "step_id": step.id,
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "work_center": step.work_center_code,
        "operation": step.operation,
        "step_number": step.step_number,
        "qr_code_image": qr_code_image,
        "qr_data": f"NEXUS-STEP|{traveler.id}|{traveler.job_number}|{step.work_center_code}|PROCESS|{step.id}|AC"
    }

@router.get("/traveler/{traveler_id}/steps-qr")
async def get_all_step_qr_codes(
    traveler_id: int,
    include_manual: bool = True,
    db: Session = Depends(get_db)
):
    """Generate QR codes for all routing table steps in a traveler - No authentication required"""
    from models import ProcessStep, ManualStep

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Get all process steps for this traveler
    steps = db.query(ProcessStep).filter(
        ProcessStep.traveler_id == traveler_id
    ).order_by(ProcessStep.step_number).all()

    # Generate QR code for each process step
    step_qr_codes = []
    for step in steps:
        qr_code_image = BarcodeService.generate_step_qr_code(
            traveler.id,
            traveler.job_number,
            step.work_center_code,
            step.id,
            "PROCESS",
            step.step_number,
            step.operation,
            traveler.work_order_number
        )

        step_qr_codes.append({
            "step_id": step.id,
            "step_type": "PROCESS",
            "step_number": step.step_number,
            "operation": step.operation,
            "work_center": step.work_center_code,
            "qr_code_image": qr_code_image,
            "qr_data": f"NEXUS-STEP|{traveler.id}|{traveler.job_number}|{traveler.work_order_number}|{step.work_center_code}|{step.step_number}|{step.operation}|PROCESS|{step.id}|AC"
        })

    # Get manual steps if requested
    manual_qr_codes = []
    if include_manual:
        manual_steps = db.query(ManualStep).filter(
            ManualStep.traveler_id == traveler_id
        ).all()

        for manual_step in manual_steps:
            # Use "CUSTOM" as work center for manual steps
            qr_code_image = BarcodeService.generate_step_qr_code(
                traveler.id,
                traveler.job_number,
                "CUSTOM",
                manual_step.id,
                "MANUAL",
                0,  # manual steps don't have step numbers
                manual_step.description,
                traveler.work_order_number
            )

            manual_qr_codes.append({
                "step_id": manual_step.id,
                "step_type": "MANUAL",
                "description": manual_step.description,
                "work_center": "CUSTOM",
                "qr_code_image": qr_code_image,
                "qr_data": f"NEXUS-STEP|{traveler.id}|{traveler.job_number}|{traveler.work_order_number}|CUSTOM|0|{manual_step.description}|MANUAL|{manual_step.id}|AC"
            })

    return {
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "total_process_steps": len(step_qr_codes),
        "total_manual_steps": len(manual_qr_codes),
        "process_steps": step_qr_codes,
        "manual_steps": manual_qr_codes
    }

@router.post("/scan/step-qr")
async def scan_step_qr_code(
    qr_data: QRCodeData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan and parse step-specific QR code"""
    from models import ProcessStep

    # Parse step QR code
    parsed_data = BarcodeService.parse_qr_code(qr_data.qr_code)

    if "error" in parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=parsed_data["error"]
        )

    # Check if it's a step QR code
    if parsed_data.get("type") != "step":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This is not a step-specific QR code"
        )

    # Find traveler
    traveler = db.query(Traveler).filter(
        Traveler.id == parsed_data["traveler_id"]
    ).first()

    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found for this QR code"
        )

    # Verify job number matches
    if traveler.job_number != parsed_data["job_number"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code job number does not match traveler"
        )

    # Get step information if step_id is provided
    step_info = None
    if "step_id" in parsed_data:
        step = db.query(ProcessStep).filter(
            ProcessStep.id == parsed_data["step_id"]
        ).first()

        if step:
            step_info = {
                "step_id": step.id,
                "step_number": step.step_number,
                "operation": step.operation,
                "instructions": step.instructions,
                "is_completed": step.is_completed,
                "completed_at": step.completed_at
            }

    return {
        "scan_successful": True,
        "type": "step",
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "work_order_number": traveler.work_order_number,
        "part_number": traveler.part_number,
        "part_description": traveler.part_description,
        "work_center": parsed_data["work_center"],
        "step_info": step_info,
        "system": parsed_data["system"],
        "company": parsed_data["company"]
    }

@router.get("/search")
async def search_by_barcode_or_qr(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Universal search by barcode or QR code data"""

    # Try parsing as barcode first
    barcode_result = BarcodeService.parse_barcode(code)
    if barcode_result.get("valid"):
        traveler = db.query(Traveler).filter(
            Traveler.id == barcode_result["traveler_id"]
        ).first()

        if traveler and traveler.job_number == barcode_result["job_number"]:
            return {
                "type": "barcode",
                "traveler": {
                    "id": traveler.id,
                    "job_number": traveler.job_number,
                    "part_number": traveler.part_number,
                    "part_description": traveler.part_description,
                    "status": traveler.status.value
                }
            }

    # Try parsing as QR code (handles both traveler and step QR codes)
    qr_result = BarcodeService.parse_qr_code(code)
    if qr_result.get("valid"):
        traveler = db.query(Traveler).filter(
            Traveler.id == qr_result["traveler_id"]
        ).first()

        if traveler and traveler.job_number == qr_result["job_number"]:
            result = {
                "type": qr_result.get("type", "qr_code"),
                "traveler": {
                    "id": traveler.id,
                    "job_number": traveler.job_number,
                    "part_number": traveler.part_number,
                    "part_description": traveler.part_description,
                    "status": traveler.status.value
                }
            }

            # Add work center if it's a step QR code
            if qr_result.get("type") == "step":
                result["work_center"] = qr_result.get("work_center")
                result["step_id"] = qr_result.get("step_id")

            return result

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No traveler found for the provided code"
    )

@router.post("/scan/step")
async def scan_step(
    scan_request: StepScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan in or out of a specific step to track time"""
    from models import ProcessStep, ManualStep

    # Parse the step QR code
    parsed_data = BarcodeService.parse_qr_code(scan_request.qr_code)

    if "error" in parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=parsed_data["error"]
        )

    if parsed_data.get("type") != "step":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This is not a step-specific QR code"
        )

    # Validate scan action
    if scan_request.scan_action not in ["SCAN_IN", "SCAN_OUT"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_action must be either 'SCAN_IN' or 'SCAN_OUT'"
        )

    # Find traveler
    traveler = db.query(Traveler).filter(
        Traveler.id == parsed_data["traveler_id"]
    ).first()

    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Verify job number matches
    if traveler.job_number != parsed_data["job_number"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code job number does not match traveler"
        )

    step_id = parsed_data.get("step_id")
    step_type = parsed_data.get("step_type", "PROCESS")

    if not step_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step ID is required in the QR code"
        )

    # Verify step exists
    if step_type == "PROCESS":
        step = db.query(ProcessStep).filter(ProcessStep.id == step_id).first()
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Process step not found"
            )
    elif step_type == "MANUAL":
        step = db.query(ManualStep).filter(ManualStep.id == step_id).first()
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manual step not found"
            )

    # Handle SCAN_OUT - calculate duration
    duration_minutes = None
    if scan_request.scan_action == "SCAN_OUT":
        # Find the most recent SCAN_IN for this step
        last_scan_in = db.query(StepScanEvent).filter(
            and_(
                StepScanEvent.traveler_id == traveler.id,
                StepScanEvent.step_id == step_id,
                StepScanEvent.step_type == step_type,
                StepScanEvent.scan_action == "SCAN_IN"
            )
        ).order_by(desc(StepScanEvent.scanned_at)).first()

        if last_scan_in:
            time_diff = datetime.utcnow() - last_scan_in.scanned_at
            duration_minutes = time_diff.total_seconds() / 60

    # Create scan event
    scan_event = StepScanEvent(
        traveler_id=traveler.id,
        step_id=step_id,
        step_type=step_type,
        job_number=traveler.job_number,
        work_center=parsed_data["work_center"],
        scan_action=scan_request.scan_action,
        scanned_by=current_user.id,
        notes=scan_request.notes,
        duration_minutes=duration_minutes
    )

    db.add(scan_event)
    db.commit()
    db.refresh(scan_event)

    return {
        "success": True,
        "scan_id": scan_event.id,
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "step_id": step_id,
        "step_type": step_type,
        "work_center": parsed_data["work_center"],
        "scan_action": scan_request.scan_action,
        "scanned_at": scan_event.scanned_at,
        "scanned_by": current_user.username,
        "duration_minutes": duration_minutes
    }

@router.get("/step/{step_id}/scan-history")
async def get_step_scan_history(
    step_id: int,
    step_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get scan history for a specific step"""

    # Get all scan events for this step
    scan_events = db.query(StepScanEvent).filter(
        and_(
            StepScanEvent.step_id == step_id,
            StepScanEvent.step_type == step_type
        )
    ).order_by(desc(StepScanEvent.scanned_at)).all()

    # Calculate total time spent
    total_time_minutes = 0
    scan_pairs = []

    for i in range(0, len(scan_events), 2):
        if i + 1 < len(scan_events):
            scan_out = scan_events[i] if scan_events[i].scan_action == "SCAN_OUT" else scan_events[i+1]
            scan_in = scan_events[i+1] if scan_events[i].scan_action == "SCAN_OUT" else scan_events[i]

            if scan_out.duration_minutes:
                total_time_minutes += scan_out.duration_minutes
                scan_pairs.append({
                    "scan_in_at": scan_in.scanned_at,
                    "scan_out_at": scan_out.scanned_at,
                    "duration_minutes": scan_out.duration_minutes,
                    "scanned_by": scan_in.user.username if scan_in.user else None
                })

    return {
        "step_id": step_id,
        "step_type": step_type,
        "total_scans": len(scan_events),
        "total_time_minutes": round(total_time_minutes, 2),
        "total_time_hours": round(total_time_minutes / 60, 2),
        "scan_pairs": scan_pairs,
        "all_scans": [{
            "id": event.id,
            "scan_action": event.scan_action,
            "scanned_at": event.scanned_at,
            "scanned_by": event.user.username if event.user else None,
            "duration_minutes": event.duration_minutes,
            "notes": event.notes
        } for event in scan_events]
    }

@router.get("/traveler/{traveler_id}/time-summary")
async def get_traveler_time_summary(
    traveler_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get time summary for all steps in a traveler"""
    from models import ProcessStep

    # Verify traveler exists
    traveler = db.query(Traveler).filter(Traveler.id == traveler_id).first()
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )

    # Get all process steps
    steps = db.query(ProcessStep).filter(
        ProcessStep.traveler_id == traveler_id
    ).order_by(ProcessStep.step_number).all()

    step_summaries = []
    total_time_minutes = 0

    for step in steps:
        # Get scan events for this step
        scan_events = db.query(StepScanEvent).filter(
            and_(
                StepScanEvent.step_id == step.id,
                StepScanEvent.step_type == "PROCESS"
            )
        ).order_by(StepScanEvent.scanned_at).all()

        # Calculate time for this step
        step_time = sum(event.duration_minutes for event in scan_events if event.duration_minutes)
        total_time_minutes += step_time

        # Get current status
        last_scan = scan_events[-1] if scan_events else None
        status = "not_started"
        if last_scan:
            status = "in_progress" if last_scan.scan_action == "SCAN_IN" else "completed"

        step_summaries.append({
            "step_id": step.id,
            "step_number": step.step_number,
            "operation": step.operation,
            "work_center": step.work_center_code,
            "time_minutes": round(step_time, 2),
            "time_hours": round(step_time / 60, 2),
            "status": status,
            "scan_count": len(scan_events)
        })

    return {
        "traveler_id": traveler.id,
        "job_number": traveler.job_number,
        "total_time_minutes": round(total_time_minutes, 2),
        "total_time_hours": round(total_time_minutes / 60, 2),
        "steps": step_summaries
    }