import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from .db import Base


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="EMPLOYEE")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
    attendance_events = relationship("AttendanceEvent", back_populates="user", cascade="all, delete-orphan")
    meter_readings = relationship("MeterReading", back_populates="user", cascade="all, delete-orphan")


class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(100), nullable=True)

    user = relationship("User", back_populates="sessions")


class AttendanceEvent(Base):
    __tablename__ = "attendance_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD in Asia/Ho_Chi_Minh
    event_type = Column(String(20), nullable=False)  # "CHECK_IN" | "CHECK_OUT"
    server_timestamp = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    photo_key = Column(String(255), nullable=False)
    photo_sha256 = Column(String(64), nullable=False)
    mime_type = Column(String(50), nullable=False, default="image/jpeg")
    photo_size = Column(Integer, nullable=False)
    capture_source = Column(String(50), nullable=False, default="live_camera")
    status = Column(String(50), nullable=False, default="VALID")
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    user = relationship("User", back_populates="attendance_events")

    __table_args__ = (
        UniqueConstraint("user_id", "business_date", "event_type", name="uq_user_date_event"),
        Index("ix_user_business_date", "user_id", "business_date"),
    )


class OperationalZone(Base):
    __tablename__ = "operational_zones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    map_polygon = Column(Text, nullable=False)  # JSON string of normalized points
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    meters = relationship("Meter", back_populates="zone")
    assignments = relationship("ZoneAssignment", back_populates="zone", cascade="all, delete-orphan")


class ZoneAssignment(Base):
    __tablename__ = "zone_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String(36), ForeignKey("operational_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_role = Column(String(50), nullable=False, default="PRIMARY")
    effective_from = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    zone = relationship("OperationalZone", back_populates="assignments")
    user = relationship("User")


class MapVersion(Base):
    __tablename__ = "map_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    map_id = Column(String(50), nullable=False, default="tan-thuan", index=True)
    map_version = Column(String(50), nullable=False, index=True)
    coordinate_system = Column(String(100), nullable=False, default="tan-thuan-canonical-image-pixel-space-v1")
    canonical_width = Column(Integer, nullable=False, default=1915)
    canonical_height = Column(Integer, nullable=False, default=821)
    source_asset = Column(String(255), nullable=False, default="tan-thuan-canonical-base.png")
    geometry_schema_version = Column(String(20), nullable=True, default="1.0")
    status = Column(String(20), nullable=False, default="DRAFT", index=True)  # "DRAFT" | "PUBLISHED" | "ARCHIVED"
    revision = Column(Integer, nullable=False, default=1)
    parent_version_id = Column(String(36), ForeignKey("map_versions.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)
    published_at = Column(DateTime(timezone=True), nullable=True)

    zones = relationship("MapVersionZone", back_populates="version", cascade="all, delete-orphan", order_by="MapVersionZone.display_index")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    published_by = relationship("User", foreign_keys=[published_by_user_id])
    parent_version = relationship("MapVersion", remote_side=[id])


class MapVersionZone(Base):
    __tablename__ = "map_version_zones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    map_version_id = Column(String(36), ForeignKey("map_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(50), nullable=False, index=True)
    business_zone_id = Column(String(50), nullable=False)
    display_index = Column(Integer, nullable=False, default=1)
    display_label = Column(String(100), nullable=False)
    business_name = Column(String(200), nullable=False)
    presentation_color = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=False, default="container")
    polygon_canonical = Column(Text, nullable=False)
    label_anchor_canonical = Column(Text, nullable=False)
    operator_anchor_canonical = Column(Text, nullable=False)
    landmarks_json = Column(Text, nullable=True)
    revision = Column(Integer, nullable=False, default=1)

    version = relationship("MapVersion", back_populates="zones")

    __table_args__ = (
        UniqueConstraint("map_version_id", "zone_id", name="uq_map_version_zone"),
    )


class Meter(Base):
    __tablename__ = "meters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    meter_type = Column(String(50), nullable=False, default="UNKNOWN")  # "LCD" | "MECHANICAL" | "UNKNOWN"
    zone_id = Column(String(36), ForeignKey("operational_zones.id", ondelete="SET NULL"), nullable=True, index=True)
    presentation_zone_id = Column(String(50), nullable=True, index=True)
    map_x = Column(Float, nullable=True)
    map_y = Column(Float, nullable=True)
    route_status = Column(String(50), nullable=False, default="VALID", index=True)  # "VALID" | "REVIEW_REQUIRED" | "INVALID"
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    lifecycle_status = Column(String(20), nullable=False, default="ACTIVE", index=True)  # "ACTIVE" | "INACTIVE" | "RETIRED"
    retired_at = Column(DateTime(timezone=True), nullable=True)
    retired_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    retirement_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    readings = relationship("MeterReading", back_populates="meter", cascade="all, delete-orphan")
    zone = relationship("OperationalZone", back_populates="meters")
    retired_by_user = relationship("User", foreign_keys=[retired_by])


class ReadingBatch(Base):
    __tablename__ = "reading_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    period_key = Column(String(20), index=True, nullable=False)  # e.g. "2026-08"
    status = Column(String(20), index=True, nullable=False, default="OPEN")  # "OPEN" | "CLOSED"
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    rounds = relationship("ReadingRound", back_populates="batch", cascade="all, delete-orphan")
    readings = relationship("MeterReading", back_populates="batch", cascade="all, delete-orphan")


class ReadingRound(Base):
    __tablename__ = "reading_rounds"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("reading_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), index=True, nullable=False, default="OPEN")  # "OPEN" | "CLOSED"
    is_legacy = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    batch = relationship("ReadingBatch", back_populates="rounds")
    readings = relationship("MeterReading", back_populates="round", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("batch_id", "scheduled_at", name="uq_batch_scheduled_round"),
    )


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_id = Column(String(36), ForeignKey("meters.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("reading_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_round_id = Column(String(36), ForeignKey("reading_rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reading = Column(String(50), nullable=True)
    ocr_reading = Column(String(50), nullable=True)
    confirmation_source = Column(String(50), nullable=False, default="OCR_CONFIRMED")  # "OCR_CONFIRMED" | "USER_CORRECTED"
    status = Column(String(20), nullable=False)  # "REVIEW" | "CONFIRMED"
    meter_type = Column(String(50), nullable=True)  # "lcd" | "mechanical" | null
    det_confidence = Column(Float, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    localization_imgsz = Column(Integer, nullable=True)
    pipeline_version = Column(String(100), nullable=True)
    server_timestamp = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    meter = relationship("Meter", back_populates="readings")
    batch = relationship("ReadingBatch", back_populates="readings")
    round = relationship("ReadingRound", back_populates="readings")
    user = relationship("User", back_populates="meter_readings")
    evidence = relationship("MeterReadingEvidence", back_populates="reading", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("meter_id", "reading_round_id", name="uq_meter_round"),
        Index("ix_meter_reading_round_meter", "reading_round_id", "meter_id"),
        Index("ix_meter_reading_batch_meter", "batch_id", "meter_id"),
    )


class MeterReadingEvidence(Base):
    __tablename__ = "meter_reading_evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_reading_id = Column(String(36), ForeignKey("meter_readings.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    image_filename = Column(String(255), nullable=False, unique=True)
    image_sha256 = Column(String(64), nullable=False)
    mime_type = Column(String(50), nullable=False, default="image/jpeg")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    roi_bbox = Column(String(100), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    reading = relationship("MeterReading", back_populates="evidence")


class MeterTrainingSample(Base):
    __tablename__ = "meter_training_samples"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_id = Column(String(36), ForeignKey("meters.id", ondelete="SET NULL"), nullable=True, index=True)
    reading_round_id = Column(String(36), ForeignKey("reading_rounds.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    sample_type = Column(String(50), nullable=False, index=True)  # "OCR_CORRECTION" | "LOCALIZATION_FAILURE" | "MANUAL_ENTRY"
    corrected_reading = Column(String(50), nullable=False)
    ocr_reading = Column(String(50), nullable=True)
    roi_bbox = Column(String(100), nullable=True)  # Serialized normalized bounding box [x1, y1, x2, y2]
    det_confidence = Column(Float, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    localization_imgsz = Column(Integer, nullable=True)
    image_filename = Column(String(255), nullable=False)  # Private UUID filename in data/meter_training_samples/
    image_sha256 = Column(String(64), nullable=False)
    annotation_status = Column(String(50), nullable=False, index=True)  # "READY_OCR" | "NEEDS_BBOX"
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    meter = relationship("Meter")
    round = relationship("ReadingRound")
    created_by = relationship("User")

    __table_args__ = (
        Index("ix_training_samples_type_status", "sample_type", "annotation_status"),
    )


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(36), nullable=True, index=True)
    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, index=True)

    actor = relationship("User")


class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    shift_code = Column(String(20), nullable=False, default="OFF")  # "CA1", "CA2", "CA3", "HC", "OFF", "LEAVE"
    status = Column(String(20), nullable=False, default="SCHEDULED")  # "SCHEDULED", "COMPLETED", "ABSENT", "ON_LEAVE"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("user_id", "work_date", name="uq_user_work_date"),
        Index("ix_work_schedule_date_user", "work_date", "user_id"),
    )


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)  # "ANNUAL", "COMPENSATORY", "PERSONAL_PAID", "PERSONAL_UNPAID", "SICK"
    start_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    shift_code = Column(String(20), nullable=True)  # "ALL", "CA1", "CA2", "CA3", "HC"
    reason = Column(Text, nullable=False)
    substitute_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING", index=True)  # "PENDING", "APPROVED", "REJECTED", "CANCELLED"
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now, onupdate=get_utc_now)

    user = relationship("User", foreign_keys=[user_id])
    substitute_user = relationship("User", foreign_keys=[substitute_user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

    __table_args__ = (
        Index("ix_leave_requests_user_status", "user_id", "status"),
        Index("ix_leave_requests_dates", "start_date", "end_date"),
    )
