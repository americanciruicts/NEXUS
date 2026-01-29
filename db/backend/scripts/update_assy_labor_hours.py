"""
Migration script to update all ASSY travelers to include labor hours
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from models import Traveler, TravelerType
from database import SessionLocal

def update_assy_travelers():
    """Update all ASSY travelers to include labor hours table"""

    db = SessionLocal()

    try:
        # Find all ASSY travelers
        assy_travelers = db.query(Traveler).filter(
            Traveler.traveler_type == TravelerType.ASSY
        ).all()

        print(f"Found {len(assy_travelers)} ASSY travelers")

        updated_count = 0
        for traveler in assy_travelers:
            if not traveler.include_labor_hours:
                traveler.include_labor_hours = True
                updated_count += 1
                print(f"✅ Updated traveler {traveler.job_number} to include labor hours")

        db.commit()
        print(f"\n✅ Successfully updated {updated_count} ASSY travelers to include labor hours!")

    except Exception as e:
        print(f"❌ Error updating ASSY travelers: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_assy_travelers()
