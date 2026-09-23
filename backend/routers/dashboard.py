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
from utils.job_display import format_job_display, kosh_job_candidates
from utils.work_center_lookup import build_department_resolver
from utils.kosh_inventory import inventory_readiness, shortage_lines, required_qty
import time as _time
from collections import OrderedDict, defaultdict

router = APIRouter()

# Short in-process response cache for the expensive dashboard endpoints. These
# return global (non-user-specific) data and are polled every ~30s by every
# open dashboard, so caching means one computation serves all users/polls in
# the window instead of each request recomputing (and blocking the worker).
_stats_cache: dict = {}
_STATS_TTL = 30  # seconds


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

    # Normalised range, used as the response cache key.
    start_date_str = start_dt.strftime("%Y-%m-%d")
    end_date_str = end_dt.strftime("%Y-%m-%d")

    # Serve a recent cached result if available (global data, polled frequently).
    _cache_key = (start_date_str, end_date_str)
    _cached = _stats_cache.get(_cache_key)
    if _cached and _time.time() - _cached[0] < _STATS_TTL:
        return _cached[1]

    # The traveler metrics below are keyed off real timestamps (created_at /
    # completed_at), not the free-text due_date/ship_date strings.
    #
    # The previous filter matched travelers whose due_date or ship_date fell in
    # the range, OR whose dates were both NULL. Two things went wrong with it:
    # 25 travelers store '' rather than NULL, so `due_date IS NOT NULL` was true
    # while `'' >= '2026-09-16'` was false and the NULL fallback did not catch
    # them either — they could not appear in ANY date range. And on the default
    # 7-day view the filter matched 9 of 323 travelers, while the Labor Hours
    # tile beside it covered every entry in the window, so the two halves of the
    # same header described different populations.
    #
    # Status Distribution is current state, like the On Hold tile next to it,
    # and the tiles link straight to /travelers?status=... — so it is not date
    # windowed at all. Created/completed counts use their own timestamps.
    status_counts = db.query(
        Traveler.status,
        func.count(Traveler.id).label('count')
    ).filter(
        Traveler.is_active == True
    ).group_by(Traveler.status).all()

    status_distribution = {str(status.value): count for status, count in status_counts}

    # Labor Analytics
    #
    # Keyed on start_time, matching the trends further down. These used to key
    # on created_at while the charts keyed on start_time, so the KPI tile and
    # the chart under it disagreed whenever an entry was back-dated or spanned
    # midnight (32 entries have start_time and created_at on different days).
    labor_entries = db.query(
        func.coalesce(func.sum(LaborEntry.hours_worked), 0).label('total_hours')
    ).filter(
        LaborEntry.start_time >= start_dt,
        LaborEntry.start_time <= end_dt,
        LaborEntry.hours_worked > 0,
        LaborEntry.end_time.isnot(None)
    ).first()

    total_labor_hours = float(labor_entries.total_hours) if labor_entries else 0.0

    # Labor by work center
    labor_by_wc = db.query(
        LaborEntry.work_center,
        func.sum(LaborEntry.hours_worked).label('hours')
    ).filter(
        LaborEntry.start_time >= start_dt,
        LaborEntry.start_time <= end_dt,
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

        # Get job-level detail: date + work center + job_number.
        # Group on traveler_type + rma_number too, NOT job_number alone: an RMA
        # traveler shares its job_number with the original job, so grouping by
        # job_number would sum RMA rework hours into the original job's actuals
        # and emit them as one row. Keeping them apart is the whole point.
        labor_trend_jobs = db.query(
            func.date(LaborEntry.start_time).label('date'),
            LaborEntry.work_center,
            Traveler.job_number,
            Traveler.traveler_type,
            Traveler.rma_number,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).join(Traveler, LaborEntry.traveler_id == Traveler.id).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(
            func.date(LaborEntry.start_time), LaborEntry.work_center,
            Traveler.job_number, Traveler.traveler_type, Traveler.rma_number
        ).order_by(func.date(LaborEntry.start_time)).all()

        date_map = OrderedDict()
        for date, wc, hours in labor_trend_data:
            date_str = date.strftime("%b %d") if date else ""
            wc_name = wc or "Unknown"
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str, "_details": {}}
            date_map[date_str][wc_name] = round(float(hours), 2)

        # Attach job details
        for date, wc, job_num, ttype, rma_num, hours in labor_trend_jobs:
            date_str = date.strftime("%b %d") if date else ""
            wc_name = wc or "Unknown"
            if date_str in date_map:
                details = date_map[date_str]["_details"]
                if wc_name not in details:
                    details[wc_name] = []
                job_label = format_job_display(ttype, rma_num, job_num)
                details[wc_name].append({"job": job_label or "N/A", "hours": round(float(hours), 2)})

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

        # Same RMA-vs-original split as the daily branch above.
        labor_trend_jobs = db.query(
            func.date_trunc('week', LaborEntry.start_time).label('week'),
            LaborEntry.work_center,
            Traveler.job_number,
            Traveler.traveler_type,
            Traveler.rma_number,
            func.sum(LaborEntry.hours_worked).label('hours')
        ).join(Traveler, LaborEntry.traveler_id == Traveler.id).filter(
            LaborEntry.start_time >= start_dt,
            LaborEntry.start_time <= end_dt,
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None)
        ).group_by(
            func.date_trunc('week', LaborEntry.start_time), LaborEntry.work_center,
            Traveler.job_number, Traveler.traveler_type, Traveler.rma_number
        ).order_by(func.date_trunc('week', LaborEntry.start_time)).all()

        date_map = OrderedDict()
        for week, wc, hours in labor_trend_data:
            date_str = week.strftime("%b %d") if week else ""
            wc_name = wc or "Unknown"
            if date_str not in date_map:
                date_map[date_str] = {"date": date_str, "_details": {}}
            date_map[date_str][wc_name] = round(float(hours), 2)

        for week, wc, job_num, ttype, rma_num, hours in labor_trend_jobs:
            date_str = week.strftime("%b %d") if week else ""
            wc_name = wc or "Unknown"
            if date_str in date_map:
                details = date_map[date_str]["_details"]
                if wc_name not in details:
                    details[wc_name] = []
                job_label = format_job_display(ttype, rma_num, job_num)
                details[wc_name].append({"job": job_label or "N/A", "hours": round(float(hours), 2)})

        labor_trend = list(date_map.values())

    # Production Metrics — actually within the selected window.
    travelers_created = db.query(func.count(Traveler.id)).filter(
        Traveler.created_at >= start_dt,
        Traveler.created_at <= end_dt,
    ).scalar() or 0

    travelers_completed = db.query(func.count(Traveler.id)).filter(
        Traveler.completed_at >= start_dt,
        Traveler.completed_at <= end_dt,
        Traveler.status == TravelerStatus.COMPLETED,
    ).scalar() or 0

    completion_rate = (travelers_completed / travelers_created * 100) if travelers_created > 0 else 0.0

    # Average completion time
    completed_travelers = db.query(
        func.avg(
            func.extract('epoch', Traveler.completed_at - Traveler.created_at) / 3600
        ).label('avg_hours')
    ).filter(
        Traveler.completed_at >= start_dt,
        Traveler.completed_at <= end_dt,
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
        LaborEntry.start_time >= start_dt,
        LaborEntry.start_time <= end_dt,
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

    # Department trend: labor hours grouped by date + department.
    #
    # Deliberately NOT joined to work_centers in SQL. That table holds one row
    # per (name, traveler_type) — 231 active rows for 106 names — so joining on
    # name multiplied every labor row and sum(hours_worked) came out ~2.8x too
    # high (4,251h reported against an actual 1,523h over 30 days). Hours are
    # aggregated on labor_entries alone, then attributed to a department in
    # Python via the unique work-centre code. See utils.work_center_lookup.
    dept_resolver = build_department_resolver(db)

    _bucket = (
        func.date(LaborEntry.start_time) if days_diff <= 31
        else func.date_trunc('week', LaborEntry.start_time)
    )
    dept_trend_data = db.query(
        _bucket.label('date'),
        LaborEntry.step_id,
        LaborEntry.work_center,
        func.sum(LaborEntry.hours_worked).label('hours')
    ).filter(
        LaborEntry.start_time >= start_dt,
        LaborEntry.start_time <= end_dt,
        LaborEntry.hours_worked > 0,
        LaborEntry.end_time.isnot(None)
    ).group_by(_bucket, LaborEntry.step_id, LaborEntry.work_center).order_by(_bucket).all()

    dept_date_map = OrderedDict()
    for date_val, step_id, wc_name, hours in dept_trend_data:
        date_str = date_val.strftime("%b %d") if date_val else ""
        dept_name = dept_resolver.for_entry(step_id, wc_name)
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

        # Latest activity per traveler, in two grouped queries rather than two
        # per traveler.
        last_labor_by_traveler = dict(
            db.query(LaborEntry.traveler_id, func.max(LaborEntry.start_time))
            .group_by(LaborEntry.traveler_id).all()
        )
        last_scan_by_traveler = dict(
            db.query(TravelerTrackingLog.traveler_id, func.max(TravelerTrackingLog.scanned_at))
            .group_by(TravelerTrackingLog.traveler_id).all()
        )
        # Most recent WORK_CENTER scan per traveler, likewise.
        last_wc_by_traveler = {}
        for wc_traveler_id, wc_value in db.query(
            TravelerTrackingLog.traveler_id, TravelerTrackingLog.work_center
        ).filter(
            TravelerTrackingLog.scan_type == "WORK_CENTER"
        ).order_by(TravelerTrackingLog.scanned_at.asc()).all():
            last_wc_by_traveler[wc_traveler_id] = wc_value

        for t in in_progress:
            # Find latest activity: most recent labor entry or tracking scan
            latest_labor = last_labor_by_traveler.get(t.id)
            latest_scan = last_scan_by_traveler.get(t.id)

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
                # Current work center from the latest scan (pre-fetched above)
                wc_name = last_wc_by_traveler.get(t.id)
                dept = dept_resolver.for_name(wc_name) if wc_name else None

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
    # One shared KOSH connection, used for two batched queries covering every
    # job (see utils.kosh_inventory) rather than per-traveler round trips.
    kosh_conn = None
    try:
        from routers.jobs import get_kosh_connection
        kosh_conn = get_kosh_connection()
    except Exception:
        kosh_conn = None

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

        # Two KOSH queries for every job, instead of up to four per traveler.
        kosh_readiness = inventory_readiness(
            kosh_conn, [t.job_number for t in forecast_travelers]
        )

        # Everything the loop needs, pre-fetched in four grouped queries rather
        # than four per traveler (1,056 round trips across 264 open jobs).
        forecast_ids = [t.id for t in forecast_travelers]

        steps_by_traveler = defaultdict(list)
        for step in db.query(ProcessStep).filter(
            ProcessStep.traveler_id.in_(forecast_ids)
        ).order_by(ProcessStep.step_number).all() if forecast_ids else []:
            steps_by_traveler[step.traveler_id].append(step)

        step_labor_by_traveler = defaultdict(dict)
        step_operators_by_traveler = defaultdict(dict)
        for tid, step_id, hours, operators in db.query(
            LaborEntry.traveler_id,
            LaborEntry.step_id,
            func.sum(LaborEntry.hours_worked),
            func.count(func.distinct(LaborEntry.employee_id)),
        ).filter(
            LaborEntry.traveler_id.in_(forecast_ids),
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None),
        ).group_by(LaborEntry.traveler_id, LaborEntry.step_id).all() if forecast_ids else []:
            if step_id:
                step_labor_by_traveler[tid][step_id] = float(hours)
                step_operators_by_traveler[tid][step_id] = int(operators or 0)

        operators_by_traveler = dict(
            db.query(
                LaborEntry.traveler_id,
                func.count(func.distinct(LaborEntry.employee_id)),
            ).filter(
                LaborEntry.traveler_id.in_(forecast_ids),
                LaborEntry.hours_worked > 0,
            ).group_by(LaborEntry.traveler_id).all()
        ) if forecast_ids else {}

        active_operators_by_traveler = dict(
            db.query(
                LaborEntry.traveler_id,
                func.count(func.distinct(LaborEntry.employee_id)),
            ).filter(
                LaborEntry.traveler_id.in_(forecast_ids),
                LaborEntry.is_completed == False,
                LaborEntry.end_time.is_(None),
            ).group_by(LaborEntry.traveler_id).all()
        ) if forecast_ids else {}

        for t in forecast_travelers:
            steps = steps_by_traveler.get(t.id, [])

            # Actual hours + actual distinct operators per step (from labor entries)
            step_labor = step_labor_by_traveler.get(t.id, {})
            step_operators = step_operators_by_traveler.get(t.id, {})

            total_actual = sum(step_labor.values())

            # Distinct operators who have logged labor on this traveler (any step)
            total_operators_actual = operators_by_traveler.get(t.id, 0) or 0

            # Operators currently active on this traveler (open labor entries)
            active_operators_now = active_operators_by_traveler.get(t.id, 0) or 0

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
                operators_estimated = est["operators"]
                buffer = round(est_hours * BUFFER_PERCENT, 2)
                buffered_hours = est_hours + buffer
                actual = step_labor.get(step.id, 0)
                operators_actual = step_operators.get(step.id, 0)

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
                    "operators_needed": operators_estimated,
                    "operators_actual": operators_actual,
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

            # ── KOSH inventory check for this job (batched up front) ──
            readiness = kosh_readiness.get(t.job_number)
            inventory_ready = readiness["inventory_ready"] if readiness else None
            total_bom_lines = readiness["total_bom_lines"] if readiness else 0
            lines_with_stock = readiness["lines_with_stock"] if readiness else 0
            shortage_lines = readiness["shortage_lines"] if readiness else 0
            kosh_job_status = readiness["kosh_job_status"] if readiness else None

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
                "actual_operators": int(total_operators_actual),
                "active_operators": int(active_operators_now),
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
    finally:
        if kosh_conn is not None:
            try:
                kosh_conn.close()
            except Exception:
                pass

    # Real-time Operations
    active_labor_entries = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.is_completed == False,
        LaborEntry.end_time.is_(None),
    ).scalar() or 0

    _result = DashboardStats(
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
    _stats_cache[_cache_key] = (_time.time(), _result)
    return _result


@router.get("/insights")
async def get_dashboard_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All-in-one insights endpoint for dashboard cards. Returns operator efficiency,
    busiest work centers, idle operators, KOSH inventory insights, rejection rates,
    bottlenecks, due date heatmap, overdue aging, throughput/labor/cycle trends."""
    import math

    _cached = _stats_cache.get("__insights__")
    if _cached and _time.time() - _cached[0] < _STATS_TTL:
        return _cached[1]

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
            LaborEntry.start_time >= now - timedelta(days=30)
        ).group_by(User.id).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(15).all()

        OPERATION_ESTIMATES = {
            "KITTING": 1.5, "FEEDER LOAD": 1.0, "SMT SET UP": 1.5, "SMT TOP": 3.0,
            "SMT BOTTOM": 3.0, "WASH": 0.75, "AOI": 1.5, "HAND SOLDER": 3.0,
            "HAND ASSEMBLY": 2.5, "INSPECTION": 1.5, "INTERNAL TESTING": 2.0,
            "LABELING": 0.5, "SHIPPING": 0.5, "DEPANEL": 1.0, "TRIM": 1.0,
            "WAVE": 1.5, "MANUAL INSERTION": 2.0, "COMPONENT PREP": 1.5,
        }

        for emp in employees:
            # DISTINCT step: the estimate is per step worked, not per timer
            # session. Without it a step clocked in five sittings counted its
            # estimate five times — entries average 1.93 per step and run as
            # high as 38, so efficiency read ~193% where it should read ~100%.
            worked_steps = db.query(
                ProcessStep.id, ProcessStep.operation
            ).join(
                LaborEntry, LaborEntry.step_id == ProcessStep.id
            ).filter(
                LaborEntry.employee_id == emp.id,
                LaborEntry.end_time.isnot(None),
                LaborEntry.start_time >= now - timedelta(days=30)
            ).distinct().all()
            est_hours = sum(
                next((v for k, v in OPERATION_ESTIMATES.items() if k in (op or '').upper()), 1.0)
                for _step_id, op in worked_steps
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
                FROM warehouse."tblJob" j
                JOIN warehouse."tblBOM" b ON b.job = j.job_number
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

        # One query for every job's BOM instead of one per job (each of which
        # was a 16s-class nested loop). See utils.kosh_inventory.
        order_qty_by_job = {kj[0]: int(kj[1] or 1) for kj in kosh_jobs}
        lines_by_job = shortage_lines(kosh_conn, list(order_qty_by_job))

        for kj in kosh_jobs:
            job_num, order_qty_raw, customer, desc, status, total_parts = kj
            order_qty = order_qty_by_job[job_num]

            short_count = 0
            for aci_pn, part_desc, qty_per_board, on_hand in lines_by_job.get(job_num, []):
                req = required_qty(qty_per_board, order_qty)
                oh = int(on_hand or 0)
                if oh < req:
                    short_count += 1
                    shortage_items_map[aci_pn]["jobs"].append(job_num)
                    shortage_items_map[aci_pn]["total_short"] += (req - oh)
                    shortage_items_map[aci_pn]["description"] = part_desc or ""

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
        # count(DISTINCT ...) because the outer join to labor_entries repeats a
        # step once per timer session on it, and only live travelers count —
        # 98 incomplete steps sit on COMPLETED/ARCHIVED travelers and were being
        # reported as work queued on the floor.
        pending_by_op = db.query(
            ProcessStep.operation,
            func.count(func.distinct(ProcessStep.id)).label('pending_count'),
            func.avg(LaborEntry.hours_worked).label('avg_hours')
        ).join(
            Traveler, Traveler.id == ProcessStep.traveler_id
        ).outerjoin(LaborEntry, LaborEntry.step_id == ProcessStep.id).filter(
            ProcessStep.is_completed == False,
            Traveler.is_active == True,
            Traveler.status.in_([
                TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS, TravelerStatus.ON_HOLD
            ]),
        ).group_by(ProcessStep.operation).order_by(
            func.count(func.distinct(ProcessStep.id)).desc()
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
    active_travelers = []
    try:
        active_travelers = db.query(Traveler).filter(
            Traveler.is_active == True,
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

    _result = {
        "operator_efficiency": operator_efficiency,
        "busiest_work_centers": busiest_wc,
        "jobs_waiting_on_parts": jobs_waiting_on_parts,
        "top_shortages": top_shortages,
        "rejection_rates": rejection_rates,
        "bottlenecks": bottlenecks,
        "due_date_heatmap": due_date_heatmap,
        "overdue_aging": overdue_aging,
        "throughput_trend": throughput_trend,
        "labor_hours_trend": labor_hours_trend,
    }
    _stats_cache["__insights__"] = (_time.time(), _result)
    return _result
