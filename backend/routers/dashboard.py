from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta, timezone
from typing import Optional
from database import get_db
from models import (
    User, Traveler, LaborEntry, WorkCenter,
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
        LaborEntry.created_at <= end_dt,
        LaborEntry.hours_worked > 0,
        LaborEntry.end_time.isnot(None)
    ).first()

    total_labor_hours = float(labor_entries.total_hours) if labor_entries else 0.0

    # Labor by work center
    labor_by_wc = db.query(
        LaborEntry.work_center,
        func.sum(LaborEntry.hours_worked).label('hours')
    ).filter(
        LaborEntry.created_at >= start_dt,
        LaborEntry.created_at <= end_dt,
        LaborEntry.work_center.isnot(None),
        LaborEntry.hours_worked > 0,
        LaborEntry.end_time.isnot(None)
    ).group_by(LaborEntry.work_center).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(10).all()

    labor_by_work_center = [
        {"workCenter": wc or "Unknown", "hours": float(hours)}
        for wc, hours in labor_by_wc
    ]

    # Labor trend by work center (daily/weekly aggregation) with job number details
    days_diff = (end_dt - start_dt).days
    from collections import OrderedDict

    if days_diff <= 31:
        # Get aggregated totals by date + work center
        labor_trend_data = db.query(
            func.date(LaborEntry.start_time).label('date'),
            LaborEntry.work_center,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date(LaborEntry.start_time), LaborEntry.work_center).order_by(func.date(LaborEntry.start_time)).all()

        # Get job-level detail: date + work center + job_number
        labor_trend_jobs = db.query(
            func.date(LaborEntry.start_time).label('date'),
            LaborEntry.work_center,
            Traveler.job_number,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).join(Traveler, LaborEntry.traveler_id == Traveler.id).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date(LaborEntry.start_time), LaborEntry.work_center, Traveler.job_number).order_by(func.date(LaborEntry.start_time)).all()

        date_map = OrderedDict()
        for date, wc, hours in labor_trend_data:
            date_str = date.strftime("%b %d") if date else ""
            wc_name = wc or "Unknown"
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str, "_details": {}}
            date_map[date_str][wc_name] = round(float(hours), 2)

        # Attach job details
        for date, wc, job_num, hours in labor_trend_jobs:
            date_str = date.strftime("%b %d") if date else ""
            wc_name = wc or "Unknown"
            if date_str in date_map:
                details = date_map[date_str]["_details"]
                if wc_name not in details:
                    details[wc_name] = []
                details[wc_name].append({"job": job_num or "N/A", "hours": round(float(hours), 2)})

        labor_trend = list(date_map.values())
    else:
        labor_trend_data = db.query(
            func.date_trunc('week', LaborEntry.start_time).label('week'),
            LaborEntry.work_center,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date_trunc('week', LaborEntry.start_time), LaborEntry.work_center).order_by(func.date_trunc('week', LaborEntry.start_time)).all()

        labor_trend_jobs = db.query(
            func.date_trunc('week', LaborEntry.start_time).label('week'),
            LaborEntry.work_center,
            Traveler.job_number,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).join(Traveler, LaborEntry.traveler_id == Traveler.id).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date_trunc('week', LaborEntry.start_time), LaborEntry.work_center, Traveler.job_number).order_by(func.date_trunc('week', LaborEntry.start_time)).all()

        date_map = OrderedDict()
        for week, wc, hours in labor_trend_data:
            date_str = week.strftime("%b %d") if week else ""
            wc_name = wc or "Unknown"
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str, "_details": {}}
            date_map[date_str][wc_name] = round(float(hours), 2)

        for week, wc, job_num, hours in labor_trend_jobs:
            date_str = week.strftime("%b %d") if week else ""
            wc_name = wc or "Unknown"
            if date_str in date_map:
                details = date_map[date_str]["_details"]
                if wc_name not in details:
                    details[wc_name] = []
                details[wc_name].append({"job": job_num or "N/A", "hours": round(float(hours), 2)})

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
        LaborEntry.created_at <= end_dt,
        LaborEntry.hours_worked > 0,
        LaborEntry.end_time.isnot(None)
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

    # Department trend: labor hours grouped by date + department
    # Join labor_entries with work_centers to get department
    from collections import OrderedDict
    if days_diff <= 31:
        dept_trend_data = db.query(
            func.date(LaborEntry.start_time).label('date'),
            WorkCenter.department,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).outerjoin(
            WorkCenter,
            func.upper(func.trim(LaborEntry.work_center)) == func.upper(func.trim(WorkCenter.name))
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date(LaborEntry.start_time), WorkCenter.department).order_by(func.date(LaborEntry.start_time)).all()
    else:
        dept_trend_data = db.query(
            func.date_trunc('week', LaborEntry.start_time).label('date'),
            WorkCenter.department,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).outerjoin(
            WorkCenter,
            func.upper(func.trim(LaborEntry.work_center)) == func.upper(func.trim(WorkCenter.name))
        ).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(func.date_trunc('week', LaborEntry.start_time), WorkCenter.department).order_by(func.date_trunc('week', LaborEntry.start_time)).all()

    dept_date_map = OrderedDict()
    for date_val, dept, hours in dept_trend_data:
        date_str = date_val.strftime("%b %d") if date_val else ""
        dept_name = dept or "Unknown"
        # Normalize multi-department strings (e.g. "Engineering/Prep" → "Engineering")
        dept_name = dept_name.split('/')[0].strip()
        if date_str not in dept_date_map:
            dept_date_map[date_str] = {"date": date_str}
        dept_date_map[date_str][dept_name] = round(
            dept_date_map[date_str].get(dept_name, 0) + float(hours), 2
        )
    department_trend = list(dept_date_map.values())

    # Stuck travelers: travelers IN_PROGRESS where the latest scan/activity is old
    stuck_travelers = []
    try:
        in_progress = db.query(Traveler).filter(
            Traveler.status == TravelerStatus.IN_PROGRESS,
            Traveler.is_active == True
        ).all()

        for t in in_progress:
            # Find latest activity: most recent labor entry or tracking scan
            latest_labor = db.query(func.max(LaborEntry.start_time)).filter(
                LaborEntry.traveler_id == t.id
            ).scalar()
            latest_scan = db.query(func.max(TravelerTrackingLog.scanned_at)).filter(
                TravelerTrackingLog.traveler_id == t.id
            ).scalar()

            latest_activity = max(filter(None, [latest_labor, latest_scan]), default=None)
            if not latest_activity:
                latest_activity = t.created_at

            # Make timezone-aware for comparison
            now = datetime.now(timezone.utc)
            if latest_activity and latest_activity.tzinfo is None:
                latest_activity = latest_activity.replace(tzinfo=timezone.utc)

            idle_hours = (now - latest_activity).total_seconds() / 3600 if latest_activity else 999

            # Consider "stuck" if idle > 48 hours (2 business days)
            if idle_hours > 48:
                # Find current work center from latest scan
                current_wc_scan = db.query(TravelerTrackingLog).filter(
                    TravelerTrackingLog.traveler_id == t.id,
                    TravelerTrackingLog.scan_type == "WORK_CENTER"
                ).order_by(TravelerTrackingLog.scanned_at.desc()).first()

                # Get department from work center
                dept = None
                wc_name = current_wc_scan.work_center if current_wc_scan else None
                if wc_name:
                    wc_obj = db.query(WorkCenter).filter(
                        func.upper(func.trim(WorkCenter.name)) == wc_name.upper().strip()
                    ).first()
                    dept = wc_obj.department if wc_obj else None

                stuck_travelers.append({
                    "id": t.id,
                    "job_number": t.job_number,
                    "part_number": t.part_number,
                    "work_center": wc_name or "Unknown",
                    "department": dept or "Unknown",
                    "idle_hours": round(idle_hours, 1),
                    "idle_days": round(idle_hours / 24, 1),
                    "last_activity": latest_activity.isoformat() if latest_activity else None,
                    "due_date": t.due_date,
                    "priority": t.priority.value if t.priority else "NORMAL"
                })

        # Sort by idle hours descending (most stuck first)
        stuck_travelers.sort(key=lambda x: x["idle_hours"], reverse=True)
        stuck_travelers = stuck_travelers[:20]  # Top 20
    except Exception as e:
        print(f"Warning: Could not compute stuck travelers: {e}")

    # Forecast: in-progress travelers with due dates, step-level estimates, buffer, headcount
    forecast = []

    # Approximate hours per operation type (PCB assembly industry averages)
    OPERATION_ESTIMATES = {
        "KITTING": {"hours": 1.5, "operators": 1},
        "FEEDER LOAD": {"hours": 1.0, "operators": 1},
        "SMT SET UP": {"hours": 1.5, "operators": 1},
        "SMT TOP": {"hours": 3.0, "operators": 2},
        "SMT BOTTOM": {"hours": 3.0, "operators": 2},
        "SMT BOT": {"hours": 3.0, "operators": 2},
        "REFLOW": {"hours": 1.5, "operators": 1},
        "WASH": {"hours": 0.75, "operators": 1},
        "AOI": {"hours": 1.5, "operators": 1},
        "XRAY": {"hours": 1.0, "operators": 1},
        "HAND SOLDER": {"hours": 3.0, "operators": 2},
        "HAND ASSEMBLY": {"hours": 2.5, "operators": 2},
        "TOUCH UP": {"hours": 1.5, "operators": 1},
        "INSPECTION": {"hours": 1.5, "operators": 1},
        "INTERNAL TESTING": {"hours": 2.0, "operators": 1},
        "TESTING": {"hours": 2.0, "operators": 1},
        "INTERNAL COATING": {"hours": 1.5, "operators": 1},
        "CONFORMAL COAT": {"hours": 1.5, "operators": 1},
        "LABELING": {"hours": 0.5, "operators": 1},
        "PACKAGING": {"hours": 0.5, "operators": 1},
        "SHIPPING": {"hours": 0.5, "operators": 1},
        "QC": {"hours": 1.5, "operators": 1},
        "PROGRAMMING": {"hours": 1.0, "operators": 1},
        "DEPANEL": {"hours": 1.0, "operators": 1},
        "STENCIL": {"hours": 0.75, "operators": 1},
        "PASTE": {"hours": 0.75, "operators": 1},
    }
    BUFFER_PERCENT = 0.10  # 10% buffer

    def get_step_estimate(operation_name):
        """Get estimated hours and operators for an operation using fuzzy match."""
        if not operation_name:
            return {"hours": 1.0, "operators": 1}
        op_upper = operation_name.upper().strip()
        # Exact match first
        if op_upper in OPERATION_ESTIMATES:
            return OPERATION_ESTIMATES[op_upper]
        # Substring match
        for key, val in OPERATION_ESTIMATES.items():
            if key in op_upper or op_upper in key:
                return val
        return {"hours": 1.0, "operators": 1}

    try:
        forecast_travelers = db.query(Traveler).filter(
            Traveler.status.in_([TravelerStatus.IN_PROGRESS, TravelerStatus.CREATED]),
            Traveler.is_active == True,
            Traveler.due_date.isnot(None)
        ).all()

        for t in forecast_travelers:
            steps = db.query(ProcessStep).filter(
                ProcessStep.traveler_id == t.id
            ).order_by(ProcessStep.step_number).all()

            # Actual hours worked per step
            step_labor = {}
            labor_rows = db.query(
                LaborEntry.step_id,
                func.sum(LaborEntry.hours_worked).label('hours')
            ).filter(
                LaborEntry.traveler_id == t.id,
                LaborEntry.hours_worked > 0,
                LaborEntry.end_time.isnot(None)
            ).group_by(LaborEntry.step_id).all()
            for row in labor_rows:
                if row.step_id:
                    step_labor[row.step_id] = float(row.hours)

            total_actual = sum(step_labor.values())

            # Days until due
            try:
                due = datetime.strptime(t.due_date, "%Y-%m-%d")
                days_until_due = (due - datetime.now()).days
            except Exception:
                days_until_due = None

            # Work hours available (8h/day, weekdays only)
            work_hours_available = 0
            if days_until_due is not None and days_until_due > 0:
                current = datetime.now()
                for d in range(days_until_due):
                    check_day = current + timedelta(days=d+1)
                    if check_day.weekday() < 5:  # Mon-Fri
                        work_hours_available += 8

            # Build step-level forecast
            step_forecasts = []
            total_estimated = 0
            total_buffer = 0
            total_completed_steps = 0

            for step in steps:
                est = get_step_estimate(step.operation)
                est_hours = est["hours"]
                operators = est["operators"]
                buffer = round(est_hours * BUFFER_PERCENT, 2)
                buffered_hours = est_hours + buffer
                actual = step_labor.get(step.id, 0)

                total_estimated += est_hours
                total_buffer += buffer

                if step.is_completed:
                    total_completed_steps += 1

                step_forecasts.append({
                    "step_number": step.step_number,
                    "operation": step.operation or "Unknown",
                    "is_completed": step.is_completed or False,
                    "estimated_hours": round(est_hours, 1),
                    "buffer_hours": round(buffer, 1),
                    "buffered_total": round(buffered_hours, 1),
                    "actual_hours": round(actual, 1),
                    "operators_needed": operators,
                })

            total_steps = len(steps)
            remaining_hours = max(0, total_estimated - total_actual)
            remaining_buffered = remaining_hours + total_buffer

            # Headcount needed to finish on time
            if work_hours_available > 0 and remaining_buffered > 0:
                import math
                min_headcount = math.ceil(remaining_buffered / work_hours_available)
            else:
                min_headcount = 1

            percent_complete = round(total_completed_steps / total_steps * 100, 1) if total_steps > 0 else 0
            on_track = (days_until_due is not None and days_until_due > 0 and
                        (work_hours_available >= remaining_buffered or percent_complete >= 100))

            forecast.append({
                "id": t.id,
                "job_number": t.job_number,
                "part_number": t.part_number,
                "part_description": t.part_description or "",
                "due_date": t.due_date,
                "days_until_due": days_until_due,
                "estimated_hours": round(total_estimated, 1),
                "buffer_hours": round(total_buffer, 1),
                "buffered_total": round(total_estimated + total_buffer, 1),
                "actual_hours": round(total_actual, 1),
                "remaining_hours": round(remaining_hours, 1),
                "remaining_buffered": round(remaining_buffered, 1),
                "work_hours_available": round(work_hours_available, 1),
                "min_headcount": min_headcount,
                "total_steps": total_steps,
                "completed_steps": total_completed_steps,
                "percent_complete": percent_complete,
                "priority": t.priority.value if t.priority else "NORMAL",
                "on_track": on_track,
                "steps": step_forecasts,
            })

        forecast.sort(key=lambda x: x["days_until_due"] if x["days_until_due"] is not None else 999)
        forecast = forecast[:20]
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Warning: Could not compute forecast: {e}")

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
        department_trend=department_trend,
        stuck_travelers=stuck_travelers,
        forecast=forecast,
        active_labor_entries=active_labor_entries
    )
