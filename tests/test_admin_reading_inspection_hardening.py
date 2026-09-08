import base64
import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import generate_csrf_token, hash_password, hash_session_token
from backend.app.config import get_settings
from backend.app.db import Base, get_db
from backend.app.main import app
from backend.app.meter_logbook import confirm_meter_reading, save_meter_reading_evidence
from backend.app.models import (
    Meter,
    MeterReading,
    MeterReadingEvidence,
    MeterTrainingSample,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
)
from backend.app.schemas import ConfirmReadingRequest

settings = get_settings()


def create_sample_jpg_base64(width=100, height=80, color=(100, 150, 200)) -> str:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    cv2.putText(img, "TEST", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    _, encoded = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")


@pytest.fixture
def test_db_session(tmp_path):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    training_dir = tmp_path / "training"
    training_dir.mkdir(parents=True, exist_ok=True)

    curr_settings = get_settings()
    curr_settings.meter_reading_evidence_dir = evidence_dir
    curr_settings.meter_training_dir = training_dir

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def seed_data(test_db_session):
    db = test_db_session
    now_utc = datetime.now(timezone.utc)

    admin_user = User(
        id=str(uuid.uuid4()),
        employee_code="ADM-001",
        full_name="Quản Trị Viên",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    employee_user = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn A",
        password_hash=hash_password("EmpPass123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    db.add_all([admin_user, employee_user])
    db.commit()

    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Đợt Tháng 08/2026",
        period_key="2026-08",
        status="OPEN",
        created_at=now_utc - timedelta(days=5),
    )
    db.add(batch)
    db.commit()

    r1_sched = now_utc - timedelta(hours=2)
    round1 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=r1_sched,
        status="OPEN",
        is_legacy=False,
    )
    db.add(round1)
    db.commit()

    meter1 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-001",
        name="Công tơ Kho A",
        location="Kho A",
        meter_type="lcd",
        is_active=True,
    )
    meter2 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-002",
        name="Công tơ Kho B",
        location="Kho B",
        meter_type="mechanical",
        is_active=True,
    )
    db.add_all([meter1, meter2])
    db.commit()

    return {
        "admin": admin_user,
        "employee": employee_user,
        "batch": batch,
        "round1": round1,
        "meter1": meter1,
        "meter2": meter2,
    }


def create_auth_client(db, user):
    raw_token = f"test-token-{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session_obj = SessionModel(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
    )
    db.add(session_obj)
    db.commit()

    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    client.cookies.set(settings.session_cookie_name, raw_token)
    csrf = generate_csrf_token(raw_token)
    return client, csrf


# ==============================================================================
# 1. EVIDENCE STORAGE FAILURE TEST
# ==============================================================================
def test_evidence_storage_failure_non_blocking_authoritative_reading(test_db_session, seed_data):
    """
    When file write / storage fails during evidence persistence:
    1. Valid MeterReading remains authoritative and confirmed.
    2. No broken MeterReadingEvidence row exists in DB.
    3. Inspection detail returns evidence_available=False without error.
    4. Evidence image endpoint returns 404 cleanly.
    """
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    emp = seed_data["employee"]
    admin = seed_data["admin"]

    img_b64 = create_sample_jpg_base64()
    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="001234.5",
        ocr_reading="001234.5",
        confirmation_source="OCR_CONFIRMED",
        image_base64=img_b64,
    )

    # Simulate filesystem write failure during evidence saving
    with patch("builtins.open", side_effect=IOError("Disk write simulated failure")):
        reading = confirm_meter_reading(db, emp, req)

    # 1. Authoritative MeterReading is valid and confirmed
    assert reading.id is not None
    assert reading.status == "CONFIRMED"
    assert reading.reading == "001234.5"
    assert reading.confirmation_source == "OCR_CONFIRMED"

    # 2. No broken DB evidence row exists
    evidence = db.query(MeterReadingEvidence).filter(MeterReadingEvidence.meter_reading_id == reading.id).first()
    assert evidence is None

    # 3. Admin Inspection Detail returns evidence_available=False
    admin_client, _ = create_auth_client(db, admin)
    res = admin_client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 200
    assert res.json()["evidence_available"] is False
    assert res.json()["reading"] == "001234.5"

    # 4. Evidence endpoint returns 404
    res_img = admin_client.get(f"/api/v1/admin/meter-readings/{reading.id}/evidence")
    assert res_img.status_code == 404


# ==============================================================================
# 2. DUPLICATE CONFIRMATION / ORPHAN FILE TEST
# ==============================================================================
def test_duplicate_confirmation_rejects_with_409_and_leaves_no_orphan_files(test_db_session, seed_data):
    """
    When duplicate confirmation is attempted for already CONFIRMED reading:
    1. HTTP 409 Conflict is returned.
    2. No new MeterReadingEvidence is created.
    3. Filesystem has ZERO additional files created.
    4. Existing evidence remains intact and unchanged.
    """
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    emp = seed_data["employee"]

    evidence_dir = Path(get_settings().meter_reading_evidence_dir)

    # First confirmation
    img1_b64 = create_sample_jpg_base64(color=(100, 100, 100))
    req1 = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="002000.0",
        ocr_reading="002000.0",
        confirmation_source="OCR_CONFIRMED",
        image_base64=img1_b64,
    )
    rd1 = confirm_meter_reading(db, emp, req1)
    assert rd1.id is not None

    evidence1 = db.query(MeterReadingEvidence).filter(MeterReadingEvidence.meter_reading_id == rd1.id).first()
    assert evidence1 is not None
    original_filename = evidence1.image_filename
    original_sha256 = evidence1.image_sha256

    files_before = set(evidence_dir.iterdir())
    assert len(files_before) == 1

    # Attempt duplicate confirmation via API
    emp_client, csrf_token = create_auth_client(db, emp)

    img2_b64 = create_sample_jpg_base64(color=(200, 200, 200))
    res = emp_client.post(
        "/api/v1/meter-readings/confirm",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "meter_id": m1.id,
            "reading_round_id": r1.id,
            "batch_id": seed_data["batch"].id,
            "reading": "002005.0",
            "ocr_reading": "002005.0",
            "confirmation_source": "OCR_CONFIRMED",
            "image_base64": img2_b64,
        },
    )
    assert res.status_code == 409
    assert "đã được xác nhận chỉ số" in res.json()["detail"]

    # Verify filesystem before/after
    files_after = set(evidence_dir.iterdir())
    assert files_after == files_before

    # Verify existing evidence is unchanged
    evidence_after = db.query(MeterReadingEvidence).filter(MeterReadingEvidence.meter_reading_id == rd1.id).first()
    assert evidence_after.image_filename == original_filename
    assert evidence_after.image_sha256 == original_sha256


# ==============================================================================
# 3. DB / FILE CONSISTENCY & INTEGRITY
# ==============================================================================
def test_evidence_db_file_consistency(test_db_session, seed_data):
    """
    Validates that for every MeterReadingEvidence record:
    - referenced MeterReading exists
    - physical file exists in configured evidence directory
    - filename is safe UUID-style basename (.jpg)
    - SHA256 matches exact bytes on disk
    - decodes properly as JPEG image
    """
    db = test_db_session
    m1 = seed_data["meter1"]
    m2 = seed_data["meter2"]
    r1 = seed_data["round1"]
    emp = seed_data["employee"]

    # Confirm two readings with different images
    img1 = create_sample_jpg_base64(width=120, height=90)
    img2 = create_sample_jpg_base64(width=150, height=100)

    confirm_meter_reading(db, emp, ConfirmReadingRequest(
        meter_id=m1.id, reading_round_id=r1.id, reading="001111.1", ocr_reading="001111.1", confirmation_source="OCR_CONFIRMED", image_base64=img1
    ))
    confirm_meter_reading(db, emp, ConfirmReadingRequest(
        meter_id=m2.id, reading_round_id=r1.id, reading="002222.2", ocr_reading="002220.0", confirmation_source="USER_CORRECTED", image_base64=img2
    ))

    evidence_dir = Path(get_settings().meter_reading_evidence_dir).resolve()
    all_evidence = db.query(MeterReadingEvidence).all()
    assert len(all_evidence) == 2

    inconsistencies = 0
    for ev in all_evidence:
        # Check referenced reading
        reading = db.query(MeterReading).filter(MeterReading.id == ev.meter_reading_id).first()
        if not reading:
            inconsistencies += 1

        # Check filename is safe UUID basename
        if not ev.image_filename.endswith(".jpg") or "/" in ev.image_filename or "\\" in ev.image_filename:
            inconsistencies += 1

        # Check file resolves inside directory
        file_path = (evidence_dir / ev.image_filename).resolve()
        if not str(file_path).startswith(str(evidence_dir)):
            inconsistencies += 1

        # Check file exists
        if not file_path.is_file():
            inconsistencies += 1
            continue

        # Check SHA256 matches exact bytes
        data = file_path.read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        if actual_hash != ev.image_sha256:
            inconsistencies += 1

        # Check valid JPEG decode
        decoded = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if decoded is None or decoded.size == 0:
            inconsistencies += 1

    assert inconsistencies == 0


# ==============================================================================
# 4. CAPTURED_AT AND SERVER TIMESTAMP SEMANTICS
# ==============================================================================
def test_server_timestamp_authority_for_recorded_at(test_db_session, seed_data):
    """
    Validates that recorded_at / recorded_at_vn uses the authoritative server_timestamp.
    """
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    emp = seed_data["employee"]
    admin = seed_data["admin"]

    fixed_time = datetime(2026, 8, 29, 8, 30, 0, tzinfo=timezone.utc)
    r1.scheduled_at = fixed_time - timedelta(hours=1)
    db.commit()

    with patch("backend.app.meter_logbook.datetime") as mock_dt:
        mock_dt.now.return_value = fixed_time
        mock_dt.fromisoformat = datetime.fromisoformat
        mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
        reading = confirm_meter_reading(db, emp, ConfirmReadingRequest(
            meter_id=m1.id,
            reading_round_id=r1.id,
            reading="005555.5",
            ocr_reading="005555.5",
            confirmation_source="OCR_CONFIRMED",
            image_base64=create_sample_jpg_base64(),
        ))

    admin_client, _ = create_auth_client(db, admin)
    res = admin_client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 200
    data = res.json()
    assert "29/08/2026" in data["recorded_at_vn"]
    assert "15:30" in data["recorded_at_vn"]  # 08:30 UTC -> 15:30 VN
