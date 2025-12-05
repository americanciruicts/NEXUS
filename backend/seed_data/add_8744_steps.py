"""
Script to add work center steps to the 8744 PART traveler
Run this script to update the traveler with proper manufacturing steps
"""

import sys
sys.path.insert(0, '/app')

from sqlalchemy.orm import Session
from models import Traveler, ProcessStep, SubStep, WorkCenter
from database import SessionLocal, engine, Base

def add_work_center_steps():
    """Add work center steps to 8744 PART traveler"""

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Find the 8744 PART traveler
        traveler = db.query(Traveler).filter(
            Traveler.job_number == "8744 PART"
        ).first()

        if not traveler:
            print("❌ Traveler 8744 PART not found!")
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

        # Define work center steps for 8744 PART
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
                "operation": "INVENTORY",
                "work_center_code": "INVENTORY",
                "instructions": "Initial inventory check",
                "estimated_time": 30,
                "is_required": True
            },
            {
                "step_number": 3,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 1",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 4,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 2",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 5,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 3",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 6,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 4",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 7,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 5",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 8,
                "operation": "PURCHASING",
                "work_center_code": "PURCHASING",
                "instructions": "Purchase order processing - Step 6",
                "estimated_time": 45,
                "is_required": True
            },
            {
                "step_number": 9,
                "operation": "INVENTORY",
                "work_center_code": "INVENTORY",
                "instructions": "Final inventory update",
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
        print(f"\n✅ Successfully added {len(work_center_steps)} work center steps to traveler 8744 PART!")

    except Exception as e:
        print(f"❌ Error adding work center steps: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_work_center_steps()
