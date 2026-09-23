#!/usr/bin/env python3
"""
Saigon Port Map V2 — Safe Spatial Meter Data Seeder
Thread 8A (Phase B)

Idempotent, transactional seeder for meter spatial coordinates on Map V2.
Consumes the auditable seed manifest (config/map_v2_meter_coordinate_seed.json),
strictly validates provenance and coordinate boundaries ([0, 1536] x [0, 1024]),
and applies updates in a single atomic transaction.

Defaults to --dry-run for safety. Requires explicit --apply to commit.
"""

import argparse
import json
import math
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CANVAS_WIDTH = 1536.0
CANVAS_HEIGHT = 1024.0


class SeedingValidationError(Exception):
    """Raised when manifest structure or record validation fails."""
    pass


def validate_manifest(manifest_data: Dict[str, Any]) -> None:
    """Validates top-level manifest structure and coordinate system invariants."""
    if not isinstance(manifest_data, dict):
        raise SeedingValidationError("Manifest root must be a JSON object.")

    if "version" not in manifest_data:
        raise SeedingValidationError("Manifest missing required 'version' field.")

    if "coordinate_system" not in manifest_data:
        raise SeedingValidationError("Manifest missing required 'coordinate_system' definition.")

    cs = manifest_data["coordinate_system"]
    if cs.get("width") != 1536 or cs.get("height") != 1024:
        raise SeedingValidationError(
            f"Coordinate system dimensions must be 1536x1024. Found: {cs.get('width')}x{cs.get('height')}"
        )

    if cs.get("origin") != "top-left":
        raise SeedingValidationError(
            f"Coordinate system origin must be 'top-left'. Found: {cs.get('origin')}"
        )

    if "meters" not in manifest_data or not isinstance(manifest_data["meters"], list):
        raise SeedingValidationError("Manifest missing 'meters' array.")


def validate_meter_record(record: Dict[str, Any], index: int) -> Tuple[bool, Optional[str]]:
    """
    Validates an individual meter seed record.
    Returns (is_valid_for_apply, skip_reason).
    Raises SeedingValidationError on malformed records.
    """
    code = record.get("meter_code")
    if not code or not isinstance(code, str) or not code.strip():
        raise SeedingValidationError(f"Record at index {index} has missing or invalid 'meter_code'.")

    verified = record.get("verified")
    if not isinstance(verified, bool):
        raise SeedingValidationError(f"Record '{code}' must have boolean 'verified' field.")

    # Unverified records are strictly skipped from applying
    if not verified:
        return False, "Record has verified=False (unverified spatial provenance)"

    # For verified records, validate coordinates strictly
    map_x = record.get("map_x")
    map_y = record.get("map_y")

    if map_x is None or map_y is None:
        raise SeedingValidationError(f"Verified record '{code}' cannot have null coordinates.")

    try:
        fx = float(map_x)
        fy = float(map_y)
    except (ValueError, TypeError):
        raise SeedingValidationError(f"Verified record '{code}' has non-numeric coordinates: ({map_x}, {map_y}).")

    if math.isnan(fx) or math.isnan(fy) or math.isinf(fx) or math.isinf(fy):
        raise SeedingValidationError(f"Verified record '{code}' has NaN or Infinite coordinates: ({fx}, {fy}).")

    if abs(fx) < 1e-6 and abs(fy) < 1e-6:
        raise SeedingValidationError(f"Verified record '{code}' cannot use (0, 0) fallback coordinate.")

    if fx < 0.0 or fx > CANVAS_WIDTH or fy < 0.0 or fy > CANVAS_HEIGHT:
        raise SeedingValidationError(
            f"Verified record '{code}' coordinates ({fx}, {fy}) out of canvas bounds [0, 1536] x [0, 1024]."
        )

    source = record.get("source")
    if not source or not isinstance(source, str) or not source.strip():
        raise SeedingValidationError(f"Verified record '{code}' must specify 'source' provenance.")

    source_ref = record.get("source_reference")
    if not source_ref or not isinstance(source_ref, str) or not source_ref.strip():
        raise SeedingValidationError(f"Verified record '{code}' must specify 'source_reference'.")

    return True, None


def seed_spatial_data(
    manifest_path: Path,
    db_path: Path,
    dry_run: bool = True,
    strict_db_check: bool = True,
) -> Dict[str, Any]:
    """
    Executes safe spatial seeding from manifest to SQLite database.
    Wraps entire execution in an atomic transaction with automatic rollback on error or dry-run.
    """
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest file not found: {manifest_path}")
    if not db_path.is_file():
        raise FileNotFoundError(f"Database file not found: {db_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    validate_manifest(manifest)

    meter_records = manifest["meters"]
    seen_codes = set()
    for idx, rec in enumerate(meter_records):
        code = rec.get("meter_code", "").strip()
        if code in seen_codes:
            raise SeedingValidationError(f"Duplicate meter_code '{code}' found in manifest at index {idx}.")
        seen_codes.add(code)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    actions: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    updated_count = 0
    unchanged_count = 0
    skipped_count = 0

    try:
        cursor.execute("BEGIN IMMEDIATE")

        for idx, rec in enumerate(meter_records):
            code = rec["meter_code"].strip()
            should_apply, skip_reason = validate_meter_record(rec, idx)

            if not should_apply:
                skipped.append({"meter_code": code, "reason": skip_reason})
                skipped_count += 1
                continue

            # Query existing meter in database
            cursor.execute(
                "SELECT id, meter_code, name, map_x, map_y, is_active FROM meters WHERE meter_code = ?",
                (code,),
            )
            row = cursor.fetchone()

            if not row:
                if strict_db_check:
                    raise SeedingValidationError(f"Meter '{code}' specified in manifest does not exist in database.")
                else:
                    skipped.append({"meter_code": code, "reason": "Meter not found in database (non-strict mode)"})
                    skipped_count += 1
                    continue

            db_x = row["map_x"]
            db_y = row["map_y"]
            new_x = float(rec["map_x"])
            new_y = float(rec["map_y"])

            # Check if coordinates actually changed
            coords_match = (
                db_x is not None
                and db_y is not None
                and abs(float(db_x) - new_x) < 1e-4
                and abs(float(db_y) - new_y) < 1e-4
            )

            if coords_match:
                actions.append({
                    "meter_code": code,
                    "action": "UNCHANGED",
                    "old_coords": (db_x, db_y),
                    "new_coords": (new_x, new_y),
                    "source": rec.get("source"),
                })
                unchanged_count += 1
            else:
                actions.append({
                    "meter_code": code,
                    "action": "UPDATED",
                    "old_coords": (db_x, db_y),
                    "new_coords": (new_x, new_y),
                    "source": rec.get("source"),
                    "source_reference": rec.get("source_reference"),
                })
                updated_count += 1

                now_utc = datetime.now(timezone.utc).isoformat()
                cursor.execute(
                    "UPDATE meters SET map_x = ?, map_y = ?, updated_at = ? WHERE meter_code = ?",
                    (new_x, new_y, now_utc, code),
                )

        if dry_run:
            conn.rollback()
            mode_str = "DRY-RUN (Simulated — no changes committed)"
        else:
            conn.commit()
            mode_str = "APPLY (Changes committed successfully)"

    except Exception:
        conn.rollback()
        conn.close()
        raise

    conn.close()

    result = {
        "mode": mode_str,
        "is_dry_run": dry_run,
        "manifest_file": str(manifest_path),
        "database_file": str(db_path),
        "total_records_in_manifest": len(meter_records),
        "updated_count": updated_count,
        "unchanged_count": unchanged_count,
        "skipped_count": skipped_count,
        "actions": actions,
        "skipped": skipped,
    }

    return result


def print_seeder_report(result: Dict[str, Any]) -> None:
    print("=" * 80)
    print(" SAIGON PORT MAP V2 — SAFE SPATIAL SEEDER EXECUTION REPORT")
    print("=" * 80)
    print(f"Mode                : {result['mode']}")
    print(f"Manifest Source     : {result['manifest_file']}")
    print(f"Target Database     : {result['database_file']}")
    print(f"Total Records       : {result['total_records_in_manifest']}")
    print(f"Planned Updates     : {result['updated_count']}")
    print(f"Already Up-To-Date  : {result['unchanged_count']}")
    print(f"Skipped / Unverified: {result['skipped_count']}")
    print("-" * 80)

    if result["actions"]:
        print("METER COORDINATE ACTIONS:")
        for act in result["actions"]:
            old_str = f"({act['old_coords'][0]}, {act['old_coords'][1]})" if act['old_coords'][0] is not None else "(None, None)"
            new_str = f"({act['new_coords'][0]}, {act['new_coords'][1]})"
            print(f"  [{act['action']:<9}] {act['meter_code']:<12} : {old_str} -> {new_str} (Source: {act['source']})")
        print("-" * 80)

    if result["skipped"]:
        print("SKIPPED RECORDS:")
        for sk in result["skipped"]:
            print(f"  [SKIPPED] {sk['meter_code']:<12} : {sk['reason']}")
        print("-" * 80)

    if result["is_dry_run"]:
        print("[DRY-RUN COMPLETE] Zero rows modified in database. Use --apply to execute.")
    else:
        print(f"[APPLY COMPLETE] {result['updated_count']} meter coordinates committed atomically to database.")
    print("=" * 80)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    default_manifest = repo_root / "config" / "map_v2_meter_coordinate_seed.json"
    default_db = repo_root / "data" / "app.db"

    parser = argparse.ArgumentParser(description="Saigon Port Map V2 Safe Spatial Seeder")
    parser.add_argument("--manifest", type=Path, default=default_manifest, help="Path to coordinate seed manifest")
    parser.add_argument("--db-path", type=Path, default=default_db, help="Path to SQLite database")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", default=True, help="Simulate execution without database mutation (default)")
    group.add_argument("--apply", action="store_true", help="Execute and commit coordinate updates atomically")
    parser.add_argument("--allow-missing-meters", action="store_true", help="Skip meters not found in database rather than aborting")
    parser.add_argument("--log-file", type=Path, default=None, help="Optional path to write report output")

    args = parser.parse_args()
    is_apply = args.apply
    dry_run = not is_apply

    result = seed_spatial_data(
        manifest_path=args.manifest,
        db_path=args.db_path,
        dry_run=dry_run,
        strict_db_check=not args.allow_missing_meters,
    )

    print_seeder_report(result)

    if args.log_file:
        args.log_file.parent.mkdir(parents=True, exist_ok=True)
        with open(args.log_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(result, indent=2, ensure_ascii=False))
        print(f"\nExecution log written to: {args.log_file}")


if __name__ == "__main__":
    main()
