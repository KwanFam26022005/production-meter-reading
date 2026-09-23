import hashlib
import io
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AttendanceEvent, User

settings = get_settings()

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))


def get_current_business_date() -> str:
    now_local = datetime.now(LOCAL_TZ)
    return now_local.strftime("%Y-%m-%d")


def get_local_time_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%H:%M:%S - %d/%m/%Y")


def ensure_photo_dir() -> Path:
    current_settings = get_settings()
    photo_dir = Path(current_settings.attendance_photo_dir)
    photo_dir.mkdir(parents=True, exist_ok=True)
    return photo_dir


def process_and_save_attendance_photo(image_bytes: bytes) -> tuple[str, str, int]:
    """
    Validates, strips metadata, normalizes to JPEG, and writes to private storage.
    Returns: (photo_key, photo_sha256, photo_size_bytes)
    """
    current_settings = get_settings()
    if len(image_bytes) > current_settings.max_attendance_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh chấm công vượt quá giới hạn {current_settings.max_attendance_upload_mb}MB.",
        )

    # Decode image using OpenCV
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp ảnh chấm công không hợp lệ hoặc không thể giải mã.",
        )

    # Re-encode to clean JPEG quality 90 to strip EXIF and normalize format
    success, encoded_jpg = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể chuẩn hóa tệp ảnh chấm công.",
        )

    persisted_bytes = encoded_jpg.tobytes()
    photo_sha256 = hashlib.sha256(persisted_bytes).hexdigest()
    photo_key = f"{uuid.uuid4()}.jpg"

    photo_dir = ensure_photo_dir()
    file_path = photo_dir / photo_key
    with open(file_path, "wb") as f:
        f.write(persisted_bytes)

    return photo_key, photo_sha256, len(persisted_bytes)


def get_today_attendance_summary(db: Session, user_id: str) -> dict:
    today_str = get_current_business_date()
    events = (
        db.query(AttendanceEvent)
        .filter(
            AttendanceEvent.user_id == user_id,
            AttendanceEvent.business_date == today_str,
        )
        .all()
    )

    check_in_event = next((e for e in events if e.event_type == "CHECK_IN"), None)
    check_out_event = next((e for e in events if e.event_type == "CHECK_OUT"), None)

    if not check_in_event:
        allowed_action = "CHECK_IN"
    elif not check_out_event:
        allowed_action = "CHECK_OUT"
    else:
        allowed_action = None

    return {
        "date": today_str,
        "check_in": {
            "id": check_in_event.id,
            "timestamp": check_in_event.server_timestamp.isoformat(),
            "formatted_time": get_local_time_str(check_in_event.server_timestamp),
            "status": check_in_event.status,
            "photo_sha256": check_in_event.photo_sha256,
            "payload_sha256": check_in_event.payload_sha256,
            "client_submission_id": check_in_event.client_submission_id,
        }
        if check_in_event
        else None,
        "check_out": {
            "id": check_out_event.id,
            "timestamp": check_out_event.server_timestamp.isoformat(),
            "formatted_time": get_local_time_str(check_out_event.server_timestamp),
            "status": check_out_event.status,
            "photo_sha256": check_out_event.photo_sha256,
            "payload_sha256": check_out_event.payload_sha256,
            "client_submission_id": check_out_event.client_submission_id,
        }
        if check_out_event
        else None,
        "allowed_action": allowed_action,
    }


def record_attendance(
    db: Session,
    user: User,
    event_type: str,
    image_bytes: bytes,
    capture_source: str = "live_camera",
    client_submission_id: Optional[str] = None,
) -> AttendanceEvent:
    current_settings = get_settings()
    if len(image_bytes) > current_settings.max_attendance_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh chấm công vượt quá giới hạn {current_settings.max_attendance_upload_mb}MB.",
        )

    if event_type not in ("CHECK_IN", "CHECK_OUT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại sự kiện chấm công không hợp lệ.",
        )

    # Server-computed fingerprint of the ORIGINAL uploaded payload bytes
    original_payload_sha256 = hashlib.sha256(image_bytes).hexdigest()
    today_str = get_current_business_date()

    # Pre-check: Idempotency by client_submission_id scoped to the authenticated user
    if client_submission_id:
        existing_sub = (
            db.query(AttendanceEvent)
            .filter(
                AttendanceEvent.user_id == user.id,
                AttendanceEvent.client_submission_id == client_submission_id,
            )
            .first()
        )
        if existing_sub:
            # Check for conflicting event type
            if existing_sub.event_type != event_type:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Mã gửi '{client_submission_id}' đã được sử dụng cho sự kiện khác ({existing_sub.event_type}).",
                )
            # Check for conflicting payload content
            if existing_sub.payload_sha256 and existing_sub.payload_sha256 != original_payload_sha256:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Mã gửi '{client_submission_id}' đã được sử dụng nhưng nội dung ảnh tải lên không trùng khớp.",
                )
            # Same user, same submission ID, same event type and same payload: authoritative replay
            return existing_sub

    # Sequence checks for the business date
    existing_events = (
        db.query(AttendanceEvent)
        .filter(
            AttendanceEvent.user_id == user.id,
            AttendanceEvent.business_date == today_str,
        )
        .all()
    )

    check_in_existing = next((e for e in existing_events if e.event_type == "CHECK_IN"), None)
    check_out_existing = next((e for e in existing_events if e.event_type == "CHECK_OUT"), None)

    if event_type == "CHECK_IN":
        if check_in_existing:
            time_str = get_local_time_str(check_in_existing.server_timestamp)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã chấm công vào ca hôm nay lúc {time_str}.",
            )
    elif event_type == "CHECK_OUT":
        if not check_in_existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Chưa ghi nhận thông tin vào ca hôm nay. Vui lòng chấm công vào ca trước.",
            )
        if check_out_existing:
            time_str = get_local_time_str(check_out_existing.server_timestamp)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã hoàn tất chấm công tan ca hôm nay lúc {time_str}.",
            )

    # Process and save normalized photo to storage
    photo_key, photo_sha256, photo_size = process_and_save_attendance_photo(image_bytes)
    photo_dir = ensure_photo_dir()
    persisted_file_path = photo_dir / photo_key

    now_utc = datetime.now(timezone.utc)
    event_obj = AttendanceEvent(
        user_id=user.id,
        business_date=today_str,
        event_type=event_type,
        server_timestamp=now_utc,
        photo_key=photo_key,
        photo_sha256=photo_sha256,
        payload_sha256=original_payload_sha256,
        mime_type="image/jpeg",
        photo_size=photo_size,
        capture_source=capture_source,
        status="VALID",
        client_submission_id=client_submission_id,
        created_at=now_utc,
    )

    # Transaction boundary: Track whether DB commit succeeded before any cleanup decisions
    is_committed = False
    try:
        db.add(event_obj)
        db.commit()
        is_committed = True
        db.refresh(event_obj)
        return event_obj
    except IntegrityError:
        db.rollback()
        # Clean up temporary photo ONLY if transaction did NOT commit
        if not is_committed and persisted_file_path.exists():
            try:
                persisted_file_path.unlink()
            except OSError:
                pass

        # Authoritative state re-query to resolve race conditions
        if client_submission_id:
            existing_sub = (
                db.query(AttendanceEvent)
                .filter(
                    AttendanceEvent.user_id == user.id,
                    AttendanceEvent.client_submission_id == client_submission_id,
                )
                .first()
            )
            if existing_sub:
                if existing_sub.event_type != event_type:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Mã gửi '{client_submission_id}' đã được sử dụng cho sự kiện khác ({existing_sub.event_type}).",
                    )
                if existing_sub.payload_sha256 and existing_sub.payload_sha256 != original_payload_sha256:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Mã gửi '{client_submission_id}' đã được sử dụng nhưng nội dung ảnh tải lên không trùng khớp.",
                    )
                return existing_sub

        existing_event = (
            db.query(AttendanceEvent)
            .filter(
                AttendanceEvent.user_id == user.id,
                AttendanceEvent.business_date == today_str,
                AttendanceEvent.event_type == event_type,
            )
            .first()
        )
        if existing_event:
            time_str = get_local_time_str(existing_event.server_timestamp)
            action_text = "vào ca" if event_type == "CHECK_IN" else "tan ca"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã chấm công {action_text} hôm nay lúc {time_str}.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Xung đột dữ liệu chấm công. Vui lòng kiểm tra lại trạng thái.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        # CRITICAL: Never delete an image after its DB record has committed
        if not is_committed and persisted_file_path.exists():
            try:
                persisted_file_path.unlink()
            except OSError:
                pass
        if is_committed:
            return event_obj
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể ghi nhận chấm công do lỗi máy chủ nội bộ.",
        ) from exc
