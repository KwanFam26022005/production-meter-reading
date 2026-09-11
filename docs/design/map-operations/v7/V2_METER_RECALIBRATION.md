# V2 METER & OPERATOR RECALIBRATION AUDIT
## Cảng Tân Thuận — Spatial Operations Redesign V7

**Canonical Base Map**: `tan-thuan-canonical-base.png` (Dimensions: 1915 × 821 px, Aspect Ratio: 2.3325)  
**Scene ViewBox**: `0 0 1915 821`

---

### 1. 12-Meter Recalibration Table

| Meter Code | Name | Business Zone | Presentation Region | Old x | Old y | V2 Scene (px) | New Norm x | New Norm y | V2 Physical Landmark | Inside Area? | Visual Quality | Calibration Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **CT-001** | Công tơ Trạm A | `zone-technical` | `pres-technical` | 0.4923 | 0.8115 | (1148, 686) | 0.5995 | 0.8356 | Trạm điện A / Trạm biến áp trung thế | YES (pres-technical) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-002** | Công tơ Kho B | `zone-warehouse` | `pres-container-west` | 0.1708 | 0.4596 | (507, 465) | 0.2648 | 0.5664 | Kho B (Gian kho tổng hợp phía Tây) | YES (pres-container-west) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-003** | Công tơ Cầu cảng 1 | `zone-berth` | `pres-berth` | 0.2269 | 0.2769 | (337, 376) | 0.1760 | 0.4580 | Cầu cảng 1 (Cần cẩu B.15–B.17) | YES (pres-berth) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-004** | Công tơ Cầu cảng 2 | `zone-berth` | `pres-berth` | 0.4692 | 0.2769 | (694, 370) | 0.3624 | 0.4507 | Cầu cảng 2 (Cần cẩu B.19–B.21A) | YES (pres-berth) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-005** | Công tơ Kho C | `zone-warehouse` | `pres-container-west` | 0.3062 | 0.4596 | (639, 475) | 0.3337 | 0.5786 | Kho C (Gian kho hàng rời phía Tây) | YES (pres-container-west) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-006** | Công tơ Kho D | `zone-warehouse` | `pres-cfs-east` | 0.1708 | 0.5769 | (1680, 380) | 0.8773 | 0.4629 | Kho D / Kho CFS phía Đông | YES (pres-cfs-east) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-007** | Công tơ Trạm B | `zone-technical` | `pres-technical` | 0.2038 | 0.8154 | (1068, 720) | 0.5577 | 0.8770 | Trạm điện B (Phụ trợ kỹ thuật phía Nam) | YES (pres-technical) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-008** | Công tơ Cầu cảng 3 | `zone-berth` | `pres-berth` | 0.7154 | 0.2769 | (1400, 313) | 0.7311 | 0.3812 | Cầu cảng 3 (Cần cẩu giàn B.21B–B.25A) | YES (pres-berth) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `zone-technical` | `pres-technical` | 0.6192 | 0.8115 | (1229, 681) | 0.6418 | 0.8295 | Khu kỹ thuật 1 (Trạm cân xe & xưởng cơ giới) | YES (pres-technical) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `zone-technical` | `pres-gate` | 0.6654 | 0.8115 | (1640, 560) | 0.8564 | 0.6821 | Khu kỹ thuật 2 (CỔNG CHÍNH vào cảng) | YES (pres-gate) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-011** | Công tơ Bãi Container 1 | `zone-container` | `pres-container-center` | 0.5292 | 0.5000 | (1171, 437) | 0.6115 | 0.5323 | Bãi Container 1 (CY Block A Trung tâm) | YES (pres-container-center) | EXCELLENT | **RECALIBRATION_REQUIRED** |
| **CT-012** | Công tơ Bãi Container 2 | `zone-container` | `pres-container-center` | 0.7015 | 0.5000 | (1402, 424) | 0.7321 | 0.5164 | Bãi Container 2 (CY Block B Trung tâm) | YES (pres-container-center) | EXCELLENT | **RECALIBRATION_REQUIRED** |

---

### 2. Operator Anchors Recalibration Table

| Business Zone | Presentation Region | Old Anchor | V2 Scene Anchor (px) | Normalized Anchor | Whitespace Clearance | Status |
|---|---|---|---|---|---|---|
| `zone-berth` | `pres-berth` | (800, 445) | (920, 330) | (0.4804, 0.4019) | > 200px from quayside cranes | **RECALIBRATED** |
| `zone-warehouse` | `pres-container-west` | (495, 535) | (440, 480) | (0.2298, 0.5847) | > 68px from warehouse sheds | **RECALIBRATED** |
| `zone-container` | `pres-container-center` | (1140, 525) | (1280, 440) | (0.6684, 0.5359) | > 100px from container blocks | **RECALIBRATED** |
| `zone-warehouse` | `pres-cfs-east` | N/A | (1720, 410) | (0.8982, 0.4994) | > 50px from CFS shed | **RECALIBRATED** |
| `zone-technical` | `pres-technical` | (1000, 775) | (1100, 770) | (0.5744, 0.9379) | > 59px from substation / workshop | **RECALIBRATED** |
| `zone-technical` | `pres-gate` | N/A | (1680, 590) | (0.8773, 0.7186) | > 50px from gate entrance | **RECALIBRATED** |

---

### 3. Verification Summary

- **Containment**: 12 / 12 active meters strictly verified inside their assigned operational presentation polygons.
- **Clearance**: All operator anchors maintain verified visual whitespace clearance (> 50px from nearest meter, no mutual collision).
- **Gate Clearance**: Operator anchor in technical zone maintains > 100px clearance from the gate entrance, completely resolving the prior overlap defect.
