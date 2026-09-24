"""Opt-in fixtures; importing this module does not initialize application state."""
from pathlib import Path
import subprocess
import sys

import pytest


@pytest.fixture
def legacy_v1_db_path(tmp_path):
    """Rebuild V1 prerequisites from repository code on a fresh current schema."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from backend.app.db import Base, migrate_db
    from backend.app.models import Asset, Meter, MeterReading, ReadingBatch, ReadingRound, User
    from scripts.seed_tan_thuan_demo_v1 import seed_simulation

    db_path = tmp_path / "data" / "app.db"
    db_path.parent.mkdir()
    engine = create_engine(f"sqlite:///{db_path.as_posix()}")
    try:
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            from datetime import datetime, timezone
            db.add(ReadingBatch(id="v1-history-batch", name="Preserved legacy history",
                                period_key="2026-08", status="CLOSED"))
            db.flush()
            db.add(ReadingRound(id="v1-history-round", batch_id="v1-history-batch",
                                scheduled_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
                                status="CLOSED", is_legacy=True))
            db.add(User(id="v1-test-admin", employee_code="V1-ADMIN",
                        full_name="V1 fixture administrator", password_hash="unused",
                        role="ADMIN"))
            for number in range(1, 13):
                meter_id = f"v1-legacy-{number:03}"
                db.add(Meter(id=meter_id, meter_code=f"CT-{number:03}",
                             name=f"Legacy meter {number}", is_active=False,
                             lifecycle_status="RETIRED", data_origin="LEGACY_SIMULATION"))
            db.flush()
            # One identifiable history record per retired meter tests preservation
            # without depending on the quantity in a developer's mutable database.
            for number in range(1, 13):
                db.add(MeterReading(id=f"v1-history-{number:03}",
                                    meter_id=f"v1-legacy-{number:03}", user_id="v1-test-admin",
                                    batch_id="v1-history-batch", reading_round_id="v1-history-round",
                                    reading="100", status="CONFIRMED", meter_type="UNKNOWN"))
            for number in range(364):
                db.add(Asset(id=f"v1-legacy-asset-{number}", code=f"LEGACY-{number}",
                             name=f"Legacy asset {number}", asset_type="OTHER",
                             data_origin="LEGACY_TEST_DATA"))
            db.commit()
        migrate_db(engine)
    finally:
        engine.dispose()
    seed_simulation(str(db_path))
    script = Path(__file__).resolve().parents[1] / "scripts" / "publish_5zone_simulation_map.py"
    # The legacy publisher resolves data/app.db relative to its working directory.
    result = subprocess.run([sys.executable, str(script)], cwd=tmp_path,
                            capture_output=True, text=True, encoding="utf-8")
    assert result.returncode == 0, result.stdout + result.stderr
    return db_path


@pytest.fixture
def stub_meter_inference(monkeypatch):
    """Stub only model inference; these tests qualify auth and non-persistence."""
    from unittest.mock import Mock
    from backend.app import main
    from backend.app.inference import ReadingResult

    def read_decoded_image(image):
        assert image.ndim == 3 and image.size > 0
        return ReadingResult(status="success", reading="000300", meter_type="mechanical",
                             det_confidence=0.99, ocr_confidence=0.99, localization_imgsz=960)

    read = Mock(side_effect=read_decoded_image)
    monkeypatch.setattr(main.reader, "read", read)
    return read
