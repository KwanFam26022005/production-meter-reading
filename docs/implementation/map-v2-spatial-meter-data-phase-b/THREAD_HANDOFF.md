# Thread Handoff — Thread 8A (Phase B) to Thread 8B

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Subject:** Map V2 Spatial Meter Data Audit & Safe Seeding Handoff  
**Dedicated Branch:** `feature/map-v2-spatial-meter-data-phase-b`  
**Date:** 2026-09-23  

---

## 1. What Thread 8A Completed

1. **Spatial Meter Audit Tool (`scripts/audit_meter_spatial_data.py`)**:
   - Built a comprehensive audit utility that inspects SQLite `meters` and evaluates coordinates against Map V2 canonical bounds ($[0, 1536] \times [0, 1024]$) and the 7 canonical polygons.
   - Generated machine-readable audit evidence:
     - `docs/implementation/map-v2-spatial-meter-data-phase-b/evidence/meter_spatial_audit.csv`
     - `docs/implementation/map-v2-spatial-meter-data-phase-b/evidence/spatial_audit_summary.json`
2. **Authoritative Seed Manifest (`config/map_v2_meter_coordinate_seed.json`)**:
   - Structured JSON schema enforcing $1536 \times 1024$ canvas, provenance tracking, and strict verification governance.
   - All 24 existing meters mapped with truthful status (`verified: false` for unverified/legacy coordinates).
3. **Safe Idempotent Seeder Tool (`scripts/seed_meter_spatial_data.py`)**:
   - Built a robust transactional seeder with default `--dry-run`, explicit `--apply`, single atomic transaction rollback on ANY error, and idempotency guarantees.
   - Verified dry-run execution and recorded evidence: `evidence/seed_dry_run.txt`.
4. **Automated Test Suite (`tests/test_meter_spatial_audit_and_seed.py`)**:
   - Implemented 26 comprehensive unit and integration tests covering spatial classification, point-in-polygon math, manifest schema rules, record validation, transactional rollback, dry-run safety, and CLI subprocess execution. All 26 tests pass in 0.54s.
5. **Frozen Baselines Intact**:
   - B2 topology SHA256 matches `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`.
   - 354 Operations tests and 74 User tests pass with zero regressions.

---

## 2. Recommended Scope for Thread 8B

1. **BD-02: Measurement Unit Column & Schema Task:**
   - Migrate `meters` table to add authoritative `measurement_unit VARCHAR(16)` and `multiplier FLOAT DEFAULT 1.0`.
   - Update `MapMeterOut`, `MeterOut`, and `AdminMeterItem` Pydantic schemas.
   - Update manual entry forms and technical reading log.
2. **BD-05: Port Business Meaning of Round Denominator:**
   - Confirm with port management whether `total_meters` in single-round calculations should reflect all active port meters or meters scheduled for that specific round.
3. **Real Meter Spatial Data Ingestion:**
   - Ingest confirmed physical coordinates from Port Engineering CAD drawings into `config/map_v2_meter_coordinate_seed.json`.
   - Run `python scripts/seed_meter_spatial_data.py --apply` to populate verified coordinates for administrative meters.
