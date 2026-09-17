# V16E-S2 COMPONENT MIGRATION & REFACTORING LOG

**Document Status:** Approved Architecture  
**Release Target:** V16E-S2  
**Base Commit:** `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
**Target Branch:** `feature/v10-landmark-calibration-minimal-hud`

---

## 1. Component Architecture Transformation

The V16E-S2 refactoring eliminates view fragmentation by consolidating multiple disparate pages and overlapping controls into two unified workspaces.

### Before vs. After Architecture:

| Component Area | Pre-V16E-S2 Architecture | V16E-S2 Consolidated Architecture |
| :--- | :--- | :--- |
| **Global Rail Navigation** | 5+ competing tabs: `Bản đồ`, `Danh sách`, `Hạ tầng`, `Công tơ`, `Thẩm định`. | Exactly 2 primary items: `[Bản đồ]` and `[Thiết bị]`. Secondary tools in `[⋯]` popover. |
| **Operational Header** | Cluttered row with 5 peer view toggles (`map`, `network`, `list`, `verification`, `dashboard`). | Clean situational header: Title, Scenario tag, simulation badge, `[Không gian]` / `[Mạng lưới]` toggle, and Shift button `[Ca 1 · 06:00 · 0/12]`. |
| **Shift Progress & Readings**| Full-page disjoint `list` viewMode disconnected from the map. | Contextual `ShiftMeterPanel` slide-over drawer embedded directly inside the Map workspace. |
| **Inventory / Devices** | Separate `/admin/assets` (Assets page) and `/admin/meters` (Meters page) with duplicate search & filter UIs. | Unified `DevicesWorkspacePage` with segmented controls (`Tất cả 44`, `Hạ tầng 32`, `Công tơ 12`) and unified filtering. |
| **Detail Inspection** | Fragmented modals and basic inline tables. | Read-first `EntityDetailSurface` slide-over drawer with tabs, `[Xem trên bản đồ]`, and guarded `[⋮ Quản trị]` menu. |

---

## 2. File-by-File Migration Details

### 2.1 State & Context Layer

#### `frontend/src/features/map-operations/context/OperationalWorkspaceContext.tsx`
- **Additions**:
  - `deviceSegment: 'ALL' | 'ASSETS' | 'METERS'` state to control active segment in Devices workspace.
  - `setDeviceSegment(segment)` setter.
  - `isShiftPanelOpen: boolean` state controlling visibility of the slide-over `ShiftMeterPanel`.
  - `setIsShiftPanelOpen(open: boolean | ((prev: boolean) => boolean))` toggle function.
  - `openMeterDetails(meterId: string)` helper to fly map to meter and open detail surface.
- **Invariants Preserved**:
  - Maintained all existing spatial filter states (`activeZoneId`, `utilityFilter`, `anomalyFilter`, `viewMode`).

---

### 2.2 Global Shell & Navigation

#### `frontend/src/features/admin/AdminShell.tsx`
- **Refactoring**:
  - Reduced permanent left vertical navy rail (`#0f172a`) from 5+ items to exactly:
    1. `[Bản đồ]` (`tab = 'map'`, route `/admin/map`)
    2. `[Thiết bị]` (`tab = 'assets'`, route `/admin/devices`)
    3. `[⋯] Khác` (`tab = 'more'`) — Interactive Popover containing secondary tools:
       - `Lịch ghi` (`/admin/schedules`)
       - `Phân ca` (`/admin/rounds`)
       - `Báo cáo` (`/admin/reports`)
       - `Nhật ký` (`/admin/logs`)
       - `Thẩm định hồ sơ` (`/admin/verification`)
  - Added `data-tab` attributes (`data-tab="map"`, `data-tab="assets"`, `data-tab="more"`) for automated testing and telemetry.
  - Synchronized mobile slide-over drawer to mirror the simplified two-workspace structure.

---

### 2.3 Workspace 1: Bản đồ Components

#### `frontend/src/features/map-operations/components/OperationalWorkspaceHeader.tsx`
- **Refactoring**:
  - Replaced the 5-peer button row with a balanced, high-clarity header layout:
    - **Left**: Port title (`Điều Hành Không Gian Cảng`), scenario badge (`tan-thuan-demo-v1`), and simulation status (`Dữ liệu mô phỏng`).
    - **Center**: Segmented toggle between `[Không gian]` (`'map'`) and `[Mạng lưới]` (`'network'`).
    - **Right**: Shift summary toggle button `[Ca 1 · 06:00 · 0/12]` (`.sgp-uwh-shift-btn`) which opens `ShiftMeterPanel`.

#### `frontend/src/features/map-operations/components/ShiftMeterPanel.tsx` *(NEW COMPONENT)*
- **Implementation**:
  - Slide-over rail on desktop ($w = 380\text{px}$, $z\text{-index} = 40$) and bottom sheet on mobile ($h = 65\text{vh}$).
  - Header with shift title (`Ca 1 · 06:00 - 14:00`), completion ratio badge (`0/12`), and close `[×]` button.
  - Visual progress bar ($0\% \rightarrow 100\%$) with animated green fill.
  - Real-time search bar filtering meters by code, serial number, or host asset name.
  - Quick filter pills: `Tất cả (12)`, `Chưa ghi (12)`, `Đã ghi (0)`, `Cần chú ý (0)`.
  - Meter item cards displaying meter code, serial, host asset, utility badge, and reading status.
  - Clicking any meter triggers `flyToMeter(meter.id)` on the GIS map and opens its detail inspector.

#### `frontend/src/features/map-operations/components/AdaptiveCommandBar.tsx`
- **Refactoring**:
  - Removed obsolete standalone `list` view toggle button.
  - Focused controls on spatial search, utility filtering (`Điện` / `Nước`), and presentation zone filters.

#### `frontend/src/features/map-operations/MapOperationsPage.tsx`
- **Refactoring**:
  - Mounted `ShiftMeterPanel` inside the main map layout container.
  - Connected `isShiftPanelOpen` and `setIsShiftPanelOpen` from context.
  - Passed active shift statistics to `OperationalWorkspaceHeader`.

---

### 2.4 Workspace 2: Thiết bị Components

#### `frontend/src/features/devices/DevicesWorkspacePage.tsx` *(NEW COMPONENT)*
- **Implementation**:
  - Replaces separate asset and meter pages with a unified inventory workspace.
  - Polymorphic client-side join combining `assets` (32) and `meters` (12) into a uniform 44-item dataset (`UnifiedDeviceRow`).
  - Segmented controls:
    - `[Tất cả (44)]`
    - `[Hạ tầng (32)]`
    - `[Công tơ (12)]`
  - Quick-action filter: `[⚠ Cần chú ý]` (highlights unattached meters, offline assets, anomalous readings).
  - Search input with instant debounce for code, name, serial number, and zone.
  - Utility type dropdown (`Tất cả loại`, `Điện`, `Nước`) and Zone filter dropdown.
  - Responsive layout:
    - Desktop: High-density data table with columns: `Loại`, `Mã thiết bị`, `Tên thiết bị / Serial`, `Hệ thống`, `Khu vực`, `Trạng thái`, `Liên kết / Chỉ số`, and action buttons.
    - Mobile: Card list optimized for touch interaction.
  - Modal integrations: `CreateAssetModal`, `CreateMeterModal`, `LinkMeterModal`.

#### `frontend/src/features/devices/EntityDetailSurface.tsx` *(NEW COMPONENT)*
- **Implementation**:
  - Read-first slide-over detail drawer ($w = 480\text{px}$, $z\text{-index} = 50$) opening on row click.
  - Header: Entity icon, code, name, operational status pill, and primary action button **`[Xem trên bản đồ]`** (smoothly switches to Map workspace, centers coordinate, highlights entity).
  - Tabbed interface:
    - **Tổng quan (Overview)**: Specifications, utility type, physical zone, GPS coordinates with copy button, lifecycle information.
    - **Liên kết & Công tơ (Relations)**: For assets, lists all attached meters with status and readings; for meters, displays host asset card with navigation link.
    - **Lịch sử chỉ số (Measurement History)**: Past readings, OCR confidence scores, photo audit preview.
  - Guarded administrative actions under **`[⋮ Quản trị]`** dropdown menu:
    - `Sửa thông tin kỹ thuật`
    - `Gán / Hủy liên kết công tơ`
    - `Đổi trạng thái vận hành`
    - `Báo cáo sự cố / Bảo trì`

---

### 2.5 Routing & Styling

#### `frontend/src/App.tsx`
- **Refactoring**:
  - Mapped `/admin/devices`, `/admin/assets`, and `/admin/meters` routes to render `DevicesWorkspacePage`.
  - Configured tab state transitions:
    - Navigating to `/admin/assets` initializes `deviceSegment = 'ASSETS'`.
    - Navigating to `/admin/meters` initializes `deviceSegment = 'METERS'`.
    - Navigating to `/admin/devices` initializes `deviceSegment = 'ALL'`.
  - Cleaned up obsolete imports and redirects.

#### `frontend/src/index.css`
- **Additions**:
  - Full styling suite for:
    - `.sgp-uwh-shift-btn`: Header shift summary button with counter pill and active glow.
    - `.sgp-devices-workspace`: Unified device workspace container.
    - `.sgp-devices-table`: High-density responsive table with hover effects, sticky header, and border styling.
    - `.sgp-segmented-control`: Rounded segmented pill buttons with active contrast styling.
    - `.sgp-shift-panel`: Slide-over rail styling for Map workspace.
    - `.sgp-entity-surface`: Drawer styling for read-first detail surface.

---

## 3. Backward Compatibility & Invariant Audit

- **Zero Database Changes**: The backend SQLite database schema and foreign keys remain untouched.
- **Dataset Frozen**: The `tan-thuan-demo-v1` baseline (12 meters, 32 assets, 24 electricity edges, 7 water edges, 5 presentation zones) is fully functional and unchanged.
- **Zero API Breaking Changes**: Client utilizes existing endpoints:
  - `GET /api/v1/assets`
  - `GET /api/v1/meters`
  - `GET /api/v1/meter-readings/rounds/active`
  - `GET /api/v1/meters/{id}/latest-reading`
