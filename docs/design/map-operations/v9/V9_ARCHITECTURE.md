# V9 Spatial Architecture — Tan Thuan Port

## 1. Executive Architecture Summary
The V9 architecture resolves the spatial source problem by establishing **a single canonical plane of truth** (`0 0 1915 821`) and replacing hardcoded, approximate TypeScript polygon arrays with a **declarative, machine-readable geometry artifact** (`tanThuanPresentationGeometry.v9.json`) paired with a **developer-only canonical calibration tool**.

All floating application controls are unified into a **map-native smoked maritime HUD** (`rgba(6, 29, 42, 0.78)` with `backdrop-filter: blur(16px)`), ensuring the satellite/port base map remains the clear visual hero while administrative and operational HUD elements remain calm, concise, and non-intrusive.

```
+-----------------------------------------------------------------------------------+
|                            V9 SPATIAL PIPELINE                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Authoritative Asset]                                                            |
|  docs/design/map-operations/reference/tan-thuan-canonical-base.png (1915x821)       |
|                                     |                                             |
|                                     v                                             |
|  [Canonical Geometry Artifact]                                                    |
|  frontend/.../geometry/tanThuanPresentationGeometry.v9.json                       |
|  (schemaVersion: 1.0, coordinateSystem: tan-thuan-canonical-image-pixel-space-v1) |
|                                     |                                             |
|                   +-----------------+-----------------+                           |
|                   |                                   |                           |
|                   v                                   v                           |
|      [Runtime Geometry Loader]          [Developer Calibration Engine]            |
|      tanThuanPresentationGeometryV9.ts  (?mapCalibration=1 & DEV mode)            |
|                   |                                   |                           |
|                   v                                   v                           |
|      [Unified SVG Scene]                [Direct Canonical Plane Manipulation]     |
|      <svg viewBox="0 0 1915 821">       Draggable Vertices, Anchors, Real-time    |
|      - CanonicalBaseMap                 Simplicity & Containment Validation       |
|      - ZoneLayer (Dual-Stroke)                        |                           |
|      - MeterLayer (12 Meters)                         v                           |
|      - OperatorLayer                    [Deterministic JSON Export]               |
|                   |                                                               |
|                   v                                                               |
|      [Map-Native HUD System]                                                      |
|      Smoked maritime surfaces (--sgp-hud-surface: rgba(6, 29, 42, 0.78))          |
|      Top Bar, Action HUD, Telemetry Cluster, Round Dock, Legend & GPS             |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Single Canonical Coordinate System
The runtime interface operates strictly on:
- **Coordinate System ID**: `tan-thuan-canonical-image-pixel-space-v1`
- **Canonical Dimensions**: `1915 × 821 px`
- **Master SVG ViewBox**: `viewBox="0 0 1915 821"` with `preserveAspectRatio="xMidYMid meet"`
- **Unified Transform**: `<g transform="translate(panX, panY) scale(zoom)">`

### Canonical vs. Normalized Projections
Coordinates are stored at rest in normalized floating-point values `[0.0, 1.0]` with 4 decimal places for database/domain portability, but hand-authored and visually edited exclusively in canonical integer pixel space `[0, 1915] × [0, 821]`:

$$\text{normalized.x} = \frac{\text{canonical.x}}{1915}, \quad \text{normalized.y} = \frac{\text{canonical.y}}{821}$$

$$\text{canonical.x} = \text{round}(\text{normalized.x} \times 1915), \quad \text{canonical.y} = \text{round}(\text{normalized.y} \times 821)$$

Roundtrip error is mathematically bounded to $< 1.0\text{ px}$, verified by automated tests.

---

## 3. Runtime Spatial Pipeline & Geometry Artifact
Previously, presentation geometry was scattered across multiple hardcoded TypeScript arrays (`RAW_ZONES`, `V81_PRESENTATION_ZONES`). In V9:
1. **Single Source of Truth**: `frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v9.json`.
2. **Schema Contract**:
   - `schemaVersion`: `"1.0"`
   - `mapVersion`: `"tan-thuan-v9"`
   - `coordinateSystem`: `"tan-thuan-canonical-image-pixel-space-v1"`
   - `canonicalWidth`: `1915`, `canonicalHeight`: `821`
   - `zones`: Array of 6 visual presentation zones with `polygonCanonical`, `labelAnchorCanonical`, `operatorAnchorCanonical`.
3. **Runtime Loader**: `tanThuanPresentationGeometryV9.ts` imports the JSON artifact directly and deterministically derives:
   - `normalizedPolygon`
   - `polygonSvg` (`M x,y L x,y ... Z`)
   - `centroidCanonical` & `centroidSvg`
   - `labelPositionSvg` & `operatorAnchorSvg`
4. **Zero Duplication**: Legacy references (`V81_PRESENTATION_ZONES`) alias directly to `V9_PRESENTATION_ZONES`, eliminating parallel conflicting geometry.

---

## 4. Developer-Only Calibration Tool Architecture
To avoid guessing polygons or relying on approximations:
- **Gate**: Accessible strictly via URL param `?mapCalibration=1` or `sessionStorage.getItem('mapCalibration') === '1'`, completely inactive outside development (`import.meta.env.DEV`).
- **Co-Planar Rendering**: The calibration overlay (`MapCalibrationSvgLayer`) renders directly inside the SVG world group `<g>`, ensuring vertex handles and anchor pins share the exact transformation matrix as the live port base map.
- **CTM Screen-to-Canonical Transform**: Drag events compute exact canonical coordinates via `gElement.getScreenCTM().inverse()`, completely immune to pan, zoom, window resizing, or device pixel ratio.
- **Live Validation**: Immediate recalculation of polygon simplicity, canonical bounds, area, and 12-meter containment.
- **Direct Export**: Generates deterministic, formatted JSON ready to be saved directly to `tanThuanPresentationGeometry.v9.json`.
