"""
Thread 9C: User Task Projection Test Suite
Tests the intersection: ReadingRoundMeter ∩ OperationalAssignment -> My Operational Tasks.
Verifies all 43 contract cases across projection, authorization, counting, legacy dynamic, and diagnostics.
"""

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth import hash_password
from backend.app.config import get_settings
from backend.app.db import Base, get_db, migrate_db
from backend.app.main import app
from backend.app.meter_logbook import confirm_meter_reading, mark_meter_review
from backend.app.models import (
    Meter,
    MeterReading,
    OperationalAssignment,
    OperationalZone,
    ReadingBatch,
    ReadingRound,
    ReadingRoundMeter,
    User,
    WorkSchedule,
    ZoneAssignment,
)
from backend.app.schemas import ConfirmReadingRequest, MarkReviewRequest
from backend.app.user_tasks import (
    get_covering_assignments_for_round,
    get_round_task_coverage_diagnostics,
    resolve_user_round_tasks,
    validate_meter_user_task_authority,
)

LOCAL_TZ = ZoneInfo(get_settings().timezone)
TEST_DATE = "2026-09-24"


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    migrate_db(engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session):
    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def create_user(db, code="EMP01", name="Nguyen Van A", role="EMPLOYEE", active=True):
    user = User(
        id=str(uuid.uuid4()),
        employee_code=code,
        full_name=name,
        password_hash=hash_password("Password123!"),
        role=role,
        is_active=active,
    )
    db.add(user)
    db.flush()
    return user


def create_zone(db, code="Z1", name="Khu Vuc 1"):
    zone = OperationalZone(
        id=str(uuid.uuid4()),
        code=code,
        name=name,
        map_polygon="[]",
        is_active=True,
    )
    db.add(zone)
    db.flush()
    return zone


def create_meter(db, code, zone_id=None, utility="ELECTRICITY", active=True, lifecycle="ACTIVE"):
    meter = Meter(
        id=str(uuid.uuid4()),
        meter_code=code,
        name=f"Công tơ {code}",
        meter_type="LCD",
        utility_type=utility,
        zone_id=zone_id,
        presentation_zone_id="PZ1" if zone_id else None,
        is_active=active,
        lifecycle_status=lifecycle,
    )
    db.add(meter)
    db.flush()
    return meter


def create_batch(db, period_key="2026-09"):
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name=f"Đợt kiểm thử {period_key}",
        period_key=period_key,
        status="OPEN",
    )
    db.add(batch)
    db.flush()
    return batch


def create_round(db, batch, scheduled_at, scope_meters=None, scope_mode="SNAPSHOT", status="OPEN"):
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=scheduled_at,
        status=status,
        is_legacy=False,
        scope_mode=scope_mode,
        created_at=datetime.now(timezone.utc),
    )
    db.add(round_obj)
    db.flush()
    if scope_mode == "SNAPSHOT" and scope_meters:
        for m in scope_meters:
            db.add(
                ReadingRoundMeter(
                    id=str(uuid.uuid4()),
                    reading_round_id=round_obj.id,
                    meter_id=m.id,
                    meter_code_snapshot=m.meter_code,
                    meter_name_snapshot=m.name,
                    zone_id_snapshot=m.zone_id,
                    presentation_zone_id_snapshot=m.presentation_zone_id,
                    utility_type_snapshot=m.utility_type,
                    scope_origin="ALL_ELIGIBLE",
                    scope_status="SCHEDULED",
                    created_at=datetime.now(timezone.utc),
                )
            )
        db.flush()
    return round_obj


def create_schedule(db, user, shift_code="CA1", work_date=TEST_DATE):
    sched = WorkSchedule(
        id=str(uuid.uuid4()),
        user_id=user.id,
        work_date=work_date,
        shift_code=shift_code,
        status="SCHEDULED",
    )
    db.add(sched)
    db.flush()
    return sched


def create_assignment(db, user, zone, shift_code="CA1", work_date=TEST_DATE, role="PRIMARY", status="ASSIGNED"):
    assign = OperationalAssignment(
        id=str(uuid.uuid4()),
        work_date=work_date,
        shift_code=shift_code,
        zone_id=zone.id,
        user_id=user.id,
        assignment_role=role,
        status=status,
        created_by=user.id,
    )
    db.add(assign)
    db.flush()
    return assign


def client_login(client, employee_code="EMP01", password="Password123!"):
    res = client.post("/api/v1/auth/login", json={"employee_code": employee_code, "password": password})
    assert res.status_code == 200
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    return csrf.json()["csrf_token"]


# ============================================================================
# Core Projection Cases (01 - 24)
# ============================================================================

def test_01_single_zone_primary_projection(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z1.id)
    m3 = create_meter(db_session, "M3", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2, m3])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id, date_filter="2026-09-24")
    assert resp.summary.assigned_total == 2
    assert len(resp.meters) == 2
    codes = {item.meter.meter_code for item in resp.meters}
    assert codes == {"M1", "M2"}
    assert resp.meters[0].assignment_role == "PRIMARY"
    assert resp.global_round_total == 3


def test_02_multiple_assigned_zones_union(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    z3 = create_zone(db_session, "Z3")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)
    m3 = create_meter(db_session, "M3", zone_id=z3.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2, m3])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u1, z2, "CA1", "2026-09-24", role="SUPPORT")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 2
    codes = {item.meter.meter_code for item in resp.meters}
    assert codes == {"M1", "M2"}
    assert resp.summary.assigned_zone_count == 2
    assert resp.summary.primary_zone_count == 1
    assert resp.summary.support_zone_count == 1


def test_03_no_assignment_returns_empty_and_state(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert len(resp.meters) == 0
    assert resp.empty_reason == "NO_ASSIGNMENT"
    assert resp.summary.percent_complete == 0


def test_04_no_meters_in_assigned_zone(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z2, "CA1", "2026-09-24", role="PRIMARY")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert len(resp.meters) == 0
    assert resp.empty_reason == "NO_METERS_IN_ZONE"


def test_05_zone_isolation(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert len(resp.meters) == 1
    assert resp.meters[0].meter.meter_code == "M1"
    assert "M2" not in [x.meter.meter_code for x in resp.meters]


def test_06_legacy_zone_assignment_ignored(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    # Add legacy ZoneAssignment
    db_session.add(
        ZoneAssignment(
            id=str(uuid.uuid4()),
            zone_id=z1.id,
            user_id=u1.id,
            assignment_role="PRIMARY",
            effective_from=datetime.now(timezone.utc),
        )
    )
    db_session.flush()

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # No OperationalAssignment exists!
    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert resp.empty_reason == "NO_ASSIGNMENT"


def test_07_primary_and_support_visibility(db_session):
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24", role="SUPPORT")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert len(r1.meters) == 1 and r1.meters[0].assignment_role == "PRIMARY"
    assert len(r2.meters) == 1 and r2.meters[0].assignment_role == "SUPPORT"
    assert r1.meters[0].meter.id == r2.meters[0].meter.id


def test_08_shared_task_state_update(db_session):
    u1 = create_user(db_session, "U1", name="User A")
    u2 = create_user(db_session, "U2", name="User B")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24", role="SUPPORT")

    # User 1 confirms reading
    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=rnd.id,
        reading="1234.5",
        ocr_reading=None,
        confirmation_source="MANUAL_ENTRY",
    )
    confirm_meter_reading(db_session, u1, req)

    # Verify User 2 sees it confirmed by User 1
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)
    assert r2.summary.confirmed == 1
    assert r2.meters[0].current_status == "CONFIRMED"
    assert r2.meters[0].current_reading == "1234.5"
    assert r2.meters[0].recorded_by is not None
    assert r2.meters[0].recorded_by.employee_code == "U1"
    assert r2.meters[0].recorded_by.full_name == "User A"


def test_09_null_zone_snapshot_excluded(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m_no_zone = create_meter(db_session, "M_NO_ZONE", zone_id=None)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m_no_zone])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert len(resp.meters) == 1
    assert resp.meters[0].meter.meter_code == "M1"


def test_10_immutable_snapshot_isolation(db_session):
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # Now change Meter.zone_id in DB to Z2
    m1.zone_id = z2.id
    db_session.flush()

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u2, z2, "CA1", "2026-09-24", role="PRIMARY")

    # U1 (assigned Z1) should still get M1 because zone_id_snapshot is Z1!
    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert len(r1.meters) == 1
    assert r1.meters[0].meter.meter_code == "M1"

    # U2 (assigned Z2) gets 0 tasks!
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)
    assert len(r2.meters) == 0


def test_11_cancelled_assignment_ignored(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY", status="CANCELLED")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert resp.empty_reason == "NO_ASSIGNMENT"


def test_12_replaced_assignment(db_session):
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY", status="CANCELLED")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24", role="PRIMARY", status="ASSIGNED")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert r1.summary.assigned_total == 0
    assert r2.summary.assigned_total == 1


def test_13_ca1_start_boundary(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    # Exact 06:00
    dt = datetime(2026, 9, 24, 6, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 1


def test_14_ca1_end_boundary(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    # 13:59 (inside CA1)
    dt = datetime(2026, 9, 24, 13, 59, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 1


def test_15_ca1_ca2_boundary(db_session):
    # 14:00 belongs to CA2, NOT CA1 (half-open [06:00, 14:00) vs [14:00, 22:00))
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 14, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    create_schedule(db_session, u2, "CA2", "2026-09-24")
    create_assignment(db_session, u2, z1, "CA2", "2026-09-24")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert r1.summary.assigned_total == 0
    assert r2.summary.assigned_total == 1


def test_16_ca2_ca3_boundary(db_session):
    # 22:00 belongs to CA3, NOT CA2
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 22, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA2", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA2", "2026-09-24")

    create_schedule(db_session, u2, "CA3", "2026-09-24")
    create_assignment(db_session, u2, z1, "CA3", "2026-09-24")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert r1.summary.assigned_total == 0
    assert r2.summary.assigned_total == 1


def test_17_ca3_overnight_resolution(db_session):
    # CA3 starts 2026-09-23 22:00 and ends 2026-09-24 06:00.
    # Round is at 2026-09-24 02:00. It must resolve to CA3 of 2026-09-23!
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 2, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA3", "2026-09-23")
    create_assignment(db_session, u1, z1, "CA3", "2026-09-23")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 1
    assert resp.meters[0].meter.meter_code == "M1"
    assert resp.assignment_context.work_date == "2026-09-23"
    assert resp.assignment_context.shift_code == "CA3"


def test_18_ca3_morning_end_boundary(db_session):
    # At 2026-09-24 06:00, 2026-09-23 CA3 has ended, and 2026-09-24 CA1 begins.
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 6, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA3", "2026-09-23")
    create_assignment(db_session, u1, z1, "CA3", "2026-09-23")

    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert r1.summary.assigned_total == 0
    assert r2.summary.assigned_total == 1


def test_19_overlapping_shifts_different_zones(db_session):
    # HC (07:30 - 16:30) overlaps CA1 (06:00 - 14:00)
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)
    b = create_batch(db_session)

    # 09:00 round
    dt = datetime(2026, 9, 24, 9, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    create_schedule(db_session, u2, "HC", "2026-09-24")
    create_assignment(db_session, u2, z2, "HC", "2026-09-24")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert [m.meter.meter_code for m in r1.meters] == ["M1"]
    assert [m.meter.meter_code for m in r2.meters] == ["M2"]


def test_20_overlapping_shifts_same_zone(db_session):
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 9, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")

    create_schedule(db_session, u2, "HC", "2026-09-24")
    create_assignment(db_session, u2, z1, "HC", "2026-09-24", role="SUPPORT")

    r1 = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    r2 = resolve_user_round_tasks(db_session, u2, round_id=rnd.id)

    assert len(r1.meters) == 1 and r1.meters[0].assignment_role == "PRIMARY"
    assert len(r2.meters) == 1 and r2.meters[0].assignment_role == "SUPPORT"


def test_21_deduplication_role_priority(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 9, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u1, z1, "HC", "2026-09-24", role="SUPPORT")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert len(resp.meters) == 1
    assert resp.meters[0].assignment_role == "PRIMARY"


def test_22_empty_state_no_round(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # No rounds created for today
    resp = resolve_user_round_tasks(db_session, u1, date_filter="2026-09-24")
    assert resp.empty_reason == "NO_ROUND"
    assert resp.summary.assigned_total == 0


def test_23_empty_state_all_tasks_complete(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    confirm_meter_reading(
        db_session,
        u1,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="100.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 1
    assert resp.summary.confirmed == 1
    assert resp.summary.pending == 0
    assert resp.summary.percent_complete == 100
    assert resp.empty_reason == "ALL_TASKS_COMPLETE"


def test_24_inactive_retired_meter_in_scope(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m_retired = create_meter(db_session, "M_RET", zone_id=z1.id, active=False, lifecycle="RETIRED")
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m_retired])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert len(resp.meters) == 1
    assert resp.meters[0].meter_availability == "RETIRED"


# ============================================================================
# Submission Authorization Cases (25 - 33)
# ============================================================================

def test_25_submit_assigned_meter_success(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    res = confirm_meter_reading(
        db_session,
        u1,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="500.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )
    assert res.reading == "500.0"
    assert res.user_id == u1.id


def test_26_submit_unassigned_meter_403(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # M2 is in the round, but NOT assigned to U1
    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=m2.id,
                reading_round_id=rnd.id,
                reading="500.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 403
    assert "chưa được phân công phụ trách" in exc_info.value.detail or "không được phân công" in exc_info.value.detail


def test_27_submit_out_of_round_meter_422(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m_out = create_meter(db_session, "M_OUT", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    # Only m1 is scheduled
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # Meter not in round scope must yield 422 (9A scope invariant)
    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=m_out.id,
                reading_round_id=rnd.id,
                reading="500.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 422
    assert "không thuộc phạm vi đã lên lịch" in exc_info.value.detail


def test_28_submit_no_assignment_403(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # No assignment for U1
    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=m1.id,
                reading_round_id=rnd.id,
                reading="500.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 403


def test_29_submit_cancelled_assignment_403(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", status="CANCELLED")

    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=m1.id,
                reading_round_id=rnd.id,
                reading="500.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 403


def test_30_submit_support_role_success(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="SUPPORT")

    res = confirm_meter_reading(
        db_session,
        u1,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="777.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )
    assert res.reading == "777.0"
    assert res.user_id == u1.id


def test_31_submit_race_condition_409(db_session):
    u1 = create_user(db_session, "U1")
    u2 = create_user(db_session, "U2")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24", role="SUPPORT")

    # U1 confirms first
    confirm_meter_reading(
        db_session,
        u1,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="100.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )

    # U2 attempts to confirm same meter in same round -> 409
    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u2,
            ConfirmReadingRequest(
                meter_id=m1.id,
                reading_round_id=rnd.id,
                reading="105.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 409


def test_32_admin_override_submission(db_session):
    admin = create_user(db_session, "ADM01", role="ADMIN")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # Admin has NO operational assignment, but ADMIN role overrides assignment requirement
    res = confirm_meter_reading(
        db_session,
        admin,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="999.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )
    assert res.reading == "999.0"
    assert res.user_id == admin.id


def test_33_mark_review_authorization(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)
    b = create_batch(db_session)

    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # M1 assigned -> success
    rev = mark_meter_review(
        db_session,
        u1,
        MarkReviewRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
        ),
    )
    assert rev.status == "REVIEW"

    # M2 not assigned -> 403
    with pytest.raises(HTTPException) as exc_info:
        mark_meter_review(
            db_session,
            u1,
            MarkReviewRequest(
                meter_id=m2.id,
                reading_round_id=rnd.id,
            ),
        )
    assert exc_info.value.status_code == 403


# ============================================================================
# Counting & Progress Truthfulness Cases (34 - 37)
# ============================================================================

def test_34_personal_progress_vs_global_round_total(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    meters_z1 = [create_meter(db_session, f"M1_{i}", zone_id=z1.id) for i in range(5)]
    meters_z2 = [create_meter(db_session, f"M2_{i}", zone_id=z2.id) for i in range(7)]

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=meters_z1 + meters_z2)

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 5
    assert resp.global_round_total == 12


def test_35_personal_confirmation_progress_math(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    meters_z1 = [create_meter(db_session, f"M1_{i}", zone_id=z1.id) for i in range(5)]
    meters_z2 = [create_meter(db_session, f"M2_{i}", zone_id=z2.id) for i in range(7)]

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=meters_z1 + meters_z2)

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # Confirm 3 of the 5 assigned meters
    for i in range(3):
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=meters_z1[i].id,
                reading_round_id=rnd.id,
                reading=f"{100 + i}",
                confirmation_source="MANUAL_ENTRY",
            ),
        )

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 5
    assert resp.summary.confirmed == 3
    assert resp.summary.pending == 2
    assert resp.summary.percent_complete == 60  # 3/5 * 100
    assert resp.global_round_total == 12


def test_36_personal_progress_does_not_redefine_round_denominator(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    # Personal total must be 1, round total must be 2
    assert resp.summary.assigned_total == 1
    assert resp.current_round.progress.total == 2
    assert resp.global_round_total == 2


def test_37_zero_assigned_progress_is_zero(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # No assignment
    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert resp.summary.percent_complete == 0


# ============================================================================
# Legacy Dynamic Scope Compatibility Cases (38 - 40)
# ============================================================================

def test_38_legacy_dynamic_projection(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    # LEGACY_DYNAMIC scope mode
    rnd = create_round(db_session, b, dt, scope_mode="LEGACY_DYNAMIC")

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 1
    assert resp.meters[0].meter.meter_code == "M1"


def test_39_legacy_dynamic_submission_auth(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_mode="LEGACY_DYNAMIC")

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24")

    # M1 assigned -> 200 OK
    res = confirm_meter_reading(
        db_session,
        u1,
        ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=rnd.id,
            reading="200.0",
            confirmation_source="MANUAL_ENTRY",
        ),
    )
    assert res.reading == "200.0"

    # M2 not assigned -> 403
    with pytest.raises(HTTPException) as exc_info:
        confirm_meter_reading(
            db_session,
            u1,
            ConfirmReadingRequest(
                meter_id=m2.id,
                reading_round_id=rnd.id,
                reading="200.0",
                confirmation_source="MANUAL_ENTRY",
            ),
        )
    assert exc_info.value.status_code == 403


def test_40_legacy_dynamic_empty_state(db_session):
    u1 = create_user(db_session, "U1")
    z1 = create_zone(db_session, "Z1")
    z2 = create_zone(db_session, "Z2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_mode="LEGACY_DYNAMIC")

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    # Assigned to Z2 which has no meters
    create_assignment(db_session, u1, z2, "CA1", "2026-09-24")

    resp = resolve_user_round_tasks(db_session, u1, round_id=rnd.id)
    assert resp.summary.assigned_total == 0
    assert resp.empty_reason == "NO_METERS_IN_ZONE"


# ============================================================================
# Admin Diagnostics & Coverage Cases (41 - 43)
# ============================================================================

def test_41_coverage_diagnostics_overview(db_session):
    u1 = create_user(db_session, "U1", name="User One")
    z1 = create_zone(db_session, "Z1", name="Khu 1")
    z2 = create_zone(db_session, "Z2", name="Khu 2")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)
    m2 = create_meter(db_session, "M2", zone_id=z2.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1, m2])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")

    diag = get_round_task_coverage_diagnostics(db_session, rnd.id)
    assert diag.global_scope_count == 2
    assert diag.assigned_unique_meter_count == 1
    assert diag.unassigned_unique_meter_count == 1
    assert z2.id in diag.unassigned_zone_ids
    assert "Khu 2" in diag.unassigned_zone_names


def test_42_coverage_diagnostics_uncovered_zones(db_session):
    z1 = create_zone(db_session, "Z1", name="Khu 1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    # No assignments exist anywhere
    diag = get_round_task_coverage_diagnostics(db_session, rnd.id)
    assert diag.global_scope_count == 1
    assert diag.assigned_unique_meter_count == 0
    assert diag.unassigned_unique_meter_count == 1
    assert diag.unassigned_zone_ids == [z1.id]


def test_43_coverage_diagnostics_overlapping_assignees(db_session):
    u1 = create_user(db_session, "U1", name="User A")
    u2 = create_user(db_session, "U2", name="User B")
    z1 = create_zone(db_session, "Z1", name="Khu 1")
    m1 = create_meter(db_session, "M1", zone_id=z1.id)

    b = create_batch(db_session)
    dt = datetime(2026, 9, 24, 8, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    rnd = create_round(db_session, b, dt, scope_meters=[m1])

    create_schedule(db_session, u1, "CA1", "2026-09-24")
    create_schedule(db_session, u2, "CA1", "2026-09-24")
    create_assignment(db_session, u1, z1, "CA1", "2026-09-24", role="PRIMARY")
    create_assignment(db_session, u2, z1, "CA1", "2026-09-24", role="SUPPORT")

    diag = get_round_task_coverage_diagnostics(db_session, rnd.id)
    assert diag.assigned_unique_meter_count == 1
    assert diag.overlapping_assignment_count == 2
    assert diag.assigned_zone_breakdown[0]["primary_assignee"] == "User A"
    assert diag.assigned_zone_breakdown[0]["support_assignees"] == ["User B"]
