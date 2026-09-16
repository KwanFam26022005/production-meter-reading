import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def reset_scenario(db_path: str = "data/app.db", scenario_id: str = "tan-thuan-demo-v1"):
    print(f"=== CONTROLLED RESET FOR SCENARIO: {scenario_id} ===")
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")

    try:
        # 1. Readings and Evidence for scenario meters
        m_ids = [r[0] for r in con.execute("SELECT id FROM meters WHERE scenario_id = ?", (scenario_id,)).fetchall()]
        if m_ids:
            placeholders = ",".join("?" * len(m_ids))
            # Delete evidence
            con.execute(f"""
                DELETE FROM meter_reading_evidence 
                WHERE meter_reading_id IN (
                    SELECT id FROM meter_readings WHERE meter_id IN ({placeholders})
                )
            """, m_ids)
            # Delete readings
            deleted_r = con.execute(f"DELETE FROM meter_readings WHERE meter_id IN ({placeholders})", m_ids).rowcount
            print(f"  Deleted {deleted_r} simulated readings")

        # 2. Simulation reading batches and rounds
        sim_batches = [r[0] for r in con.execute("SELECT id FROM reading_batches WHERE period_key = '2026-09-sim'").fetchall()]
        if sim_batches:
            b_placeholders = ",".join("?" * len(sim_batches))
            con.execute(f"DELETE FROM reading_rounds WHERE batch_id IN ({b_placeholders})", sim_batches)
            con.execute(f"DELETE FROM reading_batches WHERE id IN ({b_placeholders})", sim_batches)
            print(f"  Deleted simulation batches and rounds")

        # 3. Connections
        del_c = con.execute("DELETE FROM asset_connections WHERE scenario_id = ?", (scenario_id,)).rowcount
        print(f"  Deleted {del_c} simulated asset connections")

        # 4. Relations
        del_rel = con.execute("DELETE FROM meter_asset_relations WHERE scenario_id = ?", (scenario_id,)).rowcount
        print(f"  Deleted {del_rel} simulated meter-asset relations")

        # 5. Meters
        del_m = con.execute("DELETE FROM meters WHERE scenario_id = ?", (scenario_id,)).rowcount
        print(f"  Deleted {del_m} simulated meters")

        # 6. Assets
        del_a = con.execute("DELETE FROM assets WHERE scenario_id = ?", (scenario_id,)).rowcount
        print(f"  Deleted {del_a} simulated assets")

        # 7. Scenario
        con.execute("DELETE FROM simulation_scenarios WHERE code = ?", (scenario_id,))
        print(f"  Deleted scenario definition {scenario_id}")

        con.commit()
        print("Scenario reset completed cleanly.")

        # Foreign key integrity check
        fk_errors = con.execute("PRAGMA foreign_key_check").fetchall()
        if fk_errors:
            print(f"WARNING: PRAGMA foreign_key_check violations: {fk_errors}")
        else:
            print("PRAGMA foreign_key_check: 0 violations.")
    finally:
        con.close()

if __name__ == "__main__":
    reset_scenario()
