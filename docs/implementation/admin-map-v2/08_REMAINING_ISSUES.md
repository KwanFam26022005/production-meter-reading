# 08 — Remaining Issues and Follow-Up Recommendations

## Executive Summary
This document catalogs observations, user review items, and recommended next steps following the successful Phase 1 rollout of **Map V2 (Bản đồ V2)**.

---

## 1. Geometry & Survey Observations for User Review

### 1.1 `ROAD_BACKLAND` Inflection Point
- **Vertices**:
  - Vertex 3: `[382, 574]`
  - Vertex 4: `[356, 577]`
  - Vertex 5: `[540, 581]`
- **Observation**:
  Moving from Vertex 3 to Vertex 4 decreases the X coordinate from $382 \to 356$ px before abruptly leaping to $540$ px at Vertex 5. This forms a backward kink/jog in the road centerline.
- **Current State**:
  Strictly preserved as authored in `tan_thuan_1_zones_edited (1).json`. Surfaced to operators via an amber warning banner in the Map V2 Inspection Panel.
- **Recommendation**:
  Present to port surveyors / GIS team for editorial confirmation. If an amendment is requested in Phase 2, update the JSON vertex coordinates cleanly via a reviewed change.

### 1.2 Isolated Warehouses & Admin Office
- `BLDG_KHO_4` and `ZONE_ADMIN` have `parent_id: null`.
- They are rendered with full precision and are selectable in the buildings layer. Confirm whether `BLDG_KHO_4` should eventually be parented to an operational yard in a future database schema migration.

---

## 2. Future Phase Capabilities (Out of Scope for Phase 1)

1. **Meter Placement & Spatial Linkage**:
   In a future phase, meter entities from the operational database (`meters` table) can be projected onto the Map V2 coordinate system (`1536 × 1024`).
2. **Interactive Calibration Tooling**:
   If port planners need to adjust polygon vertices directly within the UI, a dedicated calibration mode similar to Map V1's calibration overlay can be implemented with strict role-based access control.
3. **Multi-resolution Tile Pyramid (TMS/XYZ)**:
   If ultra-high resolution aerial imagery (> 8K) is introduced in the future, consider integrating a Leaflet/OpenLayers canvas with deep zoom tile slicing.

---

## 3. Residual Risk Assessment

- **Map V1 Regression Risk**: **ZERO**. Map V1 codebase, assets, and database endpoints were untouched.
- **User Portal Regression Risk**: **ZERO**. User Portal bundle was audited and contains zero Map V2 code or assets.
- **Production Build Risk**: **ZERO**. Both bundles build cleanly with minification and zero TypeScript errors.
