# Mobile Navigation Specification — V16E-RECOVERY-R1

## 1. Overview & Mobile Viewport Constraints

On viewports <= 1023px (specifically mobile devices at 390x844 and tablets), the permanent desktop Left Rail collapses into an accessible slide-over drawer triggered by the hamburger button in the sticky topbar.

The mobile navigation layout eliminates the horizontal desktop tab strips that previously caused layout overcrowding.

---

## 2. Mobile Topbar Specification (`AdminShell.tsx`)

The sticky mobile topbar (`.admin-mobile-topbar`) has a fixed 56px height and strictly follows the required format:

```
+-----------------------------------------------------------------------+
| [☰] [Logo] [Workspace Title]        [Dữ liệu mô phỏng] [ADMIN]       |
+-----------------------------------------------------------------------+
```

### Element Breakdown
1. **`[☰]` Hamburger Toggle Button**:
   - Toggles the full-height slide-over drawer (`admin-sidebar-expanded-drawer`).
   - Displays close icon `[X]` when drawer is open.
2. **`[Logo]` Cảng Sài Gòn Brand Icon**:
   - 28x28px circular port emblem.
3. **`[Workspace Title]` Dynamic Title**:
   - Dynamically reflects the current active workspace rather than generic static text:
     - `Bản đồ` when `activeTab === 'dashboard'`.
     - `Thiết bị` when `activeTab === 'assets' || activeTab === 'meters'`.
     - Specific tool name (`Lịch ghi`, `Phân ca`, `Báo cáo`, `Nhật ký`, `Thẩm định hồ sơ`) when inside secondary administrative tools.
4. **`[Dữ liệu mô phỏng]` Simulation Badge**:
   - Maritime disclaimer badge informing operational personnel of simulated port infrastructure data.
5. **`[ADMIN]` Role Pill**:
   - High-contrast administrative persona badge.

---

## 3. Mobile Map Internal View Switcher

When viewing the `Bản đồ` workspace on mobile (`@media (max-width: 768px)`):
- The desktop 3-column header condenses into a dedicated, compact 42px view switcher:
  ```
  +-----------------------------------------------------------------------+
  |             [ Bản đồ ]    [ Mạng lưới ]    [ Sổ ca ]                  |
  +-----------------------------------------------------------------------+
  ```
- CSS properties:
  - `.sgp-uwh-col-left`: hidden (`display: none`) to maximize horizontal tap target clearance.
  - `.sgp-uwh-col-right`: hidden (`display: none`) to eliminate horizontal scrolling.
  - `.sgp-uwh-col-center`: centered (`flex: 1; justify-content: center`).
  - `.sgp-uwh-mode-btn`: `flex: 1`, `padding: 4px 6px`, `font-size: 11px`, touch-friendly.

---

## 4. Mobile Drawer Grouping (`AdminShell.tsx`)

The slide-over drawer organizes navigation items into two clearly distinguished operational groups:

```
CẢNG SÀI GÒN
Quản trị Vận hành
[Dữ liệu mô phỏng]

HẠ TẦNG & VẬN HÀNH [Trọng tâm]
  [Icon] Bản đồ       (active indicator dot)
  [Icon] Thiết bị

CÔNG CỤ QUẢN TRỊ [Hỗ trợ]
  [Icon] Lịch ghi
  [Icon] Phân ca
  [Icon] Báo cáo
  [Icon] Nhật ký
  [Icon] Thẩm định hồ sơ

[User Card & Logout]
```

### Drawer Interaction Contract
- Tapping any item executes `onSelectTab(tabId)` and **immediately closes the drawer**.
- Pressing `Escape` or tapping the semi-transparent backdrop (`.admin-sidebar-backdrop`) dismisses the drawer.

---

## 5. Mobile Thiết bị Bug Analysis & Resolution

### Root Cause in R0
In `V16E-RECOVERY-R0`, screenshot `10-mobile-devices-390.png` captured Sổ ca instead of Thiết bị due to two intersecting defects:
1. `App.tsx` had legacy V13 code where selecting `meters` unconditionally redirected to `dashboard` and forced `sessionStorage.setItem('map_workspace_view', 'list')`.
2. Initial URL param parsing in `App.tsx` inspected `sessionStorage.getItem('admin_active_tab')` before URL parameters, causing a direct navigation to `?tab=assets` to be overridden by a previous cached `'dashboard'` state.

### Resolution in R1
1. Direct URL query parameters (`?tab=assets`, `?tab=meters`, `?tab=dashboard`) are checked first during state initialization.
2. The obsolete V13 redirect forcing `meters` to `dashboard` has been eliminated.
3. `OperationalWorkspaceContext` synchronizes `deviceSegment` and `activeTab` with `initialTab`.
4. Visual proof in `10-mobile-devices-assets.png` confirms `AdminDevicesWorkspace` renders the `Thiết bị & hạ tầng` table, and `11-mobile-devices-meters.png` confirms `Danh mục công tơ`.
