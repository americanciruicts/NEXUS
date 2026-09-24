"""Shared parsing for the dashboard/analytics Range picker.

The picker used to reach only `/dashboard/stats`. `/dashboard/insights`,
`/analytics/all` and `/analytics/advanced` took no date arguments at all, so
four of the five tabs on the Analytics page ignored it — including Insights,
which is the tab the page opens on, so the control looked broken.

Not every card can follow a range, and pretending otherwise would be worse than
ignoring it: a "12-week on-time trend" told to show 7 days is not a trend, and
"today's scorecard", "next 2 weeks capacity" and the open-job forecast are not
historical windows in the first place. Those keep their own window and declare
it via FIXED_WINDOWS so the UI can print it on the card and the user can see
why the picker does not move it.
"""

from datetime import datetime, timedelta, timezone

DEFAULT_DAYS = 30


def parse_range(start_date: str | None, end_date: str | None, default_days: int = DEFAULT_DAYS):
    """(start, end) as timezone-aware UTC datetimes covering whole days.

    Accepts the YYYY-MM-DD strings the picker sends. A malformed or inverted
    range falls back to the default window rather than raising — the analytics
    page should still render.
    """
    try:
        end_dt = (
            datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
            )
            if end_date else datetime.now(timezone.utc)
        )
    except (TypeError, ValueError):
        end_dt = datetime.now(timezone.utc)

    try:
        start_dt = (
            datetime.strptime(start_date, "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
            )
            if start_date else end_dt - timedelta(days=default_days)
        )
    except (TypeError, ValueError):
        start_dt = end_dt - timedelta(days=default_days)

    if start_dt > end_dt:
        start_dt = end_dt - timedelta(days=default_days)

    return start_dt, end_dt


def range_key(start_dt: datetime, end_dt: datetime) -> tuple:
    """Cache key component. Responses differ by range, so the cache must too."""
    return (start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"))


def describe(start_dt: datetime, end_dt: datetime) -> str:
    days = max((end_dt.date() - start_dt.date()).days, 0) + 1
    return f"{start_dt.strftime('%b %d')} – {end_dt.strftime('%b %d')} ({days}d)"


# Cards that deliberately keep their own window, and the label the UI shows so
# it is obvious the Range picker is not driving them.
FIXED_WINDOWS = {
    # /dashboard/insights
    "busiest_work_centers": "live now",
    "jobs_waiting_on_parts": "current stock",
    "top_shortages": "current stock",
    "bottlenecks_pending": "open work now",
    "due_date_heatmap": "open jobs now",
    "overdue_aging": "open jobs now",
    "throughput_trend": "last 8 weeks",
    "labor_hours_trend": "last 14 days",
    # /analytics/all
    "forgotten_clockouts": "live now",
    "daily_summary": "today",
    "kitting_trend_14d": "last 14 days",
    "kitting_throughput_8w": "last 8 weeks",
    "kitting_active_jobs": "open jobs now",
    # /analytics/advanced
    "on_time_delivery": "last 12 weeks",
    "yield_trend": "last 12 weeks",
    "predictive_late_alerts": "open jobs now",
    "daily_scorecard": "today",
    "capacity_planning": "next 2 weeks",
    "floor_status": "live now",
    "build_comparisons": "open jobs now",
    # /dashboard/stats
    "forecast": "all open jobs",
}
