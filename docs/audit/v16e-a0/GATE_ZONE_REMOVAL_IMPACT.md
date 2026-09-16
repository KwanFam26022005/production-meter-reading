# V16E-A0: Architectural Impact Analysis — Planned Removal of `pres-gate`

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Target Entity:** Presentation Zone `pres-gate` (ID: `pres-gate`, Cổng chính, Display Index: 6)  
**Status in V16E-A0:** **FROZEN & PRESERVED** (Zero deletions in this audit phase).

---

## 1. Executive Summary

In future phases (V16E+), the product team plans to decommission `pres-gate` because it represents a tiny sliver ($978\text{ px}^2$, $<0.06\%$ of map area) that holds zero physically contained meters and introduces artificial spatial fragmentation.

This document traces **every code, database, test, route, and UI dependency** on `pres-gate` to establish a safe, zero-downtime deprecation path.

---

## 2. Deep Dependency Trace

### 2.1 Database Dependencies (`data/app.db`)

1. **`map_version_zones` Table:**
   - Record: `map_version_id = '7176b67f-37b8-4a62-98c1-02943dd98e7d'`, `zone_id = 'pres-gate'`.
   - Polygon: `[[1680, 560], [1743, 560], [1743, 591], [1680, 591]]`.
   - **Impact of direct deletion:** Violates the immutability of `tan-thuan-v16a-r2-frozen`.
   - **Remediation:** Do NOT delete from `tan-thuan-v16a-r2-frozen`. Instead, publish a new map version (e.g. `tan-thuan-v16e-r1`) containing only 5 presentation zones.

2. **`meters` Table:**
   - Record: `CT-010` has `presentation_zone_id = 'pres-gate'`.
   - **Impact of deleting zone without migrating meter:** `CT-010` will have a dangling `presentation_zone_id` referencing a nonexistent zone, causing filter errors in UI.
   - **Remediation:** Migrate `CT-010.presentation_zone_id` to `pres-technical` (or `pres-cfs-east`) in the same transaction as the map version upgrade.

3. **`zone_assignments` Table:**
   - Any historical user assignments linked to `zone-technical` remain intact (operational zone `zone-technical` is decoupled from presentation zone `pres-gate`).

---

### 2.2 Backend Code Dependencies

1. **`backend/app/map_config.py`:**
   - Line 447 defines:
     ```python
     DEFAULT_PRESENTATION_ZONES = [
         "pres-berth",
         "pres-container-west",
         "pres-container-center",
         "pres-cfs-east",
         "pres-technical",
         "pres-gate",  # <-- MUST BE REMOVED WHEN MAP VERSION IS BUMPED
     ]
     ```
   - If `pres-gate` is removed from DB but retained in `DEFAULT_PRESENTATION_ZONES`, fallback seeders will attempt to recreate it on server boot.

2. **`backend/app/db.py`:**
   - Line 614 contains initial seed data:
     ```python
     'CT-010': ('pres-gate', 0.8564, 0.6821)
     ```
   - Must be updated to:
     ```python
     'CT-010': ('pres-technical', 0.8564, 0.6821)
     ```

---

### 2.3 Automated Test Suite Dependencies

A strict test gate exists in the test suite asserting exactly 6 presentation zones:

1. **`tests/test_v16a_r2_spatial_freeze.py` (Line 114):**
   - Asserts:
     ```python
     expected_zones = [
         "pres-berth",
         "pres-container-west",
         "pres-container-center",
         "pres-cfs-east",
         "pres-technical",
         "pres-gate",
     ]
     assert len(zones) == 6
     ```
   - Deleting `pres-gate` without updating this test will immediately break CI/CD test gates.

2. **`tests/test_v16a_r1_decouple_validation.py` (Line 126):**
   - Asserts:
     ```python
     'CT-010': ('Khu kỹ thuật 2', 'pres-gate', 0.8564, 0.6821)
     ```
   - Must be updated to reference the new assigned presentation zone.

---

### 2.4 Frontend UI & Presentation Dependencies

1. **Zone Filter Controls (`frontend/src/components/...`):**
   - Renders chips/buttons for each presentation zone. Removing `pres-gate` cleanly reduces the filter list from 6 chips to 5 chips.
2. **SVG Polygon Layer:**
   - Removes the purple overlay box at `[1680, 560, 1743, 591]`, decluttering the main gate entrance corridor.
3. **Color Theme Palette:**
   - Frees `#8B5CF6` (Purple/Violet) from the presentation zone scheme.

---

## 3. Safe Decommissioning Execution Plan (For V16E Execution)

When the user gives approval to execute the zone reduction:
1. **Step 1 (Meter Reassignment):** Execute `UPDATE meters SET presentation_zone_id = 'pres-technical' WHERE meter_code = 'CT-010'`.
2. **Step 2 (Map Version Bump):** Create and publish new map version `tan-thuan-v16e-r1` with 5 presentation zones (excluding `pres-gate`). Set `status = 'PUBLISHED'` and archive `tan-thuan-v16a-r2-frozen`.
3. **Step 3 (Config Update):** Remove `"pres-gate"` from `DEFAULT_PRESENTATION_ZONES` in `backend/app/map_config.py` and `backend/app/db.py`.
4. **Step 4 (Test Update):** Update `test_v16a_r2_spatial_freeze.py` and `test_v16a_r1_decouple_validation.py` to expect 5 zones and `CT-010` in `pres-technical`.
5. **Step 5 (Frontend Verification):** Verify that the terminal map renders 5 seamless zones without visual or navigation regressions.
