import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from .config import get_settings

settings = get_settings()

# Ensure SQLite parent directory exists
if settings.database_url.startswith("sqlite"):
    db_path_str = settings.database_url.replace("sqlite:///", "")
    if db_path_str and db_path_str != ":memory:":
        db_path = Path(db_path_str)
        db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)

# Enable WAL mode for SQLite
if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_db(db_engine=None) -> None:
    """Idempotent schema upgrade for existing SQLite databases."""
    target_engine = db_engine or engine
    if not str(target_engine.url).startswith("sqlite"):
        return

    with target_engine.connect() as conn:
        cursor = conn.connection.cursor()
        try:
            # 1. Ensure reading_rounds table exists and has is_legacy column
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='reading_rounds'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE reading_rounds (
                    id VARCHAR(36) NOT NULL,
                    batch_id VARCHAR(36) NOT NULL,
                    scheduled_at DATETIME NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                    is_legacy BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL,
                    closed_at DATETIME,
                    PRIMARY KEY (id),
                    CONSTRAINT uq_batch_scheduled_round UNIQUE (batch_id, scheduled_at),
                    FOREIGN KEY(batch_id) REFERENCES reading_batches (id) ON DELETE CASCADE
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_reading_rounds_batch_id ON reading_rounds (batch_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_reading_rounds_scheduled_at ON reading_rounds (scheduled_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_reading_rounds_status ON reading_rounds (status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_reading_rounds_is_legacy ON reading_rounds (is_legacy)")
            else:
                cursor.execute("PRAGMA table_info(reading_rounds)")
                rr_cols = [row[1] for row in cursor.fetchall()]
                if "is_legacy" not in rr_cols:
                    cursor.execute("ALTER TABLE reading_rounds ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT 0")
                    cursor.execute("CREATE INDEX IF NOT EXISTS ix_reading_rounds_is_legacy ON reading_rounds (is_legacy)")

            # 2. Check meter_readings table
            cursor.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='meter_readings'"
            )
            table_row = cursor.fetchone()
            if not table_row:
                conn.connection.commit()
                return

            table_sql = table_row[0]
            cursor.execute("PRAGMA table_info(meter_readings)")
            columns = [row[1] for row in cursor.fetchall()]

            needs_rebuild = ("reading_round_id" not in columns) or ("uq_meter_batch" in table_sql)

            if needs_rebuild:
                import uuid

                # Step A: Identify all batches with readings and create legacy rounds if missing
                cursor.execute("SELECT DISTINCT batch_id FROM meter_readings")
                batch_ids = [r[0] for r in cursor.fetchall() if r[0]]
                legacy_round_map = {}

                for b_id in batch_ids:
                    cursor.execute("SELECT id FROM reading_rounds WHERE batch_id = ? ORDER BY scheduled_at ASC LIMIT 1", (b_id,))
                    round_row = cursor.fetchone()
                    if round_row:
                        legacy_round_map[b_id] = round_row[0]
                    else:
                        cursor.execute("SELECT MIN(server_timestamp) FROM meter_readings WHERE batch_id = ?", (b_id,))
                        earliest_ts_row = cursor.fetchone()
                        earliest_ts = earliest_ts_row[0] if (earliest_ts_row and earliest_ts_row[0]) else None
                        if not earliest_ts:
                            cursor.execute("SELECT created_at FROM reading_batches WHERE id = ?", (b_id,))
                            batch_row = cursor.fetchone()
                            earliest_ts = batch_row[0] if (batch_row and batch_row[0]) else "2026-08-27 00:00:00"

                        legacy_round_id = str(uuid.uuid4())
                        cursor.execute(
                            "INSERT INTO reading_rounds (id, batch_id, scheduled_at, status, is_legacy, created_at, closed_at) VALUES (?, ?, ?, 'OPEN', 1, ?, NULL)",
                            (legacy_round_id, b_id, earliest_ts, earliest_ts),
                        )
                        legacy_round_map[b_id] = legacy_round_id

                # Step B: Create meter_readings_new
                cursor.execute("""
                CREATE TABLE meter_readings_new (
                    id VARCHAR(36) NOT NULL,
                    meter_id VARCHAR(36) NOT NULL,
                    batch_id VARCHAR(36) NOT NULL,
                    reading_round_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    reading VARCHAR(50),
                    ocr_reading VARCHAR(50),
                    confirmation_source VARCHAR(50) DEFAULT 'OCR_CONFIRMED',
                    status VARCHAR(20) NOT NULL,
                    meter_type VARCHAR(50),
                    det_confidence FLOAT,
                    ocr_confidence FLOAT,
                    localization_imgsz INTEGER,
                    pipeline_version VARCHAR(100),
                    server_timestamp DATETIME NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    CONSTRAINT uq_meter_round UNIQUE (meter_id, reading_round_id),
                    FOREIGN KEY(meter_id) REFERENCES meters (id) ON DELETE CASCADE,
                    FOREIGN KEY(batch_id) REFERENCES reading_batches (id) ON DELETE CASCADE,
                    FOREIGN KEY(reading_round_id) REFERENCES reading_rounds (id) ON DELETE CASCADE,
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """)

                # Step C: Fetch existing rows and insert into meter_readings_new
                has_ocr_col = "ocr_reading" in columns
                has_conf_col = "confirmation_source" in columns
                has_round_col = "reading_round_id" in columns

                cursor.execute("SELECT * FROM meter_readings")
                old_rows = cursor.fetchall()
                col_indices = {col: idx for idx, col in enumerate(columns)}

                for row in old_rows:
                    row_id = row[col_indices["id"]]
                    meter_id = row[col_indices["meter_id"]]
                    batch_id = row[col_indices["batch_id"]]
                    user_id = row[col_indices["user_id"]]
                    reading = row[col_indices["reading"]]
                    status_val = row[col_indices["status"]]
                    meter_type = row[col_indices["meter_type"]] if "meter_type" in col_indices else None
                    det_conf = row[col_indices["det_confidence"]] if "det_confidence" in col_indices else None
                    ocr_conf = row[col_indices["ocr_confidence"]] if "ocr_confidence" in col_indices else None
                    loc_imgsz = row[col_indices["localization_imgsz"]] if "localization_imgsz" in col_indices else None
                    pipe_ver = row[col_indices["pipeline_version"]] if "pipeline_version" in col_indices else None
                    server_ts = row[col_indices["server_timestamp"]]
                    created_at = row[col_indices["created_at"]]
                    updated_at = row[col_indices["updated_at"]]

                    ocr_reading = row[col_indices["ocr_reading"]] if has_ocr_col else reading
                    if not ocr_reading and reading:
                        ocr_reading = reading
                    conf_source = row[col_indices["confirmation_source"]] if has_conf_col else "OCR_CONFIRMED"
                    if not conf_source:
                        conf_source = "OCR_CONFIRMED"

                    if has_round_col and row[col_indices["reading_round_id"]]:
                        r_round_id = row[col_indices["reading_round_id"]]
                    else:
                        r_round_id = legacy_round_map.get(batch_id)

                    cursor.execute("""
                    INSERT INTO meter_readings_new (
                        id, meter_id, batch_id, reading_round_id, user_id,
                        reading, ocr_reading, confirmation_source, status,
                        meter_type, det_confidence, ocr_confidence, localization_imgsz,
                        pipeline_version, server_timestamp, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row_id, meter_id, batch_id, r_round_id, user_id,
                        reading, ocr_reading, conf_source, status_val,
                        meter_type, det_conf, ocr_conf, loc_imgsz,
                        pipe_ver, server_ts, created_at, updated_at
                    ))

                # Step D: Swap tables
                cursor.execute("DROP TABLE meter_readings")
                cursor.execute("ALTER TABLE meter_readings_new RENAME TO meter_readings")

                # Step E: Recreate indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_readings_meter_id ON meter_readings (meter_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_readings_batch_id ON meter_readings (batch_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_readings_reading_round_id ON meter_readings (reading_round_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_readings_user_id ON meter_readings (user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_reading_round_meter ON meter_readings (reading_round_id, meter_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_reading_batch_meter ON meter_readings (batch_id, meter_id)")

            # 3. Ensure meter_training_samples table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='meter_training_samples'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE meter_training_samples (
                    id VARCHAR(36) NOT NULL,
                    meter_id VARCHAR(36),
                    reading_round_id VARCHAR(36),
                    created_by_user_id VARCHAR(36),
                    sample_type VARCHAR(50) NOT NULL,
                    corrected_reading VARCHAR(50) NOT NULL,
                    ocr_reading VARCHAR(50),
                    roi_bbox VARCHAR(100),
                    det_confidence FLOAT,
                    ocr_confidence FLOAT,
                    localization_imgsz INTEGER,
                    image_filename VARCHAR(255) NOT NULL,
                    image_sha256 VARCHAR(64) NOT NULL,
                    annotation_status VARCHAR(50) NOT NULL,
                    created_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(meter_id) REFERENCES meters (id) ON DELETE SET NULL,
                    FOREIGN KEY(reading_round_id) REFERENCES reading_rounds (id) ON DELETE SET NULL,
                    FOREIGN KEY(created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_meter_id ON meter_training_samples (meter_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_round_id ON meter_training_samples (reading_round_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_user_id ON meter_training_samples (created_by_user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_type ON meter_training_samples (sample_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_status ON meter_training_samples (annotation_status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_training_samples_type_status ON meter_training_samples (sample_type, annotation_status)")

            # 4. Ensure admin_audit_logs table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_audit_logs'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE admin_audit_logs (
                    id VARCHAR(36) NOT NULL,
                    actor_user_id VARCHAR(36),
                    action VARCHAR(50) NOT NULL,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_id VARCHAR(36),
                    before_json TEXT,
                    after_json TEXT,
                    created_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(actor_user_id) REFERENCES users (id) ON DELETE SET NULL
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_actor_user_id ON admin_audit_logs (actor_user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_action ON admin_audit_logs (action)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_resource_type ON admin_audit_logs (resource_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_resource_id ON admin_audit_logs (resource_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_created_at ON admin_audit_logs (created_at)")

            # 5. Ensure meter_reading_evidence table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='meter_reading_evidence'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE meter_reading_evidence (
                    id VARCHAR(36) NOT NULL,
                    meter_reading_id VARCHAR(36) NOT NULL UNIQUE,
                    image_filename VARCHAR(255) NOT NULL UNIQUE,
                    image_sha256 VARCHAR(64) NOT NULL,
                    mime_type VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
                    width INTEGER,
                    height INTEGER,
                    roi_bbox VARCHAR(100),
                    captured_at DATETIME,
                    created_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(meter_reading_id) REFERENCES meter_readings (id) ON DELETE CASCADE
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_reading_evidence_meter_reading_id ON meter_reading_evidence (meter_reading_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meter_reading_evidence_image_filename ON meter_reading_evidence (image_filename)")

            # 6. Ensure work_schedules table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='work_schedules'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE work_schedules (
                    id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    work_date VARCHAR(10) NOT NULL,
                    shift_code VARCHAR(20) NOT NULL DEFAULT 'OFF',
                    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
                    notes TEXT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
                    CONSTRAINT uq_user_work_date UNIQUE (user_id, work_date)
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_work_schedules_user_id ON work_schedules (user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_work_schedules_work_date ON work_schedules (work_date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_work_schedule_date_user ON work_schedules (work_date, user_id)")

            # 7. Ensure leave_requests table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='leave_requests'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE leave_requests (
                    id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    leave_type VARCHAR(50) NOT NULL,
                    start_date VARCHAR(10) NOT NULL,
                    end_date VARCHAR(10) NOT NULL,
                    shift_code VARCHAR(20),
                    reason TEXT NOT NULL,
                    substitute_user_id VARCHAR(36),
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    reviewer_id VARCHAR(36),
                    review_note TEXT,
                    reviewed_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY(substitute_user_id) REFERENCES users (id) ON DELETE SET NULL,
                    FOREIGN KEY(reviewer_id) REFERENCES users (id) ON DELETE SET NULL
                )
                """)
            # 8. Ensure operational_zones table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='operational_zones'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE operational_zones (
                    id VARCHAR(36) NOT NULL,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(200) NOT NULL,
                    description TEXT,
                    map_polygon TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id)
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_operational_zones_code ON operational_zones (code)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_operational_zones_is_active ON operational_zones (is_active)")

            # 9. Ensure meters table has zone_id, map_x, map_y
            cursor.execute("PRAGMA table_info(meters)")
            m_cols = [row[1] for row in cursor.fetchall()]
            if "zone_id" not in m_cols:
                cursor.execute("ALTER TABLE meters ADD COLUMN zone_id VARCHAR(36) REFERENCES operational_zones(id) ON DELETE SET NULL")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_meters_zone_id ON meters (zone_id)")
            if "map_x" not in m_cols:
                cursor.execute("ALTER TABLE meters ADD COLUMN map_x REAL")
            if "map_y" not in m_cols:
                cursor.execute("ALTER TABLE meters ADD COLUMN map_y REAL")

            # 10. Ensure zone_assignments table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='zone_assignments'"
            )
            if not cursor.fetchone():
                cursor.execute("""
                CREATE TABLE zone_assignments (
                    id VARCHAR(36) NOT NULL,
                    zone_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    assignment_role VARCHAR(50) NOT NULL DEFAULT 'PRIMARY',
                    effective_from DATETIME NOT NULL,
                    effective_to DATETIME,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(zone_id) REFERENCES operational_zones (id) ON DELETE CASCADE,
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_zone_assignments_zone_id ON zone_assignments (zone_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_zone_assignments_user_id ON zone_assignments (user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_zone_assignments_is_active ON zone_assignments (is_active)")

            # 11. Seed operational zones if empty
            cursor.execute("SELECT count(*) FROM operational_zones")
            if cursor.fetchone()[0] == 0:
                import json
                from datetime import datetime, timezone

                now_utc = datetime.now(timezone.utc).isoformat()
                zones_data = [
                    (
                        "zone-berth",
                        "ZONE-BERTH",
                        "Khu vực Cầu cảng (Berths 1 - 3)",
                        "Tuyến bến cầu tàu tiếp nhận tàu hàng tổng hợp và container dọc sông Sài Gòn.",
                        json.dumps([
                            {"x": 0.62, "y": 0.10},
                            {"x": 0.82, "y": 0.10},
                            {"x": 0.84, "y": 0.92},
                            {"x": 0.64, "y": 0.92},
                            {"x": 0.62, "y": 0.58},
                        ]),
                        1, now_utc, now_utc,
                    ),
                    (
                        "zone-container",
                        "ZONE-CONTAINER",
                        "Khu vực Bãi Container (CY)",
                        "Bãi tập kết, bốc dỡ container tiền phương và hậu phương phục vụ tàu cập cảng.",
                        json.dumps([
                            {"x": 0.35, "y": 0.32},
                            {"x": 0.60, "y": 0.32},
                            {"x": 0.61, "y": 0.75},
                            {"x": 0.34, "y": 0.75},
                        ]),
                        1, now_utc, now_utc,
                    ),
                    (
                        "zone-warehouse",
                        "ZONE-WAREHOUSE",
                        "Khu vực Kho hàng Tổng hợp (B, C, D)",
                        "Hệ thống kho hàng tổng hợp kín và bãi đệm bốc xếp hàng rời, bao kiện.",
                        json.dumps([
                            {"x": 0.10, "y": 0.12},
                            {"x": 0.32, "y": 0.12},
                            {"x": 0.32, "y": 0.60},
                            {"x": 0.08, "y": 0.60},
                        ]),
                        1, now_utc, now_utc,
                    ),
                    (
                        "zone-technical",
                        "ZONE-TECHNICAL",
                        "Khu Kỹ thuật & Trạm Phụ trợ Điện",
                        "Trạm biến áp trung/hạ thế, xưởng sửa chữa cơ giới và trung tâm kỹ thuật năng lượng.",
                        json.dumps([
                            {"x": 0.08, "y": 0.64},
                            {"x": 0.60, "y": 0.78},
                            {"x": 0.60, "y": 0.94},
                            {"x": 0.08, "y": 0.94},
                        ]),
                        1, now_utc, now_utc,
                    ),
                ]
                cursor.executemany("""
                    INSERT INTO operational_zones (id, code, name, description, map_polygon, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, zones_data)

            # 12. Update meter coordinates and zone references if not set
            meter_coords = {
                'CT-001': ('zone-technical', 0.18, 0.74),
                'CT-002': ('zone-warehouse', 0.20, 0.24),
                'CT-003': ('zone-berth', 0.72, 0.24),
                'CT-004': ('zone-berth', 0.73, 0.50),
                'CT-005': ('zone-warehouse', 0.21, 0.38),
                'CT-006': ('zone-warehouse', 0.22, 0.52),
                'CT-007': ('zone-technical', 0.36, 0.84),
                'CT-008': ('zone-berth', 0.74, 0.78),
                'CT-009': ('zone-technical', 0.40, 0.20),
                'CT-010': ('zone-technical', 0.52, 0.20),
                'CT-011': ('zone-container', 0.44, 0.46),
                'CT-012': ('zone-container', 0.49, 0.62),
            }
            for code, (zid, mx, my) in meter_coords.items():
                cursor.execute("""
                    UPDATE meters
                    SET zone_id = ?, map_x = ?, map_y = ?
                    WHERE meter_code = ? AND (zone_id IS NULL OR map_x IS NULL)
                """, (zid, mx, my, code))

            # 13. Seed initial primary zone assignments if empty
            cursor.execute("SELECT count(*) FROM zone_assignments")
            if cursor.fetchone()[0] == 0:
                from datetime import datetime, timezone
                import uuid
                now_utc = datetime.now(timezone.utc).isoformat()
                cursor.execute("SELECT id FROM users WHERE role != 'ADMIN' AND is_active = 1 ORDER BY employee_code ASC")
                user_rows = cursor.fetchall()
                if not user_rows:
                    cursor.execute("SELECT id FROM users ORDER BY employee_code ASC")
                    user_rows = cursor.fetchall()

                zone_ids = ["zone-berth", "zone-container", "zone-warehouse", "zone-technical"]
                for i, zid in enumerate(zone_ids):
                    uid = user_rows[i % len(user_rows)][0] if user_rows else None
                    if uid:
                        cursor.execute("""
                            INSERT INTO zone_assignments (id, zone_id, user_id, assignment_role, effective_from, is_active, created_at, updated_at)
                            VALUES (?, ?, ?, 'PRIMARY', ?, 1, ?, ?)
                        """, (str(uuid.uuid4()), zid, uid, now_utc, now_utc, now_utc))

            conn.connection.commit()
        finally:
            cursor.close()


def init_db(db_engine=None) -> None:
    # Ensure database tables exist
    target_engine = db_engine or engine
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=target_engine)
    migrate_db(target_engine)


