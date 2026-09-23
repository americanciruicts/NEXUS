"""Resolving a labor entry's department and work centre, without fan-out.

`work_centers` holds one row per (name, traveler_type): 231 active rows for 106
distinct names — SHIPPING alone appears 7 times. Any report that joined
`labor_entries.work_center` to `work_centers.name` therefore multiplied every
matching row, and `sum(hours_worked)` came out several times too high (the
department trend read 4,251h against an actual 1,523h over 30 days). Three
names — EPOXY, E. TEST, X-RAY — also carry genuinely different departments
across their duplicates, so the join double-counted those hours into two
departments at once.

The fix is to never join on name in SQL. `work_centers.code` IS unique, and a
labor entry reaches it exactly through step_id -> process_steps.work_center_code
(95% of entries), so that path is both precise and fan-out free. Name matching
survives only as the fallback for entries with no step link, deduplicated to one
department per name here in Python.
"""

from models import ProcessStep, WorkCenter


def _primary(department):
    """'Engineering/Prep' -> 'Engineering'; blank/None -> None."""
    if not department:
        return None
    head = department.split('/')[0].strip()
    return head or None


class DepartmentResolver:
    """Maps a work-centre code or name to a single department.

    Build once per request and call per row — it holds no session.
    """

    def __init__(self, by_code, by_name, step_to_code):
        self._by_code = by_code
        self._by_name = by_name
        self._step_to_code = step_to_code

    def for_entry(self, step_id, work_center_name):
        """Department for a labor entry, preferring the exact step -> code path."""
        code = self._step_to_code.get(step_id) if step_id else None
        if code and code in self._by_code:
            return self._by_code[code]
        return self.for_name(work_center_name)

    def for_name(self, work_center_name):
        if not work_center_name:
            return "Unknown"
        return self._by_name.get(work_center_name.strip().upper(), "Unknown")


def build_department_resolver(db) -> DepartmentResolver:
    work_centers = db.query(
        WorkCenter.code, WorkCenter.name, WorkCenter.department,
        WorkCenter.sort_order, WorkCenter.id,
    ).all()

    by_code = {}
    by_name = {}
    # Deterministic pick for duplicated names: a real department beats a blank
    # one, then lowest sort_order, then lowest id. Without an ordering the
    # department a name resolved to depended on row order from the database.
    best_for_name = {}
    for code, name, department, sort_order, wc_id in work_centers:
        dept = _primary(department)
        if code:
            by_code[code] = dept or "Unknown"
        if not name:
            continue
        key = name.strip().upper()
        rank = (0 if dept else 1, sort_order if sort_order is not None else 10**6, wc_id)
        if key not in best_for_name or rank < best_for_name[key][0]:
            best_for_name[key] = (rank, dept or "Unknown")
    by_name = {key: value for key, (_, value) in best_for_name.items()}

    step_to_code = dict(
        db.query(ProcessStep.id, ProcessStep.work_center_code)
        .filter(ProcessStep.work_center_code.isnot(None))
        .all()
    )

    return DepartmentResolver(by_code, by_name, step_to_code)


def distinct_active_work_centers(db):
    """Active work centres collapsed to one row per name.

    The floor-status heatmap iterated the raw table and so listed SHIPPING seven
    times, each tile repeating the same numbers.
    """
    seen = {}
    rows = db.query(WorkCenter).filter(WorkCenter.is_active == True).all()
    for wc in rows:
        if not wc.name:
            continue
        key = wc.name.strip().upper()
        rank = (
            0 if _primary(wc.department) else 1,
            wc.sort_order if wc.sort_order is not None else 10**6,
            wc.id,
        )
        if key not in seen or rank < seen[key][0]:
            seen[key] = (rank, wc)
    return [wc for _, wc in sorted(seen.values(), key=lambda pair: pair[0])]
