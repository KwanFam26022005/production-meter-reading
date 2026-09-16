import sqlite3
from datetime import datetime, timezone

def run_migration():
    print("Running V16E-S1 database migration...")
    con = sqlite3.connect("data/app.db")

    tables = ["meters", "assets", "meter_asset_relations", "asset_connections"]
    for tbl in tables:
        cols = [r[1] for r in con.execute(f"PRAGMA table_info({tbl})").fetchall()]
        if "data_origin" not in cols:
            print(f"Adding data_origin column to {tbl}...")
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN data_origin VARCHAR(32) DEFAULT 'REAL' NOT NULL")
        if "scenario_id" not in cols:
            print(f"Adding scenario_id column to {tbl}...")
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN scenario_id VARCHAR(64)")

    # Create simulation_scenarios table
    con.execute("""
    CREATE TABLE IF NOT EXISTS simulation_scenarios (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        scenario_type VARCHAR(32) NOT NULL DEFAULT 'SIMULATION',
        seed INTEGER DEFAULT 16092026,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        metadata_json TEXT,
        created_at DATETIME NOT NULL
    )
    """)

    # Quarantine legacy CT meters: RETIRED and LEGACY_SIMULATION
    con.execute("""
    UPDATE meters 
    SET lifecycle_status = 'RETIRED', data_origin = 'LEGACY_SIMULATION', is_active = 0 
    WHERE meter_code LIKE 'CT-%'
    """)

    # Quarantine existing assets to LEGACY_TEST_DATA
    con.execute("""
    UPDATE assets 
    SET data_origin = 'LEGACY_TEST_DATA' 
    WHERE code NOT LIKE 'SIM-%'
    """)

    # Quarantine existing relations and connections to LEGACY_TEST_DATA
    con.execute("""
    UPDATE meter_asset_relations 
    SET data_origin = 'LEGACY_TEST_DATA'
    WHERE scenario_id IS NULL OR scenario_id != 'tan-thuan-demo-v1'
    """)
    con.execute("""
    UPDATE asset_connections 
    SET data_origin = 'LEGACY_TEST_DATA'
    WHERE scenario_id IS NULL OR scenario_id != 'tan-thuan-demo-v1'
    """)

    con.commit()
    print("Schema migration & legacy data quarantine completed successfully.")
    for tbl in tables:
        counts = con.execute(f"SELECT data_origin, COUNT(*) FROM {tbl} GROUP BY data_origin").fetchall()
        print(f"  {tbl}: {counts}")

    fk_errors = con.execute("PRAGMA foreign_key_check").fetchall()
    print(f"PRAGMA foreign_key_check violations: {len(fk_errors)}")
    con.close()

if __name__ == "__main__":
    run_migration()
