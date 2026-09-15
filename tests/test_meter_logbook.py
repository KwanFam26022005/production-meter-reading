import io
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth import hash_password
from backend.app.config import get_settings
from backend.app.db import Base, get_db, migrate_db
from backend.app.main import app
from backend.app.models import Meter, MeterReading, ReadingBatch, ReadingRound, User
from backend.scripts.create_reading_batch import create_reading_batch, close_reading_batch
from backend.scripts.create_reading_rounds import generate_reading_rounds
from backend.scripts.import_meters import import_meters_from_csv

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
def sample_user(test_db_session):
    user = User(
        employee_code="NV001",
        full_name="Nguyễn Văn A",
        password_hash=hash_password("Pass1234"),
        role="EMPLOYEE",
        is_active=True,
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


def login_and_get_csrf(client: TestClient, employee_code: str = "NV001", password: str = "Pass1234") -> tuple[dict, str]:
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"employee_code": employee_code, "password": password},
    )
    assert login_resp.status_code == 200
    cookies = client.cookies

    csrf_resp = client.get("/api/v1/auth/csrf")
    assert csrf_resp.status_code == 200
    csrf_token = csrf_resp.json()["csrf_token"]
    return cookies, csrf_token


def create_test_round(
    db,
    batch_id: str,
    scheduled_at: datetime | None = None,
    status: str = "OPEN",
    is_legacy: bool = False,
) -> ReadingRound:
    now_utc = datetime.now(timezone.utc)
    sched = scheduled_at or (now_utc - timedelta(minutes=5))
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch_id,
        scheduled_at=sched,
        status=status,
        is_legacy=is_legacy,
        created_at=now_utc,
    )
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    return round_obj


# ==============================================================================
# 1. CSV IMPORT & METER MASTER TESTS
# ==============================================================================
def test_meter_csv_import_and_uniqueness(test_db_session):
    csv_content = """meter_code,name,location,meter_type
CT-001,Công tơ trạm A,Trạm điện A,MECHANICAL
CT-002,Công tơ kho B,Kho B,LCD
CT-003,Công tơ cầu tàu 1,Cầu tàu 1,UNKNOWN
"""
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".csv") as tmp:
        tmp.write(csv_content)
        tmp_path = tmp.name

    try:
        created, updated, skipped, errors = import_meters_from_csv(test_db_session, tmp_path)
        assert created == 3
        assert updated == 0
        assert skipped == 0
        assert len(errors) == 0

        meters = test_db_session.query(Meter).all()
        assert len(meters) == 3

        m1 = test_db_session.query(Meter).filter(Meter.meter_code == "CT-001").first()
        assert m1 is not None
        assert m1.name == "Công tơ trạm A"
        assert m1.location == "Trạm điện A"
        assert m1.meter_type == "MECHANICAL"

        # Re-importing without update_existing should skip
        created2, updated2, skipped2, errors2 = import_meters_from_csv(test_db_session, tmp_path)
        assert created2 == 0
        assert skipped2 == 3

        # Re-importing with update_existing
        created3, updated3, skipped3, errors3 = import_meters_from_csv(test_db_session, tmp_path, update_existing=True)
        assert created3 == 0
        assert updated3 == 3
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ==============================================================================
# 2. READING BATCH PROVISIONING & SINGLE OPEN BATCH ENFORCEMENT
# ==============================================================================
def test_create_reading_batch_and_single_open_enforcement(test_db_session):
    b1 = create_reading_batch(test_db_session, period_key="2026-08", name="Đợt Tháng 08/2026")
    assert b1.id is not None
    assert b1.status == "OPEN"
    assert b1.period_key == "2026-08"

    # Attempting to create a second OPEN batch must fail
    with pytest.raises(RuntimeError, match="Hiện đã có đợt ghi chỉ số đang MỞ"):
        create_reading_batch(test_db_session, period_key="2026-09", name="Đợt Tháng 09/2026")

    # Closing current batch
    closed = close_reading_batch(test_db_session, b1.id)
    assert closed.status == "CLOSED"
    assert closed.closed_at is not None

    # Now creating a new OPEN batch succeeds
    b2 = create_reading_batch(test_db_session, period_key="2026-09", name="Đợt Tháng 09/2026")
    assert b2.status == "OPEN"
    assert b2.period_key == "2026-09"


# ==============================================================================
# 3. CURRENT BATCH & BATCH METERS API
# ==============================================================================
def test_current_batch_api_and_derived_pending(client, test_db_session, sample_user):
    m1 = Meter(meter_code="CT-001", name="Công tơ trạm A", location="Trạm điện A", is_active=True)
    m2 = Meter(meter_code="CT-002", name="Công tơ kho B", location="Kho B", is_active=True)
    m3 = Meter(meter_code="CT-003", name="Công tơ cầu tàu 1", location="Cầu tàu 1", is_active=True)
    m_inactive = Meter(meter_code="CT-999", name="Công tơ hỏng", location="Kho phế liệu", is_active=False)
    test_db_session.add_all([m1, m2, m3, m_inactive])
    test_db_session.commit()

    # Before creating a batch: GET /current should return 404
    cookies, csrf_token = login_and_get_csrf(client)
    res_no_batch = client.get("/api/v1/reading-batches/current")
    assert res_no_batch.status_code == 404
    assert "Chưa có đợt ghi chỉ số đang mở" in res_no_batch.json()["detail"]

    # Create OPEN batch
    batch = create_reading_batch(test_db_session, period_key="2026-08", name="Đợt Tháng 08/2026")

    # GET /current should return batch with progress
    res_current = client.get("/api/v1/reading-batches/current")
    assert res_current.status_code == 200
    data = res_current.json()
    assert data["id"] == batch.id
    assert data["name"] == "Đợt Tháng 08/2026"
    assert data["progress"]["total"] == 3
    assert data["progress"]["pending"] == 3
    assert data["progress"]["confirmed"] == 0
    assert data["progress"]["review"] == 0


# ==============================================================================
# 4. BATCH METERS SEARCH & FILTERS
# ==============================================================================
def test_batch_meters_search_and_filters(client, test_db_session, sample_user):
    m1 = Meter(meter_code="CT-001", name="Công tơ trạm A", location="Trạm điện A", is_active=True)
    m2 = Meter(meter_code="CT-002", name="Công tơ kho B", location="Kho B", is_active=True)
    test_db_session.add_all([m1, m2])
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    cookies, csrf = login_and_get_csrf(client)

    # Search by code
    res_search_code = client.get(f"/api/v1/reading-batches/{batch.id}/meters?search=CT-001")
    assert res_search_code.status_code == 200
    assert len(res_search_code.json()["meters"]) == 1
    assert res_search_code.json()["meters"][0]["meter"]["meter_code"] == "CT-001"

    # Search by location
    res_search_loc = client.get(f"/api/v1/reading-batches/{batch.id}/meters?search=Kho%20B")
    assert res_search_loc.status_code == 200
    assert len(res_search_loc.json()["meters"]) == 1
    assert res_search_loc.json()["meters"][0]["meter"]["meter_code"] == "CT-002"

    # Filter PENDING
    res_filter_pending = client.get(f"/api/v1/reading-batches/{batch.id}/meters?status=PENDING")
    assert res_filter_pending.status_code == 200
    assert len(res_filter_pending.json()["meters"]) == 2


# ==============================================================================
# 5. READING ROUND CREATION, LISTING & CURRENT ROUND SELECTION
# ==============================================================================
def test_reading_round_creation_and_current_selection(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08", name="Đợt Tháng 08/2026")
    m1 = Meter(meter_code="CT-001", name="Công tơ 1", is_active=True)
    m2 = Meter(meter_code="CT-002", name="Công tơ 2", is_active=True)
    test_db_session.add_all([m1, m2])
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # Create past round (08:00 today)
    r1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    # Create current round (09:00 today, 30 min ago)
    r2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=30))
    # Create upcoming round (11:00 today, 1 hour from now)
    r3 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc + timedelta(hours=1))

    cookies, csrf = login_and_get_csrf(client)

    # 1. GET /api/v1/reading-rounds/current
    res_curr = client.get("/api/v1/reading-rounds/current")
    assert res_curr.status_code == 200
    data_curr = res_curr.json()
    assert data_curr["current_round"] is not None
    assert data_curr["current_round"]["id"] == r2.id
    assert data_curr["current_round"]["timing_state"] == "CURRENT"
    assert data_curr["nearest_upcoming_round"] is not None
    assert data_curr["nearest_upcoming_round"]["id"] == r3.id
    assert data_curr["nearest_upcoming_round"]["timing_state"] == "UPCOMING"

    # 2. GET /api/v1/reading-batches/{batch_id}/rounds
    res_list = client.get(f"/api/v1/reading-batches/{batch.id}/rounds")
    assert res_list.status_code == 200
    rounds_data = res_list.json()["rounds"]
    assert len(rounds_data) == 3
    assert rounds_data[0]["id"] == r1.id
    assert rounds_data[0]["timing_state"] == "PAST"
    assert rounds_data[1]["id"] == r2.id
    assert rounds_data[1]["timing_state"] == "CURRENT"
    assert rounds_data[2]["id"] == r3.id
    assert rounds_data[2]["timing_state"] == "UPCOMING"


# ==============================================================================
# 6. MULTI-DAY ROUNDS & DATE SCOPING TESTS
# ==============================================================================
def test_multi_day_rounds_and_date_scoping(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m1 = Meter(meter_code="CT-001", name="Công tơ 1", is_active=True)
    test_db_session.add(m1)
    test_db_session.commit()

    # Day 1: 2026-08-27 (08:00 and 09:00 in Vietnam time)
    # 08:00 VN = 01:00 UTC, 09:00 VN = 02:00 UTC
    r_day1_1 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 27, 1, 0, tzinfo=timezone.utc))
    r_day1_2 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 27, 2, 0, tzinfo=timezone.utc))

    # Day 2: 2026-08-28 (08:00 and 09:00 in Vietnam time)
    # 08:00 VN = 01:00 UTC on 28th
    r_day2_1 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 28, 1, 0, tzinfo=timezone.utc))
    r_day2_2 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 28, 2, 0, tzinfo=timezone.utc))

    cookies, csrf = login_and_get_csrf(client)

    # 1. Query rounds with date=2026-08-27 -> must return only 2 rounds of Day 1
    res_d1 = client.get(f"/api/v1/reading-batches/{batch.id}/rounds?date=2026-08-27")
    assert res_d1.status_code == 200
    d1_rounds = res_d1.json()["rounds"]
    assert len(d1_rounds) == 2
    assert d1_rounds[0]["id"] == r_day1_1.id
    assert d1_rounds[1]["id"] == r_day1_2.id

    # 2. Query rounds with date=2026-08-28 -> must return only 2 rounds of Day 2
    res_d2 = client.get(f"/api/v1/reading-batches/{batch.id}/rounds?date=2026-08-28")
    assert res_d2.status_code == 200
    d2_rounds = res_d2.json()["rounds"]
    assert len(d2_rounds) == 2
    assert d2_rounds[0]["id"] == r_day2_1.id
    assert d2_rounds[1]["id"] == r_day2_2.id

    # 3. Query current round scoped to date=2026-08-28
    res_curr_d2 = client.get("/api/v1/reading-rounds/current?date=2026-08-28")
    assert res_curr_d2.status_code == 200
    curr_d2_data = res_curr_d2.json()
    # If 2026-08-28 is in the past/future, it resolves against 2026-08-28 rounds only
    if curr_d2_data["current_round"]:
        assert curr_d2_data["current_round"]["id"] in (r_day2_1.id, r_day2_2.id)
    if curr_d2_data["nearest_upcoming_round"]:
        assert curr_d2_data["nearest_upcoming_round"]["id"] in (r_day2_1.id, r_day2_2.id)


# ==============================================================================
# 7. LEGACY ROUND VISIBILITY & AUDIT TESTS
# ==============================================================================
def test_legacy_round_visibility_and_history_audit(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    meter = Meter(meter_code="CT-LEGACY", name="Công tơ cũ", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # Create legacy round (is_legacy = True)
    legacy_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=5), is_legacy=True)
    
    # Create normal operational round (is_legacy = False)
    normal_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10), is_legacy=False)

    # Record reading in legacy round
    legacy_reading = MeterReading(
        meter_id=meter.id,
        batch_id=batch.id,
        reading_round_id=legacy_round.id,
        user_id=sample_user.id,
        reading="1000.00",
        ocr_reading="1000.00",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=5),
    )
    test_db_session.add(legacy_reading)
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)

    # 1. Normal schedule listing (include_legacy=False by default) -> must NOT contain legacy round
    res_list = client.get(f"/api/v1/reading-batches/{batch.id}/rounds")
    assert res_list.status_code == 200
    rounds = res_list.json()["rounds"]
    assert len(rounds) == 1
    assert rounds[0]["id"] == normal_round.id
    assert rounds[0]["is_legacy"] is False

    # 2. Current round resolution must NOT pick legacy round
    res_curr = client.get("/api/v1/reading-rounds/current")
    assert res_curr.status_code == 200
    curr = res_curr.json()["current_round"]
    assert curr is not None
    assert curr["id"] == normal_round.id

    # 3. Explicit query with include_legacy=true returns both
    res_all = client.get(f"/api/v1/reading-batches/{batch.id}/rounds?include_legacy=true")
    assert res_all.status_code == 200
    assert len(res_all.json()["rounds"]) == 2

    # 4. Legacy reading remains 100% visible in Meter History / Audit
    res_hist = client.get(f"/api/v1/meters/{meter.id}")
    assert res_hist.status_code == 200
    hist = res_hist.json()["history"]
    assert len(hist) == 1
    assert hist[0]["reading"] == "1000.00"
    assert hist[0]["reading_round_id"] == legacy_round.id


# ==============================================================================
# 8. ROUND METERS LIST & DERIVED PENDING PER ROUND
# ==============================================================================
def test_round_meters_list_and_filters(client, test_db_session, sample_user):
    m1 = Meter(meter_code="CT-001", name="Công tơ trạm A", location="Trạm điện A", is_active=True)
    m2 = Meter(meter_code="CT-002", name="Công tơ kho B", location="Kho B", is_active=True)
    test_db_session.add_all([m1, m2])
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # Search by code
    res_search = client.get(f"/api/v1/reading-rounds/{round_obj.id}/meters?search=CT-001")
    assert res_search.status_code == 200
    assert len(res_search.json()["meters"]) == 1
    assert res_search.json()["meters"][0]["meter"]["meter_code"] == "CT-001"

    # Filter PENDING
    res_pending = client.get(f"/api/v1/reading-rounds/{round_obj.id}/meters?status=PENDING")
    assert res_pending.status_code == 200
    assert len(res_pending.json()["meters"]) == 2


# ==============================================================================
# 9. CONFIRM READING & REVIEW IN ROUNDS
# ==============================================================================
def test_confirm_reading_and_review_in_round(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-100", name="Công tơ thử nghiệm", location="Xưởng 1", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # 1. Missing CSRF on confirm -> 403
    res_no_csrf = client.post(
        "/api/v1/meter-readings/confirm",
        json={"meter_id": meter.id, "reading_round_id": round_obj.id, "reading": "001234.5"},
    )
    assert res_no_csrf.status_code == 403

    # 2. Mark REVIEW
    res_review = client.post(
        "/api/v1/meter-readings/review",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": meter.id,
            "reading_round_id": round_obj.id,
            "localization_imgsz": 1280,
            "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
        },
    )
    assert res_review.status_code == 200
    review_data = res_review.json()
    assert review_data["reading_status"] == "REVIEW"
    assert review_data["reading"] is None

    # Check round meters shows REVIEW
    res_list = client.get(f"/api/v1/reading-rounds/{round_obj.id}/meters")
    item = res_list.json()["meters"][0]
    assert item["reading_status"] == "REVIEW"
    assert item["reading"] is None
    assert item["recorded_by"]["employee_code"] == sample_user.employee_code

    # 3. Transition from REVIEW to CONFIRMED within this round
    res_confirm = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": meter.id,
            "reading_round_id": round_obj.id,
            "reading": "001234.5",
            "meter_type": "lcd",
            "det_confidence": 0.95,
            "ocr_confidence": 0.99,
            "localization_imgsz": 960,
            "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
        },
    )
    assert res_confirm.status_code == 200
    confirm_data = res_confirm.json()
    assert confirm_data["reading_status"] == "CONFIRMED"
    assert confirm_data["reading"] == "001234.5"
    assert confirm_data["server_timestamp"] is not None

    # 4. Duplicate confirmation in same round must return 409
    res_dup = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": round_obj.id, "reading": "001234.5"},
    )
    assert res_dup.status_code == 409
    assert "đã được xác nhận chỉ số trong lượt hiện tại" in res_dup.json()["detail"]


# ==============================================================================
# 10. SAME METER MULTI-ROUND CONFIRMATION (08:00, 09:00, 10:00)
# ==============================================================================
def test_same_meter_confirmed_in_multiple_rounds(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-001", name="Công tơ Trạm Biến Áp 1", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    now_utc = datetime.now(timezone.utc)
    round1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    round2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=1))
    round3 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))

    cookies, csrf = login_and_get_csrf(client)

    # 1. Confirm CT-001 in Round 1 (08:00) -> 6734.60
    res1 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": round1.id, "reading": "6734.60", "ocr_reading": "6734.60"},
    )
    assert res1.status_code == 200

    # Verify CT-001 is CONFIRMED in Round 1, but still PENDING in Round 2
    r1_meters = client.get(f"/api/v1/reading-rounds/{round1.id}/meters").json()["meters"]
    assert r1_meters[0]["reading_status"] == "CONFIRMED"
    assert r1_meters[0]["reading"] == "6734.60"

    r2_meters = client.get(f"/api/v1/reading-rounds/{round2.id}/meters").json()["meters"]
    assert r2_meters[0]["reading_status"] == "PENDING"
    assert r2_meters[0]["reading"] is None

    # 2. Confirm CT-001 in Round 2 (09:00) -> 6740.20
    res2 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": round2.id, "reading": "6740.20", "ocr_reading": "6740.20"},
    )
    assert res2.status_code == 200

    # 3. Confirm CT-001 in Round 3 (10:00) -> 6751.40
    res3 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": round3.id, "reading": "6751.40", "ocr_reading": "6750.00"},
    )
    assert res3.status_code == 200

    # 4. Check Meter History shows all 3 readings in descending order
    hist_resp = client.get(f"/api/v1/meters/{meter.id}")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()["history"]
    assert len(hist) == 3
    assert hist[0]["reading"] == "6751.40"
    assert hist[0]["confirmation_source"] == "USER_CORRECTED"
    assert hist[1]["reading"] == "6740.20"
    assert hist[1]["confirmation_source"] == "OCR_CONFIRMED"
    assert hist[2]["reading"] == "6734.60"
    assert hist[2]["confirmation_source"] == "OCR_CONFIRMED"


# ==============================================================================
# 11. FUTURE ROUND & CLOSED ROUND REJECTIONS
# ==============================================================================
def test_future_and_closed_round_rejections(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-201", name="Công tơ A", is_active=True, lifecycle_status="ACTIVE")
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    now_utc = datetime.now(timezone.utc)
    future_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc + timedelta(hours=3))
    closed_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=1), status="CLOSED")

    cookies, csrf = login_and_get_csrf(client)

    # Confirm against future round -> 400
    res_future = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": future_round.id, "reading": "000100.0"},
    )
    assert res_future.status_code == 400
    assert "Chưa đến giờ ghi chỉ số cho lượt này" in res_future.json()["detail"]

    # Confirm against closed round -> 400
    res_closed = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": meter.id, "reading_round_id": closed_round.id, "reading": "000100.0"},
    )
    assert res_closed.status_code == 400
    assert "Lượt ghi chỉ số đã đóng" in res_closed.json()["detail"]


# ==============================================================================
# 12. CLOSED BATCH & INACTIVE METER REJECTIONS
# ==============================================================================
def test_closed_batch_and_inactive_meter_rejections(client, test_db_session, sample_user):
    m_active = Meter(meter_code="CT-201", name="Công tơ A", is_active=True)
    m_inactive = Meter(meter_code="CT-202", name="Công tơ B", is_active=False, lifecycle_status="INACTIVE")
    test_db_session.add_all([m_active, m_inactive])
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # Inactive meter confirm -> 400
    res_inactive = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": m_inactive.id, "reading_round_id": round_obj.id, "reading": "000100.0"},
    )
    assert res_inactive.status_code == 400
    assert "INACTIVE" in res_inactive.json()["detail"] or "tạm ngừng" in res_inactive.json()["detail"]

    # Close batch
    close_reading_batch(test_db_session, batch.id)

    # Confirm against closed batch -> 400
    res_closed = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={"meter_id": m_active.id, "reading_round_id": round_obj.id, "reading": "000100.0"},
    )
    assert res_closed.status_code == 400
    assert "Đợt ghi chỉ số đã đóng" in res_closed.json()["detail"]


# ==============================================================================
# 13. METER DETAIL & HISTORICAL READINGS
# ==============================================================================
def test_meter_detail_and_reading_history(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-300", name="Công tơ Trạm Biến Áp", location="Khu B", meter_type="LCD", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    # Create two batches with rounds
    b1 = create_reading_batch(test_db_session, period_key="2026-06", name="Đợt 06/2026")
    rd1 = create_test_round(test_db_session, b1.id, scheduled_at=datetime(2026, 6, 30, 8, 0, tzinfo=timezone.utc))
    r1 = MeterReading(
        meter_id=meter.id,
        batch_id=b1.id,
        reading_round_id=rd1.id,
        user_id=sample_user.id,
        reading="001000.0",
        status="CONFIRMED",
        server_timestamp=datetime(2026, 6, 30, 8, 0, tzinfo=timezone.utc),
    )
    test_db_session.add(r1)
    test_db_session.commit()
    close_reading_batch(test_db_session, b1.id)

    b2 = create_reading_batch(test_db_session, period_key="2026-07", name="Đợt 07/2026")
    rd2 = create_test_round(test_db_session, b2.id, scheduled_at=datetime(2026, 7, 31, 9, 30, tzinfo=timezone.utc))
    r2 = MeterReading(
        meter_id=meter.id,
        batch_id=b2.id,
        reading_round_id=rd2.id,
        user_id=sample_user.id,
        reading="001250.5",
        status="CONFIRMED",
        server_timestamp=datetime(2026, 7, 31, 9, 30, tzinfo=timezone.utc),
    )
    test_db_session.add(r2)
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)

    # GET /api/v1/meters/{meter_id}
    res_detail = client.get(f"/api/v1/meters/{meter.id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["meter"]["meter_code"] == "CT-300"
    assert len(detail["history"]) == 2
    # Verify newest first ordering
    assert detail["history"][0]["reading"] == "001250.5"
    assert detail["history"][1]["reading"] == "001000.0"
    assert detail["history"][0]["recorded_by"]["employee_code"] == sample_user.employee_code


# ==============================================================================
# 14. METER RESULT VERIFICATION & CORRECTION TESTS
# ==============================================================================
def test_confirmation_source_ocr_confirmed(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-401", name="Công tơ 401", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    payload = {
        "meter_id": meter.id,
        "reading_round_id": round_obj.id,
        "reading": "6734.60",
        "ocr_reading": "6734.60",
        "meter_type": "lcd",
        "det_confidence": 0.95,
        "ocr_confidence": 0.99,
        "localization_imgsz": 960,
        "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
    }
    resp = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json=payload,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["reading"] == "6734.60"
    assert data["ocr_reading"] == "6734.60"
    assert data["confirmation_source"] == "OCR_CONFIRMED"


def test_confirmation_source_user_corrected(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-402", name="Công tơ 402", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    payload = {
        "meter_id": meter.id,
        "reading_round_id": round_obj.id,
        "reading": "6734.80",
        "ocr_reading": "6734.60",
        "meter_type": "lcd",
        "det_confidence": 0.95,
        "ocr_confidence": 0.88,
        "localization_imgsz": 960,
        "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
    }
    resp = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json=payload,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["reading"] == "6734.80"
    assert data["ocr_reading"] == "6734.60"
    assert data["confirmation_source"] == "USER_CORRECTED"


def test_invalid_reading_format_rejections(client, test_db_session, sample_user):
    meter = Meter(meter_code="CT-403", name="Công tơ 403", is_active=True)
    test_db_session.add(meter)
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    invalid_readings = [
        "6734A",
        "67.34.80",
        "-123.4",
        "67,34",
        "abc",
        "123 kWh",
        "   ",
        "",
        "1234567890123",  # length 13 > MAX_READING_LENGTH (12)
    ]

    for inv in invalid_readings:
        resp = client.post(
            "/api/v1/meter-readings/confirm",
            headers={"X-CSRF-Token": csrf},
            json={
                "meter_id": meter.id,
                "reading_round_id": round_obj.id,
                "reading": inv,
                "ocr_reading": "6734.0",
            },
        )
        assert resp.status_code == 400, f"Expected 400 for '{inv}', got {resp.status_code}"


def test_roi_bbox_calculation_normalization():
    import numpy as np
    from backend.app.config import Settings
    from backend.app.inference import MeterReader

    settings = Settings()
    reader = MeterReader(settings)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = (100.0, 150.0, 300.0, 250.0)

    crop, norm_roi = reader._crop(img, bbox)
    assert crop.shape[0] > 0
    assert crop.shape[1] > 0
    nx1, ny1, nx2, ny2 = norm_roi
    assert 0.0 <= nx1 < nx2 <= 1.0
    assert 0.0 <= ny1 < ny2 <= 1.0


# ==============================================================================
# 15. LEGACY DATABASE MIGRATION COMPATIBILITY TEST WITH ROUNDS
# ==============================================================================
def test_existing_sqlite_database_migration_with_rounds(tmp_path):
    import sqlite3
    from backend.app.db import migrate_db
    from sqlalchemy import create_engine

    db_file = tmp_path / "legacy_app.db"
    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()

    # 1. Create legacy schema with old constraint UNIQUE(meter_id, batch_id)
    cursor.execute("""
    CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        employee_code VARCHAR(50) UNIQUE,
        full_name VARCHAR(100),
        password_hash VARCHAR(255),
        role VARCHAR(50),
        is_active BOOLEAN
    )
    """)
    cursor.execute("""
    CREATE TABLE meters (
        id VARCHAR(36) PRIMARY KEY,
        meter_code VARCHAR(50) UNIQUE,
        name VARCHAR(200),
        location VARCHAR(200),
        meter_type VARCHAR(50),
        is_active BOOLEAN
    )
    """)
    cursor.execute("""
    CREATE TABLE reading_batches (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(200),
        period_key VARCHAR(20),
        status VARCHAR(20),
        created_at DATETIME
    )
    """)
    cursor.execute("""
    CREATE TABLE meter_readings (
        id VARCHAR(36) PRIMARY KEY,
        meter_id VARCHAR(36),
        batch_id VARCHAR(36),
        user_id VARCHAR(36),
        reading VARCHAR(50),
        status VARCHAR(20),
        meter_type VARCHAR(50),
        det_confidence FLOAT,
        ocr_confidence FLOAT,
        localization_imgsz INTEGER,
        pipeline_version VARCHAR(100),
        server_timestamp DATETIME,
        created_at DATETIME,
        updated_at DATETIME,
        CONSTRAINT uq_meter_batch UNIQUE (meter_id, batch_id)
    )
    """)

    # 2. Insert representative legacy records
    cursor.execute("INSERT INTO users VALUES ('u1', 'NV001', 'Nguyen Van A', 'hash', 'EMPLOYEE', 1)")
    cursor.execute("INSERT INTO meters VALUES ('m1', 'CT-001', 'Tram A', 'Kho A', 'LCD', 1)")
    cursor.execute("INSERT INTO reading_batches VALUES ('b1', 'Dot 08/2026', '2026-08', 'OPEN', '2026-08-27 06:00:00')")
    cursor.execute("""
    INSERT INTO meter_readings VALUES (
        'r1', 'm1', 'b1', 'u1', '6734.60', 'CONFIRMED', 'lcd', 0.95, 0.99, 960, 'v1', '2026-08-27 08:04:00', '2026-08-27 08:04:00', '2026-08-27 08:04:00'
    )
    """)
    conn.commit()
    conn.close()

    # 3. Run migration on this engine
    db_engine = create_engine(f"sqlite:///{db_file}")
    migrate_db(db_engine)
    db_engine.dispose()

    # 4. Verify columns exist, legacy round created, row assigned reading_round_id and is_legacy=1
    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()
    cursor.execute("SELECT count(*), is_legacy FROM reading_rounds WHERE batch_id='b1'")
    r_count, is_leg = cursor.fetchone()
    assert r_count == 1
    assert is_leg == 1

    cursor.execute("SELECT id, reading, ocr_reading, confirmation_source, reading_round_id FROM meter_readings WHERE id='r1'")
    r1 = cursor.fetchone()
    assert r1[0] == 'r1'
    assert r1[1] == '6734.60'
    assert r1[2] == '6734.60'
    assert r1[3] == 'OCR_CONFIRMED'
    assert r1[4] is not None

    # 5. Insert a second round for the same batch and confirm the same meter again!
    cursor.execute("INSERT INTO reading_rounds (id, batch_id, scheduled_at, status, is_legacy, created_at, closed_at) VALUES ('round_2', 'b1', '2026-08-27 09:00:00', 'OPEN', 0, '2026-08-27 09:00:00', NULL)")
    cursor.execute("""
    INSERT INTO meter_readings VALUES (
        'r2', 'm1', 'b1', 'round_2', 'u1', '6740.20', '6740.20', 'OCR_CONFIRMED', 'CONFIRMED', 'lcd', 0.95, 0.99, 960, 'v1', '2026-08-27 09:05:00', '2026-08-27 09:05:00', '2026-08-27 09:05:00'
    )
    """)
    conn.commit()

    # Verify both readings exist for the same meter in different rounds of the same batch!
    cursor.execute("SELECT count(*) FROM meter_readings WHERE meter_id='m1' AND batch_id='b1'")
    assert cursor.fetchone()[0] == 2

    # Verify duplicate insertion into round_2 is blocked by UNIQUE(meter_id, reading_round_id)
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute("""
        INSERT INTO meter_readings VALUES (
            'r3', 'm1', 'b1', 'round_2', 'u1', '6745.00', '6745.00', 'OCR_CONFIRMED', 'CONFIRMED', 'lcd', 0.95, 0.99, 960, 'v1', '2026-08-27 09:06:00', '2026-08-27 09:06:00', '2026-08-27 09:06:00'
        )
        """)
        conn.commit()

    conn.close()


# ==============================================================================
# 16. METER-CENTRIC OPERATIONAL AGGREGATION TESTS
# ==============================================================================
def test_today_meter_operations_requires_auth(client):
    resp = client.get("/api/v1/meter-operations/today")
    assert resp.status_code == 401


def test_today_meter_operations_active_meters_and_current_status(client, test_db_session, sample_user):
    m1 = Meter(meter_code="CT-001", name="Công tơ Trạm A", location="Trạm A", meter_type="LCD", is_active=True)
    m2 = Meter(meter_code="CT-002", name="Công tơ Trạm B", location="Trạm B", meter_type="MECHANICAL", is_active=True)
    m3 = Meter(meter_code="CT-003", name="Công tơ Cầu Tàu", location="Cầu tàu 1", is_active=True)
    m_inactive = Meter(meter_code="CT-OFF", name="Công tơ Hỏng", is_active=False)
    test_db_session.add_all([m1, m2, m3, m_inactive])
    test_db_session.commit()

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    now_utc = datetime.now(timezone.utc)

    # 3 Rounds for today:
    # 08:00 (PAST)
    r1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    # 09:00 (CURRENT)
    r2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=15))
    # 10:00 (UPCOMING)
    r3 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc + timedelta(hours=1))

    # In Round 1 (08:00): CT-001 -> 100.00 (CONFIRMED), CT-002 -> 200.00 (CONFIRMED)
    rd1_m1 = MeterReading(
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="100.00",
        ocr_reading="100.00",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    rd1_m2 = MeterReading(
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="200.00",
        ocr_reading="200.00",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    # In Round 2 (09:00 - CURRENT): CT-001 -> 105.00 (CONFIRMED), CT-002 -> REVIEW, CT-003 -> PENDING
    rd2_m1 = MeterReading(
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=sample_user.id,
        reading="105.00",
        ocr_reading="105.00",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(minutes=10),
    )
    rd2_m2 = MeterReading(
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=r2.id,
        user_id=sample_user.id,
        reading=None,
        status="REVIEW",
        server_timestamp=now_utc - timedelta(minutes=8),
    )
    test_db_session.add_all([rd1_m1, rd1_m2, rd2_m1, rd2_m2])
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)

    resp = client.get("/api/v1/meter-operations/today")
    assert resp.status_code == 200
    data = resp.json()

    # 1. Summary verification
    assert data["batch"]["id"] == batch.id
    assert data["current_round"]["id"] == r2.id
    summary = data["summary"]
    assert summary["total_meters"] == 3
    assert summary["confirmed_current"] == 1
    assert summary["review_current"] == 1
    assert summary["pending_current"] == 1
    assert summary["percent_current"] == 33

    # 2. Active meters only
    meters = data["meters"]
    assert len(meters) == 3
    meter_codes = [item["meter"]["meter_code"] for item in meters]
    assert "CT-OFF" not in meter_codes
    assert "CT-001" in meter_codes
    assert "CT-002" in meter_codes
    assert "CT-003" in meter_codes

    # 3. CT-001: CONFIRMED in current round (105.00), latest is 105.00
    item1 = next(item for item in meters if item["meter"]["meter_code"] == "CT-001")
    assert item1["current_status"] == "CONFIRMED"
    assert item1["current_reading"] == "105.00"
    assert item1["latest_confirmed"] is not None
    assert item1["latest_confirmed"]["reading"] == "105.00"
    assert len(item1["today_slots"]) == 3
    assert item1["today_slots"][0]["status"] == "CONFIRMED"
    assert item1["today_slots"][0]["reading"] == "100.00"
    assert item1["today_slots"][1]["status"] == "CONFIRMED"
    assert item1["today_slots"][1]["reading"] == "105.00"
    assert item1["today_slots"][2]["status"] == "PENDING"
    assert item1["today_slots"][2]["timing_state"] == "UPCOMING"

    # 4. CT-002: REVIEW in current round, latest confirmed is 200.00 from round 1
    item2 = next(item for item in meters if item["meter"]["meter_code"] == "CT-002")
    assert item2["current_status"] == "REVIEW"
    assert item2["current_reading"] is None
    assert item2["latest_confirmed"] is not None
    assert item2["latest_confirmed"]["reading"] == "200.00"
    assert item2["today_slots"][0]["status"] == "CONFIRMED"
    assert item2["today_slots"][1]["status"] == "REVIEW"

    # 5. CT-003: PENDING in current round, latest confirmed is None
    item3 = next(item for item in meters if item["meter"]["meter_code"] == "CT-003")
    assert item3["current_status"] == "PENDING"
    assert item3["latest_confirmed"] is None
    assert item3["today_slots"][0]["status"] == "PENDING"
    assert item3["today_slots"][0]["timing_state"] == "PAST"

    # 6. Privacy & memory safety: verify no raw image data returned
    resp_text = resp.text
    assert "data:image" not in resp_text
    assert "base64" not in resp_text


def test_today_meter_operations_date_scoping_and_legacy_exclusion(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m1 = Meter(meter_code="CT-001", name="Công tơ 1", is_active=True)
    test_db_session.add(m1)
    test_db_session.commit()

    # Day 1: 2026-08-27 (08:00 VN)
    r_day1 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 27, 1, 0, tzinfo=timezone.utc), is_legacy=False)
    # Day 2: 2026-08-28 (08:00 VN)
    r_day2 = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 28, 1, 0, tzinfo=timezone.utc), is_legacy=False)
    # Legacy round (is_legacy=True)
    r_legacy = create_test_round(test_db_session, batch.id, scheduled_at=datetime(2026, 8, 27, 0, 0, tzinfo=timezone.utc), is_legacy=True)

    cookies, csrf = login_and_get_csrf(client)

    # Query scoped to 2026-08-27
    resp = client.get("/api/v1/meter-operations/today?date=2026-08-27")
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == "2026-08-27"
    assert data["date_formatted"] == "27/08/2026"

    # Slots for today must only contain r_day1, excluding r_day2 and r_legacy
    m1_slots = data["meters"][0]["today_slots"]
    assert len(m1_slots) == 1
    assert m1_slots[0]["round_id"] == r_day1.id
    assert m1_slots[0]["round_id"] != r_legacy.id
    assert m1_slots[0]["round_id"] != r_day2.id


def test_today_meter_operations_past_missing_supplementary_capture(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m1 = Meter(meter_code="CT-001", name="Công tơ 1", is_active=True)
    test_db_session.add(m1)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # Past round (08:00)
    past_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    # Current round (09:00)
    curr_round = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))

    cookies, csrf = login_and_get_csrf(client)

    # Initial state: 08:00 slot is PENDING
    resp_init = client.get("/api/v1/meter-operations/today")
    assert resp_init.status_code == 200
    slot_08 = resp_init.json()["meters"][0]["today_slots"][0]
    assert slot_08["round_id"] == past_round.id
    assert slot_08["status"] == "PENDING"
    assert slot_08["timing_state"] == "PAST"

    # Supplementary recording for past 08:00 round
    resp_supp = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": past_round.id,
            "reading": "1234.50",
            "ocr_reading": "1234.50",
        },
    )
    assert resp_supp.status_code == 200

    # Query today operations again: 08:00 slot is now CONFIRMED with 1234.50
    resp_updated = client.get("/api/v1/meter-operations/today")
    assert resp_updated.status_code == 200
    slot_08_updated = resp_updated.json()["meters"][0]["today_slots"][0]
    assert slot_08_updated["status"] == "CONFIRMED"
    assert slot_08_updated["reading"] == "1234.50"
    assert slot_08_updated["confirmation_source"] == "OCR_CONFIRMED"


def test_micro_dashboard_trend_missed_count_and_recent_slots(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-DASH", name="Công tơ Dashboard", location="Trạm X", meter_type="LCD", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # 5 rounds: 08:00 (past), 09:00 (past missed), 10:00 (past), 11:00 (current), 12:00 (upcoming)
    r1 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=3))
    r2 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    r3 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=1))
    r4 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))
    r5 = create_test_round(test_db_session, batch.id, scheduled_at=now_utc + timedelta(hours=1))

    # r1: confirmed 1000.50
    rd1 = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r1.id,
        user_id=sample_user.id,
        reading="1000.50",
        ocr_reading="1000.50",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=3),
    )
    # r2: left PENDING (missed)
    # r3: confirmed 1015.00
    rd3 = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r3.id,
        user_id=sample_user.id,
        reading="1015.00",
        ocr_reading="1015.00",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=1),
    )
    test_db_session.add_all([rd1, rd3])
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get("/api/v1/meter-operations/today")
    assert resp.status_code == 200
    item = resp.json()["meters"][0]

    # 1. Missed count: exactly 1 missed past slot (r2)
    assert item["missed_count"] == 1

    # 2. Recent slots: 4 slots window around current
    assert len(item["recent_slots"]) == 4
    recent_times = [s["scheduled_time"] for s in item["recent_slots"]]
    assert len(recent_times) == 4

    # 3. Trend: 2 confirmed numeric points in chronological order
    trend = item["trend"]
    assert len(trend) == 2
    assert trend[0]["reading"] == "1000.50"
    assert trend[0]["value"] == 1000.50
    assert trend[1]["reading"] == "1015.00"
    assert trend[1]["value"] == 1015.00

    # 4. Latest confirmed reading
    assert item["latest_confirmed"]["reading"] == "1015.00"
    assert item["latest_confirmed"]["is_today"] is True


def test_micro_dashboard_trend_caps_at_six_and_skips_invalid(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-TREND", name="Công tơ Trend Cap", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # Insert 8 confirmed readings: values 100, 200, 300, 400, 500, 600, 700, and one invalid "NOT_A_NUM"
    for i in range(7):
        r = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=10 - i))
        rd = MeterReading(
            meter_id=m.id,
            batch_id=batch.id,
            reading_round_id=r.id,
            user_id=sample_user.id,
            reading=f"{100 * (i + 1)}.00",
            status="CONFIRMED",
            server_timestamp=now_utc - timedelta(hours=10 - i),
        )
        test_db_session.add(rd)

    # Invalid reading
    r_bad = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    rd_bad = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r_bad.id,
        user_id=sample_user.id,
        reading="CORRUPT_OCR_TEXT",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    test_db_session.add(rd_bad)
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get("/api/v1/meter-operations/today")
    assert resp.status_code == 200
    item = resp.json()["meters"][0]

    # Trend must only contain valid floats and capped to last 6 (values 200 to 700)
    trend = item["trend"]
    assert len(trend) == 6
    assert trend[0]["value"] == 200.00
    assert trend[-1]["value"] == 700.00


def test_micro_dashboard_historical_review_isolated_from_current_status(client, test_db_session, sample_user):
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-ISOL", name="Công tơ Isolate", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    now_utc = datetime.now(timezone.utc)
    # Past round (08:00) with REVIEW
    r_past = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(hours=2))
    rd_past = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r_past.id,
        user_id=sample_user.id,
        reading=None,
        status="REVIEW",
        server_timestamp=now_utc - timedelta(hours=2),
    )
    # Current round (09:00) with CONFIRMED 5555.50
    r_curr = create_test_round(test_db_session, batch.id, scheduled_at=now_utc - timedelta(minutes=10))
    rd_curr = MeterReading(
        meter_id=m.id,
        batch_id=batch.id,
        reading_round_id=r_curr.id,
        user_id=sample_user.id,
        reading="5555.50",
        ocr_reading="5555.50",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(minutes=5),
    )
    test_db_session.add_all([rd_past, rd_curr])
    test_db_session.commit()

    cookies, csrf = login_and_get_csrf(client)
    resp = client.get("/api/v1/meter-operations/today")
    assert resp.status_code == 200
    data = resp.json()

    # Current status is CONFIRMED, not affected by past round's REVIEW status
    item = data["meters"][0]
    assert item["current_status"] == "CONFIRMED"
    assert item["current_reading"] == "5555.50"
    assert data["summary"]["confirmed_current"] == 1
    assert data["summary"]["review_current"] == 0
    assert data["summary"]["pending_current"] == 0


def test_no_meter_image_persistence_across_full_lifecycle(client, test_db_session, sample_user):
    import os
    from backend.app.models import MeterReading

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-ZERO-PERSIST", name="Công tơ Không Lưu Ảnh", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    initial_files = set(Path(".").glob("**/*.jpg"))

    # 1. Inference request with sample or dummy image
    sample_img_path = "D:/Users/013.jpg"
    if os.path.exists(sample_img_path):
        with open(sample_img_path, "rb") as f:
            img_bytes = f.read()
    else:
        # Create minimal 100x100 white jpeg in memory
        import cv2
        import numpy as np
        img_np = np.full((100, 100, 3), 255, dtype=np.uint8)
        _, encoded = cv2.imencode(".jpg", img_np)
        img_bytes = encoded.tobytes()

    res_inf = client.post(
        "/api/v1/read-meter",
        files={"file": ("meter_sample.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf},
    )
    assert res_inf.status_code == 200

    # 2. Confirm reading
    res_conf = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "9999.00",
            "ocr_reading": "9999.00",
        },
    )
    assert res_conf.status_code == 200

    # 3. Verify SQLite DB has NO image data / blobs
    db_record = test_db_session.query(MeterReading).filter(MeterReading.meter_id == m.id).first()
    assert db_record is not None
    assert db_record.reading == "9999.00"
    assert not hasattr(db_record, "photo")
    assert not hasattr(db_record, "image_data")
    assert not hasattr(db_record, "image_bytes")

    # 4. Verify no new meter image files exist on disk for normal OCR_CONFIRMED
    after_files = set(Path(".").glob("**/*.jpg"))
    new_files = after_files - initial_files
    for nf in new_files:
        assert "test_attendance_photos" in str(nf) or "attendance_photos" in str(nf)


def test_meter_decimal_reading_normalization_and_validation(client, test_db_session, sample_user):
    """Test decimal comma normalization, leading zeros, and strict validation."""
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-DEC-01", name="Công tơ Decimal Test", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # 1. Comma decimal input "00110,588" when normalized by frontend to "00110.588" is accepted and leading zeros preserved
    raw_user_input = "00110,588"
    normalized_input = raw_user_input.replace(",", ".")
    assert normalized_input == "00110.588"

    resp = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": normalized_input,
            "ocr_reading": "00110.588",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["reading"] == "00110.588"

    # 2. Raw comma without normalization is rejected by backend canonical contract
    m2 = Meter(meter_code="CT-DEC-02", name="Công tơ Decimal Test 2", is_active=True)
    test_db_session.add(m2)
    test_db_session.commit()

    invalid_cases = [
        "67,34",
        "00110,588",
        "1.2.3",
        "1,2,3",
        "-12.3",
        "12e3",
        "",
        "   ",
        "1234567890123",  # 13 chars > 12
        "abc.def",
    ]

    for inv in invalid_cases:
        res_inv = client.post(
            "/api/v1/meter-readings/confirm",
            headers={"X-CSRF-Token": csrf},
            json={
                "meter_id": m2.id,
                "reading_round_id": round_obj.id,
                "batch_id": batch.id,
                "reading": inv,
            },
        )
        assert res_inv.status_code == 400


def test_manual_entry_confirmation_flow_and_provenance(client, test_db_session, sample_user):
    """Test manual entry confirmation when AI review occurs or ocr_reading is null."""
    from backend.app.models import MeterReading

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-MANUAL-01", name="Công tơ Manual Entry", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # 1. Confirm with MANUAL_ENTRY and ocr_reading null
    resp = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "00543.210",
            "ocr_reading": None,
            "confirmation_source": "MANUAL_ENTRY",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["reading"] == "00543.210"
    assert data["ocr_reading"] is None
    assert data["confirmation_source"] == "MANUAL_ENTRY"
    assert data["reading_status"] == "CONFIRMED"

    # Verify DB record
    rec = test_db_session.query(MeterReading).filter(MeterReading.meter_id == m.id).first()
    assert rec is not None
    assert rec.reading == "00543.210"
    assert rec.ocr_reading is None
    assert rec.confirmation_source == "MANUAL_ENTRY"
    assert rec.status == "CONFIRMED"

    # 2. Duplicate confirmation on same meter+round rejected with 409
    resp_dup = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "00543.220",
            "confirmation_source": "MANUAL_ENTRY",
        },
    )
    assert resp_dup.status_code == 409


def test_training_sample_capture_user_corrected_and_manual_entry(client, test_db_session, sample_user):
    """Test private ML training sample persistence for USER_CORRECTED and MANUAL_ENTRY."""
    import base64
    import cv2
    import numpy as np
    from backend.app.models import MeterTrainingSample

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m1 = Meter(meter_code="CT-TRAIN-01", name="Công tơ Hard Sample 1", is_active=True)
    m2 = Meter(meter_code="CT-TRAIN-02", name="Công tơ Hard Sample 2", is_active=True)
    test_db_session.add_all([m1, m2])
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # Generate dummy test image base64
    img_np = np.full((120, 120, 3), 200, dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", img_np)
    dummy_b64 = "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("utf-8")

    # Case A: USER_CORRECTED with ROI bbox -> sample_type="OCR_CORRECTION", annotation_status="READY_OCR"
    res_a = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "00220.500",
            "ocr_reading": "00220.000",
            "roi_bbox": [0.1, 0.2, 0.8, 0.9],
            "image_base64": dummy_b64,
            "det_confidence": 0.88,
            "ocr_confidence": 0.65,
            "localization_imgsz": 960,
        },
    )
    assert res_a.status_code == 200

    sample_a = test_db_session.query(MeterTrainingSample).filter(MeterTrainingSample.meter_id == m1.id).first()
    assert sample_a is not None
    assert sample_a.sample_type == "OCR_CORRECTION"
    assert sample_a.annotation_status == "READY_OCR"
    assert sample_a.corrected_reading == "00220.500"
    assert sample_a.ocr_reading == "00220.000"
    assert sample_a.roi_bbox == "[0.1, 0.2, 0.8, 0.9]"
    assert sample_a.det_confidence == 0.88
    assert sample_a.image_filename.endswith(".jpg")
    assert len(sample_a.image_sha256) == 64

    # Verify physical file was written in private training dir
    from backend.app.config import get_settings
    settings = get_settings()
    sample_file_a = Path(settings.meter_training_dir) / sample_a.image_filename
    assert sample_file_a.exists()

    # Case B: MANUAL_ENTRY without ROI bbox -> sample_type="LOCALIZATION_FAILURE", annotation_status="NEEDS_BBOX"
    res_b = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m2.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "00330.750",
            "ocr_reading": None,
            "confirmation_source": "MANUAL_ENTRY",
            "roi_bbox": None,
            "image_base64": dummy_b64,
        },
    )
    assert res_b.status_code == 200

    sample_b = test_db_session.query(MeterTrainingSample).filter(MeterTrainingSample.meter_id == m2.id).first()
    assert sample_b is not None
    assert sample_b.sample_type == "LOCALIZATION_FAILURE"
    assert sample_b.annotation_status == "NEEDS_BBOX"
    assert sample_b.corrected_reading == "00330.750"
    assert sample_b.ocr_reading is None
    assert sample_b.roi_bbox is None
    assert sample_b.image_filename.endswith(".jpg")

    sample_file_b = Path(settings.meter_training_dir) / sample_b.image_filename
    assert sample_file_b.exists()


def test_training_sample_no_capture_on_ocr_confirmed(client, test_db_session, sample_user):
    """Test OCR_CONFIRMED does NOT persist training samples in V1.1."""
    import base64
    import cv2
    import numpy as np
    from backend.app.models import MeterTrainingSample

    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m = Meter(meter_code="CT-EASY-01", name="Công tơ Easy OCR", is_active=True)
    test_db_session.add(m)
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    img_np = np.full((100, 100, 3), 200, dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", img_np)
    dummy_b64 = "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("utf-8")

    # OCR_CONFIRMED: reading matches ocr_reading
    res = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "00777.000",
            "ocr_reading": "00777.000",
            "confirmation_source": "OCR_CONFIRMED",
            "image_base64": dummy_b64,
        },
    )
    assert res.status_code == 200

    sample = test_db_session.query(MeterTrainingSample).filter(MeterTrainingSample.meter_id == m.id).first()
    assert sample is None


def test_provenance_contract_backend_validation_and_rejections(client, test_db_session, sample_user):
    """Test backend validation of provenance consistency and rejection of mismatched states."""
    batch = create_reading_batch(test_db_session, period_key="2026-08")
    m1 = Meter(meter_code="CT-PROV-01", name="Công tơ Provenance 1", is_active=True)
    m2 = Meter(meter_code="CT-PROV-02", name="Công tơ Provenance 2", is_active=True)
    m3 = Meter(meter_code="CT-PROV-03", name="Công tơ Provenance 3", is_active=True)
    m4 = Meter(meter_code="CT-PROV-04", name="Công tơ Provenance 4", is_active=True)
    test_db_session.add_all([m1, m2, m3, m4])
    test_db_session.commit()

    round_obj = create_test_round(test_db_session, batch.id)
    cookies, csrf = login_and_get_csrf(client)

    # 1. OCR_CONFIRMED with null ocr_reading -> rejected (400)
    res1 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "ocr_reading": None,
            "confirmation_source": "OCR_CONFIRMED",
        },
    )
    assert res1.status_code == 400
    assert "bắt buộc phải có kết quả OCR" in res1.json()["detail"]

    # 2. OCR_CONFIRMED with different reading vs ocr_reading -> rejected (400)
    res2 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "ocr_reading": "01070",
            "confirmation_source": "OCR_CONFIRMED",
        },
    )
    assert res2.status_code == 400
    assert "chỉ số xác nhận khác với kết quả OCR" in res2.json()["detail"]

    # 3. USER_CORRECTED with null ocr_reading -> rejected (400)
    res3 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "ocr_reading": None,
            "confirmation_source": "USER_CORRECTED",
        },
    )
    assert res3.status_code == 400
    assert "bắt buộc phải có kết quả OCR ban đầu" in res3.json()["detail"]

    # 4. MANUAL_ENTRY with non-null ocr_reading -> rejected (400)
    res4 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "ocr_reading": "01074",
            "confirmation_source": "MANUAL_ENTRY",
        },
    )
    assert res4.status_code == 400
    assert "ocr_reading phải là null" in res4.json()["detail"]

    # 5. Invalid source enum -> rejected (400)
    res5 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "confirmation_source": "INVALID_ENUM",
        },
    )
    assert res5.status_code == 400
    assert "Nguồn xác nhận không hợp lệ" in res5.json()["detail"]

    # 6. Valid MANUAL_ENTRY with null ocr_reading -> accepted (200)
    res6 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m1.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "01074",
            "ocr_reading": None,
            "confirmation_source": "MANUAL_ENTRY",
        },
    )
    assert res6.status_code == 200
    d6 = res6.json()
    assert d6["reading"] == "01074"
    assert d6["ocr_reading"] is None
    assert d6["confirmation_source"] == "MANUAL_ENTRY"

    # 7. Valid OCR_CONFIRMED with matching ocr_reading -> accepted (200)
    res7 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m2.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "05555.0",
            "ocr_reading": "05555.0",
            "confirmation_source": "OCR_CONFIRMED",
        },
    )
    assert res7.status_code == 200
    d7 = res7.json()
    assert d7["reading"] == "05555.0"
    assert d7["ocr_reading"] == "05555.0"
    assert d7["confirmation_source"] == "OCR_CONFIRMED"

    # 8. Valid USER_CORRECTED with non-null ocr_reading -> accepted (200)
    res8 = client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf},
        json={
            "meter_id": m3.id,
            "reading_round_id": round_obj.id,
            "batch_id": batch.id,
            "reading": "05555.5",
            "ocr_reading": "05555.0",
            "confirmation_source": "USER_CORRECTED",
        },
    )
    assert res8.status_code == 200
    d8 = res8.json()
    assert d8["reading"] == "05555.5"
    assert d8["ocr_reading"] == "05555.0"
    assert d8["confirmation_source"] == "USER_CORRECTED"





