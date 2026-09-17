# Navigation Contract — V16E-RECOVERY-R1

## 1. System Architecture & Hierarchy

In V16E-R1, the navigation hierarchy strictly eliminates overlapping dual navigation systems by establishing a single authoritative primary navigation system and scoping the top workspace header strictly to map-internal view modes.

```
+-----------------------------------------------------------------------------------+
| Desktop Navigation System                                                         |
+---------------------+-------------------------------------------------------------+
| LEFT RAIL           | TOP WORKSPACE HEADER                                        |
| (Authoritative      | (Internal Map View Switcher Only)                           |
| Primary Navigation) |                                                             |
+---------------------+-------------------------------------------------------------+
| [Logo]              | Brand Title: "Điều Hành Không Gian & Hạ Tầng Cảng"          |
| [Bản đồ]            | Switcher: [Bản đồ] [Mạng lưới] [Sổ ca ghi]                  |
| [Thiết bị]          | (No "Kho Thiết bị", No "Trung tâm Đối soát", No Divider)    |
| --- Divider ---     | Docked Controls: Time, Round, Shift KPI, Analytics, User    |
| [...] Công cụ       |                                                             |
+---------------------+-------------------------------------------------------------+
```

---

## 2. Left Rail (Primary Workspace Navigation)

The Left Rail (`AdminShell.tsx`) is the **sole authoritative primary navigation system** on desktop viewports (>= 1024px):

1. **`[Bản đồ]` (`data-tab="dashboard"`)**:
   - Routes to the Spatial GIS Map and operational scene (`MapOperationsPage`).
   - Active contract: `activeTab === 'dashboard'`.
2. **`[Thiết bị]` (`data-tab="assets"`)**:
   - Routes to the unified Devices Workspace (`AdminDevicesWorkspace`).
   - Active contract: `activeTab === 'assets' || activeTab === 'meters'`.
   - When active, the `Bản đồ` rail button is strictly **inactive**.
3. **`--- Divider ---` (`.admin-rail-group-divider`)**:
   - Visual maritime boundary separating core operational workspaces from secondary administrative tools.
4. **`[...] Công cụ`**:
   - Secondary popover toggle (`sgp-secondary-tools-popover`).
   - Contains:
     - `Lịch ghi` (`schedules`)
     - `Phân ca` (`staff_roster`)
     - `Báo cáo` (`reports`)
     - `Nhật ký` (`audit`)
     - `Thẩm định hồ sơ` (`verification`)
   - Does **not** occupy a primary workspace tab.

---

## 3. Top Header (`OperationalWorkspaceHeader.tsx`)

The Top Header belongs exclusively to the Map operational workspace (`MapOperationsPage`):

1. **Scope**:
   - Controls internal view modes within Map operations:
     - `map`: Spatial GIS presentation with 5-zone overlays, 12 meters, camera framing, and context surfaces.
     - `network`: Single-line electrical and water topology diagram (`UtilityNetworkView`).
     - `list`: Operational shift logbook with 12 operational meters for the current shift (`Sổ ca ghi`).
2. **Removed Duplications**:
   - `Kho Thiết bị` (`data-tab="assets"`): **REMOVED**.
   - `Trung tâm Đối soát` (`data-tab="verification"`): **REMOVED**.
   - `sgp-uwh-nav-divider`: **REMOVED**.
3. **Result**:
   - Top header center navigation displays **only** `[Bản đồ] [Mạng lưới] [Sổ ca ghi]`.
   - Zero dual navigation conflict with the Left Rail.

---

## 4. Deep Linking & URL Contract

Deep links are preserved and take precedence over cached session state on direct visits:

| URL Deep Link | Active Workspace | Active Segment | Left Rail State | Top Header State |
|---|---|---|---|---|
| `/?tab=dashboard` | `MapOperationsPage` | `map` (default) | `Bản đồ` active | `[Bản đồ]` active |
| `/?tab=dashboard&view=network` | `MapOperationsPage` | `network` | `Bản đồ` active | `[Mạng lưới]` active |
| `/?tab=dashboard&view=list` | `MapOperationsPage` | `list` | `Bản đồ` active | `[Sổ ca]` active |
| `/?tab=assets` | `AdminDevicesWorkspace` | `assets` (Hạ tầng) | `Thiết bị` active | Hidden |
| `/?tab=meters` | `AdminDevicesWorkspace` | `meters` (Công tơ) | `Thiết bị` active | Hidden |
| `/?tab=schedules` | `AdminSchedules` | N/A | `Công cụ` active | Hidden |
| `/?tab=verification` | `AdminVerification` | N/A | `Công cụ` active | Hidden |

---

## 5. Active State Contract Matrix

```
activeTab === 'dashboard'     --> Bản đồ ACTIVE,   Thiết bị INACTIVE
activeTab === 'assets'        --> Bản đồ INACTIVE, Thiết bị ACTIVE (segment: 'assets')
activeTab === 'meters'        --> Bản đồ INACTIVE, Thiết bị ACTIVE (segment: 'meters')
activeTab in secondaryTools   --> Bản đồ INACTIVE, Thiết bị INACTIVE, Công cụ ACTIVE
```
