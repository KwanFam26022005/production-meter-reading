# 02 — JSON Schema and Geometry Validation Report

## Executive Summary
This document provides full structural and spatial validation of the user-edited geometry manifest (`tan_thuan_1_zones_edited (1).json`). Every geometric feature (7 polygons, 6 polylines, 2 markers) has been validated against topological invariants, edge integrity, and coordinate precision.

---

## 1. Schema Invariants
- **Schema ID**: `port-zoning-image-pixels/v1`
- **Coordinate System**: `image-pixels`
- **Origin**: `top-left` (0, 0)
- **Extents**: `width = 1536`, `height = 1024`
- **Validation Result**: **100% PASS**

---

## 2. Polygons Validation (7 Features)

All 7 polygons have valid non-negative edge indices, finite pixel coordinates within $[0, 1536] \times [0, 1024]$, and valid styling attributes:

| # | Entity ID | Category | Label | Parent ID | Vertices | Edges | Fill Color / Opacity | Stroke Color / Width |
| :-: | :--- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 1 | `ZONE_QUAY` | `operational_zone` | Khu cảng sà lan | `null` | 28 | 28 | `#3D8DD1` (0.15) | `#1A75B5` (2px) |
| 2 | `ZONE_GENERAL` | `operational_zone` | Bãi tổng hợp | `null` | 21 | 21 | `#E6BA69` (0.15) | `#B38A42` (2px) |
| 3 | `ZONE_CONTAINER` | `operational_zone` | Bãi container | `null` | 24 | 24 | `#D7838C` (0.15) | `#B45864` (2px) |
| 4 | `BLDG_KHO_1` | `warehouse` | Kho 1 | `ZONE_GENERAL` | 4 | 4 | `#E8CE7E` (0.15) | `#C5A348` (2px) |
| 5 | `BLDG_KHO_2` | `warehouse` | Kho 2 | `ZONE_GENERAL` | 4 | 4 | `#E8CE7E` (0.15) | `#C5A348` (2px) |
| 6 | `BLDG_KHO_4` | `warehouse` | Kho 4 | `null` | 4 | 4 | `#E8CE7E` (0.15) | `#C5A348` (2px) |
| 7 | `ZONE_ADMIN` | `administration` | Văn phòng hành chính | `null` | 5 | 5 | `#6DB69B` (0.15) | `#31866B` (2px) |

### Parent-Child Hierarchy Invariants
- `BLDG_KHO_1` and `BLDG_KHO_2` correctly declare `parent_id: "ZONE_GENERAL"`.
- `BLDG_KHO_4` correctly declares `parent_id: null` (isolated warehouse, not reassigned).
- `ZONE_ADMIN` correctly declares `parent_id: null` (not reassigned to general yard).

---

## 3. Polylines Validation (6 Features)

| # | Entity ID | Category | Label | Closed | Vertices | Stroke Color | Stroke Width | Stroke Dash |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- | :-: | :--- |
| 1 | `PORT_BOUNDARY` | `boundary` | Ranh giới cảng | **true** | 36 | `#D95456` | 2px | `[9, 5]` |
| 2 | `DIVIDER_QUAY_BACKLAND` | `zone_separator` | Ranh giới khu sà lan / hậu phương cảng | **false** | 12 | `#4C8DBB` | 2px | Solid |
| 3 | `DIVIDER_GENERAL_CONTAINER` | `zone_separator` | Ranh giới bãi tổng hợp / bãi container | **false** | 4 | `#7F8790` | 2px | `[5, 4]` |
| 4 | `ROAD_BACKLAND` | `road_centerline` | Tuyến giao thông phân tách cầu cảng và hậu phương | **false** | 11 | `#687784` | 2px | `[5, 5]` |
| 5 | `ROAD_CENTRAL_ACCESS` | `road_centerline` | Trục giao thông trung tâm ra vào cảng | **false** | 6 | `#687784` | 2px | `[5, 5]` |
| 6 | `ROAD_EAST_ACCESS` | `road_centerline` | Trục giao thông kết nối bãi phía Đông | **false** | 6 | `#687784` | 2px | `[5, 5]` |

### Controlled Geometry Inspection: ROAD_BACKLAND Inflection Notice
In `ROAD_BACKLAND`, the vertex sequence at indices 3, 4, and 5 exhibits an inflection along the X-axis:
- Vertex index 3: `[382, 574]`
- Vertex index 4: `[356, 577]` ($x$ decreases by 26 px, moving leftward)
- Vertex index 5: `[540, 581]` ($x$ increases by 184 px, resuming eastward route)

**Compliance Action**: Per specifications, this inflection is preserved verbatim without any silent smoothing, truncation, or synthetic spline interpolation. It is clearly surfaced to operators in the Map V2 Inspection Panel.

---

## 4. Gate Markers Validation (2 Features)

| # | Entity ID | Label | Category | Pixel Point $[X, Y]$ | Normalized Point $[n_x, n_y]$ |
| :-: | :--- | :--- | :--- | :-: | :-: |
| 1 | `GATE_A` | Cổng A | `gate` | `[1450, 569]` | `[0.94401, 0.555664]` |
| 2 | `GATE_B` | Cổng B | `gate` | `[874, 725]` | `[0.56901, 0.708008]` |

---

## 5. Coordinate Precision & Roundtrip Verification

All 167 vertices across polygons, polylines, and markers were audited for mathematical equivalence between pixel coordinates $[x, y]$ and normalized coordinates $[n_x, n_y]$:

$$\Delta_x = \left| n_x - \frac{x}{1536} \right|, \quad \Delta_y = \left| n_y - \frac{y}{1024} \right|$$

**Result**: Across all 167 points, $\max(\Delta_x, \Delta_y) \le 1.0 \times 10^{-6}$.
Zero points exceed floating-point rounding tolerance.
