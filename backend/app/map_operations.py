from datetime import datetime, timezone
from typing import Optional
import json
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .admin import format_date_vn, get_admin_dashboard, get_local_time_str, log_admin_action
from .models import (
    Meter,
    MeterReading,
    OperationalZone,
    User,
    ZoneAssignment,
)
from .schemas import (
    MapMeterOut,
    MapOverviewResponse,
    OperationalZoneOut,
    UserOut,
    ZoneReassignRequest,
    ZoneReassignResponse,
)


def get_map_zones(db: Session) -> list[OperationalZoneOut]:
    """Returns active operational zones with primary assigned operators."""
    zones = (
        db.query(OperationalZone)
        .filter(OperationalZone.is_active == True)
        .order_by(OperationalZone.code.asc())
        .all()
    )

    result: list[OperationalZoneOut] = []
    for z in zones:
        # Find active primary assignment
        assign = (
            db.query(ZoneAssignment)
            .filter(
                ZoneAssignment.zone_id == z.id,
                ZoneAssignment.is_active == True,
            )
            .order_by(ZoneAssignment.effective_from.desc())
            .first()
        )

        assigned_user_out = None
        if assign and assign.user:
            u = assign.user
            assigned_user_out = UserOut(
                id=u.id,
                employee_code=u.employee_code,
                full_name=u.full_name,
                role=u.role,
                is_active=u.is_active,
                created_at=u.created_at.isoformat(),
            )

        total_m = db.query(Meter).filter(Meter.zone_id == z.id, Meter.is_active == True).count()

        result.append(
            OperationalZoneOut(
                id=z.id,
                code=z.code,
                name=z.name,
                description=z.description,
                map_polygon=z.map_polygon,
                is_active=z.is_active,
                assigned_user=assigned_user_out,
                total_meters=total_m,
            )
        )

    return result


def get_map_overview(
    db: Session,
    date_str: Optional[str] = None,
) -> MapOverviewResponse:
    """
    Consolidated map operational overview projection.
    Reuses canonical operational logic from get_admin_dashboard to guarantee
    100% KPI consistency and zero duplicate business rules.
    """
    dash = get_admin_dashboard(db, date_str=date_str)
    zones = (
        db.query(OperationalZone)
        .filter(OperationalZone.is_active == True)
        .order_by(OperationalZone.code.asc())
        .all()
    )

    all_meters = (
        db.query(Meter)
        .order_by(Meter.meter_code.asc())
        .all()
    )

    # Pre-fetch active zone assignments
    active_assignments = (
        db.query(ZoneAssignment)
        .filter(ZoneAssignment.is_active == True)
        .all()
    )
    zone_user_map: dict[str, User] = {}
    for a in active_assignments:
        if a.user:
            zone_user_map[a.zone_id] = a.user

    # Index exceptions by meter_id and meter_code
    exc_by_meter_id = {e.meter_id: e for e in dash.exceptions}
    exc_by_meter_code = {e.meter_code: e for e in dash.exceptions}

    # Pre-fetch latest confirmed reading per meter
    all_readings = (
        db.query(MeterReading)
        .order_by(MeterReading.server_timestamp.desc())
        .all()
    )
    latest_readings: dict[str, MeterReading] = {}
    for r in all_readings:
        if r.meter_id not in latest_readings and r.status == "CONFIRMED" and r.reading:
            latest_readings[r.meter_id] = r

    # Index locations/progress by meter code
    meters_out: list[MapMeterOut] = []
    zone_metrics: dict[str, dict[str, int]] = {
        z.id: {
            "total": 0,
            "confirmed": 0,
            "review": 0,
            "overdue": 0,
            "due": 0,
            "pending": 0,
        }
        for z in zones
    }

    is_current_open = (dash.kpis.current_round_status == "Đang mở")

    for m in all_meters:
        latest_r = latest_readings.get(m.id)
        has_reading = (latest_r is not None)

        # Determine semantic state
        state = "PENDING"
        exc_state = None
        exc_label = None
        reading_id = latest_r.id if latest_r else None

        exc = exc_by_meter_id.get(m.id) or exc_by_meter_code.get(m.meter_code)
        if not m.is_active:
            state = "INACTIVE"
        elif exc:
            if exc.exception_state == "REVIEW":
                state = "REVIEW"
                exc_state = "REVIEW"
                exc_label = exc.exception_label
                reading_id = exc.reading_id
            elif exc.exception_state == "MISSING":
                state = "OVERDUE"
                exc_state = "MISSING"
                exc_label = exc.exception_label
        elif has_reading:
            state = "CONFIRMED"
        elif is_current_open:
            state = "DUE"
        else:
            state = "PENDING"

        # Lookup zone details
        z_obj = next((z for z in zones if z.id == m.zone_id), None)
        z_code = z_obj.code if z_obj else None
        z_name = z_obj.name if z_obj else None

        # Track metrics
        if m.zone_id and m.zone_id in zone_metrics and m.is_active:
            z_m = zone_metrics[m.zone_id]
            z_m["total"] += 1
            if state == "CONFIRMED":
                z_m["confirmed"] += 1
            elif state == "REVIEW":
                z_m["review"] += 1
            elif state == "OVERDUE":
                z_m["overdue"] += 1
            elif state == "DUE":
                z_m["due"] += 1
            elif state == "PENDING":
                z_m["pending"] += 1

        meters_out.append(
            MapMeterOut(
                id=m.id,
                meter_code=m.meter_code,
                name=m.name,
                location=m.location,
                meter_type=m.meter_type,
                zone_id=m.zone_id,
                zone_code=z_code,
                zone_name=z_name,
                map_x=m.map_x,
                map_y=m.map_y,
                is_active=m.is_active,
                semantic_state=state,
                latest_reading_value=latest_r.reading if latest_r else None,
                latest_reading_time=get_local_time_str(latest_r.server_timestamp) if latest_r and latest_r.server_timestamp else None,
                exception_state=exc_state,
                exception_label=exc_label,
                reading_id=reading_id,
            )
        )

    # Build zones out
    zones_out: list[OperationalZoneOut] = []
    for z in zones:
        z_m = zone_metrics.get(z.id, {"total": 0, "confirmed": 0, "review": 0, "overdue": 0, "due": 0, "pending": 0})
        total_m = z_m["total"]
        conf_m = z_m["confirmed"]
        pct = round((conf_m / total_m * 100), 1) if total_m > 0 else 0.0

        user = zone_user_map.get(z.id)
        user_out = None
        if user:
            user_out = UserOut(
                id=user.id,
                employee_code=user.employee_code,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
            )

        zones_out.append(
            OperationalZoneOut(
                id=z.id,
                code=z.code,
                name=z.name,
                description=z.description,
                map_polygon=z.map_polygon,
                is_active=z.is_active,
                assigned_user=user_out,
                total_meters=total_m,
                confirmed_count=conf_m,
                review_count=z_m["review"],
                overdue_count=z_m["overdue"],
                due_count=z_m["due"],
                pending_count=z_m["pending"],
                completion_percent=pct,
            )
        )

    return MapOverviewResponse(
        target_date=dash.date,
        target_date_vn=dash.date_formatted,
        current_round_time=dash.kpis.current_round_time,
        current_round_status=dash.kpis.current_round_status,
        total_meters=len(all_meters),
        confirmed_count=dash.kpis.confirmed_slots,
        review_count=dash.kpis.review_count,
        overdue_count=dash.kpis.actionable_count - dash.kpis.review_count,
        due_count=dash.kpis.due_slots - dash.kpis.confirmed_slots - dash.kpis.review_count if dash.kpis.due_slots > 0 else 0,
        pending_count=max(0, len(all_meters) - dash.kpis.confirmed_slots - dash.kpis.review_count),
        completion_percent=dash.kpis.completion_percent,
        zones=zones_out,
        meters=meters_out,
        exceptions_count=len(dash.exceptions),
    )


def reassign_zone_operator(
    db: Session,
    actor: User,
    zone_id: str,
    payload: ZoneReassignRequest,
) -> ZoneReassignResponse:
    """
    Reassigns primary operator for an operational zone and produces an immutable audit log.
    """
    zone = db.query(OperationalZone).filter(OperationalZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khu vực tác nghiệp với ID: {zone_id}",
        )

    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhân sự với ID: {payload.user_id}",
        )

    now_utc = datetime.now(timezone.utc)

    # Capture before state for audit log
    current_active = (
        db.query(ZoneAssignment)
        .filter(ZoneAssignment.zone_id == zone.id, ZoneAssignment.is_active == True)
        .first()
    )
    before_json = {
        "zone_id": zone.id,
        "zone_code": zone.code,
        "previous_user_id": current_active.user_id if current_active else None,
        "previous_user_name": current_active.user.full_name if current_active and current_active.user else None,
    }

    # Deactivate current assignment
    if current_active:
        current_active.is_active = False
        current_active.effective_to = now_utc

    # Create new assignment
    new_assign = ZoneAssignment(
        id=str(uuid.uuid4()),
        zone_id=zone.id,
        user_id=target_user.id,
        assignment_role=payload.assignment_role or "PRIMARY",
        effective_from=now_utc,
        effective_to=None,
        is_active=True,
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(new_assign)

    after_json = {
        "zone_id": zone.id,
        "zone_code": zone.code,
        "new_user_id": target_user.id,
        "new_user_name": target_user.full_name,
        "assignment_role": new_assign.assignment_role,
        "note": payload.note,
    }

    # Record Admin Audit Log
    log_admin_action(
        db=db,
        actor_user_id=actor.id,
        action="ZONE_OPERATOR_REASSIGNED",
        resource_type="ZONE_ASSIGNMENT",
        resource_id=new_assign.id,
        before_json=before_json,
        after_json=after_json,
    )

    db.commit()
    db.refresh(new_assign)

    return ZoneReassignResponse(
        status="success",
        message=f"Đã cập nhật phụ trách khu vực '{zone.name}' cho nhân sự {target_user.full_name}.",
        zone_id=zone.id,
        user_id=target_user.id,
        user_name=target_user.full_name,
    )


def get_map_operators(db: Session) -> list[UserOut]:
    """Returns active operators and staff available for zone assignment."""
    users = (
        db.query(User)
        .filter(User.is_active == True)
        .order_by(User.employee_code.asc())
        .all()
    )
    return [
        UserOut(
            id=u.id,
            employee_code=u.employee_code,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]

