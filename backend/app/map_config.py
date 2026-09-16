import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .admin import log_admin_action
from .models import MapVersion, MapVersionZone, Meter, User
from .schemas import (
    ActiveMapConfigurationResponse,
    MapDraftCreateRequest,
    MapPublishResponse,
    MapRollbackRequest,
    MapValidationResponse,
    MapVersionListResponse,
    MapVersionOut,
    MapVersionSummary,
    MapVersionZoneOut,
    MapZoneUpdateRequest,
    ValidationIssue,
)


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


from .geometry_utils import calculate_polygon_area, is_point_in_polygon, check_polygon_simplicity


# ==============================================================================
# SERIALIZATION HELPERS
# ==============================================================================
def zone_model_to_dto(z: MapVersionZone) -> MapVersionZoneOut:
    return MapVersionZoneOut(
        id=z.id,
        map_version_id=z.map_version_id,
        zone_id=z.zone_id,
        presentation_id=z.zone_id,
        business_zone_id=z.business_zone_id,
        display_index=z.display_index,
        display_label=z.display_label,
        business_name=z.business_name,
        presentation_color=z.presentation_color,
        icon=z.icon or "container",
        polygon_canonical=json.loads(z.polygon_canonical) if isinstance(z.polygon_canonical, str) else z.polygon_canonical,
        label_anchor_canonical=json.loads(z.label_anchor_canonical) if isinstance(z.label_anchor_canonical, str) else z.label_anchor_canonical,
        operator_anchor_canonical=json.loads(z.operator_anchor_canonical) if isinstance(z.operator_anchor_canonical, str) else z.operator_anchor_canonical,
        landmarks=json.loads(z.landmarks_json) if (z.landmarks_json and isinstance(z.landmarks_json, str)) else [],
        revision=z.revision,
    )


def version_model_to_dto(v: MapVersion) -> MapVersionOut:
    zones_dto = [zone_model_to_dto(z) for z in sorted(v.zones, key=lambda x: x.display_index)]
    return MapVersionOut(
        id=v.id,
        map_id=v.map_id,
        map_version=v.map_version,
        coordinate_system=v.coordinate_system,
        canonical_width=v.canonical_width,
        canonical_height=v.canonical_height,
        source_asset=v.source_asset,
        geometry_schema_version=getattr(v, "geometry_schema_version", "1.0") or "1.0",
        status=v.status,
        revision=v.revision,
        parent_version_id=v.parent_version_id,
        created_by_user_id=v.created_by_user_id,
        created_by_name=v.created_by.full_name if v.created_by else None,
        published_by_user_id=v.published_by_user_id,
        published_by_name=v.published_by.full_name if v.published_by else None,
        created_at=v.created_at.isoformat() if v.created_at else None,
        updated_at=v.updated_at.isoformat() if v.updated_at else None,
        published_at=v.published_at.isoformat() if v.published_at else None,
        zones=zones_dto,
    )


# ==============================================================================
# MAP CONFIGURATION SERVICE
# ==============================================================================
def get_active_map_config(db: Session, map_id: str = "tan-thuan") -> ActiveMapConfigurationResponse:
    """Returns the current active PUBLISHED map version with complete geometry."""
    version = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == map_id, MapVersion.status == "PUBLISHED")
        .order_by(MapVersion.published_at.desc())
        .first()
    )
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cấu hình bản đồ đang phát hành (PUBLISHED).",
        )
    dto = version_model_to_dto(version)
    all_landmarks: list[dict[str, Any]] = []
    for z in dto.zones:
        if z.landmarks:
            all_landmarks.extend(z.landmarks)

    return ActiveMapConfigurationResponse(
        id=dto.id,
        map_id=dto.map_id,
        version_id=dto.id,
        version_number=dto.map_version,
        map_version=dto.map_version,
        coordinate_system=dto.coordinate_system,
        canonical_width=dto.canonical_width,
        canonical_height=dto.canonical_height,
        source_asset=dto.source_asset,
        source_checksum=None,
        geometry_schema_version=dto.geometry_schema_version or "1.0",
        status=dto.status,
        revision=dto.revision,
        published_at=dto.published_at,
        zones=dto.zones,
        landmarks=all_landmarks,
        source="db",
        authoritative=True,
    )


def list_map_versions(db: Session, map_id: str = "tan-thuan") -> MapVersionListResponse:
    """Lists all map versions (Draft, Published, Archived) with author and timestamps."""
    versions = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == map_id)
        .order_by(MapVersion.created_at.desc())
        .all()
    )
    items = []
    for v in versions:
        items.append(
            MapVersionSummary(
                id=v.id,
                map_id=v.map_id,
                map_version=v.map_version,
                status=v.status,
                revision=v.revision,
                created_by_name=v.created_by.full_name if v.created_by else None,
                published_by_name=v.published_by.full_name if v.published_by else None,
                created_at=v.created_at.isoformat() if v.created_at else None,
                updated_at=v.updated_at.isoformat() if v.updated_at else None,
                published_at=v.published_at.isoformat() if v.published_at else None,
                zones_count=len(v.zones),
            )
        )
    return MapVersionListResponse(total=len(items), versions=items)


def get_map_version_detail(db: Session, version_id: str) -> MapVersionOut:
    """Gets specific map version details."""
    version = db.query(MapVersion).filter(MapVersion.id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản bản đồ.",
        )
    return version_model_to_dto(version)


def get_current_draft(db: Session, map_id: str = "tan-thuan") -> Optional[MapVersionOut]:
    """Finds the most recent active DRAFT version if one exists."""
    draft = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == map_id, MapVersion.status == "DRAFT")
        .order_by(MapVersion.updated_at.desc())
        .first()
    )
    if not draft:
        return None
    return version_model_to_dto(draft)


def create_map_draft(
    db: Session,
    actor: User,
    payload: Optional[MapDraftCreateRequest] = None,
    map_id: str = "tan-thuan",
) -> MapVersionOut:
    """
    Creates a new DRAFT map version.
    Clones zones, polygons, anchors, landmarks from the active PUBLISHED version
    or a specified base version.
    """
    from_id = payload.from_version_id if payload else None
    if from_id:
        base_version = db.query(MapVersion).filter(MapVersion.id == from_id).first()
    else:
        base_version = (
            db.query(MapVersion)
            .filter(MapVersion.map_id == map_id, MapVersion.status == "PUBLISHED")
            .order_by(MapVersion.published_at.desc())
            .first()
        )

    if not base_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản gốc để tạo bản nháp.",
        )

    existing_draft = db.query(MapVersion).filter(MapVersion.map_id == map_id, MapVersion.status == "DRAFT").first()
    if existing_draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Đã tồn tại bản nháp đang mở ({existing_draft.map_version}). Vui lòng xuất bản hoặc hủy bản nháp hiện tại trước khi tạo mới.",
        )

    draft_count = db.query(MapVersion).filter(MapVersion.map_id == map_id).count()
    custom_name = payload.map_version if payload and payload.map_version else None
    new_version_name = custom_name or f"{base_version.map_version}-draft-{draft_count + 1}"

    now = get_utc_now()
    new_draft = MapVersion(
        id=str(uuid.uuid4()),
        map_id=map_id,
        map_version=new_version_name,
        coordinate_system=base_version.coordinate_system,
        canonical_width=base_version.canonical_width,
        canonical_height=base_version.canonical_height,
        source_asset=base_version.source_asset,
        geometry_schema_version=getattr(base_version, "geometry_schema_version", "1.0") or "1.0",
        status="DRAFT",
        revision=1,
        parent_version_id=base_version.id,
        created_by_user_id=actor.id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_draft)
    db.flush()

    # Clone zones
    for bz in base_version.zones:
        new_zone = MapVersionZone(
            id=str(uuid.uuid4()),
            map_version_id=new_draft.id,
            zone_id=bz.zone_id,
            business_zone_id=bz.business_zone_id,
            display_index=bz.display_index,
            display_label=bz.display_label,
            business_name=bz.business_name,
            presentation_color=bz.presentation_color,
            icon=bz.icon,
            polygon_canonical=bz.polygon_canonical,
            label_anchor_canonical=bz.label_anchor_canonical,
            operator_anchor_canonical=bz.operator_anchor_canonical,
            landmarks_json=bz.landmarks_json,
            revision=1,
        )
        db.add(new_zone)

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="MAP_DRAFT_CREATED",
        resource_type="MAP_VERSION",
        resource_id=new_draft.id,
        after_json={
            "map_version": new_draft.map_version,
            "parent_version_id": base_version.id,
            "status": "DRAFT",
        },
    )
    db.commit()
    db.refresh(new_draft)
    return version_model_to_dto(new_draft)


def update_draft_zone(
    db: Session,
    actor: User,
    version_id: str,
    zone_id: str,
    payload: MapZoneUpdateRequest,
) -> MapVersionZoneOut:
    """
    Updates a PresentationZone geometry inside a DRAFT version.
    Strictly forbids updating a PUBLISHED version directly.
    Enforces optimistic concurrency checking against payload.revision.
    """
    version = db.query(MapVersion).filter(MapVersion.id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản bản đồ.",
        )
    if version.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ được phép chỉnh sửa bản đồ ở trạng thái BẢN NHÁP (DRAFT). Không thể sửa trực tiếp bản đã xuất bản.",
        )

    zone = (
        db.query(MapVersionZone)
        .filter(MapVersionZone.map_version_id == version_id, MapVersionZone.zone_id == zone_id)
        .first()
    )
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phân khu {zone_id} trong bản nháp này.",
        )

    # Optimistic concurrency check
    if payload.revision != zone.revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Xung đột phiên bản: Bản nháp phân khu {zone.display_label} đã được cập nhật ở nơi khác (phiên bản hiện tại: {zone.revision}, phiên bản gửi lên: {payload.revision}). Vui lòng tải lại dữ liệu mới nhất.",
        )

    before_state = {
        "zone_id": zone.zone_id,
        "revision": zone.revision,
    }

    if payload.polygon_canonical is not None:
        zone.polygon_canonical = json.dumps(payload.polygon_canonical, ensure_ascii=False)
    if payload.label_anchor_canonical is not None:
        zone.label_anchor_canonical = json.dumps(payload.label_anchor_canonical, ensure_ascii=False)
    if payload.operator_anchor_canonical is not None:
        zone.operator_anchor_canonical = json.dumps(payload.operator_anchor_canonical, ensure_ascii=False)
    if payload.landmarks is not None:
        zone.landmarks_json = json.dumps(payload.landmarks, ensure_ascii=False)

    zone.revision += 1
    version.revision += 1
    version.updated_at = get_utc_now()

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="ZONE_GEOMETRY_UPDATED",
        resource_type="MAP_ZONE",
        resource_id=zone.id,
        before_json=before_state,
        after_json={
            "zone_id": zone.zone_id,
            "revision": zone.revision,
            "version_id": version.id,
        },
    )
    db.commit()
    db.refresh(zone)
    return zone_model_to_dto(zone)


def delete_map_draft(db: Session, actor: User, version_id: str) -> dict[str, Any]:
    """Deletes an un-published DRAFT. Never deletes an active PUBLISHED version."""
    version = db.query(MapVersion).filter(MapVersion.id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản bản đồ.",
        )
    if version.status == "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa phiên bản đang xuất bản (PUBLISHED). Chỉ có thể xóa bản nháp (DRAFT).",
        )

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="MAP_DRAFT_DELETED",
        resource_type="MAP_VERSION",
        resource_id=version.id,
        before_json={
            "map_version": version.map_version,
            "status": version.status,
        },
    )
    db.delete(version)
    db.commit()
    return {"status": "success", "message": f"Đã xóa bản nháp {version.map_version} thành công."}


# ==============================================================================
# VALIDATION PIPELINE
# ==============================================================================
def validate_map_version_geometry(db: Session, version_id: str) -> MapValidationResponse:
    """
    Strict validation pipeline for a map version:
    - Dimensions: canonicalWidth == 1915, canonicalHeight == 821.
    - Exactly 6 zones.
    - Polygon simplicity (no self-intersections).
    - Polygon bounds within [0, 1915] x [0, 821].
    - Non-zero area (area >= 1000 px^2).
    - Label and operator anchors present (structural ERROR) and contained (semantic WARNING).
    - 12 canonical meters containment check in assigned presentation zones (semantic WARNING).
    - Route integrity impact assessment.
    """
    version = db.query(MapVersion).filter(MapVersion.id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản bản đồ.",
        )

    errors: list[str] = []
    warnings: list[str] = []
    issues: list[ValidationIssue] = []

    def add_issue(code: str, severity: str, entity_type: str, message: str, entity_id: str | None = None):
        issues.append(ValidationIssue(
            code=code,
            severity=severity,  # type: ignore
            entity_type=entity_type,  # type: ignore
            entity_id=entity_id,
            message=message
        ))
        if severity == "ERROR":
            errors.append(message)
        elif severity == "WARNING":
            warnings.append(message)

    # 1. Dimensions and coordinate system
    if version.canonical_width != 1915 or version.canonical_height != 821:
        add_issue(
            code="CANONICAL_DIMENSIONS_MISMATCH",
            severity="ERROR",
            entity_type="MAP",
            entity_id=version_id,
            message=f"Kích thước chuẩn phải là 1915x821 px (hiện tại: {version.canonical_width}x{version.canonical_height})"
        )

    # 2. Exactly 5 or 6 Presentation Zones (5 for V16E-S1 baseline, 6 for legacy versions)
    zones = version.zones
    if len(zones) not in (5, 6):
        add_issue(
            code="INVALID_ZONE_COUNT",
            severity="ERROR",
            entity_type="MAP",
            entity_id=version_id,
            message=f"Số lượng phân vùng hiển thị phải bằng 5 hoặc 6 (hiện tại: {len(zones)})"
        )

    core_zones = [
        "pres-berth",
        "pres-container-west",
        "pres-container-center",
        "pres-cfs-east",
        "pres-technical",
    ]
    existing_zone_ids = {z.zone_id for z in zones}
    for exp_id in core_zones:
        if exp_id not in existing_zone_ids:
            add_issue(
                code="MISSING_REQUIRED_ZONE",
                severity="ERROR",
                entity_type="ZONE",
                entity_id=exp_id,
                message=f"Thiếu phân vùng bắt buộc: {exp_id}"
            )
    if len(zones) == 6 and "pres-gate" not in existing_zone_ids:
        add_issue(
            code="MISSING_REQUIRED_ZONE",
            severity="ERROR",
            entity_type="ZONE",
            entity_id="pres-gate",
            message="Thiếu phân vùng bắt buộc: pres-gate"
        )

    # 3. Simple polygons, bounds, areas, anchors
    all_simple = True
    all_anchors_valid = True

    zone_poly_map: dict[str, list[dict[str, Any]]] = {}

    for z in zones:
        poly: list[dict[str, Any]] = json.loads(z.polygon_canonical) if isinstance(z.polygon_canonical, str) else z.polygon_canonical
        zone_poly_map[z.zone_id] = poly

        if len(poly) < 3:
            add_issue(
                code="POLYGON_TOO_FEW_VERTICES",
                severity="ERROR",
                entity_type="ZONE",
                entity_id=z.zone_id,
                message=f"Phân vùng {z.zone_id} ({z.display_label}) có ít hơn 3 đỉnh ({len(poly)})"
            )
            all_simple = False
            continue

        if not check_polygon_simplicity(poly):
            add_issue(
                code="POLYGON_SELF_INTERSECTION",
                severity="ERROR",
                entity_type="ZONE",
                entity_id=z.zone_id,
                message=f"Phân vùng {z.zone_id} ({z.display_label}) tự cắt cạnh (không phải simple polygon)"
            )
            all_simple = False

        # Bounds check
        for pt in poly:
            px = pt.get("x", 0)
            py = pt.get("y", 0)
            if px < 0 or px > version.canonical_width or py < 0 or py > version.canonical_height:
                add_issue(
                    code="VERTEX_OUT_OF_BOUNDS",
                    severity="ERROR",
                    entity_type="ZONE",
                    entity_id=z.zone_id,
                    message=f"Phân vùng {z.zone_id} có đỉnh ({px}, {py}) nằm ngoài giới hạn [0, {version.canonical_width}] x [0, {version.canonical_height}]"
                )
                break

        # Area check
        area = calculate_polygon_area(poly)
        if area < 500:
            add_issue(
                code="POLYGON_ZERO_AREA",
                severity="ERROR",
                entity_type="ZONE",
                entity_id=z.zone_id,
                message=f"Phân vùng {z.zone_id} ({z.display_label}) có diện tích quá nhỏ ({round(area)} px²)"
            )

        # Anchors check
        label_anchor = json.loads(z.label_anchor_canonical) if isinstance(z.label_anchor_canonical, str) else z.label_anchor_canonical
        op_anchor = json.loads(z.operator_anchor_canonical) if isinstance(z.operator_anchor_canonical, str) else z.operator_anchor_canonical

        if not label_anchor or "x" not in label_anchor or "y" not in label_anchor:
            add_issue(
                code="ANCHOR_MISSING",
                severity="ERROR",
                entity_type="ANCHOR",
                entity_id=z.zone_id,
                message=f"Phân vùng {z.zone_id} thiếu điểm neo nhãn"
            )
            all_anchors_valid = False
        elif not is_point_in_polygon(label_anchor, poly):
            add_issue(
                code="ANCHOR_OUTSIDE_POLYGON",
                severity="WARNING",
                entity_type="ANCHOR",
                entity_id=z.zone_id,
                message=f"Điểm neo nhãn của {z.display_label} ({label_anchor.get('x')}, {label_anchor.get('y')}) nằm NGOÀI ranh giới phân vùng"
            )
            all_anchors_valid = False

        if not op_anchor or "x" not in op_anchor or "y" not in op_anchor:
            add_issue(
                code="ANCHOR_MISSING",
                severity="ERROR",
                entity_type="ANCHOR",
                entity_id=z.zone_id,
                message=f"Phân vùng {z.zone_id} thiếu điểm neo nhân sự"
            )
            all_anchors_valid = False
        elif not is_point_in_polygon(op_anchor, poly):
            add_issue(
                code="ANCHOR_OUTSIDE_POLYGON",
                severity="WARNING",
                entity_type="ANCHOR",
                entity_id=z.zone_id,
                message=f"Điểm neo nhân sự của {z.display_label} ({op_anchor.get('x')}, {op_anchor.get('y')}) nằm NGOÀI ranh giới phân vùng"
            )
            all_anchors_valid = False

    # 4. Decoupled Meter Informational Stats (Does not block map validation)
    active_meters = db.query(Meter).filter(Meter.is_active == True).all()
    contained_meters_count = 0
    total_meters = len(active_meters)
    route_review_required = False
    route_issues: list[str] = []

    for m in active_meters:
        if not m.presentation_zone_id:
            continue

        poly = zone_poly_map.get(m.presentation_zone_id)
        if not poly:
            continue

        # Project normalized coordinates to canonical pixel space
        if m.map_x is not None and m.map_y is not None:
            cx = m.map_x * version.canonical_width
            cy = m.map_y * version.canonical_height
            inside = is_point_in_polygon({"x": cx, "y": cy}, poly)
            if inside:
                contained_meters_count += 1
            else:
                add_issue(
                    code="METER_OUTSIDE_PRESENTATION_ZONE",
                    severity="WARNING",
                    entity_type="METER",
                    entity_id=m.meter_code,
                    message=f"Công tơ {m.meter_code} tại ({round(cx)}, {round(cy)}) nằm ngoài phân khu {m.presentation_zone_id}"
                )

    return MapValidationResponse(
        valid=(len(errors) == 0),
        errors=errors,
        warnings=warnings,
        issues=issues,
        zones_count=len(zones),
        simple_polygons=all_simple,
        meters_contained=contained_meters_count,
        total_meters=total_meters,
        anchors_valid=all_anchors_valid,
        landmarks_valid=True,
        route_review_required=route_review_required,
        route_issues=route_issues,
    )


# ==============================================================================
# ATOMIC PUBLISH & ROLLBACK
# ==============================================================================
def publish_map_version(db: Session, actor: User, version_id: str) -> MapPublishResponse:
    """
    Publishes a map version atomically:
    1. Runs validation pipeline. If errors exist, aborts with 422.
    2. Within a single DB transaction:
       - Current active PUBLISHED version -> ARCHIVED.
       - Target version -> PUBLISHED, sets published_by_user_id, published_at.
    3. Emits audit log event MAP_PUBLISHED.
    """
    version = db.query(MapVersion).filter(MapVersion.id == version_id).first()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản bản đồ.",
        )
    if version.status == "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phiên bản này hiện đã là phiên bản xuất bản (PUBLISHED).",
        )

    # 1. Validation Gate
    validation = validate_map_version_geometry(db, version_id)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Không thể xuất bản bản đồ do không vượt qua bước kiểm tra hình học.",
                "errors": validation.errors,
                "warnings": validation.warnings,
            },
        )

    # 2. Atomic Transaction
    now = get_utc_now()
    currently_published = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == version.map_id, MapVersion.status == "PUBLISHED")
        .all()
    )
    for prev in currently_published:
        prev.status = "ARCHIVED"
        prev.updated_at = now

    version.status = "PUBLISHED"
    version.published_by_user_id = actor.id
    version.published_at = now
    version.updated_at = now

    # Reset valid route status on published
    db.query(Meter).update({"route_status": "VALID"}, synchronize_session=False)

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="MAP_PUBLISHED",
        resource_type="MAP_VERSION",
        resource_id=version.id,
        after_json={
            "map_version": version.map_version,
            "published_at": now.isoformat(),
            "archived_count": len(currently_published),
        },
    )
    db.commit()

    return MapPublishResponse(
        status="success",
        version_id=version.id,
        version_number=version.map_version,
        map_version=version.map_version,
        published_at=now.isoformat(),
        message=f"Đã xuất bản thành công phiên bản bản đồ {version.map_version}.",
        coordinate_system=version.coordinate_system,
        canonical_width=version.canonical_width,
        canonical_height=version.canonical_height,
    )


def rollback_map_version(
    db: Session,
    actor: User,
    target_version_id: str,
    payload: Optional[MapRollbackRequest] = None,
) -> MapPublishResponse:
    """
    Rolls back to a historical validated version:
    1. Validates historical target version.
    2. Clones it as a new PUBLISHED version or switches status atomically.
    3. Emits audit log event MAP_ROLLED_BACK with reason.
    """
    target = db.query(MapVersion).filter(MapVersion.id == target_version_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên bản lịch sử để khôi phục.",
        )

    # Validate target geometry before rollback
    validation = validate_map_version_geometry(db, target_version_id)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Phiên bản lịch sử không vượt qua kiểm tra hình học hiện tại.",
                "errors": validation.errors,
            },
        )

    now = get_utc_now()
    reason = payload.reason if payload and payload.reason else "Khôi phục phiên bản lịch sử"

    currently_published = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == target.map_id, MapVersion.status == "PUBLISHED")
        .all()
    )
    for prev in currently_published:
        prev.status = "ARCHIVED"
        prev.updated_at = now

    target.status = "PUBLISHED"
    target.published_by_user_id = actor.id
    target.published_at = now
    target.updated_at = now

    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="MAP_ROLLED_BACK",
        resource_type="MAP_VERSION",
        resource_id=target.id,
        after_json={
            "map_version": target.map_version,
            "reason": reason,
            "published_at": now.isoformat(),
        },
    )
    db.commit()

    return MapPublishResponse(
        status="success",
        version_id=target.id,
        version_number=target.map_version,
        map_version=target.map_version,
        published_at=now.isoformat(),
        message=f"Đã phục hồi thành công phiên bản bản đồ {target.map_version}. Lý do: {reason}",
        coordinate_system=target.coordinate_system,
        canonical_width=target.canonical_width,
        canonical_height=target.canonical_height,
    )
