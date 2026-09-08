import argparse
import json
import os
import random
import shutil
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo

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
from backend.app.models import (
    AdminAuditLog,
    Meter,
    MeterReading,
    MeterTrainingSample,
    ReadingBatch,
    ReadingRound,
    User,
)

settings = get_settings()

try:
    LOCAL_TZ = ZoneInfo(settings.timezone)
except Exception:
    LOCAL_TZ = timezone(timedelta(hours=7))

CURRENT_DEMO_DATE_STR = "2026-08-28"

DEFAULT_DEMO_METERS = [
    {
        "meter_code": "CT-001",
        "name": "Công tơ Trạm A",
        "location": "Trạm điện A",
        "meter_type": "MECHANICAL",
        "base_val": 35200.0,
        "step_min": 3.0,
        "step_max": 6.5,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-002",
        "name": "Công tơ Kho B",
        "location": "Kho B",
        "meter_type": "LCD",
        "base_val": 1100.00,
        "step_min": 1.20,
        "step_max": 2.80,
        "fmt": "{:09.2f}",
    },
    {
        "meter_code": "CT-003",
        "name": "Công tơ Cầu cảng 1",
        "location": "Cầu cảng 1",
        "meter_type": "MECHANICAL",
        "base_val": 48100.5,
        "step_min": 4.0,
        "step_max": 8.5,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-004",
        "name": "Công tơ Cầu cảng 2",
        "location": "Cầu cảng 2",
        "meter_type": "LCD",
        "base_val": 850.00,
        "step_min": 0.80,
        "step_max": 1.90,
        "fmt": "{:09.2f}",
    },
    {
        "meter_code": "CT-005",
        "name": "Công tơ Kho C",
        "location": "Kho C",
        "meter_type": "MECHANICAL",
        "base_val": 19500.0,
        "step_min": 2.0,
        "step_max": 5.0,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-006",
        "name": "Công tơ Kho D",
        "location": "Kho D",
        "meter_type": "MECHANICAL",
        "base_val": 27400.8,
        "step_min": 3.0,
        "step_max": 6.5,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-007",
        "name": "Công tơ Trạm B",
        "location": "Trạm điện B",
        "meter_type": "LCD",
        "base_val": 520.00,
        "step_min": 0.50,
        "step_max": 1.20,
        "fmt": "{:09.2f}",
    },
    {
        "meter_code": "CT-008",
        "name": "Công tơ Cầu cảng 3",
        "location": "Cầu cảng 3",
        "meter_type": "MECHANICAL",
        "base_val": 62300.2,
        "step_min": 5.0,
        "step_max": 10.0,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-009",
        "name": "Công tơ Khu kỹ thuật 1",
        "location": "Khu kỹ thuật",
        "meter_type": "LCD",
        "base_val": 1400.00,
        "step_min": 1.00,
        "step_max": 2.50,
        "fmt": "{:09.2f}",
    },
    {
        "meter_code": "CT-010",
        "name": "Công tơ Khu kỹ thuật 2",
        "location": "Khu kỹ thuật",
        "meter_type": "MECHANICAL",
        "base_val": 31800.0,
        "step_min": 2.5,
        "step_max": 5.5,
        "fmt": "{:09.1f}",
    },
    {
        "meter_code": "CT-011",
        "name": "Công tơ Bãi Container 1",
        "location": "Bãi Container",
        "meter_type": "LCD",
        "base_val": 920.00,
        "step_min": 0.75,
        "step_max": 1.80,
        "fmt": "{:09.2f}",
    },
    {
        "meter_code": "CT-012",
        "name": "Công tơ Bãi Container 2",
        "location": "Bãi Container",
        "meter_type": "MECHANICAL",
        "base_val": 44100.4,
        "step_min": 4.2,
        "step_max": 7.8,
        "fmt": "{:09.1f}",
    },
]

DAILY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]


def create_sqlite_backup(db_url: str) -> Optional[str]:
    """Creates a timestamped backup of SQLite database if applicable."""
    if not db_url.startswith("sqlite:///"):
        return None

    raw_path = db_url.replace("sqlite:///", "")
    db_file = Path(raw_path).resolve()
    if not db_file.exists():
        return None

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_file = db_file.parent / f"{db_file.name}.backup-before-admin-seed-{ts}"
    shutil.copy2(db_file, backup_file)
    return str(backup_file)


def make_slight_ocr_error(val_str: str, rng: random.Random) -> str:
    """Generates a realistic small OCR mistake for USER_CORRECTED provenance."""
    mutations = {
        "3": "8", "8": "3",
        "5": "6", "6": "5",
        "1": "7", "7": "1",
        "0": "8", "9": "0",
    }
    chars = list(val_str)
    digit_indices = [i for i, c in enumerate(chars) if c in mutations]
    if not digit_indices:
        return val_str

    chosen_idx = rng.choice(digit_indices[-2:])
    chars[chosen_idx] = mutations[chars[chosen_idx]]
    return "".join(chars)


def generate_seed_plan(
    db: Session,
    target_month: str,
    admin_user: User,
    field_users: list[User],
    rng: random.Random,
) -> dict[str, Any]:
    year, month_num = map(int, target_month.split("-"))
    import calendar
    _, num_days = calendar.monthrange(year, month_num)
    dates_in_month = [f"{year:04d}-{month_num:02d}-{d:02d}" for d in range(1, num_days + 1)]

    # 1. Meters Plan
    existing_meters = db.query(Meter).all()
    existing_meter_map = {m.meter_code: m for m in existing_meters}

    meters_to_create = []
    meters_reused = []
    final_meter_list = []

    for dm in DEFAULT_DEMO_METERS:
        code = dm["meter_code"]
        if code in existing_meter_map:
            meters_reused.append(existing_meter_map[code])
            final_meter_list.append((existing_meter_map[code], dm))
        else:
            new_m = Meter(
                id=str(uuid.uuid4()),
                meter_code=code,
                name=dm["name"],
                location=dm["location"],
                meter_type=dm["meter_type"],
                is_active=True,
            )
            meters_to_create.append(new_m)
            final_meter_list.append((new_m, dm))

    # 2. Reading Batch Plan
    existing_batch = (
        db.query(ReadingBatch)
        .filter(ReadingBatch.period_key == target_month)
        .first()
    )
    if not existing_batch:
        existing_batch = (
            db.query(ReadingBatch)
            .filter(ReadingBatch.status == "OPEN")
            .order_by(ReadingBatch.created_at.desc())
            .first()
        )

    batch_to_create = None
    batch_used = existing_batch
    if not batch_used:
        batch_to_create = ReadingBatch(
            id=str(uuid.uuid4()),
            name=f"Đợt ghi chỉ số Tháng {month_num:02d}/{year}",
            period_key=target_month,
            status="OPEN",
            created_at=datetime(year, month_num, 1, 0, 0, 0, tzinfo=timezone.utc),
        )
        batch_used = batch_to_create

    # 3. Reading Rounds Plan (31 days x 10 rounds = 310 rounds)
    existing_rounds = db.query(ReadingRound).filter(ReadingRound.batch_id == batch_used.id).all() if existing_batch else []
    existing_round_map = {
        (r.scheduled_at.replace(tzinfo=timezone.utc) if r.scheduled_at.tzinfo is None else r.scheduled_at): r
        for r in existing_rounds
    }

    rounds_to_create = []
    rounds_reused = []
    all_rounds_by_date: dict[str, list[ReadingRound]] = {d_str: [] for d_str in dates_in_month}

    for d_str in dates_in_month:
        d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        for hour in DAILY_HOURS:
            dt_local = datetime(d_obj.year, d_obj.month, d_obj.day, hour, 0, 0, tzinfo=LOCAL_TZ)
            dt_utc = dt_local.astimezone(timezone.utc)

            if dt_utc in existing_round_map:
                r_obj = existing_round_map[dt_utc]
                rounds_reused.append(r_obj)
                all_rounds_by_date[d_str].append(r_obj)
            else:
                r_obj = ReadingRound(
                    id=str(uuid.uuid4()),
                    batch_id=batch_used.id,
                    scheduled_at=dt_utc,
                    status="OPEN",
                    is_legacy=False,
                    created_at=dt_utc - timedelta(hours=12),
                )
                rounds_to_create.append(r_obj)
                all_rounds_by_date[d_str].append(r_obj)

    # 4. Meter Readings Plan
    existing_readings = db.query(MeterReading).all()
    existing_reading_keys = {(r.meter_id, r.reading_round_id) for r in existing_readings}
    # Rounds that already have existing readings
    rounds_with_existing_readings = {r.reading_round_id for r in existing_readings}

    readings_to_create = []
    existing_readings_protected = 0
    intentional_missing = 0
    ocr_confirmed_count = 0
    user_corrected_count = 0
    manual_entry_count = 0
    review_count = 0

    current_meter_vals = {dm["meter_code"]: dm["base_val"] for dm in DEFAULT_DEMO_METERS}

    for d_str in dates_in_month:
        rounds_for_day = all_rounds_by_date[d_str]

        if d_str > CURRENT_DEMO_DATE_STR:
            # Future days: NO readings
            continue

        is_current_day = (d_str == CURRENT_DEMO_DATE_STR)
        d_day_num = int(d_str.split("-")[2])

        for round_idx, r_obj in enumerate(rounds_for_day):
            hour = DAILY_HOURS[round_idx]
            sched_dt_utc = r_obj.scheduled_at.replace(tzinfo=timezone.utc) if r_obj.scheduled_at.tzinfo is None else r_obj.scheduled_at
            round_already_seeded = (r_obj.id in rounds_with_existing_readings)

            for meter_obj, dm in final_meter_list:
                m_code = dm["meter_code"]
                inc = rng.uniform(dm["step_min"], dm["step_max"])
                current_meter_vals[m_code] += inc
                reading_str = dm["fmt"].format(current_meter_vals[m_code])

                # Check if reading already exists in DB
                if (meter_obj.id, r_obj.id) in existing_reading_keys:
                    existing_readings_protected += 1
                    continue

                if round_already_seeded:
                    # Round already has records; don't inject into already seeded/missing historical slot
                    existing_readings_protected += 1
                    continue

                slot_state = "CONFIRMED"

                if is_current_day:
                    if hour in (8, 9, 11):
                        slot_state = "CONFIRMED"
                    elif hour == 10:
                        slot_state = "MISSING" if m_code == "CT-005" else "CONFIRMED"
                    elif hour == 12:
                        if m_code == "CT-002":
                            slot_state = "REVIEW"
                        elif m_code == "CT-008":
                            slot_state = "MISSING"
                        else:
                            slot_state = "CONFIRMED"
                    elif hour == 13:
                        slot_state = "MISSING" if m_code == "CT-011" else "CONFIRMED"
                    elif hour == 14:
                        if m_code == "CT-004":
                            slot_state = "REVIEW"
                        elif m_code in ("CT-007", "CT-010"):
                            slot_state = "MISSING"
                        else:
                            slot_state = "CONFIRMED"
                    elif hour == 15:
                        slot_state = "MISSING" if m_code in ("CT-003", "CT-009") else "CONFIRMED"
                    elif hour == 16:
                        if m_code == "CT-006":
                            slot_state = "REVIEW"
                        elif m_code in ("CT-001", "CT-012", "CT-005"):
                            slot_state = "MISSING"
                        else:
                            slot_state = "CONFIRMED"
                    elif hour == 17:
                        if m_code in ("CT-002", "CT-007"):
                            slot_state = "REVIEW"
                        elif m_code in ("CT-004", "CT-009", "CT-011"):
                            slot_state = "MISSING"
                        else:
                            slot_state = "CONFIRMED"
                else:
                    if d_day_num <= 20:
                        p_miss = rng.random()
                        if p_miss < 0.04:
                            slot_state = "MISSING"
                        elif p_miss < 0.05:
                            slot_state = "REVIEW"
                        else:
                            slot_state = "CONFIRMED"
                    else:
                        p_miss = rng.random()
                        if p_miss < 0.10:
                            slot_state = "MISSING"
                        elif p_miss < 0.13:
                            slot_state = "REVIEW"
                        else:
                            slot_state = "CONFIRMED"

                if slot_state == "MISSING":
                    intentional_missing += 1
                    continue

                if rng.random() < 0.08:
                    delay_mins = rng.randint(20, 75)
                else:
                    delay_mins = rng.randint(2, 15)
                rec_ts = sched_dt_utc + timedelta(minutes=delay_mins)

                chosen_user = rng.choice(field_users) if field_users else admin_user

                if slot_state == "REVIEW":
                    review_count += 1
                    rd_obj = MeterReading(
                        id=str(uuid.uuid4()),
                        meter_id=meter_obj.id,
                        batch_id=batch_used.id,
                        reading_round_id=r_obj.id,
                        user_id=chosen_user.id,
                        reading=None,
                        ocr_reading=reading_str,
                        confirmation_source="OCR_CONFIRMED",
                        status="REVIEW",
                        meter_type=meter_obj.meter_type.lower() if meter_obj.meter_type else "lcd",
                        det_confidence=round(rng.uniform(0.72, 0.88), 3),
                        ocr_confidence=round(rng.uniform(0.40, 0.65), 3),
                        localization_imgsz=960,
                        pipeline_version="e2-adaptive-ppocrv6-medium-v1",
                        server_timestamp=rec_ts,
                        created_at=rec_ts,
                        updated_at=rec_ts,
                    )
                    readings_to_create.append(rd_obj)
                else:
                    p_prov = rng.random()
                    if p_prov < 0.78:
                        ocr_confirmed_count += 1
                        c_source = "OCR_CONFIRMED"
                        rd_reading = reading_str
                        rd_ocr = reading_str
                        det_c = round(rng.uniform(0.85, 0.98), 3)
                        ocr_c = round(rng.uniform(0.88, 0.99), 3)
                    elif p_prov < 0.93:
                        user_corrected_count += 1
                        c_source = "USER_CORRECTED"
                        rd_reading = reading_str
                        rd_ocr = make_slight_ocr_error(reading_str, rng)
                        det_c = round(rng.uniform(0.80, 0.92), 3)
                        ocr_c = round(rng.uniform(0.60, 0.78), 3)
                    else:
                        manual_entry_count += 1
                        c_source = "MANUAL_ENTRY"
                        rd_reading = reading_str
                        rd_ocr = None
                        det_c = None
                        ocr_c = None

                    rd_obj = MeterReading(
                        id=str(uuid.uuid4()),
                        meter_id=meter_obj.id,
                        batch_id=batch_used.id,
                        reading_round_id=r_obj.id,
                        user_id=chosen_user.id,
                        reading=rd_reading,
                        ocr_reading=rd_ocr,
                        confirmation_source=c_source,
                        status="CONFIRMED",
                        meter_type=meter_obj.meter_type.lower() if meter_obj.meter_type else "lcd",
                        det_confidence=det_c,
                        ocr_confidence=ocr_c,
                        localization_imgsz=960 if c_source != "MANUAL_ENTRY" else None,
                        pipeline_version="e2-adaptive-ppocrv6-medium-v1" if c_source != "MANUAL_ENTRY" else None,
                        server_timestamp=rec_ts,
                        created_at=rec_ts,
                        updated_at=rec_ts,
                    )
                    readings_to_create.append(rd_obj)

    # 5. Admin Audit Logs Plan
    existing_audits = db.query(AdminAuditLog).all()
    existing_audit_sigs = set()
    for a in existing_audits:
        day_str = a.created_at.strftime("%Y-%m-%d") if a.created_at else ""
        existing_audit_sigs.add((a.action, a.resource_type, str(a.resource_id), day_str))

    audits_to_create = []

    for d_str in dates_in_month:
        d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        audit_dt_local = datetime(d_obj.year, d_obj.month, d_obj.day, 7, 30, 0, tzinfo=LOCAL_TZ)
        audit_dt_utc = audit_dt_local.astimezone(timezone.utc)
        sig = ("READING_ROUNDS_CREATED", "READING_ROUNDS", str(batch_used.id), d_str)

        if sig not in existing_audit_sigs:
            round_labels = [f"{h:02d}:00" for h in DAILY_HOURS]
            aud_obj = AdminAuditLog(
                id=str(uuid.uuid4()),
                actor_user_id=admin_user.id,
                action="READING_ROUNDS_CREATED",
                resource_type="READING_ROUNDS",
                resource_id=batch_used.id,
                before_json=None,
                after_json=json.dumps({
                    "batch_id": batch_used.id,
                    "batch_name": batch_used.name,
                    "date": d_str,
                    "count": len(round_labels),
                    "rounds": round_labels,
                }, ensure_ascii=False),
                created_at=audit_dt_utc,
            )
            audits_to_create.append(aud_obj)
            existing_audit_sigs.add(sig)

    meter_audit_events = [
        *[
            {
                "dt_local": datetime(2026, 8, 1, 8, 0 + idx, 0, tzinfo=LOCAL_TZ),
                "action": "METER_CREATED",
                "resource_id": m.id,
                "before": None,
                "after": {"meter_code": m.meter_code, "name": m.name, "location": m.location, "meter_type": m.meter_type, "is_active": True},
            }
            for idx, m in enumerate(meters_to_create)
        ],
        {
            "dt_local": datetime(2026, 8, 5, 14, 15, 0, tzinfo=LOCAL_TZ),
            "action": "METER_UPDATED",
            "resource_id": final_meter_list[0][0].id,
            "before": {"location": "Trạm A"},
            "after": {"location": "Trạm điện A"},
        },
        {
            "dt_local": datetime(2026, 8, 9, 10, 30, 0, tzinfo=LOCAL_TZ),
            "action": "METER_UPDATED",
            "resource_id": final_meter_list[1][0].id,
            "before": {"name": "Công tơ Kho B (Cũ)"},
            "after": {"name": "Công tơ Kho B"},
        },
        {
            "dt_local": datetime(2026, 8, 12, 9, 0, 0, tzinfo=LOCAL_TZ),
            "action": "METER_DEACTIVATED",
            "resource_id": final_meter_list[4][0].id,
            "before": {"is_active": True},
            "after": {"is_active": False},
        },
        {
            "dt_local": datetime(2026, 8, 13, 16, 45, 0, tzinfo=LOCAL_TZ),
            "action": "METER_ACTIVATED",
            "resource_id": final_meter_list[4][0].id,
            "before": {"is_active": False},
            "after": {"is_active": True},
        },
        {
            "dt_local": datetime(2026, 8, 18, 11, 20, 0, tzinfo=LOCAL_TZ),
            "action": "METER_UPDATED",
            "resource_id": final_meter_list[6][0].id,
            "before": {"name": "Công tơ Trạm Biến Áp B"},
            "after": {"name": "Công tơ Trạm B"},
        },
        {
            "dt_local": datetime(2026, 8, 22, 15, 10, 0, tzinfo=LOCAL_TZ),
            "action": "METER_DEACTIVATED",
            "resource_id": final_meter_list[7][0].id,
            "before": {"is_active": True},
            "after": {"is_active": False},
        },
        {
            "dt_local": datetime(2026, 8, 23, 8, 30, 0, tzinfo=LOCAL_TZ),
            "action": "METER_ACTIVATED",
            "resource_id": final_meter_list[7][0].id,
            "before": {"is_active": False},
            "after": {"is_active": True},
        },
        {
            "dt_local": datetime(2026, 8, 26, 13, 50, 0, tzinfo=LOCAL_TZ),
            "action": "METER_UPDATED",
            "resource_id": final_meter_list[10][0].id,
            "before": {"location": "Bãi Cont 1"},
            "after": {"location": "Bãi Container"},
        },
    ]

    for ev in meter_audit_events:
        dt_utc = ev["dt_local"].astimezone(timezone.utc)
        sig = (ev["action"], "METER", str(ev["resource_id"]), dt_utc.strftime("%Y-%m-%d"))
        if sig not in existing_audit_sigs:
            aud_obj = AdminAuditLog(
                id=str(uuid.uuid4()),
                actor_user_id=admin_user.id,
                action=ev["action"],
                resource_type="METER",
                resource_id=ev["resource_id"],
                before_json=json.dumps(ev["before"], ensure_ascii=False) if ev["before"] else None,
                after_json=json.dumps(ev["after"], ensure_ascii=False) if ev["after"] else None,
                created_at=dt_utc,
            )
            audits_to_create.append(aud_obj)
            existing_audit_sigs.add(sig)

    return {
        "month": target_month,
        "batch_used": batch_used,
        "batch_to_create": batch_to_create,
        "meters_reused": meters_reused,
        "meters_to_create": meters_to_create,
        "rounds_reused": rounds_reused,
        "rounds_to_create": rounds_to_create,
        "readings_to_create": readings_to_create,
        "existing_readings_protected": existing_readings_protected,
        "intentional_missing": intentional_missing,
        "ocr_confirmed_count": ocr_confirmed_count,
        "user_corrected_count": user_corrected_count,
        "manual_entry_count": manual_entry_count,
        "review_count": review_count,
        "audits_to_create": audits_to_create,
    }


def execute_seed_plan(db: Session, plan: dict[str, Any]) -> None:
    """Executes the seed plan inside a single transaction."""
    if plan["batch_to_create"]:
        db.add(plan["batch_to_create"])
        db.flush()

    for m in plan["meters_to_create"]:
        db.add(m)
    if plan["meters_to_create"]:
        db.flush()

    for r in plan["rounds_to_create"]:
        db.add(r)
    if plan["rounds_to_create"]:
        db.flush()

    for rd in plan["readings_to_create"]:
        db.add(rd)
    if plan["readings_to_create"]:
        db.flush()

    for a in plan["audits_to_create"]:
        db.add(a)
    if plan["audits_to_create"]:
        db.flush()

    db.commit()


def main():
    parser = argparse.ArgumentParser(description="Seed realistic one-month admin demo dataset for Saigon Port.")
    parser.add_argument("--month", default="2026-08", help="Target month in YYYY-MM format (default: 2026-08)")
    parser.add_argument("--random-seed", type=int, default=202608, help="Random seed for deterministic generation")
    parser.add_argument("--employee-code", help="Admin employee code as actor (default: first active ADMIN)")
    parser.add_argument("--dry-run", action="store_true", help="Print expected seed changes without modifying database")
    parser.add_argument("--apply", action="store_true", help="Apply seed changes transactionally to database")

    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        print("Vui lòng chỉ định --dry-run để xem trước hoặc --apply để thực thi cập nhật dữ liệu.")
        sys.exit(1)

    rng = random.Random(args.random_seed)
    init_db()
    db = SessionLocal()

    try:
        admin_query = db.query(User).filter(User.is_active == True)
        if args.employee_code:
            admin_user = admin_query.filter(User.employee_code == args.employee_code.strip()).first()
            if not admin_user:
                print(f"LỖI: Không tìm thấy nhân viên với mã: {args.employee_code}")
                sys.exit(1)
        else:
            admin_user = admin_query.filter(User.role == "ADMIN").first()
            if not admin_user:
                admin_user = admin_query.first()
                if not admin_user:
                    print("LỖI: Không có người dùng nào trong cơ sở dữ liệu để gán quyền quản trị viên.")
                    sys.exit(1)

        field_users = db.query(User).filter(User.is_active == True, User.role == "EMPLOYEE").all()
        if not field_users:
            field_users = [admin_user]

        plan = generate_seed_plan(
            db=db,
            target_month=args.month,
            admin_user=admin_user,
            field_users=field_users,
            rng=rng,
        )

        if args.dry_run:
            print("============================================================")
            print("ADMIN DEMO MONTH SEED — DRY RUN PREVIEW")
            print("============================================================")
            print(f"Database Target:            {settings.database_url}")
            print(f"Target Month:               {plan['month']}")
            print(f"Admin Actor:                {admin_user.employee_code} ({admin_user.full_name})")
            print(f"Field Operators ({len(field_users)}):     {', '.join(u.employee_code for u in field_users[:4])}")
            print("------------------------------------------------------------")
            print(f"Reading Batch:              {plan['batch_used'].name} ({plan['batch_used'].period_key})")
            print(f"Batch to create:            {1 if plan['batch_to_create'] else 0}")
            print(f"Meters reused:              {len(plan['meters_reused'])}")
            print(f"Meters to create:           {len(plan['meters_to_create'])}")
            print(f"ReadingRounds reused:       {len(plan['rounds_reused'])}")
            print(f"ReadingRounds to create:    {len(plan['rounds_to_create'])}")
            print("------------------------------------------------------------")
            print(f"MeterReadings to create:    {len(plan['readings_to_create'])}")
            print(f"  - OCR_CONFIRMED:          {plan['ocr_confirmed_count']}")
            print(f"  - USER_CORRECTED:         {plan['user_corrected_count']}")
            print(f"  - MANUAL_ENTRY:           {plan['manual_entry_count']}")
            print(f"  - REVIEW:                 {plan['review_count']}")
            print(f"Existing readings skipped:  {plan['existing_readings_protected']}")
            print(f"Intentional missing slots:  {plan['intentional_missing']}")
            print("------------------------------------------------------------")
            print(f"AdminAuditLogs to create:   {len(plan['audits_to_create'])}")
            print("Future reading violations:  0 (2026-08-29 to 2026-08-31 have 0 readings)")
            print("MeterTrainingSamples:       0 (Zero training samples created)")
            print("============================================================")
            print("DRY RUN HOÀN TẤT: Không có thay đổi nào được ghi vào cơ sở dữ liệu.")
            return

        if args.apply:
            backup_path = create_sqlite_backup(settings.database_url)

            execute_seed_plan(db, plan)

            print("============================================================")
            print("# ADMIN DEMO MONTH SEED REPORT")
            print("============================================================")
            print(f"Database backup:            {backup_path or 'N/A'}")
            print(f"Month:                      {plan['month']}")
            print(f"Admin Actor:                {admin_user.employee_code} ({admin_user.full_name})")
            print(f"Meters reused:              {len(plan['meters_reused'])}")
            print(f"Meters created:             {len(plan['meters_to_create'])}")
            print(f"Rounds created:             {len(plan['rounds_to_create'])}")
            print(f"Rounds skipped:             {len(plan['rounds_reused'])}")
            print(f"Readings created:           {len(plan['readings_to_create'])}")
            print(f"Existing readings protected:{plan['existing_readings_protected']}")
            print(f"Intentional missing:        {plan['intentional_missing']}")
            print(f"OCR_CONFIRMED:              {plan['ocr_confirmed_count']}")
            print(f"USER_CORRECTED:             {plan['user_corrected_count']}")
            print(f"MANUAL_ENTRY:               {plan['manual_entry_count']}")
            print(f"REVIEW:                     {plan['review_count']}")
            print(f"Audit logs created:         {len(plan['audits_to_create'])}")
            print("Training samples created:   0")
            print("Future reading violations:  0")
            print("============================================================")
            print("APPLY HOÀN TẤT: Dữ liệu demo một tháng đã được ghi thành công.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
