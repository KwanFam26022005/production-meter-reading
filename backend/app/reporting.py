import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Meter, MeterReading, ReadingBatch, ReadingRound, User
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
    now_local = now_utc.astimezone(LOCAL_TZ)

    if not date_str:
        target_date_str = now_local.strftime("%Y-%m-%d")
    else:
        target_date_str = date_str

    date_formatted = format_date_vn(target_date_str)

    # 1. Active meters (1 query)
    meters = db.query(Meter).filter(Meter.is_active == True).order_by(Meter.meter_code.asc()).all()
    total_meters = len(meters)

    # 2. Today's non-legacy scheduled rounds across any active batches (1 query)
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

    # Find the current round if target date is today
    current_round_id: Optional[str] = None
    if target_date_str == now_local.strftime("%Y-%m-%d") and today_rounds:
        past_rounds = [r for r in today_rounds if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc]
        if past_rounds:
            current_round_id = past_rounds[-1].id

    # 3. All readings for today's rounds (1 query)
    readings = []
    if round_ids:
        readings = (
            db.query(MeterReading)
            .filter(MeterReading.reading_round_id.in_(round_ids))
            .all()
        )

    # Map (meter_id, round_id) -> MeterReading
    readings_map: dict[tuple[str, str], MeterReading] = {
        (r.meter_id, r.reading_round_id): r for r in readings
    }

    # 4. Compute Due vs Upcoming rounds
    due_rounds = []
    for r in today_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        is_curr = (r.id == current_round_id)
        timing = determine_timing_state(r_sched, now_utc, is_current=is_curr)
        if timing in ("PAST", "CURRENT"):
            due_rounds.append(r)

    expected_slots = total_meters * len(today_rounds)
    due_slots = total_meters * len(due_rounds)

    confirmed_slots = sum(1 for r in readings if r.status == "CONFIRMED")
    review_slots = sum(1 for r in readings if r.status == "REVIEW")
    pending_slots = expected_slots - confirmed_slots - review_slots

    completion_pct = (
        round((confirmed_slots / due_slots * 100), 1)
        if due_slots > 0
        else (round((confirmed_slots / expected_slots * 100), 1) if expected_slots > 0 else 0.0)
    )

    summary_out = ReportOverviewSummary(
        total_meters=total_meters,
        expected_slots=expected_slots,
        due_slots=due_slots,
        confirmed_slots=confirmed_slots,
        pending_slots=pending_slots,
        review_slots=review_slots,
        completion_percent=completion_pct,
    )

    # 5. Hourly Progress Section
    hourly_items: list[ReportHourlyProgressItem] = []
    for r in today_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        is_curr = (r.id == current_round_id)
        timing = determine_timing_state(r_sched, now_utc, is_current=is_curr)

        r_readings = [rd for rd in readings if rd.reading_round_id == r.id]
        r_conf = sum(1 for rd in r_readings if rd.status == "CONFIRMED")
        r_rev = sum(1 for rd in r_readings if rd.status == "REVIEW")
        r_pend = total_meters - r_conf - r_rev
        r_pct = round((r_conf / total_meters * 100), 1) if total_meters > 0 else 0.0

        hourly_items.append(
            ReportHourlyProgressItem(
                round_id=r.id,
                scheduled_time=get_round_time_only_str(r_sched),
                timing_state=timing,
                total=total_meters,
                confirmed=r_conf,
                review=r_rev,
                pending=r_pend,
                completion_percent=r_pct,
            )
        )

    # 6. Location / Station Progress Section
    locations_map: dict[str, list[Meter]] = {}
    for m in meters:
        loc_key = m.location.strip() if m.location and m.location.strip() else "Chưa xác định vị trí"
        locations_map.setdefault(loc_key, []).append(m)

    location_items: list[ReportLocationProgressItem] = []
    for loc_name, loc_meters in sorted(locations_map.items()):
        loc_m_count = len(loc_meters)
        loc_m_ids = {m.id for m in loc_meters}

        loc_exp = loc_m_count * len(today_rounds)
        loc_due = loc_m_count * len(due_rounds)

        loc_readings = [rd for rd in readings if rd.meter_id in loc_m_ids]
        loc_conf = sum(1 for rd in loc_readings if rd.status == "CONFIRMED")
        loc_rev = sum(1 for rd in loc_readings if rd.status == "REVIEW")
        loc_pend = loc_exp - loc_conf - loc_rev
        loc_pct = (
            round((loc_conf / loc_due * 100), 1)
            if loc_due > 0
            else (round((loc_conf / loc_exp * 100), 1) if loc_exp > 0 else 0.0)
        )

        location_items.append(
            ReportLocationProgressItem(
                location=loc_name,
                meter_count=loc_m_count,
                expected_slots=loc_exp,
                due_slots=loc_due,
                confirmed_slots=loc_conf,
                review_slots=loc_rev,
                pending_slots=loc_pend,
                completion_percent=loc_pct,
            )
        )

    return ReportOverviewResponse(
        date=target_date_str,
        date_formatted=date_formatted,
        summary=summary_out,
        hourly=hourly_items,
        locations=location_items,
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

    # 2. Today's non-legacy rounds (1 query)
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
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(LOCAL_TZ)

    if not date_str:
        target_date_str = now_local.strftime("%Y-%m-%d")
    else:
        target_date_str = date_str

    date_formatted = format_date_vn(target_date_str)

    # 1. Active meters
    meters = db.query(Meter).filter(Meter.is_active == True).order_by(Meter.meter_code.asc()).all()

    # 2. Today's rounds
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

    # 3. Readings
    readings = []
    if round_ids:
        readings = (
            db.query(MeterReading)
            .filter(MeterReading.reading_round_id.in_(round_ids))
            .all()
        )

    readings_map: dict[tuple[str, str], MeterReading] = {
        (r.meter_id, r.reading_round_id): r for r in readings
    }

    # Write CSV with UTF-8 BOM
    output = io.StringIO()
    # Write UTF-8 BOM for Vietnamese Excel compatibility
    output.write("\ufeff")

    writer = csv.writer(output, dialect="excel")
    writer.writerow([
        "Ngày tác nghiệp",
        "Khung giờ",
        "Mã công tơ",
        "Tên công tơ",
        "Vị trí / Trạm",
        "Loại công tơ",
        "Trạng thái",
        "Chỉ số (kWh)",
        "Chỉ số OCR",
        "Nguồn xác nhận",
        "Thời gian ghi",
        "Mã nhân viên",
        "Họ tên nhân viên",
    ])

    for r in today_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        sched_time_str = get_round_time_only_str(r_sched)

        for m in meters:
            rd = readings_map.get((m.id, r.id))
            if rd:
                st = "ĐÃ XÁC NHẬN" if rd.status == "CONFIRMED" else ("CẦN KIỂM TRA" if rd.status == "REVIEW" else "CHƯA GHI")
                reading_val = rd.reading or ""
                ocr_val = rd.ocr_reading or ""
                conf_src = rd.confirmation_source or ""
                rec_time = get_local_time_str(rd.server_timestamp) if rd.server_timestamp else ""
                emp_code = rd.user.employee_code if rd.user else ""
                emp_name = rd.user.full_name if rd.user else ""
            else:
                st = "CHƯA GHI"
                reading_val = ""
                ocr_val = ""
                conf_src = ""
                rec_time = ""
                emp_code = ""
                emp_name = ""

            m_type = "LCD" if (m.meter_type and m.meter_type.upper() == "LCD") else "Cơ"

            writer.writerow([
                date_formatted,
                sched_time_str,
                m.meter_code,
                m.name,
                m.location or "Chưa xác định",
                m_type,
                st,
                reading_val,
                ocr_val,
                conf_src,
                rec_time,
                emp_code,
                emp_name,
            ])

    return output.getvalue()
