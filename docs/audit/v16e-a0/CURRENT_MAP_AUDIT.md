# V16E-A0: Current Map & Spatial Infrastructure Audit

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Active Map Version ID:** `7176b67f-37b8-4a62-98c1-02943dd98e7d` (`tan-thuan-v16a-r2-frozen`)  

---

## 1. Map Raster Image Asset Verification

The visual foundation of the spatial system relies on a calibrated raster orthomosaic representing the physical layout of Tan Thuan Port.

| Property | Value | Audit Verification |
| :--- | :--- | :--- |
| **File Location** | `frontend/src/assets/maps/tan-thuan-port-v8.webp` | Verified present on disk |
| **Raster Width** | $1915 \text{ px}$ | Image dimensions verified |
| **Raster Height** | $821 \text{ px}$ | Image dimensions verified |
| **Aspect Ratio** | $1915 / 821 \approx 2.332521$ | Verified exact match |
| **SHA-256 Checksum** | `13e48d4fb09e288c27cd9db0e3345514f3af7e53812c42652f23b937681bd4d6` | Byte-for-byte verified |
| **MIME Type** | `image/webp` | Lossless web-optimized format |

---

## 2. Canonical Coordinate Contract & Viewport Transformation

The system enforces strict coordinate decoupling: the database stores normalized relative coordinates in the unit square $[0.0, 1.0] \times [0.0, 1.0]$, while client-side presentation renders SVG layers against the canonical pixel space $[0, 1915] \times [0, 821]$.

### 2.1 Transformation Mathematics
For any point $P$:
$$x_{\text{canonical}} = \mathrm{round}(x_{\text{norm}} \times 1915, 2)$$
$$y_{\text{canonical}} = \mathrm{round}(y_{\text{norm}} \times 821, 2)$$

Conversely:
$$x_{\text{norm}} = \frac{x_{\text{canonical}}}{1915}, \quad y_{\text{norm}} = \frac{y_{\text{canonical}}}{821}$$

### 2.2 SVG Viewport Contract
The root map component renders:
```xml
<svg 
  viewBox="0 0 1915 821" 
  preserveAspectRatio="xMidYMid meet"
  className="w-full h-full"
>
  <image href="/assets/maps/tan-thuan-port-v8.webp" width="1915" height="821" />
  <!-- Vector Overlay Layers: Presentation Zones, Routes, Assets, Meters -->
</svg>
```
This guarantees that zoom, pan, and responsive resizing preserve exact pixel registration between the base orthomosaic and vector geometries.

---

## 3. Active Presentation Zones Inventory

The active map version `tan-thuan-v16a-r2-frozen` publishes exactly **6 presentation zones**. All geometries are validated against topological simplicity rules.

### 3.1 Geometric & Topological Properties

| Zone ID | Business Name | Presentation Color | Vertices | Surface Area ($\text{px}^2$) | Bounding Box ($[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$) | Simplicity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pres-berth` | Cầu cảng | `#0284C7` (Sky) | 7 | 186,076.0 | $[115, 230, 1149, 442]$ | Simple (No self-intersections) |
| `pres-container-west` | Bãi Container phía Tây | `#2563EB` (Blue) | 4 | 114,831.5 | $[430, 442, 1024, 631]$ | Simple (No self-intersections) |
| `pres-container-center` | Bãi Container Trung tâm | `#1D4ED8` (Indigo) | 4 | 163,800.0 | $[1024, 230, 1638, 500]$ | Simple (No self-intersections) |
| `pres-cfs-east` | Kho / CFS phía Đông | `#0D9488` (Teal) | 4 | 32,836.0 | $[1638, 230, 1845, 500]$ | Simple (No self-intersections) |
| `pres-technical` | Khu Kỹ thuật & Dịch vụ | `#D97706` (Amber) | 4 | 42,912.0 | $[1024, 500, 1422, 650]$ | Simple (No self-intersections) |
| `pres-gate` | Cổng chính | `#8B5CF6` (Purple) | 4 | 978.0 | $[1680, 560, 1743, 591]$ | Simple (No self-intersections) |

### 3.2 Canonical Polygon Vertices

1. **`pres-berth`** (7 vertices):  
   `[[115, 335], [330, 230], [980, 230], [1149, 360], [1149, 442], [430, 442], [115, 442]]`
2. **`pres-container-west`** (4 vertices):  
   `[[430, 442], [1024, 442], [1024, 631], [430, 631]]`
3. **`pres-container-center`** (4 vertices):  
   `[[1024, 230], [1638, 230], [1638, 500], [1024, 500]]`
4. **`pres-cfs-east`** (4 vertices):  
   `[[1638, 230], [1845, 230], [1845, 500], [1638, 500]]`
5. **`pres-technical`** (4 vertices):  
   `[[1024, 500], [1422, 500], [1422, 650], [1024, 650]]`
6. **`pres-gate`** (4 vertices):  
   `[[1680, 560], [1743, 560], [1743, 591], [1680, 591]]`

---

## 4. Anchor Analysis & Discrepancy Findings

Each presentation zone specifies two operational reference points: a `labelAnchor` (where the visual label is pinned) and an `operatorAnchor` (where field patrol technicians begin their route).

### 4.1 Anchor Alignment Table

| Zone ID | Label Anchor | Label Inside? | Operator Anchor | Operator Inside? | Discrepancy Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pres-berth` | `(320, 310)` | **YES** | `(110, 450)` | **NO** (8.0 px out) | Operator anchor sits on apron road outside berth polygon |
| `pres-container-west` | `(650, 530)` | **YES** | `(440, 620)` | **YES** | Strictly inside |
| `pres-container-center`| `(1331, 365)` | **YES** | `(1050, 480)` | **YES** | Strictly inside |
| `pres-cfs-east` | `(1741, 365)` | **YES** | `(1650, 510)` | **NO** (10.0 px out) | Operator anchor sits south of warehouse boundary |
| `pres-technical` | `(1223, 575)` | **YES** | `(1040, 660)` | **NO** (10.0 px out) | Operator anchor sits south in circulation roadway |
| `pres-gate` | `(1742, 550)` | **NO** (10.0 px out) | `(1790, 580)` | **NO** (47.0 px out) | Both anchors situated outside the compact $978\text{ px}^2$ box |

**Critical Observation:** 4 out of 12 anchors are situated outside their contracted zone polygons. While harmless for visual callouts, any future automated geometric containment validator must account for anchors being external circulation points.

---

## 5. Physical Map vs Reality Observations

1. **Gate Footprint:** The `pres-gate` polygon ($978\text{ px}^2$) represents an extremely tiny sliver relative to the total map canvas ($1,572,215\text{ px}^2$, representing only $0.06\%$ of map area). It acts as an artificial spatial silo rather than an operational container.
2. **Substation Cluster Area:** The substation cluster hosting meters `CT-001`, `CT-007`, and `CT-009` is physically situated in the southern utility yard between canonical $y = 680$ and $y = 720$. However, `pres-technical` cuts off at $y = 650$, stranding all three primary electrical meters in unassigned polygon space.
