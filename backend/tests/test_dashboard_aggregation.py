"""Dashboard and analytics aggregates must not double-count.

`work_centers` holds one row per (name, traveler_type) — 231 active rows for
106 distinct names, SHIPPING alone appearing 7 times. Every aggregate that
joined `labor_entries.work_center` to `work_centers.name`, or counted rows
across an outer join to `labor_entries`, was therefore multiplied. The
department trend reported 4,251 hours against an actual 1,523 over 30 days, and
three names (EPOXY, E. TEST, X-RAY) carry different departments across their
duplicates, so those hours landed in two departments at once.

These tests pin the shapes that caused it: resolve departments without a SQL
join on name, collapse duplicate work centres for per-work-centre listings, and
keep job-number matching wide enough to reach KOSH.
"""
import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base, WorkCenter, ProcessStep, Traveler, User, UserRole, TravelerType, TravelerStatus, Priority
from utils.work_center_lookup import build_department_resolver, distinct_active_work_centers
from utils.job_display import kosh_job_candidates

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
def duplicated_work_centers(db):
    """SHIPPING three times and X-RAY twice with conflicting departments."""
    rows = [
        WorkCenter(code="PCB_SHIPPING", name="SHIPPING", department="Shipping",
                   traveler_type="PCB", sort_order=1, is_active=True),
        WorkCenter(code="ASSY_SHIPPING", name="SHIPPING", department="Shipping",
                   traveler_type="PCB_ASSEMBLY", sort_order=2, is_active=True),
        WorkCenter(code="CABLE_SHIPPING", name="SHIPPING", department="Shipping",
                   traveler_type="CABLE", sort_order=3, is_active=True),
        WorkCenter(code="PCB_XRAY", name="X-RAY", department="SMT/Soldering/Test",
                   traveler_type="PCB", sort_order=1, is_active=True),
        WorkCenter(code="ASSY_XRAY", name="X-RAY", department="Test",
                   traveler_type="PCB_ASSEMBLY", sort_order=2, is_active=True),
    ]
    db.add_all(rows)
    db.commit()
    return rows


def test_duplicate_names_collapse_to_one_entry(db, duplicated_work_centers):
    """The floor-status heatmap rendered one tile per row, so SHIPPING x3."""
    collapsed = distinct_active_work_centers(db)
    names = [wc.name for wc in collapsed]

    assert sorted(names) == ["SHIPPING", "X-RAY"]
    assert len(names) == len(set(names))


def test_department_resolves_by_unique_code_not_ambiguous_name(db, duplicated_work_centers):
    """X-RAY maps to two departments; the step's code says which one applies."""
    user = User(username="u", email="u", first_name="U", last_name="U",
                hashed_password="x", role=UserRole.OPERATOR, is_active=True)
    db.add(user)
    db.flush()
    t = Traveler(job_number="9001L", traveler_type=TravelerType.PCB_ASSEMBLY,
                 part_number="P", part_description="d", revision="A", quantity=1,
                 work_center="X-RAY", status=TravelerStatus.IN_PROGRESS,
                 priority=Priority.NORMAL, created_by=user.id)
    db.add(t)
    db.flush()
    pcb_step = ProcessStep(traveler_id=t.id, step_number=1, operation="X-RAY",
                           work_center_code="PCB_XRAY", instructions="i")
    assy_step = ProcessStep(traveler_id=t.id, step_number=2, operation="X-RAY",
                            work_center_code="ASSY_XRAY", instructions="i")
    db.add_all([pcb_step, assy_step])
    db.commit()

    resolver = build_department_resolver(db)

    assert resolver.for_entry(pcb_step.id, "X-RAY") == "SMT"   # 'SMT/Soldering/Test'
    assert resolver.for_entry(assy_step.id, "X-RAY") == "Test"


def test_name_fallback_is_deterministic_for_duplicates(db, duplicated_work_centers):
    """Entries with no step link fall back to the name, which must not flap."""
    resolver = build_department_resolver(db)

    assert resolver.for_name("X-RAY") == "SMT"       # lowest sort_order wins
    assert resolver.for_name("SHIPPING") == "Shipping"
    assert resolver.for_name("shipping") == "Shipping"   # case/space insensitive
    assert resolver.for_name("  SHIPPING ") == "Shipping"


def test_unknown_and_missing_work_centers_do_not_raise(db, duplicated_work_centers):
    resolver = build_department_resolver(db)

    assert resolver.for_name(None) == "Unknown"
    assert resolver.for_name("") == "Unknown"
    assert resolver.for_name("NOT A WORK CENTRE") == "Unknown"
    assert resolver.for_entry(None, None) == "Unknown"
    assert resolver.for_entry(99999, "NOPE") == "Unknown"


def test_resolver_attributes_each_entry_exactly_once(db, duplicated_work_centers):
    """The property the old SQL join broke: one entry, one department.

    Resolving in Python cannot multiply rows the way joining on a duplicated
    name did, so summing hours through the resolver conserves the total.
    """
    resolver = build_department_resolver(db)
    entries = [(None, "SHIPPING", 4.0), (None, "X-RAY", 2.0), (None, "SHIPPING", 1.5)]

    totals = {}
    for step_id, work_center, hours in entries:
        dept = resolver.for_entry(step_id, work_center)
        totals[dept] = totals.get(dept, 0) + hours

    assert sum(totals.values()) == pytest.approx(7.5)
    assert totals == {"Shipping": 5.5, "SMT": 2.0}


@pytest.mark.parametrize("job_number,expected_first_two", [
    ("8666L CABLE", ["8666L CABLE", "8666L"]),   # ~59% of open jobs look like this
    ("5477 ASSY", ["5477 ASSY", "5477"]),
    ("8573ML ASSY", ["8573ML ASSY", "8573ML"]),
    ("8825L", ["8825L", "8825"]),
])
def test_kosh_candidates_strip_the_work_descriptor(job_number, expected_first_two):
    """KOSH stores '8666L'; NEXUS files it as '8666L CABLE'.

    rstrip('LM') alone does nothing to a value ending in 'CABLE' or 'ASSY', so
    only 83 of 264 open travelers resolved against KOSH; dropping the descriptor
    takes that to 189. A miss reads as "no shortage data", which on the
    dashboard is indistinguishable from "no shortage".
    """
    assert kosh_job_candidates(job_number)[:2] == expected_first_two


def test_kosh_candidates_try_exact_value_first():
    """A job genuinely named with a suffix must not be pre-empted by the base."""
    assert kosh_job_candidates("8666L")[0] == "8666L"


def test_kosh_candidates_never_produce_empty_or_duplicates():
    for value in ["", None, "   ", "ASSY", "8825", "8825L CABLE ASSY"]:
        candidates = kosh_job_candidates(value)
        assert all(candidates), f"empty candidate for {value!r}"
        assert len(candidates) == len(set(candidates)), f"duplicates for {value!r}"
