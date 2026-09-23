"""Auto-stop closes forgotten timers at 5 PM PLANT time, not 5 PM UTC.

The containers and every timestamp column run in UTC, but "close any timer left
running from a previous day at shift end" is a local shop-floor rule. Evaluating
it in UTC stamped 17:00 UTC = 12:00 PM Central: entries were closed mid-shift,
and anyone who had started after noon local got an end_time BEFORE their
start_time, which clamped to hours_worked = 0 and erased a real afternoon of
work. 31 rows were damaged that way between 2026-04-02 and 2026-09-17, 22 of
them recorded as zero hours.

Two follow-on traps are covered here as well, because both land back at zero:
pauses left open overnight (rows exist carrying 16-90h of "pause"), and
overlapping pause rows that would subtract the same wall-clock twice.
"""
import pytest
from datetime import datetime, timedelta, timezone, time as dt_time

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import routers.labor as labor
from routers.labor import PLANT_TZ, SHIFT_END_HOUR, auto_stop_stale_entries, _to_plant_local
from models import (
    Base, Traveler, LaborEntry, PauseLog, User, UserRole, TravelerStatus,
    TravelerType, Priority,
)

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def traveler(db):
    user = User(username="op@test", email="op@test", first_name="O", last_name="P",
                hashed_password="x", role=UserRole.OPERATOR, is_active=True)
    db.add(user)
    db.flush()
    t = Traveler(job_number="9001L", traveler_type=TravelerType.PCB_ASSEMBLY,
                 part_number="PN-1", part_description="d", revision="A", quantity=10,
                 work_center="SMT", status=TravelerStatus.IN_PROGRESS,
                 priority=Priority.NORMAL, created_by=user.id)
    db.add(t)
    db.commit()
    return t


@pytest.fixture
def yesterday():
    return (datetime.now(PLANT_TZ) - timedelta(days=1)).date()


@pytest.fixture
def past_shift_end(monkeypatch):
    """Freeze the clock to 18:00 plant-local so the shift-end gate is open."""
    real = labor.datetime
    frozen = real.now(PLANT_TZ).replace(hour=18, minute=0, second=0, microsecond=0)

    class FrozenDateTime(real):
        @classmethod
        def now(cls, tz=None):
            return frozen if tz else frozen.replace(tzinfo=None)

    monkeypatch.setattr(labor, "datetime", FrozenDateTime)
    return frozen


def _entry(db, traveler, day, hour, minute=0, employee_id=None):
    """A timer left running from `day` at `hour` plant-local."""
    start = datetime.combine(day, dt_time(hour=hour, minute=minute), tzinfo=PLANT_TZ)
    e = LaborEntry(
        traveler_id=traveler.id,
        employee_id=employee_id or traveler.created_by,
        start_time=start.astimezone(timezone.utc),
        is_completed=False,
        work_center="SMT",
        hours_worked=0.0,
    )
    db.add(e)
    db.flush()
    return e


def _pause(db, entry, day, from_hour, to_hour):
    """to_hour=None leaves the pause open, as happens when someone goes home."""
    paused = datetime.combine(day, dt_time(hour=from_hour), tzinfo=PLANT_TZ)
    resumed = (
        datetime.combine(day, dt_time(hour=to_hour), tzinfo=PLANT_TZ)
        if to_hour is not None else None
    )
    db.add(PauseLog(
        labor_entry_id=entry.id,
        paused_at=paused.astimezone(timezone.utc),
        resumed_at=resumed.astimezone(timezone.utc) if resumed else None,
        duration_seconds=(to_hour - from_hour) * 3600 if to_hour is not None else None,
        reason="BREAK",
    ))
    db.flush()


def test_gate_uses_plant_time_not_utc(db, traveler, yesterday, monkeypatch):
    """At 12:00 plant time nothing is closed, even though that is 17:00 UTC.

    This is the original bug: the gate was `datetime.now().hour >= 17` on a UTC
    clock, so it fired at lunchtime on the floor.
    """
    real = labor.datetime
    noon_local = real.now(PLANT_TZ).replace(hour=12, minute=0, second=0, microsecond=0)
    assert noon_local.astimezone(timezone.utc).hour == 17, "premise: noon CT is 17:00 UTC"

    class FrozenDateTime(real):
        @classmethod
        def now(cls, tz=None):
            return noon_local if tz else noon_local.replace(tzinfo=None)

    monkeypatch.setattr(labor, "datetime", FrozenDateTime)

    entry = _entry(db, traveler, yesterday, 8)
    assert auto_stop_stale_entries(db, commit=False) == 0
    assert entry.end_time is None
    assert entry.is_completed is False


def test_closes_at_shift_end_on_the_entrys_own_date(db, traveler, yesterday, past_shift_end):
    entry = _entry(db, traveler, yesterday, 8)

    assert auto_stop_stale_entries(db, commit=False) == 1
    assert _to_plant_local(entry.end_time).hour == SHIFT_END_HOUR
    assert _to_plant_local(entry.end_time).date() == yesterday
    assert entry.hours_worked == 9.0  # 08:00 -> 17:00
    assert entry.is_completed is True


def test_end_time_is_not_17_00_utc(db, traveler, yesterday, past_shift_end):
    """The damaged rows are identifiable by end_time::time = '17:00:00' UTC."""
    entry = _entry(db, traveler, yesterday, 8)
    auto_stop_stale_entries(db, commit=False)

    assert entry.end_time.astimezone(timezone.utc).strftime("%H:%M") != "17:00"


def test_hours_are_never_negative_or_zeroed_for_a_worked_shift(db, traveler, yesterday, past_shift_end):
    """An entry started after noon local used to end up at exactly 0.0 hours."""
    entry = _entry(db, traveler, yesterday, 13, 46)  # the real id=2876 case

    auto_stop_stale_entries(db, commit=False)

    assert entry.end_time > entry.start_time
    assert entry.hours_worked > 0


def test_real_break_is_subtracted(db, traveler, yesterday, past_shift_end):
    entry = _entry(db, traveler, yesterday, 9)
    _pause(db, entry, yesterday, 12, 13)

    auto_stop_stale_entries(db, commit=False)

    assert entry.hours_worked == 7.0  # 09:00 -> 17:00 less a 1h break


def test_overnight_pause_is_clipped_to_the_shift(db, traveler, yesterday, past_shift_end):
    """A pause left open at 15:00 must count 2h, not run until 'now'.

    Production rows carry 16-90h of pause this way; subtracting that raw would
    drive the shift straight back to zero hours.
    """
    entry = _entry(db, traveler, yesterday, 10)
    _pause(db, entry, yesterday, 15, None)

    auto_stop_stale_entries(db, commit=False)

    assert entry.hours_worked == 5.0  # 10:00 -> 17:00 less 15:00 -> 17:00
    closed = db.query(PauseLog).filter(PauseLog.labor_entry_id == entry.id).one()
    assert closed.resumed_at is not None, "open pause must stop accruing"
    assert _to_plant_local(closed.resumed_at).hour == SHIFT_END_HOUR
    assert closed.duration_seconds == 2 * 3600


def test_overlapping_pauses_are_not_double_counted(db, traveler, yesterday, past_shift_end):
    entry = _entry(db, traveler, yesterday, 11)
    _pause(db, entry, yesterday, 12, 15)
    _pause(db, entry, yesterday, 13, 16)  # overlaps the first

    auto_stop_stale_entries(db, commit=False)

    # Union of the pauses is 12:00-16:00 = 4h, not 3h + 3h = 6h.
    assert entry.hours_worked == 2.0  # 11:00 -> 17:00 less 4h


def test_entry_started_after_shift_end_is_left_open(db, traveler, yesterday, past_shift_end):
    """There is no defensible end time, so it is not written down as zero."""
    entry = _entry(db, traveler, yesterday, 18)

    assert auto_stop_stale_entries(db, commit=False) == 0
    assert entry.end_time is None
    assert entry.is_completed is False
    assert entry.hours_worked == 0.0


def test_todays_running_timer_is_not_touched(db, traveler, past_shift_end):
    today = datetime.now(PLANT_TZ).date()
    entry = _entry(db, traveler, today, 8)

    assert auto_stop_stale_entries(db, commit=False) == 0
    assert entry.end_time is None


def test_auto_stop_does_not_mark_the_step_or_traveler_complete(db, traveler, yesterday, past_shift_end):
    """A forgotten clock-out is not finished work.

    Two now-removed endpoints called update_step_and_traveler_progress here,
    which marks the step done and can flip the whole traveler to COMPLETED.
    """
    entry = _entry(db, traveler, yesterday, 8)

    auto_stop_stale_entries(db, commit=False)

    assert entry.is_completed is True  # the timer is closed...
    db.refresh(traveler)
    assert traveler.status == TravelerStatus.IN_PROGRESS  # ...the job is not


@pytest.mark.parametrize("month,day,expected_utc_hour", [(7, 1, 22), (1, 15, 23)])
def test_shift_end_follows_daylight_saving(month, day, expected_utc_hour):
    """17:00 local is 22:00 UTC in CDT and 23:00 UTC in CST.

    A hardcoded UTC hour cannot express that, which is why the constant lives in
    plant time and is converted per date.
    """
    local = datetime(2026, month, day, SHIFT_END_HOUR, 0, tzinfo=PLANT_TZ)
    assert local.astimezone(timezone.utc).hour == expected_utc_hour
