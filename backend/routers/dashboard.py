from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta, timezone
from typing import Optional
from database import get_db
from models import (
    User, Traveler, LaborEntry,
    ProcessStep, Approval, TravelerTrackingLog, TravelerStatus, ApprovalStatus
)
from routers.auth import get_current_user
from schemas.dashboard_schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive dashboard statistics for date range.
    Date format: YYYY-MM-DD
    Default: Last 7 days
    """
    # Parse date range
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    else:
        end_dt = datetime.now(timezone.utc)

    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
    else:
        start_dt = end_dt - timedelta(days=7)

    # Date range strings for due_date/ship_date filtering (stored as strings YYYY-MM-DD)
    start_date_str = start_dt.strftime("%Y-%m-%d")
    end_date_str = end_dt.strftime("%Y-%m-%d")

    # Filter for travelers whose due_date or ship_date falls in the range (or have no dates set)
    date_range_filter = or_(
        and_(Traveler.due_date.isnot(None), Traveler.due_date >= start_date_str, Traveler.due_date <= end_date_str),
        and_(Traveler.ship_date.isnot(None), Traveler.ship_date >= start_date_str, Traveler.ship_date <= end_date_str),
        and_(Traveler.due_date.is_(None), Traveler.ship_date.is_(None))
    )

    # Status Distribution
    status_counts = db.query(
        Traveler.status,
        func.count(Traveler.id).label('count')
    ).filter(
        date_range_filter,
        Traveler.is_active == True
    ).group_by(Traveler.status).all()

    status_distribution = {str(status.value): count for status, count in status_counts}

    # Labor Analytics
    labor_entries = db.query(
        func.coalesce(func.sum(LaborEntry.hours_worked), 0).label('total_hours')
    ).filter(
        LaborEntry.created_at >= start_dt,
        LaborEntry.created_at <= end_dt
    ).first()

    total_labor_hours = float(labor_entries.total_hours) if labor_entries else 0.0

    # Labor by work center
    labor_by_wc = db.query(
        LaborEntry.work_center,
        func.sum(LaborEntry.hours_worked).label('hours')
    ).filter(
        LaborEntry.created_at >= start_dt,
        LaborEntry.created_at <= end_dt,
        LaborEntry.work_center.isnot(None)
    ).group_by(LaborEntry.work_center).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(10).all()

    labor_by_work_center = [
        {"workCenter": wc or "Unknown", "hours": float(hours)}
        for wc, hours in labor_by_wc
    ]

    # Labor trend by work center (daily/weekly aggregation)
    days_diff = (end_dt - start_dt).days
    if days_diff <= 31:
        labor_trend_data = db.query(
            func.date(LaborEntry.start_time).label('date'),
            LaborEntry.work_center,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt
        ).group_by(func.date(LaborEntry.start_time), LaborEntry.work_center).order_by(func.date(LaborEntry.start_time)).all()

        # Pivot: group by date, each work center becomes a key
        from collections import OrderedDict
        date_map = OrderedDict()
        all_work_centers = set()
        for date, wc, hours in labor_trend_data:
            date_str = date.strftime("%b %d") if date else ""
            wc_name = wc or "Unknown"
            all_work_centers.add(wc_name)
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str}
            date_map[date_str][wc_name] = round(float(hours), 2)

        labor_trend = list(date_map.values())
    else:
        labor_trend_data = db.query(
            func.date_trunc('week', LaborEntry.start_time).label('week'),
            LaborEntry.work_center,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt
        ).group_by(func.date_trunc('week', LaborEntry.start_time), LaborEntry.work_center).order_by(func.date_trunc('week', LaborEntry.start_time)).all()

        from collections import OrderedDict
        date_map = OrderedDict()
        all_work_centers = set()
        for week, wc, hours in labor_trend_data:
            date_str = week.strftime("%b %d") if week else ""
            wc_name = wc or "Unknown"
            all_work_centers.add(wc_name)
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str}
            date_map[date_str][wc_name] = round(float(hours), 2)

        labor_trend = list(date_map.values())

    # Production Metrics - filtered by due_date/ship_date
    travelers_created = db.query(func.count(Traveler.id)).filter(
        date_range_filter
    ).scalar() or 0

    travelers_completed = db.query(func.count(Traveler.id)).filter(
        date_range_filter,
        Traveler.status == TravelerStatus.COMPLETED
    ).scalar() or 0

    completion_rate = (travelers_completed / travelers_created * 100) if travelers_created > 0 else 0.0

    # Average completion time
    completed_travelers = db.query(
        func.avg(
            func.extract('epoch', Traveler.completed_at - Traveler.created_at) / 3600
        ).label('avg_hours')
    ).filter(
        date_range_filter,
        Traveler.status == TravelerStatus.COMPLETED,
        Traveler.completed_at.isnot(None)
    ).first()

    avg_completion_time_hours = float(completed_travelers.avg_hours) if completed_travelers and completed_travelers.avg_hours else 0.0

    # Work Center Utilization (same as labor by work center for now)
    work_center_utilization = labor_by_work_center

    # Top Employees
    top_employees_data = db.query(
        User.first_name,
        User.last_name,
        User.username,
        func.sum(LaborEntry.hours_worked).label('hours')
    ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
        LaborEntry.created_at >= start_dt,
        LaborEntry.created_at <= end_dt
    ).group_by(User.id, User.first_name, User.last_name, User.username).order_by(
        func.sum(LaborEntry.hours_worked).desc()
    ).limit(10).all()

    top_employees = [
        {
            "name": f"{first_name} {last_name}" if first_name and last_name else username,
            "value": float(hours),
            "hours": float(hours)
        }
        for first_name, last_name, username, hours in top_employees_data
    ]

    # Alerts
    pending_approvals = db.query(func.count(Approval.id)).filter(
        Approval.status == ApprovalStatus.PENDING
    ).scalar() or 0

    on_hold_travelers = db.query(func.count(Traveler.id)).filter(
        Traveler.status == TravelerStatus.ON_HOLD,
        Traveler.is_active == True
    ).scalar() or 0

    # Overdue travelers (in progress for more than 30 days)
    overdue_date = datetime.now(timezone.utc) - timedelta(days=30)
    overdue_travelers = db.query(func.count(Traveler.id)).filter(
        Traveler.status == TravelerStatus.IN_PROGRESS,
        Traveler.created_at < overdue_date,
        Traveler.is_active == True
    ).scalar() or 0

    # Real-time Operations
    active_labor_entries = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.is_completed == False
    ).scalar() or 0

    return DashboardStats(
        start_date=start_dt,
        end_date=end_dt,
        status_distribution=status_distribution,
        total_labor_hours=total_labor_hours,
        labor_by_work_center=labor_by_work_center,
        labor_trend=labor_trend,
        travelers_created=travelers_created,
        travelers_completed=travelers_completed,
        completion_rate=completion_rate,
        avg_completion_time_hours=avg_completion_time_hours,
        work_center_utilization=work_center_utilization,
        top_employees=top_employees,
        pending_approvals=pending_approvals,
        on_hold_travelers=on_hold_travelers,
        overdue_travelers=overdue_travelers,
        active_labor_entries=active_labor_entries
    )
