# Visual Comparison Audit (V16E-R0)

Date: 2026-09-17  
Baseline Anchor: `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
Redesign Commit: `aa80b3dd05e8f0598661e0744b56018bb2616654`  
Recovery Branch: `recovery/v16e-ui-stabilization`

---

## 1. Scope and Methodology

This document records the factual visual and layout behavior across 5 operational surfaces:
1. **MAP** (Bản đồ)
2. **NAV** (Thanh điều hướng & Rail)
3. **NETWORK** (Mạng lưới)
4. **DEVICES** (Thiết bị)
5. **MOBILE** (Giao diện di động 390px)

Comparisons are made between three states:
- **d0165 behavior**: Pre-S2/R1 stable production baseline anchor.
- **aa80b3d behavior**: Pushed HEAD containing S2/R1 experiments.
- **recovery behavior**: Active state in `recovery/v16e-ui-stabilization`.
- **remaining difference**: Objective delta between `d0165` and `recovery`.

Per Section 20 instructions, subjective quality descriptors ("improved", "beautiful", "production ready") and self-scoring are omitted.

---

## 2. Surface-by-Surface Factual Comparison

### A. MAP (Bản đồ không gian)

- **d0165 behavior**:
  - Full-bleed satellite map of Tân Thuận port (1915 x 821 canonical coordinates).
  - 5 active presentation zones with authoritative bounds and Vietnamese labels.
  - 12 canonical meter pins with status-coded rings (CONFIRMED green, DUE amber, INACTIVE gray).
  - Top header (`OperationalWorkspaceHeader`) contains left title "Điều Hành Không Gian & Hạ Tầng Cảng", center mode selector (`[Bản đồ] [Mạng lưới] [Sổ ca ghi]`), and right docked `AdaptiveCommandBar` (temporal date, shift picker, search, filter, export, analytics, calibration).
  - Selecting a meter opens `MeterQuickPopup` or `MeterDetailSurface`.
  - Shift meters inspected via the "Sổ ca ghi" (`viewMode === 'list'`) mode in `ImmersiveSceneShell`.

- **aa80b3d behavior**:
  - Replaced docked `AdaptiveCommandBar` with a custom header layout containing raw text inputs (`placeholder="Tìm kiếm công tơ..."`), inline SVG icons, and a shift progress pill (`0/12 Đã ghi`).
  - Clicking the shift progress pill opened `ShiftMeterPanel` as a right-side slide-over panel over the map canvas.
  - Used uninstalled Tailwind utility classes (`bg-slate-800`, `text-sky-400`, `rounded-md`).
  - View mode switch was stripped down to `[Không gian] [Mạng lưới]`.

- **recovery behavior**:
  - Restored pre-S2 `OperationalWorkspaceHeader` and docked `AdaptiveCommandBar` from `d0165`.
  - Re-established `[Bản đồ] [Mạng lưới] [Sổ ca ghi]` view mode navigation.
  - Removed `ShiftMeterPanel` slide-over panel from active rendering path.
  - Preserved 5 presentation zones, 12 meters, 32 assets, canonical coordinates, calibration access, and status invariants.

- **remaining difference**:
  - Zero functional or layout difference on the Map surface between `d0165` and `recovery`.

---

### B. NAV (Điều hướng & Navigation Rail)

- **d0165 behavior**:
  - Desktop 80px permanent navy rail displayed:
    1. Logo
    2. Bản đồ (`dashboard`)
    3. Lịch ghi (`schedules`)
    4. Phân ca (`staff_roster`)
    5. Báo cáo (`reports`)
    6. Nhật ký (`audit`)
    7. User avatar & Logout
  - Active state bug: `isItemActive('dashboard')` returned true when viewing `assets`, `verification`, or `meters`.
  - Access to `assets` and `verification` was only through mode buttons inside `OperationalWorkspaceHeader`.

- **aa80b3d behavior**:
  - Desktop rail changed to two primary entries:
    1. Bản đồ
    2. Thiết bị
    3. Secondary tools popover `[…] Công cụ` (containing Lịch ghi, Phân ca, Báo cáo, Nhật ký, Thẩm định hồ sơ).
  - Popover styled with inline hex dark slate colors (`#0F172A`).
  - Active state bug partially addressed by separating `dashboard` and `assets`.

- **recovery behavior**:
  - Retained the approved two-workspace primary rail navigation:
    1. `[Bản đồ]` (active strictly when `activeTab === 'dashboard'`).
    2. `[Thiết bị]` (active when `activeTab === 'assets' || activeTab === 'meters'`).
    3. Divider.
    4. `[…] Công cụ` secondary popover.
    5. User avatar & Logout.
  - Popover styled using semantic classes in `frontend/src/index.css` (`.sgp-secondary-tools-popover`, `.sgp-popover-item`, etc.) with `--sgp-brand-800` background and `--sgp-border` tokens.
  - Correct active state invariant enforced: Bản đồ is not highlighted when viewing Thiết bị or secondary tools.

- **remaining difference**:
  - Navigation rail presents two primary workspaces (`Bản đồ` and `Thiết bị`) instead of the pre-S2 flat list of five items (`Bản đồ`, `Lịch ghi`, `Phân ca`, `Báo cáo`, `Nhật ký`). Secondary items are accessed via the `Công cụ` popover/drawer.

---

### C. NETWORK (Mạng lưới tiện ích)

- **d0165 behavior**:
  - Graph-driven SVG/Canvas topology rendered inside `ImmersiveSceneShell`.
  - Displays 32 assets and verified connections from `getAdminAssetNetwork`.
  - Utility switch toggles between Electricity (`ELECTRICITY`) and Water (`WATER`).
  - Selecting an asset node triggers algorithmic BFS upstream and downstream path highlighting.
  - Selecting a node coordinates with `AssetContextSurface` drawer.
  - Default view filters out unverified connections.

- **aa80b3d behavior**:
  - Rewritten into a progressive schematic explorer with hardcoded node coordinates (`SIM-SUB-01`, `SIM-SWB-01`, `SIM-SWB-02`, etc.) and artificial lane grouping.
  - Introduced unapproved horizontal flow layout and collapse/expand cards.
  - Extensive reliance on uninstalled Tailwind utility classes and `SgpPrimitives`.

- **recovery behavior**:
  - Restored `UtilityNetworkView.tsx` from `d0165a9`.
  - Re-established dynamic graph-driven rendering without hardcoded coordinates.
  - Retained BFS path traversal, verified-only default filtering, and utility toggle.
  - Documented as preserved functionality only in `NETWORK_NOT_VISUALLY_APPROVED.md`.

- **remaining difference**:
  - Zero difference between `d0165` and `recovery`.

---

### D. DEVICES (Thiết bị & Công tơ)

- **d0165 behavior**:
  - `AdminAssets.tsx` and `AdminMeters.tsx` were two separate administration screens.
  - `AdminAssets` was accessible via `Kho Thiết bị` in `OperationalWorkspaceHeader`.
  - `AdminMeters` was accessible via direct URL or legacy admin tab, displaying a list table with search, status filter, type filter, and edit drawer.
  - There was no unified "Thiết bị" product workspace wrapping both.

- **aa80b3d behavior**:
  - Introduced `DevicesWorkspacePage.tsx` and `EntityDetailSurface.tsx`.
  - Merged assets and meters into a single synthetic table.
  - Hardcoded Tan Thuan presentation zones (`zone-container`, `zone-wharf`, `zone-cfs`, `zone-substation`, `zone-admin`).
  - Mapped numeric reading values to string status badges (`readingValue = "Đã ghi"`).
  - Styled with uninstalled Tailwind utility classes.

- **recovery behavior**:
  - Removed `DevicesWorkspacePage.tsx` and `EntityDetailSurface.tsx` from the active render path (marked deprecated).
  - Created `AdminDevicesWorkspace.tsx` providing an operational sub-tab switcher:
    `THIẾT BỊ [ Hạ tầng ] [ Công tơ ]`.
  - Tab `[ Hạ tầng ]` mounts the stable `AdminAssets` component.
  - Tab `[ Công tơ ]` mounts the stable `AdminMeters` component.
  - Asset and meter data models, CRUD logic, API contracts, and read representations remain completely segregated and un-merged.
  - Zone filtering and reading status logic remain dynamic and authoritative.

- **remaining difference**:
  - `AdminAssets` and `AdminMeters` are now unified under a single primary workspace entry point (`Thiết bị`) with a top tab switcher `[ Hạ tầng ] [ Công tơ ]`, rather than being separate disconnected admin routes.

---

### E. MOBILE (Giao diện di động 390px)

- **d0165 behavior**:
  - Mobile top bar with hamburger toggle (`.admin-sidebar-toggle-btn`), port logo, title, and simulation badge.
  - Tapping toggle opens full-height drawer (`.admin-sidebar-expanded-drawer`, 320px) over backdrop.
  - Map view centers with responsive camera framing and auto-condensed toolbars.

- **aa80b3d behavior**:
  - Mobile layout suffered from broken utility classes (`md:hidden`, `flex-col`, `w-full` not defined).
  - Shift meter panel opened as a bottom sheet with uninstalled utility styling.
  - Synthetic devices table suffered horizontal overflow without proper table wrapping.

- **recovery behavior**:
  - Clean mobile top bar with hamburger menu toggle.
  - Mobile drawer displays primary entries (`Bản đồ`, `Thiết bị`) and secondary tools (`Lịch ghi`, `Phân ca`, `Báo cáo`, `Nhật ký`, `Thẩm định hồ sơ`).
  - Map operations viewport renders with responsive mobile framing.
  - Thiết bị workspace sub-tabs (`[ Hạ tầng ] [ Công tơ ]`) fit comfortably within 390px width with horizontal scroll support on data tables.

- **remaining difference**:
  - Drawer menu categorizes items into "KHÔNG GIAN & HẠ TẦNG" (Trọng tâm) and "CÔNG CỤ QUẢN TRỊ" (Hỗ trợ) reflecting the two-primary-workspace architecture.
