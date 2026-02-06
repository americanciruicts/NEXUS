"""
Global Search Router
Provides search functionality across travelers, users, work orders, and labor entries
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, distinct
from typing import List, Optional
from database import get_db
from models import Traveler, User, WorkOrder, LaborEntry, ProcessStep, WorkCenter, UserRole
from routers.auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results per category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Global search across all entities
    Returns travelers, users, work orders matching the search query
    """

    search_term = f"%{q}%"

    # Search Travelers
    travelers = db.query(Traveler).filter(
        and_(
            Traveler.is_active == True,
            or_(
                Traveler.job_number.ilike(search_term),
                Traveler.work_order_number.ilike(search_term),
                Traveler.part_number.ilike(search_term),
                Traveler.part_description.ilike(search_term),
                Traveler.customer_name.ilike(search_term),
                Traveler.customer_code.ilike(search_term)
            )
        )
    ).limit(limit).all()

    traveler_results = [
        {
            "id": t.id,
            "type": "traveler",
            "title": t.job_number,
            "subtitle": f"{t.part_description} - {t.status}",
            "description": f"Part: {t.part_number} | Customer: {t.customer_name or 'N/A'}",
            "url": f"/travelers/{t.id}",
            "status": t.status,
            "metadata": {
                "work_order": t.work_order_number,
                "revision": t.revision,
                "quantity": t.quantity
            }
        }
        for t in travelers
    ]

    # Search Users (only for ADMIN role)
    user_results = []
    if current_user.role == "ADMIN":
        users = db.query(User).filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term)
            )
        ).limit(limit).all()

        user_results = [
            {
                "id": u.id,
                "type": "user",
                "title": u.username,
                "subtitle": f"{u.first_name} {u.last_name}",
                "description": f"Role: {u.role} | Email: {u.email}",
                "url": f"/users",
                "status": "active" if u.is_active else "inactive",
                "metadata": {
                    "role": u.role,
                    "is_approver": u.is_approver
                }
            }
            for u in users
        ]

    # Search Work Orders
    work_orders = db.query(WorkOrder).filter(
        or_(
            WorkOrder.work_order_number.ilike(search_term),
            WorkOrder.customer_name.ilike(search_term),
            WorkOrder.po_number.ilike(search_term)
        )
    ).limit(limit).all()

    work_order_results = [
        {
            "id": wo.id,
            "type": "work_order",
            "title": wo.work_order_number,
            "subtitle": f"{wo.customer_name}",
            "description": f"PO: {wo.po_number or 'N/A'} | Status: {wo.status}",
            "url": f"/travelers?wo={wo.work_order_number}",
            "status": wo.status,
            "metadata": {
                "quantity": wo.quantity,
                "due_date": wo.due_date
            }
        }
        for wo in work_orders
    ]

    # Search Labor Entries (recent ones)
    labor_entries = db.query(LaborEntry).join(Traveler).filter(
        or_(
            LaborEntry.description.ilike(search_term),
            Traveler.job_number.ilike(search_term)
        )
    ).order_by(LaborEntry.start_time.desc()).limit(limit).all()

    labor_results = [
        {
            "id": le.id,
            "type": "labor",
            "title": f"Labor Entry - {le.traveler.job_number if le.traveler else 'Unknown'}",
            "subtitle": le.description or "No description",
            "description": f"Duration: {le.duration or 'N/A'} | {'Completed' if le.is_completed else 'In Progress'}",
            "url": f"/labor-tracking",
            "status": "completed" if le.is_completed else "in_progress",
            "metadata": {
                "start_time": le.start_time.isoformat() if le.start_time else None,
                "work_center": le.work_center
            }
        }
        for le in labor_entries
    ]

    return {
        "query": q,
        "results": {
            "travelers": traveler_results,
            "users": user_results,
            "work_orders": work_order_results,
            "labor_entries": labor_results
        },
        "total_results": len(traveler_results) + len(user_results) + len(work_order_results) + len(labor_results)
    }


@router.get("/travelers")
async def search_travelers(
    q: str = Query(..., min_length=1),
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search specifically for travelers with advanced filters"""

    search_term = f"%{q}%"

    query = db.query(Traveler).filter(
        and_(
            Traveler.is_active == True,
            or_(
                Traveler.job_number.ilike(search_term),
                Traveler.work_order_number.ilike(search_term),
                Traveler.part_number.ilike(search_term),
                Traveler.part_description.ilike(search_term)
            )
        )
    )

    if status:
        query = query.filter(Traveler.status == status)

    travelers = query.limit(limit).all()

    return [
        {
            "id": t.id,
            "job_number": t.job_number,
            "work_order_number": t.work_order_number,
            "part_number": t.part_number,
            "part_description": t.part_description,
            "status": t.status,
            "customer_name": t.customer_name,
            "work_center": t.work_center,
            "quantity": t.quantity,
            "revision": t.revision
        }
        for t in travelers
    ]


@router.get("/autocomplete/job-numbers")
async def autocomplete_job_numbers(
    q: str = Query("", description="Search query - leave empty for all active jobs"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., 'IN_PROGRESS', 'COMPLETED')"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Autocomplete endpoint for job numbers
    Returns matching job numbers with part description and customer name for context
    """

    query = db.query(Traveler).filter(Traveler.is_active == True)

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Traveler.job_number.ilike(search_term),
                Traveler.part_description.ilike(search_term),
                Traveler.customer_name.ilike(search_term)
            )
        )

    if status:
        query = query.filter(Traveler.status == status)

    # Order by most recently created first, then by job number
    travelers = query.order_by(Traveler.created_at.desc()).limit(limit).all()

    return [
        {
            "id": t.id,
            "job_number": t.job_number,
            "part_description": t.part_description,
            "customer_name": t.customer_name,
            "status": t.status,
            "label": f"{t.job_number} - {t.part_description[:50]}{'...' if len(t.part_description) > 50 else ''}",
            "value": t.job_number
        }
        for t in travelers
    ]


@router.get("/autocomplete/work-centers")
async def autocomplete_work_centers(
    q: str = Query("", description="Search query - leave empty for all"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    include_inactive: bool = Query(False, description="Include inactive work centers"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Autocomplete endpoint for work centers
    Combines data from WorkCenter table and distinct values from labor/process entries
    """

    results = []

    # Get from WorkCenter table
    wc_query = db.query(WorkCenter)

    if not include_inactive:
        wc_query = wc_query.filter(WorkCenter.is_active == True)

    if q:
        search_term = f"%{q}%"
        wc_query = wc_query.filter(
            or_(
                WorkCenter.code.ilike(search_term),
                WorkCenter.name.ilike(search_term),
                WorkCenter.description.ilike(search_term)
            )
        )

    work_centers = wc_query.order_by(WorkCenter.code).limit(limit).all()

    for wc in work_centers:
        results.append({
            "code": wc.code,
            "name": wc.name,
            "description": wc.description,
            "is_active": wc.is_active,
            "label": f"{wc.code} - {wc.name}",
            "value": wc.code
        })

    # If we haven't reached the limit, also get distinct work centers from labor entries
    if len(results) < limit:
        remaining = limit - len(results)
        existing_codes = {r["code"] for r in results}

        # Get distinct work centers from LaborEntry
        labor_wc_query = db.query(distinct(LaborEntry.work_center)).filter(
            LaborEntry.work_center.isnot(None),
            LaborEntry.work_center != ""
        )

        if q:
            search_term = f"%{q}%"
            labor_wc_query = labor_wc_query.filter(LaborEntry.work_center.ilike(search_term))

        labor_wcs = labor_wc_query.limit(remaining * 2).all()  # Get extra in case of duplicates

        for (wc,) in labor_wcs:
            if wc not in existing_codes and len(results) < limit:
                results.append({
                    "code": wc,
                    "name": wc,
                    "description": "From labor entries",
                    "is_active": True,
                    "label": wc,
                    "value": wc
                })
                existing_codes.add(wc)

    return results[:limit]


@router.get("/autocomplete/operators")
async def autocomplete_operators(
    q: str = Query("", description="Search query - leave empty for all"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    active_only: bool = Query(True, description="Only return active users"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Autocomplete endpoint for operator names
    Returns users with OPERATOR or ADMIN role
    """

    query = db.query(User).filter(
        or_(
            User.role == UserRole.OPERATOR,
            User.role == UserRole.ADMIN
        )
    )

    if active_only:
        query = query.filter(User.is_active == True)

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.username.ilike(search_term),
                func.concat(User.first_name, ' ', User.last_name).ilike(search_term)
            )
        )

    users = query.order_by(User.first_name, User.last_name).limit(limit).all()

    return [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "username": u.username,
            "full_name": f"{u.first_name} {u.last_name}",
            "is_active": u.is_active,
            "role": u.role.value,
            "label": f"{u.first_name} {u.last_name} ({u.username})",
            "value": f"{u.first_name} {u.last_name}"
        }
        for u in users
    ]
