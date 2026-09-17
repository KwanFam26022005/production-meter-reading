# V16E-S2 INTERACTION MODEL: WORKSPACE DYNAMICS & USER FLOWS

**Document Status:** Approved Architecture  
**Release Target:** V16E-S2  
**Key Components:** `ShiftMeterPanel.tsx`, `EntityDetailSurface.tsx`, `DevicesWorkspacePage.tsx`, `MapOperationsPage.tsx`

---

## 1. Overview of Interaction Philosophy

The V16E-S2 interaction model prioritizes:
1. **Contextual Continuity**: Users never lose their place or spatial context when checking progress or inspecting hardware details.
2. **Read-First Safety**: Default views across both workspaces are non-destructive and read-only. Mutating actions are placed behind deliberate user confirmation or dedicated management menus (`[⋮ Quản trị]`).
3. **Cross-Surface Harmony**: The spatial map and the tabular inventory interact bidirectionally, allowing rapid jumps between physical location and technical metadata.

---

## 2. Workspace 1: "Bản đồ" Interaction Flows

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ HEADER BAR                                                            │
  │ [Không gian | Mạng lưới]          [Ca 1 · 06:00 · 0/12] (Toggles Rail)│
  └───────────────────┬──────────────────────────────────┬─────────────────┘
                      │                                  │
         ┌────────────┴────────────┐                     │
         ▼                         ▼                     ▼
  ┌──────────────┐          ┌──────────────┐     ┌───────────────────────┐
  │ SPATIAL MAP  │          │ NETWORK MAP  │     │ SHIFT METER PANEL     │
  │ (GIS Tiles)  │          │ (Topology)   │     │ (Slide-Over Right)    │
  │              │          │              │     │                       │
  │ • Click Mark │          │ • Click Node │     │ • Progress Bar (0%)   │
  │ • Zoom / Pan │          │ • Trace Tree │     │ • Search & Filter     │
  │ • Map Popup  │          │ • Up/Down St.│     │ • Click row -> Map Pan│
  └──────────────┘          └──────────────┘     └───────────────────────┘
```

### 2.1 Spatial Map Interactions (`viewMode = 'map'`)
- **Pan & Zoom**: Fluid OpenLayers canvas with mouse drag, scroll wheel, and touch pinch gestures.
- **Marker Selection**:
  - **Asset Marker**: Clicking an amber (electricity) or cyan (water) marker triggers a highlight ring and opens the bottom/side Asset Summary card with equipment type, operational status, and attached meter count.
  - **Meter Marker**: Clicking a circular meter badge displays the current shift reading status (`Chưa ghi`, `Đã ghi`, `Bất thường`), last reading value, timestamp, and a link to open the full reading modal.
- **Zone Filtering**: Selecting a zone chip from the command bar smoothly animates the map viewport to the bounding box of that zone.

### 2.2 Network Schematic Interactions (`viewMode = 'network'`)
- **Topology Exploration**:
  - Users switch to `[Mạng lưới]` via the header segmented control.
  - Canvas renders directed acyclic graphs for power distribution (24 edges) and water networks (7 edges).
- **Node Selection**:
  - Clicking an asset node highlights all upstream supplier nodes in yellow and downstream consumer nodes in blue.
  - The side inspector updates with upstream feeder capacity, attached meter telemetry, and downstream load distribution.
- **Layer Toggles**: Quick buttons allow isolating the Electricity tree or Water tree independently.

### 2.3 Contextual Shift Meter Panel (`ShiftMeterPanel.tsx`)
- **Opening / Closing**:
  - Click the header button `[Ca 1 · 06:00 · 0/12]` to toggle the panel.
  - Smooth 300ms CSS slide-in transition from the right edge on desktop ($w = 380\text{px}$); slides up as a bottom sheet ($h = 65\text{vh}$) on mobile viewports.
- **Shift Progress Gauge**:
  - Displays overall round progress bar ($0/12 = 0\%$) with animated fill.
  - Displays remaining shift duration countdown.
- **Live Search & Status Filtering**:
  - Instant text filter by meter code, serial number, or asset name.
  - Filter pills: `Tất cả (12)`, `Chưa ghi (12)`, `Đã ghi (0)`, `Cần chú ý (0)`.
- **Meter Row Click Action**:
  - Clicking any meter row triggers `flyToCoordinate([lat, lng])` on the map canvas.
  - Map smoothly centers and zooms to level 18.
  - The meter marker pulses with a glowing beacon animation.
  - Opens the meter's reading entry / inspection drawer.

---

## 3. Workspace 2: "Thiết bị" Interaction Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│ UNIFIED DEVICE DATA GRID (Desktop Table / Mobile Cards)                │
│ Rows: [Icon] [Code] [Name] [Utility] [Zone] [Status] [Relation] [⋯]    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Click Row
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ENTITY DETAIL SURFACE (Slide-Over Drawer - Read-First)                 │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Header: [Badge Type] TBA-01 · Trạm biến áp          [Xem trên bản đồ]│
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Tabs: [Tổng quan]  [Liên kết & Công tơ (2)]  [Lịch sử chỉ số]      │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Specifications · Coordinates · Status · Last Maintenance           │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Footer: [⋮ Quản trị] -> Sửa | Gán công tơ | Đổi trạng thái         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Unified Master Inventory Table
- **Segmented Control Switching**:
  - Instant client-side switching between `[Tất cả 44]`, `[Hạ tầng 32]`, and `[Công tơ 12]`. Zero network refetch latency.
- **Quick-Action Attention Chip**:
  - `[⚠ Cần chú ý]`: Toggles display of items requiring operational attention (e.g. unattached meters, maintenance-due assets, flagged readings).
- **Responsive Layout**:
  - Desktop ($> 768\text{px}$): High-density clean data table with sticky header, clear column alignments, and hover row highlighting (`#f8fafc`).
  - Mobile ($\le 768\text{px}$): Touch-friendly card stack displaying entity badge, title, code, status pill, and primary action buttons.

### 3.2 Read-First "EntityDetailSurface"
- **Open Trigger**: Clicking any row in the table or card in the mobile stack slides in the `EntityDetailSurface` drawer ($w = 480\text{px}$).
- **Tabbed Structure**:
  1. **Tổng quan (Overview)**:
     - Identification: Code, Name, Utility type badge, Lifecycle status.
     - Technical Specifications: Voltage/Pressure rating, Manufacturer, Model number, Multiplier factor.
     - Physical Location: Zone badge, GPS coordinates with quick copy button.
  2. **Liên kết (Relations & Attachment)**:
     - For Assets: Lists all currently attached meters with serial numbers, status, and latest reading. Button to `[+ Gán công tơ mới]`.
     - For Meters: Displays parent host asset card with navigation link to jump directly to that asset's record.
  3. **Lịch sử đo (Measurement & Verification)**:
     - Chronological timeline of previous shift readings.
     - High-resolution optical photo thumbnail with click-to-expand lightbox for OCR audit.
- **Primary Read Action**:
  - Prominent top action button: **`[Xem trên bản đồ]`**.
  - Immediately navigates to Workspace 1 (`Bản đồ`), locates the coordinates, centers the GIS viewport, and sets focus on the entity marker.
- **Administrative Overflow Menu (`[⋮ Quản trị]`)**:
  - Non-destructive by default. Clicking the `[⋮ Quản trị]` button opens a guarded dropdown menu:
    - `Sửa thông tin kỹ thuật` -> Opens edit modal.
    - `Gán / Hủy liên kết công tơ` -> Opens `LinkMeterModal`.
    - `Cập nhật trạng thái vận hành` -> Opens status dialog (`Đang vận hành`, `Bảo trì`, `Ngừng hoạt động`).
    - `Báo cáo sự cố thiết bị` -> Opens incident ticket modal.

---

## 4. Modal Interactions

1. **Create Asset Modal (`CreateAssetModal`)**:
   - Triggered via `[+ Thêm hạ tầng]` in the Devices workspace.
   - Form fields: Code, Name, Asset Type, Utility Type (`Điện` / `Nước`), Presentation Zone, Coordinates.
   - Validation: Unique code check, required GPS coordinates within port bounds.
2. **Create Meter Modal (`CreateMeterModal`)**:
   - Triggered via `[+ Thêm công tơ]`.
   - Form fields: Serial Number, Meter Model, Utility Type, Multiplier, Initial Reading, Host Asset selection dropdown.
3. **Link Meter Modal (`LinkMeterModal`)**:
   - Allows pairing or unpairing meters to assets with effective timestamp and physical port/phase notation.
