#!/usr/bin/env python3
"""Script to delete all notifications from the database"""

import sys
sys.path.append('/home/tony/NEXUS/backend')

from database import SessionLocal
from models import Notification

def delete_all_notifications():
    db = SessionLocal()
    try:
        # Count notifications before deleting
        count = db.query(Notification).count()
        print(f"Found {count} notifications in database")

        # Delete all notifications
        db.query(Notification).delete()
        db.commit()

        print(f"Successfully deleted {count} notifications")
        return count
    except Exception as e:
        print(f"Error deleting notifications: {e}")
        db.rollback()
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    delete_all_notifications()
