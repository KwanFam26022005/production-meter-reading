import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .reporting_scope import load_scope_tasks
from .models import Meter, MeterReading, User
from .schemas import (
    LatestConfirmedReading,
    MeterOut,
    MeterTrendPoint,
    RecordedByOut,
    ReportHourlyProgressItem,
    ReportLocationProgressItem,
    ReportMeterCompletion,
    ReportMeterDetailResponse,
    ReportMeterHourlyRow,
    ReportOverviewResponse,
    ReportOverviewSummary,
)

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


def determine_timing_state(sched_utc: datetime, now_utc: datetime, is_current: bool = False) -> str:
    if is_current:
        return "CURRENT"
    if sched_utc <= now_utc:
        return "PAST"
    return "UPCOMING"


def get_report_overview(db: Session, date_str: Optional[str] = None) -> ReportOverviewResponse:
    now_utc = datetime.now(timezone.utc)
    target_date_str = date_str or now_utc.astimezone(LOCAL_TZ).date().isoformat()
    date_formatted = format_date_vn(target_date_str)
    tasks = load_scope_tasks(db, target_date_str, target_date_str, now=now_utc)
    rounds = {task.round.id: task.round for task in tasks}
    today_rounds = sorted(rounds.values(), key=lambda row: row.scheduled_at)
    due_rounds = [row for row in today_rounds if any(task.round.id == row.id and task.due for task in tasks)]
    current_round_id = due_rounds[-1].id if target_date_str == now_utc.astimezone(LOCAL_TZ).date().isoformat() and due_rounds else None

    expected_slots = len(tasks)
    due_slots = sum(task.due for task in tasks)
    confirmed_slots = sum(task.status == "CONFIRMED" for task in tasks)
    review_slots = sum(task.status == "REVIEW" for task in tasks)
    pending_slots = expected_slots - confirmed_slots - review_slots
    total_meters = len({task.meter_id or task.meter_code for task in tasks})
    summary_out = ReportOverviewSummary(
        total_meters=total_meters, expected_slots=expected_slots, due_slots=due_slots,
        confirmed_slots=confirmed_slots, review_slots=review_slots,
        pending_slots=pending_slots,
        completion_percent=round(confirmed_slots / due_slots * 100, 1) if due_slots else 0.0,
    )

    hourly_items: list[ReportHourlyProgressItem] = []
    for row in today_rounds:
        round_tasks = [task for task in tasks if task.round.id == row.id]
        total = len(round_tasks)
        confirmed = sum(task.status == "CONFIRMED" for task in round_tasks)
        review = sum(task.status == "REVIEW" for task in round_tasks)
        scheduled = row.scheduled_at.replace(tzinfo=timezone.utc) if row.scheduled_at.tzinfo is None else row.scheduled_at
        hourly_items.append(ReportHourlyProgressItem(
            round_id=row.id, scheduled_time=get_round_time_only_str(scheduled),
            timing_state=determine_timing_state(scheduled, now_utc, row.id == current_round_id),
            total=total, confirmed=confirmed, review=review,
            pending=total - confirmed - review,
            completion_percent=round(confirmed / total * 100, 1) if total else 0.0,
        ))

    # The compatibility response calls this "locations"; values are
    # publication-time operational zones for snapshots, not Meter.location.
    by_zone: dict[tuple[Optional[str], str], list] = {}
    for task in tasks:
        by_zone.setdefault((task.zone_id, task.zone_name), []).append(task)
    location_items: list[ReportLocationProgressItem] = []
    for (_, zone_name), zone_tasks in sorted(by_zone.items(), key=lambda item: item[0][1]):
        expected = len(zone_tasks)
        due = sum(task.due for task in zone_tasks)
        confirmed = sum(task.status == "CONFIRMED" for task in zone_tasks)
        review = sum(task.status == "REVIEW" for task in zone_tasks)
        location_items.append(ReportLocationProgressItem(
            location=zone_name,
            meter_count=len({task.meter_id or task.meter_code for task in zone_tasks}),
            expected_slots=expected, due_slots=due, confirmed_slots=confirmed,
            review_slots=review, pending_slots=expected - confirmed - review,
            completion_percent=round(confirmed / due * 100, 1) if due else 0.0,
        ))
    return ReportOverviewResponse(
        date=target_date_str, date_formatted=date_formatted,
        summary=summary_out, hourly=hourly_items, locations=location_items,
    )


def get_meter_report(db: Session, meter_id: str, date_str: Optional[str] = None) -> ReportMeterDetailResponse:
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)

    if not date_str:
        target_date_str = now_local.strftime("%Y-%m-%d")
    else:
        target_date_str = date_str

    date_formatted = format_date_vn(target_date_str)

    # 1. Meter info (1 query)
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )

    # Only rounds containing this meter in published scope are scheduled work.
    scoped_tasks = load_scope_tasks(db, target_date_str, target_date_str, meter_id=meter.id, now=now_utc)
    today_rounds = [task.round for task in scoped_tasks]

    round_ids = [r.id for r in today_rounds]

    # Find current round if date is today
    current_round_id: Optional[str] = None
    if target_date_str == now_local.strftime("%Y-%m-%d") and today_rounds:
        past_rounds = [r for r in today_rounds if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc]
        if past_rounds:
            current_round_id = past_rounds[-1].id

    # 3. All meter readings for this meter (1 query)
    all_meter_readings = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter.id)
        .order_by(MeterReading.server_timestamp.asc())
        .all()
    )

    today_readings_map: dict[str, MeterReading] = {
        r.reading_round_id: r for r in all_meter_readings if r.reading_round_id in round_ids
    }

    # 4. Hourly rows
    due_count = 0
    hourly_rows: list[ReportMeterHourlyRow] = []
    for r in today_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        is_curr = (r.id == current_round_id)
        timing = determine_timing_state(r_sched, now_utc, is_current=is_curr)
        if timing in ("PAST", "CURRENT"):
            due_count += 1

        rd = today_readings_map.get(r.id)
        if rd:
            row_status = rd.status
            row_val = rd.reading
            row_ocr = rd.ocr_reading
            row_conf_src = rd.confirmation_source
            row_fmt_time = get_local_time_str(rd.server_timestamp)
            row_rec_by = (
                RecordedByOut(
                    employee_code=rd.user.employee_code,
                    full_name=rd.user.full_name,
                )
                if rd.user
                else None
            )
        else:
            row_status = "PENDING"
            row_val = None
            row_ocr = None
            row_conf_src = None
            row_fmt_time = None
            row_rec_by = None

        hourly_rows.append(
            ReportMeterHourlyRow(
                round_id=r.id,
                scheduled_time=get_round_time_only_str(r_sched),
                timing_state=timing,
                status=row_status,
                reading=row_val,
                ocr_reading=row_ocr,
                confirmation_source=row_conf_src,
                formatted_recorded_at=row_fmt_time,
                recorded_by=row_rec_by,
            )
        )

    # 5. Completion metrics
    scheduled_total = len(today_rounds)
    confirmed_count = sum(1 for row in hourly_rows if row.status == "CONFIRMED")
    review_count = sum(1 for row in hourly_rows if row.status == "REVIEW")
    pending_count = scheduled_total - confirmed_count - review_count
    completion_pct = (
        round((confirmed_count / due_count * 100), 1)
        if due_count > 0
        else (round((confirmed_count / scheduled_total * 100), 1) if scheduled_total > 0 else 0.0)
    )

    completion_out = ReportMeterCompletion(
        scheduled_total=scheduled_total,
        due_total=due_count,
        confirmed=confirmed_count,
        review=review_count,
        pending=pending_count,
        completion_percent=completion_pct,
    )

    # 6. Latest Confirmed reading
    confirmed_all = [rd for rd in all_meter_readings if rd.status == "CONFIRMED" and rd.reading]
    latest_conf_obj = None
    if confirmed_all:
        latest_rd = confirmed_all[-1]
        if latest_rd.round:
            lr_sched = latest_rd.round.scheduled_at.replace(tzinfo=timezone.utc) if latest_rd.round.scheduled_at.tzinfo is None else latest_rd.round.scheduled_at
            r_time_str = get_round_time_only_str(lr_sched)
        else:
            r_time_str = get_round_time_only_str(latest_rd.server_timestamp)

        lr_ts = latest_rd.server_timestamp.replace(tzinfo=timezone.utc) if latest_rd.server_timestamp.tzinfo is None else latest_rd.server_timestamp
        is_today_conf = (lr_ts.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str)

        latest_conf_obj = LatestConfirmedReading(
            reading=latest_rd.reading,
            ocr_reading=latest_rd.ocr_reading,
            confirmation_source=latest_rd.confirmation_source,
            round_id=latest_rd.reading_round_id,
            round_time=r_time_str,
            server_timestamp=latest_rd.server_timestamp.isoformat(),
            formatted_server_time=get_local_time_str(latest_rd.server_timestamp),
            is_today=is_today_conf,
        )

    # 7. Trend points (CONFIRMED numeric values for this meter on target date)
    trend_points: list[MeterTrendPoint] = []
    for rd in confirmed_all:
        rd_ts = rd.server_timestamp.replace(tzinfo=timezone.utc) if rd.server_timestamp.tzinfo is None else rd.server_timestamp
        # Filter for target date
        if rd_ts.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str:
            clean_str = rd.reading.replace(",", "").strip()
            try:
                numeric_val = float(clean_str)
                if rd.round:
                    r_sched = rd.round.scheduled_at.replace(tzinfo=timezone.utc) if rd.round.scheduled_at.tzinfo is None else rd.round.scheduled_at
                    t_str = get_round_time_only_str(r_sched)
                else:
                    t_str = get_round_time_only_str(rd.server_timestamp)
                trend_points.append(
                    MeterTrendPoint(
                        scheduled_time=t_str,
                        reading=rd.reading,
                        value=numeric_val,
                    )
                )
            except (ValueError, TypeError):
                continue

    return ReportMeterDetailResponse(
        date=target_date_str,
        date_formatted=date_formatted,
        meter=MeterOut(
            id=meter.id,
            meter_code=meter.meter_code,
            name=meter.name,
            location=meter.location,
            meter_type=meter.meter_type,
            is_active=meter.is_active,
            created_at=meter.created_at.isoformat() if meter.created_at else None,
        ),
        latest_confirmed=latest_conf_obj,
        completion=completion_out,
        hourly=hourly_rows,
        trend=trend_points,
    )


def export_report_csv(db: Session, date_str: Optional[str] = None) -> str:
    target_date_str = date_str or datetime.now(timezone.utc).astimezone(LOCAL_TZ).date().isoformat()
    tasks = load_scope_tasks(db, target_date_str, target_date_str)
    meter_ids = {task.meter_id for task in tasks if task.meter_id}
    meters = {row.id: row for row in db.query(Meter).filter(Meter.id.in_(meter_ids)).all()} if meter_ids else {}
    users = {row.id: row for row in db.query(User).all()}
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, dialect="excel")
    writer.writerow([
        "Ngày tác nghiệp", "Khung giờ", "Mã công tơ", "Tên công tơ",
        "Khu vực tác nghiệp", "Loại công tơ", "Trạng thái", "Chỉ số chính thức",
        "Chỉ số OCR", "Nguồn xác nhận", "Thời gian ghi", "Mã nhân viên",
        "Họ tên nhân viên", "Đơn vị", "Tiện ích", "Chế độ phạm vi",
    ])
    for task in tasks:
        rd = task.reading
        meter = meters.get(task.meter_id)
        executor = users.get(rd.user_id) if rd else None
        status_label = {
            "UPCOMING": "SẮP ĐẾN HẠN", "CONFIRMED": "ĐÃ XÁC NHẬN",
            "REVIEW": "CẦN KIỂM TRA", "MISSING": "CHƯA GHI",
        }[task.status]
        writer.writerow([
            format_date_vn(target_date_str), get_round_time_only_str(task.round.scheduled_at),
            task.meter_code, task.meter_name, task.zone_name,
            "LCD" if task.meter_type == "LCD" else "Cơ" if task.meter_type == "MECHANICAL" else task.meter_type,
            status_label, rd.reading if rd else "", rd.ocr_reading if rd else "",
            rd.confirmation_source if rd else "",
            get_local_time_str(rd.server_timestamp) if rd and rd.server_timestamp else "",
            executor.employee_code if executor else "", executor.full_name if executor else "",
            meter.measurement_unit if meter and meter.measurement_unit != "UNKNOWN" else "",
            task.utility_type, task.scope_mode,
        ])
    return output.getvalue()
