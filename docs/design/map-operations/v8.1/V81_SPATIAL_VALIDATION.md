# V8.1 Spatial Validation & Recalibration Report

**Target Canvas**: 1915 × 821 px  
**Test Suite**: `frontend/tests/v81SpatialUi.test.ts` (82 total tests passing)  
**Execution Command**: `npm test -- --run`

---

## 1. 12 Audited Canonical Meters Recalibration Table

| Code | Name | Assigned Zone | Presentation ID | Canonical X | Canonical Y | Normalized X | Normalized Y | Nearest Physical Landmark | Status |
|---|---|---|---|---|---|---|---|---|---|
| **CT-001** | Công tơ Trạm A | `zone-technical` | `pres-technical` | 1148 | 686 | 0.5995 | 0.8356 | Trạm điện A / Trạm biến áp trung thế | **VALID** |
| **CT-002** | Công tơ Kho B | `zone-warehouse` | `pres-container-west` | 507 | 465 | 0.2648 | 0.5664 | Kho B (Gian kho tổng hợp phía Tây) | **VALID** |
| **CT-003** | Công tơ Cầu cảng 1 | `zone-berth` | `pres-berth` | 337 | 316 | 0.1760 | 0.3849 | Cầu cảng 1 (Cần cẩu B.15–B.17) | **VALID** |
| **CT-004** | Công tơ Cầu cảng 2 | `zone-berth` | `pres-berth` | 694 | 315 | 0.3624 | 0.3837 | Cầu cảng 2 (Cần cẩu B.19–B.21A) | **VALID** |
| **CT-005** | Công tơ Kho C | `zone-warehouse` | `pres-container-west` | 639 | 475 | 0.3337 | 0.5786 | Kho C (Gian kho hàng rời phía Tây) | **VALID** |
| **CT-006** | Công tơ Kho D | `zone-warehouse` | `pres-cfs-east` | 1680 | 380 | 0.8773 | 0.4629 | Kho D / Kho CFS phía Đông | **VALID** |
| **CT-007** | Công tơ Trạm B | `zone-technical` | `pres-technical` | 1068 | 720 | 0.5577 | 0.8770 | Trạm điện B (Phụ trợ kỹ thuật phía Nam) | **VALID** |
| **CT-008** | Công tơ Cầu cảng 3 | `zone-berth` | `pres-berth` | 1400 | 248 | 0.7311 | 0.3021 | Cầu cảng 3 (Cần cẩu giàn B.21B–B.25A) | **VALID** |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `zone-technical` | `pres-technical` | 1229 | 681 | 0.6418 | 0.8295 | Khu kỹ thuật 1 (Trạm cân xe & xưởng) | **VALID** |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `zone-technical` | `pres-gate` | 1640 | 560 | 0.8564 | 0.6821 | Khu kỹ thuật 2 (CỔNG CHÍNH vào cảng) | **VALID** |
| **CT-011** | Công tơ Bãi Container 1 | `zone-container` | `pres-container-center` | 1171 | 437 | 0.6115 | 0.5323 | Bãi Container 1 (CY Block A Trung tâm) | **VALID** |
| **CT-012** | Công tơ Bãi Container 2 | `zone-container` | `pres-container-center` | 1402 | 424 | 0.7321 | 0.5164 | Bãi Container 2 (CY Block B Trung tâm) | **VALID** |

### Quayside Apron Recalibration Notes:
- **CT-003**: Recalibrated from V8 y=376 to y=316 on Berth 1 quayside apron. Verified strictly inside `pres-berth`.
- **CT-004**: Recalibrated from V8 y=370 to y=315 on Berth 2 quayside apron. Verified strictly inside `pres-berth`.
- **CT-008**: Recalibrated from V8 y=313 to y=248 on Berth 3 quayside apron. Verified strictly inside `pres-berth`.
- **Total Verified Inside**: 12/12 meters (**100.0% Pass Rate**).

---

## 2. Gate Verification Summary (Section 33)

| Gate | Check Description | Result |
|---|---|---|
| **33.A** | Exactly 6 presentation zones with exact IDs | **PASS** (6/6 zones verified) |
| **33.B** | Presentation zone vertices strictly inside `[0, 1915] x [0, 821]` | **PASS** (42/42 vertices in bounds) |
| **33.C** | Normalized coordinates derived deterministically: canonical / 1915 / 821, 4 decimals | **PASS** ($\Delta < 10^{-4}$) |
| **33.D** | 100% of the 12 canonical meters pass `validateMeterSpatialAssignment()` | **PASS** (12/12 VALID) |
| **33.E** | Map / List data consistency: total count, codes, names, zone assignments match | **PASS** (Identity preserved) |
| **33.F** | Every `labelAnchorCanonical` strictly inside intended presentation zone | **PASS** (6/6 inside) |
| **33.G** | Every `operatorAnchorCanonical` strictly inside intended presentation zone | **PASS** (6/6 inside) |
| **33.H** | Camera framing produces targetZoom in `[1.15, 1.85]`, panX in `[-900, 200]`, panY in `[-400, 200]` | **PASS** |
| **33.I** | Calm-contrast tokens are defined and exported (`CALM_CONTRAST_TOKENS`) | **PASS** |
| **33.J** | Top bar height 56–64px in CSS | **PASS** (58px) |
| **33.K** | Search/filter compact floating actions: min-width >= 44px, min-height >= 44px | **PASS** (44px) |
| **33.L** | Telemetry strip unified into single container (`.sgp-telemetry-cluster`) | **PASS** |
| **Sec 39** | Tab-switch lifecycle regression test (Map $\leftrightarrow$ List 10x state invariant) | **PASS** (10/10 cycles) |
| **Sec 40** | Layout overlap test (floating controls and contextual surfaces clearance) | **PASS** |
