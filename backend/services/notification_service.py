from sqlalchemy.orm import Session
from models import Notification, User, UserRole, NotificationType
from typing import Optional

def create_notification_for_admins(
    db: Session,
    notification_type: NotificationType,
    title: str,
    message: str,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    created_by_username: Optional[str] = None
):
    """Create notifications for all admin users"""
    # Get all admin users
    admin_users = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).all()

    notifications = []
    for admin in admin_users:
        notification = Notification(
            user_id=admin.id,
            notification_type=notification_type,
            title=title,
            message=message,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by_username=created_by_username
        )
        db.add(notification)
        notifications.append(notification)

    db.commit()
    return notifications
