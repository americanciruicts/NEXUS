from pydantic import BaseModel
from typing import Dict, List, Any
from datetime import datetime


class DashboardStats(BaseModel):
    # Date range
    start_date: datetime
    end_date: datetime

    # Status Distribution
    status_distribution: Dict[str, int]

    # Labor Analytics
    total_labor_hours: float
    labor_by_work_center: List[Dict[str, Any]]
    labor_trend: List[Dict[str, Any]]

    # Production Metrics
    travelers_created: int
    travelers_completed: int
    completion_rate: float
    avg_completion_time_hours: float

    # Work Center Utilization
    work_center_utilization: List[Dict[str, Any]]

    # Top Employees
    top_employees: List[Dict[str, Any]]

    # Alerts
    pending_approvals: int
    on_hold_travelers: int
    overdue_travelers: int

    # Real-time Operations
    active_labor_entries: int
    active_tracking_entries: int

    class Config:
        from_attributes = True
