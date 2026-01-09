"""
Global Search Router
Provides search functionality across travelers, users, work orders, and labor entries
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from database import get_db
from models import Traveler, User, WorkOrder, LaborEntry, ProcessStep
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
