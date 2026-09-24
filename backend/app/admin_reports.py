import csv
import io
from datetime import datetime, timedelta, timezone
import statistics
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .config import get_settings
from .reporting_scope import load_scope_tasks
from .models import (
    MapVersion,
    MapVersionZone,
    Meter,
    MeterReading,
    OperationalZone,
    ReadingBatch,
    ReadingRound,
    User,
)
from .schemas import (
    AdminTechnicalOverviewResponse,
    AdminTechnicalMeterListResponse,
    AdminTechnicalDetailsResponse,
    AdminTechnicalOverviewSummary,
    DailyCompletionTrendItem,
    DailyProvenanceTrendItem,
    QualityByTypeItem,
    QualityByLocationItem,
    WatchlistMeterItem,
    DataIntegrityResponse,
    PipelineConfigResponse,
    AdminTechnicalMeterSummary,
    AdminTechnicalMeterHistoryItem,
    CumulativeTrendItem,
    AdminTechnicalRecordDetail,
    DateRangeInfo,
)

settings = get_settings()

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))


def format_date_vn(date_str: str) -> str:
    try:
        parts = date_str.split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return date_str


def get_local_time_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%d/%m/%Y · %H:%M")


def get_round_time_only_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%H:%M")


def parse_date_range(start_date: Optional[str], end_date: Optional[str]) -> tuple[str, str, str, str]:
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)
    today_str = now_local.strftime("%Y-%m-%d")

    if not end_date:
        end_str = today_str
    else:
        end_str = end_date.strip()

    if not start_date:
        start_str = now_local.replace(day=1).strftime("%Y-%m-%d")
    else:
        start_str = start_date.strip()

    if start_str > end_str:
        start_str, end_str = end_str, start_str

    try:
        datetime.strptime(start_str, "%Y-%m-%d")
        datetime.strptime(end_str, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Ngày báo cáo phải có dạng YYYY-MM-DD") from exc

    return start_str, end_str, format_date_vn(start_str), format_date_vn(end_str)


def compute_percentile(data: list[float], percentile: float) -> Optional[float]:
    if not data:
        return None
    data_sorted = sorted(data)
    n = len(data_sorted)
    if n == 1:
        return round(data_sorted[0], 1)
    k = (n - 1) * (percentile / 100.0)
    f = int(k)
    c = f + 1
    if c >= n:
        return round(data_sorted[-1], 1)
    val = data_sorted[f] + (k - f) * (data_sorted[c] - data_sorted[f])
    return round(val, 1)


def _get_zone_resolution_maps(db: Session) -> tuple[dict[str, str], dict[str, str]]:
    all_op_zones = db.query(OperationalZone).all()
    op_zone_map = {z.id: z.name for z in all_op_zones}

    active_map = (
        db.query(MapVersion)
        .filter(MapVersion.status == "PUBLISHED")
        .order_by(MapVersion.created_at.desc())
        .first()
    )
    map_zone_labels: dict[str, str] = {}
    if active_map:
        mv_zones = db.query(MapVersionZone).filter(MapVersionZone.map_version_id == active_map.id).all()
        for mvz in mv_zones:
            map_zone_labels[mvz.zone_id] = mvz.display_label or mvz.business_name
            if mvz.business_zone_id:
                map_zone_labels[mvz.business_zone_id] = mvz.display_label or mvz.business_name
    return op_zone_map, map_zone_labels


def _resolve_meter_location(
    m: Meter,
    op_zone_map: dict[str, str],
    map_zone_labels: dict[str, str],
) -> str:
    if m.location and m.location.strip():
        return m.location.strip()
    pres_zid = getattr(m, "presentation_zone_id", None)
    if pres_zid and pres_zid in map_zone_labels:
        return map_zone_labels[pres_zid]
    if m.zone_id and m.zone_id in op_zone_map:
        return op_zone_map[m.zone_id]
    return "Chưa phân loại"


def get_admin_technical_overview(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    zone_id: Optional[str] = None,
    utility_type: Optional[str] = None,
) -> AdminTechnicalOverviewResponse:
    start_str, end_str, start_vn, end_vn = parse_date_range(start_date, end_date)

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)
    today_str = now_local.strftime("%Y-%m-%d")

    # Asset metadata is used for OCR segmentation, including retired meters
    # that remain in an immutable published round scope.
    meters_q = db.query(Meter)
    if meter_type and meter_type != "ALL":
        meters_q = meters_q.filter(Meter.meter_type.ilike(f"%{meter_type}%"))

    meters = meters_q.order_by(Meter.meter_code.asc()).all()
    op_zone_map, map_zone_labels = _get_zone_resolution_maps(db)

    # Published scope owns the denominator. Outcome/source filters do not alter it.
    scope_tasks = load_scope_tasks(db, start_str, end_str, location=location, meter_type=meter_type, zone_id=zone_id, utility_type=utility_type)
    scoped_meter_ids = {task.meter_id for task in scope_tasks}
    meters = [m for m in meters if m.id in scoped_meter_ids]
    round_map = {task.round.id: task.round for task in scope_tasks}
    in_range_rounds = sorted(round_map.values(), key=lambda r: r.scheduled_at)
    due_tasks = [task for task in scope_tasks if task.due]
    total_scheduled_rounds = len(in_range_rounds)
    total_due_slots = len(due_tasks)
    all_readings = [task.reading for task in due_tasks if task.reading]
    confirmed_readings = [rd for rd in all_readings if rd.status == "CONFIRMED"]
    review_readings = [rd for rd in all_readings if rd.status == "REVIEW"]
    provenance_readings = [rd for rd in confirmed_readings if not confirmation_source or confirmation_source == "ALL" or rd.confirmation_source == confirmation_source]
    provenance_ids = {rd.id for rd in provenance_readings}

    total_confirmed = len(confirmed_readings)
    total_review = len(review_readings)
    total_missing = max(0, total_due_slots - total_confirmed - total_review)
    completion_rate = round((total_confirmed / total_due_slots) * 100, 1) if total_due_slots > 0 else 0.0

    # Provenance metrics
    ocr_confirmed = sum(1 for rd in provenance_readings if rd.confirmation_source == "OCR_CONFIRMED")
    user_corrected = sum(1 for rd in provenance_readings if rd.confirmation_source == "USER_CORRECTED")
    manual_entry = sum(1 for rd in provenance_readings if rd.confirmation_source == "MANUAL_ENTRY")
    human_intervention = user_corrected + manual_entry

    ocr_rate = round((ocr_confirmed / total_confirmed) * 100, 1) if total_confirmed > 0 else 0.0
    corrected_rate = round((user_corrected / total_confirmed) * 100, 1) if total_confirmed > 0 else 0.0
    manual_rate = round((manual_entry / total_confirmed) * 100, 1) if total_confirmed > 0 else 0.0
    intervention_rate = round((human_intervention / total_confirmed) * 100, 1) if total_confirmed > 0 else 0.0

    # Latencies (minutes)
    latencies: list[float] = []
    negative_latency_count = 0
    for rd in confirmed_readings:
        r = round_map.get(rd.reading_round_id)
        if r and rd.server_timestamp:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            rd_ts = rd.server_timestamp.replace(tzinfo=timezone.utc) if rd.server_timestamp.tzinfo is None else rd.server_timestamp
            diff_min = (rd_ts - r_sched).total_seconds() / 60.0
            if diff_min >= 0:
                latencies.append(diff_min)
            else:
                negative_latency_count += 1

    p50_latency = compute_percentile(latencies, 50)
    p95_latency = compute_percentile(latencies, 95)

    # 4. Daily Completion & Provenance Trend
    # Build list of distinct dates in range
    cur_d = datetime.strptime(start_str, "%Y-%m-%d")
    end_d = datetime.strptime(end_str, "%Y-%m-%d")
    date_list: list[str] = []
    while cur_d <= end_d:
        date_list.append(cur_d.strftime("%Y-%m-%d"))
        cur_d += timedelta(days=1)

    daily_completion_trend: list[DailyCompletionTrendItem] = []
    daily_provenance_trend: list[DailyProvenanceTrendItem] = []

    # Map rounds and readings by date
    rounds_by_date: dict[str, list[ReadingRound]] = {d: [] for d in date_list}
    for r in in_range_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        d_str = r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
        if d_str in rounds_by_date:
            rounds_by_date[d_str].append(r)

    readings_by_date: dict[str, list[MeterReading]] = {d: [] for d in date_list}
    for rd in confirmed_readings:
        r = round_map.get(rd.reading_round_id)
        if r:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            d_str = r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
            if d_str in readings_by_date:
                readings_by_date[d_str].append(rd)

    for d_str in date_list:
        d_rounds = rounds_by_date.get(d_str, [])
        # Count due rounds on d_str
        d_due_rounds = [
            r for r in d_rounds
            if (d_str < today_str or (d_str == today_str and (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc))
        ]
        due_round_ids = {r.id for r in d_due_rounds}
        d_due_slots = sum(task.round.id in due_round_ids for task in due_tasks)
        d_readings = readings_by_date.get(d_str, [])
        d_confirmed = len(d_readings)
        d_comp_rate = round((d_confirmed / d_due_slots) * 100, 1) if d_due_slots > 0 else 0.0

        daily_completion_trend.append(
            DailyCompletionTrendItem(
                date=d_str,
                date_vn=format_date_vn(d_str)[:5],  # "DD/MM"
                due_slots=d_due_slots,
                confirmed_slots=d_confirmed,
                completion_rate=d_comp_rate,
            )
        )

        d_source_readings = [rd for rd in d_readings if rd.id in provenance_ids]
        d_ocr = sum(1 for rd in d_source_readings if rd.confirmation_source == "OCR_CONFIRMED")
        d_corr = sum(1 for rd in d_source_readings if rd.confirmation_source == "USER_CORRECTED")
        d_man = sum(1 for rd in d_source_readings if rd.confirmation_source == "MANUAL_ENTRY")
        daily_provenance_trend.append(
            DailyProvenanceTrendItem(
                date=d_str,
                date_vn=format_date_vn(d_str)[:5],
                confirmed_count=d_confirmed,
                ocr_confirmed_count=d_ocr,
                user_corrected_count=d_corr,
                manual_entry_count=d_man,
                ocr_rate=round((d_ocr / d_confirmed) * 100, 1) if d_confirmed > 0 else 0.0,
                corrected_rate=round((d_corr / d_confirmed) * 100, 1) if d_confirmed > 0 else 0.0,
                manual_rate=round((d_man / d_confirmed) * 100, 1) if d_confirmed > 0 else 0.0,
            )
        )

    # 5. Quality by Meter Type
    type_set = sorted(list({m.meter_type.upper() for m in meters}))
    quality_by_type: list[QualityByTypeItem] = []
    for t in type_set:
        t_label = "Cơ" if t == "MECHANICAL" else ("LCD" if t == "LCD" else t)
        t_meter_ids = {m.id for m in meters if m.meter_type.upper() == t}
        t_readings = [rd for rd in provenance_readings if rd.meter_id in t_meter_ids]
        t_total = len(t_readings)
        t_ocr = sum(1 for rd in t_readings if rd.confirmation_source == "OCR_CONFIRMED")
        t_corr = sum(1 for rd in t_readings if rd.confirmation_source == "USER_CORRECTED")
        t_man = sum(1 for rd in t_readings if rd.confirmation_source == "MANUAL_ENTRY")

        quality_by_type.append(
            QualityByTypeItem(
                meter_type=t_label,
                confirmed_count=t_total,
                ocr_confirmed_count=t_ocr,
                user_corrected_count=t_corr,
                manual_entry_count=t_man,
                ocr_rate=round((t_ocr / t_total) * 100, 1) if t_total > 0 else 0.0,
                corrected_rate=round((t_corr / t_total) * 100, 1) if t_total > 0 else 0.0,
                manual_rate=round((t_man / t_total) * 100, 1) if t_total > 0 else 0.0,
            )
        )

    # 6. Quality by publication-time operational zone
    loc_set = sorted({task.zone_name for task in scope_tasks})
    quality_by_location: list[QualityByLocationItem] = []
    for loc_name in loc_set:
        loc_readings = [task.reading for task in due_tasks if task.zone_name == loc_name and task.status == "CONFIRMED" and task.reading.id in provenance_ids]
        loc_reviews = [task.reading for task in due_tasks if task.zone_name == loc_name and task.status == "REVIEW"]
        l_total = len(loc_readings)
        l_ocr = sum(1 for rd in loc_readings if rd.confirmation_source == "OCR_CONFIRMED")
        l_corr = sum(1 for rd in loc_readings if rd.confirmation_source == "USER_CORRECTED")
        l_man = sum(1 for rd in loc_readings if rd.confirmation_source == "MANUAL_ENTRY")

        quality_by_location.append(
            QualityByLocationItem(
                location=loc_name,
                confirmed_count=l_total,
                ocr_confirmed_count=l_ocr,
                user_corrected_count=l_corr,
                manual_entry_count=l_man,
                review_count=len(loc_reviews),
                ocr_rate=round((l_ocr / l_total) * 100, 1) if l_total > 0 else 0.0,
                corrected_rate=round((l_corr / l_total) * 100, 1) if l_total > 0 else 0.0,
                manual_rate=round((l_man / l_total) * 100, 1) if l_total > 0 else 0.0,
            )
        )

    # 7. Watchlist Meters (sorted by human intervention rate descending)
    watchlist_meters: list[WatchlistMeterItem] = []
    for m in meters:
        m_readings = [rd for rd in provenance_readings if rd.meter_id == m.id]
        m_reviews = [rd for rd in review_readings if rd.meter_id == m.id]
        m_total = len(m_readings)
        m_corr = sum(1 for rd in m_readings if rd.confirmation_source == "USER_CORRECTED")
        m_man = sum(1 for rd in m_readings if rd.confirmation_source == "MANUAL_ENTRY")
        m_interv = m_corr + m_man
        m_rate = round((m_interv / m_total) * 100, 1) if m_total > 0 else 0.0

        watchlist_meters.append(
            WatchlistMeterItem(
                meter_id=m.id,
                meter_code=m.meter_code,
                name=m.name,
                location=_resolve_meter_location(m, op_zone_map, map_zone_labels),
                meter_type="Cơ" if m.meter_type.upper() == "MECHANICAL" else "LCD",
                confirmed_count=m_total,
                user_corrected_count=m_corr,
                manual_entry_count=m_man,
                review_count=len(m_reviews),
                human_intervention_rate=m_rate,
            )
        )

    # Short problematic histories remain visible; no minimum sample gate.
    watchlist_meters.sort(
        key=lambda item: (item.review_count > 0 or item.user_corrected_count > 0 or item.manual_entry_count > 0,
                          item.review_count, item.human_intervention_rate, item.user_corrected_count, item.manual_entry_count),
        reverse=True,
    )

    # 8. Data Integrity Diagnostics
    # Validations across all readings in DB
    all_db_readings = db.query(MeterReading).all()
    
    # Check 1: Duplicate meter + round
    seen_mr: set[tuple[str, str]] = set()
    dup_count = 0
    for rd in all_db_readings:
        pair = (rd.meter_id, rd.reading_round_id)
        if pair in seen_mr:
            dup_count += 1
        else:
            seen_mr.add(pair)

    # Check 2: Invalid provenance combinations
    ocr_mismatch = 0
    manual_with_ocr = 0
    corrected_null_ocr = 0
    future_readings = 0

    for rd in all_db_readings:
        if rd.confirmation_source == "OCR_CONFIRMED":
            if rd.status == "CONFIRMED" and (not rd.ocr_reading or rd.reading != rd.ocr_reading):
                ocr_mismatch += 1
        elif rd.confirmation_source == "USER_CORRECTED":
            if not rd.ocr_reading:
                corrected_null_ocr += 1
        elif rd.confirmation_source == "MANUAL_ENTRY":
            if rd.ocr_reading is not None:
                manual_with_ocr += 1

        r = round_map.get(rd.reading_round_id)
        if r:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            if r_sched > now_utc and rd.status == "CONFIRMED":
                future_readings += 1

    total_violations = dup_count + ocr_mismatch + manual_with_ocr + corrected_null_ocr + future_readings + negative_latency_count
    status_msg = "Không phát hiện vi phạm contract dữ liệu" if total_violations == 0 else f"Phát hiện {total_violations} cảnh báo dữ liệu"

    data_integrity = DataIntegrityResponse(
        total_violations=total_violations,
        duplicate_meter_rounds=dup_count,
        invalid_provenance_ocr_mismatch=ocr_mismatch,
        invalid_provenance_manual_with_ocr=manual_with_ocr,
        invalid_provenance_corrected_null_ocr=corrected_null_ocr,
        confirmed_reading_on_future_round=future_readings,
        negative_latency_count=negative_latency_count,
        status_message=status_msg,
    )

    pipeline_config = PipelineConfigResponse(
        pipeline_version="e2-adaptive-ppocrv6-medium-v1",
        localization_model="E2 Localization",
        localization_imgsz=960,
        adaptive_retry_imgsz=1280,
        confidence_threshold=0.30,
        iou_threshold=0.70,
        crop_padding="pad 5%, horizontal shift +2.5%",
        recognizer="PP-OCRv6-Medium",
        label="Cấu hình nhận dạng hiện hành",
    )

    return AdminTechnicalOverviewResponse(
        date_range=DateRangeInfo(
            start_date=start_str,
            end_date=end_str,
            start_date_vn=start_vn,
            end_date_vn=end_vn,
        ),
        summary=AdminTechnicalOverviewSummary(
            total_scheduled_rounds=total_scheduled_rounds,
            total_due_slots=total_due_slots,
            total_confirmed=total_confirmed,
            total_review=total_review,
            total_missing=total_missing,
            completion_rate=completion_rate,
            human_intervention_count=human_intervention,
            human_intervention_rate=intervention_rate,
            ocr_confirmed_count=ocr_confirmed,
            ocr_confirmed_rate=ocr_rate,
            user_corrected_count=user_corrected,
            user_corrected_rate=corrected_rate,
            manual_entry_count=manual_entry,
            manual_entry_rate=manual_rate,
            recording_latency_p50_minutes=p50_latency,
            recording_latency_p95_minutes=p95_latency,
        ),
        daily_completion_trend=daily_completion_trend,
        daily_provenance_trend=daily_provenance_trend,
        quality_by_type=quality_by_type,
        quality_by_location=quality_by_location,
        watchlist_meters=[item for item in watchlist_meters if item.review_count or item.user_corrected_count or item.manual_entry_count][:8],
        data_integrity=data_integrity,
        pipeline_config=pipeline_config,
        available_locations=loc_set,
    )


def get_admin_technical_meters(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    meter_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    utility_type: Optional[str] = None,
) -> AdminTechnicalMeterListResponse:
    start_str, end_str, start_vn, end_vn = parse_date_range(start_date, end_date)

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)
    today_str = now_local.strftime("%Y-%m-%d")

    scope_tasks = load_scope_tasks(db, start_str, end_str, location=location, meter_type=meter_type, zone_id=zone_id, utility_type=utility_type)
    scoped_ids = {task.meter_id for task in scope_tasks if task.meter_id}
    meters_q = db.query(Meter)
    if meter_type and meter_type != "ALL":
        meters_q = meters_q.filter(Meter.meter_type.ilike(f"%{meter_type}%"))

    meters = [m for m in meters_q.order_by(Meter.meter_code.asc()).all() if m.id in scoped_ids]
    op_zone_map, map_zone_labels = _get_zone_resolution_maps(db)
    meter_map = {m.id: m for m in meters}

    round_map = {task.round.id: task.round for task in scope_tasks}
    all_readings = [task.reading for task in scope_tasks if task.reading and
                    (not confirmation_source or confirmation_source == "ALL" or task.reading.confirmation_source == confirmation_source)]
    task_by_pair = {(task.round.id, task.meter_id): task for task in scope_tasks}

    user_map = {u.id: u for u in db.query(User).all()}

    # Compute summary per meter
    meters_summary_list: list[AdminTechnicalMeterSummary] = []
    for m in meters:
        m_readings = [rd for rd in all_readings if rd.meter_id == m.id and rd.status == "CONFIRMED"]
        m_reviews = [rd for rd in all_readings if rd.meter_id == m.id and rd.status == "REVIEW"]
        total_c = len(m_readings)
        ocr_c = sum(1 for rd in m_readings if rd.confirmation_source == "OCR_CONFIRMED")
        corr_c = sum(1 for rd in m_readings if rd.confirmation_source == "USER_CORRECTED")
        man_c = sum(1 for rd in m_readings if rd.confirmation_source == "MANUAL_ENTRY")
        interv_c = corr_c + man_c
        interv_rate = round((interv_c / total_c) * 100, 1) if total_c > 0 else 0.0

        # Latencies
        m_lats: list[float] = []
        for rd in m_readings:
            r = round_map.get(rd.reading_round_id)
            if r and rd.server_timestamp:
                r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
                rd_ts = rd.server_timestamp.replace(tzinfo=timezone.utc) if rd.server_timestamp.tzinfo is None else rd.server_timestamp
                diff = (rd_ts - r_sched).total_seconds() / 60.0
                if diff >= 0:
                    m_lats.append(diff)

        p50 = compute_percentile(m_lats, 50)
        p95 = compute_percentile(m_lats, 95)

        meters_summary_list.append(
            AdminTechnicalMeterSummary(
                meter_id=m.id,
                meter_code=m.meter_code,
                name=m.name,
                location=_resolve_meter_location(m, op_zone_map, map_zone_labels),
                meter_type="Cơ" if m.meter_type.upper() == "MECHANICAL" else "LCD",
                is_active=m.is_active,
                utility_type=m.utility_type or "UNKNOWN",
                measurement_unit=m.measurement_unit or "UNKNOWN",
                register_semantics=m.register_semantics or "UNKNOWN",
                scheduled_rounds_count=sum(task.meter_id == m.id for task in scope_tasks),
                confirmed_count=total_c,
                review_count=len(m_reviews),
                ocr_confirmed_count=ocr_c,
                user_corrected_count=corr_c,
                manual_entry_count=man_c,
                human_intervention_rate=interv_rate,
                latency_p50=p50,
                latency_p95=p95,
            )
        )

    # Detail for selected meter
    selected_target_id = meter_id if (meter_id and meter_id in meter_map) else (meters[0].id if meters else None)
    history_items: list[AdminTechnicalMeterHistoryItem] = []
    cumulative_trend: list[CumulativeTrendItem] = []

    if selected_target_id and selected_target_id in meter_map:
        target_meter = meter_map[selected_target_id]
        target_readings = [rd for rd in all_readings if rd.meter_id == selected_target_id]
        # Sort chronologically by round scheduled_at
        def get_sched_time(rd: MeterReading):
            r = round_map.get(rd.reading_round_id)
            return r.scheduled_at if r else rd.created_at

        target_readings.sort(key=get_sched_time)

        for rd in target_readings:
            r = round_map.get(rd.reading_round_id)
            if not r:
                continue
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            r_local = r_sched.astimezone(LOCAL_TZ)
            u = user_map.get(rd.user_id)
            op_name = u.full_name if u else "Hệ thống"

            rec_time_str = get_local_time_str(rd.server_timestamp) if rd.server_timestamp else "—"

            history_items.append(
                AdminTechnicalMeterHistoryItem(
                    id=rd.id,
                    round_id=r.id,
                    date=r_local.strftime("%d/%m/%Y"),
                    scheduled_time=get_round_time_only_str(r_sched),
                    status=rd.status,
                    reading=rd.reading,
                    ocr_reading=rd.ocr_reading,
                    confirmation_source=rd.confirmation_source,
                    recorded_at=rec_time_str,
                    operator_name=op_name,
                    assigned_names=[user_map[a.user_id].full_name for a in task_by_pair[(r.id, rd.meter_id)].assignments if a.user_id in user_map],
                )
            )

            if rd.status == "CONFIRMED" and rd.reading:
                try:
                    # Safe parse for plotting coordinate only
                    val_float = float(rd.reading)
                    cumulative_trend.append(
                        CumulativeTrendItem(
                            scheduled_time=f"{r_local.strftime('%d/%m')} {get_round_time_only_str(r_sched)}",
                            canonical_reading=rd.reading,
                            value=val_float,
                            tooltip_label=f"{rd.reading} {('kWh' if target_meter.measurement_unit == 'KWH' else 'm³' if target_meter.measurement_unit == 'M3' else 'Đơn vị chưa cấu hình')} ({r_local.strftime('%d/%m')} {get_round_time_only_str(r_sched)})",
                        )
                    )
                except Exception:
                    pass

    return AdminTechnicalMeterListResponse(
        date_range=DateRangeInfo(
            start_date=start_str,
            end_date=end_str,
            start_date_vn=start_vn,
            end_date_vn=end_vn,
        ),
        meters=meters_summary_list,
        selected_meter_id=selected_target_id,
        history=history_items,
        cumulative_trend=cumulative_trend,
    )


def get_admin_technical_details(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    zone_id: Optional[str] = None,
    utility_type: Optional[str] = None,
) -> AdminTechnicalDetailsResponse:
    start_str, end_str, start_vn, end_vn = parse_date_range(start_date, end_date)
    tasks = load_scope_tasks(db, start_str, end_str, location=location, meter_type=meter_type, zone_id=zone_id, utility_type=utility_type)
    users = {user.id: user.full_name for user in db.query(User).all()}
    meter_ids = {task.meter_id for task in tasks if task.meter_id}
    meters = {m.id: m for m in db.query(Meter).filter(Meter.id.in_(meter_ids)).all()} if meter_ids else {}
    items: list[AdminTechnicalRecordDetail] = []
    for task in tasks:
        if not task.due:
            continue
        rd = task.reading
        st = task.status
        src = rd.confirmation_source if rd else None
        if status_filter and status_filter != "ALL":
            if status_filter == "UNASSIGNED_DUE":
                if task.assignments:
                    continue
            elif status_filter in ("REVIEW", "MISSING"):
                if st != status_filter:
                    continue
            elif st != "CONFIRMED" or src != status_filter:
                continue
        if confirmation_source and confirmation_source != "ALL" and src != confirmation_source:
            continue
        scheduled = task.round.scheduled_at.replace(tzinfo=timezone.utc) if task.round.scheduled_at.tzinfo is None else task.round.scheduled_at
        local = scheduled.astimezone(LOCAL_TZ)
        meter = meters.get(task.meter_id)
        items.append(AdminTechnicalRecordDetail(
            id=f"{task.meter_code}_{task.round.id}",
            meter_id=task.meter_id, round_id=task.round.id, reading_id=rd.id if rd else None,
            date=local.strftime("%d/%m/%Y"), scheduled_time=local.strftime("%H:%M"),
            meter_code=task.meter_code, meter_name=task.meter_name,
            location=task.zone_name, zone_id=task.zone_id,
            meter_type="Cơ" if task.meter_type == "MECHANICAL" else "LCD" if task.meter_type == "LCD" else task.meter_type,
            utility_type=task.utility_type,
            measurement_unit=meter.measurement_unit if meter else "UNKNOWN",
            scope_mode=task.scope_mode, status=st,
            reading=rd.reading if rd else None, ocr_reading=rd.ocr_reading if rd else None,
            confirmation_source=src,
            recorded_at=get_local_time_str(rd.server_timestamp) if rd and rd.server_timestamp else None,
            operator_name=users.get(rd.user_id, rd.user_id) if rd else None,
            assigned_names=[f"{users.get(a.user_id, a.user_id)} ({a.assignment_role})" for a in task.assignments],
        ))

    items.reverse()  # load_scope_tasks returns rounds in chronological order
    total_count = len(items)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_items = items[start_idx:end_idx]

    return AdminTechnicalDetailsResponse(
        total=total_count,
        page=page,
        limit=limit,
        items=paginated_items,
    )


def export_admin_technical_csv(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    zone_id: Optional[str] = None,
    utility_type: Optional[str] = None,
) -> StreamingResponse:
    details = get_admin_technical_details(
        db,
        start_date=start_date,
        end_date=end_date,
        location=location,
        meter_type=meter_type,
        confirmation_source=confirmation_source,
        zone_id=zone_id,
        utility_type=utility_type,
        page=1,
        limit=100000,
    )

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM
    writer = csv.writer(output)

    writer.writerow([
        "Ngày",
        "Khung giờ",
        "Mã công tơ",
        "Tên công tơ",
        "Vị trí",
        "Loại công tơ",
        "Trạng thái",
        "Chỉ số chính thức",
        "Đơn vị",
        "Tiện ích",
        "OCR ban đầu",
        "Nguồn xác nhận",
        "Thời gian ghi nhận",
        "Người ghi nhận",
        "Người phụ trách",
        "Chế độ phạm vi",
    ])

    for item in details.items:
        src_label = ""
        if item.confirmation_source == "OCR_CONFIRMED":
            src_label = "Xác nhận từ OCR"
        elif item.confirmation_source == "USER_CORRECTED":
            src_label = "Đã hiệu chỉnh"
        elif item.confirmation_source == "MANUAL_ENTRY":
            src_label = "Nhập thủ công"

        st_label = ""
        if item.status == "CONFIRMED":
            st_label = "Đã xác nhận"
        elif item.status == "REVIEW":
            st_label = "Cần kiểm tra"
        elif item.status == "MISSING":
            st_label = "Chưa ghi"

        writer.writerow([
            item.date,
            item.scheduled_time,
            item.meter_code,
            item.meter_name,
            item.location,
            item.meter_type,
            st_label,
            item.reading or "",
            item.measurement_unit if item.measurement_unit != "UNKNOWN" else "",
            item.utility_type,
            item.ocr_reading or "",
            src_label,
            item.recorded_at or "",
            item.operator_name or "",
            "; ".join(item.assigned_names),
            item.scope_mode,
        ])

    output.seek(0)
    filename = f"Bao_cao_ky_thuat_{start_date}_den_{end_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
