import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.models import (
    Base,
    Meter,
    ReadingBatch,
    ReadingRound,
    MeterReading,
    User,
)
from backend.app.meter_logbook import (
    get_today_meter_operations,
    get_current_or_nearest_round,
    to_utc_datetime,
)


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


def test_to_utc_datetime_helper():
    """Verify that to_utc_datetime properly normalizes naive, aware, and None datetimes."""
    # None -> minimum UTC
    res_none = to_utc_datetime(None)
    assert res_none.tzinfo == timezone.utc

    # Naive -> assumes UTC
    naive_dt = datetime(2026, 9, 21, 14, 0, 0)
    res_naive = to_utc_datetime(naive_dt)
    assert res_naive.tzinfo == timezone.utc
    assert res_naive.year == 2026 and res_naive.hour == 14

    # Aware UTC -> remains aware UTC
    aware_utc = datetime(2026, 9, 21, 14, 0, 0, tzinfo=timezone.utc)
    res_aware = to_utc_datetime(aware_utc)
    assert res_aware == aware_utc

    # Aware offset -> converted to UTC
    tz_plus_7 = timezone(timedelta(hours=7))
    aware_plus_7 = datetime(2026, 9, 21, 21, 0, 0, tzinfo=tz_plus_7)
    res_converted = to_utc_datetime(aware_plus_7)
    assert res_converted == aware_utc

    # Comparing naive and aware through to_utc_datetime must not raise TypeError
    items = [naive_dt, aware_utc, aware_plus_7, None]
    sorted_items = sorted(items, key=to_utc_datetime)
    assert sorted_items[0] is None


def test_mixed_naive_and_aware_confirmed_readings_sort(test_db):
    """
    Regression test: Prior to the fix, sorting confirmed_readings where some
    records had offset-naive server_timestamp and others had offset-aware
    server_timestamp caused:
    TypeError: can't compare offset-naive and offset-aware datetimes.
    """
    # 1. Setup User
    user = User(
        id=str(uuid.uuid4()),
        employee_code="CSG-0102",
        full_name="Nguyễn Văn An",
        password_hash="hash",
        role="EMPLOYEE",
        is_active=True,
    )
    test_db.add(user)

    # 2. Setup Meters
    m1 = Meter(id=str(uuid.uuid4()), meter_code="SIM-EM-001", name="Trạm 1", meter_type="LCD", is_active=True)
    m2 = Meter(id=str(uuid.uuid4()), meter_code="SIM-EM-002", name="Trạm 2", meter_type="LCD", is_active=True)
    test_db.add_all([m1, m2])

    # 3. Setup Open Batch
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Kỳ 09/2026",
        period_key="2026-09",
        status="OPEN",
        created_at=datetime(2026, 9, 21, 0, 0, 0, tzinfo=timezone.utc),
    )
    test_db.add(batch)

    # 4. Setup Round (at 14:00 UTC = 21:00 VN)
    sched_dt = datetime(2026, 9, 21, 7, 0, 0, tzinfo=timezone.utc)
    round_obj = ReadingRound(
        id=str(uuid.uuid4()),
        batch_id=batch.id,
        scheduled_at=sched_dt,
        status="OPEN",
        is_legacy=False,
    )
    test_db.add(round_obj)
    test_db.commit()

    # 5. Insert ONE reading with OFFSET-NAIVE timestamp (from legacy fixture or sqlite)
    r1 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m1.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        reading="01234.5",
        status="CONFIRMED",
        server_timestamp=datetime(2026, 9, 21, 14, 5, 0), # NAIVE!
        user_id=user.id,
    )

    # 6. Insert ONE reading with OFFSET-AWARE timestamp (from datetime.now(timezone.utc))
    r2 = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=m2.id,
        batch_id=batch.id,
        reading_round_id=round_obj.id,
        reading="05678.9",
        status="CONFIRMED",
        server_timestamp=datetime(2026, 9, 21, 14, 10, 0, tzinfo=timezone.utc), # AWARE!
        user_id=user.id,
    )
    test_db.add_all([r1, r2])
    test_db.commit()

    # 7. Call get_today_meter_operations — this must NOT raise TypeError
    res = get_today_meter_operations(test_db, date_filter="2026-09-21")
    assert res is not None
    assert len(res.meters) == 2
    assert res.batch.progress.confirmed == 2
    assert res.meters[0].latest_confirmed is not None
    assert res.meters[1].latest_confirmed is not None


def test_get_today_meter_operations_no_batch_contract(test_db):
    """When no open batch exists, must return HTTP 200 with batch=None and empty meters."""
    res = get_today_meter_operations(test_db, date_filter="2026-09-21")
    assert res.batch is None
    assert res.current_round is None
    assert res.summary.total_meters == 0
    assert len(res.meters) == 0


def test_get_today_meter_operations_no_round_today_contract(test_db):
    """When a batch exists but no rounds are scheduled for today, must return status NO_ROUND."""
    m1 = Meter(id=str(uuid.uuid4()), meter_code="SIM-EM-001", name="Trạm 1", meter_type="LCD", is_active=True)
    test_db.add(m1)
    batch = ReadingBatch(
        id=str(uuid.uuid4()),
        name="Kỳ 09/2026",
        period_key="2026-09",
        status="OPEN",
        created_at=datetime(2026, 9, 21, 0, 0, 0, tzinfo=timezone.utc),
    )
    test_db.add(batch)
    test_db.commit()

    res = get_today_meter_operations(test_db, date_filter="2026-09-21")
    assert res.batch is not None
    assert res.current_round is None
    assert len(res.meters) == 1
    assert res.meters[0].current_status == "NO_ROUND"
