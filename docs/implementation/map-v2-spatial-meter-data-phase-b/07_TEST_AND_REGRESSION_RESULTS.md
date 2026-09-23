# 07 — Test & Regression Verification Results

**Test Suite:** `tests/test_meter_spatial_audit_and_seed.py`  
**Execution Date:** 2026-09-23  
**Framework:** Pytest 9.1.1 (Python 3.11.9 on Windows)  

---

## 1. Automated Test Results Summary

| Test Category | Suite / Test Function | Result | Execution Time |
| :--- | :--- | :---: | :---: |
| **Spatial Classification** | `test_spatial_classification_valid_canvas_pixels` | **PASSED** | $< 0.01\text{s}$ |
| **Spatial Classification** | `test_spatial_classification_valid_normalized_ratio` | **PASSED** | $< 0.01\text{s}$ |
| **Spatial Classification** | `test_spatial_classification_missing` | **PASSED** | $< 0.01\text{s}$ |
| **Spatial Classification** | `test_spatial_classification_zero_zero` | **PASSED** | $< 0.01\text{s}$ |
| **Spatial Classification** | `test_spatial_classification_non_finite` | **PASSED** | $< 0.01\text{s}$ |
| **Spatial Classification** | `test_spatial_classification_out_of_canvas` | **PASSED** | $< 0.01\text{s}$ |
| **Geometry Math** | `test_point_in_polygon_ray_casting_unit` | **PASSED** | $< 0.01\text{s}$ |
| **Geometry Math** | `test_point_in_polygon_against_all_canonical_v2_anchors` | **PASSED** | $< 0.01\text{s}$ |
| **Zone Mapping** | `test_resolve_target_v2_zones` | **PASSED** | $< 0.01\text{s}$ |
| **Manifest Schema** | `test_manifest_validation_valid` | **PASSED** | $< 0.01\text{s}$ |
| **Manifest Schema** | `test_manifest_validation_invalid_dimensions` | **PASSED** | $< 0.01\text{s}$ |
| **Manifest Schema** | `test_manifest_validation_invalid_origin` | **PASSED** | $< 0.01\text{s}$ |
| **Manifest Schema** | `test_manifest_validation_missing_version` | **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_unverified` | **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_verified_valid` | **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_verified_rejects_null` | **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_verified_rejects_zero_zero` | **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_verified_rejects_out_of_bounds`| **PASSED** | $< 0.01\text{s}$ |
| **Record Validation** | `test_validate_meter_record_verified_rejects_missing_provenance`| **PASSED** | $< 0.01\text{s}$ |
| **Seeder Safety** | `test_seeder_dry_run_does_not_mutate_db` | **PASSED** | $< 0.02\text{s}$ |
| **Seeder Safety** | `test_seeder_apply_and_idempotency` | **PASSED** | $< 0.02\text{s}$ |
| **Seeder Safety** | `test_seeder_atomic_rollback_on_error` | **PASSED** | $< 0.02\text{s}$ |
| **Seeder Safety** | `test_seeder_preserves_unrelated_columns` | **PASSED** | $< 0.02\text{s}$ |
| **Repository Audit** | `test_repository_audit_execution` | **PASSED** | $< 0.05\text{s}$ |
| **Subprocess CLI** | `test_cli_audit_tool_subprocess` | **PASSED** | $\sim 0.15\text{s}$ |
| **Subprocess CLI** | `test_cli_seeder_tool_dry_run_subprocess` | **PASSED** | $\sim 0.15\text{s}$ |
| **TOTAL** | **26 Tests Executed** | **26 PASSED (100%)** | **0.54s** |

---

## 2. Regression Invariants Verification

1. **Frozen B2 Layout Hash Invariant:**
   - Command: `node scripts/verify_b2_freeze_hash.mjs`
   - Output: `FROZEN B2 CONFIG SHA256: 7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`
   - Result: **PASS** (Zero mutation to B2 topology nodes or edges).

2. **Frontend Operations Portal Tests:**
   - Command: `npm run test:operations`
   - Result: **354 / 354 passed** (Zero regressions in Map V2 or Admin workspaces).

3. **Frontend User Portal Tests:**
   - Command: `npm run test:user`
   - Result: **74 / 74 passed** (Zero regressions in Field User / Camera capture workflows).

4. **Bundle Isolation Gates:**
   - Command: `node scripts/verify_bundle_separation.mjs`
   - Result: **PASS** (User: 286.51 KB, Operations: 917.68 KB; zero cross-portal leakages).
