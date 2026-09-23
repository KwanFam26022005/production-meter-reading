# 09 — Trustworthy Cross-Screen Actions & Navigation Safety

**Scope:** Cross-screen action handlers and non-destructive additive navigation contracts.

---

## 1. Additive `locateOnMap()` Contract (Section 7 Protection)

To protect legacy workflows that rely on Map V1 (`AdminDashboard`), `locateOnMap` was extended additively in `frontend/src/context/OperationalWorkspaceContext.tsx`:

```typescript
export interface LocateOnMapOptions {
  target?: 'dashboard' | 'map_v2';
}

const locateOnMap = useCallback((entity: FocusedEntity, options?: LocateOnMapOptions) => {
  setFocusedEntity(entity);
  setInspectingReadingId(null);
  const target = options?.target ?? 'dashboard'; // 100% backward compatible
  setActiveTab(target);
}, [setActiveTab]);

const locateOnMapV2 = useCallback((entity: FocusedEntity) => {
  locateOnMap(entity, { target: 'map_v2' });
}, [locateOnMap]);
```

- **Invariant:** Existing callers in `AdminSchedules`, `AdminReports`, and `AdminDevicesWorkspace` continue to route to `dashboard` (Map V1) by default.
- New call sites targeting Map V2 use `locateOnMapV2(entity)`.

---

## 2. Docked Inspector Actions

From the docked Level 3 Inspector (`MapV2InspectionPanel.tsx`):
- **Inspect Reading:** Calls `openReadingInspection(readingId)`, triggering the reading verification modal without navigating away from Map V2.
- **Open Meter Details:** Calls `openMeterDetails(meterId, meterCode)`, navigating cleanly to `meters` inventory tab with entity focus.
- **Open Zone Schedule:** Navigates to `schedules` tab.
- **Open Staff Roster:** Navigates to `staff_roster` tab.
- **Open Production Reports:** Navigates to `reports` tab.
