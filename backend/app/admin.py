import json
from pathlib import Path
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AdminAuditLog, MapVersion, MapVersionZone, Meter, MeterReading, MeterReadingEvidence, ReadingBatch, ReadingRound, User
from .schemas import (
    AdminAuditLogItem,
    AdminAuditLogListResponse,
    AdminDashboardExceptionItem,
    AdminDashboardKpis,
    AdminDashboardLocationProgress,
    AdminDashboardProvenanceStats,
    AdminDashboardResponse,
    AdminDashboardRoundProgress,
    AdminInspectionBBox,
    AdminInspectionMeter,
    AdminInspectionOperator,
    AdminInspectionRound,
    AdminMeterChangeZoneRequest,
    AdminMeterCreateRequest,
    AdminMeterItem,
    AdminMeterLatestReadingResponse,
    AdminMeterListResponse,
    AdminMeterReadingEvidenceInfo,
    AdminMeterReadingInspectionResponse,
    AdminMeterRelocateRequest,
    AdminMeterUpdateRequest,
    AdminScheduleCreateRequest,
    AdminScheduleCreateResponse,
    AdminScheduleDeleteResponse,
    AdminSchedulePreviewRequest,
    AdminSchedulePreviewResponse,
    AdminSchedulePreviewRound,
    BatchProgress,
    ReadingBatchCurrentResponse,
    ReadingRoundOut,
)
from .inference import compute_recognition_crop_geometry
from .geometry_utils import is_point_in_polygon

settings = get_settings()

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))


def get_local_time_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%H:%M:%S - %d/%m/%Y")


def get_round_local_time_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%H:%M - %d/%m/%Y")


def get_round_time_only_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%H:%M")


def format_date_vn(date_str: str) -> str:
    try:
        parts = date_str.split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return date_str


def get_today_local_str() -> str:
    now_utc = datetime.now(timezone.utc)
    return now_utc.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")


def log_admin_action(
    db: Session,
    actor_user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    before_json: Optional[dict] = None,
    after_json: Optional[dict] = None,
) -> AdminAuditLog:
    log_entry = AdminAuditLog(
        id=str(uuid.uuid4()),
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        before_json=json.dumps(before_json, ensure_ascii=False) if before_json else None,
        after_json=json.dumps(after_json, ensure_ascii=False) if after_json else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    return log_entry


# ==============================================================================
# ADMIN METER MANAGEMENT
# ==============================================================================
def get_admin_meters(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    meter_type: Optional[str] = None,
) -> AdminMeterListResponse:
    query = db.query(Meter)

    if status_filter:
        sf = status_filter.strip().lower()
        if sf == "active":
            query = query.filter(Meter.is_active == True)
        elif sf == "inactive":
            query = query.filter(Meter.is_active == False)

    if meter_type and meter_type.strip() and meter_type.strip().upper() != "ALL":
        query = query.filter(Meter.meter_type.ilike(meter_type.strip()))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Meter.meter_code.ilike(term))
            | (Meter.name.ilike(term))
            | (Meter.location.ilike(term))
        )

    meters = query.order_by(Meter.meter_code.asc()).all()

    # Pre-fetch reading counts and latest readings for all meters in single queries
    readings = (
        db.query(MeterReading)
        .order_by(MeterReading.server_timestamp.desc())
        .all()
    )

    reading_counts: dict[str, int] = {}
    latest_readings: dict[str, MeterReading] = {}

    for r in readings:
        reading_counts[r.meter_id] = reading_counts.get(r.meter_id, 0) + 1
        if r.meter_id not in latest_readings and r.status == "CONFIRMED" and r.reading:
            latest_readings[r.meter_id] = r

    items: list[AdminMeterItem] = []
    active_cnt = 0
    inactive_cnt = 0

    all_db_meters = db.query(Meter).all()
    for m in all_db_meters:
        if m.is_active:
            active_cnt += 1
        else:
            inactive_cnt += 1

    for m in meters:
        count = reading_counts.get(m.id, 0)
        latest_r = latest_readings.get(m.id)

        items.append(
            AdminMeterItem(
                id=m.id,
                meter_code=m.meter_code,
                name=m.name,
                location=m.location,
                meter_type=m.meter_type,
                is_active=m.is_active,
                zone_id=m.zone_id,
                presentation_zone_id=m.presentation_zone_id,
                map_x=m.map_x,
                map_y=m.map_y,
                route_status=m.route_status or "VALID",
                created_at=m.created_at.isoformat() if m.created_at else None,
                updated_at=m.updated_at.isoformat() if m.updated_at else None,
                has_readings=(count > 0),
                total_readings=count,
                latest_reading=latest_r.reading if latest_r else None,
                latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r else None,
            )
        )

    return AdminMeterListResponse(
        total=len(items),
        active_count=active_cnt,
        inactive_count=inactive_cnt,
        meters=items,
    )


def create_admin_meter(
    db: Session,
    actor: User,
    payload: AdminMeterCreateRequest,
) -> AdminMeterItem:
    clean_code = payload.meter_code.strip()
    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã công tơ không được để trống.",
        )

    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên công tơ không được để trống.",
        )

    clean_type = payload.meter_type.strip().upper() if payload.meter_type else "UNKNOWN"
    if clean_type not in ("LCD", "MECHANICAL", "UNKNOWN"):
        clean_type = "UNKNOWN"

    clean_loc = payload.location.strip() if payload.location and payload.location.strip() else None

    # Check uniqueness
    existing = db.query(Meter).filter(Meter.meter_code == clean_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mã công tơ đã tồn tại.",
        )

    # Validate coordinate range if provided
    map_x = payload.map_x
    map_y = payload.map_y
    if map_x is not None and map_x > 1.0:
        map_x = map_x / 1915.0  # normalize if pixel provided
    if map_y is not None and map_y > 1.0:
        map_y = map_y / 821.0

    if map_x is not None:
        map_x = max(0.0, min(1.0, round(float(map_x), 4)))
    if map_y is not None:
        map_y = max(0.0, min(1.0, round(float(map_y), 4)))

    pres_zone_id = payload.presentation_zone_id.strip() if payload.presentation_zone_id else None

    # Validate zone containment if coordinate provided
    if pres_zone_id and map_x is not None and map_y is not None:
        pub_map = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at.desc()).first()
        if pub_map:
            target_zone = next((z for z in pub_map.zones if z.zone_id == pres_zone_id), None)
            if target_zone:
                poly = json.loads(target_zone.polygon_canonical) if isinstance(target_zone.polygon_canonical, str) else target_zone.polygon_canonical
                cx = map_x * pub_map.canonical_width
                cy = map_y * pub_map.canonical_height
                if not is_point_in_polygon({"x": cx, "y": cy}, poly):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Tọa độ chỉ định nằm ngoài ranh giới phân khu {target_zone.display_label}.",
                    )

    new_meter = Meter(
        id=str(uuid.uuid4()),
        meter_code=clean_code,
        name=clean_name,
        location=clean_loc,
        meter_type=clean_type,
        zone_id=payload.zone_id,
        presentation_zone_id=pres_zone_id,
        map_x=map_x,
        map_y=map_y,
        route_status="REVIEW_REQUIRED" if (map_x is not None and map_y is not None) else "VALID",
        is_active=True,
    )
    db.add(new_meter)
    db.flush()

    # Log audit
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="METER_CREATED",
        resource_type="METER",
        resource_id=new_meter.id,
        after_json={
            "meter_code": new_meter.meter_code,
            "name": new_meter.name,
            "location": new_meter.location,
            "meter_type": new_meter.meter_type,
            "zone_id": new_meter.zone_id,
            "presentation_zone_id": new_meter.presentation_zone_id,
            "map_x": new_meter.map_x,
            "map_y": new_meter.map_y,
            "is_active": new_meter.is_active,
        },
    )
    db.commit()
    db.refresh(new_meter)

    return AdminMeterItem(
        id=new_meter.id,
        meter_code=new_meter.meter_code,
        name=new_meter.name,
        location=new_meter.location,
        meter_type=new_meter.meter_type,
        is_active=new_meter.is_active,
        zone_id=new_meter.zone_id,
        presentation_zone_id=new_meter.presentation_zone_id,
        map_x=new_meter.map_x,
        map_y=new_meter.map_y,
        route_status=new_meter.route_status,
        created_at=new_meter.created_at.isoformat() if new_meter.created_at else None,
        updated_at=new_meter.updated_at.isoformat() if new_meter.updated_at else None,
        has_readings=False,
        total_readings=0,
        latest_reading=None,
        latest_reading_time=None,
    )


def update_admin_meter(
    db: Session,
    actor: User,
    meter_id: str,
    payload: AdminMeterUpdateRequest,
) -> AdminMeterItem:
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    before_state = {
        "meter_code": meter.meter_code,
        "name": meter.name,
        "location": meter.location,
        "meter_type": meter.meter_type,
        "zone_id": meter.zone_id,
        "presentation_zone_id": meter.presentation_zone_id,
        "map_x": meter.map_x,
        "map_y": meter.map_y,
        "is_active": meter.is_active,
    }

    # Check if meter has readings
    has_readings = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).first() is not None

    if payload.meter_code is not None:
        new_code = payload.meter_code.strip()
        if not new_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã công tơ không được để trống.",
            )
        if new_code != meter.meter_code:
            if has_readings:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không thể thay đổi mã công tơ đã có lịch sử ghi nhận chỉ số.",
                )
            dup = db.query(Meter).filter(Meter.meter_code == new_code, Meter.id != meter.id).first()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Mã công tơ đã tồn tại.",
                )
            meter.meter_code = new_code

    if payload.name is not None:
        new_name = payload.name.strip()
        if not new_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên công tơ không được để trống.",
            )
        meter.name = new_name

    if payload.location is not None:
        meter.location = payload.location.strip() if payload.location.strip() else None

    if payload.meter_type is not None:
        mt = payload.meter_type.strip().upper()
        if mt in ("LCD", "MECHANICAL", "UNKNOWN"):
            meter.meter_type = mt

    if payload.zone_id is not None:
        meter.zone_id = payload.zone_id

    if payload.presentation_zone_id is not None:
        meter.presentation_zone_id = payload.presentation_zone_id

    coords_changed = False
    if payload.map_x is not None:
        val_x = float(payload.map_x)
        if val_x > 1.0:
            val_x = val_x / 1915.0
        val_x = max(0.0, min(1.0, round(val_x, 4)))
        if meter.map_x != val_x:
            meter.map_x = val_x
            coords_changed = True

    if payload.map_y is not None:
        val_y = float(payload.map_y)
        if val_y > 1.0:
            val_y = val_y / 821.0
        val_y = max(0.0, min(1.0, round(val_y, 4)))
        if meter.map_y != val_y:
            meter.map_y = val_y
            coords_changed = True

    if coords_changed:
        meter.route_status = "REVIEW_REQUIRED"

    meter.updated_at = datetime.now(timezone.utc)

    after_state = {
        "meter_code": meter.meter_code,
        "name": meter.name,
        "location": meter.location,
        "meter_type": meter.meter_type,
        "zone_id": meter.zone_id,
        "presentation_zone_id": meter.presentation_zone_id,
        "map_x": meter.map_x,
        "map_y": meter.map_y,
        "is_active": meter.is_active,
    }

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="METER_UPDATED",
        resource_type="METER",
        resource_id=meter.id,
        before_json=before_state,
        after_json=after_state,
    )
    db.commit()
    db.refresh(meter)

    reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
    latest_r = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter.id, MeterReading.status == "CONFIRMED", MeterReading.reading.isnot(None))
        .order_by(MeterReading.server_timestamp.desc())
        .first()
    )

    return AdminMeterItem(
        id=meter.id,
        meter_code=meter.meter_code,
        name=meter.name,
        location=meter.location,
        meter_type=meter.meter_type,
        is_active=meter.is_active,
        zone_id=meter.zone_id,
        presentation_zone_id=meter.presentation_zone_id,
        map_x=meter.map_x,
        map_y=meter.map_y,
        route_status=meter.route_status or "VALID",
        created_at=meter.created_at.isoformat() if meter.created_at else None,
        updated_at=meter.updated_at.isoformat() if meter.updated_at else None,
        has_readings=(reading_count > 0),
        total_readings=reading_count,
        latest_reading=latest_r.reading if latest_r else None,
        latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r else None,
    )


def relocate_admin_meter(
    db: Session,
    actor: User,
    meter_id: str,
    payload: AdminMeterRelocateRequest,
) -> AdminMeterItem:
    """
    Explicit spatial relocation of a meter:
    1. Validates coordinate bounds.
    2. Validates point inside assigned presentation zone in active map.
    3. Persists canonical/normalized coordinate.
    4. Flags route_status = 'REVIEW_REQUIRED'.
    5. Writes METER_RELOCATED audit event.
    """
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    raw_x = payload.map_x
    raw_y = payload.map_y

    # Support canonical pixel or normalized input
    if raw_x > 1.0:
        norm_x = raw_x / 1915.0
    else:
        norm_x = raw_x

    if raw_y > 1.0:
        norm_y = raw_y / 821.0
    else:
        norm_y = raw_y

    norm_x = max(0.0, min(1.0, round(float(norm_x), 4)))
    norm_y = max(0.0, min(1.0, round(float(norm_y), 4)))

    # Containment validation against assigned presentation zone
    if meter.presentation_zone_id:
        pub_map = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at.desc()).first()
        if pub_map:
            target_zone = next((z for z in pub_map.zones if z.zone_id == meter.presentation_zone_id), None)
            if target_zone:
                poly = json.loads(target_zone.polygon_canonical) if isinstance(target_zone.polygon_canonical, str) else target_zone.polygon_canonical
                cx = norm_x * pub_map.canonical_width
                cy = norm_y * pub_map.canonical_height
                if not is_point_in_polygon({"x": cx, "y": cy}, poly):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Tọa độ mới ({round(cx)}, {round(cy)}) nằm ngoài ranh giới phân khu {target_zone.display_label}.",
                    )

    before_state = {
        "map_x": meter.map_x,
        "map_y": meter.map_y,
        "route_status": meter.route_status,
    }

    meter.map_x = norm_x
    meter.map_y = norm_y
    meter.route_status = "REVIEW_REQUIRED"
    meter.updated_at = datetime.now(timezone.utc)

    after_state = {
        "map_x": meter.map_x,
        "map_y": meter.map_y,
        "route_status": meter.route_status,
    }

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="METER_RELOCATED",
        resource_type="METER",
        resource_id=meter.id,
        before_json=before_state,
        after_json=after_state,
    )
    db.commit()
    db.refresh(meter)

    reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
    latest_r = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter.id, MeterReading.status == "CONFIRMED", MeterReading.reading.isnot(None))
        .order_by(MeterReading.server_timestamp.desc())
        .first()
    )

    return AdminMeterItem(
        id=meter.id,
        meter_code=meter.meter_code,
        name=meter.name,
        location=meter.location,
        meter_type=meter.meter_type,
        is_active=meter.is_active,
        zone_id=meter.zone_id,
        presentation_zone_id=meter.presentation_zone_id,
        map_x=meter.map_x,
        map_y=meter.map_y,
        route_status=meter.route_status,
        created_at=meter.created_at.isoformat() if meter.created_at else None,
        updated_at=meter.updated_at.isoformat() if meter.updated_at else None,
        has_readings=(reading_count > 0),
        total_readings=reading_count,
        latest_reading=latest_r.reading if latest_r else None,
        latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r else None,
    )


def change_admin_meter_zone(
    db: Session,
    actor: User,
    meter_id: str,
    payload: AdminMeterChangeZoneRequest,
) -> AdminMeterItem:
    """
    Changes a meter's zone assignment with strict containment validation:
    Does NOT silently warp coordinates. If current coordinates are outside target zone, blocks save.
    """
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    pub_map = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at.desc()).first()
    if not pub_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cấu hình bản đồ đang phát hành.",
        )

    target_zone = next((z for z in pub_map.zones if z.zone_id == payload.presentation_zone_id), None)
    if not target_zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phân khu {payload.presentation_zone_id} không tồn tại trên bản đồ.",
        )

    # Validate current coordinate inside target zone
    if meter.map_x is not None and meter.map_y is not None:
        poly = json.loads(target_zone.polygon_canonical) if isinstance(target_zone.polygon_canonical, str) else target_zone.polygon_canonical
        cx = meter.map_x * pub_map.canonical_width
        cy = meter.map_y * pub_map.canonical_height
        if not is_point_in_polygon({"x": cx, "y": cy}, poly):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tọa độ hiện tại của công tơ nằm ngoài ranh giới phân khu {target_zone.display_label}. Vui lòng đặt lại vị trí công tơ vào phân khu mới trước khi chuyển khu vực.",
            )

    before_state = {
        "zone_id": meter.zone_id,
        "presentation_zone_id": meter.presentation_zone_id,
        "route_status": meter.route_status,
    }

    meter.zone_id = payload.zone_id
    meter.presentation_zone_id = payload.presentation_zone_id
    meter.route_status = "REVIEW_REQUIRED"
    meter.updated_at = datetime.now(timezone.utc)

    after_state = {
        "zone_id": meter.zone_id,
        "presentation_zone_id": meter.presentation_zone_id,
        "route_status": meter.route_status,
    }

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="METER_ZONE_CHANGED",
        resource_type="METER",
        resource_id=meter.id,
        before_json=before_state,
        after_json=after_state,
    )
    db.commit()
    db.refresh(meter)

    reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
    latest_r = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter.id, MeterReading.status == "CONFIRMED", MeterReading.reading.isnot(None))
        .order_by(MeterReading.server_timestamp.desc())
        .first()
    )

    return AdminMeterItem(
        id=meter.id,
        meter_code=meter.meter_code,
        name=meter.name,
        location=meter.location,
        meter_type=meter.meter_type,
        is_active=meter.is_active,
        zone_id=meter.zone_id,
        presentation_zone_id=meter.presentation_zone_id,
        map_x=meter.map_x,
        map_y=meter.map_y,
        route_status=meter.route_status,
        created_at=meter.created_at.isoformat() if meter.created_at else None,
        updated_at=meter.updated_at.isoformat() if meter.updated_at else None,
        has_readings=(reading_count > 0),
        total_readings=reading_count,
        latest_reading=latest_r.reading if latest_r else None,
        latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r else None,
    )


def set_meter_active_state(
    db: Session,
    actor: User,
    meter_id: str,
    is_active: bool,
) -> AdminMeterItem:
    """Soft-deactivates or reactivates a meter."""
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    # When reactivating, validate spatial containment
    if is_active and meter.presentation_zone_id and meter.map_x is not None and meter.map_y is not None:
        pub_map = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at.desc()).first()
        if pub_map:
            target_zone = next((z for z in pub_map.zones if z.zone_id == meter.presentation_zone_id), None)
            if target_zone:
                poly = json.loads(target_zone.polygon_canonical) if isinstance(target_zone.polygon_canonical, str) else target_zone.polygon_canonical
                cx = meter.map_x * pub_map.canonical_width
                cy = meter.map_y * pub_map.canonical_height
                if not is_point_in_polygon({"x": cx, "y": cy}, poly):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Không thể kích hoạt lại: Vị trí công tơ không còn nằm trong phân khu {target_zone.display_label}.",
                    )

    before_state = {"is_active": meter.is_active, "route_status": meter.route_status}
    meter.is_active = is_active
    meter.route_status = "REVIEW_REQUIRED" if not is_active else meter.route_status
    meter.updated_at = datetime.now(timezone.utc)
    after_state = {"is_active": meter.is_active, "route_status": meter.route_status}

    action = "METER_DEACTIVATED" if not is_active else "METER_REACTIVATED"
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action=action,
        resource_type="METER",
        resource_id=meter.id,
        before_json=before_state,
        after_json=after_state,
    )
    db.commit()
    db.refresh(meter)

    reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
    latest_r = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter.id, MeterReading.status == "CONFIRMED", MeterReading.reading.isnot(None))
        .order_by(MeterReading.server_timestamp.desc())
        .first()
    )

    return AdminMeterItem(
        id=meter.id,
        meter_code=meter.meter_code,
        name=meter.name,
        location=meter.location,
        meter_type=meter.meter_type,
        is_active=meter.is_active,
        zone_id=meter.zone_id,
        presentation_zone_id=meter.presentation_zone_id,
        map_x=meter.map_x,
        map_y=meter.map_y,
        route_status=meter.route_status or "VALID",
        created_at=meter.created_at.isoformat() if meter.created_at else None,
        updated_at=meter.updated_at.isoformat() if meter.updated_at else None,
        has_readings=(reading_count > 0),
        total_readings=reading_count,
        latest_reading=latest_r.reading if latest_r else None,
        latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r else None,
    )


def delete_admin_meter(db: Session, actor: User, meter_id: str) -> dict[str, Any]:
    """
    Hard delete protection:
    If meter has ANY recorded readings or history, hard deletion is blocked with 409 Conflict.
    Soft deletion ("Ngừng sử dụng") must be used instead.
    Hard deletion is permitted only for unused test/draft meters.
    """
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
    if reading_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Công tơ đã có {reading_count} bản ghi lịch sử chỉ số. Không được phép xóa vĩnh viễn. Vui lòng sử dụng tính năng Ngừng sử dụng (deactivate).",
        )

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="METER_DELETED",
        resource_type="METER",
        resource_id=meter.id,
        before_json={
            "meter_code": meter.meter_code,
            "name": meter.name,
        },
    )
    db.delete(meter)
    db.commit()

    return {"status": "success", "message": f"Đã xóa vĩnh viễn công tơ {meter.meter_code} thành công."}


# ==============================================================================
# ADMIN SCHEDULE MANAGEMENT
# ==============================================================================
def parse_hh_mm(val: str) -> tuple[int, int]:
    val = val.strip()
    parts = val.split(":")
    if len(parts) != 2:
        raise ValueError(f"Định dạng giờ không hợp lệ: '{val}'. Yêu cầu định dạng HH:MM (ví dụ 08:00).")
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        raise ValueError(f"Giờ và phút phải là số: '{val}'.")
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError(f"Thời gian không hợp lệ: '{val}'.")
    return h, m


def get_admin_schedules_list(
    db: Session,
    date_str: Optional[str] = None,
) -> tuple[Optional[ReadingBatch], list[ReadingRoundOut]]:
    batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )
    if not batch:
        return None, []

    target_date_str = date_str.strip() if date_str and date_str.strip() else get_today_local_str()

    all_rounds = (
        db.query(ReadingRound)
        .filter(ReadingRound.batch_id == batch.id, ReadingRound.is_legacy == False)
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )

    day_rounds = []
    for r in all_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        if r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str:
            day_rounds.append(r)

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)
    today_date_str = now_local.strftime("%Y-%m-%d")
    total_meters = db.query(Meter).filter(Meter.is_active == True).count()

    current_round_obj: Optional[ReadingRound] = None
    if day_rounds and target_date_str == today_date_str:
        past_or_curr = [
            r for r in day_rounds
            if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc
        ]
        if past_or_curr:
            current_round_obj = past_or_curr[-1]

    out_rounds: list[ReadingRoundOut] = []
    for r in day_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        readings = db.query(MeterReading).filter(MeterReading.reading_round_id == r.id).all()
        confirmed = sum(1 for rd in readings if rd.status == "CONFIRMED")
        review = sum(1 for rd in readings if rd.status == "REVIEW")
        pending = max(0, total_meters - (confirmed + review))

        if target_date_str < today_date_str:
            timing_state = "PAST"
        elif target_date_str > today_date_str:
            timing_state = "UPCOMING"
        else:
            is_curr = (current_round_obj and r.id == current_round_obj.id)
            timing_state = "CURRENT" if is_curr else ("PAST" if r_sched <= now_utc else "UPCOMING")

        out_rounds.append(
            ReadingRoundOut(
                id=r.id,
                batch_id=r.batch_id,
                scheduled_at=r_sched.isoformat(),
                scheduled_local=get_round_local_time_str(r_sched),
                scheduled_time_only=get_round_time_only_str(r_sched),
                status=r.status,
                is_legacy=r.is_legacy,
                timing_state=timing_state,
                progress=BatchProgress(
                    total=total_meters,
                    confirmed=confirmed,
                    review=review,
                    pending=pending,
                ),
            )
        )

    return batch, out_rounds


def preview_admin_schedules(
    db: Session,
    payload: AdminSchedulePreviewRequest,
) -> AdminSchedulePreviewResponse:
    batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa có đợt ghi hiện hành.",
        )

    # Validate target date
    try:
        t_date = datetime.strptime(payload.date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ngày không hợp lệ. Yêu cầu YYYY-MM-DD.",
        )

    today_local = datetime.now(LOCAL_TZ).date()
    if t_date < today_local:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo lịch cho ngày trong quá khứ.",
        )

    try:
        sh, sm = parse_hh_mm(payload.start_time)
        eh, em = parse_hh_mm(payload.end_time)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    start_dt_local = datetime(t_date.year, t_date.month, t_date.day, sh, sm, 0, tzinfo=LOCAL_TZ)
    end_dt_local = datetime(t_date.year, t_date.month, t_date.day, eh, em, 0, tzinfo=LOCAL_TZ)

    if start_dt_local > end_dt_local:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giờ bắt đầu không thể sau giờ kết thúc.",
        )

    if payload.interval_minutes < 5 or payload.interval_minutes > 1440:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.",
        )
    interval = payload.interval_minutes

    # Query existing rounds for this batch
    existing_rounds = db.query(ReadingRound).filter(ReadingRound.batch_id == batch.id).all()
    existing_round_map: dict[datetime, ReadingRound] = {
        (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at): r
        for r in existing_rounds
    }

    proposed_rounds: list[AdminSchedulePreviewRound] = []
    conflict_count = 0

    curr_dt_local = start_dt_local
    while curr_dt_local <= end_dt_local:
        if len(proposed_rounds) >= 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số lượng lượt ghi dự kiến vượt quá 200 lượt trong ngày. Vui lòng tăng chu kỳ hoặc thu hẹp khung giờ.",
            )
        curr_dt_utc = curr_dt_local.astimezone(timezone.utc)
        existing = existing_round_map.get(curr_dt_utc)
        is_conf = existing is not None

        if is_conf:
            conflict_count += 1

        proposed_rounds.append(
            AdminSchedulePreviewRound(
                scheduled_at=curr_dt_utc.isoformat(),
                scheduled_local=get_round_local_time_str(curr_dt_utc),
                scheduled_time_only=get_round_time_only_str(curr_dt_utc),
                is_conflict=is_conf,
                existing_round_id=existing.id if existing else None,
            )
        )
        curr_dt_local += timedelta(minutes=interval)

    return AdminSchedulePreviewResponse(
        batch_id=batch.id,
        batch_name=batch.name,
        target_date=payload.date.strip(),
        total_proposed=len(proposed_rounds),
        conflict_count=conflict_count,
        rounds=proposed_rounds,
    )


def create_admin_schedules(
    db: Session,
    actor: User,
    payload: AdminScheduleCreateRequest,
) -> AdminScheduleCreateResponse:
    batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa có đợt ghi hiện hành.",
        )

    try:
        t_date = datetime.strptime(payload.date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ngày không hợp lệ. Yêu cầu YYYY-MM-DD.",
        )

    today_local = datetime.now(LOCAL_TZ).date()
    if t_date < today_local:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo lịch cho ngày trong quá khứ.",
        )

    try:
        sh, sm = parse_hh_mm(payload.start_time)
        eh, em = parse_hh_mm(payload.end_time)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    start_dt_local = datetime(t_date.year, t_date.month, t_date.day, sh, sm, 0, tzinfo=LOCAL_TZ)
    end_dt_local = datetime(t_date.year, t_date.month, t_date.day, eh, em, 0, tzinfo=LOCAL_TZ)

    if start_dt_local > end_dt_local:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giờ bắt đầu không thể sau giờ kết thúc.",
        )

    if payload.interval_minutes < 5 or payload.interval_minutes > 1440:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.",
        )
    interval = payload.interval_minutes

    # Check conflicts transactionally
    existing_rounds = db.query(ReadingRound).filter(ReadingRound.batch_id == batch.id).all()
    existing_utc_set = {
        r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        for r in existing_rounds
    }

    proposed_utc_list: list[datetime] = []
    curr_dt_local = start_dt_local
    while curr_dt_local <= end_dt_local:
        if len(proposed_utc_list) >= 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số lượng lượt ghi dự kiến vượt quá 200 lượt trong ngày. Vui lòng tăng chu kỳ hoặc thu hẹp khung giờ.",
            )
        curr_dt_utc = curr_dt_local.astimezone(timezone.utc)
        if curr_dt_utc in existing_utc_set:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Một hoặc nhiều lượt đã tồn tại trong khung giờ này.",
            )
        proposed_utc_list.append(curr_dt_utc)
        curr_dt_local += timedelta(minutes=interval)

    now_utc = datetime.now(timezone.utc)
    new_rounds: list[ReadingRound] = []

    for dt_utc in proposed_utc_list:
        new_round = ReadingRound(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            scheduled_at=dt_utc,
            status="OPEN",
            is_legacy=False,
            created_at=now_utc,
        )
        db.add(new_round)
        new_rounds.append(new_round)

    db.flush()

    # Log audit
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="READING_ROUNDS_CREATED",
        resource_type="READING_ROUNDS",
        resource_id=batch.id,
        after_json={
            "batch_id": batch.id,
            "batch_name": batch.name,
            "date": payload.date.strip(),
            "count": len(new_rounds),
            "rounds": [get_round_time_only_str(r.scheduled_at) for r in new_rounds],
        },
    )

    db.commit()
    for r in new_rounds:
        db.refresh(r)

    total_meters = db.query(Meter).filter(Meter.is_active == True).count()
    out_rounds: list[ReadingRoundOut] = []
    for r in new_rounds:
        sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        timing_state = "UPCOMING" if sched > now_utc else "PAST"
        out_rounds.append(
            ReadingRoundOut(
                id=r.id,
                batch_id=r.batch_id,
                scheduled_at=sched.isoformat(),
                scheduled_local=get_round_local_time_str(sched),
                scheduled_time_only=get_round_time_only_str(sched),
                status=r.status,
                is_legacy=r.is_legacy,
                timing_state=timing_state,
                progress=BatchProgress(
                    total=total_meters,
                    confirmed=0,
                    review=0,
                    pending=total_meters,
                ),
            )
        )

    date_formatted = format_date_vn(payload.date.strip())
    return AdminScheduleCreateResponse(
        status="success",
        batch_id=batch.id,
        batch_name=batch.name,
        created_count=len(new_rounds),
        message=f"Đã tạo thành công {len(new_rounds)} lượt đọc cho ngày {date_formatted}.",
        rounds=out_rounds,
    )


def delete_admin_schedule_round(
    db: Session,
    actor: User,
    round_id: str,
    force: bool = False,
) -> AdminScheduleDeleteResponse:
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt ghi chỉ số cần xóa.",
        )

    # Check if batch is OPEN
    batch = db.query(ReadingBatch).filter(ReadingBatch.id == round_obj.batch_id).first()
    if batch and batch.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lượt ghi của đợt đã đóng.",
        )

    # Check reading count
    readings_count = db.query(MeterReading).filter(MeterReading.reading_round_id == round_obj.id).count()
    if readings_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lượt ghi này đã có {readings_count} bản ghi chỉ số công tơ. Vui lòng xác nhận xóa bắt buộc.",
        )

    time_str = get_round_time_only_str(round_obj.scheduled_at)
    round_sched = round_obj.scheduled_at.replace(tzinfo=timezone.utc) if round_obj.scheduled_at.tzinfo is None else round_obj.scheduled_at
    date_str = round_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")

    # Delete readings explicitly to ensure cascading cleanup
    db.query(MeterReading).filter(MeterReading.reading_round_id == round_obj.id).delete(synchronize_session=False)

    # Delete round
    db.delete(round_obj)
    db.flush()

    # Log audit
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="READING_ROUND_DELETED",
        resource_type="READING_ROUNDS",
        resource_id=round_id,
        before_json={
            "round_id": round_id,
            "batch_id": round_obj.batch_id,
            "scheduled_time": time_str,
            "date": date_str,
            "readings_count": readings_count,
            "force": force,
        },
    )

    db.commit()

    return AdminScheduleDeleteResponse(
        status="success",
        deleted_count=1,
        message=f"Đã xóa thành công lượt ghi lúc {time_str}.",
    )


def delete_admin_schedules_by_date(
    db: Session,
    actor: User,
    date_str: str,
    force: bool = False,
) -> AdminScheduleDeleteResponse:
    batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa có đợt ghi hiện hành.",
        )

    try:
        t_date = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ngày không hợp lệ. Yêu cầu YYYY-MM-DD.",
        )

    all_rounds = (
        db.query(ReadingRound)
        .filter(ReadingRound.batch_id == batch.id, ReadingRound.is_legacy == False)
        .all()
    )

    day_rounds: list[ReadingRound] = []
    for r in all_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        if r_sched.astimezone(LOCAL_TZ).date() == t_date:
            day_rounds.append(r)

    if not day_rounds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không có lượt ghi nào trong ngày {format_date_vn(date_str.strip())} để xóa.",
        )

    round_ids = [r.id for r in day_rounds]
    total_readings = (
        db.query(MeterReading)
        .filter(MeterReading.reading_round_id.in_(round_ids))
        .count()
    )

    if total_readings > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Các lượt ghi trong ngày này đã có {total_readings} bản ghi chỉ số công tơ. Vui lòng xác nhận xóa bắt buộc.",
        )

    # Delete readings
    db.query(MeterReading).filter(MeterReading.reading_round_id.in_(round_ids)).delete(synchronize_session=False)

    # Delete rounds
    for r in day_rounds:
        db.delete(r)

    db.flush()

    # Log audit
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="READING_ROUNDS_BATCH_DELETED",
        resource_type="READING_ROUNDS",
        resource_id=batch.id,
        before_json={
            "batch_id": batch.id,
            "date": date_str.strip(),
            "rounds_count": len(day_rounds),
            "readings_count": total_readings,
            "force": force,
        },
    )

    db.commit()

    return AdminScheduleDeleteResponse(
        status="success",
        deleted_count=len(day_rounds),
        message=f"Đã xóa thành công {len(day_rounds)} lượt ghi của ngày {format_date_vn(date_str.strip())}.",
    )


# ==============================================================================
# ADMIN OPERATIONAL DASHBOARD
# ==============================================================================
def get_admin_dashboard(
    db: Session,
    date_str: Optional[str] = None,
    location_filter: Optional[str] = None,
) -> AdminDashboardResponse:
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)

    target_date_str = date_str.strip() if date_str and date_str.strip() else now_local.strftime("%Y-%m-%d")
    date_formatted = format_date_vn(target_date_str)

    # 1. Active Batch
    batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )

    batch_resp = None
    if batch:
        total_m_all = db.query(Meter).filter(Meter.is_active == True).count()
        b_readings = (
            db.query(MeterReading)
            .join(Meter, MeterReading.meter_id == Meter.id)
            .filter(MeterReading.batch_id == batch.id, Meter.is_active == True)
            .all()
        )
        b_conf = sum(1 for r in b_readings if r.status == "CONFIRMED")
        b_rev = sum(1 for r in b_readings if r.status == "REVIEW")
        batch_resp = ReadingBatchCurrentResponse(
            id=batch.id,
            name=batch.name,
            period_key=batch.period_key,
            status=batch.status,
            progress=BatchProgress(
                total=total_m_all,
                confirmed=b_conf,
                review=b_rev,
                pending=max(0, total_m_all - (b_conf + b_rev)),
            ),
        )

    # 2. Available locations across all active meters
    all_active_meters = db.query(Meter).filter(Meter.is_active == True).order_by(Meter.meter_code.asc()).all()
    available_locs = sorted(list({m.location.strip() for m in all_active_meters if m.location and m.location.strip()}))

    # 3. Filtered active meters
    filtered_meters = all_active_meters
    if location_filter and location_filter.strip() and location_filter.strip() != "ALL":
        loc_clean = location_filter.strip()
        filtered_meters = [m for m in all_active_meters if (m.location or "").strip() == loc_clean]

    total_meters = len(filtered_meters)
    meter_ids_set = {m.id for m in filtered_meters}

    # 4. Target day non-legacy rounds
    all_rounds = (
        db.query(ReadingRound)
        .filter(ReadingRound.is_legacy == False)
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )

    today_rounds: list[ReadingRound] = []
    for r in all_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        if r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str:
            today_rounds.append(r)

    round_ids = [r.id for r in today_rounds]

    # Find current round if date is today
    today_date_str = now_local.strftime("%Y-%m-%d")
    current_round_obj: Optional[ReadingRound] = None
    if today_rounds and target_date_str == today_date_str:
        past_or_curr = [
            r for r in today_rounds
            if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc
        ]
        if past_or_curr:
            current_round_obj = past_or_curr[-1]

    # 5. Readings for today's rounds
    readings: list[MeterReading] = []
    if round_ids:
        readings = (
            db.query(MeterReading)
            .filter(MeterReading.reading_round_id.in_(round_ids))
            .all()
        )

    # Filter readings to active/filtered meters
    filtered_readings = [r for r in readings if r.meter_id in meter_ids_set]
    readings_map: dict[tuple[str, str], MeterReading] = {
        (r.meter_id, r.reading_round_id): r for r in filtered_readings
    }

    # 6. Due vs Upcoming rounds
    today_date_str = now_local.strftime("%Y-%m-%d")
    due_rounds = []

    if target_date_str < today_date_str:
        # Past date: all scheduled rounds are considered due
        due_rounds = list(today_rounds)
    elif target_date_str == today_date_str:
        # Today: rounds that have arrived or are the current active round
        for r in today_rounds:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            if r_sched <= now_utc or (current_round_obj and r.id == current_round_obj.id):
                due_rounds.append(r)
    else:
        # Future date: 0 rounds are due yet
        due_rounds = []

    total_expected_slots = total_meters * len(today_rounds)
    due_slots = total_meters * len(due_rounds)

    confirmed_slots = sum(1 for r in filtered_readings if r.status == "CONFIRMED")
    review_slots = sum(1 for r in filtered_readings if r.status == "REVIEW")
    due_pending_slots = max(0, due_slots - confirmed_slots - review_slots)
    actionable_count = due_pending_slots + review_slots

    completion_pct = (
        round((confirmed_slots / due_slots * 100), 1)
        if due_slots > 0
        else (round((confirmed_slots / total_expected_slots * 100), 1) if total_expected_slots > 0 and target_date_str <= today_date_str else 0.0)
    )

    curr_round_time_str = None
    curr_round_status_str = None
    if current_round_obj:
        r_sched = current_round_obj.scheduled_at.replace(tzinfo=timezone.utc) if current_round_obj.scheduled_at.tzinfo is None else current_round_obj.scheduled_at
        curr_round_time_str = get_round_time_only_str(r_sched)
        curr_round_status_str = "Đang mở" if current_round_obj.status == "OPEN" else "Đã đóng"
    elif target_date_str > today_date_str:
        curr_round_status_str = "Lịch dự kiến"
    elif target_date_str < today_date_str and today_rounds:
        curr_round_status_str = "Đã kết thúc"

    kpis_out = AdminDashboardKpis(
        current_round_time=curr_round_time_str,
        current_round_status=curr_round_status_str,
        confirmed_slots=confirmed_slots,
        due_slots=due_slots,
        total_expected_slots=total_expected_slots,
        completion_percent=completion_pct,
        actionable_count=actionable_count,
        review_count=review_slots,
    )

    # 7. Progress by Round
    round_progress_list: list[AdminDashboardRoundProgress] = []
    for r in today_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at

        if target_date_str < today_date_str:
            timing_state = "PAST"
        elif target_date_str > today_date_str:
            timing_state = "UPCOMING"
        else:
            is_curr = (current_round_obj and r.id == current_round_obj.id)
            timing_state = "CURRENT" if is_curr else ("PAST" if r_sched <= now_utc else "UPCOMING")

        r_readings = [rd for rd in filtered_readings if rd.reading_round_id == r.id]
        r_conf = sum(1 for rd in r_readings if rd.status == "CONFIRMED")
        r_rev = sum(1 for rd in r_readings if rd.status == "REVIEW")
        r_pend = max(0, total_meters - r_conf - r_rev)
        r_pct = round((r_conf / total_meters * 100), 1) if total_meters > 0 else 0.0

        round_progress_list.append(
            AdminDashboardRoundProgress(
                round_id=r.id,
                scheduled_time=get_round_time_only_str(r_sched),
                scheduled_local=get_round_local_time_str(r_sched),
                timing_state=timing_state,
                total_meters=total_meters,
                confirmed=r_conf,
                review=r_rev,
                pending=r_pend,
                completion_percent=r_pct,
            )
        )

    # 8. Progress by Location
    locations_map: dict[str, list[Meter]] = {}
    for m in filtered_meters:
        loc_key = m.location.strip() if m.location and m.location.strip() else "Chưa xác định vị trí"
        locations_map.setdefault(loc_key, []).append(m)

    location_progress_list: list[AdminDashboardLocationProgress] = []
    for loc_name, loc_meters in sorted(locations_map.items()):
        loc_m_count = len(loc_meters)
        loc_m_ids = {m.id for m in loc_meters}

        loc_exp = loc_m_count * len(today_rounds)
        loc_due = loc_m_count * len(due_rounds)

        loc_readings = [rd for rd in filtered_readings if rd.meter_id in loc_m_ids]
        loc_conf = sum(1 for rd in loc_readings if rd.status == "CONFIRMED")
        loc_rev = sum(1 for rd in loc_readings if rd.status == "REVIEW")
        loc_pend = max(0, loc_due - loc_conf - loc_rev)
        loc_pct = (
            round((loc_conf / loc_due * 100), 1)
            if loc_due > 0
            else (round((loc_conf / loc_exp * 100), 1) if loc_exp > 0 and target_date_str <= today_date_str else 0.0)
        )

        location_progress_list.append(
            AdminDashboardLocationProgress(
                location=loc_name,
                meter_count=loc_m_count,
                due_slots=loc_due,
                confirmed_slots=loc_conf,
                review_slots=loc_rev,
                pending_slots=loc_pend,
                completion_percent=loc_pct,
            )
        )

    # 9. Exception-first Table ("Cần chú ý")
    # Prioritize:
    # 1. All REVIEW items (current round reviews + past reviews, sorted newest to oldest)
    # 2. Overdue MISSING items (from PAST rounds strictly before current round, sorted newest to oldest)
    # Exclude: Missing meters in CURRENT round (in-progress work) and FUTURE rounds
    review_exceptions: list[AdminDashboardExceptionItem] = []
    missing_exceptions: list[AdminDashboardExceptionItem] = []

    sorted_due_rounds = sorted(due_rounds, key=lambda x: x.scheduled_at, reverse=True)

    for r in sorted_due_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        r_time_str = get_round_time_only_str(r_sched)
        r_local_str = get_round_local_time_str(r_sched)
        is_current_round = (current_round_obj and r.id == current_round_obj.id)

        for m in filtered_meters:
            rd = readings_map.get((m.id, r.id))
            if rd and rd.status == "REVIEW":
                rec_by = f"{rd.user.full_name} ({rd.user.employee_code})" if rd.user else None
                review_exceptions.append(
                    AdminDashboardExceptionItem(
                        meter_id=m.id,
                        meter_code=m.meter_code,
                        meter_name=m.name,
                        location=m.location or "Chưa xác định",
                        round_id=r.id,
                        scheduled_time=r_time_str,
                        scheduled_local=r_local_str,
                        exception_state="REVIEW",
                        exception_label="Cần kiểm tra",
                        reading_id=rd.id,
                        ocr_reading=rd.ocr_reading,
                        server_timestamp=get_local_time_str(rd.server_timestamp) if rd.server_timestamp else None,
                        recorded_by=rec_by,
                    )
                )
            elif not rd and not is_current_round:
                # Only past/overdue rounds treat unread meters as exceptions
                missing_exceptions.append(
                    AdminDashboardExceptionItem(
                        meter_id=m.id,
                        meter_code=m.meter_code,
                        meter_name=m.name,
                        location=m.location or "Chưa xác định",
                        round_id=r.id,
                        scheduled_time=r_time_str,
                        scheduled_local=r_local_str,
                        exception_state="MISSING",
                        exception_label="Chưa ghi",
                        ocr_reading=None,
                        server_timestamp=None,
                        recorded_by=None,
                    )
                )

    exceptions_list = review_exceptions + missing_exceptions

    # 10. Confirmation Source Statistics ("Chất lượng ghi nhận")
    confirmed_readings = [rd for rd in filtered_readings if rd.status == "CONFIRMED"]
    total_confirmed_cnt = len(confirmed_readings)

    ocr_conf_cnt = sum(1 for rd in confirmed_readings if rd.confirmation_source == "OCR_CONFIRMED")
    user_corr_cnt = sum(1 for rd in confirmed_readings if rd.confirmation_source == "USER_CORRECTED")
    manual_cnt = sum(1 for rd in confirmed_readings if rd.confirmation_source == "MANUAL_ENTRY")

    provenance_out = AdminDashboardProvenanceStats(
        ocr_confirmed_count=ocr_conf_cnt,
        ocr_confirmed_percent=round((ocr_conf_cnt / total_confirmed_cnt * 100), 1) if total_confirmed_cnt > 0 else 0.0,
        user_corrected_count=user_corr_cnt,
        user_corrected_percent=round((user_corr_cnt / total_confirmed_cnt * 100), 1) if total_confirmed_cnt > 0 else 0.0,
        manual_entry_count=manual_cnt,
        manual_entry_percent=round((manual_cnt / total_confirmed_cnt * 100), 1) if total_confirmed_cnt > 0 else 0.0,
        total_readings=total_confirmed_cnt,
    )

    return AdminDashboardResponse(
        date=target_date_str,
        date_formatted=date_formatted,
        location_filter=location_filter,
        batch=batch_resp,
        kpis=kpis_out,
        round_progress=round_progress_list,
        location_progress=location_progress_list,
        exceptions=exceptions_list,
        provenance=provenance_out,
        available_locations=available_locs,
    )


# ==============================================================================
# ADMIN AUDIT LOGS
# ==============================================================================
def get_admin_audit_logs(
    db: Session,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> AdminAuditLogListResponse:
    query = db.query(AdminAuditLog)

    if action and action.strip() and action.strip().upper() != "ALL":
        query = query.filter(AdminAuditLog.action == action.strip().upper())

    if resource_type and resource_type.strip() and resource_type.strip().upper() != "ALL":
        query = query.filter(AdminAuditLog.resource_type == resource_type.strip().upper())

    total = query.count()
    logs = (
        query.order_by(AdminAuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[AdminAuditLogItem] = []
    for l in logs:
        created_dt = l.created_at.replace(tzinfo=timezone.utc) if l.created_at.tzinfo is None else l.created_at
        items.append(
            AdminAuditLogItem(
                id=l.id,
                actor_id=l.actor_user_id,
                actor_employee_code=l.actor.employee_code if l.actor else None,
                actor_full_name=l.actor.full_name if l.actor else "Hệ thống",
                action=l.action,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                before_json=l.before_json,
                after_json=l.after_json,
                created_at=created_dt.isoformat(),
                created_at_local=get_local_time_str(created_dt),
            )
        )

    return AdminAuditLogListResponse(total=total, logs=items)


# ==============================================================================
# ADMIN METER READING INSPECTION FUNCTIONS
# ==============================================================================
def get_admin_meter_reading_detail(db: Session, reading_id: str) -> AdminMeterReadingInspectionResponse:
    """
    Returns safe operational detail for Admin Inspection of a specific MeterReading record.
    Never exposes internal filesystem paths or ML training sample data.
    """
    reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản ghi chỉ số.",
        )

    meter = reading.meter
    round_obj = reading.round
    operator = reading.user

    evidence = (
        db.query(MeterReadingEvidence)
        .filter(MeterReadingEvidence.meter_reading_id == reading.id)
        .first()
    )
    evidence_available = (evidence is not None)
    roi_bbox_parsed = None
    evidence_dto: Optional[AdminMeterReadingEvidenceInfo] = None

    if evidence:
        loc_bbox: Optional[AdminInspectionBBox] = None
        rec_bbox: Optional[AdminInspectionBBox] = None

        if evidence.roi_bbox:
            try:
                raw_bbox = json.loads(evidence.roi_bbox)
                if isinstance(raw_bbox, (list, tuple)) and len(raw_bbox) == 4:
                    img_w = evidence.width or 640
                    img_h = evidence.height or 480

                    norm_x1 = max(0.0, min(1.0, float(raw_bbox[0])))
                    norm_y1 = max(0.0, min(1.0, float(raw_bbox[1])))
                    norm_x2 = max(0.0, min(1.0, float(raw_bbox[2])))
                    norm_y2 = max(0.0, min(1.0, float(raw_bbox[3])))

                    if norm_x1 > norm_x2:
                        norm_x1, norm_x2 = norm_x2, norm_x1
                    if norm_y1 > norm_y2:
                        norm_y1, norm_y2 = norm_y2, norm_y1

                    px_x1 = max(0, int(round(norm_x1 * img_w)))
                    px_y1 = max(0, int(round(norm_y1 * img_h)))
                    px_x2 = min(img_w, int(round(norm_x2 * img_w)))
                    px_y2 = min(img_h, int(round(norm_y2 * img_h)))

                    loc_w = max(1, px_x2 - px_x1)
                    loc_h = max(1, px_y2 - px_y1)

                    loc_bbox = AdminInspectionBBox(
                        x1=px_x1,
                        y1=px_y1,
                        x2=px_x2,
                        y2=px_y2,
                        norm_x1=round(norm_x1, 6),
                        norm_y1=round(norm_y1, 6),
                        norm_x2=round(norm_x2, 6),
                        norm_y2=round(norm_y2, 6),
                        width=loc_w,
                        height=loc_h,
                        norm_width=round(norm_x2 - norm_x1, 6),
                        norm_height=round(norm_y2 - norm_y1, 6),
                    )

                    # Exact production recognition crop geometry
                    rec_x1, rec_y1, rec_x2, rec_y2, rec_nx1, rec_ny1, rec_nx2, rec_ny2 = compute_recognition_crop_geometry(
                        x1=px_x1,
                        y1=px_y1,
                        x2=px_x2,
                        y2=px_y2,
                        width=img_w,
                        height=img_h,
                        roi_shift_x=settings.roi_shift_x,
                        roi_padding=settings.roi_padding,
                    )

                    recognition_w = max(1, rec_x2 - rec_x1)
                    recognition_h = max(1, rec_y2 - rec_y1)

                    rec_bbox = AdminInspectionBBox(
                        x1=rec_x1,
                        y1=rec_y1,
                        x2=rec_x2,
                        y2=rec_y2,
                        norm_x1=round(rec_nx1, 6),
                        norm_y1=round(rec_ny1, 6),
                        norm_x2=round(rec_nx2, 6),
                        norm_y2=round(rec_ny2, 6),
                        width=recognition_w,
                        height=recognition_h,
                        norm_width=round(rec_nx2 - rec_nx1, 6),
                        norm_height=round(rec_ny2 - rec_ny1, 6),
                    )

                    roi_bbox_parsed = [round(norm_x1, 6), round(norm_y1, 6), round(norm_x2, 6), round(norm_y2, 6)]
            except Exception:
                loc_bbox = None
                rec_bbox = None
                roi_bbox_parsed = None

        captured_vn = None
        if evidence.captured_at:
            cap_dt = evidence.captured_at.replace(tzinfo=timezone.utc) if evidence.captured_at.tzinfo is None else evidence.captured_at
            captured_vn = cap_dt.astimezone(LOCAL_TZ).strftime("%d/%m/%Y · %H:%M")

        evidence_dto = AdminMeterReadingEvidenceInfo(
            available=True,
            width=evidence.width,
            height=evidence.height,
            mime_type=evidence.mime_type or "image/jpeg",
            captured_at_vn=captured_vn,
            localization_bbox=loc_bbox,
            recognition_bbox=rec_bbox,
        )

    # Chronological previous and next reading for the SAME meter
    all_meter_readings = (
        db.query(MeterReading)
        .join(ReadingRound, MeterReading.reading_round_id == ReadingRound.id)
        .filter(MeterReading.meter_id == reading.meter_id)
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )
    idx = next((i for i, r in enumerate(all_meter_readings) if r.id == reading.id), -1)
    prev_id = all_meter_readings[idx - 1].id if idx > 0 else None
    next_id = all_meter_readings[idx + 1].id if (idx >= 0 and idx < len(all_meter_readings) - 1) else None

    r_sched = round_obj.scheduled_at.replace(tzinfo=timezone.utc) if round_obj.scheduled_at.tzinfo is None else round_obj.scheduled_at
    r_local = r_sched.astimezone(LOCAL_TZ)
    scheduled_at_vn = r_local.strftime("%d/%m/%Y")
    scheduled_time = r_local.strftime("%H:%M")

    rec_dt = reading.server_timestamp.replace(tzinfo=timezone.utc) if reading.server_timestamp.tzinfo is None else reading.server_timestamp
    rec_local = rec_dt.astimezone(LOCAL_TZ)
    recorded_at_vn = rec_local.strftime("%d/%m/%Y · %H:%M")

    return AdminMeterReadingInspectionResponse(
        reading_id=reading.id,
        status=reading.status,
        reading=reading.reading,
        ocr_reading=reading.ocr_reading,
        confirmation_source=reading.confirmation_source,
        scheduled_at=r_sched.isoformat(),
        scheduled_at_vn=scheduled_at_vn,
        scheduled_time=scheduled_time,
        recorded_at=rec_dt.isoformat(),
        recorded_at_vn=recorded_at_vn,
        meter=AdminInspectionMeter(
            id=meter.id,
            meter_code=meter.meter_code,
            name=meter.name,
            location=meter.location,
            meter_type=meter.meter_type,
            is_active=meter.is_active,
        ),
        round=AdminInspectionRound(
            id=round_obj.id,
            scheduled_at=r_sched.isoformat(),
            scheduled_at_vn=scheduled_at_vn,
            scheduled_time=scheduled_time,
            status=round_obj.status,
        ),
        operator=AdminInspectionOperator(
            id=operator.id,
            full_name=operator.full_name,
            employee_code=operator.employee_code,
        ) if operator else None,
        evidence_available=evidence_available,
        evidence=evidence_dto,
        roi_bbox=roi_bbox_parsed,
        pipeline_version=reading.pipeline_version,
        prev_reading_id=prev_id,
        next_reading_id=next_id,
    )


def get_admin_meter_reading_evidence_path(db: Session, reading_id: str) -> Path:
    """
    Looks up the sanitized operational image evidence for an authenticated Admin.
    Strictly prevents arbitrary path traversal and enforces private file resolution.
    """
    reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản ghi chỉ số.",
        )

    evidence = (
        db.query(MeterReadingEvidence)
        .filter(MeterReadingEvidence.meter_reading_id == reading_id)
        .first()
    )
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không có ảnh nghiệp vụ được lưu cho bản ghi này.",
        )

    current_settings = get_settings()
    evidence_dir = Path(current_settings.meter_reading_evidence_dir).resolve()
    file_path = (evidence_dir / evidence.image_filename).resolve()

    # Prevent directory traversal
    if not str(file_path).startswith(str(evidence_dir)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đường dẫn tệp không hợp lệ.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tệp ảnh nghiệp vụ không tồn tại trên hệ thống lưu trữ.",
        )

    return file_path


def get_admin_meter_latest_reading(db: Session, meter_id: str) -> AdminMeterLatestReadingResponse:
    """
    Finds the most recent chronological MeterReading for a meter.
    """
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin công tơ.",
        )

    latest_rd = (
        db.query(MeterReading)
        .join(ReadingRound, MeterReading.reading_round_id == ReadingRound.id)
        .filter(MeterReading.meter_id == meter_id)
        .order_by(ReadingRound.scheduled_at.desc())
        .first()
    )
    if not latest_rd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Công tơ chưa có bản ghi để kiểm tra.",
        )

    return AdminMeterLatestReadingResponse(reading_id=latest_rd.id)
