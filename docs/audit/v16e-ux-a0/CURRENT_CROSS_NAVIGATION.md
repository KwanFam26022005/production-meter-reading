# CURRENT CROSS-NAVIGATION & SELECTION STATE AUDIT

## 1. Cross-Navigation Graph

```
                   ┌─────────────────────────────────────────┐
                   │               AdminShell                │
                   └────────────────────┬────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│     Bản đồ (Map)     │     │  Kho Thiết bị (Asset)│     │     Đối soát (Verif) │
│ (Map/Network/List)   │     │  (AdminAssets.tsx)   │     │(AdminVerification.tsx│
└──────────┬───────────┘     └──────────┬───────────┘     └──────────┬───────────┘
           │                            │                            │
           ├─ locateOnMap() ◄───────────┤                            │
           ├─ openAssetDetails() ──────►│                            │
           ├─ openVerification() ───────┼───────────────────────────►│
           │                            ├─ verifyEvidence() ◄────────┤
           │                            ├─ deep-link ?asset=id ◄─────┤
           ▼                            ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  AssetContextSurface │     │  Asset Detail Drawer │     │  Review Modal        │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### Direct Navigation Traces:
1. **Asset Table -> Map**:
   - User clicks `MapPin` icon on any asset row with valid coordinates.
   - Triggers `workspace.locateOnMap({ type: 'asset', id, coordinates })`.
   - Transitions `activeTab` to `'dashboard'`, sets `viewMode` to `'map'`, centers the camera on canonical coordinates with safe right rail padding.
2. **Asset Table -> Verification**:
   - User clicks `"Thẩm định hồ sơ"` in asset drawer or context surface.
   - Triggers `workspace.openVerification(assetId)`.
   - Transitions `activeTab` to `'verification'`, filters candidate list by asset ID.
3. **Map / Network -> Asset Details**:
   - Clicking an asset glyph or network node opens `AssetContextSurface` right rail.
   - Clicking `"Xem hồ sơ chi tiết"` inside `AssetContextSurface` calls `workspace.openAssetDetails(assetId)`.
   - Transitions `activeTab` to `'assets'`, opens the full AdminAssets detail drawer.
4. **List -> Map**:
   - Clicking a meter row selects the meter and opens `UnifiedContextSurface` (`meter-detail`).
   - Clicking `"Xem trên bản đồ"` switches `viewMode` to `'map'` and pans/zooms to the meter pin.

---

## 2. Selection State Analysis

| Selection State Variable | Scope | Storage Location | Survives View Switch? | Reset Trigger |
| :--- | :--- | :--- | :--- | :--- |
| `selectedMeterId` | Local to MapOps | `useMapStateMachine` (selectedEntity) | Yes (switching between Map and List preserves selected meter) | Click blank canvas, click close `[X]`, press ESC |
| `selectedAssetId` | Shared across Map & Network | `MapOperationsPage` local state + URL `?asset=` | Yes (switching between Map and Network retains asset selection) | Click canvas background, press ESC, or clear action |
| `selectedZoneId` | Local to Map | `useMapStateMachine` (selectedEntity) | Resets to null on switching to List | Click outside zone polygon, press ESC |
| `focusedEntity` | Global Workspace | `OperationalWorkspaceContext` | Yes (transfers selection across Tabs: Assets -> Map) | Overwritten when new entity is focused |
| `selectedDate` | Global Workspace | `OperationalWorkspaceContext` + sessionStorage | Yes (persists across all tabs and page refreshes) | Date picker selection change |
| `selectedRoundId` | Global Workspace | `OperationalWorkspaceContext` | Yes (preserved when switching tabs) | Shift selection change |
| `utilityFilter` | Global Workspace | `OperationalWorkspaceContext` | Yes (persisted in workspace, synced with Map & Network) | Utility selector click (ALL / ELECTRICITY / WATER) |
| `inspectingReadingId` | Global Workspace | `OperationalWorkspaceContext` | Overlays entire viewport; returns to previous tab on back | Back button click or Escape |
