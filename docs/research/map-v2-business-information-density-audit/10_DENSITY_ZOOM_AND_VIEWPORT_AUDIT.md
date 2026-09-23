# Map V2 Business & Information Density Audit — 10. Density, Zoom & Viewport Audit

## 1. Space Allocation (Observed from Screenshots)

### At 1920×1080 (Overview Default)
Observations from screenshot 01:
- Sidebar: ~60px fixed rail (left edge)
- Toolbar header: ~65px height (top)
- Map canvas: Remaining area (~1800×1015 effective)
- HUD controls: ~40×200px cluster (bottom-right)
- Zone anchors: 7 icon+label pairs distributed across map
- Employee markers: 4 animated markers
- Demo disclosure badge: ~300px pill in toolbar area

### At 1920×1080 (Inspector Open)
Observations from screenshot 04:
- Inspector panel: ~280px width (right side)
- Map canvas reduced by inspector width
- No backdrop blur/dim on wide screens (docked mode)
- Selected zone polygon highlighted in blue overlay
- Employee marker with active selection ring still visible

### At 1280×800 (Compact)
Observations from screenshot 09:
- Sidebar: ~70px with larger text labels
- Toolbar: Single row, collapsed to essential controls + 'Tùy chọn' button
- Map canvas: ~1210×730 effective
- HUD: Same floating position, relatively larger proportion
- View/Layers controls hidden behind Tùy chọn

## 2. Density Assessment

### Toolbar Density
- At 1920×1080: Toolbar contains ~15 buttons + badge + metadata. Comfortable spacing.
- At 1280×800: Collapses well via 'Tùy chọn' condensed menu. Only essential mode toggles remain.
- **Finding**: Toolbar density is ACCEPTABLE at both viewports.

### Map Canvas Utilization
- Sidebar is minimal (60-70px) — good.
- At 1920×1080 with NO inspector: ~93% of viewport is usable map area. EXCELLENT.
- At 1920×1080 with inspector: ~78% map area. GOOD.
- At 1280×800 with inspector (drawer mode): Drawer overlays map from bottom. UNVERIFIED — need to test actual drawer behavior.

### Marker & Label Overlap
- Zone anchors are well-spaced except Kho 1 / Kho 2 / Bãi tổng hợp cluster
- Employee markers near zone anchors can overlap (Kho 1 marker + employee NV004)
- At zoom-out (fit-all), label density is manageable for 7 zones
- At zoom-in, no clustering logic exists — markers stay at fixed positions

### Inspector Coverage
- Operational card (zone): Floating, max 340px, positioned near anchor. May overlap adjacent zones.
- Employee inspector: Docked right panel ~280px. Map adjusts but selected marker may be near edge.
- Geometry inspector: Same panel layout as employee inspector.

## 3. Inspector Comparison

### Operational Inspector (Zone Card)
- Small, floating, contextual
- Doesn't dim the map
- Contains: zone info + 'Xem chi tiết kỹ thuật' button
- **Assessment**: Good. Map remains fully readable.

### Employee Inspector (Docked Panel)
- Fixed width ~280px docked right
- No backdrop blur on wide screens
- Contains: employee fields + disclosure card
- **Assessment**: Good. Map loses ~15% width but remains usable.

### Geometry Inspector (Docked Panel)
- Same panel as employee inspector
- Contains: coordinates table, copy button
- Potentially needs MORE width for coordinate data
- **Assessment**: Same width may be too narrow for coordinate tables.

### Recommendation
Operational inspectors (employee, zone) should remain compact (~280-320px).
Geometry inspector could benefit from wider panel (~400px) for coordinate tables, but this is a Technical-mode-only concern.

## 4. Zoom Behavior

Source: MapV2Canvas.tsx
- MIN_ZOOM: 0.4
- MAX_ZOOM: 6.0
- Zoom step: ×1.25 per click
- Scroll wheel zoom: cursor-point invariant
- Reset: Returns to current ViewMode (fit-all or fit-width)

### Zoom Level Information Density Policy (PROPOSED)

#### TOÀN CẢNG (Port-Wide, zoom < 1.0)
- Show: Zone labels + icons
- Show: Zone progress badge (when available)
- Show: Employee markers (if layer on)
- Hide: Individual meter markers
- Hide: Detailed zone stats
- Cluster: Employee markers if too close

#### CẤP PHÂN KHU (Zone Level, zoom 1.0-2.5)
- Show: Zone labels + progress
- Show: Employee markers with names
- Show: Meter markers (when available)
- Show: Exception indicators
- Animate: Only visible markers

#### CẤP CÔNG TƠ (Meter Level, zoom > 2.5)
- Show: Individual meter labels
- Show: Reading status per meter
- Show: Employee markers with full detail
- Hide: Zone-level progress (too zoomed in)

### Current Limitations
- No zoom-dependent information density currently implemented
- All labels shown at all zoom levels
- No marker clustering
- Animation runs at all zoom levels regardless of visibility

## 5. Animation vs Readability

### Current Behavior
- Employee markers move continuously at ~2px/sec
- Loop duration: 8-12 seconds
- At full zoom-out, motion is barely perceptible (2px motion in 1000px viewport)
- At zoom-in, motion is more noticeable but markers remain clickable

### Assessment
- At port-wide zoom: Animation adds visual interest but doesn't impair readability
- At zone zoom: Animation makes it slightly harder to click a specific marker
- When inspector is open: Selected marker is FROZEN — no click difficulty
- Multiple markers in same zone: Offset staggering prevents overlap

### Recommendations
- Consider pausing animation at zoom < 0.6 (markers too small to be useful)
- When exception badges exist, ensure they take visual priority over motion
- Selected marker animation pause is correctly implemented
