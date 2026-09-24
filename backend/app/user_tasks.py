"""User task projection service: derives operational reading tasks by intersecting
ReadingRoundMeter scope with active OperationalAssignment records.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from zoneinfo import ZoneInfo
from types import SimpleNamespace

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .models import (
    Meter,
    MeterReading,
    OperationalAssignment,
    OperationalZone,
    ReadingBatch,
    ReadingRound,
    ReadingRoundMeter,
    User,
)
from .operational_assignments import LOCAL_TZ, shift_window
from .meter_logbook import (
    calculate_batch_progress,
    calculate_round_progress,
    determine_round_timing_state,
    get_current_or_nearest_round,
    get_local_time_str,
    get_open_reading_batch,
    get_round_local_time_str,
    get_round_time_only_str,
    to_utc_datetime,
)
from .schemas import (
    BatchProgress,
    LatestConfirmedReading,
    MeterOut,
    MeterTrendPoint,
    ReadingBatchCurrentResponse,
    ReadingRoundOut,
    RecentHourlySlot,
    RecordedByOut,
    TodayHourlySlot,
    UserAssignedZoneContext,
    UserAssignmentContext,
    UserRoundTaskItem,
    UserTaskCoverageDiagnostics,
    UserTasksResponse,
    UserTaskSummary,
)


def get_covering_assignments_for_round(
    db: Session,
    user_id: Optional[str],
    round_obj: ReadingRound,
) -> list[OperationalAssignment]:
    """Finds all active OperationalAssignment records covering the round's scheduled timestamp.

    If user_id is provided, filters to that user. If user_id is None, returns assignments for all users.
    Evaluates half-open interval [start, end) in Asia/Ho_Chi_Minh timezone.
    """
    r_sched = (
        round_obj.scheduled_at.replace(tzinfo=timezone.utc)
        if round_obj.scheduled_at.tzinfo is None
        else round_obj.scheduled_at
    )
    r_sched_vn = r_sched.astimezone(LOCAL_TZ)

    curr_date_str = r_sched_vn.date().isoformat()
    prev_date_str = (r_sched_vn.date() - timedelta(days=1)).isoformat()

    query = db.query(OperationalAssignment).filter(
        OperationalAssignment.status.in_(["ASSIGNED", "ACTIVE"]),
        OperationalAssignment.work_date.in_([curr_date_str, prev_date_str]),
    )
    if user_id:
        query = query.filter(OperationalAssignment.user_id == user_id)

    candidates = query.all()
    covering: list[OperationalAssignment] = []
    for assignment in candidates:
        try:
            start_dt, end_dt = shift_window(assignment.work_date, assignment.shift_code)
            if start_dt <= r_sched_vn < end_dt:
                covering.append(assignment)
        except Exception:
            continue

    return covering


def validate_meter_user_task_authority(
    db: Session,
    user: User,
    round_obj: ReadingRound,
    meter_id: str,
) -> None:
    """Enforces that the user has an active OperationalAssignment covering the round's timestamp
    for the meter's assigned zone snapshot.

    Admins have operational wharf-wide override authority.
    Field users must match the task projection scope.
    """
    if user.role == "ADMIN":
        return

    # Determine the target zone from the round scope snapshot (or inventory for legacy dynamic rounds)
    target_zone_id: Optional[str] = None
    if round_obj.scope_mode == "SNAPSHOT":
        scope_item = (
            db.query(ReadingRoundMeter)
            .filter(
                ReadingRoundMeter.reading_round_id == round_obj.id,
                ReadingRoundMeter.meter_id == meter_id,
                ReadingRoundMeter.scope_status == "SCHEDULED",
            )
            .first()
        )
        if not scope_item or not scope_item.zone_id_snapshot:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thao tác trên công tơ này (công tơ chưa được phân khu hoặc ngoài phạm vi).",
            )
        target_zone_id = scope_item.zone_id_snapshot
    else:
        # If legacy dynamic round has zero operational assignments in the system, allow legacy behavior
        all_covering = get_covering_assignments_for_round(db, user_id=None, round_obj=round_obj)
        if not all_covering:
            return
        meter = db.query(Meter).filter(Meter.id == meter_id).first()
        if not meter or not meter.zone_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thao tác trên công tơ này.",
            )
        target_zone_id = meter.zone_id

    covering = get_covering_assignments_for_round(db, user.id, round_obj)
    assigned_zones = {a.zone_id for a in covering}

    if target_zone_id not in assigned_zones:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không được phân công phụ trách công tơ này trong lượt hiện tại.",
        )


def resolve_user_round_tasks(
    db: Session,
    user: User,
    date_filter: Optional[str] = None,
    round_id: Optional[str] = None,
) -> UserTasksResponse:
    """Derives the user's operational task projection for a target round / date.

    Returns the user's personal tasks (strictly assigned meters), assignment context,
    personal progress summary, and truthful empty states.
    Never falls back to global round scope if user has no assignment.
    """
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)

    if date_filter:
        target_date_str = date_filter
    else:
        target_date_str = now_local.strftime("%Y-%m-%d")

    date_formatted = datetime.strptime(target_date_str, "%Y-%m-%d").strftime("%d/%m/%Y")

    batch = get_open_reading_batch(db)
    if not batch:
        return UserTasksResponse(
            date=target_date_str,
            date_formatted=date_formatted,
            batch=None,
            current_round=None,
            nearest_upcoming_round=None,
            assignment_context=UserAssignmentContext(
                work_date=target_date_str,
                shift_code=None,
                is_in_shift=False,
                assigned_zones=[],
            ),
            summary=UserTaskSummary(
                assigned_total=0,
                confirmed=0,
                review=0,
                pending=0,
                percent_complete=0,
                assigned_zone_count=0,
                primary_zone_count=0,
                support_zone_count=0,
            ),
            global_round_total=0,
            empty_reason="NO_ROUND",
            meters=[],
        )

    batch_prog = calculate_batch_progress(db, batch.id)
    batch_out = ReadingBatchCurrentResponse(
        id=batch.id,
        name=batch.name,
        period_key=batch.period_key,
        status=batch.status,
        progress=batch_prog,
    )

    # Resolve target round
    target_round: Optional[ReadingRound] = None
    nearest_upcoming: Optional[ReadingRound] = None

    if round_id:
        target_round = (
            db.query(ReadingRound)
            .filter(
                ReadingRound.id == round_id,
                ReadingRound.batch_id == batch.id,
                ReadingRound.status != "CANCELLED",
            )
            .first()
        )
    else:
        current_r, upcoming_r = get_current_or_nearest_round(db, batch.id, date_filter=target_date_str)
        target_round = current_r
        nearest_upcoming = upcoming_r

    # Prepare round DTOs
    current_round_out: Optional[ReadingRoundOut] = None
    nearest_round_out: Optional[ReadingRoundOut] = None

    if target_round:
        prog = calculate_round_progress(db, target_round.id)
        sched = (
            target_round.scheduled_at.replace(tzinfo=timezone.utc)
            if target_round.scheduled_at.tzinfo is None
            else target_round.scheduled_at
        )
        timing = determine_round_timing_state(sched, now_utc, is_latest_past=True)
        current_round_out = ReadingRoundOut(
            id=target_round.id,
            batch_id=target_round.batch_id,
            scheduled_at=sched.isoformat(),
            scheduled_local=get_round_local_time_str(sched),
            scheduled_time_only=get_round_time_only_str(sched),
            status=target_round.status,
            is_legacy=target_round.is_legacy,
            scope_mode=target_round.scope_mode,
            timing_state=timing,
            progress=prog,
            scope_meter_count=prog.total if target_round.scope_mode == "SNAPSHOT" else None,
        )

    if nearest_upcoming and nearest_upcoming.id != (target_round.id if target_round else None):
        u_sched = (
            nearest_upcoming.scheduled_at.replace(tzinfo=timezone.utc)
            if nearest_upcoming.scheduled_at.tzinfo is None
            else nearest_upcoming.scheduled_at
        )
        u_prog = calculate_round_progress(db, nearest_upcoming.id)
        nearest_round_out = ReadingRoundOut(
            id=nearest_upcoming.id,
            batch_id=nearest_upcoming.batch_id,
            scheduled_at=u_sched.isoformat(),
            scheduled_local=get_round_local_time_str(u_sched),
            scheduled_time_only=get_round_time_only_str(u_sched),
            status=nearest_upcoming.status,
            is_legacy=nearest_upcoming.is_legacy,
            scope_mode=nearest_upcoming.scope_mode,
            timing_state="UPCOMING",
            progress=u_prog,
            scope_meter_count=u_prog.total if nearest_upcoming.scope_mode == "SNAPSHOT" else None,
        )

    # If no active/current round exists
    if not target_round:
        return UserTasksResponse(
            date=target_date_str,
            date_formatted=date_formatted,
            batch=batch_out,
            current_round=None,
            nearest_upcoming_round=nearest_round_out,
            assignment_context=UserAssignmentContext(
                work_date=target_date_str,
                shift_code=None,
                is_in_shift=False,
                assigned_zones=[],
            ),
            summary=UserTaskSummary(
                assigned_total=0,
                confirmed=0,
                review=0,
                pending=0,
                percent_complete=0,
                assigned_zone_count=0,
                primary_zone_count=0,
                support_zone_count=0,
            ),
            global_round_total=0,
            empty_reason="NO_ROUND",
            meters=[],
        )

    # 1. Evaluate covering operational assignments for current user
    covering_assignments = get_covering_assignments_for_round(db, user.id, target_round)

    # Deduplicate assignments per zone for assignment context: prefer PRIMARY over SUPPORT
    zone_assignment_map: dict[str, OperationalAssignment] = {}
    for a in covering_assignments:
        existing = zone_assignment_map.get(a.zone_id)
        if not existing or (a.assignment_role == "PRIMARY" and existing.assignment_role != "PRIMARY"):
            zone_assignment_map[a.zone_id] = a

    assigned_zones_context: list[UserAssignedZoneContext] = []
    zone_name_by_id: dict[str, str] = {}
    if zone_assignment_map:
        zones_in_db = db.query(OperationalZone).filter(OperationalZone.id.in_(list(zone_assignment_map.keys()))).all()
        for z in zones_in_db:
            zone_name_by_id[z.id] = z.name
            assigned_a = zone_assignment_map[z.id]
            assigned_zones_context.append(
                UserAssignedZoneContext(
                    zone_id=z.id,
                    zone_code=z.code,
                    zone_name=z.name,
                    assignment_role=assigned_a.assignment_role,  # type: ignore
                    shift_code=assigned_a.shift_code,
                    work_date=assigned_a.work_date,
                    timing_state="CURRENT",
                )
            )

    shift_code_ctx = covering_assignments[0].shift_code if covering_assignments else None
    work_date_ctx = covering_assignments[0].work_date if covering_assignments else target_date_str
    assignment_context = UserAssignmentContext(
        work_date=work_date_ctx,
        shift_code=shift_code_ctx,
        is_in_shift=bool(covering_assignments),
        assigned_zones=assigned_zones_context,
    )

    # Global round total
    global_round_total = current_round_out.progress.total if current_round_out else 0

    # 2. Case: User has NO active covering assignment for this round
    if not covering_assignments:
        return UserTasksResponse(
            date=target_date_str,
            date_formatted=date_formatted,
            batch=batch_out,
            current_round=current_round_out,
            nearest_upcoming_round=nearest_round_out,
            assignment_context=assignment_context,
            summary=UserTaskSummary(
                assigned_total=0,
                confirmed=0,
                review=0,
                pending=0,
                percent_complete=0,
                assigned_zone_count=0,
                primary_zone_count=0,
                support_zone_count=0,
            ),
            global_round_total=global_round_total,
            empty_reason="NO_ASSIGNMENT",
            meters=[],
        )

    # 3. Intersect round meter scope with user's assigned zones
    assigned_zone_ids = set(zone_assignment_map.keys())

    # Load round scope rows
    candidate_scope_items: list[dict[str, Any]] = []

    if target_round.scope_mode == "SNAPSHOT":
        scope_rows = (
            db.query(ReadingRoundMeter)
            .filter(
                ReadingRoundMeter.reading_round_id == target_round.id,
                ReadingRoundMeter.scope_status == "SCHEDULED",
            )
            .all()
        )
        for r_meter in scope_rows:
            # Must join by zone_id_snapshot, NOT current meter.zone_id
            if r_meter.zone_id_snapshot in assigned_zone_ids:
                candidate_scope_items.append({
                    "scope_item_id": r_meter.id,
                    "meter_id": r_meter.meter_id,
                    "meter_code_snapshot": r_meter.meter_code_snapshot,
                    "meter_name_snapshot": r_meter.meter_name_snapshot,
                    "zone_id_snapshot": r_meter.zone_id_snapshot,
                    "presentation_zone_id_snapshot": r_meter.presentation_zone_id_snapshot,
                    "utility_type_snapshot": r_meter.utility_type_snapshot,
                })
    else:
        # Legacy dynamic compatibility
        active_meters = (
            db.query(Meter)
            .filter(
                Meter.is_active == True,
                Meter.zone_id.in_(list(assigned_zone_ids)),
            )
            .all()
        )
        for m in active_meters:
            candidate_scope_items.append({
                "scope_item_id": None,
                "meter_id": m.id,
                "meter_code_snapshot": m.meter_code,
                "meter_name_snapshot": m.name,
                "zone_id_snapshot": m.zone_id,
                "presentation_zone_id_snapshot": m.presentation_zone_id,
                "utility_type_snapshot": m.utility_type,
            })

    # 4. Check if assigned zones have 0 scheduled meters in this round
    if not candidate_scope_items:
        return UserTasksResponse(
            date=target_date_str,
            date_formatted=date_formatted,
            batch=batch_out,
            current_round=current_round_out,
            nearest_upcoming_round=nearest_round_out,
            assignment_context=assignment_context,
            summary=UserTaskSummary(
                assigned_total=0,
                confirmed=0,
                review=0,
                pending=0,
                percent_complete=0,
                total_meters=0,
                confirmed_current=0,
                review_current=0,
                pending_current=0,
                assigned_zone_count=0,
                primary_zone_count=sum(1 for a in zone_assignment_map.values() if a.assignment_role == "PRIMARY"),
                support_zone_count=sum(1 for a in zone_assignment_map.values() if a.assignment_role == "SUPPORT"),
            ),
            global_round_total=global_round_total,
            empty_reason="NO_METERS_IN_ZONE",
            meters=[],
        )

    # 5. Hydrate meters and readings
    meter_ids = [item["meter_id"] for item in candidate_scope_items if item["meter_id"]]
    meters_by_id: dict[str, Meter] = {}
    if meter_ids:
        meters_db = db.query(Meter).filter(Meter.id.in_(meter_ids)).all()
        meters_by_id = {m.id: m for m in meters_db}

    # Query all readings for this round
    round_readings = (
        db.query(MeterReading)
        .filter(MeterReading.reading_round_id == target_round.id)
        .all()
    )
    readings_by_meter: dict[str, MeterReading] = {r.meter_id: r for r in round_readings}

    # Query latest confirmed reading for each meter (across historical rounds)
    all_batch_readings = (
        db.query(MeterReading)
        .filter(MeterReading.batch_id == batch.id, MeterReading.status == "CONFIRMED")
        .all()
    )
    all_batch_readings.sort(key=lambda x: to_utc_datetime(x.server_timestamp), reverse=True)
    latest_confirmed_map: dict[str, MeterReading] = {}
    for r in all_batch_readings:
        if r.meter_id not in latest_confirmed_map:
            latest_confirmed_map[r.meter_id] = r

    # Query today's scheduled rounds for slot history
    all_today_rounds = (
        db.query(ReadingRound)
        .filter(
            ReadingRound.batch_id == batch.id,
            ReadingRound.is_legacy == False,
            ReadingRound.status != "CANCELLED",
        )
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )
    today_rounds_filtered: list[ReadingRound] = []
    for r in all_today_rounds:
        r_s = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        if r_s.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str:
            today_rounds_filtered.append(r)

    # Fetch batch readings map for today slots
    batch_readings_all = db.query(MeterReading).filter(MeterReading.batch_id == batch.id).all()
    batch_reading_map: dict[tuple[str, str], MeterReading] = {
        (r.meter_id, r.reading_round_id): r for r in batch_readings_all
    }

    # 6. Build UserRoundTaskItem list
    task_items: list[UserRoundTaskItem] = []
    seen_meter_ids: set[str] = set()

    for item in candidate_scope_items:
        m_id = item["meter_id"] or item["scope_item_id"]
        # Deduplication check: 1 task per reading_round_id + meter_id
        if m_id in seen_meter_ids:
            continue
        seen_meter_ids.add(m_id)

        zone_id = item["zone_id_snapshot"]
        assignment_for_zone = zone_assignment_map.get(zone_id)
        role = assignment_for_zone.assignment_role if assignment_for_zone else "PRIMARY"
        a_id = assignment_for_zone.id if assignment_for_zone else None

        zone_name = zone_name_by_id.get(zone_id) or item["meter_name_snapshot"] or ""

        # Meter model or synthetic object
        m_obj = meters_by_id.get(item["meter_id"])
        if m_obj:
            meter_out = MeterOut(
                id=m_obj.id,
                meter_code=m_obj.meter_code,
                name=m_obj.name,
                location=m_obj.location,
                meter_type=m_obj.meter_type,
                utility_type=m_obj.utility_type,
                is_active=m_obj.is_active,
                lifecycle_status=getattr(m_obj, "lifecycle_status", "ACTIVE"),
                zone_id=m_obj.zone_id,
                presentation_zone_id=m_obj.presentation_zone_id,
                map_x=m_obj.map_x,
                map_y=m_obj.map_y,
                route_status=getattr(m_obj, "route_status", "VALID"),
                created_at=m_obj.created_at.isoformat() if m_obj.created_at else None,
            )
            availability_state = getattr(m_obj, "lifecycle_status", "AVAILABLE")
        else:
            meter_out = MeterOut(
                id=item["meter_id"] or item["scope_item_id"],
                meter_code=item["meter_code_snapshot"],
                name=item["meter_name_snapshot"] or item["meter_code_snapshot"],
                location=None,
                meter_type="UNKNOWN",
                utility_type=item["utility_type_snapshot"] or "UNKNOWN",
                is_active=False,
                lifecycle_status="MISSING",
                zone_id=item["zone_id_snapshot"],
                presentation_zone_id=item["presentation_zone_id_snapshot"],
                map_x=None,
                map_y=None,
                route_status="VALID",
                created_at=None,
            )
            availability_state = "MISSING"

        # Reading status for target round
        target_reading = readings_by_meter.get(item["meter_id"]) if item["meter_id"] else None
        if target_reading:
            curr_status = target_reading.status
            curr_reading = target_reading.reading
            curr_rec_local = (
                get_local_time_str(target_reading.server_timestamp).split(" - ")[0]
                if target_reading.server_timestamp
                else None
            )
            rec_by = (
                RecordedByOut(
                    employee_code=target_reading.user.employee_code,
                    full_name=target_reading.user.full_name,
                )
                if target_reading.user
                else None
            )
            rec_at = target_reading.server_timestamp.isoformat() if target_reading.server_timestamp else None
            fmt_rec_at = get_local_time_str(target_reading.server_timestamp) if target_reading.server_timestamp else None
        else:
            curr_status = "PENDING"
            curr_reading = None
            curr_rec_local = None
            rec_by = None
            rec_at = None
            fmt_rec_at = None

        # Latest confirmed reading across history
        latest_conf = None
        lr = latest_confirmed_map.get(item["meter_id"]) if item["meter_id"] else None
        if lr and lr.reading:
            lr_sched = (
                lr.round.scheduled_at.replace(tzinfo=timezone.utc)
                if (lr.round and lr.round.scheduled_at.tzinfo is None)
                else (lr.round.scheduled_at if lr.round else lr.server_timestamp)
            )
            r_time = get_round_time_only_str(lr_sched)
            lr_ts = (
                lr.server_timestamp.replace(tzinfo=timezone.utc)
                if lr.server_timestamp.tzinfo is None
                else lr.server_timestamp
            )
            is_today = lr_ts.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str

            latest_conf = LatestConfirmedReading(
                reading=lr.reading,
                ocr_reading=lr.ocr_reading,
                confirmation_source=lr.confirmation_source,
                round_id=lr.reading_round_id,
                round_time=r_time,
                server_timestamp=lr.server_timestamp.isoformat(),
                formatted_server_time=get_local_time_str(lr.server_timestamp),
                is_today=is_today,
            )

        # Build today slots for this meter
        today_slots: list[TodayHourlySlot] = []
        for r_slot in today_rounds_filtered:
            slot_s = (
                r_slot.scheduled_at.replace(tzinfo=timezone.utc)
                if r_slot.scheduled_at.tzinfo is None
                else r_slot.scheduled_at
            )
            t_state = determine_round_timing_state(slot_s, now_utc, is_latest_past=(r_slot.id == target_round.id))
            sr = batch_reading_map.get((item["meter_id"], r_slot.id)) if item["meter_id"] else None
            today_slots.append(
                TodayHourlySlot(
                    round_id=r_slot.id,
                    scheduled_at=slot_s.isoformat(),
                    scheduled_local=get_round_local_time_str(slot_s),
                    scheduled_time_only=get_round_time_only_str(slot_s),
                    timing_state=t_state,
                    status=sr.status if sr else "PENDING",  # type: ignore
                    reading=sr.reading if sr else None,
                    ocr_reading=sr.ocr_reading if sr else None,
                    confirmation_source=sr.confirmation_source if sr else None,
                    recorded_at=sr.server_timestamp.isoformat() if sr and sr.server_timestamp else None,
                    formatted_recorded_at=get_local_time_str(sr.server_timestamp) if sr and sr.server_timestamp else None,
                    recorded_by=RecordedByOut(
                        employee_code=sr.user.employee_code,
                        full_name=sr.user.full_name,
                    ) if sr and sr.user else None,
                )
            )

        task_items.append(
            UserRoundTaskItem(
                meter=meter_out,
                current_status=curr_status,  # type: ignore
                current_reading=curr_reading,
                current_round_id=target_round.id,
                current_scheduled_time=current_round_out.scheduled_time_only if current_round_out else None,
                current_recorded_local=curr_rec_local,
                scope_item_id=item["scope_item_id"],
                zone_id_snapshot=zone_id,
                zone_name_snapshot=zone_name,
                presentation_zone_id_snapshot=item["presentation_zone_id_snapshot"],
                utility_type_snapshot=item["utility_type_snapshot"],
                assignment_role=role,  # type: ignore
                assignment_id=a_id,
                recorded_by=rec_by,
                recorded_at=rec_at,
                formatted_recorded_at=fmt_rec_at,
                latest_confirmed=latest_conf,
                recent_slots=[],
                today_slots=today_slots,
                trend=[],
                missed_count=0,
                meter_availability=availability_state if availability_state in ("AVAILABLE", "INACTIVE", "RETIRED", "MISSING") else "AVAILABLE",  # type: ignore
            )
        )

    # Sort tasks deterministically by zone_name then meter_code
    task_items.sort(key=lambda t: (t.zone_name_snapshot or "", t.meter.meter_code))

    # 7. Calculate Personal Progress
    assigned_total = len(task_items)
    confirmed_count = sum(1 for t in task_items if t.current_status == "CONFIRMED")
    review_count = sum(1 for t in task_items if t.current_status == "REVIEW")
    pending_count = sum(1 for t in task_items if t.current_status == "PENDING")
    percent = round((confirmed_count / assigned_total) * 100) if assigned_total > 0 else 0

    assigned_zone_count = len({t.zone_id_snapshot for t in task_items if t.zone_id_snapshot})
    primary_zone_count = sum(1 for a in zone_assignment_map.values() if a.assignment_role == "PRIMARY")
    support_zone_count = sum(1 for a in zone_assignment_map.values() if a.assignment_role == "SUPPORT")

    summary = UserTaskSummary(
        assigned_total=assigned_total,
        confirmed=confirmed_count,
        review=review_count,
        pending=pending_count,
        percent_complete=percent,
        total_meters=assigned_total,
        confirmed_current=confirmed_count,
        review_current=review_count,
        pending_current=pending_count,
        assigned_zone_count=assigned_zone_count,
        primary_zone_count=primary_zone_count,
        support_zone_count=support_zone_count,
    )

    empty_reason = None
    if assigned_total > 0 and pending_count == 0 and review_count == 0:
        empty_reason = "ALL_TASKS_COMPLETE"

    return UserTasksResponse(
        date=target_date_str,
        date_formatted=date_formatted,
        batch=batch_out,
        current_round=current_round_out,
        nearest_upcoming_round=nearest_round_out,
        assignment_context=assignment_context,
        summary=summary,
        global_round_total=global_round_total,
        empty_reason=empty_reason,
        meters=task_items,
    )


def get_round_task_coverage_diagnostics(
    db: Session,
    round_id: str,
) -> UserTaskCoverageDiagnostics:
    """Computes operational coverage diagnostics for a reading round.

    Reports total scheduled meters, assigned unique meters, unassigned unique meters,
    overlapping assignment count, and unassigned zone IDs/names.
    """
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt ghi chỉ số.")

    sched = (
        round_obj.scheduled_at.replace(tzinfo=timezone.utc)
        if round_obj.scheduled_at.tzinfo is None
        else round_obj.scheduled_at
    )

    # 1. Global scope items
    if round_obj.scope_mode == "SNAPSHOT":
        scope_rows = (
            db.query(ReadingRoundMeter)
            .filter(
                ReadingRoundMeter.reading_round_id == round_obj.id,
                ReadingRoundMeter.scope_status == "SCHEDULED",
            )
            .all()
        )
        total_scope = len(scope_rows)
        zone_meter_map: dict[str, list[ReadingRoundMeter]] = {}
        for r in scope_rows:
            z_id = r.zone_id_snapshot or "UNASSIGNED_ZONE"
            zone_meter_map.setdefault(z_id, []).append(r)
    else:
        active_meters = db.query(Meter).filter(Meter.is_active == True).all()
        total_scope = len(active_meters)
        zone_meter_map = {}
        for m in active_meters:
            z_id = m.zone_id or "UNASSIGNED_ZONE"
            zone_meter_map.setdefault(z_id, []).append(m)

    # 2. Covering assignments across all users
    covering_assignments = get_covering_assignments_for_round(db, user_id=None, round_obj=round_obj)

    # Group covering assignments by zone_id
    assignments_by_zone: dict[str, list[OperationalAssignment]] = {}
    for a in covering_assignments:
        assignments_by_zone.setdefault(a.zone_id, []).append(a)

    overlapping_count = sum(len(a_list) for a_list in assignments_by_zone.values() if len(a_list) > 1)

    # 3. Calculate assigned vs unassigned meters
    covered_zone_ids = set(assignments_by_zone.keys())

    assigned_meter_ids: set[str] = set()
    unassigned_meter_ids: set[str] = set()
    unassigned_zone_ids: list[str] = []

    for z_id, items in zone_meter_map.items():
        if z_id in covered_zone_ids:
            for item in items:
                assigned_meter_ids.add(getattr(item, "meter_id", getattr(item, "id", None)))
        else:
            unassigned_zone_ids.append(z_id)
            for item in items:
                unassigned_meter_ids.add(getattr(item, "meter_id", getattr(item, "id", None)))

    # Fetch zone names
    unassigned_names: list[str] = []
    if unassigned_zone_ids:
        real_unassigned = [z for z in unassigned_zone_ids if z != "UNASSIGNED_ZONE"]
        if real_unassigned:
            found_zones = db.query(OperationalZone).filter(OperationalZone.id.in_(real_unassigned)).all()
            unassigned_names.extend([z.name for z in found_zones])
        if "UNASSIGNED_ZONE" in unassigned_zone_ids:
            unassigned_names.append("Chưa phân khu (NULL)")

    # Breakdown per assigned zone
    zone_breakdown: list[dict[str, Any]] = []
    for z_id, a_list in assignments_by_zone.items():
        z_obj = db.query(OperationalZone).filter(OperationalZone.id == z_id).first()
        z_name = z_obj.name if z_obj else z_id
        z_code = z_obj.code if z_obj else z_id
        meter_count = len(zone_meter_map.get(z_id, []))
        zone_breakdown.append({
            "zone_id": z_id,
            "zone_code": z_code,
            "zone_name": z_name,
            "scheduled_meter_count": meter_count,
            "assignee_count": len(a_list),
            "primary_assignee": next((a.user.full_name for a in a_list if a.assignment_role == "PRIMARY" and a.user), None),
            "support_assignees": [a.user.full_name for a in a_list if a.assignment_role == "SUPPORT" and a.user],
        })

    return UserTaskCoverageDiagnostics(
        round_id=round_obj.id,
        scheduled_at=sched.isoformat(),
        scheduled_local=get_round_local_time_str(sched),
        scope_mode=round_obj.scope_mode,
        global_scope_count=total_scope,
        assigned_unique_meter_count=len(assigned_meter_ids),
        unassigned_unique_meter_count=len(unassigned_meter_ids),
        overlapping_assignment_count=overlapping_count,
        unassigned_zone_ids=unassigned_zone_ids,
        unassigned_zone_names=unassigned_names,
        assigned_zone_breakdown=zone_breakdown,
    )
