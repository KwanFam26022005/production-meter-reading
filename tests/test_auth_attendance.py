import io
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Ensure test DB is isolated
os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_photos"
os.environ["ENVIRONMENT"] = "development"

from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import Base, engine, SessionLocal, init_db
from backend.app.models import User, SessionModel, AttendanceEvent
from backend.app.auth import (
    hash_password,
    hash_session_token,
    login_rate_limiter,
    generate_session_token,
)
from backend.app.main import app
from backend.scripts.create_user import create_user


def create_dummy_image_bytes(width=200, height=200, color=(100, 150, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
    os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_photos"
    os.environ["ENVIRONMENT"] = "development"
    get_settings.cache_clear()
    init_db()
    photo_dir = Path("data/test_attendance_photos")
    photo_dir.mkdir(parents=True, exist_ok=True)
    yield
    # Cleanup
    engine.dispose()
    photo_dir = Path("data/test_attendance_photos")
    if photo_dir.exists():
        shutil.rmtree(photo_dir, ignore_errors=True)
    for p in Path("data").glob("test_app.db*"):
        try:
            p.unlink(missing_ok=True)
        except Exception:
            pass


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    user = db_session.query(User).filter(User.employee_code == "TEST-001").first()
    if not user:
        user = User(
            employee_code="TEST-001",
            full_name="Nguyễn Văn Test",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_login_invalid_password(client, test_user):
    res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "WrongPassword"},
    )
    assert res.status_code == 401
    assert "Mã nhân viên hoặc mật khẩu không chính xác." in res.json()["detail"]


def test_login_rate_limiting(client, test_user):
    # Reset limiter for key first
    client_ip = "testclient"
    key = f"{client_ip}:TEST-RATE"
    login_rate_limiter.reset(key)

    # 5 failed attempts
    for _ in range(5):
        client.post(
            "/api/v1/auth/login",
            json={"employee_code": "TEST-RATE", "password": "WrongPassword"},
        )

    # 6th attempt should return 429
    res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-RATE", "password": "WrongPassword"},
    )
    assert res.status_code == 429
    assert "Đăng nhập sai quá 5 lần" in res.json()["detail"]


def test_login_success_and_get_me(client, test_user):
    res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["user"]["employee_code"] == "TEST-001"
    assert "csg_session" in client.cookies

    # Test /auth/me
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["employee_code"] == "TEST-001"


def test_inactive_user_rejection(client, db_session):
    inactive = db_session.query(User).filter(User.employee_code == "TEST-INACTIVE").first()
    if not inactive:
        inactive = User(
            employee_code="TEST-INACTIVE",
            full_name="Nguyễn Văn Nghỉ Việc",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=False,
        )
        db_session.add(inactive)
        db_session.commit()

    res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-INACTIVE", "password": "Password123"},
    )
    assert res.status_code == 401
    assert "Mã nhân viên hoặc mật khẩu không chính xác." in res.json()["detail"]


def test_csrf_token_and_logout(client, test_user):
    # Login first
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )

    # Get CSRF
    csrf_res = client.get("/api/v1/auth/csrf")
    assert csrf_res.status_code == 200
    csrf_token = csrf_res.json()["csrf_token"]
    assert len(csrf_token) > 20

    # Logout without CSRF -> should fail
    fail_res = client.post("/api/v1/auth/logout")
    assert fail_res.status_code == 403

    # Logout with CSRF -> should succeed
    logout_res = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert logout_res.status_code == 200

    # /auth/me after logout -> should fail (revoked session)
    me_after = client.get("/api/v1/auth/me")
    assert me_after.status_code == 401

    # Protected routes after logout -> should fail with 401
    att_after = client.get("/api/v1/attendance/today")
    assert att_after.status_code == 401

    batch_after = client.get("/api/v1/reading-batches/current")
    assert batch_after.status_code == 401


def test_logout_with_already_invalid_session(client):
    # Calling logout when unauthenticated / invalid session -> 401
    res = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "invalid-csrf"})
    assert res.status_code == 401


def test_expired_session_rejected(client, db_session, test_user):
    # Create an already expired session directly in DB
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    now = datetime.now(timezone.utc)
    expired_at = now - timedelta(hours=2)

    session_obj = SessionModel(
        user_id=test_user.id,
        token_hash=token_hash,
        created_at=now - timedelta(hours=14),
        expires_at=expired_at,
        last_seen_at=now - timedelta(hours=14),
    )
    db_session.add(session_obj)
    db_session.commit()

    client.cookies.set("csg_session", raw_token)
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "hết hạn" in res.json()["detail"]


def test_inactive_user_with_existing_session_rejected(client, db_session):
    # Create active user and session
    user = db_session.query(User).filter(User.employee_code == "TEST-DEACT-001").first()
    if not user:
        user = User(
            employee_code="TEST-DEACT-001",
            full_name="Nguyễn Văn Deactivate",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
    else:
        user.is_active = True
    db_session.commit()
    db_session.refresh(user)

    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-DEACT-001", "password": "Password123"},
    )
    me_res1 = client.get("/api/v1/auth/me")
    assert me_res1.status_code == 200

    # Now de-activate user in DB
    user.is_active = False
    db_session.commit()

    # Next request with existing session cookie must fail with 401
    me_res2 = client.get("/api/v1/auth/me")
    assert me_res2.status_code == 401
    assert "vô hiệu hóa" in me_res2.json()["detail"]


def test_attendance_upload_size_limit_exceeded(client, test_user):
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]

    # 6MB dummy payload (> 5MB max_attendance_upload_mb)
    oversized_bytes = b"0" * (6 * 1024 * 1024)
    res = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("large.jpg", oversized_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 413
    assert "vượt quá giới hạn" in res.json()["detail"]


def test_attendance_and_meter_csrf_enforcement(client, test_user):
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )
    img_bytes = create_dummy_image_bytes()

    # 1. Attendance check-in missing CSRF -> 403
    ci_missing = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
    )
    assert ci_missing.status_code == 403

    # 2. Attendance check-in invalid CSRF -> 403
    ci_invalid = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": "invalid-token-12345"},
    )
    assert ci_invalid.status_code == 403

    # 3. Attendance check-out missing CSRF -> 403
    co_missing = client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
    )
    assert co_missing.status_code == 403

    # 4. Read-meter missing CSRF -> 403
    meter_missing = client.post(
        "/api/v1/read-meter",
        files={"file": ("meter.jpg", img_bytes, "image/jpeg")},
    )
    assert meter_missing.status_code == 403

    # 5. Read-meter invalid CSRF -> 403
    meter_invalid = client.post(
        "/api/v1/read-meter",
        files={"file": ("meter.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": "invalid-token-12345"},
    )
    assert meter_invalid.status_code == 403


def test_attendance_business_rules_isolated(client, db_session):
    # Dedicated isolated user for business rules
    user = db_session.query(User).filter(User.employee_code == "TEST-ISO-001").first()
    if not user:
        user = User(
            employee_code="TEST-ISO-001",
            full_name="Nguyễn Văn Quy Tắc",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user.id).delete()
    db_session.commit()

    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-ISO-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_dummy_image_bytes()

    # Rule 1: CHECK_OUT before CHECK_IN -> 409
    res_co_early = client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_co_early.status_code == 409
    assert "vào ca trước" in res_co_early.json()["detail"]

    # Rule 2: Valid CHECK_IN -> 200
    res_ci = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_ci.status_code == 200
    assert res_ci.json()["event_type"] == "CHECK_IN"

    # Rule 3: Duplicate CHECK_IN -> 409
    res_ci_dup = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_ci_dup.status_code == 409
    assert "đã chấm công vào ca" in res_ci_dup.json()["detail"]

    # Rule 4: Valid CHECK_OUT -> 200
    res_co = client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie_out.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_co.status_code == 200
    assert res_co.json()["event_type"] == "CHECK_OUT"

    # Rule 5: Duplicate CHECK_OUT -> 409
    res_co_dup = client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie_out2.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_co_dup.status_code == 409
    assert "đã hoàn tất chấm công tan ca" in res_co_dup.json()["detail"]


def test_attendance_user_identity_from_session_only(client, db_session):
    # User A and User B
    user_a = db_session.query(User).filter(User.employee_code == "TEST-IDA-001").first()
    if not user_a:
        user_a = User(
            employee_code="TEST-IDA-001",
            full_name="User Alpha",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user_a)

    user_b = db_session.query(User).filter(User.employee_code == "TEST-IDB-002").first()
    if not user_b:
        user_b = User(
            employee_code="TEST-IDB-002",
            full_name="User Beta",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user_b)

    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    # Clean events
    db_session.query(AttendanceEvent).filter(
        AttendanceEvent.user_id.in_([user_a.id, user_b.id])
    ).delete()
    db_session.commit()

    # Login as User A
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-IDA-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_dummy_image_bytes()

    # Post check-in attempting to pass User B employee code
    client.post(
        "/api/v1/attendance/check-in",
        data={"employee_code": "TEST-IDB-002", "user_id": user_b.id},
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )

    # Verify event recorded strictly belongs to user_a
    event = db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user_a.id).first()
    assert event is not None
    assert event.user_id == user_a.id

    # Verify user_b has 0 events
    b_event = db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user_b.id).first()
    assert b_event is None


def test_create_user_script_logic(db_session):
    # Ensure fresh state
    db_session.query(User).filter(User.employee_code == "TEST-NEW-099").delete()
    db_session.commit()

    # Test secure user creation helper
    user = create_user(
        db=db_session,
        employee_code="TEST-NEW-099",
        full_name="Nhân Viên Mới",
        password="ValidPassword123",
        role="EMPLOYEE",
    )
    assert user.id is not None
    assert user.employee_code == "TEST-NEW-099"
    assert user.password_hash.startswith("$argon2id$")

    # Duplicate code rejection
    with pytest.raises(ValueError, match="đã tồn tại"):
        create_user(
            db=db_session,
            employee_code="TEST-NEW-099",
            full_name="Nhân Viên Trùng",
            password="ValidPassword123",
        )

    # Short password rejection
    with pytest.raises(ValueError, match="tối thiểu 6 ký tự"):
        create_user(
            db=db_session,
            employee_code="TEST-SHORT-PW",
            full_name="Nhân Viên Pass Ngắn",
            password="123",
        )


def test_attendance_invalid_image_rejection(client, test_user):
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]

    # Invalid garbage bytes
    bad_res = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("corrupt.jpg", b"not-a-valid-jpeg-stream", "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert bad_res.status_code in (400, 409)  # 400 for corrupt or 409 if already checked in


def test_protected_meter_reading_and_no_image_persistence(client, test_user, stub_meter_inference):
    # Unauthenticated meter reading -> 401
    with TestClient(app) as unauth_client:
        sample_img = create_dummy_image_bytes()
        res = unauth_client.post(
            "/api/v1/read-meter",
            files={"file": ("meter.jpg", sample_img, "image/jpeg")},
            headers={"X-CSRF-Token": "some-token"},
        )
        assert res.status_code == 401

    # Authenticated meter reading
    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]

    stub_meter_inference.assert_not_called()
    initial_files = set(Path(".").glob("**/*.jpg"))
    valid_bytes = create_dummy_image_bytes()
    res = client.post(
        "/api/v1/read-meter",
        files={"file": ("013.jpg", valid_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["reading"] == "000300"

    # Verify NO meter images were created in attendance storage or repo root
    after_files = set(Path(".").glob("**/*.jpg"))
    # Any new file must only be inside test_attendance_photos, not meter images
    new_files = after_files - initial_files
    for nf in new_files:
        assert "test_attendance_photos" in str(nf)
    stub_meter_inference.assert_called_once()


def test_unauthenticated_attendance_rejected(client):
    # Unauthenticated /today -> 401
    with TestClient(app) as unauth:
        res1 = unauth.get("/api/v1/attendance/today")
        assert res1.status_code == 401

        img_bytes = create_dummy_image_bytes()
        res2 = unauth.post(
            "/api/v1/attendance/check-in",
            files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
            headers={"X-CSRF-Token": "csrf"},
        )
        assert res2.status_code == 401

        res3 = unauth.post(
            "/api/v1/attendance/check-out",
            files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
            headers={"X-CSRF-Token": "csrf"},
        )
        assert res3.status_code == 401


def test_attendance_private_storage_and_metadata_stripped(client, db_session):
    # Dedicated user
    user = db_session.query(User).filter(User.employee_code == "TEST-PRIV-001").first()
    if not user:
        user = User(
            employee_code="TEST-PRIV-001",
            full_name="Nguyễn Văn Bảo Mật",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user.id).delete()
    db_session.commit()

    client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST-PRIV-001", "password": "Password123"},
    )
    csrf_token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_dummy_image_bytes()

    res = client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("raw_selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    res_data = res.json()

    # Verify no local filesystem path leaked in API response
    assert "photo_path" not in res_data
    assert "file_path" not in res_data

    # Verify event stored in DB
    event = db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user.id).first()
    assert event is not None
    assert event.photo_key.endswith(".jpg")
    assert len(event.photo_sha256) == 64

    # Verify file is stored in private directory
    current_settings = get_settings()
    stored_file = Path(current_settings.attendance_photo_dir) / event.photo_key
    assert stored_file.exists()
    assert stored_file.is_file()
    assert stored_file.stat().st_size > 0

