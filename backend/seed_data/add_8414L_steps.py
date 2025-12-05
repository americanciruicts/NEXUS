"""
Script to add work center steps to the 8414L ASSY traveler
Run this script to update the traveler with proper manufacturing steps
"""

import sys
sys.path.insert(0, '/app')

from sqlalchemy.orm import Session
from models import Traveler, ProcessStep, SubStep, WorkCenter
from database import SessionLocal, engine, Base

def add_work_center_steps():
    """Add work center steps to 8414L ASSY traveler"""

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Find the 8414L traveler
        traveler = db.query(Traveler).filter(
            Traveler.job_number == "8414L"
        ).first()

        if not traveler:
            print("❌ Traveler 8414L not found!")
            print("Creating the traveler first...")
            return

        print(f"✅ Found traveler: {traveler.job_number}")

        # Delete existing process steps for this traveler
        existing_steps = db.query(ProcessStep).filter(
            ProcessStep.traveler_id == traveler.id
        ).all()

        if existing_steps:
            print(f"Deleting {len(existing_steps)} existing steps...")
            for step in existing_steps:
                # Delete sub-steps first
                db.query(SubStep).filter(SubStep.process_step_id == step.id).delete()
            # Delete process steps
            db.query(ProcessStep).filter(ProcessStep.traveler_id == traveler.id).delete()
            db.commit()

        # Define work center steps for 8414L ASSY
        work_center_steps = [
            {
                "step_number": 1,
                "operation": "ENGINEERING",
                "work_center_code": "ENGINEERING",
                "instructions": "Engineering review and approval",
                "estimated_time": 60,
                "is_required": True
            },
            {
                "step_number": 2,
                "operation": "MAKE BOM",
                "work_center_code": "BOM",
                "instructions": "Create Bill of Materials",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 3,
                "operation": "COMPONENT PLACEMENT",
                "work_center_code": "COMP_PLACE",
                "instructions": "Place components on PCB",
                "estimated_time": 120,
                "is_required": True
            },
            {
                "step_number": 4,
                "operation": "AUTO INSERTION",
                "work_center_code": "AUTO_INSERT",
                "instructions": "Automated component insertion",
                "estimated_time": 90,
                "is_required": True
            },
            {
                "step_number": 5,
                "operation": "WASH",
                "work_center_code": "WASH_1",
                "instructions": "Clean PCB after auto insertion",
                "estimated_time": 30,
                "is_required": True
            },
            {
                "step_number": 6,
                "operation": "MANUAL INSERTION",
                "work_center_code": "MANUAL_INSERT",
                "instructions": "Manually insert remaining components",
                "estimated_time": 180,
                "is_required": True
            },
            {
                "step_number": 7,
                "operation": "WAVE SOLDER",
                "work_center_code": "WAVE_SOLDER",
                "instructions": "Wave soldering process",
                "estimated_time": 60,
                "is_required": True
            },
            {
                "step_number": 8,
                "operation": "WASH",
                "work_center_code": "WASH_2",
                "instructions": "Clean PCB after wave soldering",
                "estimated_time": 30,
                "is_required": True
            },
            {
                "step_number": 9,
                "operation": "TRIM",
                "work_center_code": "TRIM",
                "instructions": "Trim excess leads and clean edges",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 10,
                "operation": "AOI CHECK",
                "work_center_code": "AOI",
                "instructions": "Automated Optical Inspection",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 11,
                "operation": "MANUAL INSERTION",
                "work_center_code": "MANUAL_INSERT_2",
                "instructions": "Additional manual component insertion",
                "estimated_time": 90,
                "is_required": True
            },
            {
                "step_number": 12,
                "operation": "LABELLING",
                "work_center_code": "LABELLING",
                "instructions": "Apply labels to assembly",
                "estimated_time": 20,
                "is_required": True
            },
            {
                "step_number": 13,
                "operation": "PROGRAMMING",
                "work_center_code": "PROGRAMMING",
                "instructions": "Program firmware/software",
                "estimated_time": 60,
                "is_required": True
            },
            {
                "step_number": 14,
                "operation": "E-TEST",
                "work_center_code": "E_TEST",
                "instructions": "Electrical testing",
                "estimated_time": 60,
                "is_required": True
            },
            {
                "step_number": 15,
                "operation": "BOX ASSY",
                "work_center_code": "BOX_ASSY",
                "instructions": "Box assembly and enclosure",
                "estimated_time": 90,
                "is_required": True
            },
            {
                "step_number": 16,
                "operation": "FINAL INSPECTION",
                "work_center_code": "FINAL_INSPECT",
                "instructions": "Final quality inspection",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 17,
                "operation": "PICTURES",
                "work_center_code": "PICTURES",
                "instructions": "Take photos for documentation",
                "estimated_time": 15,
                "is_required": True
            },
            {
                "step_number": 18,
                "operation": "SHIPPING",
                "work_center_code": "SHIPPING",
                "instructions": "Package and ship to customer",
                "estimated_time": 30,
                "is_required": True
            }
        ]

        # Create work centers and process steps
        for step_data in work_center_steps:
            # Auto-create work center if it doesn't exist
            work_center = db.query(WorkCenter).filter(
                WorkCenter.code == step_data["work_center_code"]
            ).first()

            if not work_center:
                work_center = WorkCenter(
                    code=step_data["work_center_code"],
                    name=step_data["operation"],
                    description=f"Work center for {step_data['operation']}",
                    is_active=True
                )
                db.add(work_center)
                db.commit()
                print(f"Created work center: {step_data['work_center_code']}")

            # Create process step
            process_step = ProcessStep(
                traveler_id=traveler.id,
                step_number=step_data["step_number"],
                operation=step_data["operation"],
                work_center_code=step_data["work_center_code"],
                instructions=step_data["instructions"],
                estimated_time=step_data["estimated_time"],
                is_required=step_data["is_required"],
                quantity=traveler.quantity,
                accepted=None,
                rejected=None,
                sign=None,
                completed_date=None
            )
            db.add(process_step)
            print(f"Added step {step_data['step_number']}: {step_data['operation']}")

        db.commit()
        print(f"\n✅ Successfully added {len(work_center_steps)} work center steps to traveler 8414L!")

    except Exception as e:
        print(f"❌ Error adding work center steps: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_work_center_steps()
