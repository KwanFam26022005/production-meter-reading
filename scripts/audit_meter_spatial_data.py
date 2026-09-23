#!/usr/bin/env python3
"""
Saigon Port Map V2 — Spatial Meter Data Audit Tool
Thread 8A (Phase B)

Audits spatial coordinates (map_x, map_y) for every meter in the operational database,
classifies spatial validity against canonical bounds ([0, 1536] x [0, 1024]),
and verifies point-in-polygon containment against canonical Map V2 zone polygons.

Outputs:
- Formatted summary report to stdout
- Machine-readable CSV: docs/implementation/map-v2-spatial-meter-data-phase-b/evidence/meter_spatial_audit.csv
- Machine-readable JSON: docs/implementation/map-v2-spatial-meter-data-phase-b/evidence/spatial_audit_summary.json
"""

import argparse
import csv
import json
import math
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Canonical Map V2 Canvas Dimensions
CANVAS_WIDTH = 1536.0
CANVAS_HEIGHT = 1024.0

# Canonical Presentation Zones in tan_thuan_1_zones_edited.json
CANONICAL_V2_POLYGON_IDS = [
    "ZONE_QUAY",
    "ZONE_GENERAL",
    "ZONE_CONTAINER",
    "BLDG_KHO_1",
    "BLDG_KHO_2",
    "BLDG_KHO_4",
    "ZONE_ADMIN",
]

# Business Zone to Map V2 Presentation Polygon mapping
BUSINESS_TO_V2_POLYGONS: Dict[str, List[str]] = {
    "zone-berth": ["ZONE_QUAY"],
    "zone-container": ["ZONE_CONTAINER"],
    "zone-warehouse": ["ZONE_GENERAL", "BLDG_KHO_1", "BLDG_KHO_2", "BLDG_KHO_4"],
    "zone-technical": ["ZONE_ADMIN"],
}

# Presentation Zone (Map V2 direct + legacy V1) to Map V2 Presentation Polygons
PRESENTATION_TO_V2_POLYGONS: Dict[str, List[str]] = {
    # Direct Map V2 presentation zones
    "ZONE_QUAY": ["ZONE_QUAY"],
    "ZONE_GENERAL": ["ZONE_GENERAL"],
    "ZONE_CONTAINER": ["ZONE_CONTAINER"],
    "BLDG_KHO_1": ["BLDG_KHO_1"],
    "BLDG_KHO_2": ["BLDG_KHO_2"],
    "BLDG_KHO_4": ["BLDG_KHO_4"],
    "ZONE_ADMIN": ["ZONE_ADMIN"],
    # Legacy Map V1 presentation zones
    "pres-berth": ["ZONE_QUAY"],
    "pres-container-west": ["ZONE_CONTAINER"],
    "pres-container-center": ["ZONE_CONTAINER"],
    "pres-cfs-east": ["ZONE_CONTAINER", "ZONE_GENERAL"],
    "pres-technical": ["ZONE_ADMIN"],
    "pres-gate": ["ZONE_ADMIN"],
}


def classify_spatial_status(map_x: Any, map_y: Any) -> Tuple[str, str, Optional[float], Optional[float]]:
    """
    Classifies raw map_x, map_y coordinates into exactly one spatial status:
    - VALID
    - MISSING
    - ZERO_ZERO
    - NON_FINITE
    - OUT_OF_CANVAS

    Returns (spatial_status, coord_type, canvas_x, canvas_y).
    """
    # 1. Missing check
    if map_x is None or map_y is None:
        return "MISSING", "NONE", None, None

    # 2. Non-finite / non-numeric check
    try:
        fx = float(map_x)
        fy = float(map_y)
    except (ValueError, TypeError):
        return "NON_FINITE", "NONE", None, None

    if math.isnan(fx) or math.isnan(fy) or math.isinf(fx) or math.isinf(fy):
        return "NON_FINITE", "NONE", None, None

    # 3. Fallback (0, 0) check
    if abs(fx) < 1e-6 and abs(fy) < 1e-6:
        return "ZERO_ZERO", "FALLBACK_NOISE", 0.0, 0.0

    # 4. Out of canvas check (strictly negative or exceeds 1536x1024)
    if fx < 0.0 or fy < 0.0 or fx > CANVAS_WIDTH or fy > CANVAS_HEIGHT:
        return "OUT_OF_CANVAS", "OUT_OF_BOUNDS", fx, fy

    # 5. Determine coordinate type and canvas projection
    if 0.0 < fx <= 1.0 and 0.0 < fy <= 1.0:
        coord_type = "NORMALIZED_RATIO"
        canvas_x = round(fx * CANVAS_WIDTH, 2)
        canvas_y = round(fy * CANVAS_HEIGHT, 2)
    else:
        coord_type = "CANVAS_PIXELS"
        canvas_x = round(fx, 2)
        canvas_y = round(fy, 2)

    return "VALID", coord_type, canvas_x, canvas_y


def is_point_in_polygon(x: float, y: float, vertices: List[List[float]]) -> bool:
    """Ray casting algorithm to determine if point (x, y) is inside polygon."""
    n = len(vertices)
    if n < 3:
        return False
    inside = False
    for i in range(n):
        j = (i + 1) % n
        xi, yi = vertices[i][0], vertices[i][1]
        xj, yj = vertices[j][0], vertices[j][1]

        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
    return inside


def resolve_target_v2_zones(zone_id: Optional[str], presentation_zone_id: Optional[str]) -> List[str]:
    """Resolves target Map V2 polygon IDs for a given meter based on its assigned zone."""
    targets = set()
    if presentation_zone_id and presentation_zone_id in PRESENTATION_TO_V2_POLYGONS:
        targets.update(PRESENTATION_TO_V2_POLYGONS[presentation_zone_id])
    if zone_id and zone_id in BUSINESS_TO_V2_POLYGONS:
        targets.update(BUSINESS_TO_V2_POLYGONS[zone_id])
    return sorted(list(targets))


def audit_meter_database(
    db_path: Path,
    map_geometry_path: Path,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Performs full spatial audit of database meters against canonical Map V2 geometry."""
    if not db_path.is_file():
        raise FileNotFoundError(f"Database file not found: {db_path}")
    if not map_geometry_path.is_file():
        raise FileNotFoundError(f"Canonical map geometry file not found: {map_geometry_path}")

    with open(map_geometry_path, "r", encoding="utf-8") as f:
        map_json = json.load(f)

    polygons: Dict[str, List[List[float]]] = {
        p["id"]: p["vertices"] for p in map_json.get("polygons", [])
    }

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query all meters ordered by meter_code
    cursor.execute("""
        SELECT
            id, meter_code, name, location, meter_type, utility_type,
            zone_id, presentation_zone_id, map_x, map_y,
            is_active, lifecycle_status, data_origin, scenario_id,
            created_at, updated_at
        FROM meters
        ORDER BY meter_code ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    audited_meters: List[Dict[str, Any]] = []

    # Counters
    status_counts = {"VALID": 0, "MISSING": 0, "ZERO_ZERO": 0, "NON_FINITE": 0, "OUT_OF_CANVAS": 0}
    coord_type_counts = {"NORMALIZED_RATIO": 0, "CANVAS_PIXELS": 0, "NONE": 0, "FALLBACK_NOISE": 0, "OUT_OF_BOUNDS": 0}
    containment_counts = {"INSIDE_ASSIGNED_ZONE": 0, "OUTSIDE_ASSIGNED_ZONE": 0, "ZONE_UNMAPPED": 0, "NO_COORDINATES": 0}
    utility_counts = {"ELECTRICITY": 0, "WATER": 0, "UNKNOWN": 0, "OTHER": 0}
    origin_counts = {"REAL": 0, "SIMULATED": 0, "LEGACY_SIMULATION": 0, "OTHER": 0}
    lifecycle_counts = {"ACTIVE": 0, "INACTIVE": 0, "RETIRED": 0}

    seen_codes = set()
    duplicate_codes = set()

    for r in rows:
        code = r["meter_code"]
        if code in seen_codes:
            duplicate_codes.add(code)
        seen_codes.add(code)

        db_x = r["map_x"]
        db_y = r["map_y"]
        status, coord_type, cx, cy = classify_spatial_status(db_x, db_y)

        status_counts[status] = status_counts.get(status, 0) + 1
        coord_type_counts[coord_type] = coord_type_counts.get(coord_type, 0) + 1

        u_type = (r["utility_type"] or "UNKNOWN").upper()
        utility_counts[u_type] = utility_counts.get(u_type, 0) + 1

        origin = (r["data_origin"] or "REAL").upper()
        origin_counts[origin] = origin_counts.get(origin, 0) + 1

        ls = (r["lifecycle_status"] or ("ACTIVE" if r["is_active"] else "INACTIVE")).upper()
        lifecycle_counts[ls] = lifecycle_counts.get(ls, 0) + 1

        # Point in polygon check
        containing_zones = []
        if status == "VALID" and cx is not None and cy is not None:
            for poly_id, vertices in polygons.items():
                if is_point_in_polygon(cx, cy, vertices):
                    containing_zones.append(poly_id)

        target_zones = resolve_target_v2_zones(r["zone_id"], r["presentation_zone_id"])

        if status != "VALID":
            containment_status = "NO_COORDINATES"
        elif not target_zones:
            containment_status = "ZONE_UNMAPPED"
        elif any(tz in containing_zones for tz in target_zones):
            containment_status = "INSIDE_ASSIGNED_ZONE"
        else:
            containment_status = "OUTSIDE_ASSIGNED_ZONE"

        containment_counts[containment_status] = containment_counts.get(containment_status, 0) + 1

        notes = []
        if coord_type == "NORMALIZED_RATIO":
            notes.append("Legacy Map V1 (1915x821) normalized coordinate scaled to Map V2 (1536x1024)")
        if containment_status == "OUTSIDE_ASSIGNED_ZONE":
            notes.append(f"Lands in {containing_zones or 'No polygon (water/road)'}, expected {target_zones}")
        if ls == "RETIRED":
            notes.append("Meter is permanently RETIRED")
        if origin in ("SIMULATED", "LEGACY_SIMULATION"):
            notes.append(f"Data origin is {origin}")

        audited_meters.append({
            "meter_code": code,
            "name": r["name"],
            "location": r["location"] or "",
            "meter_type": r["meter_type"] or "UNKNOWN",
            "utility_type": u_type,
            "lifecycle_status": ls,
            "is_active": bool(r["is_active"]),
            "data_origin": origin,
            "scenario_id": r["scenario_id"] or "",
            "db_map_x": db_x,
            "db_map_y": db_y,
            "coord_type": coord_type,
            "canvas_x": cx,
            "canvas_y": cy,
            "spatial_status": status,
            "assigned_zone_id": r["zone_id"] or "",
            "assigned_pres_zone_id": r["presentation_zone_id"] or "",
            "target_v2_zones": target_zones,
            "actual_containing_zones": containing_zones,
            "containment_status": containment_status,
            "notes": "; ".join(notes),
        })

    summary = {
        "audit_version": "1.0",
        "canonical_map": str(map_geometry_path.name),
        "canvas_bounds": {"width": CANVAS_WIDTH, "height": CANVAS_HEIGHT},
        "total_meters": len(rows),
        "duplicate_meter_codes": sorted(list(duplicate_codes)),
        "spatial_status_breakdown": status_counts,
        "coordinate_type_breakdown": coord_type_counts,
        "containment_breakdown": containment_counts,
        "utility_type_breakdown": utility_counts,
        "lifecycle_status_breakdown": lifecycle_counts,
        "data_origin_breakdown": origin_counts,
        "meters_requiring_remapping": [
            m["meter_code"] for m in audited_meters if m["containment_status"] != "INSIDE_ASSIGNED_ZONE" or m["spatial_status"] != "VALID"
        ],
    }

    return audited_meters, summary


def write_csv_evidence(meters: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "meter_code",
        "name",
        "location",
        "meter_type",
        "utility_type",
        "lifecycle_status",
        "is_active",
        "data_origin",
        "scenario_id",
        "db_map_x",
        "db_map_y",
        "coord_type",
        "canvas_x",
        "canvas_y",
        "spatial_status",
        "assigned_zone_id",
        "assigned_pres_zone_id",
        "target_v2_zones",
        "actual_containing_zones",
        "containment_status",
        "notes",
    ]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for m in meters:
            row = dict(m)
            row["target_v2_zones"] = "|".join(row["target_v2_zones"])
            row["actual_containing_zones"] = "|".join(row["actual_containing_zones"])
            writer.writerow(row)


def write_json_evidence(summary: Dict[str, Any], meters: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    full_artifact = {
        "summary": summary,
        "meters": meters,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(full_artifact, f, indent=2, ensure_ascii=False)


def print_summary_report(summary: Dict[str, Any], meters: List[Dict[str, Any]]) -> None:
    print("=" * 80)
    print(" SAIGON PORT MAP V2 — SPATIAL METER DATA AUDIT REPORT")
    print("=" * 80)
    print(f"Canonical Map Reference : {summary['canonical_map']}")
    print(f"Canvas Coordinate Bounds: {int(summary['canvas_bounds']['width'])} x {int(summary['canvas_bounds']['height'])} px")
    print(f"Total Meters Audited    : {summary['total_meters']}")
    print(f"Duplicate Meter Codes   : {summary['duplicate_meter_codes'] or 'None (Clean)'}")
    print("-" * 80)
    print("1. SPATIAL VALIDITY CLASSIFICATION:")
    for status, count in summary["spatial_status_breakdown"].items():
        pct = (count / summary["total_meters"] * 100) if summary["total_meters"] else 0
        print(f"  - {status:<15}: {count:>3} ({pct:>5.1f}%)")
    print("-" * 80)
    print("2. COORDINATE REPRESENTATION:")
    for ctype, count in summary["coordinate_type_breakdown"].items():
        if count > 0:
            print(f"  - {ctype:<18}: {count:>3}")
    print("-" * 80)
    print("3. POINT-IN-POLYGON ZONE CONTAINMENT:")
    for cstatus, count in summary["containment_breakdown"].items():
        pct = (count / summary["total_meters"] * 100) if summary["total_meters"] else 0
        print(f"  - {cstatus:<22}: {count:>3} ({pct:>5.1f}%)")
    print("-" * 80)
    print("4. DATA ORIGIN & LIFECYCLE BREAKDOWN:")
    print(f"  - Real / Field Verified : {summary['data_origin_breakdown'].get('REAL', 0)}")
    print(f"  - Active Simulation     : {summary['data_origin_breakdown'].get('SIMULATED', 0)}")
    print(f"  - Legacy Simulation     : {summary['data_origin_breakdown'].get('LEGACY_SIMULATION', 0)}")
    print(f"  - Active Lifecycle      : {summary['lifecycle_status_breakdown'].get('ACTIVE', 0)}")
    print(f"  - Inactive Lifecycle    : {summary['lifecycle_status_breakdown'].get('INACTIVE', 0)}")
    print(f"  - Retired Lifecycle     : {summary['lifecycle_status_breakdown'].get('RETIRED', 0)}")
    print("-" * 80)
    print(f"{'CODE':<12} | {'STATUS':<11} | {'DB (X, Y)':<18} | {'CANVAS (X, Y)':<16} | {'CONTAINMENT':<22} | {'ZONE'}")
    print("-" * 80)
    for m in meters:
        db_xy = f"({m['db_map_x']}, {m['db_map_y']})" if m['db_map_x'] is not None else "(None, None)"
        cv_xy = f"({m['canvas_x']}, {m['canvas_y']})" if m['canvas_x'] is not None else "(None, None)"
        z_info = m['assigned_pres_zone_id'] or m['assigned_zone_id'] or 'Unassigned'
        print(f"{m['meter_code']:<12} | {m['spatial_status']:<11} | {db_xy:<18} | {cv_xy:<16} | {m['containment_status']:<22} | {z_info}")
    print("=" * 80)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    default_db = repo_root / "data" / "app.db"
    default_map = repo_root / "frontend" / "src" / "components" / "map-v2" / "data" / "tan_thuan_1_zones_edited.json"
    default_csv = repo_root / "docs" / "implementation" / "map-v2-spatial-meter-data-phase-b" / "evidence" / "meter_spatial_audit.csv"
    default_json = repo_root / "docs" / "implementation" / "map-v2-spatial-meter-data-phase-b" / "evidence" / "spatial_audit_summary.json"

    parser = argparse.ArgumentParser(description="Saigon Port Map V2 Spatial Meter Audit Tool")
    parser.add_argument("--db-path", type=Path, default=default_db, help="Path to SQLite database")
    parser.add_argument("--map-geometry", type=Path, default=default_map, help="Path to Map V2 canonical geometry JSON")
    parser.add_argument("--output-csv", type=Path, default=default_csv, help="Path to write CSV audit evidence")
    parser.add_argument("--output-json", type=Path, default=default_json, help="Path to write JSON audit summary")
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout report")

    args = parser.parse_args()

    meters, summary = audit_meter_database(args.db_path, args.map_geometry)

    write_csv_evidence(meters, args.output_csv)
    write_json_evidence(summary, meters, args.output_json)

    if not args.quiet:
        print_summary_report(summary, meters)
        print(f"\nAudit artifacts written successfully:")
        print(f"  CSV : {args.output_csv}")
        print(f"  JSON: {args.output_json}\n")


if __name__ == "__main__":
    main()
