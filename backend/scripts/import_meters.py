import argparse
import csv
import sys
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
from backend.app.models import Meter


def normalize_meter_type(raw_type: Optional[str]) -> str:
    if not raw_type or not raw_type.strip():
        return "UNKNOWN"
    norm = raw_type.strip().upper()
    if norm in ("LCD", "MECHANICAL"):
        return norm
    return "UNKNOWN"


def import_meters_from_csv(
    db: Session,
    csv_file_path: str,
    update_existing: bool = False,
) -> tuple[int, int, int, list[str]]:
    path = Path(csv_file_path)
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy tệp CSV: {csv_file_path}")

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: list[str] = []

    with open(path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("Tệp CSV trống hoặc không có tiêu đề cột.")

        # Normalize fieldnames
        field_map = {fn.strip().lower(): fn for fn in reader.fieldnames if fn}
        if "meter_code" not in field_map:
            raise ValueError("Tệp CSV bắt buộc phải có cột 'meter_code'.")

        code_col = field_map["meter_code"]
        name_col = field_map.get("name")
        loc_col = field_map.get("location")
        type_col = field_map.get("meter_type")

        for row_idx, row in enumerate(reader, start=2):
            raw_code = (row.get(code_col) or "").strip()
            if not raw_code:
                errors.append(f"Dòng {row_idx}: 'meter_code' trống, đã bỏ qua.")
                skipped_count += 1
                continue

            raw_name = (row.get(name_col) or "").strip() if name_col else ""
            if not raw_name:
                raw_name = f"Công tơ {raw_code}"

            raw_loc = (row.get(loc_col) or "").strip() if loc_col else ""
            m_type = normalize_meter_type(row.get(type_col) if type_col else None)

            existing = db.query(Meter).filter(Meter.meter_code == raw_code).first()
            if existing:
                if update_existing:
                    existing.name = raw_name
                    existing.location = raw_loc if raw_loc else existing.location
                    existing.meter_type = m_type if m_type != "UNKNOWN" else existing.meter_type
                    existing.is_active = True
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                new_meter = Meter(
                    meter_code=raw_code,
                    name=raw_name,
                    location=raw_loc,
                    meter_type=m_type,
                    is_active=True,
                )
                db.add(new_meter)
                created_count += 1

        db.commit()

    return created_count, updated_count, skipped_count, errors


def main():
    parser = argparse.ArgumentParser(
        description="Tiện ích nhập danh mục công tơ từ tệp CSV UTF-8 (Cảng Sài Gòn)."
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="Đường dẫn đến tệp CSV chứa danh sách công tơ (meter_code,name,location,meter_type)",
    )
    parser.add_argument(
        "--file",
        dest="file_opt",
        help="Đường dẫn đến tệp CSV (tùy chọn thay thế)",
    )
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help="Cập nhật thông tin nếu mã công tơ đã tồn tại thay vì bỏ qua",
    )

    args = parser.parse_args()
    target_file = args.file or args.file_opt

    if not target_file:
        parser.print_help()
        sys.exit(1)

    init_db()
    db = SessionLocal()
    try:
        created, updated, skipped, errors = import_meters_from_csv(
            db=db,
            csv_file_path=target_file,
            update_existing=args.update_existing,
        )

        print("\n==================================================")
        print("  KẾT QUẢ NHẬP DANH MỤC CÔNG TƠ (METER IMPORT)")
        print("==================================================")
        print(f"  + Thêm mới thành công:  {created} công tơ")
        print(f"  + Cập nhật tồn tại:     {updated} công tơ")
        print(f"  + Bỏ qua (trùng/trống): {skipped} công tơ")
        if errors:
            print("\n  Cảnh báo lỗi dòng:")
            for err in errors[:10]:
                print(f"    - {err}")
            if len(errors) > 10:
                print(f"    ... và {len(errors) - 10} cảnh báo khác.")
        print("==================================================\n")
    except Exception as exc:
        print(f"LỖI: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
