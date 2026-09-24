import json
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
os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_photos"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import generate_csrf_token, hash_password, hash_session_token, require_admin
from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import Base, get_db
from backend.app.main import app
from backend.app.models import (
    AdminAuditLog,
    Meter,
    MeterReading,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
)
from backend.scripts.set_user_role import set_user_role

settings = get_settings()
LOCAL_TZ = ZoneInfo(settings.timezone)


def with_preview_fingerprint(client, csrf, payload):
    preview = client.post("/api/v1/admin/schedules/preview", json=payload, headers={"X-CSRF-Token": csrf})
    assert preview.status_code == 200
    request = dict(payload)
    request.setdefault("scope", {"mode": "ALL_ELIGIBLE"})
    request["expected_scope_fingerprint"] = preview.json()["scope"]["fingerprint"]
    return request


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


# ==============================================================================
# 1. AUTHORIZATION & RBAC TESTS
# ==============================================================================
def test_admin_endpoints_require_authentication(client):
    # Unauthenticated GET
    res = client.get("/api/v1/admin/meters")
    assert res.status_code == 401

    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 401

    res = client.get("/api/v1/admin/schedules")
    assert res.status_code == 401

    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 401


def test_employee_role_forbidden_from_admin_endpoints(test_db_session, employee_user, client):
    create_auth_session(test_db_session, employee_user, client)

    res = client.get("/api/v1/admin/meters")
    assert res.status_code == 403
    assert "Bạn không có quyền thực hiện thao tác này." in res.json()["detail"]

    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 403
    assert "Bạn không có quyền thực hiện thao tác này." in res.json()["detail"]

    res = client.get("/api/v1/admin/schedules")
    assert res.status_code == 403

    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 403


def test_admin_role_allowed_access(test_db_session, admin_user, client):
    create_auth_session(test_db_session, admin_user, client)

    res = client.get("/api/v1/admin/meters")
    assert res.status_code == 200
    assert "meters" in res.json()

    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 200
    assert "kpis" in res.json()


def test_set_user_role_cli(test_db_session, employee_user):
    # Promote employee to ADMIN
    updated = set_user_role(test_db_session, employee_user.employee_code, "ADMIN")
    assert updated.role == "ADMIN"
    assert updated.password_hash == employee_user.password_hash  # Password untouched

    # Demote back to EMPLOYEE
    updated2 = set_user_role(test_db_session, employee_user.employee_code, "EMPLOYEE")
    assert updated2.role == "EMPLOYEE"

    # Invalid role
    with pytest.raises(ValueError, match="Vai trò không hợp lệ"):
        set_user_role(test_db_session, employee_user.employee_code, "SUPERUSER")

    # Non-existent employee
    with pytest.raises(ValueError, match="Không tìm thấy người dùng"):
        set_user_role(test_db_session, "99999999", "ADMIN")


# ==============================================================================
# 2. METER MASTER MANAGEMENT TESTS
# ==============================================================================
def test_admin_meter_crud_lifecycle(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    # 1. Create new meter
    payload = {
        "meter_code": "ME-ADMIN-01",
        "name": "Công tơ thử nghiệm Admin",
        "location": "Trạm A1",
        "meter_type": "LCD",
    }
    res = client.post("/api/v1/admin/meters", json=payload, headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200
    meter_data = res.json()
    assert meter_data["meter_code"] == "ME-ADMIN-01"
    assert meter_data["name"] == "Công tơ thử nghiệm Admin"
    assert meter_data["is_active"] is True
    assert meter_data["has_readings"] is False
    meter_id = meter_data["id"]

    # Verify audit log was created for METER_CREATED
    audit = test_db_session.query(AdminAuditLog).filter(AdminAuditLog.resource_id == meter_id).first()
    assert audit is not None
    assert audit.action == "METER_CREATED"
    assert audit.actor_user_id == admin_user.id

    # 2. Duplicate meter code rejection
    res_dup = client.post("/api/v1/admin/meters", json=payload, headers={"X-CSRF-Token": csrf})
    assert res_dup.status_code == 409
    assert "Mã công tơ đã tồn tại." in res_dup.json()["detail"]

    # 3. Update meter properties (meter_code can be updated when has_readings is False)
    update_payload = {
        "meter_code": "ME-ADMIN-01-RENAMED",
        "name": "Công tơ thử nghiệm Admin Đổi Tên",
        "location": "Trạm B2",
        "meter_type": "MECHANICAL",
    }
    res_up = client.patch(f"/api/v1/admin/meters/{meter_id}", json=update_payload, headers={"X-CSRF-Token": csrf})
    assert res_up.status_code == 200
    assert res_up.json()["meter_code"] == "ME-ADMIN-01-RENAMED"
    assert res_up.json()["name"] == "Công tơ thử nghiệm Admin Đổi Tên"
    assert res_up.json()["location"] == "Trạm B2"
    assert res_up.json()["meter_type"] == "MECHANICAL"

    # 4. Soft deactivation
    res_deact = client.post(f"/api/v1/admin/meters/{meter_id}/deactivate", headers={"X-CSRF-Token": csrf})
    assert res_deact.status_code == 200
    assert res_deact.json()["is_active"] is False

    # Verify audit log for METER_DEACTIVATED
    audit_deact = (
        test_db_session.query(AdminAuditLog)
        .filter(AdminAuditLog.resource_id == meter_id, AdminAuditLog.action == "METER_DEACTIVATED")
        .first()
    )
    assert audit_deact is not None
    assert audit_deact.actor_user_id == admin_user.id
    assert json.loads(audit_deact.before_json)["is_active"] is True
    assert json.loads(audit_deact.after_json)["is_active"] is False

    # 5. Reactivate
    res_act = client.post(f"/api/v1/admin/meters/{meter_id}/activate", headers={"X-CSRF-Token": csrf})
    assert res_act.status_code == 200
    assert res_act.json()["is_active"] is True

    # Verify audit log for METER_ACTIVATED / METER_REACTIVATED
    audit_act = (
        test_db_session.query(AdminAuditLog)
        .filter(AdminAuditLog.resource_id == meter_id, AdminAuditLog.action.in_(["METER_ACTIVATED", "METER_REACTIVATED"]))
        .first()
    )
    assert audit_act is not None
    assert audit_act.actor_user_id == admin_user.id
    assert json.loads(audit_act.before_json)["is_active"] is False
    assert json.loads(audit_act.after_json)["is_active"] is True

    # Ensure no secrets or private training data are included
    for audit_entry in [audit, audit_deact, audit_act]:
        payload_str = f"{audit_entry.before_json or ''} {audit_entry.after_json or ''}".lower()
        assert "password" not in payload_str
        assert "token" not in payload_str
        assert "training" not in payload_str
        assert "secret" not in payload_str


def test_meter_code_immutable_when_readings_exist(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    # Create meter
    m = Meter(
        id=str(uuid.uuid4()),
        meter_code="ME-IMMUTABLE-01",
        name="Công tơ có lịch sử",
        location="Cầu cảng 1",
        meter_type="LCD",
        is_active=True,
    )
    test_db_session.add(m)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt 1", period_key="2026-08", status="OPEN")
    test_db_session.add(batch)

    rd = ReadingRound(id=str(uuid.uuid4()), batch_id=batch.id, scheduled_at=datetime.now(timezone.utc), status="OPEN", is_legacy=False)
    test_db_session.add(rd)

    reading = MeterReading(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        reading_round_id=rd.id,
        meter_id=m.id,
        user_id=admin_user.id,
        reading="001234.56",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=datetime.now(timezone.utc),
    )
    test_db_session.add(reading)
    test_db_session.commit()

    # Attempt to change meter_code on meter with reading history
    res = client.patch(
        f"/api/v1/admin/meters/{m.id}",
        json={"meter_code": "ME-CHANGED-CODE"},
        headers={"X-CSRF-Token": csrf},
    )
    assert res.status_code == 400
    assert "Không thể thay đổi mã công tơ đã có lịch sử ghi nhận chỉ số." in res.json()["detail"]

    # Updating other fields (e.g. name, location) is still permitted
    res_ok = client.patch(
        f"/api/v1/admin/meters/{m.id}",
        json={"name": "Tên mới được phép cập nhật"},
        headers={"X-CSRF-Token": csrf},
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["name"] == "Tên mới được phép cập nhật"
    assert res_ok.json()["meter_code"] == "ME-IMMUTABLE-01"


# ==============================================================================
# 3. SCHEDULE MANAGEMENT & CONFLICT DETECTION TESTS
# ==============================================================================
def test_admin_schedule_preview_and_conflict_rejection(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt 1", period_key="2026-08", status="OPEN")
    test_db_session.add(batch)
    test_db_session.add(Meter(id=str(uuid.uuid4()), meter_code="SCHEDULE-01", name="Schedule meter", is_active=True))
    test_db_session.commit()

    today_str = datetime.now(LOCAL_TZ).strftime("%Y-%m-%d")

    # 1. Preview creation for today
    payload = {
        "date": today_str,
        "start_time": "08:00",
        "end_time": "11:00",
        "interval_minutes": 60,
    }
    res_prev = client.post("/api/v1/admin/schedules/preview", json=payload, headers={"X-CSRF-Token": csrf})
    assert res_prev.status_code == 200
    pdata = res_prev.json()
    assert pdata["total_proposed"] == 4  # 08:00, 09:00, 10:00, 11:00
    assert pdata["conflict_count"] == 0
    assert pdata["scope"]["meter_count"] == 1

    # 2. Confirm create
    res_create = client.post("/api/v1/admin/schedules", json=with_preview_fingerprint(client, csrf, payload), headers={"X-CSRF-Token": csrf})
    assert res_create.status_code == 200
    assert res_create.json()["created_count"] == 4
    assert res_create.json()["scope_materialized_count"] == 4

    # Verify audit log for READING_ROUNDS_CREATED
    audit = (
        test_db_session.query(AdminAuditLog)
        .filter(AdminAuditLog.action == "READING_ROUNDS_CREATED")
        .first()
    )
    assert audit is not None
    assert audit.actor_user_id == admin_user.id

    # 3. Preview again with overlapping hours -> detects conflicts
    res_prev2 = client.post("/api/v1/admin/schedules/preview", json=payload, headers={"X-CSRF-Token": csrf})
    assert res_prev2.status_code == 200
    pdata2 = res_prev2.json()
    assert pdata2["conflict_count"] == 4

    # 4. Attempting to create overlapping rounds -> 409 Conflict
    res_dup = client.post("/api/v1/admin/schedules", json=with_preview_fingerprint(client, csrf, payload), headers={"X-CSRF-Token": csrf})
    assert res_dup.status_code == 409
    assert "Một hoặc nhiều lượt đã tồn tại trong khung giờ này." in res_dup.json()["detail"]

    # 5. Attempting to create for past date -> 400 Bad Request
    past_date_str = (datetime.now(LOCAL_TZ) - timedelta(days=2)).strftime("%Y-%m-%d")
    res_past = client.post(
        "/api/v1/admin/schedules/preview",
        json={"date": past_date_str, "start_time": "08:00", "end_time": "10:00"},
        headers={"X-CSRF-Token": csrf},
    )
    assert res_past.status_code == 400
    assert "Không thể tạo lịch cho ngày trong quá khứ." in res_past.json()["detail"]


def test_admin_schedule_intervals_and_validation(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt Interval Test", period_key="2026-09", status="OPEN")
    test_db_session.add(batch)
    test_db_session.add(Meter(id=str(uuid.uuid4()), meter_code="INTERVAL-01", name="Interval meter", is_active=True))
    test_db_session.commit()

    test_date_str = (datetime.now(LOCAL_TZ) + timedelta(days=2)).strftime("%Y-%m-%d")

    # 1. 30-minute interval preview (08:00 to 10:00 -> 08:00, 08:30, 09:00, 09:30, 10:00 = 5 rounds)
    p30 = {
        "date": test_date_str,
        "start_time": "08:00",
        "end_time": "10:00",
        "interval_minutes": 30,
    }
    res30 = client.post("/api/v1/admin/schedules/preview", json=p30, headers={"X-CSRF-Token": csrf})
    assert res30.status_code == 200
    assert res30.json()["total_proposed"] == 5

    # 2. Invalid interval < 5 minutes -> 400 Bad Request
    p_invalid_low = {
        "date": test_date_str,
        "start_time": "08:00",
        "end_time": "10:00",
        "interval_minutes": 2,
    }
    res_low = client.post("/api/v1/admin/schedules/preview", json=p_invalid_low, headers={"X-CSRF-Token": csrf})
    assert res_low.status_code == 400
    assert "Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút." in res_low.json()["detail"]

    # 3. Invalid interval > 1440 minutes -> 400 Bad Request
    p_invalid_high = {
        "date": test_date_str,
        "start_time": "08:00",
        "end_time": "10:00",
        "interval_minutes": 1500,
    }
    p_invalid_high["scope"] = {"mode": "ALL_ELIGIBLE"}
    p_invalid_high["expected_scope_fingerprint"] = res30.json()["scope"]["fingerprint"]
    res_high = client.post("/api/v1/admin/schedules", json=p_invalid_high, headers={"X-CSRF-Token": csrf})
    assert res_high.status_code == 400
    assert "Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút." in res_high.json()["detail"]

    # 4. Create with 120-minute interval (08:00 to 12:00 -> 08:00, 10:00, 12:00 = 3 rounds)
    p120 = {
        "date": test_date_str,
        "start_time": "08:00",
        "end_time": "12:00",
        "interval_minutes": 120,
    }
    res120 = client.post("/api/v1/admin/schedules", json=with_preview_fingerprint(client, csrf, p120), headers={"X-CSRF-Token": csrf})
    assert res120.status_code == 200
    assert res120.json()["created_count"] == 3


def test_admin_schedule_delete_round_and_conflict_handling(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt Delete Round Test", period_key="2026-09", status="OPEN")
    test_db_session.add(batch)

    m1 = Meter(id=str(uuid.uuid4()), meter_code="M-DEL-01", name="Công tơ Del 1", location="Cầu 1", is_active=True)
    test_db_session.add(m1)
    test_db_session.commit()

    test_date_str = (datetime.now(LOCAL_TZ) + timedelta(days=3)).strftime("%Y-%m-%d")

    # 1. Create a schedule round
    schedule_payload = {"date": test_date_str, "start_time": "09:00", "end_time": "09:00", "interval_minutes": 60}
    res_create = client.post(
        "/api/v1/admin/schedules",
        json=with_preview_fingerprint(client, csrf, schedule_payload),
        headers={"X-CSRF-Token": csrf},
    )
    assert res_create.status_code == 200
    round_id = res_create.json()["rounds"][0]["id"]

    # 2. Delete empty round without readings -> 200 OK
    res_del = client.delete(f"/api/v1/admin/schedules/rounds/{round_id}", headers={"X-CSRF-Token": csrf})
    assert res_del.status_code == 200
    assert res_del.json()["deleted_count"] == 1

    # Verify audit log for single round deletion
    audit = (
        test_db_session.query(AdminAuditLog)
        .filter(AdminAuditLog.action == "READING_ROUND_DELETED", AdminAuditLog.resource_id == round_id)
        .first()
    )
    assert audit is not None
    assert audit.actor_user_id == admin_user.id

    # Verify round no longer in database
    assert test_db_session.query(ReadingRound).filter(ReadingRound.id == round_id).first() is None

    # 3. Create another round, and simulate an existing meter reading
    schedule_payload2 = {"date": test_date_str, "start_time": "10:00", "end_time": "10:00", "interval_minutes": 60}
    res_create2 = client.post(
        "/api/v1/admin/schedules",
        json=with_preview_fingerprint(client, csrf, schedule_payload2),
        headers={"X-CSRF-Token": csrf},
    )
    assert res_create2.status_code == 200
    round_id2 = res_create2.json()["rounds"][0]["id"]

    rd = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=round_id2,
        user_id=admin_user.id,
        reading="123.4",
        ocr_reading="123.4",
        status="CONFIRMED",
    )
    test_db_session.add(rd)
    test_db_session.commit()

    # 4. Deleting a round with operational data cancels it and preserves the reading.
    res_del_conflict = client.delete(f"/api/v1/admin/schedules/rounds/{round_id2}", headers={"X-CSRF-Token": csrf})
    assert res_del_conflict.status_code == 200
    assert res_del_conflict.json()["cancelled_count"] == 1
    cancelled = test_db_session.query(ReadingRound).filter(ReadingRound.id == round_id2).first()
    assert cancelled.status == "CANCELLED"
    assert test_db_session.query(MeterReading).filter(MeterReading.reading_round_id == round_id2).count() == 1


def test_admin_schedule_delete_by_date(test_db_session, admin_user, client):
    _, csrf = create_auth_session(test_db_session, admin_user, client)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt Delete Day Test", period_key="2026-09", status="OPEN")
    test_db_session.add(batch)
    test_db_session.add(Meter(id=str(uuid.uuid4()), meter_code="DELETE-DAY-01", name="Delete day meter", is_active=True))
    test_db_session.commit()

    test_date_str = (datetime.now(LOCAL_TZ) + timedelta(days=4)).strftime("%Y-%m-%d")

    # 1. Create 4 rounds on test_date
    schedule_payload = {"date": test_date_str, "start_time": "08:00", "end_time": "11:00", "interval_minutes": 60}
    res_create = client.post(
        "/api/v1/admin/schedules",
        json=with_preview_fingerprint(client, csrf, schedule_payload),
        headers={"X-CSRF-Token": csrf},
    )
    assert res_create.status_code == 200
    assert res_create.json()["created_count"] == 4

    # 2. Batch delete all rounds for that date
    res_batch_del = client.delete(f"/api/v1/admin/schedules?date={test_date_str}", headers={"X-CSRF-Token": csrf})
    assert res_batch_del.status_code == 200
    assert res_batch_del.json()["deleted_count"] == 4

    # Verify audit log
    audit = (
        test_db_session.query(AdminAuditLog)
        .filter(AdminAuditLog.action == "READING_ROUNDS_BATCH_CLEANED")
        .order_by(AdminAuditLog.created_at.desc())
        .first()
    )
    assert audit is not None

    # 3. Deleting non-existent date -> 404
    res_404 = client.delete(f"/api/v1/admin/schedules?date={test_date_str}", headers={"X-CSRF-Token": csrf})
    assert res_404.status_code == 404


# ==============================================================================
# 4. OPERATIONAL DASHBOARD TESTS
# ==============================================================================
def test_admin_dashboard_metrics_and_exceptions(test_db_session, admin_user, client):
    create_auth_session(test_db_session, admin_user, client)

    batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt 1", period_key="2026-08", status="OPEN")
    test_db_session.add(batch)

    # 2 Active Meters in different locations
    m1 = Meter(id=str(uuid.uuid4()), meter_code="M-DASH-01", name="Công tơ Cầu 1", location="Cầu cảng 1", meter_type="LCD", is_active=True)
    m2 = Meter(id=str(uuid.uuid4()), meter_code="M-DASH-02", name="Công tơ Kho A", location="Kho hàng A", meter_type="LCD", is_active=True)
    test_db_session.add_all([m1, m2])

    # 2 Rounds for 2026-08-28: 08:00 and 14:00 (both in past relative to now, or deterministic)
    target_date_str = "2026-08-28"
    dt_past = datetime(2026, 8, 28, 8, 0, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    dt_second = datetime(2026, 8, 28, 14, 0, 0, tzinfo=LOCAL_TZ).astimezone(timezone.utc)

    r1 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=dt_past,
        status="OPEN",
        is_legacy=False,
    )
    r2 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=dt_second,
        status="OPEN",
        is_legacy=False,
    )
    test_db_session.add_all([r1, r2])

    # 1 Confirmed reading for m1 in r1
    rd1 = MeterReading(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        reading_round_id=r1.id,
        meter_id=m1.id,
        user_id=admin_user.id,
        reading="005432.10",
        confirmation_source="OCR_CONFIRMED",
        status="CONFIRMED",
        server_timestamp=dt_past,
    )
    # 1 Review reading for m2 in r1
    rd2 = MeterReading(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        reading_round_id=r1.id,
        meter_id=m2.id,
        user_id=admin_user.id,
        reading=None,
        ocr_reading="009999.00",
        confirmation_source="USER_CORRECTED",
        status="REVIEW",
        server_timestamp=dt_past,
    )
    test_db_session.add_all([rd1, rd2])
    test_db_session.commit()

    res = client.get(f"/api/v1/admin/dashboard?date={target_date_str}")
    assert res.status_code == 200
    dash = res.json()

    # KPI Checks
    assert dash["kpis"]["confirmed_slots"] == 1
    assert dash["kpis"]["total_expected_slots"] == 4  # 2 rounds * 2 meters
    assert dash["kpis"]["review_count"] == 1

    # Exception table check (rd2 is in REVIEW)
    assert len(dash["exceptions"]) >= 1
    review_exceptions = [e for e in dash["exceptions"] if e["exception_state"] == "REVIEW"]
    assert len(review_exceptions) == 1
    assert review_exceptions[0]["meter_code"] == "M-DASH-02"

    # Provenance statistics check
    assert dash["provenance"]["total_readings"] == 1  # 1 confirmed reading
    assert dash["provenance"]["ocr_confirmed_count"] == 1
    assert dash["provenance"]["ocr_confirmed_percent"] == 100.0


# ==============================================================================
# 5. AUDIT LOG RETRIEVAL TESTS
# ==============================================================================
def test_admin_audit_logs_retrieval(test_db_session, admin_user, client):
    create_auth_session(test_db_session, admin_user, client)

    # Insert a sample audit log directly
    log = AdminAuditLog(
        id=str(uuid.uuid4()),
        actor_user_id=admin_user.id,
        action="METER_CREATED",
        resource_type="METER",
        resource_id="sample-meter-id",
        after_json='{"meter_code": "TEST-01"}',
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(log)
    test_db_session.commit()

    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    first_log = body["logs"][0]
    assert first_log["actor_employee_code"] == admin_user.employee_code
    assert first_log["action"] == "METER_CREATED"
    assert first_log["resource_type"] == "METER"


def test_admin_dashboard_temporal_semantics_and_zero_state(test_db_session, admin_user, client):
    create_auth_session(test_db_session, admin_user, client)

    # Create 2 meters
    m1 = Meter(id=str(uuid.uuid4()), meter_code="M-TEMP-01", name="Meter 1", location="Station A", is_active=True)
    m2 = Meter(id=str(uuid.uuid4()), meter_code="M-TEMP-02", name="Meter 2", location="Station B", is_active=True)
    test_db_session.add_all([m1, m2])

    # Create batch
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Batch August",
        period_key="2026-08",
        status="OPEN",
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(batch)

    # 1. Past historical date test (2026-08-20)
    d_past = datetime(2026, 8, 20, 8, 0, 0, tzinfo=timezone.utc)
    r_past = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=d_past,
        status="CLOSED",
        is_legacy=False,
    )
    test_db_session.add(r_past)
    test_db_session.commit()

    # Query historical date
    res_past = client.get("/api/v1/admin/dashboard?date=2026-08-20")
    assert res_past.status_code == 200
    d_past_body = res_past.json()
    assert d_past_body["kpis"]["due_slots"] == 2  # 2 meters in past round
    assert d_past_body["round_progress"][0]["timing_state"] == "PAST"
    # Both unread meters in past round are overdue exceptions
    assert len(d_past_body["exceptions"]) == 2
    assert d_past_body["provenance"]["total_readings"] == 0

    # 2. Future date test
    fut_dt = (datetime.now(timezone.utc) + timedelta(days=5))
    fut_date_str = fut_dt.strftime("%Y-%m-%d")
    d_fut = datetime(fut_dt.year, fut_dt.month, fut_dt.day, 8, 0, 0, tzinfo=timezone.utc)
    r_fut = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=d_fut,
        status="OPEN",
        is_legacy=False,
    )
    test_db_session.add(r_fut)
    test_db_session.commit()

    res_fut = client.get(f"/api/v1/admin/dashboard?date={fut_date_str}")
    assert res_fut.status_code == 200
    d_fut_body = res_fut.json()
    assert d_fut_body["kpis"]["due_slots"] == 0
    assert d_fut_body["kpis"]["current_round_status"] == "Lịch dự kiến"
    assert d_fut_body["round_progress"][0]["timing_state"] == "UPCOMING"
    assert len(d_fut_body["exceptions"]) == 0  # Future rounds must NOT produce exceptions!
    assert d_fut_body["provenance"]["total_readings"] == 0


def test_admin_dashboard_controlled_time_0824_and_0924(test_db_session, admin_user, client, monkeypatch):
    create_auth_session(test_db_session, admin_user, client)

    # 12 meters
    meters = [
        Meter(id=str(uuid.uuid4()), meter_code=f"CT-{i:03d}", name=f"Meter {i}", location="Cầu tàu", is_active=True)
        for i in range(1, 13)
    ]
    test_db_session.add_all(meters)

    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Batch 2026-08",
        period_key="2026-08",
        status="OPEN",
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(batch)

    # Rounds on 2026-08-29: 08:00 (01:00 UTC), 09:00 (02:00 UTC), 10:00 (03:00 UTC)
    r_0800 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=datetime(2026, 8, 29, 1, 0, 0, tzinfo=timezone.utc),
        status="OPEN",
        is_legacy=False,
    )
    r_0900 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=datetime(2026, 8, 29, 2, 0, 0, tzinfo=timezone.utc),
        status="OPEN",
        is_legacy=False,
    )
    r_1000 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=datetime(2026, 8, 29, 3, 0, 0, tzinfo=timezone.utc),
        status="OPEN",
        is_legacy=False,
    )
    test_db_session.add_all([r_0800, r_0900, r_1000])
    test_db_session.commit()

    # --- Scenario 1: Mock time to 2026-08-29 08:24 (01:24 UTC) ---
    class MockDatetime0824(datetime):
        @classmethod
        def now(cls, tz=None):
            dt = datetime(2026, 8, 29, 1, 24, 0, tzinfo=timezone.utc)
            return dt if tz is None else dt.astimezone(tz)

    monkeypatch.setattr("backend.app.admin.datetime", MockDatetime0824)

    res1 = client.get("/api/v1/admin/dashboard?date=2026-08-29")
    assert res1.status_code == 200
    data1 = res1.json()

    # At 08:24: 08:00 is CURRENT, 09:00 & 10:00 are UPCOMING
    assert data1["kpis"]["current_round_time"] == "08:00"
    assert data1["kpis"]["current_round_status"] == "Đang mở"
    assert data1["kpis"]["due_slots"] == 12
    assert data1["kpis"]["actionable_count"] == 12
    assert data1["kpis"]["confirmed_slots"] == 0
    assert data1["kpis"]["review_count"] == 0
    # ZERO exceptions: current round unread meters are NOT exceptions!
    assert len(data1["exceptions"]) == 0
    assert data1["round_progress"][0]["timing_state"] == "CURRENT"
    assert data1["round_progress"][1]["timing_state"] == "UPCOMING"
    assert data1["round_progress"][2]["timing_state"] == "UPCOMING"

    # --- Scenario 2: Mock time to 2026-08-29 09:24 (02:24 UTC) ---
    class MockDatetime0924(datetime):
        @classmethod
        def now(cls, tz=None):
            dt = datetime(2026, 8, 29, 2, 24, 0, tzinfo=timezone.utc)
            return dt if tz is None else dt.astimezone(tz)

    monkeypatch.setattr("backend.app.admin.datetime", MockDatetime0924)

    res2 = client.get("/api/v1/admin/dashboard?date=2026-08-29")
    assert res2.status_code == 200
    data2 = res2.json()

    # At 09:24: 08:00 is PAST (overdue), 09:00 is CURRENT, 10:00 is UPCOMING
    assert data2["kpis"]["current_round_time"] == "09:00"
    assert data2["kpis"]["current_round_status"] == "Đang mở"
    assert data2["kpis"]["due_slots"] == 24  # 08:00 (12) + 09:00 (12)
    assert data2["kpis"]["actionable_count"] == 24
    assert data2["kpis"]["confirmed_slots"] == 0
    assert data2["round_progress"][0]["timing_state"] == "PAST"
    assert data2["round_progress"][1]["timing_state"] == "CURRENT"
    assert data2["round_progress"][2]["timing_state"] == "UPCOMING"

    # Exactly 12 exceptions from overdue 08:00 round; 09:00 current round unread meters are NOT exceptions
    assert len(data2["exceptions"]) == 12
    for exc in data2["exceptions"]:
        assert exc["round_id"] == r_0800.id
        assert exc["scheduled_time"] == "08:00"
        assert exc["exception_state"] == "MISSING"


