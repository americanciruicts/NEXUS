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
        # Include ALL non-completed travelers (active + drafts)
        forecast_travelers = db.query(Traveler).filter(
            Traveler.status.in_([TravelerStatus.IN_PROGRESS, TravelerStatus.CREATED, TravelerStatus.DRAFT, TravelerStatus.ON_HOLD]),
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
                days_until_due = (due.date() - datetime.now(timezone.utc).date()).days
            except Exception:
                days_until_due = None

            # Work hours available (8h/day, weekdays only)
            work_hours_available = 0
            if days_until_due is not None and days_until_due > 0:
                current = datetime.now(timezone.utc)
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

            # ── KOSH inventory check for this job ──
            inventory_ready = None  # None = no KOSH job found
            total_bom_lines = 0
            lines_with_stock = 0
            shortage_lines = 0
            kosh_job_status = None
            try:
                from routers.jobs import get_kosh_connection
                kosh_conn = get_kosh_connection()
                kosh_cur = kosh_conn.cursor()
                # Strip L/M suffixes to get base job number for KOSH lookup
                base_job = t.job_number.rstrip('LM') if t.job_number else t.job_number

                kosh_cur.execute('SELECT order_qty, status FROM pcb_inventory."tblJob" WHERE job_number = %s', (t.job_number,))
                kosh_job = kosh_cur.fetchone()
                kosh_job_number = t.job_number
                if not kosh_job:
                    kosh_cur.execute('SELECT order_qty, status FROM pcb_inventory."tblJob" WHERE job_number = %s', (base_job,))
                    kosh_job = kosh_cur.fetchone()
                    if kosh_job:
                        kosh_job_number = base_job

                if kosh_job:
                    kosh_order_qty = int(kosh_job[0] or 1)
                    kosh_job_status = kosh_job[1]

                    kosh_cur.execute("""
                        WITH bom_items AS (
                            SELECT DISTINCT ON (b.aci_pn) b.aci_pn, b.mpn, b.qty
                            FROM pcb_inventory."tblBOM" b
                            WHERE b.job = %s
                            ORDER BY b.aci_pn, b.line
                        )
                        SELECT
                            bi.aci_pn,
                            CAST(COALESCE(NULLIF(bi.qty, ''), '0') AS INTEGER) as qty_per_board,
                            COALESCE(SUM(CASE WHEN w.loc_to != 'MFG Floor' THEN w.onhandqty ELSE 0 END), 0) as on_hand
                        FROM bom_items bi
                        LEFT JOIN pcb_inventory."tblWhse_Inventory" w
                            ON bi.aci_pn = w.item OR bi.mpn = w.mpn
                        GROUP BY bi.aci_pn, bi.qty
                    """, (kosh_job_number,))
                    bom_rows = kosh_cur.fetchall()
                    total_bom_lines = len(bom_rows)
                    for row in bom_rows:
                        req = int(row[1] or 0) * kosh_order_qty
                        oh = int(row[2] or 0)
                        if oh >= req:
                            lines_with_stock += 1
                        else:
                            shortage_lines += 1

                    inventory_ready = shortage_lines == 0 and total_bom_lines > 0

                kosh_conn.close()
            except Exception:
                pass  # KOSH unavailable — skip inventory check

            # On-track: combine due date + inventory readiness
            if percent_complete >= 100:
                on_track = True
            elif days_until_due is not None and days_until_due > 0:
                on_track = work_hours_available >= remaining_buffered
            elif days_until_due is not None and days_until_due <= 0:
                on_track = False  # Overdue
            else:
                on_track = None  # No due date — unknown

            # If inventory is short, mark at risk regardless
            if inventory_ready is False and on_track is True:
                on_track = False  # Parts missing — can't be on track

            forecast.append({
                "id": t.id,
                "job_number": t.job_number,
                "part_number": t.part_number,
                "part_description": t.part_description or "",
                "customer_name": t.customer_name or "",
                "status": t.status.value if t.status else "CREATED",
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
                # Inventory data from KOSH
                "inventory_ready": inventory_ready,
                "total_bom_lines": total_bom_lines,
                "lines_with_stock": lines_with_stock,
                "shortage_lines": shortage_lines,
                "kosh_job_status": kosh_job_status,
            })

        # Sort: overdue first, then by days_until_due ascending, no-due-date last
        forecast.sort(key=lambda x: (
            0 if x["days_until_due"] is not None and x["days_until_due"] <= 0 else  # overdue first
            1 if x["days_until_due"] is not None else  # has due date
            2,  # no due date last
            x["days_until_due"] if x["days_until_due"] is not None else 999
        ))
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


@router.get("/insights")
async def get_dashboard_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All-in-one insights endpoint for dashboard cards. Returns operator efficiency,
    busiest work centers, idle operators, KOSH inventory insights, rejection rates,
    bottlenecks, due date heatmap, overdue aging, throughput/labor/cycle trends."""
    import math
    from collections import defaultdict

    now = datetime.now(timezone.utc)
    today = now.date()

    # ─── 1. OPERATOR EFFICIENCY (actual vs estimated per person) ─────────────
    operator_efficiency = []
    try:
        employees = db.query(
            User.id, User.username, User.first_name, User.last_name,
            func.sum(LaborEntry.hours_worked).label('actual_hours'),
            func.count(LaborEntry.id).label('entry_count')
        ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None),
            LaborEntry.created_at >= now - timedelta(days=30)
        ).group_by(User.id).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(15).all()

        OPERATION_ESTIMATES = {
            "KITTING": 1.5, "FEEDER LOAD": 1.0, "SMT SET UP": 1.5, "SMT TOP": 3.0,
            "SMT BOTTOM": 3.0, "WASH": 0.75, "AOI": 1.5, "HAND SOLDER": 3.0,
            "HAND ASSEMBLY": 2.5, "INSPECTION": 1.5, "INTERNAL TESTING": 2.0,
            "LABELING": 0.5, "SHIPPING": 0.5, "DEPANEL": 1.0, "TRIM": 1.0,
            "WAVE": 1.5, "MANUAL INSERTION": 2.0, "COMPONENT PREP": 1.5,
        }

        for emp in employees:
            # Get their completed steps to estimate expected hours
            completed_steps = db.query(ProcessStep.operation).join(
                LaborEntry, LaborEntry.step_id == ProcessStep.id
            ).filter(
                LaborEntry.employee_id == emp.id,
                LaborEntry.end_time.isnot(None),
                LaborEntry.created_at >= now - timedelta(days=30)
            ).all()
            est_hours = sum(
                next((v for k, v in OPERATION_ESTIMATES.items() if k in (s.operation or '').upper()), 1.0)
                for s in completed_steps
            )
            actual = float(emp.actual_hours or 0)
            efficiency = round((est_hours / actual * 100), 1) if actual > 0 else 0
            operator_efficiency.append({
                "name": f"{emp.first_name or ''} {emp.last_name or ''}".strip() or emp.username,
                "username": emp.username,
                "actual_hours": round(actual, 1),
                "estimated_hours": round(est_hours, 1),
                "efficiency": efficiency,
                "entries": emp.entry_count,
            })
    except Exception as e:
        print(f"Operator efficiency error: {e}")

    # ─── 2. BUSIEST WORK CENTERS (active labor right now) ────────────────────
    busiest_wc = []
    try:
        active = db.query(
            LaborEntry.work_center,
            func.count(LaborEntry.id).label('active_count'),
            func.count(func.distinct(LaborEntry.employee_id)).label('operators')
        ).filter(
            LaborEntry.is_completed == False,
            LaborEntry.end_time.is_(None)
        ).group_by(LaborEntry.work_center).order_by(func.count(LaborEntry.id).desc()).all()

        for wc in active:
            busiest_wc.append({
                "work_center": wc.work_center or "Unknown",
                "active_entries": wc.active_count,
                "operators": wc.operators,
            })
    except Exception as e:
        print(f"Busiest WC error: {e}")

    # ─── 3. IDLE OPERATORS (logged labor today but none active now) ──────────
    idle_operators = []
    try:
        today_start = datetime.combine(today, datetime.min.time())
        worked_today = db.query(func.distinct(LaborEntry.employee_id)).filter(
            LaborEntry.created_at >= today_start
        ).all()
        worked_today_ids = {r[0] for r in worked_today}

        active_now_ids = {r[0] for r in db.query(func.distinct(LaborEntry.employee_id)).filter(
            LaborEntry.is_completed == False, LaborEntry.end_time.is_(None)
        ).all()}

        idle_ids = worked_today_ids - active_now_ids
        if idle_ids:
            for uid in idle_ids:
                u = db.query(User).filter(User.id == uid).first()
                last = db.query(LaborEntry).filter(
                    LaborEntry.employee_id == uid, LaborEntry.end_time.isnot(None)
                ).order_by(LaborEntry.end_time.desc()).first()
                if u and last:
                    idle_mins = (now - last.end_time).total_seconds() / 60 if last.end_time else 0
                    idle_operators.append({
                        "name": f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username,
                        "last_activity": str(last.end_time) if last.end_time else None,
                        "idle_minutes": round(idle_mins),
                        "last_work_center": last.work_center or "",
                    })
            idle_operators.sort(key=lambda x: x["idle_minutes"], reverse=True)
    except Exception as e:
        print(f"Idle operators error: {e}")

    # ─── 4 & 5. KOSH INVENTORY: jobs waiting on parts + top shortages ────────
    jobs_waiting_on_parts = []
    top_shortages = []
    try:
        from routers.jobs import get_kosh_connection
        kosh_conn = get_kosh_connection()
        kosh_cur = kosh_conn.cursor()

        # Get jobs with shortages
        kosh_cur.execute("""
            WITH job_bom AS (
                SELECT j.job_number, j.order_qty, j.customer, j.description, j.status,
                       COUNT(DISTINCT b.aci_pn) as total_parts
                FROM pcb_inventory."tblJob" j
                JOIN pcb_inventory."tblBOM" b ON b.job = j.job_number
                WHERE j.status IN ('New', 'In Prep', 'In Mfg')
                GROUP BY j.job_number, j.order_qty, j.customer, j.description, j.status
                HAVING COUNT(DISTINCT b.aci_pn) > 0
            )
            SELECT job_number, order_qty, customer, description, status, total_parts
            FROM job_bom ORDER BY
                CASE WHEN status = 'In Mfg' THEN 0 WHEN status = 'In Prep' THEN 1 ELSE 2 END,
                job_number
            LIMIT 50
        """)
        kosh_jobs = kosh_cur.fetchall()

        shortage_items_map = defaultdict(lambda: {"jobs": [], "total_short": 0})

        for kj in kosh_jobs:
            job_num, order_qty_raw, customer, desc, status, total_parts = kj
            order_qty = int(order_qty_raw or 1)

            kosh_cur.execute("""
                WITH bom_items AS (
                    SELECT DISTINCT ON (b.aci_pn) b.aci_pn, b.mpn, b.qty, b."DESC"
                    FROM pcb_inventory."tblBOM" b WHERE b.job = %s
                    ORDER BY b.aci_pn, b.line
                )
                SELECT bi.aci_pn, bi."DESC",
                    CAST(COALESCE(NULLIF(bi.qty, ''), '0') AS INTEGER) as qty_per,
                    COALESCE(SUM(CASE WHEN w.loc_to != 'MFG Floor' THEN w.onhandqty ELSE 0 END), 0) as on_hand
                FROM bom_items bi
                LEFT JOIN pcb_inventory."tblWhse_Inventory" w ON bi.aci_pn = w.item OR bi.mpn = w.mpn
                GROUP BY bi.aci_pn, bi."DESC", bi.qty
            """, (job_num,))
            parts = kosh_cur.fetchall()
            short_count = 0
            for p in parts:
                req = int(p[2] or 0) * order_qty
                oh = int(p[3] or 0)
                if oh < req:
                    short_count += 1
                    shortage_items_map[p[0]]["jobs"].append(job_num)
                    shortage_items_map[p[0]]["total_short"] += (req - oh)
                    shortage_items_map[p[0]]["description"] = p[1] or ""

            if short_count > 0:
                jobs_waiting_on_parts.append({
                    "job_number": job_num,
                    "customer": customer or "",
                    "description": desc or "",
                    "status": status or "New",
                    "total_parts": total_parts,
                    "short_parts": short_count,
                    "order_qty": order_qty,
                })

        # Top 10 shortage items
        top_shortages = sorted(
            [{"aci_pn": k, "description": v["description"], "short_qty": v["total_short"],
              "affected_jobs": len(set(v["jobs"])), "jobs": list(set(v["jobs"]))[:5]}
             for k, v in shortage_items_map.items()],
            key=lambda x: x["affected_jobs"], reverse=True
        )[:10]

        kosh_conn.close()
    except Exception as e:
        print(f"KOSH insights error: {e}")

    # ─── 6. REJECTION RATE PER WORK CENTER ───────────────────────────────────
    rejection_rates = []
    try:
        steps_with_qty = db.query(
            ProcessStep.operation,
            func.sum(ProcessStep.quantity).label('total_qty'),
            func.sum(ProcessStep.rejected).label('total_rejected'),
            func.sum(ProcessStep.accepted).label('total_accepted'),
        ).filter(
            ProcessStep.quantity > 0
        ).group_by(ProcessStep.operation).all()

        for s in steps_with_qty:
            total = int(s.total_qty or 0)
            rejected = int(s.total_rejected or 0)
            if total > 0 and rejected > 0:
                rejection_rates.append({
                    "work_center": s.operation,
                    "total_qty": total,
                    "rejected": rejected,
                    "accepted": int(s.total_accepted or 0),
                    "rejection_rate": round(rejected / total * 100, 1),
                })
        rejection_rates.sort(key=lambda x: x["rejection_rate"], reverse=True)
    except Exception as e:
        print(f"Rejection rate error: {e}")

    # ─── 7. BOTTLENECK DETECTION ─────────────────────────────────────────────
    bottlenecks = []
    try:
        # Steps with most travelers waiting (not completed, not the last step)
        pending_by_op = db.query(
            ProcessStep.operation,
            func.count(ProcessStep.id).label('pending_count'),
            func.avg(LaborEntry.hours_worked).label('avg_hours')
        ).outerjoin(LaborEntry, LaborEntry.step_id == ProcessStep.id).filter(
            ProcessStep.is_completed == False
        ).group_by(ProcessStep.operation).order_by(
            func.count(ProcessStep.id).desc()
        ).limit(10).all()

        for b in pending_by_op:
            bottlenecks.append({
                "work_center": b.operation,
                "waiting_count": b.pending_count,
                "avg_hours": round(float(b.avg_hours or 0), 1),
            })
    except Exception as e:
        print(f"Bottleneck error: {e}")

    # ─── 8. DUE DATE HEATMAP ────────────────────────────────────────────────
    due_date_heatmap = {"overdue": 0, "today": 0, "this_week": 0, "next_week": 0, "later": 0, "no_date": 0}
    try:
        active_travelers = db.query(Traveler).filter(
            Traveler.status.in_([TravelerStatus.IN_PROGRESS, TravelerStatus.CREATED])
        ).all()
        for t in active_travelers:
            if not t.due_date:
                due_date_heatmap["no_date"] += 1
                continue
            try:
                due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                diff = (due - today).days
                if diff < 0:
                    due_date_heatmap["overdue"] += 1
                elif diff == 0:
                    due_date_heatmap["today"] += 1
                elif diff <= 7:
                    due_date_heatmap["this_week"] += 1
                elif diff <= 14:
                    due_date_heatmap["next_week"] += 1
                else:
                    due_date_heatmap["later"] += 1
            except Exception:
                due_date_heatmap["no_date"] += 1
    except Exception as e:
        print(f"Due date heatmap error: {e}")

    # ─── 9. OVERDUE AGING ────────────────────────────────────────────────────
    overdue_aging = []
    try:
        for t in active_travelers:
            if not t.due_date:
                continue
            try:
                due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                days_overdue = (today - due).days
                if days_overdue > 0:
                    overdue_aging.append({
                        "job_number": t.job_number,
                        "part_description": t.part_description or "",
                        "customer_name": t.customer_name or "",
                        "due_date": t.due_date,
                        "days_overdue": days_overdue,
                        "status": t.status.value if t.status else "",
                    })
            except Exception:
                pass
        overdue_aging.sort(key=lambda x: x["days_overdue"], reverse=True)
    except Exception as e:
        print(f"Overdue aging error: {e}")

    # ─── 10. THROUGHPUT TREND (travelers completed per week, last 8 weeks) ───
    throughput_trend = []
    try:
        for w in range(7, -1, -1):
            week_start = today - timedelta(days=today.weekday() + 7 * w)
            week_end = week_start + timedelta(days=6)
            completed = db.query(func.count(Traveler.id)).filter(
                Traveler.completed_at >= datetime.combine(week_start, datetime.min.time()),
                Traveler.completed_at < datetime.combine(week_end + timedelta(days=1), datetime.min.time()),
            ).scalar() or 0
            created = db.query(func.count(Traveler.id)).filter(
                Traveler.created_at >= datetime.combine(week_start, datetime.min.time()),
                Traveler.created_at < datetime.combine(week_end + timedelta(days=1), datetime.min.time()),
            ).scalar() or 0
            throughput_trend.append({
                "week": week_start.strftime("%m/%d"),
                "completed": completed,
                "created": created,
            })
    except Exception as e:
        print(f"Throughput trend error: {e}")

    # ─── 11. LABOR HOURS TREND (per day, last 14 days) ──────────────────────
    labor_hours_trend = []
    try:
        for d in range(13, -1, -1):
            day = today - timedelta(days=d)
            day_start = datetime.combine(day, datetime.min.time())
            day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())
            hours = db.query(func.sum(LaborEntry.hours_worked)).filter(
                LaborEntry.start_time >= day_start,
                LaborEntry.start_time < day_end,
                LaborEntry.hours_worked > 0,
            ).scalar() or 0
            entries = db.query(func.count(LaborEntry.id)).filter(
                LaborEntry.start_time >= day_start,
                LaborEntry.start_time < day_end,
            ).scalar() or 0
            labor_hours_trend.append({
                "date": day.strftime("%m/%d"),
                "day": day.strftime("%a"),
                "hours": round(float(hours), 1),
                "entries": entries,
            })
    except Exception as e:
        print(f"Labor hours trend error: {e}")

    # ─── 12. CYCLE TIME TREND (avg days creation→completion, last 8 weeks) ──
    cycle_time_trend = []
    try:
        for w in range(7, -1, -1):
            week_start = today - timedelta(days=today.weekday() + 7 * w)
            week_end = week_start + timedelta(days=6)
            completed = db.query(Traveler).filter(
                Traveler.completed_at >= datetime.combine(week_start, datetime.min.time()),
                Traveler.completed_at < datetime.combine(week_end + timedelta(days=1), datetime.min.time()),
                Traveler.completed_at.isnot(None),
            ).all()
            if completed:
                cycle_days = []
                for t in completed:
                    if t.created_at and t.completed_at:
                        diff = (t.completed_at - t.created_at).total_seconds() / 86400
                        cycle_days.append(diff)
                avg_days = round(sum(cycle_days) / len(cycle_days), 1) if cycle_days else 0
            else:
                avg_days = 0
            cycle_time_trend.append({
                "week": week_start.strftime("%m/%d"),
                "avg_days": avg_days,
                "count": len(completed),
            })
    except Exception as e:
        print(f"Cycle time trend error: {e}")

    return {
        "operator_efficiency": operator_efficiency,
        "busiest_work_centers": busiest_wc,
        "idle_operators": idle_operators,
        "jobs_waiting_on_parts": jobs_waiting_on_parts,
        "top_shortages": top_shortages,
        "rejection_rates": rejection_rates,
        "bottlenecks": bottlenecks,
        "due_date_heatmap": due_date_heatmap,
        "overdue_aging": overdue_aging,
        "throughput_trend": throughput_trend,
        "labor_hours_trend": labor_hours_trend,
        "cycle_time_trend": cycle_time_trend,
    }
