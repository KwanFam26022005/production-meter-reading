import os
import sys
from pathlib import Path
from sqlalchemy.orm import Session

# Adjust path so we can import backend
sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.app.db import engine
from backend.app.models import (
    SimulationScenario, User, OperationalAssignment, Meter,
    ReadingRound, ReadingRoundMeter, MeterReading, WorkSchedule
)

def audit():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Starting Audit of Demo Data V2...")
    failures = 0

    with Session(engine) as session:
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

        # Check Measurement Metadata (Thread 9D)
        meters = session.query(Meter).filter_by(scenario_id="tan-thuan-demo-v2").all()
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
            
        sources = set(r.confirmation_source for r in readings)
        if "OCR_CONFIRMED" in sources and "USER_CORRECTED" in sources and "MANUAL_ENTRY" in sources:
            print("✅ PASS: Reading sources include OCR, USER_CORRECTED, and MANUAL_ENTRY.")
        else:
            print(f"❌ FAIL: Missing required reading sources. Found: {sources}")
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
