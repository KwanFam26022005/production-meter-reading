import base64
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["METER_READING_EVIDENCE_DIR"] = "data/test_meter_reading_evidence"
os.environ["METER_TRAINING_DIR"] = "data/test_meter_training_samples"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import generate_csrf_token, hash_password, hash_session_token
from backend.app.config import get_settings

from backend.app.db import Base, get_db
from backend.app.main import app
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
from backend.app.meter_logbook import confirm_meter_reading

settings = get_settings()
LOCAL_TZ = ZoneInfo(settings.timezone)


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

    # Set up temp evidence & training dirs
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

    # 1. Users
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

    # 2. Batch & Rounds
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
    r2_sched = now_utc - timedelta(hours=1)
    round1 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=r1_sched,
        status="OPEN",
        is_legacy=False,
    )
    round2 = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=r2_sched,
        status="OPEN",
        is_legacy=False,
    )
    db.add_all([round1, round2])
    db.commit()

    # 3. Meters
    meter1 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-006",
        name="Công tơ Kho D",
        location="Kho D - Cảng Tân Thuận",
        meter_type="mechanical",
        is_active=True,
    )
    meter2 = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-007",
        name="Công tơ Bến 2",
        location="Cầu tàu 2",
        meter_type="lcd",
        is_active=True,
    )
    db.add_all([meter1, meter2])
    db.commit()

    return {
        "admin": admin_user,
        "employee": employee_user,
        "batch": batch,
        "round1": round1,
        "round2": round2,
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
    return client


# ==============================================================================
# TESTS
# ==============================================================================

def test_model_and_evidence_persistence(test_db_session, seed_data):
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    emp = seed_data["employee"]

    img_b64 = create_sample_jpg_base64()
    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="0028728.6",
        ocr_reading="0028723.6",
        confirmation_source="USER_CORRECTED",
        roi_bbox=[10.0, 20.0, 50.0, 80.0],
        image_base64=img_b64,
    )
    reading = confirm_meter_reading(db, emp, req)
    assert reading.id is not None
    assert reading.reading == "0028728.6"
    assert reading.ocr_reading == "0028723.6"
    assert reading.confirmation_source == "USER_CORRECTED"

    # Verify MeterReadingEvidence created
    evidence = db.query(MeterReadingEvidence).filter(MeterReadingEvidence.meter_reading_id == reading.id).first()
    assert evidence is not None
    assert evidence.image_filename.endswith(".jpg")
    assert len(evidence.image_sha256) == 64
    assert evidence.roi_bbox == "[10.0, 20.0, 50.0, 80.0]"

    # Verify physical file exists and is valid JPEG
    file_path = Path(get_settings().meter_reading_evidence_dir) / evidence.image_filename
    assert file_path.is_file()
    img_data = cv2.imread(str(file_path))
    assert img_data is not None


def test_auth_and_inspection_detail_endpoint(test_db_session, seed_data):
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    admin = seed_data["admin"]
    emp = seed_data["employee"]

    # Confirm a reading
    img_b64 = create_sample_jpg_base64()
    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="0035785.4",
        ocr_reading="0035785.4",
        confirmation_source="OCR_CONFIRMED",
        image_base64=img_b64,
    )
    reading = confirm_meter_reading(db, emp, req)

    # 1. Unauthenticated -> 401
    app.dependency_overrides[get_db] = lambda: db
    anon_client = TestClient(app)
    res = anon_client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 401

    # 2. Employee -> 403
    emp_client = create_auth_client(db, emp)
    res = emp_client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 403

    # 3. Admin -> 200
    admin_client = create_auth_client(db, admin)
    res = admin_client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["reading_id"] == reading.id
    assert data["reading"] == "0035785.4"
    assert data["ocr_reading"] == "0035785.4"
    assert data["confirmation_source"] == "OCR_CONFIRMED"
    assert data["meter"]["meter_code"] == "CT-006"
    assert data["operator"]["full_name"] == "Nguyễn Văn A"
    assert data["evidence_available"] is True


def test_evidence_image_stream_and_path_safety(test_db_session, seed_data):
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"]
    admin = seed_data["admin"]
    emp = seed_data["employee"]

    img_b64 = create_sample_jpg_base64()
    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="01074",
        confirmation_source="MANUAL_ENTRY",
        image_base64=img_b64,
    )
    reading = confirm_meter_reading(db, emp, req)

    admin_client = create_auth_client(db, admin)
    res = admin_client.get(f"/api/v1/admin/meter-readings/{reading.id}/evidence")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/jpeg"
    assert "private" in res.headers.get("cache-control", "")
    assert len(res.content) > 0

    # Non-existent reading -> 404
    res_fake = admin_client.get(f"/api/v1/admin/meter-readings/{uuid.uuid4()}/evidence")
    assert res_fake.status_code == 404


def test_privacy_boundary_between_training_and_evidence(test_db_session, seed_data):
    db = test_db_session
    m2 = seed_data["meter2"]
    r1 = seed_data["round1"]
    admin = seed_data["admin"]
    emp = seed_data["employee"]

    # Create a historical MeterReading without evidence
    now_utc = datetime.now(timezone.utc)
    historical_reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m2.id,
        batch_id=seed_data["batch"].id,
        reading_round_id=r1.id,
        user_id=emp.id,
        reading="001234.5",
        ocr_reading="001230.0",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        server_timestamp=now_utc - timedelta(days=2),
    )
    db.add(historical_reading)
    db.commit()

    # Create an independent MeterTrainingSample for that same meter & round
    training_sample = MeterTrainingSample(
        id=str(uuid.uuid4()),
        meter_id=m2.id,
        reading_round_id=r1.id,
        created_by_user_id=emp.id,
        sample_type="OCR_CORRECTION",
        corrected_reading="001234.5",
        ocr_reading="001230.0",
        image_filename="training_secret.jpg",
        image_sha256="abc123456",
        annotation_status="READY_OCR",
        created_at=now_utc,
    )
    db.add(training_sample)
    db.commit()

    # Admin inspects the historical reading:
    # 1. Detail returns evidence_available = False
    admin_client = create_auth_client(db, admin)
    res = admin_client.get(f"/api/v1/admin/meter-readings/{historical_reading.id}")
    assert res.status_code == 200
    assert res.json()["evidence_available"] is False

    # 2. Image endpoint returns 404 (MUST NOT fallback to training sample image!)
    res_img = admin_client.get(f"/api/v1/admin/meter-readings/{historical_reading.id}/evidence")
    assert res_img.status_code == 404


def test_previous_next_navigation_within_same_meter(test_db_session, seed_data):
    db = test_db_session
    m1 = seed_data["meter1"]
    r1 = seed_data["round1"] # earlier
    r2 = seed_data["round2"] # later
    admin = seed_data["admin"]
    emp = seed_data["employee"]

    req1 = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r1.id,
        reading="001000.0",
        ocr_reading="001000.0",
        confirmation_source="OCR_CONFIRMED",
    )
    rd1 = confirm_meter_reading(db, emp, req1)

    req2 = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r2.id,
        reading="001050.0",
        ocr_reading="001050.0",
        confirmation_source="OCR_CONFIRMED",
    )
    rd2 = confirm_meter_reading(db, emp, req2)

    admin_client = create_auth_client(db, admin)

    # Inspect rd1: prev=None, next=rd2.id
    res1 = admin_client.get(f"/api/v1/admin/meter-readings/{rd1.id}")
    assert res1.status_code == 200
    assert res1.json()["prev_reading_id"] is None
    assert res1.json()["next_reading_id"] == rd2.id

    # Inspect rd2: prev=rd1.id, next=None
    res2 = admin_client.get(f"/api/v1/admin/meter-readings/{rd2.id}")
    assert res2.status_code == 200
    assert res2.json()["prev_reading_id"] == rd1.id
    assert res2.json()["next_reading_id"] is None


def test_get_meter_latest_reading(test_db_session, seed_data):
    db = test_db_session
    m1 = seed_data["meter1"]
    m2 = seed_data["meter2"]
    r1 = seed_data["round1"]
    r2 = seed_data["round2"]
    admin = seed_data["admin"]
    emp = seed_data["employee"]

    req = ConfirmReadingRequest(
        meter_id=m1.id,
        reading_round_id=r2.id,
        reading="009999.0",
        ocr_reading="009999.0",
        confirmation_source="OCR_CONFIRMED",
    )
    rd_latest = confirm_meter_reading(db, emp, req)

    admin_client = create_auth_client(db, admin)

    # meter 1 has reading -> returns latest reading id
    res = admin_client.get(f"/api/v1/admin/meters/{m1.id}/latest-reading")
    assert res.status_code == 200
    assert res.json()["reading_id"] == rd_latest.id

    # meter 2 has no readings -> returns 404 with friendly message
    res2 = admin_client.get(f"/api/v1/admin/meters/{m2.id}/latest-reading")
    assert res2.status_code == 404
    assert "chưa có bản ghi" in res2.json()["detail"]
