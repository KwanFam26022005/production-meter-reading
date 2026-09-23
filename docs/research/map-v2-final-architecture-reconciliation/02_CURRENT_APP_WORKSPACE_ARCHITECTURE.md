# Map V2 Final Architecture Reconciliation — 02. Current App & Workspace Architecture

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Source Code Pointers:**  
- [`frontend/src/App.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx#L882-L900)  
- [`frontend/src/components/admin/AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L17-L89)  
- [`frontend/src/context/OperationalWorkspaceContext.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/context/OperationalWorkspaceContext.tsx#L1-L167)  

---

## 1. OperationalWorkspaceProvider Mounting & Scope

A rigorous inspection of [`App.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx#L882-L900) reveals that the shared workspace provider is **already mounted at the root of the entire Admin persona**:

```tsx
// frontend/src/App.tsx Lines 882–900
if (currentUser.role === 'ADMIN') {
  return (
    <OperationalWorkspaceProvider
      initialTab={adminActiveTab}
      onTabChange={handleSelectAdminTab}
    >
      <AdminWorkspaceApp
        currentUser={currentUser}
        onLogout={handleOpenLogoutModal}
        isLogoutModalOpen={isLogoutModalOpen}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        handleConfirmLogout={handleConfirmLogout}
        handleCancelLogout={handleCancelLogout}
      />
    </OperationalWorkspaceProvider>
  );
}
```

### Key Architectural Fact
Because `OperationalWorkspaceProvider` wraps `AdminWorkspaceApp`, **EVERY single administrative workspace tab**—including `dashboard`, `assets`, `verification`, `schedules`, `staff_roster`, `meters`, `reports`, `audit`, and `map_v2`—operates within the identical context tree.

There is **NO need to invent a new global state system, Redux store, or event bus**. The existing provider already surrounds `MapV2Workspace`.

---

## 2. Active Tab Routing Architecture

In [`AdminWorkspaceApp`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx#L165-L219):

```tsx
<AdminShell user={currentUser} activeTab={adminActiveTab} onSelectTab={handleSelectTab} ...>
  {/* Inspection Modal Overlay: reading evidence */}
  {inspectingReadingId && (
    <AdminReadingInspection
      readingId={inspectingReadingId}
      onBack={() => setInspectingReadingId(null)}
      onSelectReading={(nextReadingId) => setInspectingReadingId(nextReadingId)}
    />
  )}

  {/* Active tab content: strictly isolates lifecycle */}
  {!inspectingReadingId && (
    <>
      {adminActiveTab === 'dashboard'    && <AdminDashboard ... />}
      {adminActiveTab === 'assets'       && <AdminDevicesWorkspace ... />}
      {adminActiveTab === 'verification' && <AdminVerification />}
      {adminActiveTab === 'schedules'    && <AdminSchedules ... />}
      {adminActiveTab === 'staff_roster' && <AdminStaffRoster user={currentUser} />}
      {adminActiveTab === 'meters'       && <AdminDevicesWorkspace ... />}
      {adminActiveTab === 'reports'      && <AdminReports ... />}
      {adminActiveTab === 'audit'        && <AdminAudit />}
      {adminActiveTab === 'map_v2'       && <MapV2Workspace />}
    </>
  )}
</AdminShell>
```

### Tab Lifecycle Observations
1. **Lifecycle Isolation**: Tabs unmount when inactive. Only the active tab is mounted in the DOM.
2. **Dedicated Map V2 Route**: `map_v2` is already a first-class citizen in `AdminTab` ([`AdminShell.tsx#L17`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L17)) and in the primary sidebar ([`AdminShell.tsx#L66`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L66)).
3. **Map V1 Legacy Dual-Mount**: Tab `dashboard` mounts `AdminDashboard.tsx`, which internally defaults to `MapOperationsPage.tsx` (Map V1). Map V2 exists side-by-side as `map_v2`.

---

## 3. The Shared State Graph

The [`OperationalWorkspaceContextType`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/context/OperationalWorkspaceContext.tsx#L15-L37) exposes:

```mermaid
graph TD
    Provider[OperationalWorkspaceProvider] --> State[Shared Workspace State]
    State --> S1[selectedDate: YYYY-MM-DD]
    State --> S2[selectedRoundId: UUID | null]
    State --> S3[utilityFilter: ALL | ELECTRICITY | WATER]
    State --> S4[focusedEntity: type, id, code, zoneId, coords]
    State --> S5[deviceSegment: ALL | ASSETS | METERS]
    State --> S6[inspectingReadingId: UUID | null]
    State --> S7[isShiftPanelOpen: boolean]

    Provider --> Actions[Shared Workspace Actions]
    Actions --> A1["locateOnMap(entity) -> sets focusedEntity & activeTab('dashboard')"]
    Actions --> A2["openAssetDetails(assetId) -> sets segment ASSETS & activeTab('assets')"]
    Actions --> A3["openMeterDetails(meterId) -> sets segment METERS & activeTab('assets')"]
    Actions --> A4["openVerification(assetId) -> sets activeTab('verification')"]
    Actions --> A5["openReadingInspection(readingId) -> sets inspectingReadingId overlay"]
```

### State Definitions & Behavior

| State / Action | Type | Default Value | Target Purpose | Current Consumers |
| :--- | :--- | :--- | :--- | :--- |
| `selectedDate` | `string` | Local today (`YYYY-MM-DD` Asia/Ho_Chi_Minh) | Anchor operational date across tabs | `OperationalWorkspaceContext`, `AdminDashboard` (duplicate state) |
| `selectedRoundId` | `string \| null` | `null` | Target reading round of the day | `OperationalWorkspaceContext`, `MapOperationsPage` (V1) |
| `utilityFilter` | `'ALL' \| 'ELECTRICITY' \| 'WATER'` | `'ALL'` | Global filter for utility types | `OperationalWorkspaceContext` |
| `focusedEntity` | `FocusedEntity \| null` | `null` | Entity to center/highlight across screens | `OperationalWorkspaceContext`, `AdminDevicesWorkspace` |
| `deviceSegment` | `'ALL' \| 'ASSETS' \| 'METERS'` | `'ALL'` | Sub-segment toggle in Devices workspace | `AdminDevicesWorkspace`, `App.tsx` |
| `inspectingReadingId` | `string \| null` | `null` | Triggers fullscreen reading inspection modal | `App.tsx` (renders `AdminReadingInspection`) |
| `locateOnMap()` | `(entity) => void` | Function | Switches tab to map and sets focus | Defined in context; currently routes to `'dashboard'` (V1) |
| `openReadingInspection()` | `(id) => void` | Function | Opens high-resolution OCR inspection overlay | `App.tsx`, `AdminDashboard`, `AdminSchedules`, `AdminReports` |
| `openMeterDetails()` | `(id, code) => void` | Function | Navigates to Meters table with focus | Defined in context |
| `openAssetDetails()` | `(id, code) => void` | Function | Navigates to Assets workspace | Defined in context |
| `openVerification()` | `(id) => void` | Function | Navigates to Hậu kiểm verification | Defined in context |

---

## 4. Module Consumption vs. Duplication vs. Bypass Matrix

| Module / Component | Shared Context Status | Duplicate Local State | Context Bypassed / Ignored |
| :--- | :--- | :--- | :--- |
| **`App.tsx`** | `CONSUMES` (`useOperationalWorkspace`) | Maintains session fallback for `adminActiveTab` | None; properly drives tab routing and modal overlays. |
| **`AdminShell.tsx`** | `DELEGATED` | None | Receives `activeTab` and `onSelectTab` via props from `App.tsx`. |
| **`AdminDashboard.tsx`** | `PARTIAL` | Owns local `selectedDate` via `sessionStorage` and local `viewMode` | Bypasses `OperationalWorkspaceContext.selectedDate`. |
| **`AdminDevicesWorkspace.tsx`** | `CONSUMES` | Syncs `activeSegment` with `deviceSegment` | Correctly bidirectional with shared context. |
| **`AdminMeters.tsx`** | `ISOLATED` | Owns internal search query, status filter, and type filter | Does not consume `focusedEntity` or `utilityFilter`. |
| **`AdminReports.tsx`** | `ISOLATED` | Owns `startDate`, `endDate`, `selectedLocation`, `subTab` | Does not consume `selectedDate` or `focusedEntity`. |
| **`AdminSchedules.tsx`** | `ISOLATED` | Owns internal date and round selectors | Passes `onInspectReading` to `setInspectingReadingId` via prop. |
| **`AdminStaffRoster.tsx`** | `ISOLATED` | Owns internal calendar grid month/date state | Does not consume `selectedDate`. |
| **`MapOperationsPage.tsx` (V1)** | `CONSUMES` (`useOperationalWorkspace`) | Wraps `useMapOperations` which tracks local `selectedDate` | Checks `workspace`, but largely relies on local `useMapOperations`. |
| **`MapV2Workspace.tsx` (V2)** | **`100% BYPASS`** | Owns local `selectedEntity`, `interactionMode`, `toneMode`, `utilityMode`, `viewMode`, `layerVisibility` | **Never calls `useOperationalWorkspace()`**. Completely ignores `selectedDate`, `selectedRoundId`, `utilityFilter`, `focusedEntity`, and `locateOnMap`. |

---

## 5. Architectural Verdict on Shared Workspace

1. **Map V2 is sitting inside the shared context provider, but is completely deaf to it**.  
   In [`App.tsx#L206`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx#L206), `<MapV2Workspace />` is mounted inside `<OperationalWorkspaceProvider>`, but [`MapV2Workspace.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.tsx#L1-L670) contains zero imports of `useOperationalWorkspace`.

2. **Connecting Map V2 requires ZERO backend changes**.  
   Wiring Map V2 to `selectedDate`, `selectedRoundId`, `utilityFilter`, `focusedEntity`, and `locateOnMap` is **100% a frontend state integration task**.

3. **`locateOnMap()` destination reconciliation**:  
   Currently, [`OperationalWorkspaceContext.tsx#L96`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/context/OperationalWorkspaceContext.tsx#L96) routes `locateOnMap()` to `activeTab = 'dashboard'`. Once Map V2 becomes the primary operational map, `locateOnMap()` can be updated to navigate to `'map_v2'` without affecting any backend endpoint.
