# CURRENT NAVIGATION ARCHITECTURE AUDIT

## 1. Overview & Navigational Hierarchy
The application employs a dual-tier navigation system for administrative personas, coupled with a dedicated mobile operational shell for field workers:

1. **Left Navy Rail (`AdminShell.tsx`)**:
   - 80px fixed collapsed navy rail on desktop (`aside.admin-sidebar.rail-mode`).
   - Contains 5 top-level administrative destinations:
     - `dashboard` ("Bản đồ" / Map icon)
     - `schedules` ("Lịch ghi" / Calendar icon)
     - `staff_roster` ("Phân ca" / Users icon)
     - `reports` ("Báo cáo" / BarChart3 icon)
     - `audit` ("Nhật ký" / ScrollText icon)

2. **Top Operational Cockpit Header (`OperationalWorkspaceHeader.tsx`)**:
   - Full-bleed header mounted at the top of the operational workspace when `dashboard`, `assets`, or `verification` is active.
   - Provides 5 direct mode buttons divided into two distinct operational groups:
     - **Tác nghiệp ca trực (Shift Operations)**:
       - `dashboard-map`: "Bản đồ" (Map view)
       - `dashboard-network`: "Mạng lưới" (Utility Network view)
       - `dashboard-list`: "Sổ ca ghi" (Operational List view, count = 12)
     - **Quản trị hạ tầng & thẩm định (Infrastructure & Governance)**:
       - `assets`: "Kho Thiết bị" (Asset Catalog, count = 32)
       - `verification`: "Trung tâm Đối soát" (Verification Center, count = 2)

---

## 2. Navigation Item Matrix

| Nav Item Visible Label | Internal ID | Route / State | Icon | Who Can See It | Active Condition | Destination Component |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bản đồ** (Sidebar Rail) | `dashboard` | `activeTab='dashboard'` | `Map` | ADMIN | `activeTab IN ('dashboard', 'assets', 'verification', 'meters')` | `AdminDashboard.tsx` -> `MapOperationsPage.tsx` |
| **Lịch ghi** (Sidebar Rail) | `schedules` | `activeTab='schedules'` | `Calendar` | ADMIN | `activeTab === 'schedules'` | `AdminSchedules.tsx` |
| **Phân ca** (Sidebar Rail) | `staff_roster` | `activeTab='staff_roster'` | `Users` | ADMIN | `activeTab === 'staff_roster'` | `AdminStaffRoster.tsx` |
| **Báo cáo** (Sidebar Rail) | `reports` | `activeTab='reports'` | `BarChart3` | ADMIN | `activeTab === 'reports'` | `AdminReports.tsx` |
| **Nhật ký** (Sidebar Rail) | `audit` | `activeTab='audit'` | `ScrollText` | ADMIN | `activeTab === 'audit'` | `AdminAudit.tsx` |
| **Bản đồ** (Top Cockpit) | `dashboard-map` | `activeTab='dashboard', viewMode='map'` | `Map` | ADMIN | `currentTab === 'dashboard' && viewMode === 'map'` | `OperationalScene.tsx` |
| **Mạng lưới** (Top Cockpit) | `dashboard-network` | `activeTab='dashboard', viewMode='network'` | `Share2` | ADMIN | `currentTab === 'dashboard' && viewMode === 'network'` | `UtilityNetworkView.tsx` |
| **Sổ ca ghi** (Top Cockpit) | `dashboard-list` | `activeTab='dashboard', viewMode='list'` | `List` | ADMIN | `currentTab === 'dashboard' && viewMode === 'list'` | `OperationalListView.tsx` |
| **Kho Thiết bị** (Top Cockpit) | `assets` | `activeTab='assets'` | `Boxes` | ADMIN | `currentTab === 'assets'` | `AdminAssets.tsx` |
| **Trung tâm Đối soát** (Top Cockpit) | `verification` | `activeTab='verification'` | `ClipboardCheck` | ADMIN | `currentTab === 'verification'` | `AdminVerification.tsx` |

---

## 3. Hidden Routes & Deep Links

1. **`meters` (Legacy Meter Tab)**:
   - In `App.tsx`: `handleSelectTab('meters')` intercepts and forces:
     ```ts
     sessionStorage.setItem('map_workspace_view', 'list');
     setActiveTab('dashboard');
     ```
   - Legacy URL `/?tab=meters` redirects into `dashboard` with `viewMode='list'` ("Sổ ca ghi").
   - `AdminMeters.tsx` remains in the codebase as a standalone component but is completely bypassed from primary navigation in favor of the map-first list.

2. **`inspectingReadingId` (Inspection Overlay)**:
   - When set via `workspace.openReadingInspection(readingId)`, mounts `AdminReadingInspection.tsx` on top of the entire viewport, overriding the active tab view until dismissed.

3. **`?mapCalibration=1` (Spatial Calibration Workspace)**:
   - Activates `viewMode = 'calibration'`, rendering the geometry polygon editor, landmark calibration overlay, and draft publishing panel, suppressing normal HUDs and context rails.

4. **Deep Linking Parameters**:
   - `?tab=verification&asset={id}`: Directly opens Verification tab and filters candidate by asset ID.
   - `?asset={id}`: On Map/Network, automatically sets `selectedAssetId` and frames the asset.
   - `?utility={ELECTRICITY|WATER}`: Sets utility network filter on load.
