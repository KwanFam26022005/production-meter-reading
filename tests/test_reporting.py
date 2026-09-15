import csv
import io
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from backend.app.db import Base, get_db
from backend.app.main import app
from backend.app.models import Meter, MeterReading, ReadingBatch, ReadingRound, User
from backend.app.auth import hash_password


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
def sample_user(test_db_session: Session):
    user = test_db_session.query(User).filter(User.employee_code == "REP001").first()
    if not user:
        user = User(
            employee_code="REP001",
            full_name="Pham Hong Dang Khoa",
            password_hash=hash_password("Password123"),
            is_active=True,
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)
    return user


def login_and_get_csrf(client: TestClient, employee_code: str = "REP001", password: str = "Password123"):
    resp = client.post(
        "/api/v1/auth/login",
        json={"employee_code": employee_code, "password": password},
    )
    assert resp.status_code == 200
    cookies = resp.cookies
    csrf_resp = client.get("/api/v1/auth/csrf", cookies=cookies)
    csrf_token = csrf_resp.json()["csrf_token"]
    return cookies, csrf_token


def create_reading_batch(db: Session, period_key: str = "2026-08") -> ReadingBatch:
    batch = db.query(ReadingBatch).filter(ReadingBatch.period_key == period_key).first()
    if not batch:
        batch = ReadingBatch(
            name=f"Đợt ghi chỉ số {period_key}",
            period_key=period_key,
            status="OPEN",
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
    return batch


def create_test_round(db: Session, batch_id: str, scheduled_at: datetime, is_legacy: bool = False) -> ReadingRound:
    round_obj = ReadingRound(
        batch_id=batch_id,
        scheduled_at=scheduled_at,
        status="OPEN",
        is_legacy=is_legacy,
    )
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    return round_obj


def test_report_overview_requires_auth(client):
    resp = client.get("/api/v1/reports/overview")
    assert resp.status_code == 401


def test_report_overview_metrics_hourly_and_locations(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")

    m1 = Meter(meter_code="REP-001", name="Công tơ Trạm A1", location="Trạm điện A", meter_type="LCD", is_active=True)
    m2 = Meter(meter_code="REP-002", name="Công tơ Trạm A2", location="Trạm điện A", meter_type="MECHANICAL", is_active=True)
    m3 = Meter(meter_code="REP-003", name="Công tơ Kho B", location="Kho B", meter_type="LCD", is_active=True)
    m_off = Meter(meter_code="REP-OFF", name="Công tơ hỏng", location="Kho B", is_active=False)
    test_db_session.add_all([m1, m2, m3, m_off])
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # 08:00 (past)
    r1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    # 09:00 (current)
    r2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))
    # 10:00 (upcoming)
    r3 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc + timedelta(hours=1))

    # r1 (08:00): m1 -> 100.0 (CONFIRMED), m2 -> 200.0 (CONFIRMED), m3 -> PENDING
    rd1 = MeterReading(
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="100.00",
        ocr_reading="100.00",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    rd2 = MeterReading(
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="200.00",
        ocr_reading="200.00",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    # r2 (09:00 - current): m1 -> 105.0 (CONFIRMED), m2 -> REVIEW, m3 -> PENDING
    rd3 = MeterReading(
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=sample_user.id,
        reading="105.00",
        ocr_reading="105.00",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(minutes=5),
    )
    rd4 = MeterReading(
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=sample_user.id,
        reading=None,
        status="REVIEW",
        server_timestamp=now_utc - timedelta(minutes=5),
    )
    test_db_session.add_all([rd1, rd2, rd3, rd4])
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get("/api/v1/reports/overview")
    assert resp.status_code == 200
    data = resp.json()

    # 1. Summary
    summary = data["summary"]
    # Total active meters in DB >= 3
    assert summary["total_meters"] >= 3
    assert summary["confirmed_slots"] >= 3
    assert summary["review_slots"] >= 1
    assert summary["due_slots"] > 0
    assert summary["completion_percent"] > 0

    # 2. Hourly Progress
    hourly = data["hourly"]
    assert len(hourly) >= 3
    # Check that r1 and r2 are PAST / CURRENT and r3 is UPCOMING
    h_r1 = next(h for h in hourly if h["round_id"] == r1.id)
    assert h_r1["timing_state"] == "PAST"
    assert h_r1["confirmed"] >= 2

    h_r2 = next(h for h in hourly if h["round_id"] == r2.id)
    assert h_r2["timing_state"] == "CURRENT"
    assert h_r2["confirmed"] >= 1
    assert h_r2["review"] >= 1

    h_r3 = next(h for h in hourly if h["round_id"] == r3.id)
    assert h_r3["timing_state"] == "UPCOMING"
    assert h_r3["confirmed"] == 0

    # 3. Locations
    locations = data["locations"]
    assert len(locations) >= 2
    loc_names = [l["location"] for l in locations]
    assert "Trạm điện A" in loc_names
    assert "Kho B" in loc_names


def test_report_meter_detail_and_trend(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="REP-DETAIL", name="Công tơ Detail Test", location="Trạm Detail", meter_type="LCD", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    r1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    r2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))

    rd1 = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="5000.00",
        ocr_reading="5000.00",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    rd2 = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=sample_user.id,
        reading="5012.50",
        ocr_reading="5012.00",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(minutes=5),
    )
    test_db_session.add_all([rd1, rd2])
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get(f"/api/v1/reports/meters/{m.id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["meter"]["meter_code"] == "REP-DETAIL"
    assert data["latest_confirmed"]["reading"] == "5012.50"
    assert data["completion"]["confirmed"] == 2
    assert len(data["trend"]) == 2
    assert data["trend"][0]["reading"] == "5000.00"
    assert data["trend"][1]["reading"] == "5012.50"


def test_export_report_csv(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="REP-CSV", name="Công tơ CSV", location="Trạm CSV", meter_type="LCD", is_active=True)
    test_db_session.add(m)
    r = create_test_round(test_db_session, batch.id, scheduled_at=datetime.now(timezone.utc))
    rd = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r.id,
        user_id=sample_user.id,
        reading="1234.56",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=datetime.now(timezone.utc),
    )
    test_db_session.add(rd)
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get("/api/v1/reports/export.csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment; filename=" in resp.headers["content-disposition"]

    # Verify UTF-8 BOM and headers
    content_bytes = resp.content
    assert content_bytes.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM

    content_str = content_bytes.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(content_str))
    rows = list(reader)
    assert len(rows) >= 2  # Header + at least 1 data row

    headers = rows[0]
    expected_headers = [
        "Ngày tác nghiệp",
        "Khung giờ",
        "Mã công tơ",
        "Tên công tơ",
        "Vị trí / Trạm",
        "Loại công tơ",
        "Trạng thái",
        "Chỉ số (kWh)",
        "Chỉ số OCR",
        "Nguồn xác nhận",
        "Thời gian ghi",
        "Mã nhân viên",
        "Họ tên nhân viên",
    ]
    assert headers == expected_headers

    # Verify no leaked secrets or images
    assert "password" not in content_str.lower()
    assert "session" not in content_str.lower()
    assert "data:image" not in content_str
