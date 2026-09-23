import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models import (
    Base,
    Meter,
    ReadingBatch,
    ReadingRound,
    MeterReading,
    User,
)
from backend.app.db import get_db, SessionLocal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app, raise_server_exceptions=True)
    yield test_client
    app.dependency_overrides.clear()


def test_reconciliation_requires_auth(client):
    """Calling reconciliation endpoint without authentication must return 401."""
    res = client.get("/api/v1/meter-readings/rounds/dummy-round/meters/dummy-meter")
    assert res.status_code == 401


def test_reconciliation_round_or_meter_not_found(client, test_db):
    """When round or meter does not exist, endpoint must return 404."""
    # Create authenticated user
    user = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn An",
        password_hash="hash",
        role="EMPLOYEE",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()

    # Login to set session cookie
    from backend.app.auth import create_user_session
    from backend.app.config import get_settings
    settings = get_settings()
    session_obj, token = create_user_session(test_db, user)
    client.cookies.set(settings.session_cookie_name, token)

    # Missing round
    res = client.get(f"/api/v1/meter-readings/rounds/{uuid.uuid4()}/meters/{uuid.uuid4()}")
    assert res.status_code == 404

    # Create round but missing meter
    batch = ReadingBatch(id=str(uuid.uuid4()), name="Batch", period_key="2026-09", status="OPEN")
    round_obj = ReadingRound(id=str(uuid.uuid4()), batch_id=batch.id, scheduled_at=datetime.now(timezone.utc), status="OPEN")
    test_db.add_all([batch, round_obj])
    test_db.commit()

    res = client.get(f"/api/v1/meter-readings/rounds/{round_obj.id}/meters/{uuid.uuid4()}")
    assert res.status_code == 404


def test_reconciliation_reading_not_persisted(client, test_db):
    """When round and meter exist but no reading was submitted, returns exists=False."""
    user = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn An",
        password_hash="hash",
        role="EMPLOYEE",
        is_active=True,
    )
    batch = ReadingBatch(id=str(uuid.uuid4()), name="Batch", period_key="2026-09", status="OPEN")
    round_obj = ReadingRound(id=str(uuid.uuid4()), batch_id=batch.id, scheduled_at=datetime.now(timezone.utc), status="OPEN")
    meter = Meter(id=str(uuid.uuid4()), meter_code="SIM-EM-001", name="Trạm 1", meter_type="LCD", is_active=True)
    test_db.add_all([user, batch, round_obj, meter])
    test_db.commit()

    from backend.app.auth import create_user_session
    from backend.app.config import get_settings
    settings = get_settings()
    session_obj, token = create_user_session(test_db, user)
    client.cookies.set(settings.session_cookie_name, token)

    res = client.get(f"/api/v1/meter-readings/rounds/{round_obj.id}/meters/{meter.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["exists"] is False
    assert data["reading_id"] is None
    assert data["reading"] is None


def test_reconciliation_confirmed_reading_verified(client, test_db):
    """When reading was committed in database, returns full reconciliation payload."""
    user = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn An",
        password_hash="hash",
        role="EMPLOYEE",
        is_active=True,
    )
    batch = ReadingBatch(id=str(uuid.uuid4()), name="Batch", period_key="2026-09", status="OPEN")
    round_obj = ReadingRound(id=str(uuid.uuid4()), batch_id=batch.id, scheduled_at=datetime.now(timezone.utc), status="OPEN")
    meter = Meter(id=str(uuid.uuid4()), meter_code="SIM-EM-001", name="Trạm 1", meter_type="LCD", is_active=True)
    test_db.add_all([user, batch, round_obj, meter])
    test_db.commit()

    # Create committed reading
    reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        reading="04583.50",
        ocr_reading="04582.12",
        confirmation_source="USER_CORRECTED",
        status="CONFIRMED",
        server_timestamp=datetime(2026, 9, 21, 14, 15, 0, tzinfo=timezone.utc),
        user_id=user.id,
    )
    test_db.add(reading)
    test_db.commit()

    from backend.app.auth import create_user_session
    from backend.app.config import get_settings
    settings = get_settings()
    session_obj, token = create_user_session(test_db, user)
    client.cookies.set(settings.session_cookie_name, token)

    res = client.get(f"/api/v1/meter-readings/rounds/{round_obj.id}/meters/{meter.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["exists"] is True
    assert data["reading_id"] == reading.id
    assert data["reading_status"] == "CONFIRMED"
    assert data["reading"] == "04583.50"
    assert data["ocr_reading"] == "04582.12"
    assert data["confirmation_source"] == "USER_CORRECTED"
    assert data["recorded_by_employee_code"] == "CSG-0102"
    assert data["formatted_time"] is not None
