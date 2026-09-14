# V16A — Migration & Spatial Authority Validation Report

## 1. Validation Overview

Phase V16A accomplishes the complete decoupling of operational map rendering from static TypeScript geometry, establishing the backend SQLite active `MapVersion` as the single authoritative spatial contract.

- **Execution Date**: 2026-09-14
- **Branch**: `feature/v10-landmark-calibration-minimal-hud`
- **Backup Branch**: `backup/pre-v16a-spatial-authority`
- **Final Status**: `V16A_SPATIAL_AUTHORITY_APPROVED`

---

## 2. Validation Gate Checkpoints

| Checkpoint | Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **Gate 1: Coordinate Contract** | Strict preservation of $1915 \times 821$ px canonical scene and normalized $[0, 1]$ coordinates. | `tests/v16aSpatialAuthority.test.ts`, `tests/canonicalScene.test.ts` | **PASS** |
| **Gate 2: DB Single Active Version** | Exactly 1 `is_active=True` map version exists in SQLite at all times. | `tests/test_v16a_spatial_authority.py::test_single_active_version_invariant` | **PASS** |
| **Gate 3: Active Map Config Contract** | API `/api/v1/map-config/active` returns enriched `ActiveMapConfigurationResponse`. | `tests/test_v16a_spatial_authority.py::test_active_map_config_endpoint_contract` | **PASS** |
| **Gate 4: Operational Layer Decoupling** | `ZoneLayer`, `MeterLayer`, and `OperatorLayer` consume `useMapConfiguration()`. | Frontend build, grep audit on static imports | **PASS** |
| **Gate 5: Degraded Fallback Policy** | Graceful fallback on network loss with `[DEGRADED_MAP_CONFIGURATION]` log. | `tests/v16aSpatialAuthority.test.ts` | **PASS** |
| **Gate 6: Live Publish Invalidation** | Calibration publish updates `MapConfigurationProvider` without frontend rebuild. | Integration tests, provider cache invalidation | **PASS** |
| **Gate 7: V15 Route Decoupling** | Static V15 route animation remains safely decoupled; no rogue animation loops. | `tests/v15dStabilizationFreeze.test.ts`, `tests/v16SpatialCrud.test.ts` | **PASS** |
| **Gate 8: Asset Domain Separation** | No `assets` table created in database; discovery documents isolated. | SQLite schema audit, `docs/domain/asset-discovery/` | **PASS** |
| **Gate 9: Backend Test Suite** | 100% of backend tests pass without failure. | `pytest tests/` (110 passed, 0 failed) | **PASS** |
| **Gate 10: Frontend Test Suite** | 100% of frontend tests pass without failure. | `npm test -- --run` (226 passed, 0 failed) | **PASS** |
| **Gate 11: Production Build** | TypeScript compilation and Vite build complete cleanly with zero errors. | `npx tsc --noEmit` + `npm run build` | **PASS** |

---

## 3. Test Suite Execution Summary

### Backend Tests (`pytest tests/`)
```text
tests/test_admin_operations.py ..............                            [ 12%]
tests/test_admin_reading_inspection.py ......                            [ 18%]
tests/test_admin_reading_inspection_hardening.py ....                    [ 21%]
tests/test_admin_reading_roi_contract.py ...                             [ 24%]
tests/test_admin_technical_reports.py ......                             [ 30%]
tests/test_auth_attendance.py .................                          [ 45%]
tests/test_map_operations.py .........                                   [ 53%]
tests/test_meter_logbook.py ...............................              [ 81%]
tests/test_reporting.py ....                                             [ 85%]
tests/test_seed_admin_demo_month.py ...                                  [ 88%]
tests/test_v16_spatial_crud.py .......                                   [ 94%]
tests/test_v16a_spatial_authority.py ....                                [ 98%]
tests/test_work_schedule.py ..                                           [100%]

====================== 110 passed, 50 warnings in 33.15s ======================
```

### Frontend Tests (`npm test -- --run`)
```text
ℹ tests 226
ℹ suites 0
ℹ pass 226
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1271.3543
```

### Production Build (`npm run build`)
```text
vite v6.4.3 building for production...
✓ 1696 modules transformed.
dist/index.html                                1.46 kB │ gzip:   0.68 kB
dist/assets/index-BYtcecWZ.css               303.57 kB │ gzip:  47.75 kB
dist/assets/index-CZT-N1LX.js                735.54 kB │ gzip: 186.14 kB
✓ built in 10.84s
```

---

## 4. Visual Equivalence & Non-Regression Invariant

Because the SQLite active seed geometry matches the canonical $1915 \times 821$ polygon coordinates from `tanThuanPresentationGeometry.v10.json`, the normal operational Map displays **exact spatial equivalence** before and after migration, satisfying the strict zero-visual-regression mandate.
