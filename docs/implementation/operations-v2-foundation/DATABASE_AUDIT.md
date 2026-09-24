# Operations V2 Foundation: Database Audit Report

**Date:** 2026-09-24  
**Project:** Production Meter Reading — Saigon Port  
**Harness Target:** `integration/operations-v2-foundation`  
**Author:** Antigravity Engineering

---

## 1. Executive Summary

A comprehensive multi-worktree audit of all project SQLite databases located across `D:\Projects\production-meter-reading\` was conducted prior to establishing the canonical development runtime.

Key conclusions:
1. **Worktree Database Divergence:** Across the active Git worktrees (`production-meter-reading`, `production-meter-reading-harness-portability`, `production-meter-reading-reporting-runtime-fix`), database sizes ranged from 420 KB to 11.46 MB, with divergent schemas and unshared state.
2. **Missing 9A & 9B Operational Data:** While the schema migrations for Thread 9A (`reading_round_meters`) and Thread 9B (`operational_assignments`) had executed on `production-meter-reading/data/app.db`, **both tables contained exactly 0 rows**. No demo or production dataset unified these capabilities.
3. **Decision: PATH B (Rebuild Development DB).** Because lineage cannot be reconciled without conjectural row-level data fabrication, all existing databases have been safely backed up to `.runtime/backups/20260924_153435/`, and a deterministic, idempotent `tan-thuan-demo-v2` dataset is established as the canonical baseline.

---

## 2. Physical Database Inventory

| Database Identifier | Absolute Path | Size (Bytes) | Last Modified | SHA256 Hash | Integrity | FK Violations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `main-data` | `...\production-meter-reading\data\app.db` | 11,460,608 | 2026-09-24 08:54:32 | `7423BB551939...` | `ok` | 0 |
| `backend-data` | `...\production-meter-reading\backend\data\app.db` | 430,080 | 2026-09-13 11:35:04 | `3175179F057D...` | `ok` | 0 |
| `harness-portability` | `...\production-meter-reading-harness-portability\data\app.db` | 720,896 | 2026-09-24 14:39:06 | `8D2AE0979773...` | `ok` | 0 |
| `reporting-fix` | `...\production-meter-reading-reporting-runtime-fix\data\app.db` | 11,460,608 | 2026-09-24 14:31:37 | `7423BB551939...` | `ok` | 0 |
| `backup-20260916` | `...\production-meter-reading\data\app_backup_20260916_205151.db` | 11,456,512 | 2026-09-16 20:51:51 | (Verified) | `ok` | 0 |
| `backup-pre-map` | `...\production-meter-reading\data\app_backup_pre_map_operations_20260909.db` | 4,997,120 | 2026-09-09 10:47:38 | (Verified) | `ok` | 0 |
| `test-copy` | `...\production-meter-reading\data\app_test_copy.db` | 11,407,360 | 2026-09-16 20:50:59 | (Verified) | `ok` | 0 |

---

## 3. Table Inventory & Entity Counts

| Table Name | `main-data` (11.4 MB) | `backend-data` (0.4 MB) | `harness-port` (0.7 MB) | `test-copy` (11.4 MB) | `backup-pre-map` (5.0 MB) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | 17 | 0 | 17 | 17 | 14 |
| `operational_zones` | 4 | 4 | 4 | 4 | 0 |
| `zone_assignments` | 72 | 0 | 72 | 72 | 0 |
| `work_schedules` | 331 | 0 | 331 | 331 | 360 |
| `leave_requests` | 3 | 0 | 3 | 3 | 2 |
| `operational_assignments` | **0** | 0 | **0** | **0** | 0 (No table) |
| `assets` | 52 | 0 | 32 | 32 | 0 (No table) |
| `asset_connections` | 41 | 0 | 31 | 31 | 0 (No table) |
| `meter_asset_relations` | 24 | 0 | 24 | 24 | 0 (No table) |
| `meters` | 24 | 0 | 24 | 24 | 12 |
| `reading_batches` | 2 | 0 | 2 | 2 | 1 |
| `reading_rounds` | 647 | 0 | 647 | 647 | 310 |
| `reading_round_meters` | **0** | 0 | **0** | **0** | 0 (No table) |
| `meter_readings` | 6,873 | 0 | 6,873 | 6,873 | 2,841 |
| `meter_reading_evidence` | 0 | 0 | 0 | 0 | 2,838 |
| `admin_audit_logs` | 2,104 | 0 | 2,064 | 2,064 | 57 |
| `simulation_scenarios` | 1 | 0 | 1 | 1 | 0 (No table) |
| `attendance_events` | 9 | 0 | 8 | 8 | 8 |

---

## 4. Semantic Audit

### 4.1 Thread 9A (Immutable Meter Scope & Snapshot Mode)
- **Status in existing DBs:** All 647 existing `reading_rounds` were created as `is_legacy = 1` or `scope_mode = 'LEGACY_DYNAMIC'`.
- **`reading_round_meters`:** Exactly 0 rows across all inspected databases.
- **Finding:** No SNAPSHOT rounds existed. Without `ReadingRoundMeter` rows, current rounds evaluate dynamic active meters at query time rather than testing immutable snapshot guarantees.

### 4.2 Thread 9B (Operational Assignments & Shift Staffing)
- **Status in existing DBs:** Exactly 0 rows in `operational_assignments`.
- **Legacy Fallback:** Only legacy static `zone_assignments` (72 rows) existed, tying users to zones without work date or shift boundaries.
- **Finding:** No multi-dimensional assignment (WHO + WHERE + WHEN + ROLE) was active.

### 4.3 Thread 9C (User Task Projection)
- **Status in existing DBs:** Because formula is `UserTask = ReadingRoundMeter ∩ OperationalAssignment`, and both operands had 0 rows, User Task projection evaluated to empty sets (`NO_ASSIGNMENT`) under strict 9C rules.

### 4.4 Thread 9D (Measurement Metadata & Usage Analytics)
- **Status in existing DBs:** The 24 meters in `main-data` possessed default metadata:
  - `measurement_unit`: 24 rows with `'UNKNOWN'`
  - `register_semantics`: 24 rows with `'UNKNOWN'`
  - `utility_type`: mixed `'ELECTRICITY'` and `'WATER'`
- **Finding:** Because `measurement_unit` was `'UNKNOWN'`, usage calculation rightly excluded these meters under data-readiness contracts, displaying empty/readiness states.

---

## 5. Decision & Execution

### Selected Decision: PATH B (Rebuild Development DB)
- **Justification:**
  1. No single worktree database represents a canonical superset containing 9A, 9B, 9C, and 9D demo data.
  2. Preserving `main-data` would leave 9A and 9B empty, breaking end-to-end Operations V2 validation.
  3. Reconciling records between `main-data`, `harness-portability`, and `reporting-fix` would require guessing business truth.
- **Pre-Rebuild Backups:**
  All 7 databases were copied to `D:\Projects\production-meter-reading\.runtime\backups\20260924_153435/` with cryptographic SHA-256 validation recorded in `manifest.json`.
- **Target Baseline:**
  A deterministic, idempotent seeder (`scripts/seed_tan_thuan_demo_v2.py`) anchored at `2026-09-24 Asia/Ho_Chi_Minh` targets `.runtime/data/app.db`.
