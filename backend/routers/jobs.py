"""
Jobs router — reads job data from the KOSH PostgreSQL database (pcb_inventory schema).
No data duplication: queries tblJob, tblBOM, tblWhse_Inventory directly.
All endpoints are ADMIN-only and read-only (NEXUS never writes to KOSH tables).
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import psycopg2
from psycopg2.extras import RealDictCursor

from database import get_db
from models import UserRole
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# KOSH database connection config (same PostgreSQL server, different database)
KOSH_DB_CONFIG = {
    'host': os.getenv('KOSH_DB_HOST', 'aci-database'),
    'port': int(os.getenv('KOSH_DB_PORT', 5432)),
    'database': os.getenv('KOSH_DB_NAME', 'kosh'),
    'user': os.getenv('KOSH_DB_USER', 'stockpick_user'),
    'password': os.getenv('KOSH_DB_PASSWORD', 'stockpick_pass'),
}


def get_kosh_connection():
    """Get a direct connection to the KOSH database."""
    try:
        return psycopg2.connect(**KOSH_DB_CONFIG)
    except Exception as e:
        logger.error(f"Failed to connect to KOSH database: {e}")
        raise HTTPException(status_code=503, detail="KOSH database unavailable")


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ─── LIST JOBS ───────────────────────────────────────────────────────────────

@router.get("")
def list_jobs(
    q: Optional[str] = Query(None, description="Search by job number, customer, or description"),
    job_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user=Depends(require_admin),
):
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        where_clauses = []
        params = []

        if q:
            where_clauses.append("(job_number ILIKE %s OR customer ILIKE %s OR description ILIKE %s)")
            params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])

        if job_status:
            where_clauses.append("status = %s")
            params.append(job_status)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Get total count
        cursor.execute(f'SELECT COUNT(*) as total FROM pcb_inventory."tblJob" {where_sql}', params)
        total = cursor.fetchone()["total"]

        # Get jobs
        cursor.execute(f"""
            SELECT id, job_number, description, customer, cust_pn, build_qty,
                   order_qty, job_rev, cust_rev, wo_number, status, notes,
                   created_by, created_at, updated_at
            FROM pcb_inventory."tblJob"
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        jobs = cursor.fetchall()

        # Convert to serializable dicts
        result = []
        for j in jobs:
            result.append({
                "id": j["id"],
                "job_number": j["job_number"],
                "description": j["description"] or "",
                "customer": j["customer"] or "",
                "cust_pn": j["cust_pn"] or "",
                "build_qty": int(j["build_qty"] or 1),
                "order_qty": int(j["order_qty"] or 1),
                "job_rev": j["job_rev"] or "",
                "cust_rev": j.get("cust_rev") or "",
                "wo_number": j.get("wo_number") or "",
                "status": j["status"] or "New",
                "notes": j.get("notes") or "",
                "created_by": j["created_by"] or "",
                "created_at": str(j["created_at"]) if j["created_at"] else None,
                "updated_at": str(j["updated_at"]) if j["updated_at"] else None,
            })

        return {"jobs": result, "total": total, "limit": limit, "offset": offset}

    finally:
        conn.close()


# ─── JOB LOOKUP (for TravelerForm — must be BEFORE {job_number} to avoid conflict) ──

@router.get("/lookup/{job_number}")
def lookup_job(job_number: str, current_user=Depends(get_current_user)):
    """Lookup a job from KOSH by job number. Available to all authenticated users (for traveler creation)."""
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT job_number, description, customer, cust_pn, build_qty, order_qty,
                   job_rev, cust_rev, wo_number, status
            FROM pcb_inventory."tblJob"
            WHERE job_number ILIKE %s
            ORDER BY
                CASE WHEN job_number = %s THEN 0 ELSE 1 END,
                created_at DESC
            LIMIT 10
        """, (f"%{job_number}%", job_number))
        jobs = cursor.fetchall()

        return [
            {
                "job_number": j["job_number"],
                "description": j["description"] or "",
                "customer": j["customer"] or "",
                "cust_pn": j["cust_pn"] or "",
                "build_qty": int(j["build_qty"] or 1),
                "order_qty": int(j["order_qty"] or 1),
                "job_rev": j["job_rev"] or "",
                "cust_rev": j.get("cust_rev") or "",
                "wo_number": j.get("wo_number") or "",
                "status": j["status"] or "New",
            }
            for j in jobs
        ]

    finally:
        conn.close()


# ─── ENRICHED JOBS LIST (bulk enriched data for list page) ────────────────
# NOTE: Must be before /{job_number} to avoid being caught by the catch-all route

@router.get("/list-enriched")
def list_jobs_enriched(
    q: Optional[str] = Query(None),
    job_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Jobs list with traveler counts, progress, shortage counts, and health indicators."""
    from models import Traveler, TravelerStatus, LaborEntry
    from collections import defaultdict
    from datetime import date

    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        where_clauses = []
        params = []
        if q:
            where_clauses.append("(job_number ILIKE %s OR customer ILIKE %s OR description ILIKE %s)")
            params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
        if job_status:
            where_clauses.append("status = %s")
            params.append(job_status)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        cursor.execute(f'SELECT COUNT(*) as total FROM pcb_inventory."tblJob" {where_sql}', params)
        total = cursor.fetchone()["total"]

        cursor.execute(f"""
            SELECT id, job_number, description, customer, cust_pn, build_qty,
                   order_qty, job_rev, cust_rev, wo_number, status, notes,
                   created_by, created_at, updated_at
            FROM pcb_inventory."tblJob"
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        jobs = cursor.fetchall()
    finally:
        conn.close()

    # Batch-fetch traveler data for all job numbers
    job_numbers = [j["job_number"] for j in jobs]
    all_travelers = (
        db.query(Traveler)
        .filter(Traveler.job_number.in_(job_numbers))
        .all()
    ) if job_numbers else []

    # Group travelers by job_number
    travelers_by_job = defaultdict(list)
    for t in all_travelers:
        for jn in job_numbers:
            if t.job_number.upper().startswith(jn.upper()):
                travelers_by_job[jn].append(t)
                break

    # Batch-fetch labor hours
    all_traveler_ids = [t.id for t in all_travelers]
    labor_by_traveler = defaultdict(float)
    if all_traveler_ids:
        labor_entries = db.query(LaborEntry).filter(LaborEntry.traveler_id.in_(all_traveler_ids)).all()
        for le in labor_entries:
            labor_by_traveler[le.traveler_id] += (le.hours_worked or 0)

    result = []
    for j in jobs:
        jn = j["job_number"]
        order_qty = int(j["order_qty"] or 1)
        tvs = travelers_by_job.get(jn, [])
        traveler_count = len(tvs)
        completed = sum(1 for t in tvs if t.status == TravelerStatus.COMPLETED)
        in_progress = sum(1 for t in tvs if t.status == TravelerStatus.IN_PROGRESS)
        qty_mfg = sum(t.quantity for t in tvs if t.status == TravelerStatus.COMPLETED)
        progress = round((qty_mfg / order_qty * 100), 1) if order_qty > 0 else 0
        labor_hrs = round(sum(labor_by_traveler.get(t.id, 0) for t in tvs), 2)

        has_overdue = any(
            t.due_date and str(t.due_date)[:10] < str(date.today()) and t.status not in (TravelerStatus.COMPLETED, TravelerStatus.CANCELLED, TravelerStatus.ARCHIVED)
            for t in tvs
        )

        if traveler_count == 0:
            health = "needs_traveler"
        elif completed == traveler_count:
            health = "complete"
        elif has_overdue:
            health = "at_risk"
        else:
            health = "on_track"

        result.append({
            "id": j["id"],
            "job_number": jn,
            "description": j["description"] or "",
            "customer": j["customer"] or "",
            "cust_pn": j["cust_pn"] or "",
            "build_qty": int(j["build_qty"] or 1),
            "order_qty": order_qty,
            "job_rev": j["job_rev"] or "",
            "cust_rev": j.get("cust_rev") or "",
            "wo_number": j.get("wo_number") or "",
            "status": j["status"] or "New",
            "created_by": j["created_by"] or "",
            "created_at": str(j["created_at"]) if j["created_at"] else None,
            # Enriched
            "traveler_count": traveler_count,
            "completed_travelers": completed,
            "in_progress_travelers": in_progress,
            "progress_percent": progress,
            "total_labor_hours": labor_hrs,
            "health": health,
            "has_overdue": has_overdue,
        })

    return {"jobs": result, "total": total, "limit": limit, "offset": offset}


# ─── JOB DETAIL ──────────────────────────────────────────────────────────────

@router.get("/{job_number}")
def get_job_detail(job_number: str, current_user=Depends(require_admin)):
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get job record
        cursor.execute('SELECT * FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        build_qty = int(job["build_qty"] or 1)
        order_qty = int(job["order_qty"] or 1)

        return {
            "id": job["id"],
            "job_number": job["job_number"],
            "description": job["description"] or "",
            "customer": job["customer"] or "",
            "cust_pn": job["cust_pn"] or "",
            "build_qty": build_qty,
            "order_qty": order_qty,
            "job_rev": job["job_rev"] or "",
            "cust_rev": job.get("cust_rev") or "",
            "wo_number": job.get("wo_number") or "",
            "status": job["status"] or "New",
            "notes": job.get("notes") or "",
            "created_by": job["created_by"] or "",
            "created_at": str(job["created_at"]) if job["created_at"] else None,
            "updated_at": str(job["updated_at"]) if job["updated_at"] else None,
        }

    finally:
        conn.close()


# ─── BOM LINES (components list with live inventory) ─────────────────────────

@router.get("/{job_number}/bom")
def get_job_bom(job_number: str, current_user=Depends(require_admin)):
    """Get BOM lines for a job with live stock counts from warehouse inventory."""
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify job exists & get quantities
        cursor.execute('SELECT build_qty, order_qty FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        build_qty = int(job["build_qty"] or 1)
        order_qty = int(job["order_qty"] or 1)

        # Same BOM + inventory query from KOSH app.py (job_detail route)
        cursor.execute("""
            WITH bom_lines AS (
                SELECT DISTINCT ON (b.aci_pn)
                    b.line,
                    b.aci_pn,
                    b."DESC",
                    b.mpn as bom_mpn,
                    b.man,
                    b.qty,
                    b.cost,
                    b.pou,
                    b.job_rev,
                    b.last_rev,
                    b.cust,
                    b.cust_pn,
                    b.cust_rev
                FROM pcb_inventory."tblBOM" b
                WHERE b.job = %s
                    AND (b.job_rev = (SELECT job_rev FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != '' ORDER BY created_at DESC LIMIT 1)
                         OR NOT EXISTS (SELECT 1 FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != ''))
                ORDER BY b.aci_pn, b.line
            ),
            inventory_match AS (
                SELECT DISTINCT ON (COALESCE(w.pcn, bl.aci_pn || '_nopcn'), bl.aci_pn)
                    bl.line,
                    bl.aci_pn,
                    bl."DESC",
                    COALESCE(w.mpn, bl.bom_mpn) as mpn,
                    bl.man,
                    bl.qty,
                    bl.cost,
                    bl.pou,
                    bl.job_rev,
                    bl.last_rev,
                    bl.cust,
                    bl.cust_pn,
                    bl.cust_rev,
                    w.pcn,
                    COALESCE(w.item, bl.aci_pn) as item,
                    COALESCE(w.onhandqty, 0) as onhandqty,
                    COALESCE(w.mfg_qty, '0') as mfg_qty,
                    w.loc_to,
                    CASE WHEN bl.aci_pn = w.item THEN 1 WHEN w.item IS NOT NULL THEN 2 ELSE 3 END as match_priority
                FROM bom_lines bl
                LEFT JOIN pcb_inventory."tblWhse_Inventory" w
                    ON (bl.aci_pn = w.item OR bl.bom_mpn = w.mpn)
                    AND COALESCE(w.loc_to, '') != 'MFG Floor'
                ORDER BY COALESCE(w.pcn, bl.aci_pn || '_nopcn'), bl.aci_pn, match_priority
            )
            SELECT
                line as line_no,
                aci_pn,
                "DESC" as description,
                mpn,
                man as manufacturer,
                CAST(COALESCE(NULLIF(qty, ''), '0') AS INTEGER) as qty_per_board,
                COALESCE(SUM(onhandqty), 0) as on_hand,
                COALESCE(SUM(CAST(NULLIF(mfg_qty, '') AS INTEGER)), 0) as mfg_floor_qty,
                pcn,
                item,
                COALESCE(loc_to, '') as location,
                CAST(COALESCE(NULLIF(cost, ''), '0') AS DECIMAL(10,4)) as unit_cost,
                pou
            FROM inventory_match
            GROUP BY line, aci_pn, "DESC", mpn, man, qty, cost, pou, job_rev, last_rev, cust, cust_pn, cust_rev, pcn, item, loc_to
            ORDER BY
                CASE WHEN line ~ '^[0-9]+$' THEN CAST(line AS INTEGER) ELSE 999999 END,
                line
        """, (job_number, job_number, job_number))
        raw_lines = cursor.fetchall()

        bom_lines = []
        shortage_count = 0
        for line in raw_lines:
            qty_per_board = int(line["qty_per_board"] or 0)
            required = qty_per_board * order_qty
            on_hand = int(line["on_hand"] or 0)
            mfg_floor = int(line["mfg_floor_qty"] or 0)
            shortage = on_hand - required

            if shortage < 0:
                shortage_count += 1

            bom_lines.append({
                "line_no": line["line_no"],
                "aci_pn": line["aci_pn"],
                "description": line["description"] or "",
                "mpn": line["mpn"] or "",
                "manufacturer": line["manufacturer"] or "",
                "qty_per_board": qty_per_board,
                "required": required,
                "on_hand": on_hand,
                "mfg_floor_qty": mfg_floor,
                "shortage": shortage,
                "location": line["location"] if on_hand > 0 else "",
                "unit_cost": float(line["unit_cost"] or 0),
                "pou": line["pou"] or "",
            })

        return {
            "job_number": job_number,
            "build_qty": build_qty,
            "order_qty": order_qty,
            "total_lines": len(set(l["line_no"] for l in bom_lines)),
            "shortage_count": shortage_count,
            "lines": bom_lines,
        }

    finally:
        conn.close()


# ─── RELATED TRAVELERS (from NEXUS database) ────────────────────────────────

@router.get("/{job_number}/travelers")
def get_job_travelers(job_number: str, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """Get all NEXUS travelers associated with this job number."""
    from models import Traveler, User, ProcessStep

    # Match travelers whose job_number starts with the base job number
    # (handles suffixes like L, M for lead-free / ITAR)
    travelers = (
        db.query(Traveler)
        .filter(Traveler.job_number.ilike(f"{job_number}%"))
        .order_by(Traveler.created_at.desc())
        .all()
    )

    result = []
    for t in travelers:
        # Count completed steps
        total_steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == t.id).count()
        completed_steps = db.query(ProcessStep).filter(
            ProcessStep.traveler_id == t.id, ProcessStep.is_completed == True
        ).count()

        creator = db.query(User).filter(User.id == t.created_by).first()

        result.append({
            "id": t.id,
            "job_number": t.job_number,
            "work_order_number": t.work_order_number or "",
            "traveler_type": t.traveler_type.value if t.traveler_type else "",
            "part_number": t.part_number,
            "part_description": t.part_description,
            "revision": t.revision,
            "quantity": t.quantity,
            "status": t.status.value if t.status else "",
            "priority": t.priority.value if t.priority else "NORMAL",
            "customer_name": t.customer_name or "",
            "created_by": creator.username if creator else "",
            "created_at": str(t.created_at) if t.created_at else None,
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "group_id": t.group_id,
            "group_sequence": t.group_sequence,
            "group_label": t.group_label,
        })

    return {"job_number": job_number, "travelers": result, "total": len(result)}


# ─── STOCK SUMMARY (read-only warehouse inventory for job BOM items) ─────────

@router.get("/{job_number}/stock")
def get_job_stock(job_number: str, current_user=Depends(require_admin)):
    """Read-only warehouse inventory for all BOM items — includes ALL locations (Stock Room + MFG Floor)."""
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify job exists
        cursor.execute('SELECT order_qty FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        order_qty = int(job["order_qty"] or 1)

        # Get ALL warehouse inventory records for BOM items (no MFG Floor filter)
        cursor.execute("""
            WITH bom_items AS (
                SELECT DISTINCT ON (b.aci_pn) b.aci_pn, b.mpn as bom_mpn, b.qty, b."DESC", b.line
                FROM pcb_inventory."tblBOM" b
                WHERE b.job = %s
                    AND (b.job_rev = (SELECT job_rev FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != '' ORDER BY created_at DESC LIMIT 1)
                         OR NOT EXISTS (SELECT 1 FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != ''))
                ORDER BY b.aci_pn, b.line
            )
            SELECT
                bi.aci_pn,
                bi."DESC" as description,
                bi.line as line_no,
                CAST(COALESCE(NULLIF(bi.qty, ''), '0') AS INTEGER) as qty_per_board,
                w.pcn,
                w.item as whse_item,
                COALESCE(w.mpn, bi.bom_mpn) as mpn,
                COALESCE(w.onhandqty, 0) as on_hand,
                COALESCE(CAST(NULLIF(w.mfg_qty, '') AS INTEGER), 0) as mfg_qty,
                COALESCE(w.loc_to, '') as location,
                COALESCE(w.vendor, '') as vendor,
                COALESCE(w.dc, '') as date_code,
                COALESCE(w.po, '') as po_number
            FROM bom_items bi
            LEFT JOIN pcb_inventory."tblWhse_Inventory" w
                ON (bi.aci_pn = w.item OR bi.bom_mpn = w.mpn)
            ORDER BY
                CASE WHEN bi.line ~ '^[0-9]+$' THEN CAST(bi.line AS INTEGER) ELSE 999999 END,
                bi.aci_pn, w.loc_to, w.pcn
        """, (job_number, job_number, job_number))
        rows = cursor.fetchall()

        stock_items = []
        for r in rows:
            qty_per_board = int(r["qty_per_board"] or 0)
            required = qty_per_board * order_qty
            on_hand = int(r["on_hand"] or 0)
            mfg_qty = int(r["mfg_qty"] or 0)

            stock_items.append({
                "line_no": r["line_no"] or "",
                "aci_pn": r["aci_pn"],
                "description": r["description"] or "",
                "pcn": r["pcn"],
                "mpn": r["mpn"] or "",
                "on_hand": on_hand,
                "mfg_qty": mfg_qty,
                "location": r["location"],
                "qty_per_board": qty_per_board,
                "required": required,
                "shortage": on_hand - required,
                "vendor": r["vendor"],
                "date_code": r["date_code"],
                "po_number": r["po_number"],
            })

        return {"job_number": job_number, "order_qty": order_qty, "stock": stock_items}

    finally:
        conn.close()


# ─── MANUFACTURING PROGRESS ─────────────────────────────────────────────────

@router.get("/{job_number}/progress")
def get_job_progress(job_number: str, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """Get manufacturing progress: X of Y QTY manufactured based on completed travelers."""
    from models import Traveler, TravelerStatus

    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT order_qty FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        order_qty = int(job["order_qty"] or 1)
    finally:
        conn.close()

    # Count completed quantities from NEXUS travelers
    travelers = (
        db.query(Traveler)
        .filter(Traveler.job_number.ilike(f"{job_number}%"))
        .all()
    )

    total_travelers = len(travelers)
    completed_travelers = sum(1 for t in travelers if t.status == TravelerStatus.COMPLETED)
    in_progress_travelers = sum(1 for t in travelers if t.status == TravelerStatus.IN_PROGRESS)
    qty_manufactured = sum(t.quantity for t in travelers if t.status == TravelerStatus.COMPLETED)
    qty_in_progress = sum(t.quantity for t in travelers if t.status == TravelerStatus.IN_PROGRESS)

    return {
        "job_number": job_number,
        "order_qty": order_qty,
        "qty_manufactured": qty_manufactured,
        "qty_in_progress": qty_in_progress,
        "total_travelers": total_travelers,
        "completed_travelers": completed_travelers,
        "in_progress_travelers": in_progress_travelers,
        "percent_complete": round((qty_manufactured / order_qty * 100), 1) if order_qty > 0 else 0,
    }


# ─── ENRICHED JOB (single call with all data) ─────────────────────────────

@router.get("/{job_number}/enriched")
def get_job_enriched(job_number: str, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """Get job with traveler count, progress, shortage count, kitting status, labor hours — ONE call."""
    from models import Traveler, TravelerStatus, ProcessStep, LaborEntry

    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get job from KOSH
        cursor.execute('SELECT * FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        order_qty = int(job["order_qty"] or 1)

        # Get BOM shortage count + kitting status
        shortage_count = 0
        total_bom_lines = 0
        kitted_lines = 0
        try:
            cursor.execute("""
                WITH bom_lines AS (
                    SELECT DISTINCT ON (b.aci_pn)
                        b.aci_pn, b.qty, b.mpn as bom_mpn
                    FROM pcb_inventory."tblBOM" b
                    WHERE b.job = %s
                        AND (b.job_rev = (SELECT job_rev FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != '' ORDER BY created_at DESC LIMIT 1)
                             OR NOT EXISTS (SELECT 1 FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != ''))
                    ORDER BY b.aci_pn
                )
                SELECT
                    bl.aci_pn,
                    CAST(COALESCE(NULLIF(bl.qty, ''), '0') AS INTEGER) as qty_per_board,
                    COALESCE(SUM(CASE WHEN COALESCE(w.loc_to, '') != 'MFG Floor' THEN w.onhandqty ELSE 0 END), 0) as stockroom_qty,
                    COALESCE(SUM(CASE WHEN w.loc_to = 'MFG Floor' THEN CAST(NULLIF(w.mfg_qty, '') AS INTEGER) ELSE 0 END), 0) as mfg_floor_qty
                FROM bom_lines bl
                LEFT JOIN pcb_inventory."tblWhse_Inventory" w
                    ON (bl.aci_pn = w.item OR bl.bom_mpn = w.mpn)
                GROUP BY bl.aci_pn, bl.qty
            """, (job_number, job_number, job_number))
            bom_rows = cursor.fetchall()
            for row in bom_rows:
                total_bom_lines += 1
                qty_per_board = int(row["qty_per_board"] or 0)
                required = qty_per_board * order_qty
                stockroom = int(row["stockroom_qty"] or 0)
                mfg_floor = int(row["mfg_floor_qty"] or 0)
                if stockroom < required:
                    shortage_count += 1
                if mfg_floor >= required and required > 0:
                    kitted_lines += 1
        except Exception as e:
            logger.warning(f"Error fetching BOM data for {job_number}: {e}")

    finally:
        conn.close()

    # Traveler data from NEXUS
    travelers = (
        db.query(Traveler)
        .filter(Traveler.job_number.ilike(f"{job_number}%"))
        .all()
    )

    traveler_count = len(travelers)
    completed_travelers = sum(1 for t in travelers if t.status == TravelerStatus.COMPLETED)
    in_progress_travelers = sum(1 for t in travelers if t.status == TravelerStatus.IN_PROGRESS)
    qty_manufactured = sum(t.quantity for t in travelers if t.status == TravelerStatus.COMPLETED)
    progress_percent = round((qty_manufactured / order_qty * 100), 1) if order_qty > 0 else 0

    # Total labor hours across all travelers for this job
    traveler_ids = [t.id for t in travelers]
    total_labor_hours = 0.0
    if traveler_ids:
        labor_hours = db.query(LaborEntry).filter(LaborEntry.traveler_id.in_(traveler_ids)).all()
        total_labor_hours = round(sum(e.hours_worked or 0 for e in labor_hours), 2)

    # Check for overdue travelers
    from datetime import date
    has_overdue = any(
        t.due_date and str(t.due_date)[:10] < str(date.today()) and t.status not in (TravelerStatus.COMPLETED, TravelerStatus.CANCELLED, TravelerStatus.ARCHIVED)
        for t in travelers
    )

    # Determine health indicator
    if traveler_count == 0:
        health = "needs_traveler"
    elif completed_travelers == traveler_count and traveler_count > 0:
        health = "complete"
    elif shortage_count > 0:
        health = "blocked"
    elif has_overdue:
        health = "at_risk"
    else:
        health = "on_track"

    # Kitting status
    kitting_percent = round((kitted_lines / total_bom_lines * 100), 1) if total_bom_lines > 0 else 0
    if kitting_percent >= 100:
        kitting_status = "ready"
    elif kitting_percent > 0:
        kitting_status = "partial"
    else:
        kitting_status = "none"

    return {
        "id": job["id"],
        "job_number": job["job_number"],
        "description": job["description"] or "",
        "customer": job["customer"] or "",
        "cust_pn": job["cust_pn"] or "",
        "build_qty": int(job["build_qty"] or 1),
        "order_qty": order_qty,
        "job_rev": job["job_rev"] or "",
        "cust_rev": job.get("cust_rev") or "",
        "wo_number": job.get("wo_number") or "",
        "status": job["status"] or "New",
        "notes": job.get("notes") or "",
        "created_by": job["created_by"] or "",
        "created_at": str(job["created_at"]) if job["created_at"] else None,
        "updated_at": str(job["updated_at"]) if job["updated_at"] else None,
        # Enriched fields
        "traveler_count": traveler_count,
        "completed_travelers": completed_travelers,
        "in_progress_travelers": in_progress_travelers,
        "progress_percent": progress_percent,
        "shortage_count": shortage_count,
        "total_labor_hours": total_labor_hours,
        "kitting_status": kitting_status,
        "kitting_percent": kitting_percent,
        "kitted_lines": kitted_lines,
        "total_bom_lines": total_bom_lines,
        "health": health,
        "has_overdue": has_overdue,
    }


# ─── KITTING STATUS ───────────────────────────────────────────────────────

@router.get("/{job_number}/kitting-status")
def get_kitting_status(job_number: str, current_user=Depends(require_admin)):
    """Compare BOM required quantities vs MFG Floor quantities from KOSH inventory."""
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute('SELECT order_qty FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found")

        order_qty = int(job["order_qty"] or 1)

        cursor.execute("""
            WITH bom_lines AS (
                SELECT DISTINCT ON (b.aci_pn)
                    b.aci_pn, b."DESC", b.qty, b.mpn as bom_mpn, b.line
                FROM pcb_inventory."tblBOM" b
                WHERE b.job = %s
                    AND (b.job_rev = (SELECT job_rev FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != '' ORDER BY created_at DESC LIMIT 1)
                         OR NOT EXISTS (SELECT 1 FROM pcb_inventory."tblBOM" WHERE job = %s AND job_rev IS NOT NULL AND job_rev != ''))
                ORDER BY b.aci_pn
            )
            SELECT
                bl.aci_pn,
                bl."DESC" as description,
                bl.line as line_no,
                CAST(COALESCE(NULLIF(bl.qty, ''), '0') AS INTEGER) as qty_per_board,
                COALESCE(SUM(CASE WHEN COALESCE(w.loc_to, '') != 'MFG Floor' THEN w.onhandqty ELSE 0 END), 0) as stockroom_qty,
                COALESCE(SUM(CASE WHEN w.loc_to = 'MFG Floor' THEN CAST(NULLIF(w.mfg_qty, '') AS INTEGER) ELSE 0 END), 0) as mfg_floor_qty
            FROM bom_lines bl
            LEFT JOIN pcb_inventory."tblWhse_Inventory" w
                ON (bl.aci_pn = w.item OR bl.bom_mpn = w.mpn)
            GROUP BY bl.aci_pn, bl."DESC", bl.line, bl.qty
            ORDER BY
                CASE WHEN bl.line ~ '^[0-9]+$' THEN CAST(bl.line AS INTEGER) ELSE 999999 END,
                bl.aci_pn
        """, (job_number, job_number, job_number))
        rows = cursor.fetchall()

        components = []
        total_components = 0
        kitted = 0
        in_stockroom = 0
        short = 0

        for row in rows:
            total_components += 1
            qty_per_board = int(row["qty_per_board"] or 0)
            required = qty_per_board * order_qty
            stockroom_qty = int(row["stockroom_qty"] or 0)
            mfg_floor_qty = int(row["mfg_floor_qty"] or 0)

            if required == 0:
                comp_status = "ready"
                kitted += 1
            elif mfg_floor_qty >= required:
                comp_status = "ready"
                kitted += 1
            elif stockroom_qty >= required:
                comp_status = "in_stockroom"
                in_stockroom += 1
            else:
                comp_status = "short"
                short += 1

            components.append({
                "line_no": row["line_no"] or "",
                "aci_pn": row["aci_pn"],
                "description": row["description"] or "",
                "required": required,
                "on_mfg_floor": mfg_floor_qty,
                "in_stockroom": stockroom_qty,
                "short_qty": max(0, required - stockroom_qty - mfg_floor_qty),
                "status": comp_status,
            })

        percent = round((kitted / total_components * 100), 1) if total_components > 0 else 0

        return {
            "job_number": job_number,
            "order_qty": order_qty,
            "total_components": total_components,
            "kitted": kitted,
            "in_stockroom": in_stockroom,
            "short": short,
            "percent": percent,
            "components": components,
        }

    finally:
        conn.close()


# ─── AUTO-CREATE TRAVELER ─────────────────────────────────────────────────

@router.post("/{job_number}/auto-create-traveler")
def auto_create_traveler(job_number: str, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """Auto-create a DRAFT traveler from a KOSH job. Infers type from description, creates default steps."""
    from models import Traveler, TravelerType, TravelerStatus, Priority, ProcessStep, WorkCenter

    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_number} not found in KOSH")
    finally:
        conn.close()

    # Infer traveler type from description/part
    desc_lower = (job["description"] or "").lower()
    cust_pn_lower = (job["cust_pn"] or "").lower()
    if any(kw in desc_lower for kw in ["cable", "harness", "wire"]):
        trav_type = TravelerType.CABLE
    elif any(kw in desc_lower for kw in ["pcb", "board", "bare board"]) and "assy" not in desc_lower and "assembly" not in desc_lower:
        trav_type = TravelerType.PCB
    else:
        trav_type = TravelerType.PCB_ASSEMBLY  # Default

    # Check for existing traveler with same job_number to determine revision
    existing = (
        db.query(Traveler)
        .filter(Traveler.job_number.ilike(f"{job_number}%"))
        .order_by(Traveler.created_at.desc())
        .first()
    )

    if existing:
        # Increment revision
        rev = existing.revision or "A"
        if rev.isdigit():
            new_rev = str(int(rev) + 1)
        else:
            chars = list(rev.upper())
            carry = True
            for i in range(len(chars) - 1, -1, -1):
                if carry:
                    if chars[i] == 'Z':
                        chars[i] = 'A'
                    else:
                        chars[i] = chr(ord(chars[i]) + 1)
                        carry = False
            if carry:
                chars.insert(0, 'A')
            new_rev = ''.join(chars)
    else:
        new_rev = job.get("job_rev") or "A"

    # Get default work center steps for this type
    type_map = {
        TravelerType.PCB_ASSEMBLY: "PCB_ASSEMBLY",
        TravelerType.PCB: "PCB",
        TravelerType.CABLE: "CABLE",
    }
    db_type = type_map.get(trav_type, "PCB_ASSEMBLY")
    work_centers = (
        db.query(WorkCenter)
        .filter(WorkCenter.traveler_type == db_type, WorkCenter.is_active == True)
        .order_by(WorkCenter.sort_order, WorkCenter.id)
        .all()
    )

    # Create the traveler
    traveler = Traveler(
        job_number=job_number,
        work_order_number=job.get("wo_number") or job_number,
        traveler_type=trav_type,
        part_number=job["cust_pn"] or "",
        part_description=job["description"] or "Assembly",
        revision=new_rev,
        customer_revision=job.get("cust_rev") or "",
        quantity=int(job["order_qty"] or 1),
        customer_code="",
        customer_name=job["customer"] or "",
        status=TravelerStatus.DRAFT,
        priority=Priority.NORMAL,
        work_center=work_centers[0].name if work_centers else "ASSEMBLY",
        is_active=True,
        include_labor_hours=(trav_type != TravelerType.PCB),
        created_by=current_user.id,
    )
    db.add(traveler)
    db.flush()

    # Create default process steps
    for i, wc in enumerate(work_centers):
        step = ProcessStep(
            traveler_id=traveler.id,
            step_number=i + 1,
            operation=wc.name,
            work_center_code=wc.code or wc.name.replace(" ", "_").upper(),
            instructions="",
            estimated_time=30,
            is_required=True,
        )
        db.add(step)

    db.commit()
    db.refresh(traveler)

    return {
        "id": traveler.id,
        "job_number": traveler.job_number,
        "traveler_type": traveler.traveler_type.value,
        "revision": traveler.revision,
        "status": traveler.status.value,
        "quantity": traveler.quantity,
        "message": f"Draft traveler created for job {job_number} (Rev {new_rev}, Type: {trav_type.value})",
    }


# ─── JOB TIMELINE ────────────────────────────────────────────────────────

@router.get("/{job_number}/timeline")
def get_job_timeline(job_number: str, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    """Chronological timeline of all events for a job across KOSH and NEXUS."""
    from models import Traveler, TravelerStatus, ProcessStep, LaborEntry, User

    events = []

    # KOSH: job creation date
    conn = get_kosh_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT created_at, created_by, status FROM pcb_inventory."tblJob" WHERE job_number = %s', (job_number,))
        job = cursor.fetchone()
        if job and job["created_at"]:
            events.append({
                "type": "job_created",
                "timestamp": str(job["created_at"]),
                "title": "Job created in KOSH",
                "detail": f"Created by {job['created_by'] or 'Unknown'}, Status: {job['status'] or 'New'}",
                "icon": "briefcase",
            })
    finally:
        conn.close()

    # NEXUS: travelers and their events
    travelers = (
        db.query(Traveler)
        .filter(Traveler.job_number.ilike(f"{job_number}%"))
        .order_by(Traveler.created_at)
        .all()
    )

    for t in travelers:
        creator = db.query(User).filter(User.id == t.created_by).first()
        creator_name = creator.username if creator else "Unknown"

        # Traveler created
        if t.created_at:
            events.append({
                "type": "traveler_created",
                "timestamp": str(t.created_at),
                "title": f"Traveler created ({t.traveler_type.value if t.traveler_type else 'Unknown'})",
                "detail": f"Rev {t.revision}, QTY {t.quantity} — by {creator_name}",
                "icon": "document",
                "traveler_id": t.id,
            })

        # Traveler status (if completed)
        if t.status == TravelerStatus.COMPLETED and t.updated_at:
            events.append({
                "type": "traveler_completed",
                "timestamp": str(t.updated_at),
                "title": f"Traveler completed (Rev {t.revision})",
                "detail": f"QTY {t.quantity} manufactured",
                "icon": "check",
                "traveler_id": t.id,
            })

        # Process steps completed
        steps = db.query(ProcessStep).filter(ProcessStep.traveler_id == t.id, ProcessStep.is_completed == True).all()
        for step in steps:
            if step.completed_date:
                events.append({
                    "type": "step_completed",
                    "timestamp": str(step.completed_date),
                    "title": f"Step completed: {step.operation}",
                    "detail": f"Step #{step.step_number} on Rev {t.revision}",
                    "icon": "wrench",
                    "traveler_id": t.id,
                })

        # Labor entries
        labor_entries = (
            db.query(LaborEntry)
            .filter(LaborEntry.traveler_id == t.id)
            .order_by(LaborEntry.start_time)
            .all()
        )
        for le in labor_entries:
            operator = db.query(User).filter(User.id == le.employee_id).first()
            op_name = operator.username if operator else "Unknown"

            if le.start_time:
                events.append({
                    "type": "labor_start",
                    "timestamp": str(le.start_time),
                    "title": f"Work started: {le.work_center or 'Unknown'}",
                    "detail": f"Operator: {op_name}, Rev {t.revision}",
                    "icon": "play",
                    "traveler_id": t.id,
                })
            if le.end_time:
                hours = round(le.hours_worked or 0, 2)
                events.append({
                    "type": "labor_end",
                    "timestamp": str(le.end_time),
                    "title": f"Work completed: {le.work_center or 'Unknown'}",
                    "detail": f"Operator: {op_name}, {hours}h — Rev {t.revision}",
                    "icon": "stop",
                    "traveler_id": t.id,
                })

    # Sort all events chronologically
    events.sort(key=lambda e: e["timestamp"] or "")

    return {"job_number": job_number, "events": events, "total": len(events)}
