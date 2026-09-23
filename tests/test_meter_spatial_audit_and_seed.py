"""
Saigon Port Map V2 — Unit & Integration Tests
Thread 8A: Spatial Meter Data Audit & Safe Seeding Foundation

Tests:
1. Spatial status classification logic (VALID, MISSING, ZERO_ZERO, NON_FINITE, OUT_OF_CANVAS)
2. Point-in-polygon ray casting and canonical Map V2 zone containment
3. Seed manifest validation rules
4. Meter record validation and unverified rejection
5. Safe seeder --dry-run non-mutation guarantee
6. Safe seeder --apply transaction execution and idempotency
7. Safe seeder atomic transaction rollback on error
8. Non-destructive field preservation (unrelated columns untouched)
9. End-to-end database audit execution
"""

import json
import math
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

from scripts.audit_meter_spatial_data import (
    classify_spatial_status,
    is_point_in_polygon,
    resolve_target_v2_zones,
    audit_meter_database,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
)
from scripts.seed_meter_spatial_data import (
    validate_manifest,
    validate_meter_record,
    seed_spatial_data,
    SeedingValidationError,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_MAP_PATH = REPO_ROOT / "frontend" / "src" / "components" / "map-v2" / "data" / "tan_thuan_1_zones_edited.json"


# ==============================================================================
# 1. SPATIAL STATUS CLASSIFICATION TESTS
# ==============================================================================

def test_spatial_classification_valid_canvas_pixels():
    status, ctype, cx, cy = classify_spatial_status(740.0, 570.0)
    assert status == "VALID"
    assert ctype == "CANVAS_PIXELS"
    assert cx == 740.0
    assert cy == 570.0


def test_spatial_classification_valid_normalized_ratio():
    status, ctype, cx, cy = classify_spatial_status(0.5, 0.25)
    assert status == "VALID"
    assert ctype == "NORMALIZED_RATIO"
    assert cx == 768.0  # 0.5 * 1536
    assert cy == 256.0  # 0.25 * 1024


def test_spatial_classification_missing():
    assert classify_spatial_status(None, 500.0)[0] == "MISSING"
    assert classify_spatial_status(500.0, None)[0] == "MISSING"
    assert classify_spatial_status(None, None)[0] == "MISSING"


def test_spatial_classification_zero_zero():
    status, ctype, cx, cy = classify_spatial_status(0.0, 0.0)
    assert status == "ZERO_ZERO"
    assert ctype == "FALLBACK_NOISE"
    assert cx == 0.0
    assert cy == 0.0

    # Near-zero tolerance
    status_near, _, _, _ = classify_spatial_status(1e-8, 1e-8)
    assert status_near == "ZERO_ZERO"


def test_spatial_classification_non_finite():
    assert classify_spatial_status(float("nan"), 500.0)[0] == "NON_FINITE"
    assert classify_spatial_status(500.0, float("nan"))[0] == "NON_FINITE"
    assert classify_spatial_status(float("inf"), 500.0)[0] == "NON_FINITE"
    assert classify_spatial_status(500.0, float("-inf"))[0] == "NON_FINITE"
    assert classify_spatial_status("not_a_number", 500.0)[0] == "NON_FINITE"


def test_spatial_classification_out_of_canvas():
    # Negative coordinates
    assert classify_spatial_status(-1.0, 500.0)[0] == "OUT_OF_CANVAS"
    assert classify_spatial_status(500.0, -0.5)[0] == "OUT_OF_CANVAS"

    # Coordinates beyond 1536x1024
    assert classify_spatial_status(1536.1, 500.0)[0] == "OUT_OF_CANVAS"
    assert classify_spatial_status(500.0, 1024.1)[0] == "OUT_OF_CANVAS"
    assert classify_spatial_status(2000.0, 3000.0)[0] == "OUT_OF_CANVAS"


# ==============================================================================
# 2. POINT-IN-POLYGON & CANONICAL MAP V2 TESTS
# ==============================================================================

def test_point_in_polygon_ray_casting_unit():
    # 100x100 square: [100, 100] to [200, 200]
    box = [[100.0, 100.0], [200.0, 100.0], [200.0, 200.0], [100.0, 200.0]]
    assert is_point_in_polygon(150.0, 150.0, box) is True
    assert is_point_in_polygon(50.0, 50.0, box) is False
    assert is_point_in_polygon(250.0, 150.0, box) is False
    assert is_point_in_polygon(150.0, 250.0, box) is False


def test_point_in_polygon_against_all_canonical_v2_anchors():
    """Verify that all 7 authoritative anchors fall inside their respective Map V2 polygons."""
    with open(CANONICAL_MAP_PATH, "r", encoding="utf-8") as f:
        map_json = json.load(f)

    polygons = {p["id"]: p["vertices"] for p in map_json["polygons"]}

    # Authoritative anchor hotspots from zoneAnchors.ts
    anchors = {
        "ZONE_QUAY": (792, 303),
        "ZONE_GENERAL": (650, 470),
        "ZONE_CONTAINER": (1232, 393),
        "BLDG_KHO_1": (244, 476),
        "BLDG_KHO_2": (382, 479),
        "BLDG_KHO_4": (1004, 600),
        "ZONE_ADMIN": (936, 688),
    }

    for zone_id, (ax, ay) in anchors.items():
        assert zone_id in polygons, f"Polygon {zone_id} missing from canonical JSON"
        assert is_point_in_polygon(ax, ay, polygons[zone_id]) is True, (
            f"Anchor ({ax}, {ay}) for {zone_id} is not inside its polygon!"
        )


def test_resolve_target_v2_zones():
    assert resolve_target_v2_zones("zone-berth", None) == ["ZONE_QUAY"]
    assert resolve_target_v2_zones(None, "pres-berth") == ["ZONE_QUAY"]
    assert resolve_target_v2_zones("zone-container", None) == ["ZONE_CONTAINER"]
    assert resolve_target_v2_zones(None, "ZONE_CONTAINER") == ["ZONE_CONTAINER"]
    assert sorted(resolve_target_v2_zones("zone-warehouse", None)) == [
        "BLDG_KHO_1", "BLDG_KHO_2", "BLDG_KHO_4", "ZONE_GENERAL"
    ]
    assert resolve_target_v2_zones("zone-technical", None) == ["ZONE_ADMIN"]
    assert resolve_target_v2_zones(None, "pres-technical") == ["ZONE_ADMIN"]
    assert resolve_target_v2_zones(None, None) == []


# ==============================================================================
# 3. SEED MANIFEST VALIDATION TESTS
# ==============================================================================

def test_manifest_validation_valid():
    manifest = {
        "version": "1.0",
        "canonical_map": "tan_thuan_1_zones_edited.json",
        "coordinate_system": {
            "width": 1536,
            "height": 1024,
            "origin": "top-left",
            "unit": "image-pixels",
        },
        "meters": [],
    }
    validate_manifest(manifest)  # Should not raise


def test_manifest_validation_invalid_dimensions():
    manifest = {
        "version": "1.0",
        "coordinate_system": {
            "width": 1915,  # Old Map V1 dimensions
            "height": 821,
            "origin": "top-left",
        },
        "meters": [],
    }
    with pytest.raises(SeedingValidationError, match="must be 1536x1024"):
        validate_manifest(manifest)


def test_manifest_validation_invalid_origin():
    manifest = {
        "version": "1.0",
        "coordinate_system": {
            "width": 1536,
            "height": 1024,
            "origin": "bottom-left",
        },
        "meters": [],
    }
    with pytest.raises(SeedingValidationError, match="origin must be 'top-left'"):
        validate_manifest(manifest)


def test_manifest_validation_missing_version():
    with pytest.raises(SeedingValidationError, match="missing required 'version'"):
        validate_manifest({"coordinate_system": {"width": 1536, "height": 1024, "origin": "top-left"}, "meters": []})


# ==============================================================================
# 4. METER RECORD VALIDATION TESTS
# ==============================================================================

def test_validate_meter_record_unverified():
    rec = {
        "meter_code": "CT-001",
        "map_x": None,
        "map_y": None,
        "source": "unverified_legacy",
        "verified": False,
    }
    should_apply, reason = validate_meter_record(rec, 0)
    assert should_apply is False
    assert "verified=False" in reason


def test_validate_meter_record_verified_valid():
    rec = {
        "meter_code": "VERIF-001",
        "map_x": 750.0,
        "map_y": 500.0,
        "source": "cad_engineering_survey",
        "source_reference": "DWG-2026-TT-01",
        "verified": True,
    }
    should_apply, reason = validate_meter_record(rec, 0)
    assert should_apply is True
    assert reason is None


def test_validate_meter_record_verified_rejects_null():
    rec = {
        "meter_code": "VERIF-002",
        "map_x": None,
        "map_y": 500.0,
        "source": "cad_engineering_survey",
        "source_reference": "DWG-2026-TT-01",
        "verified": True,
    }
    with pytest.raises(SeedingValidationError, match="cannot have null coordinates"):
        validate_meter_record(rec, 0)


def test_validate_meter_record_verified_rejects_zero_zero():
    rec = {
        "meter_code": "VERIF-003",
        "map_x": 0.0,
        "map_y": 0.0,
        "source": "cad_engineering_survey",
        "source_reference": "DWG-2026-TT-01",
        "verified": True,
    }
    with pytest.raises(SeedingValidationError, match="cannot use \\(0, 0\\) fallback"):
        validate_meter_record(rec, 0)


def test_validate_meter_record_verified_rejects_out_of_bounds():
    rec = {
        "meter_code": "VERIF-004",
        "map_x": 1600.0,
        "map_y": 500.0,
        "source": "cad_engineering_survey",
        "source_reference": "DWG-2026-TT-01",
        "verified": True,
    }
    with pytest.raises(SeedingValidationError, match="out of canvas bounds"):
        validate_meter_record(rec, 0)


def test_validate_meter_record_verified_rejects_missing_provenance():
    rec = {
        "meter_code": "VERIF-005",
        "map_x": 500.0,
        "map_y": 500.0,
        "source": "",
        "source_reference": "DWG-01",
        "verified": True,
    }
    with pytest.raises(SeedingValidationError, match="must specify 'source'"):
        validate_meter_record(rec, 0)


# ==============================================================================
# 5. SAFE SEEDER TRANSACTIONAL & IDEMPOTENCY FIXTURES
# ==============================================================================

@pytest.fixture
def temp_meter_db():
    """Creates a temporary SQLite database initialized with test meters."""
    temp_dir = tempfile.TemporaryDirectory()
    db_path = Path(temp_dir.name) / "test_meters.db"

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE meters (
            id TEXT PRIMARY KEY,
            meter_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            location TEXT,
            meter_type TEXT DEFAULT 'UNKNOWN',
            utility_type TEXT DEFAULT 'ELECTRICITY',
            zone_id TEXT,
            presentation_zone_id TEXT,
            map_x REAL,
            map_y REAL,
            is_active INTEGER DEFAULT 1,
            lifecycle_status TEXT DEFAULT 'ACTIVE',
            data_origin TEXT DEFAULT 'REAL',
            scenario_id TEXT,
            created_at TEXT DEFAULT '2026-09-23T00:00:00Z',
            updated_at TEXT DEFAULT '2026-09-23T00:00:00Z'
        )
    """)

    cursor.executemany("""
        INSERT INTO meters (id, meter_code, name, map_x, map_y, is_active, lifecycle_status)
        VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE')
    """, [
        ("id-001", "M-001", "Meter 001", None, None),
        ("id-002", "M-002", "Meter 002", 0.5, 0.5),
        ("id-003", "M-003", "Meter 003", None, None),
    ])
    conn.commit()
    conn.close()

    yield db_path

    import gc
    gc.collect()
    try:
        temp_dir.cleanup()
    except Exception:
        pass


@pytest.fixture
def temp_manifest():
    """Creates a temporary valid seed manifest file."""
    temp_dir = tempfile.TemporaryDirectory()
    manifest_path = Path(temp_dir.name) / "test_manifest.json"
    data = {
        "version": "1.0",
        "canonical_map": "tan_thuan_1_zones_edited.json",
        "coordinate_system": {
            "width": 1536,
            "height": 1024,
            "origin": "top-left",
        },
        "meters": [
            {
                "meter_code": "M-001",
                "map_x": 750.0,
                "map_y": 500.0,
                "source": "field_gps_verified",
                "source_reference": "SHEET-2026-01",
                "verified": True,
                "notes": "Verified field position",
            },
            {
                "meter_code": "M-002",
                "map_x": None,
                "map_y": None,
                "source": "unverified_legacy",
                "source_reference": "legacy",
                "verified": False,
                "notes": "Unverified legacy position",
            },
        ],
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    yield manifest_path

    import gc
    gc.collect()
    try:
        temp_dir.cleanup()
    except Exception:
        pass



# ==============================================================================
# 6. SEEDER EXECUTION TESTS (DRY-RUN, APPLY, IDEMPOTENCY, ROLLBACK)
# ==============================================================================

def test_seeder_dry_run_does_not_mutate_db(temp_meter_db, temp_manifest):
    """Verifies that --dry-run produces plan without writing to database."""
    result = seed_spatial_data(manifest_path=temp_manifest, db_path=temp_meter_db, dry_run=True)
    assert result["is_dry_run"] is True
    assert result["updated_count"] == 1
    assert result["skipped_count"] == 1

    # Verify database remains completely unmutated
    conn = sqlite3.connect(str(temp_meter_db))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT map_x, map_y FROM meters WHERE meter_code = 'M-001'").fetchone()
    conn.close()

    assert row["map_x"] is None
    assert row["map_y"] is None


def test_seeder_apply_and_idempotency(temp_meter_db, temp_manifest):
    """Verifies that --apply commits changes and subsequent runs are idempotent."""
    # First run: applies update
    res1 = seed_spatial_data(manifest_path=temp_manifest, db_path=temp_meter_db, dry_run=False)
    assert res1["is_dry_run"] is False
    assert res1["updated_count"] == 1
    assert res1["unchanged_count"] == 0

    conn = sqlite3.connect(str(temp_meter_db))
    conn.row_factory = sqlite3.Row
    row1 = conn.execute("SELECT map_x, map_y, updated_at FROM meters WHERE meter_code = 'M-001'").fetchone()
    assert row1["map_x"] == 750.0
    assert row1["map_y"] == 500.0

    # Second run: identical manifest -> 0 updates, 1 unchanged (IDEMPOTENT)
    res2 = seed_spatial_data(manifest_path=temp_manifest, db_path=temp_meter_db, dry_run=False)
    assert res2["updated_count"] == 0
    assert res2["unchanged_count"] == 1
    assert res2["skipped_count"] == 1

    row2 = conn.execute("SELECT map_x, map_y, updated_at FROM meters WHERE meter_code = 'M-001'").fetchone()
    conn.close()

    assert row2["map_x"] == 750.0
    assert row2["map_y"] == 500.0
    assert row2["updated_at"] == row1["updated_at"]


def test_seeder_atomic_rollback_on_error(temp_meter_db):
    """Verifies that an error on any record rolls back entire transaction."""
    temp_dir = tempfile.TemporaryDirectory()
    err_manifest_path = Path(temp_dir.name) / "err_manifest.json"
    data = {
        "version": "1.0",
        "coordinate_system": {"width": 1536, "height": 1024, "origin": "top-left"},
        "meters": [
            # Record 1: valid
            {
                "meter_code": "M-001",
                "map_x": 750.0,
                "map_y": 500.0,
                "source": "field_gps_verified",
                "source_reference": "SHEET-01",
                "verified": True,
            },
            # Record 2: non-existent meter in database (strict mode fails)
            {
                "meter_code": "NON-EXISTENT-METER",
                "map_x": 800.0,
                "map_y": 600.0,
                "source": "field_gps_verified",
                "source_reference": "SHEET-02",
                "verified": True,
            },
        ],
    }
    with open(err_manifest_path, "w", encoding="utf-8") as f:
        json.dump(data, f)

    try:
        with pytest.raises(SeedingValidationError, match="does not exist in database"):
            seed_spatial_data(manifest_path=err_manifest_path, db_path=temp_meter_db, dry_run=False, strict_db_check=True)

        # M-001 must NOT have been updated due to transaction rollback
        conn = sqlite3.connect(str(temp_meter_db))
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT map_x, map_y FROM meters WHERE meter_code = 'M-001'").fetchone()
        conn.close()

        assert row["map_x"] is None
        assert row["map_y"] is None
    finally:
        try:
            temp_dir.cleanup()
        except Exception:
            pass


def test_seeder_preserves_unrelated_columns(temp_meter_db, temp_manifest):
    """Verifies that name, location, utility_type, lifecycle_status, etc. are untouched."""
    conn = sqlite3.connect(str(temp_meter_db))
    conn.row_factory = sqlite3.Row
    before = conn.execute("SELECT name, location, utility_type, lifecycle_status, is_active FROM meters WHERE meter_code = 'M-001'").fetchone()
    conn.close()

    seed_spatial_data(manifest_path=temp_manifest, db_path=temp_meter_db, dry_run=False)

    conn = sqlite3.connect(str(temp_meter_db))
    conn.row_factory = sqlite3.Row
    after = conn.execute("SELECT name, location, utility_type, lifecycle_status, is_active FROM meters WHERE meter_code = 'M-001'").fetchone()
    conn.close()

    assert after["name"] == before["name"]
    assert after["location"] == before["location"]
    assert after["utility_type"] == before["utility_type"]
    assert after["lifecycle_status"] == before["lifecycle_status"]
    assert after["is_active"] == before["is_active"]


# ==============================================================================
# 7. REPOSITORY AUDIT INTEGRATION TEST
# ==============================================================================

def test_repository_audit_execution():
    """Runs audit on authoritative repo database and verifies summary metrics."""
    db_path = REPO_ROOT / "data" / "app.db"
    assert db_path.exists()
    assert CANONICAL_MAP_PATH.exists()

    meters, summary = audit_meter_database(db_path=db_path, map_geometry_path=CANONICAL_MAP_PATH)

    assert summary["total_meters"] == 24
    assert len(summary["duplicate_meter_codes"]) == 0
    assert summary["canvas_bounds"]["width"] == 1536.0
    assert summary["canvas_bounds"]["height"] == 1024.0

    # 100% of meters currently have valid normalized coordinates in the DB
    assert summary["spatial_status_breakdown"]["VALID"] == 24
    assert summary["spatial_status_breakdown"]["MISSING"] == 0
    assert summary["spatial_status_breakdown"]["ZERO_ZERO"] == 0

    # Containment reflects that 21 meters are outside Map V2 polygons due to Map V1 geometry
    assert summary["containment_breakdown"]["OUTSIDE_ASSIGNED_ZONE"] == 21
    assert summary["containment_breakdown"]["INSIDE_ASSIGNED_ZONE"] == 3


def test_cli_audit_tool_subprocess():
    """Runs scripts/audit_meter_spatial_data.py via subprocess and checks zero exit code."""
    import subprocess
    cmd = [sys.executable, str(REPO_ROOT / "scripts" / "audit_meter_spatial_data.py"), "--quiet"]
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(REPO_ROOT))
    assert proc.returncode == 0


def test_cli_seeder_tool_dry_run_subprocess():
    """Runs scripts/seed_meter_spatial_data.py --dry-run via subprocess and checks zero exit code."""
    import subprocess
    cmd = [sys.executable, str(REPO_ROOT / "scripts" / "seed_meter_spatial_data.py"), "--dry-run"]
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(REPO_ROOT))
    assert proc.returncode == 0
    assert "DRY-RUN COMPLETE" in proc.stdout

