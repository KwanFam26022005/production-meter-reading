# V8.1 Tan Thuan Presentation Geometry Specification

**Canonical Map Dimensions**: 1915 × 821 px  
**Coordinate System**: `tan-thuan-canonical-image-pixel-space-v1`  
**Base Map Asset**: `tan-thuan-canonical-base.png` (SHA256: `38f3ae3c98bf7732242780381bf1124a394f4479b623c31e48082bfa19e35b61`)  
**Visual Reference**: `docs/design/map-operations/reference/tan-thuan-approved-zoning.png`  
**Implementation Source**: `frontend/src/features/map-operations/geometry/tanThuanPresentationGeometryV81.ts`

---

## 1. Executive Summary

The V8.1 spatial update establishes the authoritative presentation geometry for the six visual zones at Cảng Tân Thuận. In previous iterations, visual zone geometries diverged from the approved reference zoning boundaries, particularly along the river quay apron where Berth 1–3 meters landed in container yards.

V8.1 locks:
1. Exact six presentation zones matching `tan-thuan-approved-zoning.png`.
2. Clean physical delineation between river quayside aprons (Zone 1) and container yards (Zone 2 & Zone 3).
3. Derived deterministic normalized coordinates `[0.0, 1.0]` rounded to 4 decimal places.
4. 100% containment of all 12 operational meters within verified physical landmarks.
5. Deterministic placement of label anchors and operator anchors strictly inside zone boundaries.

---

## 2. Six Approved Presentation Zones

| Zone ID | Index | Vietnamese Label | English Sub-label | Business Zone | Accent Color | Vertices |
|---|---|---|---|---|---|---|
| `pres-berth` | 1 | Cầu cảng | BERTH / QUAY | `zone-berth` | `#0284C7` | 10 |
| `pres-container-west` | 2 | Bãi container phía Tây | WEST CONTAINER YARD | `zone-warehouse` | `#EA580C` | 6 |
| `pres-container-center` | 3 | Bãi container trung tâm | CENTRAL CONTAINER YARD | `zone-container` | `#E11D48` | 5 |
| `pres-cfs-east` | 4 | Kho / CFS phía Đông | EAST CFS / WAREHOUSE | `zone-warehouse` | `#EAB308` | 6 |
| `pres-technical` | 5 | Khu kỹ thuật / Dịch vụ | TECHNICAL / SERVICE AREA | `zone-technical` | `#10B981` | 7 |
| `pres-gate` | 6 | Cổng chính | MAIN GATE & WEIGH STATION | `zone-technical` | `#8B5CF6` | 8 |

---

## 3. Vertex Specification (Canonical 1915 × 821)

### Zone 1: `pres-berth` (Cầu cảng)
- **Business Zone**: `zone-berth`
- **Label Anchor**: `(930, 302)`
- **Operator Anchor**: `(1030, 285)` (Calibrated strictly within narrow quayside apron)
- **Centroid**: `(1042, 247)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 192,  "y": 294 },
    { "x": 611,  "y": 310 },
    { "x": 698,  "y": 284 },
    { "x": 1481, "y": 220 },
    { "x": 1749, "y": 139 },
    { "x": 1915, "y": 56  },
    { "x": 1759, "y": 198 },
    { "x": 1490, "y": 267 },
    { "x": 671,  "y": 344 },
    { "x": 192,  "y": 338 }
  ]
  ```

### Zone 2: `pres-container-west` (Bãi container phía Tây)
- **Business Zone**: `zone-warehouse`
- **Label Anchor**: `(410, 480)`
- **Operator Anchor**: `(525, 515)`
- **Centroid**: `(440, 469)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 27,  "y": 315 },
    { "x": 9,   "y": 467 },
    { "x": 134, "y": 537 },
    { "x": 661, "y": 564 },
    { "x": 818, "y": 548 },
    { "x": 818, "y": 327 }
  ]
  ```

### Zone 3: `pres-container-center` (Bãi container trung tâm)
- **Business Zone**: `zone-container`
- **Label Anchor**: `(1090, 438)`
- **Operator Anchor**: `(1278, 455)`
- **Centroid**: `(1234, 408)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 819,  "y": 328 },
    { "x": 1480, "y": 234 },
    { "x": 1555, "y": 428 },
    { "x": 1546, "y": 509 },
    { "x": 836,  "y": 521 }
  ]
  ```

### Zone 4: `pres-cfs-east` (Kho / CFS phía Đông)
- **Business Zone**: `zone-warehouse`
- **Label Anchor**: `(1750, 335)`
- **Operator Anchor**: `(1838, 445)` (Calibrated strictly within CFS East polygon)
- **Centroid**: `(1738, 338)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 1517, "y": 226 },
    { "x": 1706, "y": 151 },
    { "x": 1904, "y": 207 },
    { "x": 1915, "y": 415 },
    { "x": 1791, "y": 487 },
    { "x": 1599, "y": 489 }
  ]
  ```

### Zone 5: `pres-technical` (Khu kỹ thuật / Dịch vụ)
- **Business Zone**: `zone-technical`
- **Label Anchor**: `(1145, 575)`
- **Operator Anchor**: `(1100, 740)`
- **Centroid**: `(1191, 626)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 812,  "y": 586 },
    { "x": 1508, "y": 453 },
    { "x": 1542, "y": 557 },
    { "x": 1474, "y": 621 },
    { "x": 1320, "y": 763 },
    { "x": 951,  "y": 768 },
    { "x": 939,  "y": 656 }
  ]
  ```

### Zone 6: `pres-gate` (Cổng chính)
- **Business Zone**: `zone-technical`
- **Label Anchor**: `(1742, 550)`
- **Operator Anchor**: `(1790, 580)` (Calibrated strictly within Main Gate polygon)
- **Centroid**: `(1694, 545)`
- **Polygon Canonical Vertices**:
  ```json
  [
    { "x": 1508, "y": 453 },
    { "x": 1597, "y": 489 },
    { "x": 1791, "y": 488 },
    { "x": 1900, "y": 606 },
    { "x": 1678, "y": 617 },
    { "x": 1664, "y": 562 },
    { "x": 1564, "y": 564 },
    { "x": 1522, "y": 445 }
  ]
  ```

---

## 4. Normalization Algorithm

Normalized coordinates are derived strictly using the canonical scene bounds:
$$\text{normX} = \text{round}\left(\frac{\text{canonicalX}}{1915}, 4\right), \quad \text{normY} = \text{round}\left(\frac{\text{canonicalY}}{821}, 4\right)$$

All six zones and twelve meters have zero unbounded vertices: $\text{normX} \in [0.0, 1.0]$ and $\text{normY} \in [0.0, 1.0]$.
