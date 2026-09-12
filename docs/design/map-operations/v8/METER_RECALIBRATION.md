# V8 Meter Spatial Recalibration Audit — Cảng Tân Thuận

## 100% Verification Gate

All 12 production meters have been audited against the recalibrated presentation polygons using ray-casting point-in-polygon validation:

| Meter Code | Meter Name | Business Zone | Presentation Zone | Canonical (X, Y) | Normalized (X, Y) | Validation Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **CT-001** | Công tơ Trạm A | `zone-technical` | `pres-technical` | (1148, 686) | (0.5995, 0.8356) | **VALID** |
| **CT-002** | Công tơ Kho B | `zone-warehouse` | `pres-container-west` | (507, 465) | (0.2648, 0.5664) | **VALID** |
| **CT-003** | Công tơ Cầu cảng 1 | `zone-berth` | `pres-berth` | (337, 376) | (0.1760, 0.4580) | **VALID** |
| **CT-004** | Công tơ Cầu cảng 2 | `zone-berth` | `pres-berth` | (694, 370) | (0.3624, 0.4507) | **VALID** |
| **CT-005** | Công tơ Kho C | `zone-warehouse` | `pres-container-west` | (639, 475) | (0.3337, 0.5786) | **VALID** |
| **CT-006** | Công tơ Kho D | `zone-warehouse` | `pres-cfs-east` | (1680, 380) | (0.8773, 0.4629) | **VALID** |
| **CT-007** | Công tơ Trạm B | `zone-technical` | `pres-technical` | (1068, 720) | (0.5577, 0.8770) | **VALID** |
| **CT-008** | Công tơ Cầu cảng 3 | `zone-berth` | `pres-berth` | (1400, 313) | (0.7311, 0.3812) | **VALID** |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `zone-technical` | `pres-technical` | (1229, 681) | (0.6418, 0.8295) | **VALID** |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `zone-technical` | `pres-gate` | (1640, 560) | (0.8564, 0.6821) | **VALID** |
| **CT-011** | Công tơ Bãi Container 1 | `zone-container` | `pres-container-center` | (1171, 437) | (0.6115, 0.5323) | **VALID** |
| **CT-012** | Công tơ Bãi Container 2 | `zone-container` | `pres-container-center` | (1402, 424) | (0.7321, 0.5164) | **VALID** |

## Invariant Enforcement

If any meter coordinate fails polygon containment, the system classifies it as:
`INVALID_SPATIAL_ASSIGNMENT`
The validation service is exported via `validateMeterSpatialAssignment()` in `frontend/src/features/map-operations/geometry/meterRecalibration.ts`.
