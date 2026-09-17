# V16E-R0: Active S2/R1 Dependencies Audit

Date: 2026-09-17  
Authoritative Baseline Anchor: `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
Current Pushed HEAD: `aa80b3dd05e8f0598661e0744b56018bb2616654`  
Recovery Branch: `recovery/v16e-ui-stabilization`

---

## 1. Scope and Objective

This audit inspects the 6 frontend components introduced or heavily refactored during the S2/R1 redesign cycle. The objective is to identify all import relationships, active render paths, API touchpoints, state/context dependencies, and determine whether each component can be safely removed from the active rendering path while preserving all underlying business logic and operational truth.

---

## 2. Component Dependency Analysis

### 1. `frontend/src/components/ui/SgpPrimitives.tsx`
- **Imported by**:
  - `frontend/src/features/devices/DevicesWorkspacePage.tsx`
  - `frontend/src/features/map-operations/components/ShiftMeterPanel.tsx`
  - `frontend/src/features/map-operations/network/UtilityNetworkView.tsx`
- **Rendered by**:
  - Inactive experimental components (`DevicesWorkspacePage`, `ShiftMeterPanel`, R1 `UtilityNetworkView`).
- **API calls used**: None (pure UI presentational wrapper components).
- **State / Context dependency**: None.
- **Can be removed from active render path?**: **YES**. None of the pre-S2 stable components depend on `SgpPrimitives`.
- **Contains business logic that must be preserved?**: **NO**. Contains only styling abstractions coupled to S2/R1 layout experiments. Retained temporarily as deprecated without active imports.

---

### 2. `frontend/src/features/devices/DevicesWorkspacePage.tsx`
- **Imported by**:
  - `frontend/src/App.tsx` (lines 42, 181, 185)
  - `frontend/src/features/map-operations/network/UtilityNetworkView.tsx` (utility helper `formatAssetTypeVn`)
- **Rendered by**:
  - `App.tsx` when `adminActiveTab === 'assets'` or `adminActiveTab === 'meters'`.
- **API calls used**:
  - `getAdminAssets`, `getAdminMeters`, `getAdminMeterRelations`, `getAdminAssetNetwork`, `createAdminAsset`, `updateAdminAsset`, `deactivateAdminAsset`, `activateAdminAsset`, `createAdminMeter`, `updateAdminMeter`, `deactivateAdminMeter`, `activateAdminMeter`.
- **State / Context dependency**:
  - `useOperationalWorkspace` (`focusedEntity`, `setFocusedEntity`, `deviceSegment`, `setDeviceSegment`).
- **Can be removed from active render path?**: **YES**.
- **Contains business logic that must be preserved?**:
  - **NO**. All asset and meter CRUD, pagination, filtering, and data querying already exist in complete and stable form in `AdminAssets.tsx` and `AdminMeters.tsx`. `DevicesWorkspacePage` introduced a synthetic combined table, hardcoded presentation zones, conflated reading status strings (`readingValue = "Đã ghi"`), and uninstalled Tailwind utility classes.
  - **Resolution**: Replaced in active render path by `AdminDevicesWorkspace.tsx`, which delegates to `AdminAssets` and `AdminMeters`.

---

### 3. `frontend/src/features/devices/EntityDetailSurface.tsx`
- **Imported by**:
  - `frontend/src/features/devices/DevicesWorkspacePage.tsx` (lines 35, 852)
- **Rendered by**:
  - `DevicesWorkspacePage.tsx` as a right-side drawer when selecting an asset or meter row.
- **API calls used**:
  - `getAdminMeterLatestReading`, `getAdminMeterRelations`, `getAdminAssetOperationalContext`.
- **State / Context dependency**:
  - Receives callbacks (`onClose`, `onLocate`, `onEdit`, `onInspectReading`) and context entity props.
- **Can be removed from active render path?**: **YES**.
- **Contains business logic that must be preserved?**:
  - **NO**. Stable detail views exist in `AdminAssets.tsx` (`AdminAssetDetailModal`), `AdminMeters.tsx` edit drawer, and Map operations (`AssetContextSurface`, `MeterQuickPopup`).
  - **Resolution**: Deprecated; removed from active render path.

---

### 4. `frontend/src/features/map-operations/components/ShiftMeterPanel.tsx`
- **Imported by**:
  - `frontend/src/features/map-operations/MapOperationsPage.tsx` (lines 35, 870)
- **Rendered by**:
  - `MapOperationsPage.tsx` when `workspace?.isShiftPanelOpen` is true.
- **API calls used**:
  - None directly (receives `meters: MapMeterItem[]` from parent).
- **State / Context dependency**:
  - `workspace.isShiftPanelOpen`, `setSearchQuery`, meter selection callbacks.
- **Can be removed from active render path?**: **YES**.
- **Contains business logic that must be preserved?**:
  - **NO**. Pre-S2 stable interaction used the "Sổ ca ghi" list view (`viewMode === 'list'`) mounted within `ImmersiveSceneShell`, which natively shows all 12 shift meters with status, unit, and zone.
  - **Resolution**: Removed from active render path; Map restores pre-S2 list view.

---

### 5. `frontend/src/features/map-operations/network/UtilityNetworkView.tsx`
- **Imported by**:
  - `frontend/src/features/map-operations/shell/ImmersiveSceneShell.tsx` (line 19)
- **Rendered by**:
  - `ImmersiveSceneShell.tsx` when `viewMode === 'network'`.
- **API calls used**:
  - Receives props from `ImmersiveSceneShell` (`assets`, `connections`, `meters`, selection handlers).
- **State / Context dependency**:
  - Local selection, active utility filter (`ELECTRICITY` vs `WATER`), upstream/downstream highlight trace.
- **Can be removed from active render path?**:
  - **NO (must remain as secondary Map mode)**, but the R1 progressive schematic rewrite MUST be restored to the stable pre-R1 implementation from `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`.
- **Contains business logic that must be preserved?**:
  - **YES**. The stable pre-R1 implementation contains BFS upstream/downstream network tracing, verified-only connection filtering, utility subgraphs, and single-surface context synchronization with `AssetContextSurface`.
  - **Resolution**: Restored directly from anchor `d0165a9`.

---

### 6. `frontend/src/features/workspace/OperationalWorkspaceHeader.tsx`
- **Imported by**:
  - `frontend/src/components/admin/AdminAssets.tsx`
  - `frontend/src/components/admin/AdminVerification.tsx`
  - `frontend/src/features/map-operations/MapOperationsPage.tsx`
- **Rendered by**:
  - Top header on MapOperationsPage, AdminAssets, AdminVerification.
- **API calls used**: None directly.
- **State / Context dependency**:
  - `useOperationalWorkspace` (`setActiveTab`, `activeTab`, `isShiftPanelOpen`).
- **Can be removed from active render path?**:
  - **NO**. This is the primary top bar for Map Operations.
- **Contains business logic that must be preserved?**:
  - **YES**. Needs to cleanly provide the `rightControls` docking slot for `AdaptiveCommandBar`, clean operational titles, and operational mode navigation.
  - **Resolution**: Selectively restored from anchor `d0165a9` to eliminate all R1 Tailwind utility classes and restore docked command bar alignment.

---

## 3. Summary Action Matrix

| Component | S2/R1 Status | Recovery Action | Active Imports Post-Recovery |
| :--- | :--- | :--- | :--- |
| `SgpPrimitives.tsx` | Added in R1 | Remove from active render path | 0 |
| `DevicesWorkspacePage.tsx` | Added in S2 | Remove from active render path | 0 |
| `EntityDetailSurface.tsx` | Added in R1 | Remove from active render path | 0 |
| `ShiftMeterPanel.tsx` | Added in R1 | Remove from active render path | 0 |
| `UtilityNetworkView.tsx` | Rewritten in R1 | Restore from `d0165a9` | Mounted in `ImmersiveSceneShell` |
| `OperationalWorkspaceHeader.tsx` | Refactored in R1 | Selectively restore from `d0165a9` | Mounted in `MapOperationsPage`, etc. |
