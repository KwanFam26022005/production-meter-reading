# V16E-S2 NAVIGATION MODEL: TWO-WORKSPACE HIERARCHY

**Document Status:** Approved Architecture  
**Release Target:** V16E-S2  
**Implementation Files:** `AdminShell.tsx`, `OperationalWorkspaceHeader.tsx`, `App.tsx`

---

## 1. Global Navigation Architecture

The system navigation is structured as a two-tier hierarchy:
1. **Primary Workspace Tier**: Anchored on the permanent left navigation rail (`AdminShell`), exposing exactly two primary operational destinations.
2. **Contextual Workspace Tier**: In-workspace toolbars, headers, and slide-over drawers tailored to the active task domain.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL ADMIN SHELL (Left Navy Rail: #0f172a)                                           │
│ ┌──────────────┐ ┌───────────────────────────────────────────────────────────────────┐ │
│ │  [Bản đồ]    │ │ WORKSPACE 1: BẢN ĐỒ                                               │ │
│ │              │ │ ┌───────────────────────────────────────────────────────────────┐ │ │
│ │  [Thiết bị]  │ │ │ Header: Title · Scenario · Mode Switcher [Không gian|Mạng lưới]│ │ │
│ │              │ │ ├─────────────────────────────────────────┬─────────────────────┤ │ │
│ │  [⋯] Khác    │ │ │ Map / Network Canvas                    │ ShiftMeterPanel     │ │ │
│ │  (Popover)   │ │ │ (OpenLayers / SVG Topology)             │ (Slide-over rail)   │ │ │
│ └──────────────┘ └─┴─────────────────────────────────────────┴─────────────────────┴─┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Primary Navigation Rail (Desktop & Mobile Drawer)

### 2.1 Desktop Navigation Rail (`AdminShell.tsx`)
- **Width & Visual Weight**: 72px fixed vertical rail with dark slate navy theme (`#0f172a`, border `#1e293b`).
- **Primary Rail Items**:
  1. **`[Bản đồ]`** (`data-tab="map"`):
     - Icon: Spatial Map / Compass (`HiOutlineMap`).
     - Route: `/admin/map` (or `/admin` root).
     - Badge: Live anomaly counter or shift status pulse indicator.
  2. **`[Thiết bị]`** (`data-tab="assets"`):
     - Icon: Hardware / Server Rack (`HiOutlineCube`).
     - Route: `/admin/devices` (aliases `/admin/assets`).
     - Count: Total managed devices badge `44`.
  3. **`[⋯]` (Công cụ khác)** (`data-tab="more"`):
     - Icon: Ellipsis / Tools grid (`HiOutlineDotsHorizontal`).
     - Type: Interactive Popover Flyout Menu.
     - Contained Items:
       - `Lịch ghi` (`/admin/schedules`) — Meter reading calendar and cycle planning.
       - `Phân ca` (`/admin/rounds`) — Shift assignment and crew dispatches.
       - `Báo cáo` (`/admin/reports`) — Utility consumption and billing reconciliations.
       - `Nhật ký` (`/admin/logs`) — Audit trails and security event logs.
       - `Thẩm định hồ sơ` (`/admin/verification`) — Formal OCR and manual approval queue.

### 2.2 Mobile Navigation Drawer
- On screen widths $< 768px$, the desktop rail collapses into a slide-over mobile drawer accessed via the hamburger button (`.admin-sidebar-toggle-btn`).
- The drawer mirrors the desktop rail structure with full Vietnamese text labels and active indicators.

---

## 3. Workspace 1: "Bản đồ" Navigation & Header

The header in the Map workspace (`OperationalWorkspaceHeader.tsx`) is designed for situational awareness:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Điều Hành Không Gian Cảng   [Không gian] [Mạng lưới]   [Ca 1 · 06:00 · 0/12]  [🔍 Tìm]│
│ tan-thuan-demo-v1 · Dữ liệu mô phỏng                                                 │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Left Metadata**:
   - Title: `Điều Hành Không Gian Cảng` (Port Spatial Operations).
   - Scenario Badge: `tan-thuan-demo-v1` (Frozen simulation tag).
   - Mode Indicator: `Dữ liệu mô phỏng` (Simulation status badge).
2. **Center Mode Switcher**:
   - Segmented toggle between:
     - **`[Không gian]`** (`viewMode = 'map'`): Full GIS map with OpenLayers satellite/street layer, asset icons, and meter indicators.
     - **`[Mạng lưới]`** (`viewMode = 'network'`): Force-directed single-line schematic network graph.
3. **Right Shift Summary Button**:
   - **`[Ca 1 · 06:00 · 0/12]`** (`.sgp-uwh-shift-btn`):
     - Shows current shift name, start time, and reading completion ratio ($0/12$).
     - Clicking toggles the slide-over **`ShiftMeterPanel`**.
     - Active highlight when the panel is open.

---

## 4. Workspace 2: "Thiết bị" Navigation & Filtering

The Devices workspace (`DevicesWorkspacePage.tsx`) provides an instant-response data grid with multi-layered filtering:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ THIẾT BỊ HẠ TẦNG & CÔNG TƠ (44)                   [+ Thêm hạ tầng] [+ Thêm công tơ]   │
│ Danh mục đồng bộ tài sản kỹ thuật và thiết bị đo lường                                 │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ [Tất cả (44)]  [Hạ tầng (32)]  [Công tơ (12)]   |  [🔍 Tìm kiếm mã, tên, serial...]   │
│ [⚠ Cần chú ý (0)]  [Phân loại ▼]  [Khu vực ▼]                                         │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Segmented Control**:
   - `Tất cả (44)`: Polymorphic join of assets and meters.
   - `Hạ tầng (32)`: Filtered to physical infrastructure (`Asset`).
   - `Công tơ (12)`: Filtered to measurement meters (`Meter`).
2. **Quick-Action Attention Chip**:
   - `[⚠ Cần chú ý]`: Filters rows with `status !== 'OPERATIONAL'`, inactive lifecycle, unattached meters, or anomalous readings.
3. **Dropdown Filters**:
   - Utility Type: `Tất cả loại`, `Điện`, `Nước`.
   - Spatial Zone: Dynamically populated from active zones (`Khu A`, `Khu B`, etc.).

---

## 5. Cross-Workspace Navigation Transitions

A key UX requirement is effortless context switching between spatial operations and inventory records:

```mermaid
flowchart LR
    subgraph W1["Workspace 1: BẢN ĐỒ"]
        M1["GIS Map Marker"]
        N1["Network Node"]
        S1["ShiftMeterPanel Item"]
    end

    subgraph W2["Workspace 2: THIẾT BỊ"]
        T1["Device Table Row"]
        D1["EntityDetailSurface Drawer"]
        A1["Action: [Xem trên bản đồ]"]
    end

    T1 -->|Click Row| D1
    D1 -->|Click [Xem trên bản đồ]| A1
    A1 -->|Fly-to Coordinate & Switch Tab| M1
    M1 -->|Click 'Chi tiết kỹ thuật'| D1
    S1 -->|Click Meter in Shift| M1
```

### Transition Specification:
1. **Device Row -> Map View**:
   - User is in `Thiết bị`, clicks `TBA-01` or `PE-01`.
   - `EntityDetailSurface` opens on the right.
   - User clicks primary action button **`[Xem trên bản đồ]`**.
   - Application switches `activeTab = 'map'`, sets `viewMode = 'map'`, centers the GIS canvas smoothly on `(lat, lng)` with zoom level 18, and highlights the entity.
2. **Map Marker -> Device Inventory**:
   - User is on `Bản đồ`, clicks an asset or meter marker.
   - Popup displays quick status and reading.
   - User clicks link **`Xem trong danh mục thiết bị`** $\rightarrow$ switches `activeTab = 'assets'` and filters or selects the target entity.

---

## 6. Route Compatibility & Fallbacks

To ensure backwards compatibility with bookmarks, tests, and deep links:

| URL Path | Target Workspace | Segment State | Notes |
| :--- | :--- | :--- | :--- |
| `/admin` | `Bản đồ` | Default GIS map | Default entry point |
| `/admin/map` | `Bản đồ` | `viewMode = 'map'` | Primary spatial view |
| `/admin/devices` | `Thiết bị` | `segment = 'ALL'` | Primary inventory view |
| `/admin/assets` | `Thiết bị` | `segment = 'ASSETS'` | Aliased for backward compatibility |
| `/admin/meters` | `Thiết bị` | `segment = 'METERS'` | Aliased for backward compatibility |
| `/admin/list` | `Bản đồ` | `isShiftPanelOpen = true` | Legacy list redirect with shift drawer opened |
