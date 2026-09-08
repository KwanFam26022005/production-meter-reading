import argparse
import sys
from datetime import datetime, timezone
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
from backend.app.db import SessionLocal, init_db
from backend.app.models import ReadingBatch, MeterReading, Meter


def create_reading_batch(
    db: Session,
    period_key: str,
    name: Optional[str] = None,
) -> ReadingBatch:
    clean_period = period_key.strip()
    if not clean_period:
        raise ValueError("Mã kỳ ghi chỉ số (period_key) không được để trống (Ví dụ: 2026-08).")

    # Check for existing OPEN batch
    open_batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.status == "OPEN")
        .first()
    )
    if open_batch:
        raise RuntimeError(
            f"Hiện đã có đợt ghi chỉ số đang MỞ: '{open_batch.name}' (Kỳ: {open_batch.period_key}, ID: {open_batch.id}).\n"
            f"V1 chỉ cho phép duy nhất 1 đợt ghi chỉ số mở tại một thời điểm."
        )

    batch_name = name.strip() if name and name.strip() else f"Đợt ghi chỉ số {clean_period}"
    now_utc = datetime.now(timezone.utc)

    new_batch = ReadingBatch(
        name=batch_name,
        period_key=clean_period,
        status="OPEN",
        created_at=now_utc,
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_batch


def close_reading_batch(db: Session, batch_id: Optional[str] = None) -> ReadingBatch:
    if batch_id:
        batch = db.query(ReadingBatch).filter(ReadingBatch.id == batch_id).first()
    else:
        batch = db.query(ReadingBatch).filter(ReadingBatch.status == "OPEN").first()

    if not batch:
        raise ValueError("Không tìm thấy đợt ghi chỉ số mở để đóng.")

    now_utc = datetime.now(timezone.utc)
    batch.status = "CLOSED"
    batch.closed_at = now_utc
    db.commit()
    db.refresh(batch)
    return batch


def list_reading_batches(db: Session) -> list[dict]:
    batches = db.query(ReadingBatch).order_by(ReadingBatch.created_at.desc()).all()
    results = []
    total_active_meters = db.query(Meter).filter(Meter.is_active == True).count()

    for b in batches:
        readings = db.query(MeterReading).filter(MeterReading.batch_id == b.id).all()
        confirmed = sum(1 for r in readings if r.status == "CONFIRMED")
        review = sum(1 for r in readings if r.status == "REVIEW")
        pending = max(0, total_active_meters - (confirmed + review))
        results.append({
            "id": b.id,
            "name": b.name,
            "period_key": b.period_key,
            "status": b.status,
            "created_at": b.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if b.created_at else "",
            "confirmed": confirmed,
            "review": review,
            "pending": pending,
            "total_meters": total_active_meters,
        })
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Tiện ích quản lý đợt ghi chỉ số công tơ (Cảng Sài Gòn)."
    )
    parser.add_argument(
        "--period",
        "-p",
        help="Kỳ ghi chỉ số (Ví dụ: 2026-08 hoặc 2026-W34)",
    )
    parser.add_argument(
        "--name",
        "-n",
        help="Tên hiển thị của đợt ghi (Ví dụ: 'Đợt ghi chỉ số Tháng 08/2026')",
    )
    parser.add_argument(
        "--list",
        "-l",
        action="store_true",
        help="Liệt kê tất cả các đợt ghi chỉ số hiện có và tiến độ",
    )
    parser.add_argument(
        "--close",
        action="store_true",
        help="Đóng đợt ghi chỉ số đang mở hiện tại",
    )
    parser.add_argument(
        "--batch-id",
        help="Mã ID đợt ghi cần thao tác đóng",
    )

    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        if args.list:
            batches = list_reading_batches(db)
            print("\n==========================================================================")
            print("  DANH SÁCH ĐỢT GHI CHỈ SỐ CÔNG TƠ (READING BATCHES)")
            print("==========================================================================")
            if not batches:
                print("  (Chưa có đợt ghi chỉ số nào được tạo)")
            else:
                for b in batches:
                    status_flag = "[ĐANG MỞ]" if b["status"] == "OPEN" else "[ĐÃ ĐÓNG]"
                    print(f"  {status_flag} {b['name']} ({b['period_key']}) - ID: {b['id']}")
                    print(f"    Tiến độ: {b['confirmed']}/{b['total_meters']} Đã xác nhận | {b['review']} Cần kiểm tra | {b['pending']} Chưa ghi")
                    print(f"    Khởi tạo: {b['created_at']}")
                    print("  ------------------------------------------------------------------------")
            print("==========================================================================\n")
            return

        if args.close:
            closed = close_reading_batch(db, args.batch_id)
            print(f"\n Đã đóng thành công đợt ghi: '{closed.name}' (ID: {closed.id})\n")
            return

        if not args.period:
            parser.print_help()
            print("\nLưu ý: Vui lòng cung cấp tham số --period (ví dụ: --period 2026-08) để tạo đợt ghi mới hoặc --list để xem danh sách.")
            sys.exit(1)

        batch = create_reading_batch(db, period_key=args.period, name=args.name)
        print("\n==================================================")
        print("  KHỞI TẠO ĐỢT GHI CHỈ SỐ THÀNH CÔNG")
        print("==================================================")
        print(f"  + Tên đợt:   {batch.name}")
        print(f"  + Kỳ:        {batch.period_key}")
        print(f"  + Trạng thái: {batch.status}")
        print(f"  + Mã ID:     {batch.id}")
        print("==================================================\n")
    except Exception as exc:
        print(f"\nLỖI: {exc}\n", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
