import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def publish_5zone_map():
    print("Publishing tan-thuan-sim-v1-5zone map version...")
    con = sqlite3.connect("data/app.db")
    con.row_factory = sqlite3.Row

    # Find active or latest published version
    old_version = con.execute("""
        SELECT * FROM map_versions 
        WHERE map_id = 'tan-thuan' AND (status = 'PUBLISHED' OR map_version = 'tan-thuan-v16a-r2-frozen')
        ORDER BY published_at DESC LIMIT 1
    """).fetchone()

    if not old_version:
        raise RuntimeError("No previous map version found!")

    old_id = old_version["id"]
    print(f"Deriving from parent map version: {old_version['map_version']} ({old_id})")

    # Check if tan-thuan-sim-v1-5zone already exists
    existing = con.execute("SELECT id FROM map_versions WHERE map_version = 'tan-thuan-sim-v1-5zone'").fetchone()
    if existing:
        print("tan-thuan-sim-v1-5zone already exists. Re-publishing...")
        new_version_id = existing["id"]
        # Archive all others
        con.execute("UPDATE map_versions SET status = 'ARCHIVED' WHERE map_id = 'tan-thuan' AND id != ?", (new_version_id,))
        now_str = datetime.now(timezone.utc).isoformat()
        con.execute("UPDATE map_versions SET status = 'PUBLISHED', published_at = ? WHERE id = ?", (now_str, new_version_id))
        con.commit()
        con.close()
        print("Re-published successfully.")
        return

    new_version_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    # Archive previous published versions
    con.execute("UPDATE map_versions SET status = 'ARCHIVED' WHERE map_id = 'tan-thuan' AND status = 'PUBLISHED'")

    # Insert new map_version
    con.execute("""
        INSERT INTO map_versions (
            id, map_id, map_version, coordinate_system, canonical_width, canonical_height,
            source_asset, geometry_schema_version, status, revision, parent_version_id,
            created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_version_id,
        "tan-thuan",
        "tan-thuan-sim-v1-5zone",
        old_version["coordinate_system"],
        old_version["canonical_width"],
        old_version["canonical_height"],
        old_version["source_asset"],
        old_version["geometry_schema_version"] or "1.0",
        "PUBLISHED",
        1,
        old_id,
        now_str,
        now_str,
        now_str,
    ))

    # Fetch zones from old version, filtering out pres-gate
    zones = con.execute("""
        SELECT * FROM map_version_zones 
        WHERE map_version_id = ? AND zone_id != 'pres-gate'
        ORDER BY display_index ASC
    """, (old_id,)).fetchall()

    print(f"Copying {len(zones)} presentation zones (excluding pres-gate)...")
    for idx, z in enumerate(zones, start=1):
        zid = str(uuid.uuid4())
        con.execute("""
            INSERT INTO map_version_zones (
                id, map_version_id, zone_id, business_zone_id, display_index,
                display_label, business_name, presentation_color, icon,
                polygon_canonical, label_anchor_canonical, operator_anchor_canonical,
                landmarks_json, revision
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            zid,
            new_version_id,
            z["zone_id"],
            z["business_zone_id"],
            idx,
            z["display_label"],
            z["business_name"],
            z["presentation_color"],
            z["icon"],
            z["polygon_canonical"],
            z["label_anchor_canonical"],
            z["operator_anchor_canonical"],
            z["landmarks_json"],
            1,
        ))

    con.commit()
    print("5-zone map version 'tan-thuan-sim-v1-5zone' created and published successfully.")

    # Verification
    published = con.execute("SELECT * FROM map_versions WHERE status = 'PUBLISHED'").fetchall()
    print(f"Currently published map versions: {[r['map_version'] for r in published]}")
    active_zones = con.execute("SELECT zone_id, display_index, display_label FROM map_version_zones WHERE map_version_id = ? ORDER BY display_index", (new_version_id,)).fetchall()
    print("Active 5 zones:")
    for az in active_zones:
        print(f"  [{az['display_index']}] {az['zone_id']} - {az['display_label']}")

    con.close()

if __name__ == "__main__":
    publish_5zone_map()
