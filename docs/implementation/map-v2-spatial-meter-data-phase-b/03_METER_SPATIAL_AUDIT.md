# 03 — Meter Spatial Data Audit Results

**Tooling Used:** `scripts/audit_meter_spatial_data.py`  
**Execution Timestamp:** 2026-09-23  
**Canonical Map Reference:** `tan_thuan_1_zones_edited.json` (1536 × 1024 px)  
**Database File:** `data/app.db`  

---

## 1. High-Level Summary Statistics

| Metric | Measured Value | Percentage | Evaluation |
| :--- | :---: | :---: | :--- |
| **Total Meters Audited** | **24** | 100.0% | Complete inventory captured |
| **Duplicate Meter Codes** | **0** | 0.0% | Clean uniqueness constraint |
| **Spatial State: VALID** | **24** | 100.0% | Finite numbers inside $[0, 1536] \times [0, 1024]$ |
| **Spatial State: MISSING** | **0** | 0.0% | Zero null coordinate pairs |
| **Spatial State: ZERO_ZERO** | **0** | 0.0% | Zero fallback noise $(0, 0)$ |
| **Spatial State: NON_FINITE** | **0** | 0.0% | Zero NaN or Infinite values |
| **Spatial State: OUT_OF_CANVAS** | **0** | 0.0% | Zero out-of-bounds coordinates |
| **Coordinate Representation: NORMALIZED** | **24** | 100.0% | All coordinates stored as Map V1 normalized values |
| **Coordinate Representation: CANVAS_PIXELS** | **0** | 0.0% | Zero native 1536x1024 pixel coordinates in SQLite |

---

## 2. Point-in-Polygon (PIP) Zone Containment Audit

Every meter was evaluated via ray-casting against the 7 canonical polygons of `tan_thuan_1_zones_edited.json`:
- `ZONE_QUAY` (Khu cảng sà lan)
- `ZONE_GENERAL` (Bãi tổng hợp)
- `ZONE_CONTAINER` (Bãi container)
- `BLDG_KHO_1` (Kho 1)
- `BLDG_KHO_2` (Kho 2)
- `BLDG_KHO_4` (Kho 4)
- `ZONE_ADMIN` (Văn phòng hành chính)

| Containment Status | Count | Percentage | Operational Meaning |
| :--- | :---: | :---: | :--- |
| **INSIDE_ASSIGNED_ZONE** | **3** | **12.5%** | Coordinate falls inside designated Map V2 polygon |
| **OUTSIDE_ASSIGNED_ZONE** | **21** | **87.5%** | Coordinate falls outside designated polygon due to Map V1 geometry distortion |
| **ZONE_UNMAPPED** | **0** | **0.0%** | All meters have business or presentation zone mappings |
| **NO_COORDINATES** | **0** | **0.0%** | Zero missing coordinates |

---

## 3. Detailed Meter Inventory Audit Table

| Meter Code | Name | DB `map_x`, `map_y` | Canvas Pixels $(X, Y)$ | Assigned Zone | Actual Zone on Map V2 | Containment Status | Status & Origin |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `CT-001` | Công tơ Trạm A | `(0.5995, 0.8356)` | `(920.8, 855.7)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-002` | Công tơ Kho B | `(0.2648, 0.5664)` | `(406.7, 580.0)` | `pres-container-west` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-003` | Công tơ Cầu cảng 1 | `(0.1760, 0.3849)` | `(270.3, 394.1)` | `pres-berth` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-004` | Công tơ Cầu cảng 2 | `(0.3624, 0.3837)` | `(556.6, 392.9)` | `pres-berth` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-005` | Công tơ Kho C | `(0.3337, 0.5786)` | `(512.6, 592.5)` | `pres-container-west` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-006` | Công tơ Kho D | `(0.8773, 0.4629)` | `(1347.5, 474.0)` | `pres-cfs-east` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-007` | Công tơ Trạm B | `(0.5577, 0.8770)` | `(856.6, 898.0)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-008` | Công tơ Cầu cảng 3 | `(0.7311, 0.3021)` | `(1123.0, 309.4)` | `pres-berth` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-009` | Công tơ Khu kỹ thuật 1 | `(0.6418, 0.8295)` | `(985.8, 849.4)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-010` | Công tơ Khu kỹ thuật 2 | `(0.8564, 0.6821)` | `(1315.4, 698.5)` | `pres-gate` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-011` | Công tơ Bãi Container 1 | `(0.6115, 0.5323)` | `(939.3, 545.1)` | `pres-container-center` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `CT-012` | Công tơ Bãi Container 2 | `(0.7321, 0.5164)` | `(1124.5, 528.8)` | `pres-container-center` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | RETIRED / LEGACY |
| `SIM-EM-001` | Công tơ tổng MDB-01 | `(0.7258, 0.6760)` | `(1114.8, 692.2)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-002` | Công tơ xuất tuyến Cầu cảng | `(0.4674, 0.3654)` | `(717.9, 374.2)` | `pres-berth` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-003` | Công tơ xuất tuyến Bãi Tây | `(0.3943, 0.5542)` | `(605.6, 567.5)` | `pres-container-west` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-004` | Công tơ xuất tuyến Bãi TT | `(0.5979, 0.5786)` | `(918.4, 592.5)` | `pres-container-center` | `BLDG_KHO_4` | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-005` | Công tơ xuất tuyến Kho CFS | `(0.8695, 0.4446)` | `(1335.6, 455.3)` | `pres-cfs-east` | `ZONE_CONTAINER` | **`INSIDE_ASSIGNED_ZONE`** | ACTIVE / SIMULATED |
| `SIM-EM-006` | Công tơ phụ tải Xưởng Cơ điện | `(0.6997, 0.7004)` | `(1074.7, 717.2)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-007` | Công tơ nhánh Cẩu RTG-W01 | `(0.2454, 0.5786)` | `(376.9, 592.5)` | `pres-container-west` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-EM-008` | Công tơ Giàn lạnh Container | `(0.7285, 0.4811)` | `(1119.0, 492.6)` | `pres-container-center` | `ZONE_CONTAINER` | **`INSIDE_ASSIGNED_ZONE`** | ACTIVE / SIMULATED |
| `SIM-WM-001` | Đồng hồ nước tổng Cổng Cảng | `(0.7363, 0.6882)` | `(1131.0, 704.7)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-WM-002` | Đồng hồ nước cấp Cầu tàu | `(0.5901, 0.4263)` | `(906.4, 436.5)` | `pres-berth` | `ZONE_CONTAINER` | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |
| `SIM-WM-003` | Đồng hồ nước sinh hoạt Kho CFS | `(0.8668, 0.4080)` | `(1331.4, 417.8)` | `pres-cfs-east` | `ZONE_CONTAINER` | **`INSIDE_ASSIGNED_ZONE`** | ACTIVE / SIMULATED |
| `SIM-WM-004` | Đồng hồ cấp nước Cứu hỏa | `(0.7389, 0.6395)` | `(1135.0, 654.8)` | `pres-technical` | *None (road/water)* | `OUTSIDE_ASSIGNED_ZONE` | ACTIVE / SIMULATED |

---

## 4. Key Takeaways & Recommendations

1. **100% of meters currently have valid normalized values technically**, but **87.5% fail point-in-polygon assignment** on Map V2 due to Map V1 geometry inheritance.
2. The 3 coincidentally inside meters (`SIM-EM-005`, `SIM-EM-008`, `SIM-WM-003`) land inside `ZONE_CONTAINER` because of the sheer breadth of that polygon, not because of authentic calibration.
3. Therefore, **re-mapping using an auditable seed manifest is strictly necessary** before real meters can be credibly positioned on Map V2.
