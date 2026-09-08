import os
import random
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["ATTENDANCE_PHOTO_DIR"] = "data/test_attendance_photos"
os.environ["ENVIRONMENT"] = "development"

from backend.app.auth import hash_password
from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import Base, get_db
from backend.app.models import (
    AdminAuditLog,
    Meter,
    MeterReading,
    MeterTrainingSample,
    ReadingBatch,
    ReadingRound,
    User,
)
from backend.scripts.seed_admin_demo_month import (
    DEFAULT_DEMO_METERS,
    generate_seed_plan,
    execute_seed_plan,
    CURRENT_DEMO_DATE_STR,
    LOCAL_TZ,
)


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create admin user & field user
    admin = User(
        id=str(uuid.uuid4()),
        employee_code="52300119",
        full_name="Pham Hong Dang Khoa",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    emp = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn An",
        password_hash=hash_password("OperatorPass123!"),
        role="EMPLOYEE",
        is_active=True,
    )
    db.add_all([admin, emp])
    db.commit()

    try:
        yield db, admin, [emp]
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_dry_run_writes_nothing(test_db):
    db, admin, field_users = test_db
    rng = random.Random(202608)

    # Initial state
    assert db.query(Meter).count() == 0
    assert db.query(ReadingBatch).count() == 0
    assert db.query(ReadingRound).count() == 0
    assert db.query(MeterReading).count() == 0
    assert db.query(AdminAuditLog).count() == 0

    plan = generate_seed_plan(db, "2026-08", admin, field_users, rng)
    assert len(plan["meters_to_create"]) == 12
    assert len(plan["rounds_to_create"]) == 310
    assert len(plan["readings_to_create"]) > 2000

    # DB remains completely unchanged after generate_seed_plan
    assert db.query(Meter).count() == 0
    assert db.query(ReadingBatch).count() == 0
    assert db.query(ReadingRound).count() == 0
    assert db.query(MeterReading).count() == 0
    assert db.query(AdminAuditLog).count() == 0


def test_seed_apply_and_invariants(test_db):
    db, admin, field_users = test_db
    rng = random.Random(202608)

    plan = generate_seed_plan(db, "2026-08", admin, field_users, rng)
    execute_seed_plan(db, plan)

    # 1. Meters created and active
    meters = db.query(Meter).all()
    assert len(meters) == 12
    assert all(m.is_active is True for m in meters)

    # 2. Reading Rounds (31 days * 10 rounds = 310)
    rounds = db.query(ReadingRound).all()
    assert len(rounds) == 310

    # 3. Future dates (2026-08-29 to 2026-08-31) have 0 readings
    readings = db.query(MeterReading).all()
    assert len(readings) > 0

    for rd in readings:
        r_sched = rd.round.scheduled_at.replace(tzinfo=timezone.utc) if rd.round.scheduled_at.tzinfo is None else rd.round.scheduled_at
        r_date_str = r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
        assert r_date_str <= CURRENT_DEMO_DATE_STR, f"Reading exists for future date {r_date_str}!"

    # 4. Provenance and status invariants
    for rd in readings:
        if rd.status == "CONFIRMED":
            assert rd.reading is not None
            assert len(rd.reading) >= 5
            # Leading zero check
            assert rd.reading.startswith("0")
            if rd.confirmation_source == "OCR_CONFIRMED":
                assert rd.ocr_reading == rd.reading
            elif rd.confirmation_source == "USER_CORRECTED":
                assert rd.ocr_reading is not None
                assert rd.ocr_reading != rd.reading
            elif rd.confirmation_source == "MANUAL_ENTRY":
                assert rd.ocr_reading is None
        elif rd.status == "REVIEW":
            assert rd.reading is None
            assert rd.ocr_reading is not None

    # 5. Training samples: 0 created
    assert db.query(MeterTrainingSample).count() == 0

    # 6. Audit logs created without secrets
    audits = db.query(AdminAuditLog).all()
    assert len(audits) >= 35
    for a in audits:
        payload = f"{a.before_json or ''} {a.after_json or ''}".lower()
        assert "password" not in payload
        assert "token" not in payload
        assert "sample" not in payload


def test_seed_idempotency_and_protection(test_db):
    db, admin, field_users = test_db
    rng1 = random.Random(202608)

    # First apply
    plan1 = generate_seed_plan(db, "2026-08", admin, field_users, rng1)
    execute_seed_plan(db, plan1)

    m_count1 = db.query(Meter).count()
    r_count1 = db.query(ReadingRound).count()
    rd_count1 = db.query(MeterReading).count()
    a_count1 = db.query(AdminAuditLog).count()

    # Second apply with same seed
    rng2 = random.Random(202608)
    plan2 = generate_seed_plan(db, "2026-08", admin, field_users, rng2)
    assert len(plan2["meters_to_create"]) == 0
    assert len(plan2["meters_reused"]) == 12
    assert len(plan2["rounds_to_create"]) == 0
    assert len(plan2["rounds_reused"]) == 310
    assert len(plan2["readings_to_create"]) == 0
    assert plan2["existing_readings_protected"] > 0
    assert len(plan2["audits_to_create"]) == 0

    execute_seed_plan(db, plan2)

    # Counts remain identical
    assert db.query(Meter).count() == m_count1
    assert db.query(ReadingRound).count() == r_count1
    assert db.query(MeterReading).count() == rd_count1
    assert db.query(AdminAuditLog).count() == a_count1
