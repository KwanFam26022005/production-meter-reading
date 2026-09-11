"""
Phase 6F Migration Script: Synchronize Authoritative Operational Map Coordinates
Repository: production-meter-reading

Updates data/app.db:
- meters: updates (zone_id, map_x, map_y) for all 12 active meters to 1300x520 normalized geometry
- operational_zones: updates map_polygon for 4 canonical zones to 1300x520 normalized polygons
"""
import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Authoritative 1300x520 Normalized Coordinates for all 12 meters
AUTHORITATIVE_METERS = {
    'CT-001': {'zone_id': 'zone-technical', 'map_x': 0.4923, 'map_y': 0.8115, 'desc': 'Trạm điện A (Substation A)'},
    'CT-002': {'zone_id': 'zone-warehouse', 'map_x': 0.1708, 'map_y': 0.4596, 'desc': 'Kho B (Warehouse B)'},
    'CT-003': {'zone_id': 'zone-berth',     'map_x': 0.2269, 'map_y': 0.2769, 'desc': 'Cầu cảng 1 (Berth 1)'},
    'CT-004': {'zone_id': 'zone-berth',     'map_x': 0.4692, 'map_y': 0.2769, 'desc': 'Cầu cảng 2 (Berth 2)'},
    'CT-005': {'zone_id': 'zone-warehouse', 'map_x': 0.3062, 'map_y': 0.4596, 'desc': 'Kho C (Warehouse C)'},
    'CT-006': {'zone_id': 'zone-warehouse', 'map_x': 0.1708, 'map_y': 0.5769, 'desc': 'Kho D (Warehouse D)'},
    'CT-007': {'zone_id': 'zone-technical', 'map_x': 0.2038, 'map_y': 0.8154, 'desc': 'Trạm điện B (Substation B)'},
    'CT-008': {'zone_id': 'zone-berth',     'map_x': 0.7154, 'map_y': 0.2769, 'desc': 'Cầu cảng 3 (Berth 3)'},
    'CT-009': {'zone_id': 'zone-technical', 'map_x': 0.6192, 'map_y': 0.8115, 'desc': 'Khu kỹ thuật 1 (Workshop 1)'},
    'CT-010': {'zone_id': 'zone-technical', 'map_x': 0.6654, 'map_y': 0.8115, 'desc': 'Khu kỹ thuật 2 (Workshop 2)'},
    'CT-011': {'zone_id': 'zone-container', 'map_x': 0.5292, 'map_y': 0.5000, 'desc': 'Bãi Container 1 (CY Block A)'},
    'CT-012': {'zone_id': 'zone-container', 'map_x': 0.7015, 'map_y': 0.5000, 'desc': 'Bãi Container 2 (CY Block A2)'},
}

# Authoritative 1300x520 Normalized Polygons
AUTHORITATIVE_ZONES = {
    'zone-berth': [
        {"x": 0.0885, "y": 0.2212},
        {"x": 0.8885, "y": 0.2212},
        {"x": 0.8885, "y": 0.3173},
        {"x": 0.0885, "y": 0.3173},
    ],
    'zone-warehouse': [
        {"x": 0.0962, "y": 0.3558},
        {"x": 0.3962, "y": 0.3558},
        {"x": 0.3962, "y": 0.6442},
        {"x": 0.0962, "y": 0.6442},
    ],
    'zone-container': [
        {"x": 0.4269, "y": 0.3558},
        {"x": 0.7885, "y": 0.3558},
        {"x": 0.8154, "y": 0.4231},
        {"x": 0.8154, "y": 0.7154},
        {"x": 0.4269, "y": 0.7154},
    ],
    'zone-technical': [
        {"x": 0.0962, "y": 0.7019},
        {"x": 0.3962, "y": 0.7019},
        {"x": 0.3962, "y": 0.7404},
        {"x": 0.7231, "y": 0.7404},
        {"x": 0.7231, "y": 0.9327},
        {"x": 0.0962, "y": 0.9327},
    ],
}

def run_migration(db_path='data/app.db'):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"=== MIGRATING DATABASE: {db_path} ===")
    
    # 1. Update meters
    print("\n--- UPDATING METERS ---")
    for code, m in AUTHORITATIVE_METERS.items():
        cursor.execute("""
            UPDATE meters
            SET zone_id = ?, map_x = ?, map_y = ?
            WHERE meter_code = ?;
        """, (m['zone_id'], m['map_x'], m['map_y'], code))
        print(f"Updated {code} ({m['desc']}) -> zone={m['zone_id']}, x={m['map_x']}, y={m['map_y']}")
        
    # 2. Update operational_zones
    print("\n--- UPDATING OPERATIONAL ZONES ---")
    for zid, poly in AUTHORITATIVE_ZONES.items():
        poly_json = json.dumps(poly)
        cursor.execute("""
            UPDATE operational_zones
            SET map_polygon = ?
            WHERE id = ?;
        """, (poly_json, zid))
        print(f"Updated polygon for {zid} ({len(poly)} vertices)")
        
    conn.commit()
    conn.close()
    print("\n=== MIGRATION COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_migration()
