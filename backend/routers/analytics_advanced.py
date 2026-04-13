"""Advanced analytics endpoint — Phase 2.

Returns:
  - on_time_delivery: weekly on-time %, trend
  - predictive_late_alerts: jobs projected to miss due date
  - first_pass_yield_trend: weekly yield % over 12 weeks
  - operator_efficiency_by_wc: who's fastest at which work center
  - daily_scorecard: today's production summary
  - capacity_planning: committed vs available hours next 2 weeks
  - rejection_root_cause: rejects by work center and customer
  - previous_build_comparison: same part_number historical comparison
  - kitting_enhanced: priority queue, kit-to-production handoff, efficiency
  - floor_status: work center heatmap (active/idle/blocked)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, case, and_, or_, text
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, Traveler, LaborEntry, WorkCenter, ProcessStep,
    TravelerStatus, TravelerTrackingLog, PauseLog, UserRole,
    KittingTimerSession,
)
from routers.auth import get_current_user

router = APIRouter()

# Configurable defaults (no cost/rate in DB, so use constants)
DEFAULT_LABOR_RATE = 35.0  # $/hr — used for cost estimates
WORK_HOURS_PER_DAY = 8
WORK_DAYS_PER_WEEK = 5

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


def _estimate(op: str) -> float:
    if not op:
        return 1.0
    up = op.upper().strip()
    if up in OPERATION_ESTIMATES:
        return OPERATION_ESTIMATES[up]
    for k, v in OPERATION_ESTIMATES.items():
        if k in up or up in k:
            return v
    return 1.0


def _weekday_hours(start_date, end_date) -> float:
    """Count available work hours between two dates (weekdays only, 8h/day)."""
    hours = 0
    d = start_date
    while d <= end_date:
        if d.weekday() < 5:
            hours += WORK_HOURS_PER_DAY
        d += timedelta(days=1)
    return hours


@router.get("/advanced")
async def get_advanced_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    today = now.date()

    # ═══════════════════════════════════════════════════════════════════
    # 1. ON-TIME DELIVERY RATE (last 12 weeks)
    # ═══════════════════════════════════════════════════════════════════
    on_time_delivery = {"weeks": [], "overall_rate": 0, "total_shipped": 0, "total_on_time": 0}
    try:
        total_shipped_all = 0
        total_on_time_all = 0
        for w in range(11, -1, -1):
            week_start = today - timedelta(days=today.weekday() + 7 * w)
            week_end = week_start + timedelta(days=6)
            ws_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
            we_dt = datetime.combine(week_end + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)

            completed = db.query(Traveler).filter(
                Traveler.completed_at >= ws_dt,
                Traveler.completed_at < we_dt,
                Traveler.completed_at.isnot(None),
            ).all()

            shipped = len(completed)
            on_time = 0
            for t in completed:
                if t.due_date:
                    try:
                        due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                        shipped_date = t.completed_at.date() if t.completed_at else None
                        if shipped_date and shipped_date <= due:
                            on_time += 1
                    except Exception:
                        pass
                else:
                    on_time += 1  # no due date = can't be late

            total_shipped_all += shipped
            total_on_time_all += on_time
            rate = round(on_time / shipped * 100, 1) if shipped > 0 else 100.0

            on_time_delivery["weeks"].append({
                "week": week_start.strftime("%m/%d"),
                "shipped": shipped,
                "on_time": on_time,
                "late": shipped - on_time,
                "rate": rate,
            })

        on_time_delivery["total_shipped"] = total_shipped_all
        on_time_delivery["total_on_time"] = total_on_time_all
        on_time_delivery["overall_rate"] = round(
            total_on_time_all / total_shipped_all * 100, 1
        ) if total_shipped_all > 0 else 100.0
    except Exception as e:
        print(f"on_time_delivery error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 2. PREDICTIVE LATE ALERTS
    # ═══════════════════════════════════════════════════════════════════
    predictive_late = []
    try:
        active_travelers = db.query(Traveler).filter(
            Traveler.is_active == True,
            Traveler.status.in_([TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS]),
            Traveler.due_date.isnot(None),
        ).all()

        for t in active_travelers:
            try:
                due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
            except Exception:
                continue
            days_until = (due - today).days
            if days_until < 0:
                continue  # already overdue, handled elsewhere

            # Get steps + progress
            steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == t.id).all()
            total_steps = len(steps)
            completed_steps = sum(1 for s in steps if s.is_completed)
            if total_steps == 0:
                continue

            # Estimated remaining hours
            remaining_hours = sum(
                _estimate(s.operation) for s in steps if not s.is_completed
            )

            # Actual hours worked so far
            actual_hours = db.query(
                func.coalesce(func.sum(LaborEntry.hours_worked), 0)
            ).filter(
                LaborEntry.traveler_id == t.id,
                LaborEntry.hours_worked > 0,
            ).scalar() or 0

            # Available work hours until due date
            available_hours = _weekday_hours(today, due)

            # Predicted: will remaining hours fit in available hours?
            if available_hours <= 0 or remaining_hours > available_hours:
                days_over = round((remaining_hours - available_hours) / WORK_HOURS_PER_DAY, 1) if available_hours >= 0 else round(remaining_hours / WORK_HOURS_PER_DAY, 1)
                predictive_late.append({
                    "traveler_id": t.id,
                    "job_number": t.job_number,
                    "part_description": t.part_description or "",
                    "customer_name": t.customer_name or "",
                    "due_date": t.due_date,
                    "days_until_due": days_until,
                    "remaining_hours": round(remaining_hours, 1),
                    "available_hours": round(available_hours, 1),
                    "projected_days_late": max(days_over, 0.1),
                    "percent_complete": round(completed_steps / total_steps * 100, 1),
                    "total_steps": total_steps,
                    "completed_steps": completed_steps,
                })

        predictive_late.sort(key=lambda x: x["projected_days_late"], reverse=True)
    except Exception as e:
        print(f"predictive_late error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 3. FIRST PASS YIELD TREND (12 weeks)
    # ═══════════════════════════════════════════════════════════════════
    yield_trend = []
    try:
        for w in range(11, -1, -1):
            week_start = today - timedelta(days=today.weekday() + 7 * w)
            week_end = week_start + timedelta(days=6)
            ws_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
            we_dt = datetime.combine(week_end + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)

            row = db.query(
                func.coalesce(func.sum(ProcessStep.accepted), 0).label("accepted"),
                func.coalesce(func.sum(ProcessStep.rejected), 0).label("rejected"),
            ).filter(
                ProcessStep.completed_at >= ws_dt,
                ProcessStep.completed_at < we_dt,
                ProcessStep.quantity > 0,
            ).first()

            accepted = int(row.accepted) if row else 0
            rejected = int(row.rejected) if row else 0
            total = accepted + rejected
            yield_pct = round(accepted / total * 100, 1) if total > 0 else None

            yield_trend.append({
                "week": week_start.strftime("%m/%d"),
                "accepted": accepted,
                "rejected": rejected,
                "total": total,
                "yield_pct": yield_pct,
            })
    except Exception as e:
        print(f"yield_trend error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 4. OPERATOR EFFICIENCY BY WORK CENTER (last 30 days)
    # ═══════════════════════════════════════════════════════════════════
    operator_by_wc = []
    try:
        thirty_ago = now - timedelta(days=30)
        rows = db.query(
            User.id, User.first_name, User.last_name, User.username,
            LaborEntry.work_center,
            func.sum(LaborEntry.hours_worked).label("total_hours"),
            func.count(LaborEntry.id).label("entries"),
            func.avg(LaborEntry.hours_worked).label("avg_hours"),
        ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
            LaborEntry.hours_worked > 0,
            LaborEntry.end_time.isnot(None),
            LaborEntry.created_at > thirty_ago,
            LaborEntry.work_center.isnot(None),
        ).group_by(User.id, User.first_name, User.last_name, User.username, LaborEntry.work_center).all()

        # Compute average hours per WC across all operators for comparison
        wc_avgs = defaultdict(list)
        for uid, fn, ln, uname, wc, total_h, entries, avg_h in rows:
            wc_avgs[wc].append(float(avg_h or 0))

        wc_global_avg = {wc: sum(vals) / len(vals) for wc, vals in wc_avgs.items() if vals}

        for uid, fn, ln, uname, wc, total_h, entries, avg_h in rows:
            name = f"{fn} {ln}".strip() if fn else uname
            global_avg = wc_global_avg.get(wc, float(avg_h or 1))
            efficiency = round(global_avg / float(avg_h) * 100, 1) if float(avg_h or 0) > 0 else 0
            operator_by_wc.append({
                "name": name,
                "work_center": wc,
                "total_hours": round(float(total_h), 1),
                "entries": entries,
                "avg_hours_per_entry": round(float(avg_h), 2),
                "team_avg": round(global_avg, 2),
                "efficiency": efficiency,  # >100 = faster than avg
            })

        operator_by_wc.sort(key=lambda x: (-x["efficiency"], x["work_center"]))
    except Exception as e:
        print(f"operator_by_wc error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 5. DAILY PRODUCTION SCORECARD
    # ═══════════════════════════════════════════════════════════════════
    daily_scorecard = {}
    try:
        day_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        jobs_shipped_today = db.query(func.count(Traveler.id)).filter(
            Traveler.completed_at >= day_start,
            Traveler.completed_at < day_end,
        ).scalar() or 0

        steps_completed_today = db.query(func.count(ProcessStep.id)).filter(
            ProcessStep.completed_at >= day_start,
            ProcessStep.completed_at < day_end,
        ).scalar() or 0

        jobs_started_today = db.query(func.count(Traveler.id)).filter(
            Traveler.created_at >= day_start,
            Traveler.created_at < day_end,
        ).scalar() or 0

        hours_logged_today = db.query(
            func.coalesce(func.sum(LaborEntry.hours_worked), 0)
        ).filter(
            LaborEntry.start_time >= day_start,
            LaborEntry.start_time < day_end,
            LaborEntry.hours_worked > 0,
        ).scalar() or 0

        active_timers = db.query(func.count(LaborEntry.id)).filter(
            LaborEntry.end_time.is_(None),
            LaborEntry.is_completed == False,
        ).scalar() or 0

        unique_operators_today = db.query(
            func.count(func.distinct(LaborEntry.employee_id))
        ).filter(
            LaborEntry.start_time >= day_start,
            LaborEntry.start_time < day_end,
        ).scalar() or 0

        # Yesterday for comparison
        yesterday = today - timedelta(days=1)
        yd_start = datetime.combine(yesterday, datetime.min.time()).replace(tzinfo=timezone.utc)
        yd_end = day_start
        hours_yesterday = db.query(
            func.coalesce(func.sum(LaborEntry.hours_worked), 0)
        ).filter(
            LaborEntry.start_time >= yd_start,
            LaborEntry.start_time < yd_end,
            LaborEntry.hours_worked > 0,
        ).scalar() or 0

        steps_yesterday = db.query(func.count(ProcessStep.id)).filter(
            ProcessStep.completed_at >= yd_start,
            ProcessStep.completed_at < yd_end,
        ).scalar() or 0

        # Overdue count
        overdue_count = 0
        overdue_travelers = db.query(Traveler).filter(
            Traveler.is_active == True,
            Traveler.status.in_([TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS]),
            Traveler.due_date.isnot(None),
        ).all()
        for t in overdue_travelers:
            try:
                due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                if due < today:
                    overdue_count += 1
            except Exception:
                pass

        daily_scorecard = {
            "date": today.isoformat(),
            "jobs_shipped": jobs_shipped_today,
            "jobs_started": jobs_started_today,
            "steps_completed": steps_completed_today,
            "hours_logged": round(float(hours_logged_today), 1),
            "active_timers": active_timers,
            "unique_operators": unique_operators_today,
            "overdue_jobs": overdue_count,
            "comparison": {
                "hours_yesterday": round(float(hours_yesterday), 1),
                "steps_yesterday": steps_yesterday,
                "hours_change_pct": round(
                    (float(hours_logged_today) - float(hours_yesterday)) / float(hours_yesterday) * 100, 1
                ) if float(hours_yesterday) > 0 else 0,
            },
        }
    except Exception as e:
        print(f"daily_scorecard error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 6. CAPACITY PLANNING (next 2 weeks)
    # ═══════════════════════════════════════════════════════════════════
    capacity = {"weeks": [], "total_committed": 0, "total_available": 0}
    try:
        # Count active operators (logged labor in last 7 days)
        active_ops = db.query(
            func.count(func.distinct(LaborEntry.employee_id))
        ).filter(
            LaborEntry.start_time >= now - timedelta(days=7),
        ).scalar() or 1

        for w_offset in range(2):
            week_start = today + timedelta(days=(7 * w_offset) - today.weekday())
            week_end = week_start + timedelta(days=4)  # Mon-Fri

            available_hours = active_ops * WORK_HOURS_PER_DAY * WORK_DAYS_PER_WEEK

            # Committed: remaining estimated hours on jobs due this week
            committed = 0
            due_this_week = db.query(Traveler).filter(
                Traveler.is_active == True,
                Traveler.status.in_([TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS]),
                Traveler.due_date.isnot(None),
            ).all()
            for t in due_this_week:
                try:
                    due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                    if week_start <= due <= week_end:
                        remaining = sum(
                            _estimate(s.operation) for s in
                            db.query(ProcessStep).filter(
                                ProcessStep.traveler_id == t.id,
                                ProcessStep.is_completed == False
                            ).all()
                        )
                        committed += remaining
                except Exception:
                    pass

            utilization = round(committed / available_hours * 100, 1) if available_hours > 0 else 0

            capacity["weeks"].append({
                "week": week_start.strftime("%m/%d"),
                "available_hours": round(available_hours, 1),
                "committed_hours": round(committed, 1),
                "utilization_pct": utilization,
                "active_operators": active_ops,
            })
            capacity["total_committed"] += committed
            capacity["total_available"] += available_hours

        capacity["total_committed"] = round(capacity["total_committed"], 1)
        capacity["total_available"] = round(capacity["total_available"], 1)
    except Exception as e:
        print(f"capacity error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 7. REJECTION ROOT CAUSE
    # ═══════════════════════════════════════════════════════════════════
    rejection_root_cause = {"by_work_center": [], "by_customer": []}
    try:
        # By work center
        wc_rejects = db.query(
            ProcessStep.operation,
            func.sum(ProcessStep.rejected).label("total_rejected"),
            func.sum(ProcessStep.quantity).label("total_qty"),
            func.count(ProcessStep.id).label("step_count"),
        ).filter(
            ProcessStep.rejected > 0,
        ).group_by(ProcessStep.operation).order_by(
            func.sum(ProcessStep.rejected).desc()
        ).limit(15).all()

        for wc, rej, qty, cnt in wc_rejects:
            rejection_root_cause["by_work_center"].append({
                "work_center": wc,
                "total_rejected": int(rej or 0),
                "total_qty": int(qty or 0),
                "rejection_rate": round(int(rej or 0) / int(qty or 1) * 100, 1),
                "affected_steps": cnt,
            })

        # By customer
        cust_rejects = db.query(
            Traveler.customer_name,
            func.sum(ProcessStep.rejected).label("total_rejected"),
            func.sum(ProcessStep.quantity).label("total_qty"),
            func.count(func.distinct(Traveler.id)).label("job_count"),
        ).join(ProcessStep, ProcessStep.traveler_id == Traveler.id).filter(
            ProcessStep.rejected > 0,
            Traveler.customer_name.isnot(None),
        ).group_by(Traveler.customer_name).order_by(
            func.sum(ProcessStep.rejected).desc()
        ).limit(10).all()

        for cust, rej, qty, jobs in cust_rejects:
            rejection_root_cause["by_customer"].append({
                "customer": cust or "Unknown",
                "total_rejected": int(rej or 0),
                "total_qty": int(qty or 0),
                "rejection_rate": round(int(rej or 0) / int(qty or 1) * 100, 1),
                "job_count": jobs,
            })
    except Exception as e:
        print(f"rejection_root_cause error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 8. FLOOR STATUS HEATMAP
    # ═══════════════════════════════════════════════════════════════════
    floor_status = []
    try:
        work_centers = db.query(WorkCenter).filter(WorkCenter.is_active == True).all()
        for wc in work_centers:
            active_entries = db.query(func.count(LaborEntry.id)).filter(
                LaborEntry.work_center == wc.name,
                LaborEntry.end_time.is_(None),
                LaborEntry.is_completed == False,
            ).scalar() or 0

            # Blocked = has travelers waiting but no active labor
            waiting_travelers = db.query(func.count(ProcessStep.id)).filter(
                ProcessStep.operation == wc.name,
                ProcessStep.is_completed == False,
            ).scalar() or 0

            # Hours logged today
            day_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
            hours_today = db.query(
                func.coalesce(func.sum(LaborEntry.hours_worked), 0)
            ).filter(
                LaborEntry.work_center == wc.name,
                LaborEntry.start_time >= day_start,
                LaborEntry.hours_worked > 0,
            ).scalar() or 0

            if active_entries > 0:
                status = "active"
            elif waiting_travelers > 0:
                status = "blocked"
            else:
                status = "idle"

            floor_status.append({
                "work_center": wc.name,
                "department": wc.department or "",
                "category": wc.category or "",
                "status": status,
                "active_entries": active_entries,
                "waiting_travelers": waiting_travelers,
                "hours_today": round(float(hours_today), 1),
            })

        # Sort: active first, then blocked, then idle
        order = {"active": 0, "blocked": 1, "idle": 2}
        floor_status.sort(key=lambda x: (order.get(x["status"], 3), -x["waiting_travelers"]))
    except Exception as e:
        print(f"floor_status error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 9. PREVIOUS BUILD COMPARISON (for active travelers)
    # ═══════════════════════════════════════════════════════════════════
    build_comparisons = []
    try:
        active_travelers = db.query(Traveler).filter(
            Traveler.is_active == True,
            Traveler.status.in_([TravelerStatus.CREATED, TravelerStatus.IN_PROGRESS]),
        ).limit(30).all()

        for t in active_travelers:
            # Find previous builds of same part number
            previous = db.query(Traveler).filter(
                Traveler.part_number == t.part_number,
                Traveler.id != t.id,
                Traveler.completed_at.isnot(None),
            ).order_by(Traveler.completed_at.desc()).first()

            if not previous:
                continue

            # Current hours
            current_hours = db.query(
                func.coalesce(func.sum(LaborEntry.hours_worked), 0)
            ).filter(
                LaborEntry.traveler_id == t.id,
                LaborEntry.hours_worked > 0,
            ).scalar() or 0

            # Previous hours
            prev_hours = db.query(
                func.coalesce(func.sum(LaborEntry.hours_worked), 0)
            ).filter(
                LaborEntry.traveler_id == previous.id,
                LaborEntry.hours_worked > 0,
            ).scalar() or 0

            # Previous cycle time (days)
            prev_cycle = None
            if previous.created_at and previous.completed_at:
                prev_cycle = round(
                    (previous.completed_at - previous.created_at).total_seconds() / 86400, 1
                )

            if float(prev_hours) > 0:
                build_comparisons.append({
                    "traveler_id": t.id,
                    "job_number": t.job_number,
                    "part_number": t.part_number,
                    "part_description": t.part_description or "",
                    "customer_name": t.customer_name or "",
                    "current_hours": round(float(current_hours), 1),
                    "previous_job": previous.job_number,
                    "previous_hours": round(float(prev_hours), 1),
                    "previous_cycle_days": prev_cycle,
                    "variance_hours": round(float(current_hours) - float(prev_hours), 1),
                    "variance_pct": round(
                        (float(current_hours) - float(prev_hours)) / float(prev_hours) * 100, 1
                    ) if float(prev_hours) > 0 else 0,
                })

        build_comparisons.sort(key=lambda x: abs(x["variance_pct"]), reverse=True)
    except Exception as e:
        print(f"build_comparisons error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 10. KITTING ENHANCED (priority queue, handoff, efficiency)
    # ═══════════════════════════════════════════════════════════════════
    kitting_enhanced = {
        "priority_queue": [],
        "kit_to_production_avg_hours": 0,
        "operator_efficiency": [],
    }
    try:
        # Priority queue: all kitting steps sorted by urgency
        kit_steps = db.query(ProcessStep, Traveler).join(
            Traveler, Traveler.id == ProcessStep.traveler_id
        ).filter(
            func.upper(ProcessStep.operation).like('%KIT%'),
            ProcessStep.is_completed == False,
            Traveler.is_active == True,
        ).all()

        for step, t in kit_steps:
            days_until = None
            urgency_score = 999
            if t.due_date:
                try:
                    due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                    days_until = (due - today).days
                    # Lower = more urgent
                    urgency_score = days_until if days_until >= 0 else days_until - 100
                except Exception:
                    pass

            priority_val = 0 if str(t.priority) == "Priority.HIGH" else 1

            kitting_enhanced["priority_queue"].append({
                "traveler_id": t.id,
                "job_number": t.job_number,
                "customer_name": t.customer_name or "",
                "part_description": t.part_description or "",
                "priority": "HIGH" if priority_val == 0 else "NORMAL",
                "due_date": t.due_date,
                "days_until_due": days_until,
                "urgency_score": urgency_score,
            })

        kitting_enhanced["priority_queue"].sort(key=lambda x: (
            1 if x["priority"] == "NORMAL" else 0,
            x["urgency_score"],
        ))

        # Kit-to-production handoff: avg time between kit completion and next step start
        handoff_times = []
        completed_kits = db.query(ProcessStep).filter(
            func.upper(ProcessStep.operation).like('%KIT%'),
            ProcessStep.is_completed == True,
            ProcessStep.completed_at.isnot(None),
        ).all()

        for kit_step in completed_kits:
            next_step = db.query(ProcessStep).filter(
                ProcessStep.traveler_id == kit_step.traveler_id,
                ProcessStep.step_number > kit_step.step_number,
                ProcessStep.is_completed == True,
                ProcessStep.completed_at.isnot(None),
            ).order_by(ProcessStep.step_number).first()

            if next_step and kit_step.completed_at and next_step.completed_at:
                # Find first labor entry on the next step
                first_labor = db.query(LaborEntry).filter(
                    LaborEntry.traveler_id == kit_step.traveler_id,
                    LaborEntry.step_id == next_step.id,
                ).order_by(LaborEntry.start_time).first()

                if first_labor and first_labor.start_time and kit_step.completed_at:
                    kt = kit_step.completed_at
                    fl = first_labor.start_time
                    if kt.tzinfo is None:
                        kt = kt.replace(tzinfo=timezone.utc)
                    if fl.tzinfo is None:
                        fl = fl.replace(tzinfo=timezone.utc)
                    delta_hours = (fl - kt).total_seconds() / 3600
                    if 0 < delta_hours < 720:  # sanity: up to 30 days
                        handoff_times.append(delta_hours)

        if handoff_times:
            kitting_enhanced["kit_to_production_avg_hours"] = round(
                sum(handoff_times) / len(handoff_times), 1
            )

        # Kitting operator efficiency
        thirty_ago = now - timedelta(days=30)
        kit_step_ids = [r[0] for r in db.query(ProcessStep.id).filter(
            func.upper(ProcessStep.operation).like('%KIT%')
        ).all()]

        if kit_step_ids:
            kit_ops = db.query(
                User.id, User.first_name, User.last_name, User.username,
                func.sum(LaborEntry.hours_worked).label("total_hours"),
                func.count(LaborEntry.id).label("entries"),
                func.avg(LaborEntry.hours_worked).label("avg_hours"),
            ).join(LaborEntry, LaborEntry.employee_id == User.id).filter(
                LaborEntry.step_id.in_(kit_step_ids),
                LaborEntry.hours_worked > 0,
                LaborEntry.end_time.isnot(None),
                LaborEntry.created_at > thirty_ago,
            ).group_by(User.id, User.first_name, User.last_name, User.username).all()

            team_avg = None
            if kit_ops:
                all_avgs = [float(r.avg_hours) for r in kit_ops if r.avg_hours]
                team_avg = sum(all_avgs) / len(all_avgs) if all_avgs else None

            for uid, fn, ln, uname, total_h, entries, avg_h in kit_ops:
                eff = round((team_avg / float(avg_h)) * 100, 1) if avg_h and team_avg else 0
                kitting_enhanced["operator_efficiency"].append({
                    "name": f"{fn} {ln}".strip() if fn else uname,
                    "total_hours": round(float(total_h), 1),
                    "entries": entries,
                    "avg_per_kit": round(float(avg_h), 2),
                    "team_avg": round(team_avg, 2) if team_avg else 0,
                    "efficiency": eff,
                })
            kitting_enhanced["operator_efficiency"].sort(key=lambda x: -x["efficiency"])
    except Exception as e:
        print(f"kitting_enhanced error: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # 11. LABOR COST ESTIMATE PER JOB
    # ═══════════════════════════════════════════════════════════════════
    labor_costs = []
    try:
        # Active + recently completed travelers with labor
        recent_travelers = db.query(
            Traveler.id, Traveler.job_number, Traveler.part_description,
            Traveler.customer_name, Traveler.status,
            func.sum(LaborEntry.hours_worked).label("total_hours"),
        ).join(LaborEntry, LaborEntry.traveler_id == Traveler.id).filter(
            LaborEntry.hours_worked > 0,
            LaborEntry.created_at > now - timedelta(days=60),
        ).group_by(
            Traveler.id, Traveler.job_number, Traveler.part_description,
            Traveler.customer_name, Traveler.status,
        ).order_by(func.sum(LaborEntry.hours_worked).desc()).limit(25).all()

        for tid, job, desc, cust, status, hours in recent_travelers:
            est_hours = sum(
                _estimate(s.operation) for s in
                db.query(ProcessStep).filter(ProcessStep.traveler_id == tid).all()
            )
            labor_costs.append({
                "traveler_id": tid,
                "job_number": job,
                "part_description": desc or "",
                "customer_name": cust or "",
                "status": status.value if status else "",
                "actual_hours": round(float(hours), 1),
                "estimated_hours": round(est_hours, 1),
                "labor_cost_estimate": round(float(hours) * DEFAULT_LABOR_RATE, 2),
                "estimated_cost": round(est_hours * DEFAULT_LABOR_RATE, 2),
                "cost_variance": round((float(hours) - est_hours) * DEFAULT_LABOR_RATE, 2),
            })
    except Exception as e:
        print(f"labor_costs error: {e}")

    return {
        "on_time_delivery": on_time_delivery,
        "predictive_late_alerts": predictive_late,
        "yield_trend": yield_trend,
        "operator_efficiency_by_wc": operator_by_wc,
        "daily_scorecard": daily_scorecard,
        "capacity_planning": capacity,
        "rejection_root_cause": rejection_root_cause,
        "floor_status": floor_status,
        "build_comparisons": build_comparisons,
        "kitting_enhanced": kitting_enhanced,
        "labor_costs": labor_costs,
    }
