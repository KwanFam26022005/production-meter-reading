import os
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import generate_csrf_token, hash_password, hash_session_token
from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import Base, get_db
from backend.app.main import app
from backend.app.models import (
    Meter,
    OperationalZone,
    MeterReading,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
)

settings = get_settings()
LOCAL_TZ = ZoneInfo(settings.timezone)


@pytest.fixture
def test_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db_session):
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def employee_user(test_db_session):
    u = User(
        id=str(uuid.uuid4()),
        employee_code="52300001",
        full_name="Nguyễn Văn Nhân Viên",
        password_hash=hash_password("Password123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    test_db_session.add(u)
    test_db_session.commit()
    test_db_session.refresh(u)
    return u


@pytest.fixture
def admin_user(test_db_session):
    u = User(
        id=str(uuid.uuid4()),
        employee_code="52300099",
        full_name="Trần Thị Quản Trị",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    test_db_session.add(u)
    test_db_session.commit()
    test_db_session.refresh(u)
    return u


def create_auth_session(db, user: User, client: TestClient):
    token = f"test_session_token_{uuid.uuid4().hex}"
    t_hash = hash_session_token(token)
    session_obj = SessionModel(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=t_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
        ip_address="127.0.0.1",
        user_agent="TestRunner",
    )
    db.add(session_obj)
    db.commit()
    client.cookies.set("csg_session", token)
    csrf = generate_csrf_token(token)
    return token, csrf


@pytest.fixture
def sample_operational_data(test_db_session, admin_user):
    # Batch
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Đợt ghi tháng 08/2026",
        period_key="2026-08",
        status="OPEN",
    )
    test_db_session.add(batch)
    test_db_session.commit()

    # 9D groups by operational zone, never the meters' free-text locations.
    zones = [
        OperationalZone(id="technical-zone-a", code="TECH-A", name="Operational Zone A", map_polygon="[]"),
        OperationalZone(id="technical-zone-b", code="TECH-B", name="Operational Zone B", map_polygon="[]"),
    ]
    test_db_session.add_all(zones)
    test_db_session.flush()

    # Meters
    m1 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-001",
        zone_id=zones[0].id,
        name="Công tơ Trạm A",
        location="Trạm điện A",
        meter_type="MECHANICAL",
        is_active=True,
    )
    m2 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-002",
        zone_id=zones[1].id,
        name="Công tơ Kho B",
        location="Kho B",
        meter_type="LCD",
        is_active=True,
    )
    test_db_session.add_all([m1, m2])
    test_db_session.commit()

    # Rounds on 2026-08-28 (Past historical)
    r1_sched = datetime(2026, 8, 28, 1, 0, 0, tzinfo=timezone.utc)  # 08:00 local
    r2_sched = datetime(2026, 8, 28, 2, 0, 0, tzinfo=timezone.utc)  # 09:00 local

    r1 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=r1_sched,
        status="OPEN",
        is_legacy=False,
    )
    r2 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=r2_sched,
        status="OPEN",
        is_legacy=False,
    )
    test_db_session.add_all([r1, r2])
    test_db_session.commit()

    # Readings
    # r1, m1: OCR_CONFIRMED (canonical string with leading zero)
    rd1 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=admin_user.id,
        reading="0036548.9",
        ocr_reading="0036548.9",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        meter_type="mechanical",
        server_timestamp=r1_sched + timedelta(minutes=7),
    )
    # r1, m2: USER_CORRECTED (canonical string)
    rd2 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=admin_user.id,
        reading="001656.64",
        ocr_reading="001656.60",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        meter_type="lcd",
        server_timestamp=r1_sched + timedelta(minutes=12),
    )
    # r2, m1: MANUAL_ENTRY
    rd3 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=admin_user.id,
        reading="0036555.2",
        ocr_reading=None,
        confirmation_source="MANUAL_ENTRY",
        status="CONFIRMED",
        meter_type="mechanical",
        server_timestamp=r2_sched + timedelta(minutes=5),
    )
    # r2, m2: REVIEW
    rd4 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=admin_user.id,
        reading=None,
        ocr_reading="001660.00",
        confirmation_source="OCR_CONFIRMED",
        status="REVIEW",
        meter_type="lcd",
        server_timestamp=r2_sched + timedelta(minutes=15),
    )
    test_db_session.add_all([rd1, rd2, rd3, rd4])
    test_db_session.commit()

    return {
        "batch": batch,
        "m1": m1,
        "m2": m2,
        "r1": r1,
        "r2": r2,
    }


def test_admin_technical_reports_authorization(test_db_session, client, employee_user, admin_user):
    # 1. Unauthenticated -> 401
    res = client.get("/api/v1/admin/reports/technical/overview")
    assert res.status_code == 401

    # 2. Login as Employee -> 403
    create_auth_session(test_db_session, employee_user, client)
    res_emp = client.get("/api/v1/admin/reports/technical/overview")
    assert res_emp.status_code == 403

    # 3. Login as Admin -> 200
    create_auth_session(test_db_session, admin_user, client)
    res_admin = client.get("/api/v1/admin/reports/technical/overview")
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "summary" in data
    assert "date_range" in data


def test_admin_technical_overview_metrics(test_db_session, client, admin_user, sample_operational_data):
    create_auth_session(test_db_session, admin_user, client)

    res = client.get(
        "/api/v1/admin/reports/technical/overview?start_date=2026-08-01&end_date=2026-08-31"
    )
    assert res.status_code == 200
    data = res.json()
    summary = data["summary"]

    assert summary["total_scheduled_rounds"] == 2
    assert summary["total_due_slots"] == 4
    assert summary["total_confirmed"] == 3
    assert summary["total_review"] == 1
    assert summary["completion_rate"] == 75.0
    assert summary["human_intervention_count"] == 2  # 1 corrected + 1 manual
    assert summary["human_intervention_rate"] == 66.7
    assert summary["ocr_confirmed_count"] == 1
    assert summary["ocr_confirmed_rate"] == 33.3

    # Latencies: 7, 12, 5 mins -> sorted: [5, 7, 12] -> p50=7.0
    assert summary["recording_latency_p50_minutes"] == 7.0

    # Data integrity zero violations
    assert data["data_integrity"]["total_violations"] == 0

    # Quality by type
    assert len(data["quality_by_type"]) == 2
    groups = {row["location"]: row for row in data["quality_by_location"]}
    assert set(groups) == {"Operational Zone A", "Operational Zone B"}
    assert groups["Operational Zone A"]["confirmed_count"] == 2
    assert groups["Operational Zone B"]["confirmed_count"] == 1
    assert sample_operational_data["m1"].location not in groups
    assert sample_operational_data["m2"].location not in groups


def test_admin_technical_meters_endpoint(test_db_session, client, admin_user, sample_operational_data):
    create_auth_session(test_db_session, admin_user, client)
    m2_id = sample_operational_data["m2"].id

    res = client.get(
        f"/api/v1/admin/reports/technical/meters?start_date=2026-08-01&end_date=2026-08-31&meter_id={m2_id}"
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["meters"]) == 2
    assert data["selected_meter_id"] == m2_id
    assert len(data["history"]) == 2
    assert len(data["cumulative_trend"]) == 1

    # Exact canonical reading string check
    assert data["history"][0]["reading"] == "001656.64"
    assert data["cumulative_trend"][0]["canonical_reading"] == "001656.64"


def test_admin_technical_details_endpoint(test_db_session, client, admin_user, sample_operational_data):
    create_auth_session(test_db_session, admin_user, client)

    res = client.get(
        "/api/v1/admin/reports/technical/details?start_date=2026-08-01&end_date=2026-08-31&page=1&limit=10"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 4
    assert len(data["items"]) == 4


def test_admin_technical_export_csv(test_db_session, client, admin_user, sample_operational_data):
    create_auth_session(test_db_session, admin_user, client)

    res = client.get(
        "/api/v1/admin/reports/technical/export.csv?start_date=2026-08-01&end_date=2026-08-31"
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    content = res.content.decode("utf-8")
    assert content.startswith("\ufeff")  # UTF-8 BOM
    assert "0036548.9" in content
    assert "001656.64" in content
    assert "Xác nhận từ OCR" in content
    assert "Đã hiệu chỉnh" in content
    assert "Nhập thủ công" in content


def test_admin_technical_route_registration():
    """Verify exact route paths exist on FastAPI application object."""
    routes = [r.path for r in app.routes if hasattr(r, "path")]
    expected_routes = [
        "/api/v1/admin/reports/technical/overview",
        "/api/v1/admin/reports/technical/meters",
        "/api/v1/admin/reports/technical/details",
        "/api/v1/admin/reports/technical/export.csv",
    ]
    for expected in expected_routes:
        assert expected in routes, f"Missing route {expected} in FastAPI app.routes"

