import argparse
import sys
import uuid
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Optional

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy.orm import Session
from backend.app.config import get_settings
from backend.app.db import SessionLocal, init_db
from backend.app.models import ReadingBatch, ReadingRound, MeterReading, Meter

settings = get_settings()

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))


def get_target_batch(db: Session, batch_id: Optional[str], current_batch: bool) -> ReadingBatch:
    if batch_id:
        batch = db.query(ReadingBatch).filter(ReadingBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Không tìm thấy đợt ghi chỉ số với ID: '{batch_id}'")
        return batch
    elif current_batch or True:
        batch = (
            db.query(ReadingBatch)
            .filter(ReadingBatch.status == "OPEN")
            .order_by(ReadingBatch.created_at.desc())
            .first()
        )
        if not batch:
            raise ValueError("Không tìm thấy đợt ghi chỉ số nào đang MỞ (OPEN).")
        return batch


def parse_hh_mm(val: str) -> tuple[int, int]:
    val = val.strip()
    parts = val.split(":")
    if len(parts) != 2:
        raise ValueError(f"Định dạng giờ không hợp lệ: '{val}'. Yêu cầu định dạng HH:MM (ví dụ 08:00).")
    try:
        hour, minute = int(parts[0]), int(parts[1])
    except ValueError:
        raise ValueError(f"Giờ và phút phải là số nguyên: '{val}'.")
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Thời gian không hợp lệ: '{val}' (Giờ: 0-23, Phút: 0-59).")
    return hour, minute


def generate_reading_rounds(
    db: Session,
    batch: ReadingBatch,
    target_date_str: str,
    start_time_str: str,
    end_time_str: str,
    interval_minutes: int,
) -> list[ReadingRound]:
    if batch.status != "OPEN":
        raise ValueError(f"Đợt ghi chỉ số '{batch.name}' (ID: {batch.id}) đã ĐÓNG, không thể tạo thêm lượt ghi.")

    if interval_minutes <= 0:
        raise ValueError(f"Khoảng cách giữa các lượt (interval-minutes) phải lớn hơn 0 (Nhận được: {interval_minutes}).")

    try:
        target_date = datetime.strptime(target_date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Định dạng ngày không hợp lệ: '{target_date_str}'. Yêu cầu định dạng YYYY-MM-DD (ví dụ 2026-08-27).")

    start_h, start_m = parse_hh_mm(start_time_str)
    end_h, end_m = parse_hh_mm(end_time_str)

    start_dt_local = datetime(target_date.year, target_date.month, target_date.day, start_h, start_m, 0, tzinfo=LOCAL_TZ)
    end_dt_local = datetime(target_date.year, target_date.month, target_date.day, end_h, end_m, 0, tzinfo=LOCAL_TZ)

    if start_dt_local > end_dt_local:
        raise ValueError(f"Thời gian bắt đầu ({start_time_str}) không thể sau thời gian kết thúc ({end_time_str}).")

    existing_rounds = db.query(ReadingRound).filter(ReadingRound.batch_id == batch.id).all()
    existing_utc_set = {
        r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        for r in existing_rounds
    }

    created_rounds = []
    now_utc = datetime.now(timezone.utc)

    curr_dt_local = start_dt_local
    while curr_dt_local <= end_dt_local:
        curr_dt_utc = curr_dt_local.astimezone(timezone.utc)

        if curr_dt_utc not in existing_utc_set:
            new_round = ReadingRound(
                id=str(uuid.uuid4()),
                batch_id=batch.id,
                scheduled_at=curr_dt_utc,
                status="OPEN",
                created_at=now_utc,
            )
            db.add(new_round)
            created_rounds.append(new_round)
            existing_utc_set.add(curr_dt_utc)

        curr_dt_local += timedelta(minutes=interval_minutes)

    if created_rounds:
        db.commit()
        for r in created_rounds:
            db.refresh(r)

    return created_rounds


def list_batch_rounds(db: Session, batch: ReadingBatch) -> None:
    rounds = (
        db.query(ReadingRound)
        .filter(ReadingRound.batch_id == batch.id)
        .order_by(ReadingRound.scheduled_at.asc())
        .all()
    )
    total_meters = db.query(Meter).filter(Meter.is_active == True).count()

    print(f"\nDanh sách các lượt ghi chỉ số cho Đợt: '{batch.name}' (ID: {batch.id}, Trạng thái: {batch.status})")
    print("=" * 85)
    print(f"{'STT':<4} | {'Mã lượt (ID)':<36} | {'Giờ lịch trình':<18} | {'Trạng thái':<10} | {'Tiến độ'}")
    print("-" * 85)

    if not rounds:
        print("  (Chưa có lượt ghi chỉ số nào được tạo)")
        print("=" * 85)
        return

    for idx, r in enumerate(rounds, 1):
        r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
        local_str = r_sched.astimezone(LOCAL_TZ).strftime("%H:%M - %d/%m/%Y")
        
        readings = db.query(MeterReading).filter(MeterReading.reading_round_id == r.id).all()
        confirmed = sum(1 for item in readings if item.status == "CONFIRMED")
        review = sum(1 for item in readings if item.status == "REVIEW")
        pending = max(0, total_meters - (confirmed + review))

        status_display = f"{r.status} [LEGACY]" if getattr(r, "is_legacy", False) else r.status
        progress_str = f"{confirmed}/{total_meters} (Chờ: {pending}, KT: {review})"
        print(f"{idx:<4} | {r.id:<36} | {local_str:<18} | {status_display:<10} | {progress_str}")

    print("=" * 85)


def close_round(db: Session, round_id: str) -> None:
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == round_id).first()
    if not round_obj:
        raise ValueError(f"Không tìm thấy lượt ghi chỉ số với ID: '{round_id}'")
    if round_obj.status == "CLOSED":
        print(f"Lượt ghi chỉ số '{round_id}' đã ở trạng thái ĐÓNG (CLOSED) từ trước.")
        return

    now_utc = datetime.now(timezone.utc)
    round_obj.status = "CLOSED"
    round_obj.closed_at = now_utc
    db.commit()
    print(f"Đã đóng thành công lượt ghi chỉ số ID: '{round_id}'.")


def main():
    parser = argparse.ArgumentParser(
        description="CLI tạo và quản lý các lượt ghi chỉ số định kỳ / hàng giờ (Reading Rounds)."
    )
    parser.add_argument("--batch-id", help="ID của đợt ghi chỉ số (ReadingBatch).")
    parser.add_argument("--current-batch", action="store_true", help="Tự động chọn đợt ghi chỉ số đang MỞ hiện tại.")
    parser.add_argument("--date", default=datetime.now(LOCAL_TZ).strftime("%Y-%m-%d"), help="Ngày tạo lịch (YYYY-MM-DD, mặc định: hôm nay).")
    parser.add_argument("--start", default="08:00", help="Giờ bắt đầu (HH:MM, mặc định: 08:00).")
    parser.add_argument("--end", default="17:00", help="Giờ kết thúc (HH:MM, mặc định: 17:00).")
    parser.add_argument("--interval-minutes", type=int, default=60, help="Khoảng cách giữa các lượt tính bằng phút (mặc định: 60).")
    parser.add_argument("--list", action="store_true", help="Liệt kê các lượt ghi chỉ số của đợt.")
    parser.add_argument("--close", help="Đóng một lượt ghi chỉ số cụ thể theo ID.")

    args = parser.parse_args()

    init_db()
    db = SessionLocal()

    try:
        if args.close:
            close_round(db, args.close)
            return

        batch = get_target_batch(db, args.batch_id, args.current_batch)

        if args.list:
            list_batch_rounds(db, batch)
            return

        created = generate_reading_rounds(
            db=db,
            batch=batch,
            target_date_str=args.date,
            start_time_str=args.start,
            end_time_str=args.end,
            interval_minutes=args.interval_minutes,
        )

        print(f"\nĐã tạo thành công {len(created)} lượt ghi chỉ số mới cho Đợt '{batch.name}' (ID: {batch.id}):")
        for r in created:
            r_sched = r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at
            local_str = r_sched.astimezone(LOCAL_TZ).strftime("%H:%M - %d/%m/%Y")
            print(f"  + Lượt {local_str} (ID: {r.id})")

        list_batch_rounds(db, batch)

    except Exception as e:
        print(f"\n[LỖI] {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
