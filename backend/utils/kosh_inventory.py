"""Batch KOSH inventory readiness for a set of NEXUS job numbers.

The dashboard forecast used to do this per traveler: up to three
`tblJob` lookups to find the right job-number spelling, then one BOM/inventory
join. Across 264 open travelers that is ~700 round trips to a second database,
and profiling put 48 of the endpoint's 50 seconds there while all 1,655 NEXUS
queries together cost 2.2s. The work is identical in shape for every job, so it
is done here in two queries for the whole set.
"""

import math
from decimal import Decimal

from utils.job_display import kosh_job_candidates


def _resolve_jobs(cur, job_numbers):
    """Map NEXUS job number -> (kosh_job_number, order_qty, status).

    One query for every candidate spelling of every job; the first candidate
    that exists in KOSH wins, preserving the per-job preference order.
    """
    candidates_by_job = {jn: kosh_job_candidates(jn) for jn in job_numbers if jn}
    all_candidates = sorted({c for cands in candidates_by_job.values() for c in cands})
    if not all_candidates:
        return {}

    cur.execute(
        'SELECT job_number, order_qty, status FROM warehouse."tblJob" WHERE job_number = ANY(%s)',
        (all_candidates,),
    )
    found = {row[0]: (int(row[1] or 1), row[2]) for row in cur.fetchall()}

    resolved = {}
    for job_number, candidates in candidates_by_job.items():
        for candidate in candidates:
            if candidate in found:
                order_qty, status = found[candidate]
                resolved[job_number] = (candidate, order_qty, status)
                break
    return resolved


def _shortages(cur, kosh_job_numbers):
    """Map KOSH job number -> list of (qty_per_board, on_hand) BOM rows."""
    if not kosh_job_numbers:
        return {}

    # Two equi-joins UNIONed, not `ON item = aci_pn OR mpn = w.mpn`. The OR
    # form cannot hash-join, so Postgres nested-looped 3,700 BOM lines over
    # 35,800 inventory rows (no index on item or mpn) and took 16s; this runs in
    # 0.12s and was verified to return byte-identical rows for every job.
    # UNION (not UNION ALL) on the inventory row id preserves the OR semantics:
    # a row matching on both item and mpn is still counted once.
    cur.execute(
        r"""
        WITH bom_items AS (
            SELECT DISTINCT ON (b.job, b.aci_pn) b.job, b.aci_pn, b.mpn, b.qty
            FROM warehouse."tblBOM" b
            WHERE b.job = ANY(%s)
            ORDER BY b.job, b.aci_pn, b.line
        ),
        matches AS (
            SELECT bi.job, bi.aci_pn, w.id AS inv_id, w.onhandqty
            FROM bom_items bi
            JOIN warehouse."tblWhse_Inventory" w ON w.item = bi.aci_pn
            WHERE w.loc_to <> 'MFG Floor'
            UNION
            SELECT bi.job, bi.aci_pn, w.id, w.onhandqty
            FROM bom_items bi
            JOIN warehouse."tblWhse_Inventory" w ON w.mpn = bi.mpn
            WHERE w.loc_to <> 'MFG Floor'
        )
        SELECT
            bi.job,
            -- qty is free text in KOSH and is not always a whole number:
            -- consumables carry values like '0.001', and a plain CAST AS
            -- INTEGER errors on those. The per-job version of this query hid
            -- that behind a try/except that rolled back and skipped the job
            -- entirely, so those jobs silently showed no inventory data at all.
            -- Parse as NUMERIC when it looks numeric, else 0 (the same rule
            -- KOSH's own shortage report uses); the caller rounds up.
            CASE WHEN bi.qty ~ '^[0-9]*\.?[0-9]+$' THEN bi.qty::numeric ELSE 0 END AS qty_per_board,
            COALESCE(SUM(m.onhandqty), 0) AS on_hand
        FROM bom_items bi
        LEFT JOIN matches m ON m.job = bi.job AND m.aci_pn = bi.aci_pn
        GROUP BY bi.job, bi.aci_pn, bi.qty
        """,
        (sorted(set(kosh_job_numbers)),),
    )
    rows = {}
    for job, qty_per_board, on_hand in cur.fetchall():
        rows.setdefault(job, []).append((qty_per_board, on_hand))
    return rows


def inventory_readiness(kosh_conn, job_numbers):
    """Readiness per NEXUS job number, in two KOSH queries for the whole set.

    Returns {job_number: {kosh_job_number, kosh_job_status, total_bom_lines,
    lines_with_stock, shortage_lines, inventory_ready}}. Jobs with no KOSH
    match are simply absent — callers report that as "no data", which is not
    the same as "no shortage".

    Any KOSH failure yields {} rather than raising: the forecast is still
    useful without inventory, and a half-applied result would be worse.
    """
    if kosh_conn is None or not job_numbers:
        return {}

    try:
        cur = kosh_conn.cursor()
        resolved = _resolve_jobs(cur, job_numbers)
        bom_by_job = _shortages(cur, [k for k, _, _ in resolved.values()])
    except Exception:
        # A failed query leaves the shared connection's transaction aborted;
        # roll back so the caller can keep using it.
        try:
            kosh_conn.rollback()
        except Exception:
            pass
        return {}

    readiness = {}
    for job_number, (kosh_job_number, order_qty, status) in resolved.items():
        bom_rows = bom_by_job.get(kosh_job_number, [])
        lines_with_stock = 0
        shortage_lines = 0
        for qty_per_board, on_hand in bom_rows:
            required = required_qty(qty_per_board, order_qty)
            if int(on_hand or 0) >= required:
                lines_with_stock += 1
            else:
                shortage_lines += 1
        readiness[job_number] = {
            "kosh_job_number": kosh_job_number,
            "kosh_job_status": status,
            "kosh_order_qty": order_qty,
            "total_bom_lines": len(bom_rows),
            "lines_with_stock": lines_with_stock,
            "shortage_lines": shortage_lines,
            "inventory_ready": shortage_lines == 0 and len(bom_rows) > 0,
        }
    return readiness

def shortage_lines(kosh_conn, kosh_job_numbers):
    """Per-part BOM/on-hand detail for a set of KOSH job numbers, in one query.

    Same join strategy and same numeric parsing as `inventory_readiness`; this
    one keeps the part number and description so callers can roll up a
    "most-wanted shortages" list. Returns
    {kosh_job_number: [(aci_pn, description, qty_per_board, on_hand), ...]}.
    """
    if kosh_conn is None or not kosh_job_numbers:
        return {}

    try:
        cur = kosh_conn.cursor()
        cur.execute(
            r"""
            WITH bom_items AS (
                SELECT DISTINCT ON (b.job, b.aci_pn) b.job, b.aci_pn, b.mpn, b.qty, b."DESC"
                FROM warehouse."tblBOM" b
                WHERE b.job = ANY(%s)
                ORDER BY b.job, b.aci_pn, b.line
            ),
            matches AS (
                SELECT bi.job, bi.aci_pn, w.id AS inv_id, w.onhandqty
                FROM bom_items bi
                JOIN warehouse."tblWhse_Inventory" w ON w.item = bi.aci_pn
                WHERE w.loc_to <> 'MFG Floor'
                UNION
                SELECT bi.job, bi.aci_pn, w.id, w.onhandqty
                FROM bom_items bi
                JOIN warehouse."tblWhse_Inventory" w ON w.mpn = bi.mpn
                WHERE w.loc_to <> 'MFG Floor'
            )
            SELECT
                bi.job,
                bi.aci_pn,
                bi."DESC",
                CASE WHEN bi.qty ~ '^[0-9]*\.?[0-9]+$' THEN bi.qty::numeric ELSE 0 END AS qty_per_board,
                COALESCE(SUM(m.onhandqty), 0) AS on_hand
            FROM bom_items bi
            LEFT JOIN matches m ON m.job = bi.job AND m.aci_pn = bi.aci_pn
            GROUP BY bi.job, bi.aci_pn, bi."DESC", bi.qty
            """,
            (sorted(set(kosh_job_numbers)),),
        )
    except Exception:
        try:
            kosh_conn.rollback()
        except Exception:
            pass
        return {}

    by_job = {}
    for job, aci_pn, description, qty_per_board, on_hand in cur.fetchall():
        by_job.setdefault(job, []).append((aci_pn, description, qty_per_board, on_hand))
    return by_job


def required_qty(qty_per_board, order_qty):
    """Units needed for the whole job, rounding a fractional per-board qty up."""
    return math.ceil(Decimal(qty_per_board or 0) * order_qty)
