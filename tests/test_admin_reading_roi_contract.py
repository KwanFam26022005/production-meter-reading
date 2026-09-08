import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import hash_password, hash_session_token
from backend.app.config import get_settings
from backend.app.db import Base, get_db
from backend.app.inference import compute_recognition_crop_geometry
from backend.app.main import app
from backend.app.models import (
    Meter,
    MeterReading,
    MeterReadingEvidence,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
)

settings = get_settings()


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
    get_settings().meter_reading_evidence_dir = evidence_dir

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_admin_client(db):
    admin_user = User(
        id=str(uuid.uuid4()),
        employee_code="ADM-TEST",
        full_name="Admin QA Tester",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    db.add(admin_user)
    db.commit()

    raw_token = f"test-token-{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session_obj = SessionModel(
        id=str(uuid.uuid4()),
        user_id=admin_user.id,
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
# 1. CANONICAL BBOX FORMAT & RECOGNITION GEOMETRY TEST
# ==============================================================================
def test_compute_recognition_crop_geometry_deterministic():
    """
    Verifies that compute_recognition_crop_geometry applies:
    pad 5% of width/height
    horizontal shift +2.5% of bbox width
    """
    # Box: x1=100, y1=200, x2=500, y2=280 on 1000x1000 image
    # width=400, height=80
    # dx = +0.025 * 400 = 10
    # pad_x = 0.05 * 400 = 20
    # pad_y = 0.05 * 80 = 4
    # nx1 = floor(100 + 10 - 20) = 90
    # nx2 = ceil(500 + 10 + 20) = 530
    # ny1 = floor(200 - 4) = 196
    # ny2 = ceil(280 + 4) = 284
    nx1, ny1, nx2, ny2, norm_x1, norm_y1, norm_x2, norm_y2 = compute_recognition_crop_geometry(
        x1=100,
        y1=200,
        x2=500,
        y2=280,
        width=1000,
        height=1000,
        roi_shift_x=0.025,
        roi_padding=0.05,
    )
    assert nx1 == 90
    assert nx2 == 530
    assert ny1 == 196
    assert ny2 == 284
    assert norm_x1 == 0.09
    assert norm_x2 == 0.53
    assert norm_y1 == 0.196
    assert norm_y2 == 0.284


# ==============================================================================
# 2. AXIS SWAP REGRESSION TEST (HORIZONTAL BBOX STAYS HORIZONTAL)
# ==============================================================================
def test_horizontal_bbox_never_swapped_to_vertical(test_db_session):
    """
    Ensures that a horizontal digit sequence (width 500, height 80)
    is exposed as a strictly horizontal bbox in the inspection DTO.
    """
    db = test_db_session
    now_utc = datetime.now(timezone.utc)

    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Đợt Test BBox",
        period_key="2026-08",
        status="OPEN",
    )
    db.add(batch)
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=now_utc,
        status="OPEN",
    )
    db.add(round_obj)
    meter = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-TEST-01",
        name="Công tơ BBox",
        location="Kho",
        meter_type="mechanical",
        is_active=True,
    )
    db.add(meter)
    db.commit()

    op_user = User(
        id=str(uuid.uuid4()),
        employee_code="EMP-TEST",
        full_name="Nhân viên Test",
        password_hash=hash_password("EmpPass123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    db.add(op_user)
    db.commit()

    reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        user_id=op_user.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        reading="00123",
        ocr_reading="00120",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        server_timestamp=now_utc,
    )
    db.add(reading)
    db.commit()

    # Image 1000x800, horizontal bbox x1=200, y1=300, x2=700, y2=380 (width=500, height=80)
    # Normalized [x1, y1, x2, y2] = [0.2, 0.375, 0.7, 0.475]
    norm_bbox = [0.2, 0.375, 0.7, 0.475]
    evidence = MeterReadingEvidence(
        id=str(uuid.uuid4()),
        meter_reading_id=reading.id,
        image_filename="test-horizontal.jpg",
        image_sha256="fake-hash",
        mime_type="image/jpeg",
        width=1000,
        height=800,
        roi_bbox=json.dumps(norm_bbox),
        captured_at=now_utc,
    )
    db.add(evidence)
    db.commit()

    client = create_admin_client(db)
    res = client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 200
    data = res.json()

    ev_info = data["evidence"]
    assert ev_info is not None
    assert ev_info["available"] is True
    assert ev_info["width"] == 1000
    assert ev_info["height"] == 800

    # Localization bbox
    loc = ev_info["localization_bbox"]
    assert loc is not None
    assert loc["x1"] == 200
    assert loc["y1"] == 300
    assert loc["x2"] == 700
    assert loc["y2"] == 380
    assert loc["width"] == 500
    assert loc["height"] == 80
    assert loc["width"] > loc["height"]  # Strictly horizontal!

    # Recognition bbox
    rec = ev_info["recognition_bbox"]
    assert rec is not None
    assert rec["width"] > rec["height"]  # Strictly horizontal!


# ==============================================================================
# 3. CT-003 REAL HISTORICAL RECORD INSPECTION TEST
# ==============================================================================
def test_ct003_inspection_bbox_contract(test_db_session):
    """
    Validates exact CT-003 mechanical meter numbers:
    1920x2560 portrait image
    roi_bbox: [0.36822916666666666, 0.316796875, 0.5385416666666667, 0.3578125]
    x1=707, y1=811, x2=1034, y2=916 -> loc width=327, loc height=105
    """
    db = test_db_session
    now_utc = datetime.now(timezone.utc)

    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Đợt Tháng 08/2026",
        period_key="2026-08",
        status="OPEN",
    )
    db.add(batch)
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=now_utc,
        status="OPEN",
    )
    db.add(round_obj)
    meter = Meter(
        id=str(uuid.uuid4()),
        meter_code="CT-003",
        name="Công tơ Cơ khí Cầu cảng",
        location="Cầu cảng 1",
        meter_type="mechanical",
        is_active=True,
    )
    db.add(meter)
    db.commit()

    op_user = User(
        id=str(uuid.uuid4()),
        employee_code="EMP-CT003",
        full_name="Nhân viên Hiện trường",
        password_hash=hash_password("EmpPass123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    db.add(op_user)
    db.commit()

    reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        user_id=op_user.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        reading="00784",
        ocr_reading="00764",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        server_timestamp=now_utc,
    )
    db.add(reading)
    db.commit()

    ct003_roi = [0.36822916666666666, 0.316796875, 0.5385416666666667, 0.3578125]
    evidence = MeterReadingEvidence(
        id=str(uuid.uuid4()),
        meter_reading_id=reading.id,
        image_filename="ct003-evidence.jpg",
        image_sha256="fake-ct003-sha256",
        mime_type="image/jpeg",
        width=1920,
        height=2560,
        roi_bbox=json.dumps(ct003_roi),
        captured_at=now_utc,
    )
    db.add(evidence)
    db.commit()

    client = create_admin_client(db)
    res = client.get(f"/api/v1/admin/meter-readings/{reading.id}")
    assert res.status_code == 200
    data = res.json()

    ev = data["evidence"]
    assert ev["available"] is True
    assert ev["width"] == 1920
    assert ev["height"] == 2560

    loc = ev["localization_bbox"]
    assert loc["x1"] == 707
    assert loc["y1"] == 811
    assert loc["x2"] == 1034
    assert loc["y2"] == 916
    assert loc["width"] == 327
    assert loc["height"] == 105
    assert loc["width"] > loc["height"] * 3.0  # Aspect ratio > 3:1 horizontal

    rec = ev["recognition_bbox"]
    assert rec["width"] == 361
    assert rec["height"] == 117
    assert rec["width"] > rec["height"] * 3.0  # Aspect ratio > 3:1 horizontal
