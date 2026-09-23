import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app import admin as admin_domain
from backend.app.auth import hash_password
from backend.app.config import get_settings
from backend.app.db import Base, get_db, migrate_db
from backend.app.main import app
from backend.app.meter_logbook import (
    calculate_batch_progress,
    calculate_round_progress,
    get_batch_rounds_with_progress,
    get_current_or_nearest_round,
    get_round_meters_with_status,
    get_today_meter_operations,
)
from backend.app.models import (
    Meter,
    MeterReading,
    OperationalZone,
    ReadingBatch,
    ReadingRound,
    ReadingRoundMeter,
    User,
)
from backend.app.schemas import AdminScheduleCreateRequest, AdminScheduleScopeRequest

LOCAL_TZ = ZoneInfo(get_settings().timezone)


@pytest.fixture
def test_db_session():
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
def client(test_db_session):
    def override_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user(test_db_session):
    user = User(
        id=str(uuid.uuid4()),
        employee_code="9A-OP-01",
        full_name="Nhân viên kiểm thử",
        password_hash=hash_password("TestPassword123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    test_db_session.add(user)
    test_db_session.commit()
    return user


def login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "9A-OP-01", "password": "TestPassword123!"},
    )
    assert response.status_code == 200
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    return csrf.json()["csrf_token"]


def add_zone(db, code="ZA", name="Khu A"):
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


def add_meter(db, code, *, zone_id=None, utility="ELECTRICITY", active=True, lifecycle="ACTIVE"):
    meter = Meter(
        id=str(uuid.uuid4()),
        meter_code=code,
        name=f"Công tơ {code}",
        meter_type="LCD",
        utility_type=utility,
        zone_id=zone_id,
        presentation_zone_id="PRESENTATION_A" if zone_id else None,
        is_active=active,
        lifecycle_status=lifecycle,
    )
    db.add(meter)
    db.flush()
    return meter


def add_batch(db):
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Đợt kiểm thử 9A",
        period_key=datetime.now(LOCAL_TZ).strftime("%Y-%m"),
        status="OPEN",
    )
    db.add(batch)
    db.flush()
    return batch


def add_round(db, batch, *, scope_meters=(), scheduled_at=None, status="OPEN", scope_mode="SNAPSHOT"):
    now = datetime.now(timezone.utc)
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=scheduled_at or now - timedelta(minutes=5),
        status=status,
        is_legacy=False,
        scope_mode=scope_mode,
        created_at=now,
    )
    db.add(round_obj)
    db.flush()
    if scope_mode == "SNAPSHOT":
        for meter in scope_meters:
            db.add(
                ReadingRoundMeter(
                    id=str(uuid.uuid4()),
                    reading_round_id=round_obj.id,
                    meter_id=meter.id,
                    meter_code_snapshot=meter.meter_code,
                    meter_name_snapshot=meter.name,
                    zone_id_snapshot=meter.zone_id,
                    presentation_zone_id_snapshot=meter.presentation_zone_id,
                    utility_type_snapshot=meter.utility_type,
                    scope_origin="ALL_ELIGIBLE",
                    scope_status="SCHEDULED",
                    created_at=now,
                )
            )
    db.flush()
    return round_obj


def schedule_request(db, *, scope, date, start="08:00", end="09:00", interval=60):
    meters, invalid, fingerprint = admin_domain.resolve_schedule_scope(db, scope)
    assert invalid == []
    return AdminScheduleCreateRequest(
        date=date,
        start_time=start,
        end_time=end,
        interval_minutes=interval,
        scope=scope,
        expected_scope_fingerprint=fingerprint,
    )


def test_scope_resolver_modes_and_eligibility(test_db_session):
    zone_a = add_zone(test_db_session)
    zone_b = add_zone(test_db_session, "ZB", "Khu B")
    electric_a = add_meter(test_db_session, "A-01", zone_id=zone_a.id)
    water_a = add_meter(test_db_session, "A-02", zone_id=zone_a.id, utility="WATER")
    electric_b = add_meter(test_db_session, "B-01", zone_id=zone_b.id)
    add_meter(test_db_session, "A-OFF", zone_id=zone_a.id, active=False, lifecycle="INACTIVE")
    add_meter(test_db_session, "A-RET", zone_id=zone_a.id, active=False, lifecycle="RETIRED")

    all_scope = AdminScheduleScopeRequest(mode="ALL_ELIGIBLE")
    all_meters, invalid, _ = admin_domain.resolve_schedule_scope(test_db_session, all_scope)
    assert invalid == []
    assert [meter.meter_code for meter in all_meters] == ["A-01", "A-02", "B-01"]

    by_zone, zone_invalid, _ = admin_domain.resolve_schedule_scope(
        test_db_session, AdminScheduleScopeRequest(mode="BY_ZONE", zone_ids=[zone_a.id])
    )
    assert zone_invalid == []
    assert {meter.id for meter in by_zone} == {electric_a.id, water_a.id}

    by_utility, utility_invalid, _ = admin_domain.resolve_schedule_scope(
        test_db_session, AdminScheduleScopeRequest(mode="BY_UTILITY", utility_types=["WATER"])
    )
    assert utility_invalid == []
    assert [meter.id for meter in by_utility] == [water_a.id]

    selected, selected_invalid, _ = admin_domain.resolve_schedule_scope(
        test_db_session, AdminScheduleScopeRequest(mode="SELECTED_METERS", meter_ids=[electric_b.id, water_a.id])
    )
    assert selected_invalid == []
    assert [meter.meter_code for meter in selected] == ["A-02", "B-01"]

    _, retired_invalid, _ = admin_domain.resolve_schedule_scope(
        test_db_session, AdminScheduleScopeRequest(mode="SELECTED_METERS", meter_ids=["A-RET-ID"])
    )
    assert retired_invalid[0].reason == "NOT_FOUND"
    with pytest.raises(ValueError):
        AdminScheduleScopeRequest(mode="BY_ZONE", zone_ids=[zone_a.id], meter_ids=[electric_a.id])


def test_create_materializes_each_round_and_stale_fingerprint_returns_409(test_db_session, sample_user):
    batch = add_batch(test_db_session)
    meter_a = add_meter(test_db_session, "SCOPE-01", utility="ELECTRICITY")
    meter_b = add_meter(test_db_session, "SCOPE-02", utility="WATER")
    test_db_session.commit()
    scope = AdminScheduleScopeRequest(mode="ALL_ELIGIBLE")
    date = (datetime.now(LOCAL_TZ).date() + timedelta(days=1)).isoformat()
    request = schedule_request(test_db_session, scope=scope, date=date, start="08:00", end="09:00")

    created = admin_domain.create_admin_schedules(test_db_session, sample_user, request)
    assert created.created_count == 2
    assert created.scope_materialized_count == 4
    assert created.scope_fingerprint == request.expected_scope_fingerprint
    rounds = test_db_session.query(ReadingRound).filter(ReadingRound.batch_id == batch.id).all()
    assert all(round_obj.scope_mode == "SNAPSHOT" for round_obj in rounds)
    for round_obj in rounds:
        rows = test_db_session.query(ReadingRoundMeter).filter_by(reading_round_id=round_obj.id).all()
        assert {row.meter_id for row in rows} == {meter_a.id, meter_b.id}
        assert {row.utility_type_snapshot for row in rows} == {"ELECTRICITY", "WATER"}

    add_meter(test_db_session, "SCOPE-03")
    test_db_session.commit()
    stale_request = AdminScheduleCreateRequest(
        date=date,
        start_time="10:00",
        end_time="10:00",
        interval_minutes=60,
        scope=scope,
        expected_scope_fingerprint=request.expected_scope_fingerprint,
    )
    with pytest.raises(HTTPException) as conflict:
        admin_domain.create_admin_schedules(test_db_session, sample_user, stale_request)
    assert conflict.value.status_code == 409
    assert "đã thay đổi" in conflict.value.detail
    assert test_db_session.query(ReadingRound).filter_by(batch_id=batch.id).count() == 2


def test_admin_scope_modes_are_persisted_with_provenance(test_db_session, sample_user):
    zone = add_zone(test_db_session)
    electric = add_meter(test_db_session, "MODE-ELECTRIC", zone_id=zone.id, utility="ELECTRICITY")
    water = add_meter(test_db_session, "MODE-WATER", zone_id=zone.id, utility="WATER")
    add_batch(test_db_session)
    test_db_session.commit()
    date = (datetime.now(LOCAL_TZ).date() + timedelta(days=1)).isoformat()
    requests = [
        (AdminScheduleScopeRequest(mode="BY_ZONE", zone_ids=[zone.id]), "08:00", "ZONE_FILTER"),
        (AdminScheduleScopeRequest(mode="BY_UTILITY", utility_types=["WATER"]), "09:00", "UTILITY_FILTER"),
        (AdminScheduleScopeRequest(mode="SELECTED_METERS", meter_ids=[electric.id]), "10:00", "MANUAL_SELECTION"),
    ]
    for scope, start, expected_origin in requests:
        result = admin_domain.create_admin_schedules(
            test_db_session,
            sample_user,
            schedule_request(test_db_session, scope=scope, date=date, start=start, end=start),
        )
        assert result.created_count == 1
        round_obj = test_db_session.query(ReadingRound).filter_by(id=result.rounds[0].id).one()
        scope_rows = test_db_session.query(ReadingRoundMeter).filter_by(reading_round_id=round_obj.id).all()
        assert {row.scope_origin for row in scope_rows} == {expected_origin}
        if scope.mode == "BY_UTILITY":
            assert [row.meter_id for row in scope_rows] == [water.id]


def test_cross_midnight_schedule_is_rejected_explicitly(test_db_session):
    add_batch(test_db_session)
    add_meter(test_db_session, "NIGHT-01")
    test_db_session.commit()
    payload = {
        "date": (datetime.now(LOCAL_TZ).date() + timedelta(days=1)).isoformat(),
        "start_time": "22:00",
        "end_time": "06:00",
        "interval_minutes": 60,
        "scope": AdminScheduleScopeRequest(mode="ALL_ELIGIBLE"),
    }
    with pytest.raises(HTTPException) as error:
        admin_domain.preview_admin_schedules(test_db_session, admin_domain.AdminSchedulePreviewRequest(**payload))
    assert error.value.status_code == 400
    assert "chưa được hỗ trợ" in error.value.detail


def test_schedule_creation_rolls_back_rounds_and_scope_on_late_failure(test_db_session, sample_user, monkeypatch):
    batch = add_batch(test_db_session)
    add_meter(test_db_session, "ROLLBACK-01")
    test_db_session.commit()
    scope = AdminScheduleScopeRequest(mode="ALL_ELIGIBLE")
    request = schedule_request(
        test_db_session,
        scope=scope,
        date=(datetime.now(LOCAL_TZ).date() + timedelta(days=2)).isoformat(),
        start="08:00",
        end="09:00",
    )

    def fail_audit(*args, **kwargs):
        raise RuntimeError("simulated failure after scope flush")

    monkeypatch.setattr(admin_domain, "log_admin_action", fail_audit)
    with pytest.raises(RuntimeError):
        admin_domain.create_admin_schedules(test_db_session, sample_user, request)
    assert test_db_session.query(ReadingRound).filter_by(batch_id=batch.id).count() == 0
    assert test_db_session.query(ReadingRoundMeter).count() == 0


def test_snapshot_progress_admin_list_and_user_queue_survive_inventory_changes(test_db_session, client, sample_user):
    zone_a = add_zone(test_db_session)
    zone_b = add_zone(test_db_session, "ZB", "Khu B")
    scheduled = add_meter(test_db_session, "W-ROUND-01", zone_id=zone_a.id, utility="WATER")
    out_of_scope = add_meter(test_db_session, "E-OUT-01", zone_id=zone_b.id)
    batch = add_batch(test_db_session)
    round_obj = add_round(test_db_session, batch, scope_meters=[scheduled])
    test_db_session.commit()

    assert calculate_round_progress(test_db_session, round_obj.id).total == 1
    admin_rows = get_round_meters_with_status(test_db_session, round_obj)
    assert len(admin_rows) == 1
    assert admin_rows[0].meter.meter_code == scheduled.meter_code
    assert admin_rows[0].scope_zone_id_snapshot == zone_a.id
    assert admin_rows[0].scope_utility_type_snapshot == "WATER"
    assert admin_rows[0].current_zone_id == zone_a.id

    add_meter(test_db_session, "NEW-AFTER-PUBLISH")
    scheduled.zone_id = zone_b.id
    scheduled.lifecycle_status = "RETIRED"
    scheduled.is_active = False
    test_db_session.commit()

    assert calculate_round_progress(test_db_session, round_obj.id).total == 1
    admin_rows_after = get_round_meters_with_status(test_db_session, round_obj)
    assert len(admin_rows_after) == 1
    assert admin_rows_after[0].scope_zone_id_snapshot == zone_a.id
    assert admin_rows_after[0].meter.zone_id == zone_a.id
    assert admin_rows_after[0].current_zone_id == zone_b.id
    assert admin_rows_after[0].current_zone_id == scheduled.zone_id
    assert admin_rows_after[0].meter_availability == "RETIRED"

    queue = get_today_meter_operations(test_db_session, date_filter=datetime.now(LOCAL_TZ).date().isoformat())
    assert queue.current_round is not None
    assert queue.current_round.scope_mode == "SNAPSHOT"
    assert queue.summary.scheduled_meter_count == 1
    assert [item.meter.meter_code for item in queue.meters] == [scheduled.meter_code]
    assert queue.meters[0].meter.utility_type == "WATER"
    assert queue.meters[0].meter_availability == "RETIRED"
    assert out_of_scope.id not in {item.meter.id for item in queue.meters}
    login(client)
    api_queue = client.get(f"/api/v1/meter-operations/today?date={queue.date}")
    assert api_queue.status_code == 200
    assert [item["meter"]["meter_code"] for item in api_queue.json()["meters"]] == [scheduled.meter_code]


def test_snapshot_submission_scope_review_confirmation_and_reconciliation(client, test_db_session, sample_user):
    csrf = login(client)
    included = add_meter(test_db_session, "SUBMIT-IN-01")
    included_review = add_meter(test_db_session, "SUBMIT-IN-02", utility="WATER")
    excluded = add_meter(test_db_session, "SUBMIT-OUT-01")
    batch = add_batch(test_db_session)
    round_obj = add_round(test_db_session, batch, scope_meters=[included, included_review])
    test_db_session.commit()

    confirm = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": included.id, "reading_round_id": round_obj.id, "reading": "100.2"},
    )
    assert confirm.status_code == 200
    assert confirm.json()["reading_status"] == "CONFIRMED"

    review = client.post(
        "/api/v1/meter-readings/review",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": included_review.id, "reading_round_id": round_obj.id},
    )
    assert review.status_code == 200
    assert review.json()["reading_status"] == "REVIEW"

    for route, payload in (
        ("/api/v1/meter-readings/confirm", {"reading": "55"}),
        ("/api/v1/meter-readings/review", {}),
    ):
        rejected = client.post(
            route,
            headers={"X-CSRF-Token": csrf},
            json={"meter_id": excluded.id, "reading_round_id": round_obj.id, **payload},
        )
        assert rejected.status_code == 422

    duplicate = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": included.id, "reading_round_id": round_obj.id, "reading": "101"},
    )
    assert duplicate.status_code == 409
    reconciled = client.get(f"/api/v1/meter-readings/rounds/{round_obj.id}/meters/{included.id}")
    assert reconciled.status_code == 200
    assert reconciled.json()["exists"] is True
    assert reconciled.json()["recorded_by_employee_code"] == sample_user.employee_code
    progress = calculate_round_progress(test_db_session, round_obj.id)
    assert (progress.total, progress.confirmed, progress.review, progress.pending) == (2, 1, 1, 0)


def test_admin_dashboard_keeps_shared_projection_and_ignores_cancelled(test_db_session, sample_user):
    batch = add_batch(test_db_session)
    scheduled_meter = add_meter(test_db_session, "DASH-SCHEDULED")
    newly_added_meter = add_meter(test_db_session, "DASH-ADDED-LATER")
    future_date = datetime.now(LOCAL_TZ).date() + timedelta(days=1)
    scheduled_at = datetime.combine(future_date, datetime.min.time(), tzinfo=LOCAL_TZ).replace(hour=8)
    round_obj = add_round(
        test_db_session,
        batch,
        scope_meters=[scheduled_meter],
        scheduled_at=scheduled_at,
    )
    cancelled = add_round(
        test_db_session,
        batch,
        scope_meters=[newly_added_meter],
        scheduled_at=scheduled_at + timedelta(hours=1),
        status="CANCELLED",
    )
    test_db_session.add(
        MeterReading(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            reading_round_id=round_obj.id,
            meter_id=scheduled_meter.id,
            user_id=sample_user.id,
            reading="00123.4",
            confirmation_source="USER_CORRECTED",
            status="CONFIRMED",
            server_timestamp=datetime.now(timezone.utc),
        )
    )
    test_db_session.commit()

    dashboard = admin_domain.get_admin_dashboard(test_db_session, date_str=future_date.isoformat())
    assert [row.round_id for row in dashboard.round_progress] == [round_obj.id]
    progress = dashboard.round_progress[0]
    # The shared dashboard projection remains inventory-based during the Map V2
    # freeze. Admin schedule round detail uses the persisted-scope round API.
    assert progress.total_meters == 2
    assert progress.confirmed == 1
    assert progress.pending == 1
    assert cancelled.status == "CANCELLED"


def test_legacy_dynamic_scope_batch_metrics_and_cancelled_current_selection(test_db_session):
    active_a = add_meter(test_db_session, "LEGACY-01")
    add_meter(test_db_session, "LEGACY-02")
    batch = add_batch(test_db_session)
    legacy_round = add_round(test_db_session, batch, scope_mode="LEGACY_DYNAMIC")
    cancelled = add_round(
        test_db_session,
        batch,
        scheduled_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        status="CANCELLED",
        scope_mode="LEGACY_DYNAMIC",
    )
    test_db_session.commit()

    progress = calculate_round_progress(test_db_session, legacy_round.id)
    assert legacy_round.scope_mode == "LEGACY_DYNAMIC"
    assert progress.total == 2
    assert progress.scheduled_slot_count is None
    batch_progress = calculate_batch_progress(test_db_session, batch.id)
    assert batch_progress.unique_meter_count == 2
    assert batch_progress.scheduled_slot_count == 2
    current, upcoming = get_current_or_nearest_round(
        test_db_session, batch.id, date_filter=datetime.now(LOCAL_TZ).date().isoformat()
    )
    assert current.id == legacy_round.id
    assert current.id != cancelled.id


def test_cancelled_only_round_is_not_current_or_user_actionable(test_db_session):
    meter = add_meter(test_db_session, "CANCELLED-01")
    batch = add_batch(test_db_session)
    add_round(
        test_db_session,
        batch,
        scope_meters=[meter],
        status="CANCELLED",
        scheduled_at=datetime.now(timezone.utc) - timedelta(minutes=3),
    )
    test_db_session.commit()

    current, upcoming = get_current_or_nearest_round(
        test_db_session, batch.id, date_filter=datetime.now(LOCAL_TZ).date().isoformat()
    )
    queue = get_today_meter_operations(test_db_session, date_filter=datetime.now(LOCAL_TZ).date().isoformat())
    assert current is None and upcoming is None
    assert queue.current_round is None
    assert queue.meters[0].current_status == "NO_ROUND"
    cancelled_round = get_batch_rounds_with_progress(test_db_session, batch.id)[0]
    assert cancelled_round.status == "CANCELLED"
    assert cancelled_round.timing_state == "CANCELLED"


def test_migration_is_idempotent_and_does_not_backfill_fake_scope(test_db_session):
    batch = add_batch(test_db_session)
    legacy_round = add_round(test_db_session, batch, scope_mode="LEGACY_DYNAMIC")
    engine = test_db_session.get_bind()
    pre_round_count = test_db_session.query(ReadingRound).count()
    pre_reading_count = test_db_session.query(MeterReading).count()
    pre_scope_count = test_db_session.query(ReadingRoundMeter).count()

    with engine.begin() as connection:
        connection.exec_driver_sql("DROP TABLE reading_round_meters")
        connection.exec_driver_sql("DROP TRIGGER IF EXISTS trg_reading_round_scope_mode_immutable")
        connection.exec_driver_sql("ALTER TABLE reading_rounds DROP COLUMN scope_mode")

    migrate_db(engine)
    migrate_db(engine)
    test_db_session.expire_all()
    assert test_db_session.query(ReadingRound).filter_by(id=legacy_round.id).one().scope_mode == "LEGACY_DYNAMIC"
    assert test_db_session.query(ReadingRoundMeter).filter_by(reading_round_id=legacy_round.id).count() == 0
    assert test_db_session.query(ReadingRound).count() == pre_round_count == 1
    assert test_db_session.query(MeterReading).count() == pre_reading_count == 0
    assert test_db_session.query(ReadingRoundMeter).count() == pre_scope_count == 0


def test_scope_unique_constraint_and_zero_meter_creation_rejection(test_db_session, sample_user):
    batch = add_batch(test_db_session)
    meter = add_meter(test_db_session, "UNIQUE-01")
    round_obj = add_round(test_db_session, batch, scope_meters=[meter])
    duplicate = ReadingRoundMeter(
        id=str(uuid.uuid4()),
        reading_round_id=round_obj.id,
        meter_id=meter.id,
        meter_code_snapshot=meter.meter_code,
        meter_name_snapshot=meter.name,
        scope_origin="ALL_ELIGIBLE",
        scope_status="SCHEDULED",
    )
    test_db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    empty_batch = add_batch(test_db_session)
    meter.is_active = False
    meter.lifecycle_status = "INACTIVE"
    test_db_session.commit()
    _, _, current_fingerprint = admin_domain.resolve_schedule_scope(
        test_db_session, AdminScheduleScopeRequest(mode="ALL_ELIGIBLE")
    )
    empty_request = AdminScheduleCreateRequest(
        date=(datetime.now(LOCAL_TZ).date() + timedelta(days=1)).isoformat(),
        start_time="12:00",
        end_time="12:00",
        interval_minutes=60,
        scope=AdminScheduleScopeRequest(mode="ALL_ELIGIBLE"),
        expected_scope_fingerprint=current_fingerprint,
    )
    with pytest.raises(HTTPException) as invalid_scope:
        admin_domain.create_admin_schedules(test_db_session, sample_user, empty_request)
    assert invalid_scope.value.status_code == 400
    assert test_db_session.query(ReadingRound).filter_by(batch_id=empty_batch.id).count() == 0


def test_cancel_service_keeps_round_and_meter_reading_history(test_db_session, sample_user):
    meter = add_meter(test_db_session, "CANCEL-HISTORY-01")
    batch = add_batch(test_db_session)
    round_obj = add_round(test_db_session, batch, scope_meters=[meter])
    reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        user_id=sample_user.id,
        reading="12.3",
        status="CONFIRMED",
    )
    test_db_session.add(reading)
    test_db_session.commit()

    result = admin_domain.delete_admin_schedule_round(test_db_session, sample_user, round_obj.id)
    assert result.cancelled_count == 1
    assert test_db_session.query(ReadingRound).filter_by(id=round_obj.id).one().status == "CANCELLED"
    assert test_db_session.query(MeterReading).filter_by(id=reading.id).count() == 1

    test_db_session.delete(round_obj)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
    assert test_db_session.query(MeterReading).filter_by(id=reading.id).count() == 1


def test_published_scope_snapshots_are_immutable_and_meter_history_is_protected(test_db_session, sample_user):
    zone = add_zone(test_db_session)
    meter = add_meter(test_db_session, "IMMUTABLE-01", zone_id=zone.id)
    other_meter = add_meter(test_db_session, "IMMUTABLE-02", zone_id=zone.id)
    batch = add_batch(test_db_session)
    round_obj = add_round(test_db_session, batch, scope_meters=[meter])
    scope_row = test_db_session.query(ReadingRoundMeter).filter_by(reading_round_id=round_obj.id).one()
    reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        user_id=sample_user.id,
        reading="44.2",
        status="CONFIRMED",
        confirmation_source="USER_CORRECTED",
    )
    test_db_session.add(reading)
    test_db_session.commit()

    scope_row.zone_id_snapshot = "rewritten-zone"
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
    assert test_db_session.query(ReadingRoundMeter).filter_by(id=scope_row.id).one().zone_id_snapshot == zone.id

    scope_row = test_db_session.query(ReadingRoundMeter).filter_by(id=scope_row.id).one()
    scope_row.meter_id = other_meter.id
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
    scope_row = test_db_session.query(ReadingRoundMeter).filter_by(id=scope_row.id).one()
    assert scope_row.meter_id == meter.id

    round_obj = test_db_session.query(ReadingRound).filter_by(id=round_obj.id).one()
    round_obj.scope_mode = "LEGACY_DYNAMIC"
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
    assert test_db_session.query(ReadingRound).filter_by(id=round_obj.id).one().scope_mode == "SNAPSHOT"

    test_db_session.delete(meter)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()
    assert test_db_session.query(Meter).filter_by(id=meter.id).count() == 1
    assert test_db_session.query(MeterReading).filter_by(id=reading.id).count() == 1
