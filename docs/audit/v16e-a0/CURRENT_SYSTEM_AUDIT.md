# V16E-A0: Comprehensive Current System Audit

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Database Snapshot:** `data/app.db` (SHA-256: `c6a5d864183921af3cc1bbf20865e24d9cc4ec04fd38c668d0a232fe93d723ca`)  
**Base Raster Image:** `frontend/src/assets/maps/tan-thuan-port-v8.webp` (SHA-256: `13e48d4fb09e288c27cd9db0e3345514f3af7e53812c42652f23b937681bd4d6`)  
**Active Map Version ID:** `7176b67f-37b8-4a62-98c1-02943dd98e7d` (`tan-thuan-v16a-r2-frozen`)  

---

## 1. Executive Summary & Inventory Totals

This document establishes the official frozen, evidence-based read-only snapshot of the Tan Thuan Port Meter Reading, Asset Management, and Utility Topology System prior to any visual redesign, zone removal, meter repositioning, or network graph reconstruction in V16E.

### 1.1 High-Level Inventory Metrics

| Entity Category | Total Count | Verified | Unverified | Notes / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Presentation Zones** | 6 | 6 | 0 | Frozen in `tan-thuan-v16a-r2-frozen`. Includes `pres-gate`. |
| **Operational Zones** | 4 | 4 | 0 | `zone-berth`, `zone-warehouse`, `zone-container`, `zone-technical`. |
| **Meters** | 12 | 7 (Spatial Valid) | 5 (Spatial Mismatch) | All 12 ACTIVE; 2,801 total historical readings. |
| **Assets** | 364 | 105 | 259 | 30 have spatial positions; 334 have NULL coordinates. |
| **Meter ↔ Asset Relations** | 90 | 36 | 54 | 64 `INSTALLED_AT`, 26 `MEASURES`. High test concentration on CT-001/CT-002. |
| **Asset Connections (Edges)** | 102 | 80 | 22 | 95 Electricity, 7 Water. |
| **Electricity Graph Nodes** | 127 connected | 73 verified edges | 22 unverified edges | 14 directed feedback cycles detected. |
| **Water Graph Nodes** | 14 connected | 7 verified edges | 0 unverified edges | Strictly tree / DAG (0 cycles). |

---

## 2. Spatial Infrastructure Baseline

### 2.1 Canonical Coordinate System Contract
- **Contract Name:** `tan-thuan-canonical-image-pixel-space-v1`
- **Raster Resolution:** $1915 \times 821 \text{ px}$ (Aspect Ratio: $1915 / 821 \approx 2.3325$)
- **SVG Viewport:** `<svg viewBox="0 0 1915 821" preserveAspectRatio="xMidYMid meet">`
- **Normalized Mapping:**
  $$x_{\text{canonical}} = x_{\text{norm}} \times 1915, \quad y_{\text{canonical}} = y_{\text{norm}} \times 821$$

### 2.2 Active Presentation Zones

| Zone ID | Display Label | Canonical Area ($\text{px}^2$) | Vertices | Bounding Box ($[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$) | Meters Inside |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pres-berth` | Cầu cảng | 186,076.0 | 7 | $[115, 230, 1149, 442]$ | CT-003, CT-004 |
| `pres-container-west` | Bãi Container phía Tây | 114,831.5 | 4 | $[430, 442, 1024, 631]$ | CT-002, CT-005 |
| `pres-container-center` | Bãi Container Trung tâm | 163,800.0 | 4 | $[1024, 230, 1638, 500]$ | CT-008, CT-011, CT-012 |
| `pres-cfs-east` | Kho / CFS phía Đông | 32,836.0 | 4 | $[1638, 230, 1845, 500]$ | CT-006 |
| `pres-technical` | Khu Kỹ thuật & Dịch vụ | 42,912.0 | 4 | $[1024, 500, 1422, 650]$ | *(None)* |
| `pres-gate` | Cổng chính | 978.0 | 4 | $[1680, 560, 1743, 591]$ | *(None)* |

---

## 3. Meter Inventory & Spatial Validation Summary

All 12 meters (`CT-001` through `CT-012`) are stored in `meters`. Every meter is in `ACTIVE` lifecycle status with extensive reading records (229 to 249 readings per meter).

### Spatial Alignment Findings:
- **7 Meters VALID (Inside Assigned Presentation Zone):**
  - `CT-002`: `(507.09, 465.01)` $\in$ `pres-container-west`
  - `CT-003`: `(337.04, 316.00)` $\in$ `pres-berth`
  - `CT-004`: `(694.00, 315.02)` $\in$ `pres-berth`
  - `CT-005`: `(639.04, 475.03)` $\in$ `pres-container-west`
  - `CT-006`: `(1680.03, 380.04)` $\in$ `pres-cfs-east`
  - `CT-011`: `(1171.02, 437.02)` $\in$ `pres-container-center`
  - `CT-012`: `(1401.97, 423.96)` $\in$ `pres-container-center`

- **5 Meters REVIEW_REQUIRED (Spatial Discrepancies):**
  1. `CT-001` (Công tơ Trạm A): Assigned `pres-technical`, coordinates `(1148.04, 686.03)` fall **outside all zones** (30.67 px south of `pres-technical` polygon boundary).
  2. `CT-007` (Công tơ Trạm B): Assigned `pres-technical`, coordinates `(1068.00, 720.02)` fall **outside all zones** (51.65 px south of `pres-technical`).
  3. `CT-008` (Công tơ Cầu cảng 3): Assigned `pres-berth`, coordinates `(1400.06, 248.02)` fall geographically inside `pres-container-center` (mismatch between assigned berth zone and physical yard coordinates).
  4. `CT-009` (Công tơ Khu kỹ thuật 1): Assigned `pres-technical`, coordinates `(1229.05, 681.02)` fall **outside all zones** (40.23 px south of `pres-technical`).
  5. `CT-010` (Công tơ Khu kỹ thuật 2): Assigned `pres-gate`, coordinates `(1640.01, 560.00)` fall **outside all zones** (nearest to `pres-technical` at 43.58 px distance; 40.0 px west of `pres-gate`).

---

## 4. Asset Inventory & Verification Baseline

- **Total Assets:** 364 records in `assets`.
- **Verification Status:**
  - `VERIFIED`: 105 assets (28.8%)
  - `UNVERIFIED`: 259 assets (71.2%)
- **Spatial Positioning:**
  - Assets with coordinates: 30 assets (all in `pres-container-west` and `pres-container-center`).
  - Assets with `NULL` coordinates: 334 assets (91.8%).
- **Asset Mobility:**
  - `FIXED`: 334 assets.
  - `MOBILE`: 30 assets (RTGs, Reach Stackers).

---

## 5. Meter ↔ Asset Relationship Baseline

- **Total Active Relations:** 90 records in `meter_asset_relations`.
- **Breakdown by Relation Type:**
  - `INSTALLED_AT`: 64 relations.
  - `MEASURES`: 26 relations.
- **Verification Status:**
  - `VERIFIED`: 36 relations.
  - `UNVERIFIED`: 54 relations.
- **Anomalous Test Concentrations:**
  - `CT-001` has **57 relations** (42 `INSTALLED_AT`, 15 `MEASURES`), resulting from automated batch test ingestion.
  - `CT-002` has **23 relations** (22 `INSTALLED_AT`, 1 `MEASURES`).
  - `CT-003` through `CT-012` each have **0 `INSTALLED_AT`** and **1 `MEASURES`** relation (`AST-CAND-003` to `AST-CAND-012`).

---

## 6. Utility Network Topology Baseline

### 6.1 Electricity Topology
- **Total Edges:** 95
  - Verified: 73 (76.8%)
  - Unverified: 22 (23.2%)
- **Nodes Involved:** 127 assets (237 assets isolated / unlinked to electricity).
- **Directed Graph Cycles:** **14 feedback cycles detected**.
  - Example: `AST-TOPO-SUB-4d8a` $\rightarrow$ `AST-TOPO-SW-ac46` $\rightarrow$ `AST-TOPO-CR-895f` $\rightarrow$ `AST-TOPO-SUB-4d8a`.
  - Cause: Test scripts linked cranes back to substations or generated symmetric supply edges without directional validation.

### 6.2 Water Topology
- **Total Edges:** 7
  - Verified: 7 (100.0%)
  - Unverified: 0
- **Nodes Involved:** 14 assets (350 assets isolated).
- **Graph Topology:** Strictly acyclic tree rooted at water intake/pumping station. No cycles detected.

---

## 7. Reading History & Data Lock Analysis

- **Total Meter Readings:** 2,801 rows in `meter_readings`.
- **Date Range:** August 1, 2026 01:00 UTC to August 29, 2026 03:59 UTC.
- **Critical Foreign Key Integrity Rule:**
  - **Zero meters are safe to delete (`safeToDelete: NO`).**
  - Any removal of `CT-001` through `CT-012` would trigger cascade deletion or RESTRICT violation on reading rounds, audit logs, and OCR training samples.
  - Lifecycle management must be restricted to `RETIRED` state or spatial relocation.
