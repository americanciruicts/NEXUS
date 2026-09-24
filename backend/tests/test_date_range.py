"""The Range picker must reach every endpoint that claims to honour it.

Before this, `/dashboard/insights`, `/analytics/all` and `/analytics/advanced`
took no date arguments at all, so four of the five Analytics tabs ignored the
picker — including Insights, the tab the page opens on, which made the control
look broken. These tests pin the parsing and, more importantly, that every
endpoint still ACCEPTS the parameters.
"""
import inspect
from datetime import datetime, timedelta, timezone

import pytest

from utils.date_range import parse_range, range_key, describe, FIXED_WINDOWS, DEFAULT_DAYS


def test_parses_the_pickers_date_strings():
    start, end = parse_range("2026-09-01", "2026-09-07")

    assert start.strftime("%Y-%m-%d %H:%M:%S") == "2026-09-01 00:00:00"
    assert end.strftime("%Y-%m-%d %H:%M:%S") == "2026-09-07 23:59:59"
    assert start.tzinfo == timezone.utc and end.tzinfo == timezone.utc


def test_end_of_day_is_inclusive():
    """A range ending 'today' must include work logged this afternoon."""
    _, end = parse_range("2026-09-01", "2026-09-07")
    same_day_evening = datetime(2026, 9, 7, 16, 30, tzinfo=timezone.utc)

    assert same_day_evening <= end


def test_missing_dates_fall_back_to_the_default_window():
    start, end = parse_range(None, None)

    assert (end - start).days == DEFAULT_DAYS


@pytest.mark.parametrize("bad_start,bad_end", [
    ("not-a-date", "2026-09-07"),
    ("2026-09-01", "garbage"),
    ("09/01/2026", "09/07/2026"),
    ("", ""),
])
def test_malformed_dates_fall_back_instead_of_raising(bad_start, bad_end):
    """The analytics page should still render if the query string is junk."""
    start, end = parse_range(bad_start, bad_end)

    assert start < end


def test_inverted_range_is_corrected():
    start, end = parse_range("2026-09-30", "2026-09-01")

    assert start < end


def test_cache_key_distinguishes_ranges():
    """Responses differ by range, so a shared cache key would serve stale data."""
    a = range_key(*parse_range("2026-09-01", "2026-09-07"))
    b = range_key(*parse_range("2026-08-01", "2026-09-07"))

    assert a != b


def test_describe_reports_inclusive_day_count():
    assert describe(*parse_range("2026-09-01", "2026-09-07")) == "Sep 01 – Sep 07 (7d)"


def test_every_ranged_endpoint_accepts_the_picker_dates():
    """The actual regression: these signatures had no date parameters."""
    from routers.dashboard import get_dashboard_stats, get_dashboard_insights
    from routers.analytics import get_analytics
    from routers.analytics_advanced import get_advanced_analytics

    for endpoint in (get_dashboard_stats, get_dashboard_insights,
                     get_analytics, get_advanced_analytics):
        params = inspect.signature(endpoint).parameters
        assert "start_date" in params, f"{endpoint.__name__} ignores start_date"
        assert "end_date" in params, f"{endpoint.__name__} ignores end_date"


def test_fixed_window_cards_declare_their_own_window():
    """Cards the picker cannot drive must say what window they DO use."""
    must_declare = [
        "on_time_delivery", "yield_trend", "daily_scorecard", "capacity_planning",
        "throughput_trend", "labor_hours_trend", "floor_status", "forecast",
    ]
    for card in must_declare:
        assert card in FIXED_WINDOWS, f"{card} has no declared window"
        assert FIXED_WINDOWS[card].strip(), f"{card} window label is empty"
