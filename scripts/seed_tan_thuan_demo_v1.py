import json
import random
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SEED_NUMBER = 16092026
SCENARIO_CODE = "tan-thuan-demo-v1"
SCENARIO_NAME = "Tân Thuận Demo V1"
CANONICAL_WIDTH = 1915
CANONICAL_HEIGHT = 821

# Deterministic UUID generator
def gen_uuid(namespace: str, code: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tanthuan.{namespace}.{code}"))

# 32 Assets Definition
# Clamped within the 5 approved presentation zones
ASSETS_SPEC = [
    # External Nodes (no spatial coordinates)
    {"code": "SIM-EXT-GRID", "name": "Lưới điện Quốc gia (110kV EVN)", "type": "OTHER", "zone": None, "pos": None, "mobility": "FIXED"},
    {"code": "SIM-CITY-WATER", "name": "Đường ống Cấp nước Thành phố (Sawaco)", "type": "OTHER", "zone": None, "pos": None, "mobility": "FIXED"},

    # Technical Zone (pres-technical: x in [1024, 1422], y in [500, 650])
    {"code": "SIM-SS-01", "name": "Trạm biến áp Trung tâm SS-01", "type": "SUBSTATION", "zone": "pres-technical", "pos": (1180, 620), "mobility": "FIXED"},
    {"code": "SIM-TR-01", "name": "Máy biến áp chính TR-01 (22/0.4kV)", "type": "TRANSFORMER", "zone": "pres-technical", "pos": (1270, 590), "mobility": "FIXED"},
    {"code": "SIM-MDB-01", "name": "Tủ phân phối tổng MDB-01", "type": "SWITCHBOARD", "zone": "pres-technical", "pos": (1400, 550), "mobility": "FIXED"},
    {"code": "SIM-FDR-TECH", "name": "Tủ xuất tuyến Kỹ thuật FDR-TECH", "type": "FEEDER", "zone": "pres-technical", "pos": (1350, 570), "mobility": "FIXED"},
    {"code": "SIM-WS-01", "name": "Xưởng Cơ điện & Sửa chữa WS-01", "type": "WORKSHOP", "zone": "pres-technical", "pos": (1050, 620), "mobility": "FIXED"},
    {"code": "SIM-COMP-01", "name": "Cụm máy nén khí áp lực COMP-01", "type": "COMPRESSOR", "zone": "pres-technical", "pos": (1080, 625), "mobility": "FIXED"},
    {"code": "SIM-FP-01", "name": "Trạm bơm cứu hỏa & tăng áp FP-01", "type": "PUMP", "zone": "pres-technical", "pos": (1410, 520), "mobility": "FIXED"},
    {"code": "SIM-WIN-01", "name": "Điểm đấu nối nước cấp vào cảng WIN-01", "type": "WATER_POINT", "zone": "pres-technical", "pos": (1410, 560), "mobility": "FIXED"},
    {"code": "SIM-WJ-01", "name": "Cụm van chia mạng nước WJ-01", "type": "WATER_POINT", "zone": "pres-technical", "pos": (1415, 585), "mobility": "FIXED"},
    {"code": "SIM-WP-TECH-01", "name": "Trụ nước kỹ thuật xưởng WP-TECH-01", "type": "WATER_POINT", "zone": "pres-technical", "pos": (1250, 640), "mobility": "FIXED"},
    {"code": "SIM-FIRE-HDR-01", "name": "Họng cấp cứu hỏa trung tâm FIRE-HDR-01", "type": "WATER_POINT", "zone": "pres-technical", "pos": (1415, 540), "mobility": "FIXED"},

    # Berth (pres-berth: polygon bounded by [115, 230, 1149, 442])
    {"code": "SIM-FDR-BERTH", "name": "Tủ phân phối nguồn Cầu cảng FDR-BERTH", "type": "FEEDER", "zone": "pres-berth", "pos": (900, 300), "mobility": "FIXED"},
    {"code": "SIM-QC-01", "name": "Cẩu bờ Quay Crane QC-01", "type": "QUAY_CRANE", "zone": "pres-berth", "pos": (600, 285), "mobility": "MOBILE"},
    {"code": "SIM-QC-02", "name": "Cẩu bờ Quay Crane QC-02", "type": "QUAY_CRANE", "zone": "pres-berth", "pos": (1000, 280), "mobility": "MOBILE"},
    {"code": "SIM-QC-03", "name": "Cẩu bờ Quay Crane QC-03", "type": "QUAY_CRANE", "zone": "pres-berth", "pos": (1120, 340), "mobility": "MOBILE"},
    {"code": "SIM-SP-01", "name": "Hộp cấp điện tàu Shore Power SP-01", "type": "SHORE_POWER_POINT", "zone": "pres-berth", "pos": (900, 285), "mobility": "FIXED"},
    {"code": "SIM-WP-B01", "name": "Trụ cấp nước ngọt tàu biển WP-B01", "type": "WATER_POINT", "zone": "pres-berth", "pos": (1130, 350), "mobility": "FIXED"},

    # West Container Yard (pres-container-west: [430, 442, 1024, 631])
    {"code": "SIM-FDR-WEST", "name": "Tủ xuất tuyến Bãi Tây FDR-WEST", "type": "FEEDER", "zone": "pres-container-west", "pos": (760, 450), "mobility": "FIXED"},
    {"code": "SIM-YDB-W01", "name": "Tủ phân phối bãi Tây YDB-W01", "type": "SWITCHBOARD", "zone": "pres-container-west", "pos": (740, 460), "mobility": "FIXED"},
    {"code": "SIM-RTG-W01", "name": "Cẩu bãi RTG Bãi Tây RTG-W01", "type": "RTG", "zone": "pres-container-west", "pos": (460, 470), "mobility": "MOBILE"},
    {"code": "SIM-RTG-W02", "name": "Cẩu bãi RTG Bãi Tây RTG-W02", "type": "RTG", "zone": "pres-container-west", "pos": (600, 470), "mobility": "MOBILE"},

    # Center Container Yard (pres-container-center: [1024, 230, 1638, 500])
    {"code": "SIM-FDR-CENTER", "name": "Tủ xuất tuyến Bãi Trung tâm FDR-CENTER", "type": "FEEDER", "zone": "pres-container-center", "pos": (1150, 470), "mobility": "FIXED"},
    {"code": "SIM-YDB-C01", "name": "Tủ phân phối bãi Trung tâm YDB-C01", "type": "SWITCHBOARD", "zone": "pres-container-center", "pos": (1100, 480), "mobility": "FIXED"},
    {"code": "SIM-RTG-C01", "name": "Cẩu bãi RTG Trung tâm RTG-C01", "type": "RTG", "zone": "pres-container-center", "pos": (1050, 400), "mobility": "MOBILE"},
    {"code": "SIM-RTG-C02", "name": "Cẩu bãi RTG Trung tâm RTG-C02", "type": "RTG", "zone": "pres-container-center", "pos": (1300, 360), "mobility": "MOBILE"},
    {"code": "SIM-RFR-C01", "name": "Giàn cấp điện container lạnh RFR-C01", "type": "REEFER_RACK", "zone": "pres-container-center", "pos": (1400, 390), "mobility": "FIXED"},

    # CFS East (pres-cfs-east: [1638, 230, 1845, 500])
    {"code": "SIM-FDR-CFS", "name": "Tủ xuất tuyến Kho CFS FDR-CFS", "type": "FEEDER", "zone": "pres-cfs-east", "pos": (1660, 360), "mobility": "FIXED"},
    {"code": "SIM-CFS-MDB-01", "name": "Tủ phân phối Kho CFS MDB-01", "type": "SWITCHBOARD", "zone": "pres-cfs-east", "pos": (1750, 420), "mobility": "FIXED"},
    {"code": "SIM-WH-01", "name": "Kho hàng CFS phía Đông WH-01", "type": "WAREHOUSE", "zone": "pres-cfs-east", "pos": (1680, 350), "mobility": "FIXED"},
    {"code": "SIM-WP-CFS-01", "name": "Điểm cấp nước kho CFS WP-CFS-01", "type": "WATER_POINT", "zone": "pres-cfs-east", "pos": (1660, 330), "mobility": "FIXED"},
]

# 12 Meters Definition
METERS_SPEC = [
    # Electricity Meters
    {
        "code": "SIM-EM-001",
        "name": "Công tơ tổng MDB-01 Trạm kỹ thuật",
        "zone": "pres-technical",
        "pos": (1390, 555),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-MDB-01",
        "measures": "SIM-MDB-01",
        "base_val": 152430.0,
        "hourly_inc": (120.0, 240.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-002",
        "name": "Công tơ xuất tuyến Cầu cảng",
        "zone": "pres-berth",
        "pos": (895, 300),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-FDR-BERTH",
        "measures": "SIM-FDR-BERTH",
        "base_val": 84210.0,
        "hourly_inc": (40.0, 95.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-003",
        "name": "Công tơ xuất tuyến Bãi Tây",
        "zone": "pres-container-west",
        "pos": (755, 455),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-FDR-WEST",
        "measures": "SIM-FDR-WEST",
        "base_val": 42150.0,
        "hourly_inc": (25.0, 60.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-004",
        "name": "Công tơ xuất tuyến Bãi Trung tâm",
        "zone": "pres-container-center",
        "pos": (1145, 475),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-FDR-CENTER",
        "measures": "SIM-FDR-CENTER",
        "base_val": 63890.0,
        "hourly_inc": (35.0, 80.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-005",
        "name": "Công tơ xuất tuyến Kho CFS",
        "zone": "pres-cfs-east",
        "pos": (1665, 365),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-FDR-CFS",
        "measures": "SIM-FDR-CFS",
        "base_val": 29840.0,
        "hourly_inc": (15.0, 45.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-006",
        "name": "Công tơ phụ tải Xưởng Cơ điện",
        "zone": "pres-technical",
        "pos": (1340, 575),
        "utility": "ELECTRICITY",
        "method": "MANUAL",
        "display": "LCD",
        "installed_at": "SIM-FDR-TECH",
        "measures": "SIM-FDR-TECH",
        "base_val": 18450.0,
        "hourly_inc": (10.0, 30.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-EM-007",
        "name": "Công tơ nhánh Cẩu RTG-W01",
        "zone": "pres-container-west",
        "pos": (470, 475),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-YDB-W01",
        "measures": "SIM-RTG-W01",
        "base_val": 15680.0,
        "hourly_inc": (12.0, 28.0),
        "status": "MAINTENANCE",  # Alert state for UI coverage
    },
    {
        "code": "SIM-EM-008",
        "name": "Công tơ Giàn lạnh Container",
        "zone": "pres-container-center",
        "pos": (1395, 395),
        "utility": "ELECTRICITY",
        "method": "OCR",
        "display": "LCD",
        "installed_at": "SIM-YDB-C01",
        "measures": "SIM-RFR-C01",
        "base_val": 52140.0,
        "hourly_inc": (30.0, 75.0),
        "status": "OPERATIONAL",
    },
    # Water Meters
    {
        "code": "SIM-WM-001",
        "name": "Đồng hồ nước tổng Cổng Cảng",
        "zone": "pres-technical",
        "pos": (1410, 565),
        "utility": "WATER",
        "method": "OCR",
        "display": "MECHANICAL",
        "installed_at": "SIM-WIN-01",
        "measures": "SIM-WIN-01",
        "base_val": 14280.0,
        "hourly_inc": (3.0, 8.5),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-WM-002",
        "name": "Đồng hồ nước cấp Cầu tàu",
        "zone": "pres-berth",
        "pos": (1130, 350),
        "utility": "WATER",
        "method": "MANUAL",
        "display": "MECHANICAL",
        "installed_at": "SIM-WP-B01",
        "measures": "SIM-WP-B01",
        "base_val": 5820.0,
        "hourly_inc": (1.0, 4.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-WM-003",
        "name": "Đồng hồ nước sinh hoạt Kho CFS",
        "zone": "pres-cfs-east",
        "pos": (1660, 335),
        "utility": "WATER",
        "method": "OCR",
        "display": "MECHANICAL",
        "installed_at": "SIM-WP-CFS-01",
        "measures": "SIM-WP-CFS-01",
        "base_val": 2940.0,
        "hourly_inc": (0.5, 2.0),
        "status": "OPERATIONAL",
    },
    {
        "code": "SIM-WM-004",
        "name": "Đồng hồ mạng cấp nước Cứu hỏa",
        "zone": "pres-technical",
        "pos": (1415, 525),
        "utility": "WATER",
        "method": "MANUAL",
        "display": "MECHANICAL",
        "installed_at": "SIM-FP-01",
        "measures": "SIM-FIRE-HDR-01",
        "base_val": 1250.0,
        "hourly_inc": (0.1, 0.4),
        "status": "FAULT",  # Fault state for UI coverage
    },
]

# 24 Electricity Connections
ELECTRICITY_CONNECTIONS = [
    ("SIM-EXT-GRID", "SIM-SS-01"),
    ("SIM-SS-01", "SIM-TR-01"),
    ("SIM-TR-01", "SIM-MDB-01"),
    ("SIM-MDB-01", "SIM-FDR-BERTH"),
    ("SIM-MDB-01", "SIM-FDR-WEST"),
    ("SIM-MDB-01", "SIM-FDR-CENTER"),
    ("SIM-MDB-01", "SIM-FDR-CFS"),
    ("SIM-MDB-01", "SIM-FDR-TECH"),
    ("SIM-FDR-BERTH", "SIM-QC-01"),
    ("SIM-FDR-BERTH", "SIM-QC-02"),
    ("SIM-FDR-BERTH", "SIM-QC-03"),
    ("SIM-FDR-BERTH", "SIM-SP-01"),
    ("SIM-FDR-WEST", "SIM-YDB-W01"),
    ("SIM-YDB-W01", "SIM-RTG-W01"),
    ("SIM-YDB-W01", "SIM-RTG-W02"),
    ("SIM-FDR-CENTER", "SIM-YDB-C01"),
    ("SIM-YDB-C01", "SIM-RTG-C01"),
    ("SIM-YDB-C01", "SIM-RTG-C02"),
    ("SIM-YDB-C01", "SIM-RFR-C01"),
    ("SIM-FDR-CFS", "SIM-CFS-MDB-01"),
    ("SIM-CFS-MDB-01", "SIM-WH-01"),
    ("SIM-FDR-TECH", "SIM-WS-01"),
    ("SIM-FDR-TECH", "SIM-COMP-01"),
    ("SIM-FDR-TECH", "SIM-FP-01"),
]

# 7 Water Connections
WATER_CONNECTIONS = [
    ("SIM-CITY-WATER", "SIM-WIN-01"),
    ("SIM-WIN-01", "SIM-WJ-01"),
    ("SIM-WJ-01", "SIM-WP-B01"),
    ("SIM-WJ-01", "SIM-WP-CFS-01"),
    ("SIM-WJ-01", "SIM-WP-TECH-01"),
    ("SIM-WJ-01", "SIM-FP-01"),
    ("SIM-FP-01", "SIM-FIRE-HDR-01"),
]


def seed_simulation(db_path: str = "data/app.db"):
    print("======================================================================")
    print("SEEDING SIMULATED OPERATIONAL BASELINE (Phase V16E-S1)")
    print(f"Scenario: {SCENARIO_CODE} ({SCENARIO_NAME}) | Seed: {SEED_NUMBER}")
    print("======================================================================")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")
    now_dt = datetime.now(timezone.utc)
    now_str = now_dt.isoformat()

    # 1. Ensure scenario definition
    scenario_id = gen_uuid("scenario", SCENARIO_CODE)
    con.execute("""
        INSERT INTO simulation_scenarios (id, code, name, scenario_type, seed, status, metadata_json, created_at)
        VALUES (?, ?, ?, 'SIMULATION', ?, 'ACTIVE', ?, ?)
        ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            seed = excluded.seed,
            status = 'ACTIVE',
            metadata_json = excluded.metadata_json
    """, (
        scenario_id,
        SCENARIO_CODE,
        SCENARIO_NAME,
        SEED_NUMBER,
        json.dumps({"description": "Mô phỏng hạ tầng mẫu Cảng Tân Thuận (32 Assets, 12 Meters)"}),
        now_str,
    ))
    print(f"[1/7] Scenario '{SCENARIO_CODE}' initialized.")

    # Clean up non-spec assets/connections for this scenario to guarantee exact baseline
    valid_asset_codes = [s["code"] for s in ASSETS_SPEC]
    q_marks = ",".join(["?"] * len(valid_asset_codes))
    subquery = f"SELECT id FROM assets WHERE scenario_id = ? AND code NOT IN ({q_marks})"
    con.execute(f"DELETE FROM asset_connections WHERE source_asset_id IN ({subquery}) OR target_asset_id IN ({subquery})", [SCENARIO_CODE] + valid_asset_codes + [SCENARIO_CODE] + valid_asset_codes)
    con.execute(f"DELETE FROM meter_asset_relations WHERE asset_id IN ({subquery})", [SCENARIO_CODE] + valid_asset_codes)
    con.execute(f"UPDATE assets SET parent_asset_id = NULL WHERE scenario_id = ? AND code NOT IN ({q_marks})", [SCENARIO_CODE] + valid_asset_codes)
    con.execute(f"DELETE FROM assets WHERE scenario_id = ? AND code NOT IN ({q_marks})", [SCENARIO_CODE] + valid_asset_codes)

    # 2. Seed 32 Assets
    asset_id_map = {}
    for spec in ASSETS_SPEC:
        a_id = gen_uuid("asset", spec["code"])
        asset_id_map[spec["code"]] = a_id

        norm_x, norm_y = None, None
        if spec["pos"]:
            norm_x = round(spec["pos"][0] / CANONICAL_WIDTH, 4)
            norm_y = round(spec["pos"][1] / CANONICAL_HEIGHT, 4)

        con.execute("""
            INSERT INTO assets (
                id, code, name, asset_type, mobility_type, position_source,
                map_x, map_y, lifecycle_status, verification_status,
                position_verification_status, data_origin, scenario_id,
                source, metadata_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'SIMULATION_APPROVED', 'SIMULATION_APPROVED', 'SIMULATED', ?, 'SIMULATION_SEED', ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
                name = excluded.name,
                asset_type = excluded.asset_type,
                mobility_type = excluded.mobility_type,
                map_x = excluded.map_x,
                map_y = excluded.map_y,
                verification_status = 'SIMULATION_APPROVED',
                position_verification_status = 'SIMULATION_APPROVED',
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id,
                metadata_json = excluded.metadata_json,
                updated_at = excluded.updated_at
        """, (
            a_id,
            spec["code"],
            spec["name"],
            spec["type"],
            spec["mobility"],
            "STATIC_MAP" if spec["pos"] else "UNKNOWN",
            norm_x,
            norm_y,
            SCENARIO_CODE,
            json.dumps({"presentation_zone": spec["zone"], "canonical_pos": spec["pos"]}),
            now_str,
            now_str,
        ))
    print(f"[2/7] Seeded {len(ASSETS_SPEC)} simulated assets.")

    # 3. Seed 12 Meters
    meter_id_map = {}
    for m in METERS_SPEC:
        m_id = gen_uuid("meter", m["code"])
        meter_id_map[m["code"]] = m_id

        norm_x = round(m["pos"][0] / CANONICAL_WIDTH, 4)
        norm_y = round(m["pos"][1] / CANONICAL_HEIGHT, 4)

        con.execute("""
            INSERT INTO meters (
                id, meter_code, name, meter_type, presentation_zone_id,
                map_x, map_y, route_status, is_active, lifecycle_status,
                reading_method, utility_type, data_origin, scenario_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID', 1, 'ACTIVE', ?, ?, 'SIMULATED', ?, ?, ?)
            ON CONFLICT(meter_code) DO UPDATE SET
                name = excluded.name,
                meter_type = excluded.meter_type,
                presentation_zone_id = excluded.presentation_zone_id,
                map_x = excluded.map_x,
                map_y = excluded.map_y,
                reading_method = excluded.reading_method,
                utility_type = excluded.utility_type,
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id,
                lifecycle_status = 'ACTIVE',
                is_active = 1,
                updated_at = excluded.updated_at
        """, (
            m_id,
            m["code"],
            m["name"],
            m["display"],
            m["zone"],
            norm_x,
            norm_y,
            m["method"],
            m["utility"],
            SCENARIO_CODE,
            now_str,
            now_str,
        ))
    print(f"[3/7] Seeded {len(METERS_SPEC)} simulated meters.")

    # 4. Seed Meter ↔ Asset Relationships (both INSTALLED_AT and MEASURES)
    rel_count = 0
    for m in METERS_SPEC:
        m_id = meter_id_map[m["code"]]

        # INSTALLED_AT
        inst_asset_id = asset_id_map[m["installed_at"]]
        rel_inst_id = gen_uuid("relation", f"{m['code']}-{m['installed_at']}-INSTALLED_AT")
        con.execute("""
            INSERT INTO meter_asset_relations (
                id, meter_id, asset_id, relation_type, is_primary,
                verification_status, confidence, data_origin, scenario_id,
                source, notes, valid_from, created_at
            ) VALUES (?, ?, ?, 'INSTALLED_AT', 1, 'SIMULATION_APPROVED', 'HIGH', 'SIMULATED', ?, 'SIMULATION_SEED', 'Gắn kết mô phỏng mẫu', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                verification_status = 'SIMULATION_APPROVED',
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id
        """, (rel_inst_id, m_id, inst_asset_id, SCENARIO_CODE, now_str, now_str))
        rel_count += 1

        # MEASURES
        meas_asset_id = asset_id_map[m["measures"]]
        rel_meas_id = gen_uuid("relation", f"{m['code']}-{m['measures']}-MEASURES")
        con.execute("""
            INSERT INTO meter_asset_relations (
                id, meter_id, asset_id, relation_type, is_primary,
                verification_status, confidence, data_origin, scenario_id,
                source, notes, valid_from, created_at
            ) VALUES (?, ?, ?, 'MEASURES', 1, 'SIMULATION_APPROVED', 'HIGH', 'SIMULATED', ?, 'SIMULATION_SEED', 'Đo đạc mô phỏng mẫu', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                verification_status = 'SIMULATION_APPROVED',
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id
        """, (rel_meas_id, m_id, meas_asset_id, SCENARIO_CODE, now_str, now_str))
        rel_count += 1
    print(f"[4/7] Seeded {rel_count} simulated meter-asset relationships.")

    # 5. Seed Topology Connections (24 Electricity, 7 Water)
    conn_count = 0
    # Electricity
    for src_code, tgt_code in ELECTRICITY_CONNECTIONS:
        c_id = gen_uuid("connection", f"{src_code}-{tgt_code}-ELECTRICITY")
        con.execute("""
            INSERT INTO asset_connections (
                id, source_asset_id, target_asset_id, utility_type, connection_type,
                verification_status, confidence, data_origin, scenario_id, source,
                valid_from, created_at
            ) VALUES (?, ?, ?, 'ELECTRICITY', 'SUPPLIES', 'SIMULATION_APPROVED', 'HIGH', 'SIMULATED', ?, 'SIMULATION_SEED', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                verification_status = 'SIMULATION_APPROVED',
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id
        """, (c_id, asset_id_map[src_code], asset_id_map[tgt_code], SCENARIO_CODE, now_str, now_str))
        conn_count += 1

    # Water
    for src_code, tgt_code in WATER_CONNECTIONS:
        c_id = gen_uuid("connection", f"{src_code}-{tgt_code}-WATER")
        con.execute("""
            INSERT INTO asset_connections (
                id, source_asset_id, target_asset_id, utility_type, connection_type,
                verification_status, confidence, data_origin, scenario_id, source,
                valid_from, created_at
            ) VALUES (?, ?, ?, 'WATER', 'SUPPLIES', 'SIMULATION_APPROVED', 'HIGH', 'SIMULATED', ?, 'SIMULATION_SEED', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                verification_status = 'SIMULATION_APPROVED',
                data_origin = 'SIMULATED',
                scenario_id = excluded.scenario_id
        """, (c_id, asset_id_map[src_code], asset_id_map[tgt_code], SCENARIO_CODE, now_str, now_str))
        conn_count += 1
    print(f"[5/7] Seeded {conn_count} topology connections (24 Electricity, 7 Water).")

    # 6. Seed Deterministic Historical Readings (14 days, hourly, seed: 16092026)
    rng = random.Random(SEED_NUMBER)
    admin_user = con.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").fetchone()
    admin_id = admin_user[0] if admin_user else None

    # Simulation Batch
    batch_id = gen_uuid("batch", "2026-09-sim")
    con.execute("""
        INSERT INTO reading_batches (id, name, period_key, status, created_at)
        VALUES (?, 'Kỳ đọc chỉ số mô phỏng 09/2026', '2026-09-sim', 'OPEN', ?)
        ON CONFLICT(id) DO NOTHING
    """, (batch_id, now_str))

    # Clean up existing simulation batch readings/rounds for deterministic idempotency
    con.execute("DELETE FROM meter_readings WHERE batch_id = ?", (batch_id,))
    con.execute("DELETE FROM reading_rounds WHERE batch_id = ?", (batch_id,))

    # Generate 14 days of hourly readings (336 hours per meter) ending prior to Ca 1 (06:00 VN)
    anchor_dt = datetime(2026, 9, 15, 23, 0, 0, tzinfo=timezone.utc)
    start_dt = anchor_dt - timedelta(days=14)

    total_readings_seeded = 0
    for m in METERS_SPEC:
        m_id = meter_id_map[m["code"]]
        curr_val = m["base_val"]
        inc_min, inc_max = m["hourly_inc"]

        for h in range(14 * 24):
            t = start_dt + timedelta(hours=h)
            hour_of_day = t.hour
            # Diurnal multiplier: peak working shift (07:00-17:00), low overnight
            if 7 <= hour_of_day <= 17:
                shift_factor = 1.4 + rng.uniform(-0.1, 0.1)
            elif 18 <= hour_of_day <= 22:
                shift_factor = 0.9 + rng.uniform(-0.05, 0.05)
            else:
                shift_factor = 0.25 + rng.uniform(-0.02, 0.02)

            inc = round(rng.uniform(inc_min, inc_max) * shift_factor, 2)
            curr_val = round(curr_val + inc, 2)

            # Assign each hourly sample to its distinct hourly round
            round_id = gen_uuid("round", f"2026-09-sim-{t.strftime('%Y%m%d%H')}")

            # Ensure round exists
            con.execute("""
                INSERT INTO reading_rounds (id, batch_id, scheduled_at, status, is_legacy, created_at)
                VALUES (?, ?, ?, 'CLOSED', 0, ?)
                ON CONFLICT(batch_id, scheduled_at) DO NOTHING
            """, (round_id, batch_id, t.strftime("%Y-%m-%d %H:%M:%S"), t.isoformat()))

            r_id = gen_uuid("reading", f"{m['code']}-{t.strftime('%Y%m%d%H%M')}")
            val_str = f"{curr_val:.1f}" if m["utility"] == "WATER" else f"{curr_val:.2f}"

            con.execute("""
                INSERT INTO meter_readings (
                    id, meter_id, batch_id, reading_round_id, user_id,
                    reading, ocr_reading, confirmation_source, status,
                    meter_type, det_confidence, ocr_confidence,
                    server_timestamp, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OCR_CONFIRMED', 'CONFIRMED', ?, 0.98, 0.97, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
            """, (
                r_id,
                m_id,
                batch_id,
                round_id,
                admin_id,
                val_str,
                val_str,
                m["display"].lower(),
                t.isoformat(),
                t.isoformat(),
                t.isoformat(),
            ))
            total_readings_seeded += 1
    print(f"[6/7] Seeded {total_readings_seeded} deterministic historical readings (14 days hourly).")

    # 7. Create Current Active Operational Round (2026-09-16 Ca 1 at 06:00 VN, 0/12 completed)
    curr_round_dt = datetime(2026, 9, 15, 23, 0, 0, tzinfo=timezone.utc)
    curr_round_id = gen_uuid("round", "2026-09-sim-2026-09-16-active")
    con.execute("""
        INSERT INTO reading_rounds (id, batch_id, scheduled_at, status, is_legacy, created_at)
        VALUES (?, ?, ?, 'OPEN', 0, ?)
        ON CONFLICT(id) DO UPDATE SET status = 'OPEN', scheduled_at = excluded.scheduled_at
    """, (curr_round_id, batch_id, curr_round_dt.strftime("%Y-%m-%d %H:%M:%S"), now_str))

    con.commit()
    print("[7/7] Created active operational round for 2026-09-16 (0/12 completed).")

    # Integrity Check
    fk_errors = con.execute("PRAGMA foreign_key_check").fetchall()
    print(f"PRAGMA foreign_key_check violations: {len(fk_errors)}")

    con.close()
    print("======================================================================")
    print("SIMULATION BASELINE SEEDING COMPLETED SUCCESSFULLY.")
    print("======================================================================")

if __name__ == "__main__":
    seed_simulation()
