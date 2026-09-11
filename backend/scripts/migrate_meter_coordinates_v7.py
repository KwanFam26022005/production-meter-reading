"""
V7 Migration Script: Recalibrate Authoritative Operational Coordinates for Canonical V2 (1915x821)
Repository: production-meter-reading

Updates data/app.db:
- meters: updates (zone_id, map_x, map_y) for all 12 active meters to V2 normalized geometry
- operational_zones: updates map_polygon for 4 canonical zones to V2 normalized polygons
"""
import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Authoritative V2 (1915x821) Normalized Coordinates for all 12 active meters
V2_METERS = {
    'CT-001': {'zone_id': 'zone-technical', 'map_x': 0.5995, 'map_y': 0.8356, 'desc': 'Trạm điện A / Trạm biến áp trung thế'},
    'CT-002': {'zone_id': 'zone-warehouse', 'map_x': 0.2648, 'map_y': 0.5664, 'desc': 'Kho B (Gian kho tổng hợp phía Tây)'},
    'CT-003': {'zone_id': 'zone-berth',     'map_x': 0.1760, 'map_y': 0.4580, 'desc': 'Cầu cảng 1 (Cần cẩu B.15–B.17)'},
    'CT-004': {'zone_id': 'zone-berth',     'map_x': 0.3624, 'map_y': 0.4507, 'desc': 'Cầu cảng 2 (Cần cẩu B.19–B.21A)'},
    'CT-005': {'zone_id': 'zone-warehouse', 'map_x': 0.3337, 'map_y': 0.5786, 'desc': 'Kho C (Gian kho hàng rời phía Tây)'},
    'CT-006': {'zone_id': 'zone-warehouse', 'map_x': 0.8773, 'map_y': 0.4629, 'desc': 'Kho D / Kho CFS phía Đông'},
    'CT-007': {'zone_id': 'zone-technical', 'map_x': 0.5577, 'map_y': 0.8770, 'desc': 'Trạm điện B (Phụ trợ kỹ thuật phía Nam)'},
    'CT-008': {'zone_id': 'zone-berth',     'map_x': 0.7311, 'map_y': 0.3812, 'desc': 'Cầu cảng 3 (Cần cẩu giàn B.21B–B.25A)'},
    'CT-009': {'zone_id': 'zone-technical', 'map_x': 0.6418, 'map_y': 0.8295, 'desc': 'Khu kỹ thuật 1 (Trạm cân xe & xưởng cơ giới)'},
    'CT-010': {'zone_id': 'zone-technical', 'map_x': 0.8564, 'map_y': 0.6821, 'desc': 'Khu kỹ thuật 2 (CỔNG CHÍNH vào cảng)'},
    'CT-011': {'zone_id': 'zone-container', 'map_x': 0.6115, 'map_y': 0.5323, 'desc': 'Bãi Container 1 (CY Block A Trung tâm)'},
    'CT-012': {'zone_id': 'zone-container', 'map_x': 0.7321, 'map_y': 0.5164, 'desc': 'Bãi Container 2 (CY Block B Trung tâm)'},
}

# Authoritative V2 (1915x821) Normalized Polygons for 4 Business Zones
V2_ZONES = {
    'zone-berth': [
        {"x": round(211/1915, 4), "y": round(264/821, 4)},
        {"x": round(442/1915, 4), "y": round(295/821, 4)},
        {"x": round(786/1915, 4), "y": round(313/821, 4)},
        {"x": round(1060/1915, 4), "y": round(290/821, 4)},
        {"x": round(1265/1915, 4), "y": round(246/821, 4)},
        {"x": round(1434/1915, 4), "y": round(202/821, 4)},
        {"x": round(1670/1915, 4), "y": round(148/821, 4)},
        {"x": round(1687/1915, 4), "y": round(211/821, 4)},
        {"x": round(1580/1915, 4), "y": round(296/821, 4)},
        {"x": round(1423/1915, 4), "y": round(329/821, 4)},
        {"x": round(1094/1915, 4), "y": round(364/821, 4)},
        {"x": round(809/1915, 4), "y": round(398/821, 4)},
        {"x": round(464/1915, 4), "y": round(407/821, 4)},
        {"x": round(210/1915, 4), "y": round(398/821, 4)},
    ],
    'zone-warehouse': [
        {"x": round(59/1915, 4), "y": round(319/821, 4)},
        {"x": round(210/1915, 4), "y": round(398/821, 4)},
        {"x": round(464/1915, 4), "y": round(407/821, 4)},
        {"x": round(809/1915, 4), "y": round(398/821, 4)},
        {"x": round(820/1915, 4), "y": round(526/821, 4)},
        {"x": round(440/1915, 4), "y": round(551/821, 4)},
        {"x": round(208/1915, 4), "y": round(570/821, 4)},
        {"x": round(46/1915, 4), "y": round(534/821, 4)},
        {"x": round(24/1915, 4), "y": round(384/821, 4)},
    ],
    'zone-container': [
        {"x": round(809/1915, 4), "y": round(398/821, 4)},
        {"x": round(1094/1915, 4), "y": round(364/821, 4)},
        {"x": round(1423/1915, 4), "y": round(329/821, 4)},
        {"x": round(1541/1915, 4), "y": round(307/821, 4)},
        {"x": round(1546/1915, 4), "y": round(476/821, 4)},
        {"x": round(1298/1915, 4), "y": round(505/821, 4)},
        {"x": round(1071/1915, 4), "y": round(507/821, 4)},
        {"x": round(820/1915, 4), "y": round(515/821, 4)},
    ],
    'zone-technical': [
        {"x": round(820/1915, 4), "y": round(521/821, 4)},
        {"x": round(1071/1915, 4), "y": round(510/821, 4)},
        {"x": round(1298/1915, 4), "y": round(508/821, 4)},
        {"x": round(1501/1915, 4), "y": round(482/821, 4)},
        {"x": round(1872/1915, 4), "y": round(525/821, 4)},
        {"x": round(1872/1915, 4), "y": round(641/821, 4)},
        {"x": round(1636/1915, 4), "y": round(644/821, 4)},
        {"x": round(1320/1915, 4), "y": round(616/821, 4)},
        {"x": round(1286/1915, 4), "y": round(728/821, 4)},
        {"x": round(1229/1915, 4), "y": round(872/821, 4)},
        {"x": round(1035/1915, 4), "y": round(875/821, 4)},
        {"x": round(1013/1915, 4), "y": round(753/821, 4)},
        {"x": round(825/1915, 4), "y": round(601/821, 4)},
    ],
}

def run_migration(db_paths=['data/app.db', 'backend/data/app.db']):
    for db_path in db_paths:
        import os
        if not os.path.exists(db_path):
            continue
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print(f"\n=== MIGRATING DATABASE: {db_path} ===")
        
        # 1. Update meters
        print("--- UPDATING METERS ---")
        for code, m in V2_METERS.items():
            cursor.execute("""
                UPDATE meters
                SET zone_id = ?, map_x = ?, map_y = ?
                WHERE meter_code = ?;
            """, (m['zone_id'], m['map_x'], m['map_y'], code))
            print(f"Updated {code} ({m['desc']}) -> zone={m['zone_id']}, x={m['map_x']}, y={m['map_y']}")
            
        # 2. Update operational_zones
        print("--- UPDATING OPERATIONAL ZONES ---")
        for zid, poly in V2_ZONES.items():
            poly_json = json.dumps(poly)
            cursor.execute("""
                UPDATE operational_zones
                SET map_polygon = ?
                WHERE id = ?;
            """, (poly_json, zid))
            print(f"Updated polygon for {zid} ({len(poly)} vertices)")
            
        conn.commit()
        conn.close()
        print(f"=== MIGRATION COMPLETED FOR {db_path} ===")

if __name__ == '__main__':
    run_migration()
