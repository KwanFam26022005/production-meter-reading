# V9 Canonical Geometry Authoring Guide — Tan Thuan Port

## 1. Overview & Purpose
The V9 Geometry Authoring System provides an interactive, developer-only visual calibration workspace embedded directly in the Tan Thuan Port Map scene. It eliminates the need for manual coordinate guessing or approximate polygons by allowing developers and spatial engineers to edit zone vertices, fine-tune label/operator anchors, compare against authoritative zoning references, and export a canonical JSON artifact in real-time.

```
+-----------------------------------------------------------------------------------+
|                     CANONICAL GEOMETRY CALIBRATION WORKFLOW                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. Activate: http://localhost:5173/map?mapCalibration=1 (DEV mode only)           |
|                                                                                   |
|  2. Select Presentation Zone: BERTH_1_4, BERTH_5_7, WAREHOUSE_LOGISTICS, etc.     |
|                                                                                   |
|  3. Inspect Reference Overlay: Toggle 0% -> 25% -> 50% -> 75% -> 100% opacity     |
|                                                                                   |
|  4. Edit Vertices:                                                                |
|     - Drag circular handle to reposition vertex in canonical coordinates          |
|     - Click along polygon edge to insert new vertex                               |
|     - Alt + Click on vertex handle to remove vertex                               |
|                                                                                   |
|  5. Adjust Anchors:                                                               |
|     - Drag [T] pin for Label / Title position                                     |
|     - Drag [O] pin for Operator anchor position                                   |
|                                                                                   |
|  6. Monitor Real-time Geometry Diagnostics:                                       |
|     - Simplicity (no self-intersecting edges)                                     |
|     - Canonical bounds [0, 1915] x [0, 821]                                       |
|     - Minimum enclosed area (> 5000 px^2)                                         |
|     - Assigned meter containment (e.g. 3/3 meters verified inside)                |
|                                                                                   |
|  7. Export & Persist:                                                             |
|     - "Copy Canonical JSON" or "Download JSON"                                    |
|     - Replace frontend/.../geometry/tanThuanPresentationGeometry.v9.json          |
|     - Run `npm test` and `npm run build` to verify                                |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Activation & Safety Gating
The calibration interface is strictly protected against accidental exposure in production environments:
1. **Developer Environment Check**: Gated behind Vite's `import.meta.env.DEV`. In production builds (`npm run build`), all calibration hooks return `false`, ensuring zero bundle impact or runtime leakage.
2. **URL Parameter / Session Flag**:
   - Enable by navigating to: `http://localhost:5173/?mapCalibration=1`
   - Or set in browser console: `sessionStorage.setItem('mapCalibration', '1'); location.reload();`
   - Disable by clicking **Exit** in the calibration HUD, or setting `sessionStorage.removeItem('mapCalibration')`.

When active, the top-right corner displays a prominent amber badge: `V9 CALIBRATION MODE (1915 x 821)`.

---

## 3. Co-Planar CTM Coordinate Transform
Unlike previous overlay tools that operated in screen space and drifted during camera pan/zoom, the V9 Calibration System renders directly inside the master SVG `<g transform="translate(panX, panY) scale(zoom)">` world group.

To convert mouse gestures to canonical pixel coordinates, the system computes the inverse Current Transformation Matrix (CTM):
```typescript
const gElement = worldGroupRef.current;
const ctm = gElement.getScreenCTM();
if (!ctm) return;

const inverse = ctm.inverse();
const pt = svg.createSVGPoint();
pt.x = mouseEvent.clientX;
pt.y = mouseEvent.clientY;
const canonicalPt = pt.matrixTransform(inverse);

const clampedX = Math.round(Math.max(0, Math.min(1915, canonicalPt.x)));
const clampedY = Math.round(Math.max(0, Math.min(821, canonicalPt.y)));
```
This guarantees **zero coordinate drift** regardless of screen size, device pixel ratio, or camera zoom level.

---

## 4. Interactive Editing Operations

### 4.1 Zone Selection
The floating Calibration HUD drawer lists all 6 presentation zones:
- `BERTH_1_4` (Wharf 1–4, South-Eastern Quayside)
- `BERTH_5_7` (Wharf 5–7, North-Eastern Riverfront)
- `WAREHOUSE_LOGISTICS` (Central Warehouse & CFS Facilities)
- `INTERNAL_STORAGE` (Inland Stacking Yards & Depots)
- `OFFICE_ADMIN` (Administrative Headquarters & Port Operations Center)
- `TECHNICAL_GATE` (Main Gate, Inspection Bays & Electrical Substation)

Click any zone button to activate its vertex and anchor handles.

### 4.2 Vertex Manipulation
- **Move Vertex**: Click and drag any teal vertex handle (`r="7"`). The HUD displays live coordinate readouts `(x, y)` updating at 60fps.
- **Insert Vertex**: Hover over any polygon segment line. The cursor changes to `copy`. Click on the line to insert a new vertex midway between the two endpoints.
- **Delete Vertex**: Hold `Alt` and click on any vertex handle (or `Option` on macOS). Polygons require a minimum of 3 vertices; deletion is prevented if only 3 vertices remain.

### 4.3 Anchor Fine-Tuning
- **Label Anchor (`[T]` Pin)**: Visualized as a cyan circular marker with a "T" label. Drag this pin to place the zone's title and status badge in an uncluttered area of the zone.
- **Operator Anchor (`[O]` Pin)**: Visualized as an amber circular marker with an "O" label. Drag this pin to position the operator dispatch popover dock.

### 4.4 Reference Zoning Overlay
To compare working boundaries with the approved masterplan:
- Click the **Ref Overlay** button in the HUD.
- The button cycles opacity: `0%` -> `25%` -> `50%` -> `75%` -> `100%`.
- The reference image (`/reference/tan-thuan-approved-zoning.png`) is rendered underneath the interactive handles at exact 1915x821 alignment.

---

## 5. Live Geometric Diagnostics & Validation

The Calibration HUD continuously evaluates the active polygon against four mission-critical checks:

| Diagnostic Check | Rule / Threshold | HUD Indicator | Failure Impact |
| :--- | :--- | :--- | :--- |
| **Polygon Simplicity** | Edges must not self-intersect or twist | `Simple: Valid` (Green) vs. `Self-intersecting` (Red) | Non-simple polygons cause SVG rendering glitches and raycasting ambiguities. |
| **Canonical Bounds** | All vertices $\in [0, 1915] \times [0, 821]$ | `In Bounds` (Green) vs. `Out of Bounds` (Red) | Points outside bounds cause clipping or canvas overflow. |
| **Minimum Enclosed Area** | Shoelace formula $\text{Area} > 5000\text{ px}^2$ | `Area: N px²` | Prevents collapsed or degenerate polygons. |
| **Meter Containment** | Canonical meters must reside inside zone polygon | `Meters: K/N inside` | Ensures all production meters map to their expected visual zones. |

---

## 6. Persistence & Sign-Off Workflow

Once visual calibration is complete:
1. Click **Copy JSON** in the Calibration HUD (or **Download JSON** to save `tanThuanPresentationGeometry.v9.json`).
2. Replace the contents of:
   `frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v9.json`
3. Run the automated validation suite:
   ```bash
   cd frontend
   npm test
   npm run build
   ```
4. Verify all tests pass, ensuring no meter containment regressions or schema violations.
5. Provide the calibrated artifact for final human sign-off (`READY_FOR_HUMAN_GEOMETRY_SIGNOFF`).
