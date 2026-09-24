import os
import sys
from pathlib import Path
from datetime import timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

# Adjust path so we can import backend
sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.app.db import engine
from backend.app.models import (
    SimulationScenario, User, OperationalAssignment, Meter,
    ReadingRound, ReadingRoundMeter, MeterReading, WorkSchedule,
    OperationalZone, LeaveRequest
)

def audit():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Starting Audit of Demo Data V2...")
    failures = 0

    with Session(engine) as session:
        expected_counts = {
            "meter_readings": 719,
            "reading_rounds": 60,
            "reading_round_meters": 720,
            "operational_assignments": 269,
        }
        actual_counts = {
            "meter_readings": session.query(MeterReading).count(),
            "reading_rounds": session.query(ReadingRound).count(),
            "reading_round_meters": session.query(ReadingRoundMeter).count(),
            "operational_assignments": session.query(OperationalAssignment).count(),
        }
        if actual_counts == expected_counts:
            print("✅ PASS: Deterministic Demo V2 table counts match the baseline.")
        else:
            print(f"❌ FAIL: Demo V2 table counts differ. Expected {expected_counts}; found {actual_counts}.")
            failures += 1

        # Check Scenario
        scenario = session.query(SimulationScenario).filter_by(code="tan-thuan-demo-v2").first()
        if not scenario:
            print("❌ FAIL: Simulation scenario 'tan-thuan-demo-v2' not found.")
            failures += 1
        else:
            print("✅ PASS: Simulation scenario exists.")

        # Check Snapshot Rounds (Thread 9A)
        snapshot_rounds = session.query(ReadingRound).filter_by(scope_mode="SNAPSHOT").all()
        if len(snapshot_rounds) == 0:
            print("❌ FAIL: No SNAPSHOT rounds found.")
            failures += 1
        else:
            print(f"✅ PASS: Found {len(snapshot_rounds)} SNAPSHOT rounds.")
            
        # Check round scopes correctness
        invalid_scopes = 0
        for r in snapshot_rounds:
            round_meters = session.query(ReadingRoundMeter).filter_by(reading_round_id=r.id).all()
            if len(round_meters) != 12:  # Assuming 12 meters
                invalid_scopes += 1
        if invalid_scopes > 0:
            print(f"❌ FAIL: {invalid_scopes} SNAPSHOT rounds have incorrect meter counts (expected 12).")
            failures += 1
        else:
            print("✅ PASS: All SNAPSHOT rounds have correct meter scope sizes (12).")

        # Operational zone IDs and Map presentation zone IDs are separate contracts.
        operational_zone_ids = {row[0] for row in session.query(OperationalZone.id).all()}
        scenario_meters = session.query(Meter).filter_by(scenario_id="tan-thuan-demo-v2").all()
        scenario_meter_zones = {meter.id: meter.zone_id for meter in scenario_meters}
        invalid_scope_zone = 0
        for scope in session.query(ReadingRoundMeter).join(ReadingRound).filter(
            ReadingRound.scope_mode == "SNAPSHOT",
            ReadingRoundMeter.scope_status == "SCHEDULED",
        ).all():
            if (
                not scope.zone_id_snapshot
                or scope.zone_id_snapshot not in operational_zone_ids
                or scope.meter_id not in scenario_meter_zones
                or scenario_meter_zones[scope.meter_id] != scope.zone_id_snapshot
            ):
                invalid_scope_zone += 1
        if invalid_scope_zone == 0 and len(scenario_meters) == 12:
            print("✅ PASS: Snapshot operational zones match configured meter zones.")
        else:
            print(f"❌ FAIL: {invalid_scope_zone} snapshot row(s) have missing or invalid operational zones.")
            failures += 1

        # Seeded timestamps are stored as UTC and resolve to the intended local
        # round slots, including the CA3 start at 22:00 Asia/Ho_Chi_Minh.
        local_zone = ZoneInfo("Asia/Ho_Chi_Minh")
        local_slots = {}
        for round_obj in session.query(ReadingRound).all():
            scheduled = round_obj.scheduled_at
            if scheduled.tzinfo is None:
                scheduled = scheduled.replace(tzinfo=timezone.utc)
            local = scheduled.astimezone(local_zone)
            local_slots.setdefault(local.date().isoformat(), set()).add(local.strftime("%H:%M"))
        expected_slots = {"06:00", "10:00", "14:00", "22:00"}
        if len(local_slots) == 15 and all(slots == expected_slots for slots in local_slots.values()):
            print("✅ PASS: Round timestamps resolve to the four intended local daily slots.")
        else:
            print("❌ FAIL: Round timestamps do not resolve to the intended local daily slots.")
            failures += 1

        # Check Operational Assignments (Thread 9B)
        op_assignments = session.query(OperationalAssignment).filter(
            OperationalAssignment.work_date >= "2026-09-10"
        ).all()
        if len(op_assignments) == 0:
            print("❌ FAIL: No Operational Assignments found.")
            failures += 1
        else:
            print(f"✅ PASS: Found {len(op_assignments)} Operational Assignments.")
            has_primary = any(oa.assignment_role == "PRIMARY" for oa in op_assignments)
            has_support = any(oa.assignment_role == "SUPPORT" for oa in op_assignments)
            if has_primary and has_support:
                print("✅ PASS: Operational Assignments include PRIMARY and SUPPORT roles.")
            else:
                print("❌ FAIL: Operational Assignments missing PRIMARY or SUPPORT roles.")
                failures += 1

        demo_users = session.query(User).filter(User.employee_code.like("DEMO2-%")).all()
        demo_user_ids = {user.id for user in demo_users}
        schedules = {
            (schedule.user_id, schedule.work_date): schedule
            for schedule in session.query(WorkSchedule).filter(WorkSchedule.user_id.in_(demo_user_ids)).all()
        }
        approved_leaves = session.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(demo_user_ids),
            LeaveRequest.status == "APPROVED",
        ).all()
        invalid_assignments = []
        for assignment in session.query(OperationalAssignment).filter(
            OperationalAssignment.user_id.in_(demo_user_ids),
            OperationalAssignment.status == "ASSIGNED",
        ).all():
            schedule = schedules.get((assignment.user_id, assignment.work_date))
            leave_conflict = any(
                leave.user_id == assignment.user_id
                and leave.start_date <= assignment.work_date <= leave.end_date
                and leave.shift_code in (None, "ALL", assignment.shift_code)
                for leave in approved_leaves
            )
            if (
                not schedule
                or schedule.status != "PUBLISHED"
                or schedule.shift_code != assignment.shift_code
                or schedule.shift_code in ("OFF", "LEAVE")
                or leave_conflict
            ):
                invalid_assignments.append(assignment.id)
        if invalid_assignments:
            print(f"❌ FAIL: {len(invalid_assignments)} assignment(s) lack matching eligible schedules.")
            failures += 1
        else:
            print("✅ PASS: Every active Demo V2 assignment matches an eligible published schedule.")

        # Check Measurement Metadata (Thread 9D)
        meters = scenario_meters
        unknown_units = sum(1 for m in meters if m.measurement_unit == "UNKNOWN")
        if unknown_units > 0:
            print(f"✅ PASS: Found {unknown_units} meter(s) with UNKNOWN unit (as intended).")
        else:
            print("❌ FAIL: No meters with UNKNOWN unit found (needed for UI readiness state).")
            failures += 1

        cumulative_semantics = sum(1 for m in meters if m.register_semantics == "CUMULATIVE")
        if cumulative_semantics > 0:
            print(f"✅ PASS: Found {cumulative_semantics} meter(s) with CUMULATIVE semantics.")
        else:
            print("❌ FAIL: No meters with CUMULATIVE semantics found.")
            failures += 1

        # Check Reading Provenance
        readings = session.query(MeterReading).join(ReadingRound).filter(
            ReadingRound.scope_mode == "SNAPSHOT"
        ).all()
        
        has_review = any(r.status == "REVIEW" for r in readings)
        has_confirmed = any(r.status == "CONFIRMED" for r in readings)
        
        if has_review and has_confirmed:
            print("✅ PASS: Readings include both REVIEW and CONFIRMED statuses.")
        else:
            print("❌ FAIL: Readings missing REVIEW or CONFIRMED status.")
            failures += 1
            
        sources = {r.confirmation_source for r in readings}
        required_sources = {"OCR_CONFIRMED", "MANUAL_ENTRY"}
        if required_sources.issubset(sources):
            print(f"✅ PASS: Reading sources include {', '.join(sorted(required_sources))}.")
        else:
            print(f"❌ FAIL: Missing required reading sources. Found: {sources}")
            failures += 1

        invalid_provenance = []
        for reading in readings:
            source = reading.confirmation_source
            if source == "OCR_CONFIRMED" and (
                not reading.ocr_reading
                or (reading.status == "CONFIRMED" and reading.reading != reading.ocr_reading)
            ):
                invalid_provenance.append(reading.id)
            elif source == "USER_CORRECTED" and not reading.ocr_reading:
                invalid_provenance.append(reading.id)
            elif source == "MANUAL_ENTRY" and reading.ocr_reading is not None:
                invalid_provenance.append(reading.id)
            elif source not in {"OCR_CONFIRMED", "USER_CORRECTED", "MANUAL_ENTRY"}:
                invalid_provenance.append(reading.id)

        if not invalid_provenance:
            print("✅ PASS: Reading provenance is consistent with available OCR evidence.")
        else:
            print(f"❌ FAIL: {len(invalid_provenance)} reading(s) have invalid source/OCR provenance.")
            failures += 1

    print("\n--- Audit Summary ---")
    if failures == 0:
        print("🎉 All audits passed successfully!")
        sys.exit(0)
    else:
        print(f"💥 {failures} audit(s) failed.")
        sys.exit(1)

if __name__ == "__main__":
    audit()
