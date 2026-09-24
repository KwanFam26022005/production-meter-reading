"""Focused 9D reporting truth and unit-aware usage qualification."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.admin_reports import get_admin_technical_details, get_admin_technical_meters, get_admin_technical_overview
from backend.app.asset_operations import update_meter_metadata
from backend.app.db import Base, get_db, migrate_db
from backend.app.main import app, require_admin
from backend.app.models import Meter, MeterReading, OperationalAssignment, OperationalZone, ReadingBatch, ReadingRound, ReadingRoundMeter, User
from backend.app.reporting_scope import operational_report
from backend.app.reporting import export_report_csv, get_meter_report, get_report_overview
from backend.app.schemas import MeterMetadataUpdateRequest
from backend.app.usage_analytics import derive_intervals, get_usage_overview


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    migrate_db(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def key():
    return str(uuid4())


def setup(db):
    batch = ReadingBatch(id=key(), name="9D", period_key="2024-01", status="OPEN")
    zone_a = OperationalZone(id=key(), code="9DA", name="Khu A", map_polygon="[]")
    zone_b = OperationalZone(id=key(), code="9DB", name="Khu B", map_polygon="[]")
    users = [User(id=key(), employee_code=f"9D-{i}", full_name=f"User {i}", password_hash="x", role="EMPLOYEE", is_active=True) for i in range(2)]
    db.add_all([batch, zone_a, zone_b, *users])
    db.flush()
    return batch, zone_a, zone_b, users


def meter(db, code, zone, utility="ELECTRICITY", unit="UNKNOWN", semantics="UNKNOWN"):
    row = Meter(id=key(), meter_code=code, name=code, meter_type="LCD", zone_id=zone.id,
                utility_type=utility, measurement_unit=unit, register_semantics=semantics, is_active=True)
    db.add(row)
    db.flush()
    return row


def round_at(db, batch, day, hour, scoped=(), mode="SNAPSHOT"):
    # 01:00 UTC = 08:00 in Ho Chi Minh City.
    scheduled = datetime(2024, 1, day, hour, tzinfo=timezone.utc)
    row = ReadingRound(id=key(), batch_id=batch.id, scheduled_at=scheduled, status="OPEN",
                       is_legacy=False, scope_mode=mode)
    db.add(row)
    db.flush()
    for target in scoped:
        db.add(ReadingRoundMeter(
            id=key(), reading_round_id=row.id, meter_id=target.id,
            meter_code_snapshot=target.meter_code, meter_name_snapshot=target.name,
            zone_id_snapshot=target.zone_id, utility_type_snapshot=target.utility_type,
            scope_origin="SELECTED_METERS", scope_status="SCHEDULED",
        ))
    db.flush()
    return row


def reading(db, batch, round_obj, target, user, value, status="CONFIRMED", source="MANUAL_ENTRY"):
    row = MeterReading(id=key(), batch_id=batch.id, reading_round_id=round_obj.id,
                       meter_id=target.id, user_id=user.id, reading=value, status=status,
                       confirmation_source=source)
    db.add(row)
    db.flush()
    return row


def assign(db, user, zone, work_date="2024-01-10", shift="CA1", role="PRIMARY"):
    row = OperationalAssignment(id=key(), user_id=user.id, zone_id=zone.id,
                                work_date=work_date, shift_code=shift,
                                assignment_role=role, status="ASSIGNED")
    db.add(row)
    db.flush()
    return row


def test_snapshot_scope_does_not_follow_current_inventory_or_zone(db):
    batch, za, zb, users = setup(db)
    first = meter(db, "E-1", za)
    second = meter(db, "E-2", za)
    r1 = round_at(db, batch, 10, 1, [first])
    r2 = round_at(db, batch, 10, 3, [first, second])
    assert get_admin_technical_overview(db, "2024-01-10", "2024-01-10").summary.total_due_slots == 3
    meter(db, "E-3", za)
    second.is_active = False
    second.lifecycle_status = "RETIRED"
    first.zone_id = zb.id
    db.flush()
    result = operational_report(db, "2024-01-10", "2024-01-10", zone_id=za.id)
    assert result["summary"]["scheduled"] == 3
    assert result["summary"]["due"] == 3
    assert {item["zone_id"] for item in result["tasks"]} == {za.id}
    assert get_admin_technical_meters(db, "2024-01-10", "2024-01-10").meters[1].scheduled_rounds_count == 1
    assert {row["round_id"] for row in result["tasks"]} == {r1.id, r2.id}
    user_report = get_report_overview(db, "2024-01-10")
    assert user_report.summary.expected_slots == 3
    assert user_report.summary.due_slots == 3
    assert [row.total for row in user_report.hourly] == [1, 2]
    assert get_meter_report(db, second.id, "2024-01-10").completion.scheduled_total == 1
    csv_text = export_report_csv(db, "2024-01-10")
    assert csv_text.startswith("\ufeff") and "Chỉ số (kWh)" not in csv_text
    assert csv_text.count("SNAPSHOT") == 3


def test_legacy_is_dynamic_and_snapshot_utility_filter_is_immutable(db):
    batch, za, zb, users = setup(db)
    water = meter(db, "W-1", za, "WATER")
    snap = round_at(db, batch, 10, 1, [water])
    legacy = round_at(db, batch, 10, 3, mode="LEGACY_DYNAMIC")
    water.utility_type = "ELECTRICITY"
    meter(db, "E-2", zb)
    db.flush()
    water_view = operational_report(db, "2024-01-10", "2024-01-10", utility_type="WATER")
    assert water_view["summary"]["scheduled"] == 1
    assert water_view["tasks"][0]["round_id"] == snap.id
    legacy_rows = [item for item in operational_report(db, "2024-01-10", "2024-01-10")["tasks"] if item["round_id"] == legacy.id]
    assert len(legacy_rows) == 2
    assert all(item["scope_mode"] == "LEGACY_DYNAMIC" for item in legacy_rows)


def test_source_filter_keeps_denominator_and_assignment_unique(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-1", za)
    rd = round_at(db, batch, 10, 1, [target])
    assign(db, users[0], za)
    assign(db, users[1], za, role="SUPPORT")
    confirmed = reading(db, batch, rd, target, users[1], "100", source="MANUAL_ENTRY")
    db.flush()
    summary = operational_report(db, "2024-01-10", "2024-01-10")
    assert summary["summary"]["scheduled"] == summary["summary"]["assigned_due"] == 1
    assert len(summary["tasks"][0]["assigned"]) == 2
    assert summary["tasks"][0]["executor_id"] == users[1].id
    assert summary["tasks"][0]["reading_id"] == confirmed.id
    filtered = get_admin_technical_overview(db, "2024-01-10", "2024-01-10", confirmation_source="OCR_CONFIRMED")
    assert (filtered.summary.total_due_slots, filtered.summary.total_confirmed, filtered.summary.total_missing) == (1, 1, 0)
    detail = get_admin_technical_details(db, "2024-01-10", "2024-01-10").items[0]
    assert len(detail.assigned_names) == 2 and detail.operator_name == users[1].full_name


def test_unassigned_and_ca3_previous_work_date(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-1", za)
    # 17:00 UTC on Jan 10 = 00:00 local Jan 11; CA3 work_date is Jan 10.
    rd = round_at(db, batch, 10, 17, [target])
    result = operational_report(db, "2024-01-11", "2024-01-11")
    assert result["summary"]["unassigned_due"] == 1
    assign(db, users[0], za, work_date="2024-01-10", shift="CA3")
    result = operational_report(db, "2024-01-11", "2024-01-11")
    assert result["summary"]["assigned_due"] == 1
    assert result["tasks"][0]["shift_code"] == "CA3"


@pytest.mark.parametrize("utility,unit,first,second,delta,rate,rate_unit", [
    ("ELECTRICITY", "KWH", "100", "140", 40, 20, "KW"),
    ("WATER", "M3", "10", "16", 6, 3, "M3/H"),
])
def test_confirmed_cumulative_interval_units(db, utility, unit, first, second, delta, rate, rate_unit):
    batch, za, zb, users = setup(db)
    target = meter(db, f"{utility}-1", za, utility, unit, "CUMULATIVE")
    r1, r2 = round_at(db, batch, 10, 1, [target]), round_at(db, batch, 10, 3, [target])
    reading(db, batch, r1, target, users[0], first)
    reading(db, batch, r2, target, users[0], second)
    intervals = get_usage_overview(db, "2024-01-10", "2024-01-10", utility_type=utility).intervals
    assert len(intervals) == 1
    assert (intervals[0].delta, intervals[0].normalized_rate, intervals[0].rate_unit) == (delta, rate, rate_unit)


def test_unknown_and_invalid_usage_never_assert_physical_consumption(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "U-1", za)
    rounds = [round_at(db, batch, 10, hour, [target]) for hour in (1, 3, 5, 7)]
    reading(db, batch, rounds[0], target, users[0], "100")
    reading(db, batch, rounds[1], target, users[0], "120", status="REVIEW")
    reading(db, batch, rounds[2], target, users[0], "90")
    reading(db, batch, rounds[3], target, users[0], "bad")
    intervals = derive_intervals(target, [(rd, rd.round) for rd in db.query(MeterReading).all()])
    assert len(intervals) == 2  # REVIEW did not become an endpoint
    assert intervals[0].quality_status == "UNKNOWN_REGISTER_SEMANTICS"
    target.register_semantics = "CUMULATIVE"
    intervals = derive_intervals(target, [(rd, rd.round) for rd in db.query(MeterReading).all()])
    assert intervals[0].quality_status == "RESET_OR_ROLLOVER_SUSPECTED" and intervals[0].delta is None
    assert intervals[1].quality_status == "NON_NUMERIC_READING"
    target.measurement_unit = "UNKNOWN"
    db.flush()
    assert get_usage_overview(db, "2024-01-10", "2024-01-10").groups[0].total_delta is None


def test_median_baseline_requires_three_matching_prior_days(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-1", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    for day, delta in ((10, 4), (11, 8), (12, 6), (13, 10)):
        first = round_at(db, batch, day, 1, [target])
        second = round_at(db, batch, day, 3, [target])
        reading(db, batch, first, target, users[0], str(day * 100))
        reading(db, batch, second, target, users[0], str(day * 100 + delta))
    intervals = derive_intervals(target, [(rd, rd.round) for rd in db.query(MeterReading).all()])
    target_interval = next(i for i in intervals if i.to_scheduled_at.startswith("2024-01-13T03"))
    assert target_interval.baseline_status == "AVAILABLE"
    assert target_interval.baseline_delta == 6
    assert target_interval.deviation_percent == pytest.approx(66.7)
    early = next(i for i in intervals if i.to_scheduled_at.startswith("2024-01-11T03"))
    assert early.baseline_status == "INSUFFICIENT_HISTORY"


def test_aggregation_separates_utility_and_exposes_coverage(db):
    batch, za, zb, users = setup(db)
    electric = meter(db, "E-1", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    water = meter(db, "W-1", za, "WATER", "M3", "CUMULATIVE")
    missing = meter(db, "E-2", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    first = round_at(db, batch, 10, 1, [electric, water, missing])
    second = round_at(db, batch, 10, 3, [electric, water, missing])
    for target, a, b in ((electric, "100", "140"), (water, "10", "16")):
        reading(db, batch, first, target, users[0], a)
        reading(db, batch, second, target, users[0], b)
    groups = get_usage_overview(db, "2024-01-10", "2024-01-10").groups
    assert {(g.utility_type, g.measurement_unit, g.total_delta) for g in groups} == {
        ("ELECTRICITY", "KWH", 40), ("WATER", "M3", 6),
    }
    electric_group = next(g for g in groups if g.utility_type == "ELECTRICITY")
    assert (electric_group.coverage.eligible_meters, electric_group.coverage.meters_with_valid_interval) == (2, 1)


def test_future_scope_is_upcoming_and_not_an_exception(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-FUTURE", za)
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    future = ReadingRound(id=key(), batch_id=batch.id, scheduled_at=tomorrow, status="OPEN", is_legacy=False, scope_mode="SNAPSHOT")
    db.add(future)
    db.flush()
    db.add(ReadingRoundMeter(id=key(), reading_round_id=future.id, meter_id=target.id,
                             meter_code_snapshot=target.meter_code, meter_name_snapshot=target.name,
                             zone_id_snapshot=za.id, utility_type_snapshot="ELECTRICITY",
                             scope_origin="SELECTED_METERS", scope_status="SCHEDULED"))
    db.flush()
    local_day = tomorrow.astimezone(timezone(timedelta(hours=7))).date().isoformat()
    result = operational_report(db, local_day, local_day)
    assert result["summary"]["scheduled"] == 1 and result["summary"]["due"] == 0
    assert result["tasks"][0]["status"] == "UPCOMING" and not result["actions"]


def test_unknown_unit_positive_delta_is_raw_only(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-RAW", za, "ELECTRICITY", "UNKNOWN", "CUMULATIVE")
    r1, r2 = round_at(db, batch, 10, 1, [target]), round_at(db, batch, 10, 3, [target])
    reading(db, batch, r1, target, users[0], "100")
    reading(db, batch, r2, target, users[0], "140")
    result = get_usage_overview(db, "2024-01-10", "2024-01-10")
    assert result.intervals[0].quality_status == "UNKNOWN_UNIT"
    assert result.intervals[0].delta == 40
    assert result.intervals[0].normalized_rate is None and result.intervals[0].rate_unit is None
    assert result.groups[0].total_delta is None


def test_zero_baseline_has_no_percentage_division(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-ZERO", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    for day, delta in ((10, 0), (11, 0), (12, 0), (13, 10)):
        r1, r2 = round_at(db, batch, day, 1, [target]), round_at(db, batch, day, 3, [target])
        reading(db, batch, r1, target, users[0], str(day * 100))
        reading(db, batch, r2, target, users[0], str(day * 100 + delta))
    intervals = derive_intervals(target, [(rd, rd.round) for rd in db.query(MeterReading).all()])
    current = next(i for i in intervals if i.to_scheduled_at.startswith("2024-01-13T03"))
    assert current.baseline_status == "AVAILABLE" and current.baseline_delta == 0
    assert current.deviation_percent is None


def test_usage_zone_attribution_uses_scope_snapshot(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-MOVED", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    r1, r2 = round_at(db, batch, 10, 1, [target]), round_at(db, batch, 10, 3, [target])
    reading(db, batch, r1, target, users[0], "100")
    reading(db, batch, r2, target, users[0], "140")
    target.zone_id = zb.id
    db.flush()
    result = get_usage_overview(db, "2024-01-10", "2024-01-10", zone_id=za.id)
    assert result.top_contributors[0].zone_id == za.id
    assert result.zone_breakdown[0].zone_id == za.id
    assert result.zone_breakdown[0].coverage.coverage_percent == 100


def test_usage_meter_picker_retains_all_scoped_meters_when_selected(db):
    batch, za, zb, users = setup(db)
    first = meter(db, "E-FIRST", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    second = meter(db, "E-SECOND", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    round_at(db, batch, 10, 1, [first, second])
    result = get_usage_overview(db, "2024-01-10", "2024-01-10", utility_type="ELECTRICITY", meter_id=first.id)
    assert {item["id"] for item in result.available_meters} == {first.id, second.id}
    assert result.groups[0].coverage.eligible_meters == 1


def test_long_reading_gap_uses_previous_confirmed_endpoint(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-GAP", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    old_round = round_at(db, batch, 1, 1, [target])
    new_round = round_at(db, batch, 20, 1, [target])
    reading(db, batch, old_round, target, users[0], "100")
    reading(db, batch, new_round, target, users[0], "140")
    result = get_usage_overview(db, "2024-01-20", "2024-01-20", utility_type="ELECTRICITY")
    assert len(result.intervals) == 1
    assert result.intervals[0].delta == 40
    assert result.groups[0].coverage.meters_with_valid_interval == 1


def test_integrity_action_drills_to_reading_evidence(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-INTEGRITY", za)
    rd = round_at(db, batch, 10, 1, [target])
    assign(db, users[0], za)
    evidence = reading(db, batch, rd, target, users[0], "123", source="OCR_CONFIRMED")
    evidence.ocr_reading = "122"
    db.flush()
    actions = operational_report(db, "2024-01-10", "2024-01-10")["actions"]
    assert [(action["type"], action["reading_id"]) for action in actions] == [("DATA_INTEGRITY", evidence.id)]


def test_negative_latency_is_record_level_integrity_action(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-EARLY", za)
    rd = round_at(db, batch, 10, 1, [target])
    assign(db, users[0], za)
    evidence = reading(db, batch, rd, target, users[0], "123")
    evidence.server_timestamp = rd.scheduled_at - timedelta(minutes=5)
    db.flush()
    actions = operational_report(db, "2024-01-10", "2024-01-10")["actions"]
    assert [(action["type"], action["reading_id"]) for action in actions] == [("DATA_INTEGRITY", evidence.id)]


def test_measurement_metadata_migration_is_idempotent_and_unknown(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-LEGACY", za)
    db.commit()
    engine = db.get_bind()
    with engine.begin() as conn:
        conn.exec_driver_sql("ALTER TABLE meters DROP COLUMN measurement_unit")
        conn.exec_driver_sql("ALTER TABLE meters DROP COLUMN register_semantics")
    db.expire_all()
    migrate_db(engine)
    migrate_db(engine)
    db.expire_all()
    restored = db.query(Meter).filter(Meter.id == target.id).one()
    assert restored.measurement_unit == "UNKNOWN"
    assert restored.register_semantics == "UNKNOWN"


def test_empty_single_point_and_complete_states(db):
    batch, za, zb, users = setup(db)
    empty = operational_report(db, "2024-01-10", "2024-01-10")
    assert empty["summary"]["scheduled"] == 0 and empty["actions"] == []
    target = meter(db, "E-ONE", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    first = round_at(db, batch, 10, 1, [target])
    round_at(db, batch, 10, 3, [])
    assign(db, users[0], za)
    reading(db, batch, first, target, users[0], "100")
    db.flush()
    operations = operational_report(db, "2024-01-10", "2024-01-10")
    assert operations["summary"]["scheduled"] == operations["summary"]["confirmed"] == 1
    assert operations["summary"]["completion_percent"] == 100
    assert operations["summary"]["unassigned_due"] == 0 and operations["actions"] == []
    usage = get_usage_overview(db, "2024-01-10", "2024-01-10")
    assert usage.groups[0].total_delta is None
    assert usage.data_quality["INSUFFICIENT_DATA"] == 1


def test_mixed_units_in_one_utility_cannot_be_added(db):
    batch, za, zb, users = setup(db)
    valid = meter(db, "E-KWH", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    incompatible = meter(db, "E-M3", za, "ELECTRICITY", "M3", "CUMULATIVE")
    r1, r2 = round_at(db, batch, 10, 1, [valid, incompatible]), round_at(db, batch, 10, 3, [valid, incompatible])
    for target in (valid, incompatible):
        reading(db, batch, r1, target, users[0], "100")
        reading(db, batch, r2, target, users[0], "140")
    result = get_usage_overview(db, "2024-01-10", "2024-01-10")
    assert {(group.measurement_unit, group.total_delta) for group in result.groups} == {("KWH", 40), ("M3", None)}
    assert result.data_quality["UNKNOWN_UNIT"] == 1


def test_existing_meter_metadata_path_sets_authoritative_unit_and_semantics(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "W-META", za, "WATER")
    result = update_meter_metadata(db, users[0], target.id, MeterMetadataUpdateRequest(
        measurement_unit="M3", register_semantics="CUMULATIVE",
    ))
    assert result["measurement_unit"] == "M3"
    assert result["register_semantics"] == "CUMULATIVE"


def test_admin_reporting_routes_validate_typed_responses(db):
    batch, za, zb, users = setup(db)
    target = meter(db, "E-API", za, "ELECTRICITY", "KWH", "CUMULATIVE")
    r1, r2 = round_at(db, batch, 10, 1, [target]), round_at(db, batch, 10, 3, [target])
    reading(db, batch, r1, target, users[0], "100")
    reading(db, batch, r2, target, users[0], "140")
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_admin] = lambda: users[0]
    try:
        with TestClient(app) as client:
            params = {"start_date": "2024-01-10", "end_date": "2024-01-10"}
            operations = client.get("/api/v1/admin/reports/operations/overview", params=params)
            usage = client.get("/api/v1/admin/reports/usage/overview", params=params)
            meter_usage = client.get(f"/api/v1/admin/reports/usage/meters/{target.id}", params=params)
        assert operations.status_code == usage.status_code == meter_usage.status_code == 200
        assert operations.json()["summary"]["scheduled"] == 2
        assert usage.json()["groups"][0]["total_delta"] == 40
        assert len(meter_usage.json()["intervals"]) == 1
    finally:
        app.dependency_overrides.clear()
