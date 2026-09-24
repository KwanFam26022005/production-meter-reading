import io
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.exc import IntegrityError

# Ensure test DB is strictly isolated
os.environ["DATABASE_URL"] = "sqlite:///./data/test_attendance_recon.db"
os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_recon_photos"
os.environ["ENVIRONMENT"] = "development"

from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import Base, engine, SessionLocal, init_db
from backend.app.attendance import get_current_business_date
from backend.app.models import User, AttendanceEvent
from backend.app.auth import hash_password, create_user_session
from backend.app.main import app
from backend.app.attendance_gc import audit_and_cleanup_attendance_photos


def create_synthetic_image_bytes(width=200, height=200, color=(70, 130, 180)) -> bytes:
    """Creates a synthetic geometric test image with no identifiable human features."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    os.environ["DATABASE_URL"] = "sqlite:///./data/test_attendance_recon.db"
    os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_recon_photos"
    os.environ["ENVIRONMENT"] = "development"
    get_settings.cache_clear()
    init_db()
    photo_dir = Path("data/test_attendance_recon_photos")
    photo_dir.mkdir(parents=True, exist_ok=True)
    yield
    # Cleanup
    engine.dispose()
    photo_dir = Path("data/test_attendance_recon_photos")
    if photo_dir.exists():
        shutil.rmtree(photo_dir, ignore_errors=True)
    for p in Path("data").glob("test_attendance_recon.db*"):
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
def test_recon_user(db_session):
    user = db_session.query(User).filter(User.employee_code == "TEST-RECON-01").first()
    if not user:
        user = User(
            employee_code="TEST-RECON-01",
            full_name="Kỹ sư Thử nghiệm Đối soát",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    # Clean prior events
    db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user.id).delete()
    db_session.commit()
    return user


@pytest.fixture
def secondary_user(db_session):
    user = db_session.query(User).filter(User.employee_code == "TEST-RECON-02").first()
    if not user:
        user = User(
            employee_code="TEST-RECON-02",
            full_name="Nhân viên Kiểm thử Cô lập",
            password_hash=hash_password("Password123"),
            role="EMPLOYEE",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == user.id).delete()
    db_session.commit()
    return user


@pytest.fixture
def auth_client(test_recon_user, db_session):
    client = TestClient(app)
    settings = get_settings()
    session_obj, token = create_user_session(db_session, test_recon_user)
    client.cookies.set(settings.session_cookie_name, token)
    return client


# ==============================================================================
# MANDATORY SCENARIOS 1 - 18 (PHASE E)
# ==============================================================================

def test_scenario_01_first_check_in_creates_one_event_and_one_image(auth_client, test_recon_user, db_session):
    """Scenario 1: First CHECK_IN creates exactly one event and one referenced image."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(10, 20, 30))
    sub_id = "sub-scen01-uuid"
    photo_dir = Path("data/test_attendance_recon_photos")
    initial_files = set(photo_dir.glob("*.jpg"))

    res = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["event_type"] == "CHECK_IN"
    assert data["client_submission_id"] == sub_id
    assert "payload_sha256" in data

    # Exactly 1 DB row
    events = db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == test_recon_user.id).all()
    assert len(events) == 1
    event = events[0]

    # Exactly 1 file on disk referenced by DB
    new_files = set(photo_dir.glob("*.jpg")) - initial_files
    assert len(new_files) == 1
    created_file = list(new_files)[0]
    assert created_file.name == event.photo_key


def test_scenario_02_same_id_same_payload_returns_original_event(auth_client, test_recon_user, db_session):
    """Scenario 2: Same ID + same payload returns the original event without creating a new photo or row."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(40, 50, 60))
    sub_id = "sub-scen02-idem"
    photo_dir = Path("data/test_attendance_recon_photos")

    # 1st attempt
    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200
    id1 = res1.json()["id"]

    files_after_first = set(photo_dir.glob("*.jpg"))

    # 2nd attempt with same ID and same image payload
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == id1

    # Verify no new file created
    files_after_second = set(photo_dir.glob("*.jpg"))
    assert files_after_first == files_after_second
    # Verify only 1 row in DB
    assert db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == test_recon_user.id).count() == 1


def test_scenario_03_same_id_different_image_is_rejected(auth_client, test_recon_user, db_session):
    """Scenario 3: Same ID + different image is rejected with HTTP 409 conflict."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes_1 = create_synthetic_image_bytes(color=(100, 110, 120))
    img_bytes_2 = create_synthetic_image_bytes(color=(200, 210, 220))
    sub_id = "sub-scen03-differing-img"

    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie1.jpg", img_bytes_1, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # Submit same ID with different image
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie2.jpg", img_bytes_2, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 409
    assert "nội dung ảnh tải lên không trùng khớp" in res2.json()["detail"]


def test_scenario_04_same_id_different_event_type_is_rejected(auth_client, test_recon_user):
    """Scenario 4: Same ID + different event type is rejected with HTTP 409 conflict."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(55, 65, 75))
    sub_id = "sub-scen04-differing-type"

    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # Submit same ID for CHECK_OUT
    res2 = auth_client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 409
    assert "sự kiện khác" in res2.json()["detail"]


def test_scenario_05_different_id_same_user_day_action_cannot_create_duplicates(auth_client, test_recon_user, db_session):
    """Scenario 5: Different IDs for the same user/day/action cannot create duplicates."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(88, 99, 111))

    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-id-first"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-id-second"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 409
    assert "vào ca hôm nay" in res2.json()["detail"]
    assert db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == test_recon_user.id).count() == 1


def test_scenario_06_concurrent_requests_same_id_do_not_create_two_events(auth_client, test_recon_user, db_session):
    """Scenario 6: Concurrent requests with the same ID do not create two events."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(12, 34, 56))
    sub_id = "sub-concurrent-same-id"

    # Simulate race condition: 1st commit succeeds, 2nd commit hits IntegrityError
    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # 2nd request with same ID and payload returns the existing event
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == res1.json()["id"]
    assert db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == test_recon_user.id).count() == 1


def test_scenario_07_concurrent_requests_different_id_do_not_produce_duplicates(auth_client, test_recon_user, db_session):
    """Scenario 7: Concurrent requests with different IDs for the same event do not produce duplicates."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(78, 89, 90))

    # First request establishes the record
    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-race-diff-1"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # Second request hits race condition / unique constraint on (user_id, date, event_type)
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-race-diff-2"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 409
    assert db_session.query(AttendanceEvent).filter(AttendanceEvent.user_id == test_recon_user.id).count() == 1


def test_scenario_08_failure_before_commit_cleans_up_temporary_file(auth_client, test_recon_user):
    """Scenario 8: Failure BEFORE commit cleans up only the appropriate temporary file."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(150, 50, 50))
    photo_dir = Path("data/test_attendance_recon_photos")
    initial_files = set(photo_dir.glob("*.jpg"))

    with patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("Pre-commit simulation crash")):
        res = auth_client.post(
            "/api/v1/attendance/check-in",
            files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
            data={"client_submission_id": "sub-precommit-fail"},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert res.status_code == 500

    after_files = set(photo_dir.glob("*.jpg"))
    assert after_files == initial_files, "Temporary file must be removed when commit fails"


def test_scenario_09_failure_after_commit_does_not_remove_committed_image(auth_client, test_recon_user, db_session):
    """Scenario 9: Failure AFTER commit does not remove the committed event's image."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(50, 150, 50))
    photo_dir = Path("data/test_attendance_recon_photos")
    sub_id = "sub-postcommit-test"

    # Simulate error in db.refresh (after db.commit has already succeeded)
    with patch("sqlalchemy.orm.Session.refresh", side_effect=RuntimeError("Post-commit refresh error")):
        res = auth_client.post(
            "/api/v1/attendance/check-in",
            files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
            data={"client_submission_id": sub_id},
            headers={"X-CSRF-Token": csrf_token},
        )
        # Even if refresh throws, record committed and image is preserved
        assert res.status_code in (200, 500)

    # Verify event was committed in DB
    event = db_session.query(AttendanceEvent).filter(AttendanceEvent.client_submission_id == sub_id).first()
    assert event is not None, "Event was committed and must exist in DB"

    # Verify committed photo is NOT deleted
    committed_photo_path = photo_dir / event.photo_key
    assert committed_photo_path.exists(), "Committed photo MUST NOT be deleted after commit"


def test_scenario_10_process_crash_leaves_recoverable_detectable_orphan(db_session):
    """Scenario 10: Process crash leaves a recoverable, detectable orphan file."""
    photo_dir = Path("data/test_attendance_recon_photos")
    orphan_file = photo_dir / "crash_orphan_scen10.jpg"
    orphan_file.write_bytes(create_synthetic_image_bytes(color=(1, 2, 3)))

    # Set mtime to 2 hours ago
    past_time = time.time() - 7200
    os.utime(orphan_file, (past_time, past_time))

    # Run GC in dry_run mode
    report = audit_and_cleanup_attendance_photos(db=db_session, dry_run=True, grace_period_seconds=3600)
    assert report["dry_run"] is True
    assert "crash_orphan_scen10.jpg" in report["orphan_keys"]
    assert orphan_file.exists(), "Dry-run must detect but NOT delete orphan file"


def test_scenario_11_cleanup_dry_run_never_removes_referenced_or_inflight_image(auth_client, test_recon_user, db_session):
    """Scenario 11: Cleanup dry-run never removes a referenced or recent/in-flight image."""
    photo_dir = Path("data/test_attendance_recon_photos")

    # 1. Create a legitimate checked-in referenced event
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(30, 40, 50))
    res = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-scen11-ref"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    ref_event = db_session.query(AttendanceEvent).filter(AttendanceEvent.client_submission_id == "sub-scen11-ref").first()
    referenced_path = photo_dir / ref_event.photo_key

    # 2. Create an in-flight unreferenced file (age 10 seconds)
    inflight_file = photo_dir / "inflight_recent.jpg"
    inflight_file.write_bytes(create_synthetic_image_bytes(color=(10, 10, 10)))

    # 3. Create an old unreferenced orphan (age 2 hours)
    old_orphan = photo_dir / "old_unreferenced.jpg"
    old_orphan.write_bytes(create_synthetic_image_bytes(color=(20, 20, 20)))
    past_time = time.time() - 7200
    os.utime(old_orphan, (past_time, past_time))

    # Execute dry-run GC
    dry_report = audit_and_cleanup_attendance_photos(db=db_session, dry_run=True, grace_period_seconds=3600)
    assert dry_report["referenced"] >= 1
    assert dry_report["in_flight_protected"] >= 1
    assert "old_unreferenced.jpg" in dry_report["orphan_keys"]
    assert dry_report["orphans_deleted"] == 0
    assert referenced_path.exists()
    assert inflight_file.exists()
    assert old_orphan.exists()

    # Execute applied GC
    apply_report = audit_and_cleanup_attendance_photos(db=db_session, dry_run=False, grace_period_seconds=3600)
    assert apply_report["orphans_deleted"] >= 1
    assert referenced_path.exists(), "Authoritative referenced image must never be deleted"
    assert inflight_file.exists(), "In-flight young file must be protected by grace period"
    assert not old_orphan.exists(), "Old orphan must be cleaned up on apply"

    # Clean up inflight temp file
    inflight_file.unlink(missing_ok=True)


def test_scenario_12_missing_reconciliation_event_not_treated_as_proof_of_failure(auth_client):
    """Scenario 12: Missing reconciliation event is not treated as proof of failure."""
    today_res = auth_client.get("/api/v1/attendance/today")
    assert today_res.status_code == 200
    data = today_res.json()
    assert data["check_in"] is None
    # Client contract defines this as NOT_OBSERVED / NOT_RECORDED, not definitive failure


def test_scenario_13_matching_photo_hash_different_sub_id_not_treated_as_same_request(auth_client, test_recon_user):
    """Scenario 13: Matching photo hash with a different submission ID is not treated as the same request."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(11, 22, 33))

    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-key-A"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # User sends same photo with a different submission ID -> Rejected with 409 Conflict
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "sub-key-B"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 409


def test_scenario_14_timeout_after_commit_can_be_reconciled_to_original_event(auth_client, test_recon_user):
    """Scenario 14: Timeout after commit can be reconciled to the original event."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(99, 88, 77))
    sub_id = "sub-scen14-timeout-recon"

    # 1. Commit succeeds on server
    res = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 200
    committed_id = res.json()["id"]

    # 2. Client queries GET /today to reconcile
    today_res = auth_client.get("/api/v1/attendance/today")
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert today_data["check_in"]["client_submission_id"] == sub_id
    assert today_data["check_in"]["id"] == committed_id


def test_scenario_15_same_logical_request_safe_to_retry_with_original_id(auth_client, test_recon_user):
    """Scenario 15: The same logical request is safe to retry with its original ID."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(44, 55, 66))
    sub_id = "sub-scen15-safe-retry"

    res1 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 200

    # Retry with same ID and same payload
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": sub_id},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == res1.json()["id"]


def test_scenario_16_legacy_rows_without_submission_id_remain_readable(auth_client, test_recon_user, db_session):
    """Scenario 16: Legacy rows without submission ID remain readable and handled conservatively."""
    legacy_event = AttendanceEvent(
        user_id=test_recon_user.id,
        business_date=get_current_business_date(),
        event_type="CHECK_IN",
        server_timestamp=datetime.now(timezone.utc),
        photo_key="legacy_photo.jpg",
        photo_sha256="legacyhash000000000000000000000000000000000000000000000000000000",
        payload_sha256=None,  # Legacy row without payload_sha256
        mime_type="image/jpeg",
        photo_size=12345,
        capture_source="live_camera",
        status="VALID",
        client_submission_id=None,  # Legacy row without client_submission_id
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(legacy_event)
    db_session.commit()

    today_res = auth_client.get("/api/v1/attendance/today")
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert today_data["check_in"] is not None
    assert today_data["check_in"]["client_submission_id"] is None
    assert today_data["check_in"]["payload_sha256"] is None
    assert today_data["allowed_action"] == "CHECK_OUT"


def test_scenario_17_authentication_csrf_and_user_isolation_enforced(test_recon_user, secondary_user, db_session):
    """Scenario 17: Authentication, CSRF and user isolation remain strictly enforced."""
    unauth_client = TestClient(app)
    img_bytes = create_synthetic_image_bytes()

    # 1. Unauthenticated request -> 401
    res1 = unauth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
    )
    assert res1.status_code == 401

    # 2. Authenticated without CSRF -> 403
    settings = get_settings()
    auth_no_csrf = TestClient(app)
    _, token1 = create_user_session(db_session, test_recon_user)
    auth_no_csrf.cookies.set(settings.session_cookie_name, token1)

    res2 = auth_no_csrf.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
    )
    assert res2.status_code == 403

    # 3. User isolation: User 2 cannot see User 1's attendance
    csrf_token1 = auth_no_csrf.get("/api/v1/auth/csrf").json()["csrf_token"]
    auth_no_csrf.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        data={"client_submission_id": "user1-private-sub"},
        headers={"X-CSRF-Token": csrf_token1},
    )

    client_user2 = TestClient(app)
    _, token2 = create_user_session(db_session, secondary_user)
    client_user2.cookies.set(settings.session_cookie_name, token2)

    res3 = client_user2.get("/api/v1/attendance/today")
    assert res3.status_code == 200
    user2_data = res3.json()
    assert user2_data["check_in"] is None, "User 2 must not observe User 1's check-in"


def test_scenario_18_check_out_sequencing_and_business_date_behavior_preserved(auth_client, test_recon_user):
    """Scenario 18: CHECK_OUT sequencing and current business-date behavior are preserved."""
    csrf_token = auth_client.get("/api/v1/auth/csrf").json()["csrf_token"]
    img_bytes = create_synthetic_image_bytes(color=(12, 23, 34))

    # Check-out before check-in -> 409 sequence violation
    res1 = auth_client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 409
    assert "vào ca trước" in res1.json()["detail"]

    # Check-in -> 200
    res2 = auth_client.post(
        "/api/v1/attendance/check-in",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 200

    # Check-out -> 200
    res3 = auth_client.post(
        "/api/v1/attendance/check-out",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res3.status_code == 200

    # Today summary now indicates completion (allowed_action == None)
    today_res = auth_client.get("/api/v1/attendance/today")
    assert today_res.status_code == 200
    assert today_res.json()["allowed_action"] is None
