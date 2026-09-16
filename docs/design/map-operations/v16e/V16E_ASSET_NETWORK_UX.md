# V16E — ASSET-CENTRIC MAP & UTILITY NETWORK TOPOLOGY UX/UI

## 1. Executive Summary & Design Mission

Phase **V16E** establishes the production operational visual layer bridging physical geography (Map View) and utility network topology (Network View) with deep asset-centric operational context (Asset Detail Context Surface).

### The Three Core Operational Questions
| View Surface | Core Operational Question | Operational Resolution |
| :--- | :--- | :--- |
| **Map View** | *"Thiết bị nằm ở đâu?"* | Renders verified assets as clean 2D maritime symbols pinned to canonical pixel coordinates `(1915 × 821)`. Unlocated assets are omitted cleanly from the map layer with explicit status notation. |
| **Network View** | *"Thiết bị được kết nối / cấp nguồn như thế nào?"* | Schematic single-line diagram (SLD) laying out electrical distribution and water networks via an automated cycle-safe layered DAG layout, enabling instant upstream (nguồn cấp) and downstream (cấp đến) trace analysis. |
| **Asset Context Surface** | *"Thiết bị này đang có những Meter, trạng thái và dữ liệu gì?"* | Unified right-anchored context surface detailing asset identity, verification status, lifecycle, spatial coordinates, attached meters segregated into `MEASURES` vs `INSTALLED_AT` with latest recorded readings, and upstream/downstream connection hops. |

---

## 2. Information Architecture & The 4-Layer Shell

The spatial console strictly maintains the 4-layer UI shell invariant:

1. **Layer A (Base Application Framework)**: Full-bleed root container (`.sgp-map-first-root`) with CSS variable `--commandbar-clearance` adapting to toolbar expansion.
2. **Layer B (Operational Workspace)**: Mutually exclusive center canvas rendering:
   - `OperationalScene` (Map view & calibration mode)
   - `UtilityNetworkView` (Network topology mode)
   - `OperationalListView` (Tabular list view)
3. **Layer C (Integrated Scene HUDs)**:
   - `AdaptiveCommandBar`: Multi-mode view switcher (`[Bản đồ]`, `[Mạng lưới]`, `[Danh sách]`), round selector, search & filters, CSV export, and telemetry summary.
   - `SceneControlHUD`: Zoom, pan, and reset controls (strictly mounted only in Map mode without open context drawers).
4. **Layer D (Contextual Surfaces — Invariant Max 1 Active)**:
   - `AssetContextSurface`: Asset operational context (`activeContextType === 'asset-detail'`).
   - `MeterDetailDrawer`: Meter inspection (`activeContextType === 'meter-detail'`).
   - `ZoneDrawer`: Zone overview (`activeContextType === 'zone-detail'`).
   - `OperatorShiftPopover`: Operator assignment (`activeContextType === 'operator-popover'`).
   - `AnalyticsDrawer`: Operational metrics (`activeContextType === 'analytics'`).

---

## 3. Truthful Data Representation Contract

In strict compliance with V16 enterprise architecture, the UI **never fabricates domain truth**:

1. **Verified-Only Default**:
   - Operators and dispatchers view **only verified assets and verified connections** by default.
   - Unverified candidates are completely suppressed from operational views to prevent false operational assumptions.
2. **Admin Unverified Preview Mode**:
   - Authorized administrators (`canManageVerification`) can toggle `[Duyệt chưa xác minh]` via an explicit amber toggle.
   - Unverified nodes and connections render with neutral amber dashed styling (`#D97706`, `stroke-dasharray: 4,3`) and an explicit `"Chưa duyệt"` badge.
3. **Calm Empty State**:
   - If a utility or substation has zero verified connections, the system displays a truthful, calm informational banner:
     `"Chưa có kết nối mạng lưới đã xác minh."`
   - No mock connections or placeholder lines are ever synthesized.
4. **Missing Coordinate Integrity**:
   - Assets without verified spatial coordinates (`map_x == null` or `map_y == null`) are never plotted on the map.
   - They remain accessible in the network view and asset registry, and their context surface explicitly displays `"Chưa xác minh vị trí thiết bị"`.
5. **Meter Relationship Segregation**:
   - Attached meters are strictly split into:
     - **`MEASURES` (Đo lường phụ tải)**: Meters monitoring electricity or water throughput of the asset.
     - **`INSTALLED_AT` (Lắp đặt vật lý)**: Meters physically mounted inside or on the asset housing.
   - Each meter item shows its canonical meter code, name, operational status, latest reading value, and timestamp.

---

## 4. Map ↔ Network Synchronization Workflow

- Selecting an asset on the **Map** updates `selectedAssetId` and opens the `AssetContextSurface`.
- Clicking `"Xem mạng lưới"` switches to **Network View** while retaining `selectedAssetId`, centering and highlighting the asset within its electrical/water graph.
- Clicking `"Xem trên bản đồ"` from the context surface or network view switches to **Map View**, smoothly framing the camera over the asset's canonical coordinates with safe viewport padding.
- URL query parameters (`?view=network&asset=...&utility=ELECTRICITY&showUnverified=false`) remain synchronized to allow deep-linking and browser navigation without state loss.
