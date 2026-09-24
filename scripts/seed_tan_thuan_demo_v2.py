import argparse
import datetime
import importlib.util
import json
import os
import random
import sys
import uuid
from pathlib import Path
from zoneinfo import ZoneInfo

# Adjust path so we can import backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.config import settings
from backend.app.db import engine, init_db
from backend.app.models import (
    AdminAuditLog, Asset, AttendanceEvent, LeaveRequest, MapVersion,
    MapVersionZone, Meter, MeterReading, MeterReadingEvidence, OperationalAssignment,
    OperationalZone, ReadingBatch, ReadingRound, ReadingRoundMeter,
    SimulationScenario, User, WorkSchedule, ZoneAssignment, get_utc_now
)
from sqlalchemy.orm import Session
from sqlalchemy import text

# Load Specs from v1
v1_path = Path(__file__).parent / "seed_tan_thuan_demo_v1.py"
spec = importlib.util.spec_from_file_location("seed_v1", v1_path)
seed_v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed_v1)
ASSETS_SPEC = seed_v1.ASSETS_SPEC
METERS_SPEC = seed_v1.METERS_SPEC

from backend.app.auth import hash_password

NAMESPACE_URL = uuid.NAMESPACE_URL
SCENARIO_CODE = "tan-thuan-demo-v2"

def gen_id(entity: str, key: str) -> str:
    return str(uuid.uuid5(NAMESPACE_URL, f"pmr-demo-v2/{entity}/{key}"))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--anchor-date", type=str, default="2026-09-24", help="YYYY-MM-DD")
    parser.add_argument("--db-path", type=str, help="Override DB path")
    args = parser.parse_args()

    if args.db_path:
        os.environ["PMR_RUNTIME_ROOT"] = str(Path(args.db_path).parent.parent)
        settings.database_url = f"sqlite:///{Path(args.db_path).absolute().as_posix()}"

    anchor_date = datetime.datetime.strptime(args.anchor_date, "%Y-%m-%d").date()
    tz = ZoneInfo("Asia/Ho_Chi_Minh")
    
    # Initialize DB
    init_db(engine)

    with Session(engine) as session:
        # 0. Clean slate
        session.execute(text("PRAGMA foreign_keys=OFF;"))
        
        session.query(SimulationScenario).filter(SimulationScenario.code == SCENARIO_CODE).delete()
        
        # Clean up data related to demo users
        demo_user_ids = [r[0] for r in session.query(User.id).filter(
            User.employee_code.like("DEMO2-%") | (User.employee_code == "ADMIN-001")
        ).all()]
        
        if demo_user_ids:
            session.query(ZoneAssignment).filter(ZoneAssignment.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(WorkSchedule).filter(WorkSchedule.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(LeaveRequest).filter(LeaveRequest.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(OperationalAssignment).filter(OperationalAssignment.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(AttendanceEvent).filter(AttendanceEvent.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(AdminAuditLog).filter(AdminAuditLog.actor_user_id.in_(demo_user_ids)).delete(synchronize_session=False)
            session.query(MeterReadingEvidence).filter(MeterReadingEvidence.meter_reading_id.in_(
                session.query(MeterReading.id).filter(MeterReading.user_id.in_(demo_user_ids))
            )).delete(synchronize_session=False)
            session.query(MeterReading).filter(MeterReading.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        
        session.query(AdminAuditLog).filter(AdminAuditLog.id == gen_id("audit", "1")).delete(synchronize_session=False)
        
        # Scenario-related data
        session.query(ReadingRoundMeter).filter(ReadingRoundMeter.reading_round_id.in_(
            session.query(ReadingRound.id).filter(ReadingRound.batch_id.in_(
                session.query(ReadingBatch.id).filter(ReadingBatch.period_key == "2026-09")
            ))
        )).delete(synchronize_session=False)
        session.query(ReadingRound).filter(ReadingRound.batch_id.in_(
            session.query(ReadingBatch.id).filter(ReadingBatch.period_key == "2026-09")
        )).delete(synchronize_session=False)
        session.query(ReadingBatch).filter(ReadingBatch.period_key == "2026-09").delete(synchronize_session=False)
        
        session.query(Meter).filter(Meter.scenario_id == SCENARIO_CODE).delete(synchronize_session=False)
        session.query(Asset).filter(Asset.scenario_id == SCENARIO_CODE).delete(synchronize_session=False)

        session.query(User).filter(User.employee_code.like("DEMO2-%")).delete()
        session.query(User).filter(User.employee_code == "ADMIN-001").delete()

        session.execute(text("PRAGMA foreign_keys=ON;"))
        session.commit()

        print("Cleaned existing V2 demo data.")

        # 1. Users
        password_hash = hash_password("demo2026")
        admin_id = gen_id("user", "admin")
        admin = User(
            id=admin_id,
            full_name="System Administrator",
            employee_code="ADMIN-001",
            role="ADMIN",
            is_active=True,
            password_hash=password_hash
        )
        session.add(admin)

        employees = []
        names = ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D", "Hoàng Văn E", "Đặng Thị F", "Bùi Văn G", "Đỗ Thị H", "Hồ Văn I", "Ngô Thị K", "Dương Văn L", "Lý Thị M"]
        for i, name in enumerate(names, 1):
            emp_code = f"DEMO2-{i:03d}"
            u_id = gen_id("user", emp_code)
            u = User(
                id=u_id,
                full_name=name,
                employee_code=emp_code,
                role="EMPLOYEE",
                is_active=True,
                password_hash=password_hash
            )
            session.add(u)
            employees.append(u)
        
        session.commit()
        print(f"Seeded 1 ADMIN and {len(employees)} EMPLOYEEs.")

        # 2. Operational Zones
        zone_ids = ["zone-berth", "zone-container", "zone-warehouse", "zone-technical"]
        zones = {}
        for zid in zone_ids:
            z = session.query(OperationalZone).filter(OperationalZone.id == zid).first()
            if z:
                zones[zid] = z
        
        # 3. Work Schedules & Leave Requests
        rnd = random.Random(24092026)
        start_date = datetime.date(2026, 9, 10)
        end_date = datetime.date(2026, 9, 30)
        shifts = ["CA1", "CA2", "CA3", "HC", "OFF"]
        
        for u in employees:
            curr_date = start_date
            while curr_date <= end_date:
                # 1 missing schedule case for emp12 on a specific day
                if u.employee_code == "DEMO2-012" and curr_date == datetime.date(2026, 9, 20):
                    curr_date += datetime.timedelta(days=1)
                    continue
                    
                shift = rnd.choice(shifts)
                ws = WorkSchedule(
                    id=gen_id("schedule", f"{u.id}-{curr_date.isoformat()}"),
                    user_id=u.id,
                    work_date=curr_date.isoformat(),
                    shift_code=shift,
                    status="PUBLISHED"
                )
                session.add(ws)
                curr_date += datetime.timedelta(days=1)
        
        # Leaves
        lr_approved = LeaveRequest(
            id=gen_id("leave", "approved-1"),
            user_id=employees[0].id,
            leave_type="SICK",
            start_date="2026-09-15",
            end_date="2026-09-15",
            shift_code="ALL",
            reason="Sick leave",
            status="APPROVED",
            reviewer_id=admin.id
        )
        lr_pending = LeaveRequest(
            id=gen_id("leave", "pending-1"),
            user_id=employees[1].id,
            leave_type="PERSONAL_UNPAID",
            start_date="2026-09-25",
            end_date="2026-09-26",
            shift_code="ALL",
            reason="Personal",
            status="PENDING"
        )
        lr_cancelled = LeaveRequest(
            id=gen_id("leave", "cancelled-1"),
            user_id=employees[2].id,
            leave_type="ANNUAL",
            start_date="2026-09-10",
            end_date="2026-09-10",
            shift_code="ALL",
            reason="Test",
            status="CANCELLED"
        )
        session.add_all([lr_approved, lr_pending, lr_cancelled])
        session.commit()

        # 4. Operational Assignments
        # 4 zones, date range 2026-09-10 to 2026-09-24
        assign_end_date = datetime.date(2026, 9, 24)
        curr_date = start_date
        while curr_date <= assign_end_date:
            for s in ["CA1", "CA2", "CA3", "HC"]:
                for z_code, z in zones.items():
                    # Primary
                    u_pri = rnd.choice(employees)
                    oa_pri = OperationalAssignment(
                        id=gen_id("op_assign", f"{z.id}-{curr_date.isoformat()}-{s}-PRI"),
                        user_id=u_pri.id,
                        zone_id=z.id,
                        work_date=curr_date.isoformat(),
                        shift_code=s,
                        assignment_role="PRIMARY",
                        status="ASSIGNED",
                        created_by=admin.id
                    )
                    session.add(oa_pri)
                    
                    # 1 support case sporadically
                    if rnd.random() < 0.1:
                        u_sup = rnd.choice([e for e in employees if e != u_pri])
                        oa_sup = OperationalAssignment(
                            id=gen_id("op_assign", f"{z.id}-{curr_date.isoformat()}-{s}-SUP"),
                            user_id=u_sup.id,
                            zone_id=z.id,
                            work_date=curr_date.isoformat(),
                            shift_code=s,
                            assignment_role="SUPPORT",
                            status="ASSIGNED",
                            created_by=admin.id
                        )
                        session.add(oa_sup)

            curr_date += datetime.timedelta(days=1)
            
        # Cancelled assignment
        oa_canc = OperationalAssignment(
            id=gen_id("op_assign", "cancelled-1"),
            user_id=employees[3].id,
            zone_id=zones["zone-berth"].id,
            work_date="2026-09-12",
            shift_code="CA1",
            assignment_role="PRIMARY",
            status="CANCELLED",
            created_by=admin.id,
            cancelled_at=get_utc_now(),
            cancelled_by=admin.id,
            cancel_reason="Shift change"
        )
        session.add(oa_canc)
        session.commit()

        # 5. Assets & Meters (Map V2 Baseline)
        for spec in ASSETS_SPEC:
            a_id = gen_id("asset", spec["code"])
            a = Asset(
                id=a_id,
                code=spec["code"],
                name=spec["name"],
                asset_type=spec["type"],
                mobility_type=spec["mobility"],
                position_source="STATIC_MAP" if spec["pos"] else "UNKNOWN",
                map_x=round(spec["pos"][0] / 1915, 4) if spec["pos"] else None,
                map_y=round(spec["pos"][1] / 821, 4) if spec["pos"] else None,
                lifecycle_status="ACTIVE",
                verification_status="SIMULATION_APPROVED",
                position_verification_status="SIMULATION_APPROVED",
                data_origin="SIMULATED",
                scenario_id=SCENARIO_CODE,
                metadata_json=json.dumps({"presentation_zone": spec["zone"], "canonical_pos": spec["pos"]})
            )
            session.add(a)

        meter_objs = []
        for i, m in enumerate(METERS_SPEC):
            m_id = gen_id("meter", m["code"])
            is_unknown = (i == len(METERS_SPEC) - 1)
            
            unit = "UNKNOWN" if is_unknown else ("KWH" if m["utility"] == "ELECTRICITY" else "M3")
            semantics = "UNKNOWN" if is_unknown else "CUMULATIVE"
            
            meter = Meter(
                id=m_id,
                meter_code=m["code"],
                name=m["name"],
                meter_type="OTHER", # Simplify
                presentation_zone_id=m["zone"],
                map_x=round(m["pos"][0] / 1915, 4),
                map_y=round(m["pos"][1] / 821, 4),
                route_status="VALID",
                is_active=True,
                lifecycle_status="ACTIVE",
                reading_method=m["method"],
                utility_type=m["utility"],
                measurement_unit=unit,
                register_semantics=semantics,
                data_origin="SIMULATED",
                scenario_id=SCENARIO_CODE
            )
            session.add(meter)
            meter_objs.append(meter)
        session.commit()

        # 6. Reading Schedule & Rounds
        rb = ReadingBatch(
            id=gen_id("batch", "2026-09"),
            name="BATCH-2026-09",
            period_key="2026-09",
            status="OPEN"
        )
        session.add(rb)
        
        curr_date = start_date
        while curr_date <= assign_end_date:
            for time_str in ["06:00", "10:00", "14:00", "22:00"]:
                rr_id = gen_id("round", f"{curr_date.isoformat()}T{time_str}")
                dt_str = f"{curr_date.isoformat()} {time_str}:00"
                sched_dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
                rr = ReadingRound(
                    id=rr_id,
                    batch_id=rb.id,
                    scheduled_at=sched_dt,
                    status="CLOSED" if curr_date < assign_end_date else "OPEN",
                    scope_mode="SNAPSHOT"
                )
                session.add(rr)
                
                # Materialize ReadingRoundMeter
                for m in meter_objs:
                    rrm = ReadingRoundMeter(
                        id=gen_id("rrm", f"{rr.id}-{m.id}"),
                        reading_round_id=rr.id,
                        meter_id=m.id,
                        meter_code_snapshot=m.meter_code,
                        meter_name_snapshot=m.name,
                        zone_id_snapshot=m.presentation_zone_id,
                        presentation_zone_id_snapshot=m.presentation_zone_id,
                        utility_type_snapshot=m.utility_type,
                        scope_origin="SYSTEM",
                        scope_status="SCHEDULED"
                    )
                    session.add(rrm)
            curr_date += datetime.timedelta(days=1)
        session.commit()

        # 7. Readings
        # Need deterministic readings with growth
        # Include CONFIRMED and REVIEW, 1 missing, 1 user-corrected, 1 negative, 1 OCR direct
        all_rrms = session.query(ReadingRoundMeter).all()
        reading_vals = {m.id: float(m.meter_code[-3:]) * 100 for m in meter_objs}
        
        for i, rrm in enumerate(all_rrms):
            # Missing reading
            if i == 50:
                continue
                
            val = reading_vals[rrm.meter_id]
            growth = rnd.uniform(5.0, 15.0)
            
            # Negative delta case
            if i == 150:
                val = val - 100
                status = "REVIEW"
                flag = "RESET_OR_ROLLOVER_SUSPECTED"
            else:
                val += growth
                status = "CONFIRMED"
                flag = None
                
            conf_source = rnd.choice(["OCR_CONFIRMED", "USER_CORRECTED", "MANUAL_ENTRY"])
            if i == 10:
                conf_source = "USER_CORRECTED"
            elif i == 11:
                conf_source = "MANUAL_ENTRY"
            elif i == 12:
                conf_source = "OCR_CONFIRMED"
                
            reading_vals[rrm.meter_id] = val
            
            mr = MeterReading(
                id=gen_id("reading", rrm.id),
                reading_round_id=rrm.reading_round_id,
                batch_id=rb.id,
                meter_id=rrm.meter_id,
                reading=str(val),
                ocr_reading=str(val) if conf_source == "OCR_CONFIRMED" else None,
                status=status,
                confirmation_source=conf_source,
                user_id=employees[0].id,
            )
            session.add(mr)
        session.commit()

        # 8. Attendance
        ae_in = AttendanceEvent(
            id=gen_id("att", "in-1"),
            user_id=employees[0].id,
            business_date=assign_end_date.isoformat(),
            event_type="CHECK_IN",
            photo_key="dummy.jpg",
            photo_sha256="dummy",
            photo_size=1024
        )
        ae_out = AttendanceEvent(
            id=gen_id("att", "out-1"),
            user_id=employees[0].id,
            business_date=(assign_end_date - datetime.timedelta(days=1)).isoformat(),
            event_type="CHECK_OUT",
            photo_key="dummy.jpg",
            photo_sha256="dummy",
            photo_size=1024
        )
        session.add_all([ae_in, ae_out])

        # 9. Audit Logs
        al = AdminAuditLog(
            id=gen_id("audit", "1"),
            actor_user_id=admin.id,
            action="UPDATE_SCHEDULE",
            resource_type="WorkSchedule",
            resource_id=ws.id,
            after_json="{}"
        )
        session.add(al)

        # 10. Simulation Scenario
        sc = SimulationScenario(
            id=gen_id("scenario", SCENARIO_CODE),
            code=SCENARIO_CODE,
            name="Tan Thuan Demo V2",
            seed=24092026,
            status="ACTIVE",
            scenario_type="SIMULATION"
        )
        session.add(sc)

        session.commit()

        print("Seeding Complete!")

if __name__ == "__main__":
    main()
