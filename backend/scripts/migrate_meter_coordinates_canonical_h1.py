"""
Phase H1 Migration Script: Synchronize Canonical Tan Thuan Map Coordinates
Repository: production-meter-reading

Updates data/app.db:
- meters: updates (zone_id, map_x, map_y) for all 12 active meters to canonical 1664x932 normalized geometry
- operational_zones: updates map_polygon for 4 canonical zones to 1664x932 normalized polygons
"""
import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

CANONICAL_WIDTH = 1664
CANONICAL_HEIGHT = 932

AUTHORITATIVE_METERS_H1 = {
    'CT-001': {'zone_id': 'zone-technical', 'map_x': round(998 / CANONICAL_WIDTH, 4), 'map_y': round(714 / CANONICAL_HEIGHT, 4), 'landmark': 'TRẠM ĐIỆN'},
    'CT-002': {'zone_id': 'zone-warehouse', 'map_x': round(438 / CANONICAL_WIDTH, 4), 'map_y': round(500 / CANONICAL_HEIGHT, 4), 'landmark': 'Kho B'},
    'CT-003': {'zone_id': 'zone-berth',     'map_x': round(290 / CANONICAL_WIDTH, 4), 'map_y': round(415 / CANONICAL_HEIGHT, 4), 'landmark': 'Cầu cảng 1 (B.15-B.17)'},
    'CT-004': {'zone_id': 'zone-berth',     'map_x': round(600 / CANONICAL_WIDTH, 4), 'map_y': round(440 / CANONICAL_HEIGHT, 4), 'landmark': 'Cầu cảng 2 (B.19-B.21A)'},
    'CT-005': {'zone_id': 'zone-warehouse', 'map_x': round(552 / CANONICAL_WIDTH, 4), 'map_y': round(510 / CANONICAL_HEIGHT, 4), 'landmark': 'Kho C'},
    'CT-006': {'zone_id': 'zone-warehouse', 'map_x': round(1018 / CANONICAL_WIDTH, 4), 'map_y': round(590 / CANONICAL_HEIGHT, 4), 'landmark': 'Kho D (KHO)'},
    'CT-007': {'zone_id': 'zone-technical', 'map_x': round(928 / CANONICAL_WIDTH, 4), 'map_y': round(745 / CANONICAL_HEIGHT, 4), 'landmark': 'Trạm điện B'},
    'CT-008': {'zone_id': 'zone-berth',     'map_x': round(1220 / CANONICAL_WIDTH, 4), 'map_y': round(365 / CANONICAL_HEIGHT, 4), 'landmark': 'Cầu cảng 3 (B.21B-B.25A)'},
    'CT-009': {'zone_id': 'zone-technical', 'map_x': round(1070 / CANONICAL_WIDTH, 4), 'map_y': round(710 / CANONICAL_HEIGHT, 4), 'landmark': 'Khu kỹ thuật 1 (CÂN XE)'},
    'CT-010': {'zone_id': 'zone-technical', 'map_x': round(980 / CANONICAL_WIDTH, 4), 'map_y': round(840 / CANONICAL_HEIGHT, 4), 'landmark': 'Khu kỹ thuật 2 (CỔNG CHÍNH)'},
    'CT-011': {'zone_id': 'zone-container', 'map_x': round(1018 / CANONICAL_WIDTH, 4), 'map_y': round(480 / CANONICAL_HEIGHT, 4), 'landmark': 'Bãi Container 1 (CY 1)'},
    'CT-012': {'zone_id': 'zone-container', 'map_x': round(1222 / CANONICAL_WIDTH, 4), 'map_y': round(470 / CANONICAL_HEIGHT, 4), 'landmark': 'Bãi Container 2 (CY 2)'},
}

AUTHORITATIVE_ZONES_H1 = {
    'zone-berth': [
        {"x": round(x / CANONICAL_WIDTH, 4), "y": round(y / CANONICAL_HEIGHT, 4)}
        for x, y in [
            (80, 360), (380, 400), (680, 415), (920, 390), (1220, 335),
            (1370, 265), (1460, 310), (1380, 370), (1220, 405), (920, 445),
            (680, 470), (380, 455), (75, 415)
        ]
    ],
    'zone-warehouse': [
        {"x": round(x / CANONICAL_WIDTH, 4), "y": round(y / CANONICAL_HEIGHT, 4)}
        for x, y in [
            (380, 445), (615, 445), (615, 580), (380, 580), (380, 445),
            (930, 545), (1115, 545), (1115, 645), (930, 645)
        ]
    ],
    'zone-container': [
        {"x": round(x / CANONICAL_WIDTH, 4), "y": round(y / CANONICAL_HEIGHT, 4)}
        for x, y in [
            (915, 405), (1330, 395), (1350, 545), (1125, 555), (915, 535)
        ]
    ],
    'zone-technical': [
        {"x": round(x / CANONICAL_WIDTH, 4), "y": round(y / CANONICAL_HEIGHT, 4)}
        for x, y in [
            (890, 670), (1105, 670), (1105, 755), (1060, 755),
            (1060, 890), (910, 890), (910, 775), (890, 775)
        ]
    ],
}

def run_migration(db_path='data/app.db'):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"=== MIGRATING DATABASE: {db_path} ===")
    
    print("\n--- UPDATING METERS (CANONICAL 1664x932) ---")
    for code, m in AUTHORITATIVE_METERS_H1.items():
        cursor.execute("""
            UPDATE meters
            SET zone_id = ?, map_x = ?, map_y = ?
            WHERE meter_code = ?;
        """, (m['zone_id'], m['map_x'], m['map_y'], code))
        print(f"Updated {code} ({m['landmark']}) -> zone={m['zone_id']}, x={m['map_x']}, y={m['map_y']}")
        
    print("\n--- UPDATING OPERATIONAL ZONES (CANONICAL 1664x932) ---")
    for zid, poly in AUTHORITATIVE_ZONES_H1.items():
        poly_json = json.dumps(poly)
        cursor.execute("""
            UPDATE operational_zones
            SET map_polygon = ?
            WHERE id = ?;
        """, (poly_json, zid))
        print(f"Updated polygon for {zid} ({len(poly)} vertices)")
        
    conn.commit()
    conn.close()
    print("\n=== PHASE H1 MIGRATION COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_migration()
