from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_, extract, text
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import OrderedDict, defaultdict

from database import get_db
from models import (
    User, Traveler, LaborEntry, WorkCenter, ProcessStep,
    TravelerStatus, TravelerTrackingLog, PauseLog, UserRole
)
from routers.auth import get_current_user

router = APIRouter()

# Operation time estimates (hours) for est vs actual
OPERATION_ESTIMATES = {
    "KITTING": 1.5, "FEEDER LOAD": 1.0, "SMT SET UP": 1.5,
    "SMT TOP": 3.0, "SMT BOTTOM": 3.0, "SMT BOT": 3.0,
    "REFLOW": 1.5, "WASH": 0.75, "AOI": 1.5, "XRAY": 1.0,
    "HAND SOLDER": 3.0, "HAND ASSEMBLY": 2.5, "TOUCH UP": 1.5,
    "INSPECTION": 1.5, "INTERNAL TESTING": 2.0, "TESTING": 2.0,
    "INTERNAL COATING": 1.5, "CONFORMAL COAT": 1.5,
    "LABELING": 0.5, "PACKAGING": 0.5, "SHIPPING": 0.5,
    "QC": 1.5, "PROGRAMMING": 1.0, "DEPANEL": 1.0,
    "STENCIL": 0.75, "PASTE": 0.75, "ENGINEERING": 1.0,
    "VERIFY BOM": 0.5, "INVENTORY": 0.5, "PURCHASING": 1.0,
}


def estimate_hours(operation: str) -> float:
    if not operation:
        return 1.0
    op = operation.upper().strip()
    if op in OPERATION_ESTIMATES:
        return OPERATION_ESTIMATES[op]
    for key, val in OPERATION_ESTIMATES.items():
        if key in op or op in key:
            return val
    return 1.0


@router.get("/all")
async def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All analytics data in one call: anomalies, due date heatmap, est vs actual,
    yield, daily summary, bottlenecks, operator scorecards."""

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ========== 1. LABOR ANOMALY DETECTION ==========
    anomalies = []

    # 1a. Forgotten clock-outs: active entries running > 12 hours
    long_running = db.query(LaborEntry).filter(
        LaborEntry.end_time.is_(None),
        LaborEntry.is_completed == False,
        LaborEntry.start_time < now - timedelta(hours=12)
    ).all()

    for entry in long_running:
        hours_running = (now - entry.start_time.replace(tzinfo=timezone.utc) if entry.start_time.tzinfo is None else now - entry.start_time).total_seconds() / 3600
        traveler = db.query(Traveler).filter(Traveler.id == entry.traveler_id).first()
        employee = db.query(User).filter(User.id == entry.employee_id).first()
        anomalies.append({
            "type": "forgotten_clockout",
            "severity": "high" if hours_running > 24 else "medium",
            "entry_id": entry.id,
            "job_number": traveler.job_number if traveler else "Unknown",
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "work_center": entry.work_center or "Unknown",
            "hours_running": round(hours_running, 1),
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "message": f"Running for {round(hours_running, 1)}h without clock-out"
        })

    # 1b. Unusually short entries (< 2 min, completed)
    short_entries = db.query(LaborEntry).filter(
        LaborEntry.end_time.isnot(None),
        LaborEntry.hours_worked < 0.034,  # ~2 min
        LaborEntry.hours_worked > 0,
        LaborEntry.created_at > now - timedelta(days=7)
    ).limit(20).all()

    for entry in short_entries:
        traveler = db.query(Traveler).filter(Traveler.id == entry.traveler_id).first()
        employee = db.query(User).filter(User.id == entry.employee_id).first()
        mins = round(entry.hours_worked * 60, 1)
        anomalies.append({
            "type": "suspiciously_short",
            "severity": "low",
            "entry_id": entry.id,
            "job_number": traveler.job_number if traveler else "Unknown",
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "work_center": entry.work_center or "Unknown",
            "hours_running": round(entry.hours_worked, 3),
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "message": f"Only {mins} minutes logged"
        })

    # 1c. Unusually long completed entries (> 10 hours)
    long_entries = db.query(LaborEntry).filter(
        LaborEntry.end_time.isnot(None),
        LaborEntry.hours_worked > 10,
        LaborEntry.created_at > now - timedelta(days=7)
    ).limit(20).all()

    for entry in long_entries:
        traveler = db.query(Traveler).filter(Traveler.id == entry.traveler_id).first()
        employee = db.query(User).filter(User.id == entry.employee_id).first()
        anomalies.append({
            "type": "unusually_long",
            "severity": "medium",
            "entry_id": entry.id,
            "job_number": traveler.job_number if traveler else "Unknown",
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "work_center": entry.work_center or "Unknown",
            "hours_running": round(entry.hours_worked, 1),
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "message": f"{round(entry.hours_worked, 1)}h logged in single entry"
        })

    # Sort: high severity first
    severity_order = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda x: severity_order.get(x["severity"], 3))

    # ========== 2. DUE DATE HEATMAP ==========
    due_date_data = []
    active_travelers = db.query(Traveler).filter(
        Traveler.is_active == True,
        Traveler.status.in_([TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS, TravelerStatus.ON_HOLD]),
        Traveler.due_date.isnot(None)
    ).all()

    for t in active_travelers:
        try:
            due = datetime.strptime(t.due_date, "%Y-%m-%d")
            days_until = (due.date() - now.date()).days
        except Exception:
            continue

        # Get progress
        total_steps = db.query(func.count(ProcessStep.id)).filter(ProcessStep.traveler_id == t.id).scalar() or 0
        completed_steps = db.query(func.count(ProcessStep.id)).filter(ProcessStep.traveler_id == t.id, ProcessStep.is_completed == True).scalar() or 0
        pct = round(completed_steps / total_steps * 100) if total_steps > 0 else 0

        if days_until < 0:
            urgency = "overdue"
        elif days_until == 0:
            urgency = "due_today"
        elif days_until <= 2:
            urgency = "critical"
        elif days_until <= 5:
            urgency = "warning"
        elif days_until <= 10:
            urgency = "upcoming"
        else:
            urgency = "on_track"

        due_date_data.append({
            "id": t.id,
            "job_number": t.job_number,
            "part_number": t.part_number,
            "due_date": t.due_date,
            "days_until": days_until,
            "urgency": urgency,
            "status": t.status.value,
            "priority": t.priority.value if t.priority else "NORMAL",
            "percent_complete": pct,
            "total_steps": total_steps,
            "completed_steps": completed_steps,
        })

    due_date_data.sort(key=lambda x: x["days_until"])

    # ========== 3. EST VS ACTUAL TIME ==========
    est_vs_actual = []
    travelers_with_labor = db.query(Traveler).filter(
        Traveler.is_active == True,
        Traveler.status.in_([TravelerStatus.IN_PROGRESS, TravelerStatus.COMPLETED])
    ).all()

    for t in travelers_with_labor:
        steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == t.id).all()
        if not steps:
            continue

        # Actual hours
        actual_total = db.query(func.coalesce(func.sum(LaborEntry.hours_worked), 0)).filter(
            LaborEntry.traveler_id == t.id,
            LaborEntry.end_time.isnot(None),
            LaborEntry.hours_worked > 0
        ).scalar() or 0

        if actual_total == 0 and t.status != TravelerStatus.COMPLETED:
            continue  # Skip travelers with no labor logged yet

        # Estimated hours
        est_total = 0
        step_details = []
        for s in steps:
            est_h = estimate_hours(s.operation)
            est_total += est_h
            # Actual for this step
            step_actual = db.query(func.coalesce(func.sum(LaborEntry.hours_worked), 0)).filter(
                LaborEntry.step_id == s.id,
                LaborEntry.end_time.isnot(None),
                LaborEntry.hours_worked > 0
            ).scalar() or 0

            if step_actual > 0 or s.is_completed:
                variance = round(float(step_actual) - est_h, 2)
                step_details.append({
                    "operation": s.operation,
                    "estimated": round(est_h, 1),
                    "actual": round(float(step_actual), 1),
                    "variance": variance,
                    "is_completed": s.is_completed or False,
                })

        variance_total = round(float(actual_total) - est_total, 2)
        variance_pct = round(variance_total / est_total * 100, 1) if est_total > 0 else 0

        est_vs_actual.append({
            "id": t.id,
            "job_number": t.job_number,
            "part_number": t.part_number,
            "status": t.status.value,
            "estimated_hours": round(est_total, 1),
            "actual_hours": round(float(actual_total), 1),
            "variance_hours": variance_total,
            "variance_percent": variance_pct,
            "steps": step_details,
        })

    # Sort by biggest overrun first
    est_vs_actual.sort(key=lambda x: x["variance_hours"], reverse=True)
    est_vs_actual = est_vs_actual[:30]

    # ========== 4. YIELD DASHBOARD ==========
    yield_data = []
    # Get travelers with accepted/rejected quantities
    travelers_yield = db.query(Traveler).filter(
        Traveler.is_active == True
    ).all()

    department_yield = defaultdict(lambda: {"accepted": 0, "rejected": 0, "total_qty": 0, "travelers": 0})

    for t in travelers_yield:
        steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == t.id).all()
        total_accepted = sum(s.accepted or 0 for s in steps)
        total_rejected = sum(s.rejected or 0 for s in steps)

        if total_accepted == 0 and total_rejected == 0:
            continue

        yield_rate = round(total_accepted / (total_accepted + total_rejected) * 100, 1) if (total_accepted + total_rejected) > 0 else 0

        yield_data.append({
            "id": t.id,
            "job_number": t.job_number,
            "part_number": t.part_number,
            "quantity": t.quantity,
            "accepted": total_accepted,
            "rejected": total_rejected,
            "yield_rate": yield_rate,
            "status": t.status.value,
        })

        # Aggregate by department from step work centers
        for s in steps:
            if (s.accepted or 0) + (s.rejected or 0) > 0:
                wc = db.query(WorkCenter).filter(WorkCenter.code == s.work_center_code).first()
                dept = wc.department if wc else "Unknown"
                department_yield[dept]["accepted"] += s.accepted or 0
                department_yield[dept]["rejected"] += s.rejected or 0
                department_yield[dept]["total_qty"] += t.quantity
                department_yield[dept]["travelers"] += 1

    dept_yield_list = []
    for dept, data in department_yield.items():
        total = data["accepted"] + data["rejected"]
        dept_yield_list.append({
            "department": dept,
            "accepted": data["accepted"],
            "rejected": data["rejected"],
            "yield_rate": round(data["accepted"] / total * 100, 1) if total > 0 else 0,
        })
    dept_yield_list.sort(key=lambda x: x["yield_rate"])

    yield_data.sort(key=lambda x: x["yield_rate"])
    yield_data = yield_data[:30]

    # ========== 5. DAILY SUMMARY REPORT ==========
    # Today's summary
    today_start = today
    today_end = today + timedelta(days=1)

    # Entries started today
    entries_started_today = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.start_time >= today_start,
        LaborEntry.start_time < today_end
    ).scalar() or 0

    # Entries completed today
    entries_completed_today = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.end_time >= today_start,
        LaborEntry.end_time < today_end
    ).scalar() or 0

    # Hours logged today
    hours_today = db.query(func.coalesce(func.sum(LaborEntry.hours_worked), 0)).filter(
        LaborEntry.end_time >= today_start,
        LaborEntry.end_time < today_end,
        LaborEntry.hours_worked > 0
    ).scalar() or 0

    # Steps completed today
    steps_completed_today = db.query(func.count(ProcessStep.id)).filter(
        ProcessStep.completed_at >= today_start,
        ProcessStep.completed_at < today_end,
        ProcessStep.is_completed == True
    ).scalar() or 0

    # Travelers completed today
    travelers_completed_today = db.query(func.count(Traveler.id)).filter(
        Traveler.completed_at >= today_start,
        Traveler.completed_at < today_end
    ).scalar() or 0

    # Active timers right now
    active_timers = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.end_time.is_(None),
        LaborEntry.is_completed == False
    ).scalar() or 0

    # Paused timers
    paused_timers = db.query(func.count(LaborEntry.id)).filter(
        LaborEntry.end_time.is_(None),
        LaborEntry.is_completed == False,
        LaborEntry.pause_time.isnot(None)
    ).scalar() or 0

    # Unique operators today
    unique_operators = db.query(func.count(func.distinct(LaborEntry.employee_id))).filter(
        LaborEntry.start_time >= today_start,
        LaborEntry.start_time < today_end
    ).scalar() or 0

    # Hours by work center today
    wc_hours_today = db.query(
        LaborEntry.work_center,
        func.sum(LaborEntry.hours_worked).label("hours"),
        func.count(LaborEntry.id).label("entries")
    ).filter(
        LaborEntry.end_time >= today_start,
        LaborEntry.end_time < today_end,
        LaborEntry.hours_worked > 0
    ).group_by(LaborEntry.work_center).order_by(func.sum(LaborEntry.hours_worked).desc()).all()

    wc_summary = [{"work_center": wc or "Unknown", "hours": round(float(h), 2), "entries": e} for wc, h, e in wc_hours_today]

    # Top operators today
    top_ops_today = db.query(
        User.first_name, User.last_name,
        func.sum(LaborEntry.hours_worked).label("hours"),
        func.count(LaborEntry.id).label("entries")
    ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
        LaborEntry.end_time >= today_start,
        LaborEntry.end_time < today_end,
        LaborEntry.hours_worked > 0
    ).group_by(User.id, User.first_name, User.last_name).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(10).all()

    top_operators_today = [
        {"name": f"{fn} {ln}".strip(), "hours": round(float(h), 2), "entries": e}
        for fn, ln, h, e in top_ops_today
    ]

    daily_summary = {
        "date": today.strftime("%Y-%m-%d"),
        "entries_started": entries_started_today,
        "entries_completed": entries_completed_today,
        "hours_logged": round(float(hours_today), 2),
        "steps_completed": steps_completed_today,
        "travelers_completed": travelers_completed_today,
        "active_timers": active_timers,
        "paused_timers": paused_timers,
        "unique_operators": unique_operators,
        "work_center_breakdown": wc_summary,
        "top_operators": top_operators_today,
    }

    # ========== 6. BOTTLENECK DETECTION ==========
    bottlenecks = []

    # Average time per work center (from completed entries in last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    wc_stats = db.query(
        LaborEntry.work_center,
        func.avg(LaborEntry.hours_worked).label("avg_hours"),
        func.count(LaborEntry.id).label("entry_count"),
        func.sum(LaborEntry.hours_worked).label("total_hours"),
        func.max(LaborEntry.hours_worked).label("max_hours"),
    ).filter(
        LaborEntry.end_time.isnot(None),
        LaborEntry.hours_worked > 0,
        LaborEntry.created_at > thirty_days_ago,
        LaborEntry.work_center.isnot(None)
    ).group_by(LaborEntry.work_center).having(func.count(LaborEntry.id) >= 2).all()

    # Find work centers with queue (multiple active entries or high avg time)
    for wc, avg_h, count, total_h, max_h in wc_stats:
        # Count currently active entries at this WC
        active_at_wc = db.query(func.count(LaborEntry.id)).filter(
            LaborEntry.work_center == wc,
            LaborEntry.end_time.is_(None),
            LaborEntry.is_completed == False
        ).scalar() or 0

        # Count travelers currently at this WC (waiting)
        waiting = db.query(func.count(Traveler.id)).join(
            TravelerTrackingLog, TravelerTrackingLog.traveler_id == Traveler.id
        ).filter(
            Traveler.status == TravelerStatus.IN_PROGRESS,
            TravelerTrackingLog.work_center == wc
        ).scalar() or 0

        # Score bottleneck severity (higher = worse)
        score = (float(avg_h) * 2) + (active_at_wc * 3) + (float(max_h) * 0.5)

        bottlenecks.append({
            "work_center": wc,
            "avg_hours": round(float(avg_h), 2),
            "max_hours": round(float(max_h), 2),
            "total_hours": round(float(total_h), 2),
            "entry_count": count,
            "active_now": active_at_wc,
            "waiting_travelers": waiting,
            "bottleneck_score": round(score, 1),
        })

    bottlenecks.sort(key=lambda x: x["bottleneck_score"], reverse=True)
    bottlenecks = bottlenecks[:15]

    # ========== 7. OPERATOR SCORECARD ==========
    scorecards = []

    operator_stats = db.query(
        User.id, User.first_name, User.last_name, User.username,
        func.count(LaborEntry.id).label("total_entries"),
        func.sum(LaborEntry.hours_worked).label("total_hours"),
        func.avg(LaborEntry.hours_worked).label("avg_hours_per_entry"),
        func.count(case((LaborEntry.end_time.isnot(None), 1))).label("completed_entries"),
    ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
        LaborEntry.created_at > thirty_days_ago,
        LaborEntry.hours_worked > 0
    ).group_by(User.id, User.first_name, User.last_name, User.username).all()

    for uid, fn, ln, username, total_entries, total_hours, avg_hours, completed_entries in operator_stats:
        # Pause stats
        pause_stats = db.query(
            func.count(PauseLog.id).label("total_pauses"),
            func.coalesce(func.sum(PauseLog.duration_seconds), 0).label("total_pause_seconds")
        ).join(LaborEntry, PauseLog.labor_entry_id == LaborEntry.id).filter(
            LaborEntry.employee_id == uid,
            LaborEntry.created_at > thirty_days_ago
        ).first()

        total_pauses = pause_stats.total_pauses if pause_stats else 0
        total_pause_secs = float(pause_stats.total_pause_seconds) if pause_stats else 0
        pause_pct = round(total_pause_secs / (float(total_hours) * 3600) * 100, 1) if total_hours and float(total_hours) > 0 else 0

        # Steps completed by this operator
        steps_done = db.query(func.count(ProcessStep.id)).filter(
            ProcessStep.completed_by == uid,
            ProcessStep.completed_at > thirty_days_ago
        ).scalar() or 0

        # Unique jobs worked
        unique_jobs = db.query(func.count(func.distinct(LaborEntry.traveler_id))).filter(
            LaborEntry.employee_id == uid,
            LaborEntry.created_at > thirty_days_ago
        ).scalar() or 0

        # Active days (days with at least one entry)
        active_days = db.query(func.count(func.distinct(func.date(LaborEntry.start_time)))).filter(
            LaborEntry.employee_id == uid,
            LaborEntry.created_at > thirty_days_ago
        ).scalar() or 0

        avg_hours_per_day = round(float(total_hours) / active_days, 2) if active_days > 0 else 0

        scorecards.append({
            "id": uid,
            "name": f"{fn} {ln}".strip() if fn else username,
            "total_entries": total_entries,
            "completed_entries": completed_entries,
            "total_hours": round(float(total_hours), 2),
            "avg_hours_per_entry": round(float(avg_hours), 2),
            "avg_hours_per_day": avg_hours_per_day,
            "steps_completed": steps_done,
            "unique_jobs": unique_jobs,
            "active_days": active_days,
            "total_pauses": total_pauses,
            "total_pause_minutes": round(total_pause_secs / 60, 1),
            "pause_percent": pause_pct,
        })

    scorecards.sort(key=lambda x: x["total_hours"], reverse=True)

    return {
        "anomalies": anomalies,
        "due_date_heatmap": due_date_data,
        "est_vs_actual": est_vs_actual,
        "yield_data": yield_data,
        "department_yield": dept_yield_list,
        "daily_summary": daily_summary,
        "bottlenecks": bottlenecks,
        "operator_scorecards": scorecards,
    }
