import argparse
import logging
import os
import sys
import time
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal
from .models import AttendanceEvent

logger = logging.getLogger("attendance_gc")


def audit_and_cleanup_attendance_photos(
    db: Session,
    dry_run: bool = True,
    grace_period_seconds: int = 3600,
    target_dir: Optional[Path] = None,
) -> dict:
    """
    Audits attendance photo storage against authoritative database references.

    Guarantees:
    1. Default to dry_run=True (never deletes unless explicitly requested).
    2. Strictly scoped to the configured attendance photo storage directory.
    3. Never deletes a referenced image key in AttendanceEvent.photo_key.
    4. Protects in-flight / recent images younger than grace_period_seconds (default 1 hour).
    5. Returns an auditable report dictionary.
    """
    settings = get_settings()
    photo_dir = (target_dir or Path(settings.attendance_photo_dir)).resolve()

    if not photo_dir.exists() or not photo_dir.is_dir():
        return {
            "dry_run": dry_run,
            "directory": str(photo_dir),
            "directory_exists": False,
            "scanned_total": 0,
            "referenced": 0,
            "in_flight_protected": 0,
            "orphans_found": 0,
            "orphans_deleted": 0,
            "orphan_keys": [],
        }

    # Fetch all authoritative photo keys from the database
    db_keys = db.query(AttendanceEvent.photo_key).all()
    authoritative_keys = {row[0] for row in db_keys if row and row[0]}

    now_ts = time.time()
    scanned_total = 0
    referenced_count = 0
    in_flight_protected_count = 0
    orphans: list[str] = []
    deleted_count = 0

    for item in photo_dir.iterdir():
        # Only inspect regular files, skip symlinks and non-image files
        if not item.is_file() or item.is_symlink():
            continue

        # Prevent directory traversal or foreign files
        file_name = item.name
        scanned_total += 1

        if file_name in authoritative_keys:
            referenced_count += 1
            continue

        # Check file age for in-flight protection
        try:
            mtime = item.stat().st_mtime
            age_seconds = now_ts - mtime
        except OSError:
            age_seconds = 0

        if age_seconds < grace_period_seconds:
            # File is young; could belong to an in-flight submission
            in_flight_protected_count += 1
            continue

        # Unreferenced orphan older than grace period
        orphans.append(file_name)
        if not dry_run:
            try:
                item.unlink()
                deleted_count += 1
            except OSError as err:
                logger.warning(f"Failed to delete orphan file {item}: {err}")

    return {
        "dry_run": dry_run,
        "directory": str(photo_dir),
        "directory_exists": True,
        "scanned_total": scanned_total,
        "referenced": referenced_count,
        "in_flight_protected": in_flight_protected_count,
        "orphans_found": len(orphans),
        "orphans_deleted": deleted_count,
        "orphan_keys": orphans,
    }


def main():
    parser = argparse.ArgumentParser(description="Attendance Storage Audit & Garbage Collector")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform real deletion of verified orphan photos (default is dry-run)",
    )
    parser.add_argument(
        "--grace-minutes",
        type=int,
        default=60,
        help="Grace period in minutes to protect in-flight files (default: 60)",
    )

    args = parser.parse_args()
    dry_run = not args.apply
    grace_seconds = args.grace_minutes * 60

    print(f"[*] Starting Attendance Photo GC (dry_run={dry_run}, grace={args.grace_minutes}m)...")
    db = SessionLocal()
    try:
        report = audit_and_cleanup_attendance_photos(
            db=db,
            dry_run=dry_run,
            grace_period_seconds=grace_seconds,
        )
        print(f"[*] Scanned Total: {report['scanned_total']}")
        print(f"[*] Referenced Authoritative: {report['referenced']}")
        print(f"[*] In-flight Protected (<{args.grace_minutes}m): {report['in_flight_protected']}")
        print(f"[*] Orphans Found: {report['orphans_found']}")
        if not dry_run:
            print(f"[!] Orphans Deleted: {report['orphans_deleted']}")
        else:
            print(f"[*] Dry-run mode: No files were deleted.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
