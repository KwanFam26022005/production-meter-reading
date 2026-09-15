# V16A-R2: Meter, Anchor & Landmark Spatial Reconciliation Report

## 1. Scope and Mission

This document captures the complete spatial audit of all entities against the frozen human-calibrated geometry of Tan Thuan Port (`tan-thuan-v16a-r2-frozen`).

All measurements follow the canonical contract:
- Coordinate space: `tan-thuan-canonical-image-pixel-space-v1`
- Canonical bounds: `1915 × 821` pixels

---

## 2. Meter Spatial Containment Audit

| Meter Code | Presentation Zone | Business Zone | Canonical Position (X, Y) | Normalized (x, y) | In Polygon? | Review Status | Notes |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| `CT-001` | `pres-technical` | `zone-technical` | (1148.0, 686.0) | (0.5995, 0.8356) | ❌ OUT | `REVIEW_REQUIRED` | Outside southern technical boundary; electrical sub-station feeder |
| `CT-002` | `pres-container-west` | `zone-warehouse` | (507.1, 465.0) | (0.2648, 0.5664) | ✅ IN | `VALID` | Fully contained in West Yard |
| `CT-003` | `pres-berth` | `zone-berth` | (337.0, 316.0) | (0.1760, 0.3849) | ✅ IN | `VALID` | Fully contained in Berth 1 |
| `CT-004` | `pres-berth` | `zone-berth` | (694.0, 315.0) | (0.3624, 0.3837) | ✅ IN | `VALID` | Fully contained in Berth 2 |
| `CT-005` | `pres-container-west` | `zone-warehouse` | (639.0, 475.0) | (0.3337, 0.5786) | ✅ IN | `VALID` | Fully contained in West Yard |
| `CT-006` | `pres-cfs-east` | `zone-warehouse` | (1680.0, 380.0) | (0.8773, 0.4629) | ✅ IN | `VALID` | Fully contained in East CFS Warehouse |
| `CT-007` | `pres-technical` | `zone-technical` | (1068.0, 720.0) | (0.5577, 0.8770) | ❌ OUT | `REVIEW_REQUIRED` | Mechanical workshop auxiliary meter; south of workshop polygon |
| `CT-008` | `pres-berth` | `zone-berth` | (1400.1, 248.0) | (0.7311, 0.3021) | ❌ OUT | `REVIEW_REQUIRED` | Berth 3 crane junction meter; quay polygon cut-out |
| `CT-009` | `pres-technical` | `zone-technical` | (1229.0, 681.0) | (0.6418, 0.8295) | ❌ OUT | `REVIEW_REQUIRED` | South perimeter power hub |
| `CT-010` | `pres-gate` | `zone-technical` | (1640.0, 560.0) | (0.8564, 0.6821) | ❌ OUT | `REVIEW_REQUIRED` | Main gate security weighbridge meter; gate zone is compact |
| `CT-011` | `pres-container-center` | `zone-container` | (1171.0, 437.0) | (0.6115, 0.5323) | ✅ IN | `VALID` | Fully contained in Center Container Yard |
| `CT-012` | `pres-container-center` | `zone-container` | (1402.0, 424.0) | (0.7321, 0.5164) | ✅ IN | `VALID` | Fully contained in Center Container Yard |

### Summary
- **Total Meters**: 12
- **Contained in Assigned Zone**: 7 (58.3%)
- **Outside Assigned Zone**: 5 (41.7%)
- **Meter Coordinates Mutated**: **0** (Strictly invariant)
- **Meter Zone Assignments Mutated**: **0** (Strictly invariant)

---

## 3. Anchor Reconciliation

| Zone ID | Display Label | Label Anchor | Label Status | Operator Anchor | Operator Status |
|:---|:---|:---:|:---:|:---:|:---:|
| `pres-berth` | Cầu cảng | (930, 302) | `REVIEW_REQUIRED` | (1030, 285) | `REVIEW_REQUIRED` |
| `pres-container-west` | Bãi container phía Tây | (410, 480) | `VALID` | (525, 515) | `VALID` |
| `pres-container-center` | Bãi container trung tâm | (1090, 438) | `VALID` | (1278, 455) | `VALID` |
| `pres-cfs-east` | Kho / CFS phía Đông | (1750, 335) | `VALID` | (1838, 445) | `REVIEW_REQUIRED` |
| `pres-technical` | Khu kỹ thuật / Dịch vụ | (1145, 575) | `VALID` | (1100, 740) | `REVIEW_REQUIRED` |
| `pres-gate` | Cổng chính | (1742, 550) | `REVIEW_REQUIRED` | (1790, 580) | `REVIEW_REQUIRED` |

- **Total Anchors**: 12
- **Inside Polygon**: 6 (50%)
- **Outside Polygon**: 6 (50%) — non-blocking warnings, retained per human intent.

---

## 4. Landmark Reconciliation Audit

- **Total Spatial Landmarks Audited**: 49
- **Coordinate Integrity**: 49/49 finite numbers, strictly bounded in `[0, 1915] × [0, 821]`.
- **ID Uniqueness**: 49 unique IDs, 0 duplicates.
- **Topological Invariant**: Landmarks situated along roads, security fences, and yard boundaries remain unaltered.

---

## 5. Calibration Action Cleanup — Audit

The calibration interface features several administrative actions. Below is the operational semantic audit:

| Control Label | Current Behavioral Semantics | Backend Endpoint / Storage Mechanism | Recommendation for Future Cleanup |
|:---|:---|:---|:---|
| **Xuất bản bản đồ** | Validates draft with `validate_map_version_geometry`; if valid, atomically transitions draft to `PUBLISHED` and archives former active version. | `POST /api/v1/admin/map-versions/{id}/publish` | Primary administrative publication action. Retain as primary. |
| **Lưu máy chủ** | Persists current edited in-memory geometry to the backend draft version via optimistic concurrency. | `PATCH /api/v1/admin/map-versions/{id}/zones/{zoneId}` | Essential draft persistence control. Retain as secondary action. |
| **Kiểm tra** | Runs non-mutating validation check on server draft and returns error/warning summary. | `GET /api/v1/admin/map-versions/{id}/validate` | Useful pre-flight check. Retain. |
| **Áp dụng geometry** | Updates local React workspace state from current vertex input without writing to server. | In-memory React state | Clarify copy in future: "Áp dụng vào bản nháp cục bộ". |
| **Lưu bản nháp** | Legacy fallback persistence to `localStorage`. | `localStorage['tan-thuan-map-calibration-draft:v10']` | Candidate for deprecation in V17 once server draft workflow is fully adopted. |
| **Khôi phục** | Reloads geometry from server active baseline, discarding unsaved modifications. | `GET /api/v1/map-config/active` | Essential undo/reset control. Retain. |
| **Nhập JSON** | Reads user-provided geometry manifest file and replaces current draft vertices. | Browser FileReader | Retain for disaster recovery and offline editing. |
| **Xuất JSON** | Downloads deterministic geometry JSON file with timestamp. | Browser file download | Retain for audit evidence and offline backups. |

---

## 6. Saigon Port UI Motion Token Compliance

In accordance with Section 29:
- **Continuous Pulse Removal**: The previous indefinite SVG `<animate>` pulse (1.5s loop) has been completely removed.
- **Static Amber Ring**: Uncontained meters display a clean, static `#F59E0B` outline.
- **One-Shot Emphasis**: When the operator toggles "Xem công tơ cần đối soát", a 220ms (<= 240ms) single-shot ease-out transition expands the ring, followed by static persistence.
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` disables the transition entirely.
