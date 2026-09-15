import base64
import hashlib
import json
import logging
from pathlib import Path
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import cv2
import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Meter, MeterReading, MeterReadingEvidence, MeterTrainingSample, ReadingBatch, ReadingRound, User
from .schemas import (
    BatchMeterItem,
    BatchProgress,
    ConfirmReadingRequest,
    LatestConfirmedReading,
    MarkReviewRequest,
    MeterOperationItem,
    MeterOut,
    MeterReadingHistoryItem,
    MeterTrendPoint,
    ReadingBatchCurrentResponse,
    ReadingRoundOut,
    RecentHourlySlot,
    RecordedByOut,
    TodayHourlySlot,
    TodayOperationsResponse,
    TodayOperationsSummary,
)

settings = get_settings()

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))

MAX_READING_LENGTH = 12
READING_PATTERN = re.compile(r"^\d+(\.\d+)?$")


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


def get_open_reading_batch(db: Session) -> Optional[ReadingBatch]:
    return (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .order_by(ReadingBatch.created_at.desc())
        .first()
    )


def calculate_round_progress(db: Session, round_id: str) -> BatchProgress:
    total_meters = db.query(Meter).filter(Meter.is_active == True).count()
    readings = (
        db.query(MeterReading)
        .join(Meter, MeterReading.meter_id == Meter.id)
        .filter(MeterReading.reading_round_id == round_id, Meter.is_active == True)
        .all()
    )

    confirmed = sum(1 for r in readings if r.status == "CONFIRMED")
    review = sum(1 for r in readings if r.status == "REVIEW")
    pending = max(0, total_meters - (confirmed + review))

    return BatchProgress(
        total=total_meters,
        confirmed=confirmed,
        review=review,
        pending=pending,
    )


def calculate_batch_progress(db: Session, batch_id: str) -> BatchProgress:
    total_meters = db.query(Meter).filter(Meter.is_active == True).count()
    readings = (
        db.query(MeterReading)
        .join(Meter, MeterReading.meter_id == Meter.id)
        .filter(MeterReading.batch_id == batch_id, Meter.is_active == True)
        .all()
    )

    confirmed = sum(1 for r in readings if r.status == "CONFIRMED")
    review = sum(1 for r in readings if r.status == "REVIEW")
    pending = max(0, total_meters - (confirmed + review))

    return BatchProgress(
        total=total_meters,
        confirmed=confirmed,
        review=review,
        pending=pending,
    )


def determine_round_timing_state(scheduled_at: datetime, now_utc: datetime, is_latest_past: bool = False) -> str:
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    if scheduled_at > now_utc:
        return "UPCOMING"
    elif is_latest_past:
        return "CURRENT"
    else:
        return "PAST"


def get_current_or_nearest_round(
    db: Session,
    batch_id: str,
    date_filter: Optional[str] = None,
) -> tuple[Optional[ReadingRound], Optional[ReadingRound]]:
    now_utc = datetime.now(timezone.utc)
    if not date_filter:
        now_local = now_utc.astimezone(LOCAL_TZ)
        target_date_str = now_local.strftime("%Y-%m-%d")
    else:
        target_date_str = date_filter

    # Query all OPEN, non-legacy rounds for the batch
    rounds = (
        db.query(ReadingRound)
        .filter(
            ReadingRound.batch_id == batch_id,
            ReadingRound.status == "OPEN",
            ReadingRound.is_legacy == False,
        )
        .all()
    )

    # Filter to target operational date in LOCAL_TZ
    day_rounds = []
    for r in rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        r_local_date = r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
        if r_local_date == target_date_str:
            day_rounds.append(r)

    # 1. Past/current open rounds for this date: scheduled_at <= now, latest first
    past_open = sorted(
        [r for r in day_rounds if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) <= now_utc],
        key=lambda x: x.scheduled_at,
        reverse=True,
    )
    current_round = past_open[0] if past_open else None

    # 2. Upcoming open rounds for this date: scheduled_at > now, earliest first
    upcoming_open = sorted(
        [r for r in day_rounds if (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at) > now_utc],
        key=lambda x: x.scheduled_at,
    )
    nearest_upcoming = upcoming_open[0] if upcoming_open else None

    return current_round, nearest_upcoming


def get_batch_rounds_with_progress(
    db: Session,
    batch_id: str,
    date_filter: Optional[str] = None,
    include_legacy: bool = False,
) -> list[ReadingRoundOut]:
    now_utc = datetime.now(timezone.utc)
    query = db.query(ReadingRound).filter(ReadingRound.batch_id == batch_id)

    if not include_legacy:
        query = query.filter(ReadingRound.is_legacy == False)

    rounds = query.order_by(ReadingRound.scheduled_at.asc()).all()

    # If date_filter is provided (YYYY-MM-DD), filter rounds to that local date in LOCAL_TZ
    if date_filter:
        filtered_rounds = []
        for r in rounds:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            r_local_date = r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
            if r_local_date == date_filter:
                filtered_rounds.append(r)
        rounds = filtered_rounds

    current_round, _ = get_current_or_nearest_round(db, batch_id, date_filter=date_filter)
    current_id = current_round.id if current_round else None

    results: list[ReadingRoundOut] = []
    for r in rounds:
        progress = calculate_round_progress(db, r.id)
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        is_curr = (r.id == current_id)
        timing_state = determine_round_timing_state(r_sched, now_utc, is_latest_past=is_curr)

        results.append(
            ReadingRoundOut(
                id=r.id,
                batch_id=r.batch_id,
                scheduled_at=r_sched.isoformat(),
                scheduled_local=get_round_local_time_str(r_sched),
                scheduled_time_only=get_round_time_only_str(r_sched),
                status=r.status,
                is_legacy=r.is_legacy,
                timing_state=timing_state,
                progress=progress,
            )
        )
    return results


def get_round_meters_with_status(
    db: Session,
    round_obj: ReadingRound,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> list[BatchMeterItem]:
    query = db.query(Meter).filter(Meter.is_active == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Meter.meter_code.ilike(term))
            | (Meter.name.ilike(term))
            | (Meter.location.ilike(term))
        )

    meters = query.order_by(Meter.meter_code.asc()).all()

    # Pre-fetch readings for this specific round
    readings = (
        db.query(MeterReading)
        .filter(MeterReading.reading_round_id == round_obj.id)
        .all()
    )
    readings_map = {r.meter_id: r for r in readings}

    results: list[BatchMeterItem] = []

    for m in meters:
        reading = readings_map.get(m.id)
        if reading:
            r_status = reading.status  # "CONFIRMED" | "REVIEW"
            r_val = reading.reading
            r_ts = reading.server_timestamp.isoformat() if reading.server_timestamp else None
            r_fmt = get_local_time_str(reading.server_timestamp) if reading.server_timestamp else None
            r_by = (
                RecordedByOut(
                    employee_code=reading.user.employee_code,
                    full_name=reading.user.full_name,
                )
                if reading.user
                else None
            )
            r_id = reading.id
        else:
            r_status = "PENDING"
            r_val = None
            r_ts = None
            r_fmt = None
            r_by = None
            r_id = None

        if status_filter and status_filter.strip():
            filter_norm = status_filter.strip().upper()
            if filter_norm in ("PENDING", "CONFIRMED", "REVIEW"):
                if r_status != filter_norm:
                    continue

        results.append(
            BatchMeterItem(
                meter=MeterOut(
                    id=m.id,
                    meter_code=m.meter_code,
                    name=m.name,
                    location=m.location,
                    meter_type=m.meter_type,
                    is_active=m.is_active,
                ),
                reading_status=r_status,
                reading=r_val,
                recorded_at=r_ts,
                formatted_recorded_at=r_fmt,
                recorded_by=r_by,
                reading_id=r_id,
            )
        )

    return results


def get_batch_meters_with_status(
    db: Session,
    batch: ReadingBatch,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> list[BatchMeterItem]:
    query = db.query(Meter).filter(Meter.is_active == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Meter.meter_code.ilike(term))
            | (Meter.name.ilike(term))
            | (Meter.location.ilike(term))
        )

    meters = query.order_by(Meter.meter_code.asc()).all()

    readings = (
        db.query(MeterReading)
        .filter(MeterReading.batch_id == batch.id)
        .all()
    )
    readings_map = {r.meter_id: r for r in readings}

    results: list[BatchMeterItem] = []

    for m in meters:
        reading = readings_map.get(m.id)
        if reading:
            r_status = reading.status
            r_val = reading.reading
            r_ts = reading.server_timestamp.isoformat() if reading.server_timestamp else None
            r_fmt = get_local_time_str(reading.server_timestamp) if reading.server_timestamp else None
            r_by = (
                RecordedByOut(
                    employee_code=reading.user.employee_code,
                    full_name=reading.user.full_name,
                )
                if reading.user
                else None
            )
            r_id = reading.id
        else:
            r_status = "PENDING"
            r_val = None
            r_ts = None
            r_fmt = None
            r_by = None
            r_id = None

        if status_filter and status_filter.strip():
            filter_norm = status_filter.strip().upper()
            if filter_norm in ("PENDING", "CONFIRMED", "REVIEW"):
                if r_status != filter_norm:
                    continue

        results.append(
            BatchMeterItem(
                meter=MeterOut(
                    id=m.id,
                    meter_code=m.meter_code,
                    name=m.name,
                    location=m.location,
                    meter_type=m.meter_type,
                    is_active=m.is_active,
                ),
                reading_status=r_status,
                reading=r_val,
                recorded_at=r_ts,
                formatted_recorded_at=r_fmt,
                recorded_by=r_by,
                reading_id=r_id,
            )
        )

    return results


def save_meter_reading_evidence(
    db: Session,
    meter_reading_id: str,
    image_bytes: bytes,
    roi_bbox: Optional[list[float]] = None,
    captured_at: Optional[datetime] = None,
) -> Optional[MeterReadingEvidence]:
    """
    Saves private sanitized operational meter image evidence and registers a MeterReadingEvidence record.
    Strips EXIF, normalizes to clean JPEG Q95, computes SHA256, and stores in data/meter_reading_evidence/.
    """
    file_path: Optional[Path] = None
    try:
        if not image_bytes:
            return None

        # Decode image using OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None or img.size == 0:
            return None

        h, w = img.shape[:2]

        # Re-encode to clean JPEG quality 95 to strip EXIF and normalize format
        success, encoded_jpg = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        if not success:
            return None

        persisted_bytes = encoded_jpg.tobytes()
        photo_sha256 = hashlib.sha256(persisted_bytes).hexdigest()
        photo_key = f"{uuid.uuid4()}.jpg"

        current_settings = get_settings()
        evidence_dir = Path(current_settings.meter_reading_evidence_dir)
        evidence_dir.mkdir(parents=True, exist_ok=True)
        file_path = evidence_dir / photo_key
        with open(file_path, "wb") as f:
            f.write(persisted_bytes)

        roi_bbox_str = json.dumps(roi_bbox) if roi_bbox else None

        existing_evidence = (
            db.query(MeterReadingEvidence)
            .filter(MeterReadingEvidence.meter_reading_id == meter_reading_id)
            .first()
        )
        if existing_evidence:
            existing_evidence.image_filename = photo_key
            existing_evidence.image_sha256 = photo_sha256
            existing_evidence.mime_type = "image/jpeg"
            existing_evidence.width = w
            existing_evidence.height = h
            existing_evidence.roi_bbox = roi_bbox_str
            existing_evidence.captured_at = captured_at or datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_evidence)
            return existing_evidence
        else:
            evidence = MeterReadingEvidence(
                id=str(uuid.uuid4()),
                meter_reading_id=meter_reading_id,
                image_filename=photo_key,
                image_sha256=photo_sha256,
                mime_type="image/jpeg",
                width=w,
                height=h,
                roi_bbox=roi_bbox_str,
                captured_at=captured_at or datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
            )
            db.add(evidence)
            db.commit()
            db.refresh(evidence)
            return evidence
    except Exception as e:
        if file_path and file_path.is_file():
            try:
                file_path.unlink()
            except Exception:
                pass
        try:
            db.rollback()
        except Exception:
            pass
        # Official meter reading must not fail if evidence file persistence fails
        logging.getLogger(__name__).warning("Failed to save meter reading evidence: %s", e)
        return None


def save_meter_training_sample(
    db: Session,
    user_id: str,
    meter_id: Optional[str],
    reading_round_id: Optional[str],
    sample_type: str,
    corrected_reading: str,
    ocr_reading: Optional[str],
    roi_bbox: Optional[list[float]],
    det_confidence: Optional[float],
    ocr_confidence: Optional[float],
    localization_imgsz: Optional[int],
    image_bytes: bytes,
) -> Optional[MeterTrainingSample]:
    """
    Saves a private sanitized training image and registers a MeterTrainingSample record.
    Strips EXIF, normalizes to JPEG Q95, computes SHA256, and stores outside public static paths.
    """
    try:
        if not image_bytes:
            return None

        # Decode image using OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None or img.size == 0:
            return None

        # Re-encode to clean JPEG quality 95 to strip EXIF and normalize format
        success, encoded_jpg = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        if not success:
            return None

        persisted_bytes = encoded_jpg.tobytes()
        photo_sha256 = hashlib.sha256(persisted_bytes).hexdigest()
        photo_key = f"{uuid.uuid4()}.jpg"

        current_settings = get_settings()
        training_dir = Path(current_settings.meter_training_dir)
        training_dir.mkdir(parents=True, exist_ok=True)
        file_path = training_dir / photo_key
        with open(file_path, "wb") as f:
            f.write(persisted_bytes)

        # Determine annotation readiness
        # Case A: E2 found valid ROI bbox -> READY_OCR
        # Case B: E2 failed to localize / no bbox -> NEEDS_BBOX
        if roi_bbox is not None and len(roi_bbox) == 4:
            annotation_status = "READY_OCR"
        else:
            annotation_status = "NEEDS_BBOX"

        roi_bbox_str = json.dumps(roi_bbox) if roi_bbox else None

        sample = MeterTrainingSample(
            id=str(uuid.uuid4()),
            meter_id=meter_id,
            reading_round_id=reading_round_id,
            created_by_user_id=user_id,
            sample_type=sample_type,
            corrected_reading=corrected_reading,
            ocr_reading=ocr_reading,
            roi_bbox=roi_bbox_str,
            det_confidence=det_confidence,
            ocr_confidence=ocr_confidence,
            localization_imgsz=localization_imgsz,
            image_filename=photo_key,
            image_sha256=photo_sha256,
            annotation_status=annotation_status,
            created_at=datetime.now(timezone.utc),
        )
        db.add(sample)
        db.commit()
        db.refresh(sample)
        return sample
    except Exception as e:
        # Business reading must not fail if training sample storage fails
        logging.getLogger(__name__).warning("Failed to save meter training sample: %s", e)
        return None


def confirm_meter_reading(
    db: Session,
    user: User,
    payload: ConfirmReadingRequest,
) -> MeterReading:
    # 1. Validate round
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == payload.reading_round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt ghi chỉ số.",
        )
    if round_obj.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt ghi chỉ số đã đóng, không thể ghi nhận thêm.",
        )

    # 2. Validate parent batch
    batch = round_obj.batch
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt ghi chỉ số của lượt này.",
        )
    if batch.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đợt ghi chỉ số đã đóng, không thể ghi nhận thêm.",
        )

    # 3. Future round policy: do not allow recording into future rounds before scheduled time
    now_utc = datetime.now(timezone.utc)
    round_sched = round_obj.scheduled_at.replace(tzinfo=timezone.utc) if round_obj.scheduled_at.tzinfo is None else round_obj.scheduled_at
    if round_sched > now_utc:
        sched_str = get_round_time_only_str(round_sched)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chưa đến giờ ghi chỉ số cho lượt này (dự kiến {sched_str}).",
        )

    # 4. Validate meter
    meter = db.query(Meter).filter(Meter.id == payload.meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin công tơ.",
        )
    lifecycle_status = getattr(meter, "lifecycle_status", None) or ("ACTIVE" if meter.is_active else "INACTIVE")
    if lifecycle_status != "ACTIVE":
        detail_msg = "Công tơ đã ngừng sử dụng vĩnh viễn (RETIRED)." if lifecycle_status == "RETIRED" else "Công tơ đang ở trạng thái tạm ngừng (INACTIVE)."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{detail_msg} Không thể ghi nhận chỉ số mới.",
        )

    # 5. Validate reading format (canonical dot form ^\d+(\.\d+)?$)
    clean_reading = payload.reading.strip() if payload.reading else ""
    if not clean_reading:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ số công tơ không được để trống.",
        )

    if not READING_PATTERN.match(clean_reading) or len(clean_reading) > MAX_READING_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ số công tơ chỉ được chứa các chữ số (0-9), tối đa một dấu chấm thập phân và không vượt quá {MAX_READING_LENGTH} ký tự.",
        )

    # 6. Check existing reading for (meter_id, reading_round_id)
    existing = (
        db.query(MeterReading)
        .filter(
            MeterReading.meter_id == meter.id,
            MeterReading.reading_round_id == round_obj.id,
        )
        .first()
    )

    if existing and existing.status == "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Công tơ này đã được xác nhận chỉ số trong lượt hiện tại. V1 không hỗ trợ ghi đè chỉ số đã xác nhận.",
        )

    # 7. Validate and enforce canonical provenance contract
    req_source = payload.confirmation_source
    raw_ocr = payload.ocr_reading.strip() if payload.ocr_reading and payload.ocr_reading.strip() else None

    if req_source == "MANUAL_ENTRY":
        if raw_ocr is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yêu cầu nhập thủ công (MANUAL_ENTRY) không được chứa kết quả OCR (ocr_reading phải là null).",
            )
        conf_source = "MANUAL_ENTRY"
        clean_ocr_reading = None

    elif req_source == "USER_CORRECTED":
        if raw_ocr is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yêu cầu hiệu chỉnh chỉ số (USER_CORRECTED) bắt buộc phải có kết quả OCR ban đầu (ocr_reading).",
            )
        conf_source = "USER_CORRECTED"
        clean_ocr_reading = raw_ocr

    elif req_source == "OCR_CONFIRMED":
        if raw_ocr is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yêu cầu xác nhận từ OCR (OCR_CONFIRMED) bắt buộc phải có kết quả OCR (ocr_reading).",
            )
        if clean_reading != raw_ocr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yêu cầu xác nhận từ OCR (OCR_CONFIRMED) không hợp lệ: chỉ số xác nhận khác với kết quả OCR.",
            )
        conf_source = "OCR_CONFIRMED"
        clean_ocr_reading = raw_ocr

    elif req_source is None:
        # If client did not specify confirmation_source: determine strictly
        if raw_ocr is None:
            conf_source = "MANUAL_ENTRY"
            clean_ocr_reading = None
        elif clean_reading != raw_ocr:
            conf_source = "USER_CORRECTED"
            clean_ocr_reading = raw_ocr
        else:
            conf_source = "OCR_CONFIRMED"
            clean_ocr_reading = raw_ocr
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nguồn xác nhận không hợp lệ: '{req_source}'. Chỉ chấp nhận 'OCR_CONFIRMED', 'USER_CORRECTED' hoặc 'MANUAL_ENTRY'.",
        )

    if existing:
        # Update existing REVIEW record in this round to CONFIRMED
        existing.reading = clean_reading
        existing.ocr_reading = clean_ocr_reading
        existing.confirmation_source = conf_source
        existing.status = "CONFIRMED"
        existing.user_id = user.id
        existing.batch_id = batch.id
        existing.meter_type = payload.meter_type
        existing.det_confidence = payload.det_confidence
        existing.ocr_confidence = payload.ocr_confidence
        existing.localization_imgsz = payload.localization_imgsz
        existing.pipeline_version = payload.pipeline_version
        existing.server_timestamp = now_utc
        existing.updated_at = now_utc
        db.commit()
        db.refresh(existing)
        confirmed_record = existing
    else:
        # Create new CONFIRMED record for this round
        new_reading = MeterReading(
            meter_id=meter.id,
            batch_id=batch.id,
            reading_round_id=round_obj.id,
            user_id=user.id,
            reading=clean_reading,
            ocr_reading=clean_ocr_reading,
            confirmation_source=conf_source,
            status="CONFIRMED",
            meter_type=payload.meter_type,
            det_confidence=payload.det_confidence,
            ocr_confidence=payload.ocr_confidence,
            localization_imgsz=payload.localization_imgsz,
            pipeline_version=payload.pipeline_version,
            server_timestamp=now_utc,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(new_reading)
        db.commit()
        db.refresh(new_reading)
        confirmed_record = new_reading

    # 8. Persist operational reading evidence if image is provided
    if payload.image_base64:
        try:
            b64_str = payload.image_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            img_bytes = base64.b64decode(b64_str)

            # Persist operational evidence
            save_meter_reading_evidence(
                db=db,
                meter_reading_id=confirmed_record.id,
                image_bytes=img_bytes,
                roi_bbox=payload.roi_bbox,
                captured_at=confirmed_record.created_at,
            )

            # 9. Independently capture training sample for hard samples (USER_CORRECTED / MANUAL_ENTRY)
            if conf_source in ("USER_CORRECTED", "MANUAL_ENTRY"):
                if conf_source == "USER_CORRECTED":
                    sample_type = "OCR_CORRECTION"
                elif conf_source == "MANUAL_ENTRY":
                    if payload.roi_bbox:
                        sample_type = "MANUAL_ENTRY"
                    else:
                        sample_type = "LOCALIZATION_FAILURE"
                else:
                    sample_type = "MANUAL_ENTRY"

                save_meter_training_sample(
                    db=db,
                    user_id=user.id,
                    meter_id=meter.id,
                    reading_round_id=round_obj.id,
                    sample_type=sample_type,
                    corrected_reading=clean_reading,
                    ocr_reading=clean_ocr_reading,
                    roi_bbox=payload.roi_bbox,
                    det_confidence=payload.det_confidence,
                    ocr_confidence=payload.ocr_confidence,
                    localization_imgsz=payload.localization_imgsz,
                    image_bytes=img_bytes,
                )
        except Exception as err:
            logging.getLogger(__name__).warning("Evidence/training sample exception: %s", err)

    return confirmed_record


def mark_meter_review(
    db: Session,
    user: User,
    payload: MarkReviewRequest,
) -> MeterReading:
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == payload.reading_round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt ghi chỉ số.",
        )
    if round_obj.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt ghi chỉ số đã đóng, không thể ghi nhận thêm.",
        )

    batch = round_obj.batch
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt ghi chỉ số của lượt này.",
        )
    if batch.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đợt ghi chỉ số đã đóng, không thể ghi nhận thêm.",
        )

    now_utc = datetime.now(timezone.utc)
    round_sched = round_obj.scheduled_at.replace(tzinfo=timezone.utc) if round_obj.scheduled_at.tzinfo is None else round_obj.scheduled_at
    if round_sched > now_utc:
        sched_str = get_round_time_only_str(round_sched)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chưa đến giờ ghi chỉ số cho lượt này (dự kiến {sched_str}).",
        )

    meter = db.query(Meter).filter(Meter.id == payload.meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin công tơ.",
        )
    lifecycle_status = getattr(meter, "lifecycle_status", None) or ("ACTIVE" if meter.is_active else "INACTIVE")
    if lifecycle_status != "ACTIVE":
        detail_msg = "Công tơ đã ngừng sử dụng vĩnh viễn (RETIRED)." if lifecycle_status == "RETIRED" else "Công tơ đang ở trạng thái tạm ngừng (INACTIVE)."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{detail_msg} Không thể ghi nhận chỉ số mới.",
        )

    existing = (
        db.query(MeterReading)
        .filter(
            MeterReading.meter_id == meter.id,
            MeterReading.reading_round_id == round_obj.id,
        )
        .first()
    )

    if existing and existing.status == "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Công tơ này đã được xác nhận chỉ số, không thể đánh dấu cần kiểm tra.",
        )

    if existing:
        existing.reading = None
        existing.status = "REVIEW"
        existing.user_id = user.id
        existing.batch_id = batch.id
        existing.meter_type = payload.meter_type
        existing.det_confidence = payload.det_confidence
        existing.ocr_confidence = payload.ocr_confidence
        existing.localization_imgsz = payload.localization_imgsz
        existing.pipeline_version = payload.pipeline_version
        existing.server_timestamp = now_utc
        existing.updated_at = now_utc
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_reading = MeterReading(
            meter_id=meter.id,
            batch_id=batch.id,
            reading_round_id=round_obj.id,
            user_id=user.id,
            reading=None,
            status="REVIEW",
            meter_type=payload.meter_type,
            det_confidence=payload.det_confidence,
            ocr_confidence=payload.ocr_confidence,
            localization_imgsz=payload.localization_imgsz,
            pipeline_version=payload.pipeline_version,
            server_timestamp=now_utc,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(new_reading)
        db.commit()
        db.refresh(new_reading)
        return new_reading


def get_meter_history(db: Session, meter_id: str) -> list[MeterReadingHistoryItem]:
    readings = (
        db.query(MeterReading)
        .filter(MeterReading.meter_id == meter_id)
        .order_by(MeterReading.server_timestamp.desc())
        .all()
    )

    history: list[MeterReadingHistoryItem] = []
    for r in readings:
        user_info = (
            RecordedByOut(
                employee_code=r.user.employee_code,
                full_name=r.user.full_name,
            )
            if r.user
            else RecordedByOut(employee_code="N/A", full_name="Hệ thống")
        )
        batch_name = r.batch.name if r.batch else "Đợt ghi chỉ số"
        period_key = r.batch.period_key if r.batch else ""

        round_sched_at = None
        round_sched_local = None
        if r.round:
            r_sched = r.round.scheduled_at.replace(tzinfo=timezone.utc) if r.round.scheduled_at.tzinfo is None else r.round.scheduled_at
            round_sched_at = r_sched.isoformat()
            round_sched_local = get_round_local_time_str(r_sched)

        history.append(
            MeterReadingHistoryItem(
                id=r.id,
                batch_id=r.batch_id,
                batch_name=batch_name,
                period_key=period_key,
                reading_round_id=r.reading_round_id,
                round_scheduled_at=round_sched_at,
                round_scheduled_local=round_sched_local,
                reading=r.reading,
                ocr_reading=r.ocr_reading,
                confirmation_source=r.confirmation_source,
                status=r.status,
                meter_type=r.meter_type,
                server_timestamp=r.server_timestamp.isoformat(),
                formatted_time=get_local_time_str(r.server_timestamp),
                recorded_by=user_info,
            )
        )

    return history


def get_today_meter_operations(
    db: Session,
    date_filter: Optional[str] = None,
) -> TodayOperationsResponse:
    now_utc = datetime.now(timezone.utc)
    if not date_filter:
        now_local = now_utc.astimezone(LOCAL_TZ)
        target_date_str = now_local.strftime("%Y-%m-%d")
        target_date_obj = now_local.date()
    else:
        target_date_str = date_filter.strip()
        try:
            target_date_obj = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except ValueError:
            target_date_obj = now_utc.astimezone(LOCAL_TZ).date()
            target_date_str = target_date_obj.strftime("%Y-%m-%d")

    date_formatted = target_date_obj.strftime("%d/%m/%Y")

    batch = get_open_reading_batch(db)
    if not batch:
        return TodayOperationsResponse(
            date=target_date_str,
            date_formatted=date_formatted,
            batch=None,
            current_round=None,
            summary=TodayOperationsSummary(
                total_meters=0,
                confirmed_current=0,
                pending_current=0,
                review_current=0,
                percent_current=0,
            ),
            meters=[],
        )

    # Batch output info
    batch_prog = calculate_batch_progress(db, batch.id)
    batch_out = ReadingBatchCurrentResponse(
        id=batch.id,
        name=batch.name,
        period_key=batch.period_key,
        status=batch.status,
        progress=batch_prog,
    )

    # Resolve current round for target date
    current_r, _ = get_current_or_nearest_round(db, batch.id, date_filter=target_date_str)
    current_round_out = None
    current_id = None
    if current_r:
        current_id = current_r.id
        prog = calculate_round_progress(db, current_r.id)
        sched = current_r.scheduled_at.replace(tzinfo=timezone.utc) if current_r.scheduled_at.tzinfo is None else current_r.scheduled_at
        current_round_out = ReadingRoundOut(
            id=current_r.id,
            batch_id=current_r.batch_id,
            scheduled_at=sched.isoformat(),
            scheduled_local=get_round_local_time_str(sched),
            scheduled_time_only=get_round_time_only_str(sched),
            status=current_r.status,
            is_legacy=current_r.is_legacy,
            timing_state="CURRENT",
            progress=prog,
        )

    # Get all non-legacy scheduled rounds for this batch on target date
    all_rounds = (
        db.query(ReadingRound)
        .filter(
            ReadingRound.batch_id == batch.id,
            ReadingRound.is_legacy == False,
        )
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )

    today_rounds: list[ReadingRound] = []
    for r in all_rounds:
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        if r_sched.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str:
            today_rounds.append(r)

    # Active meters
    meters = db.query(Meter).filter(Meter.is_active == True).order_by(Meter.meter_code.asc()).all()

    # Pre-fetch all readings for this batch to avoid N+1 queries
    all_batch_readings = (
        db.query(MeterReading)
        .filter(MeterReading.batch_id == batch.id)
        .all()
    )

    # Map readings by (meter_id, reading_round_id)
    readings_map: dict[tuple[str, str], MeterReading] = {
        (r.meter_id, r.reading_round_id): r for r in all_batch_readings
    }

    # Map latest confirmed reading for each meter
    confirmed_readings = [r for r in all_batch_readings if r.status == "CONFIRMED"]
    confirmed_readings.sort(key=lambda x: x.server_timestamp, reverse=True)
    latest_confirmed_map: dict[str, MeterReading] = {}
    for r in confirmed_readings:
        if r.meter_id not in latest_confirmed_map:
            latest_confirmed_map[r.meter_id] = r

    meter_items: list[MeterOperationItem] = []

    for m in meters:
        # 1. Current slot status
        curr_sched_time = current_round_out.scheduled_time_only if current_round_out else None
        curr_rec_local = None
        if current_id:
            curr_reading = readings_map.get((m.id, current_id))
            if curr_reading:
                curr_status = curr_reading.status
                curr_val = curr_reading.reading
                if curr_reading.server_timestamp:
                    curr_rec_local = get_local_time_str(curr_reading.server_timestamp).split(" - ")[0]
            else:
                curr_status = "PENDING"
                curr_val = None
        else:
            curr_status = "NO_ROUND"
            curr_val = None

        # 2. Latest confirmed reading
        latest_conf_obj = None
        latest_reading = latest_confirmed_map.get(m.id)
        if latest_reading and latest_reading.reading:
            if latest_reading.round:
                lr_sched = latest_reading.round.scheduled_at.replace(tzinfo=timezone.utc) if latest_reading.round.scheduled_at.tzinfo is None else latest_reading.round.scheduled_at
                r_time_str = get_round_time_only_str(lr_sched)
            else:
                r_time_str = get_round_time_only_str(latest_reading.server_timestamp)

            lr_ts = latest_reading.server_timestamp.replace(tzinfo=timezone.utc) if latest_reading.server_timestamp.tzinfo is None else latest_reading.server_timestamp
            is_today_conf = (lr_ts.astimezone(LOCAL_TZ).strftime("%Y-%m-%d") == target_date_str)

            latest_conf_obj = LatestConfirmedReading(
                reading=latest_reading.reading,
                ocr_reading=latest_reading.ocr_reading,
                confirmation_source=latest_reading.confirmation_source,
                round_id=latest_reading.reading_round_id,
                round_time=r_time_str,
                server_timestamp=latest_reading.server_timestamp.isoformat(),
                formatted_server_time=get_local_time_str(latest_reading.server_timestamp),
                is_today=is_today_conf,
            )

        # 3. Today's hourly slots
        today_slots: list[TodayHourlySlot] = []
        for r in today_rounds:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            timing_state = determine_round_timing_state(r_sched, now_utc, is_latest_past=(r.id == current_id))
            
            slot_reading = readings_map.get((m.id, r.id))
            if slot_reading:
                slot_status = slot_reading.status
                slot_val = slot_reading.reading
                slot_ocr = slot_reading.ocr_reading
                slot_conf_src = slot_reading.confirmation_source
                slot_ts = slot_reading.server_timestamp.isoformat()
                slot_fmt_ts = get_local_time_str(slot_reading.server_timestamp)
                slot_rec_by = (
                    RecordedByOut(
                        employee_code=slot_reading.user.employee_code,
                        full_name=slot_reading.user.full_name,
                    )
                    if slot_reading.user
                    else None
                )
            else:
                slot_status = "PENDING"
                slot_val = None
                slot_ocr = None
                slot_conf_src = None
                slot_ts = None
                slot_fmt_ts = None
                slot_rec_by = None

            today_slots.append(
                TodayHourlySlot(
                    round_id=r.id,
                    scheduled_at=r_sched.isoformat(),
                    scheduled_local=get_round_local_time_str(r_sched),
                    scheduled_time_only=get_round_time_only_str(r_sched),
                    timing_state=timing_state,
                    status=slot_status,
                    reading=slot_val,
                    ocr_reading=slot_ocr,
                    confirmation_source=slot_conf_src,
                    recorded_at=slot_ts,
                    formatted_recorded_at=slot_fmt_ts,
                    recorded_by=slot_rec_by,
                )
            )

        # 4. Recent slots (3-4 slots operational window)
        recent_slots_list: list[RecentHourlySlot] = []
        if len(today_slots) <= 4:
            selected_slots = today_slots
        else:
            curr_idx = next((i for i, s in enumerate(today_slots) if s.timing_state == "CURRENT"), -1)
            if curr_idx >= 0:
                start_idx = max(0, min(curr_idx - 1, len(today_slots) - 4))
                selected_slots = today_slots[start_idx : start_idx + 4]
            else:
                up_idx = next((i for i, s in enumerate(today_slots) if s.timing_state == "UPCOMING"), -1)
                if up_idx > 0:
                    start_idx = max(0, min(up_idx - 2, len(today_slots) - 4))
                    selected_slots = today_slots[start_idx : start_idx + 4]
                else:
                    selected_slots = today_slots[:4]

        for s in selected_slots:
            recent_slots_list.append(
                RecentHourlySlot(
                    round_id=s.round_id,
                    scheduled_time=s.scheduled_time_only,
                    timing_state=s.timing_state,
                    status=s.status,
                    reading=s.reading,
                )
            )

        # 5. Trend points (recent 4-6 CONFIRMED numeric values ordered chronologically)
        meter_confirmed = [r for r in all_batch_readings if r.meter_id == m.id and r.status == "CONFIRMED" and r.reading]
        meter_confirmed.sort(key=lambda x: x.server_timestamp)
        trend_points: list[MeterTrendPoint] = []
        for cr in meter_confirmed:
            clean_str = cr.reading.replace(",", "").strip()
            try:
                numeric_val = float(clean_str)
                if cr.round:
                    cr_sched = cr.round.scheduled_at.replace(tzinfo=timezone.utc) if cr.round.scheduled_at.tzinfo is None else cr.round.scheduled_at
                    cr_time_str = get_round_time_only_str(cr_sched)
                else:
                    cr_time_str = get_round_time_only_str(cr.server_timestamp)
                trend_points.append(
                    MeterTrendPoint(
                        scheduled_time=cr_time_str,
                        reading=cr.reading,
                        value=numeric_val,
                    )
                )
            except (ValueError, TypeError):
                continue
        
        # Take the most recent 6 trend points
        if len(trend_points) > 6:
            trend_points = trend_points[-6:]

        # 6. Missed count (PAST slots today that are still PENDING)
        missed_c = sum(1 for s in today_slots if s.timing_state == "PAST" and s.status == "PENDING")

        meter_items.append(
            MeterOperationItem(
                meter=MeterOut(
                    id=m.id,
                    meter_code=m.meter_code,
                    name=m.name,
                    location=m.location,
                    meter_type=m.meter_type,
                    is_active=m.is_active,
                    created_at=m.created_at.isoformat() if m.created_at else None,
                ),
                current_status=curr_status,
                current_reading=curr_val,
                current_round_id=current_id,
                current_scheduled_time=curr_sched_time,
                current_recorded_local=curr_rec_local,
                latest_confirmed=latest_conf_obj,
                recent_slots=recent_slots_list,
                today_slots=today_slots,
                trend=trend_points,
                missed_count=missed_c,
            )
        )

    # 4. Summary metrics
    total_m = len(meters)
    conf_c = sum(1 for item in meter_items if item.current_status == "CONFIRMED")
    pend_c = sum(1 for item in meter_items if item.current_status == "PENDING")
    rev_c = sum(1 for item in meter_items if item.current_status == "REVIEW")
    pct_c = round((conf_c / total_m) * 100) if total_m > 0 else 0

    return TodayOperationsResponse(
        date=target_date_str,
        date_formatted=date_formatted,
        batch=batch_out,
        current_round=current_round_out,
        summary=TodayOperationsSummary(
            total_meters=total_m,
            confirmed_current=conf_c,
            pending_current=pend_c,
            review_current=rev_c,
            percent_current=pct_c,
        ),
        meters=meter_items,
    )


