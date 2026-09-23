# 02 — Shared Workspace Context Integration

**Scope:** Connecting Map V2 to `OperationalWorkspaceContext` without creating duplicate state stores.

---

## 1. Context Architecture

Map V2 now actively subscribes to the canonical `OperationalWorkspaceContext` (`frontend/src/context/OperationalWorkspaceContext.tsx`).

```typescript
const {
  selectedDate,
  setSelectedDate,
  selectedRoundId,
  setSelectedRoundId,
  utilityFilter,
  focusedEntity,
  setFocusedEntity,
  openReadingInspection,
  openMeterDetails,
  setActiveTab,
} = useOperationalWorkspace();
```

---

## 2. Invariant Subscriptions

1. **Schedule Date (`selectedDate`):**
   - Single authoritative date store for the entire Operations Portal.
   - When the user changes the date via the primary toolbar context trigger or another admin tab, `MapV2Workspace` triggers `fetchOverviewData(selectedDate, selectedRoundId)` and `fetchRoundsForDate(selectedDate)`.
   - Never duplicated into a local date state.

2. **Reading Round (`selectedRoundId`):**
   - Single authoritative round store.
   - Changing the reading round updates `selectedRoundId`, reloading the matching `getMapOverview(date, roundId)`.
   - Defaults to server default when `null` (`"Lượt đọc mặc định (Theo máy chủ)"`).

3. **Utility Filter (`utilityFilter`):**
   - Map V2 passes `utilityFilter` ('ALL' | 'ELECTRICITY' | 'WATER') to `MapV2Canvas` and `MapV2MeterLayer`.
   - In accordance with data truthfulness rules, filtering preserves infrastructure visibility while focusing the meter pins and network overlays on the selected utility.

4. **Cross-Screen Focus (`focusedEntity`):**
   - When external screens (Schedules, Reports, AdminDashboard) trigger `locateOnMapV2(entity)`, `focusedEntity` is populated.
   - `MapV2Workspace` synchronizes `focusedEntity`:
     - If the meter has valid spatial coordinates, Map V2 centers camera at `[map_x, map_y]`, highlights the meter pin, and opens the docked Level 3 Inspector.
     - If the meter lacks spatial coordinates, Map V2 opens the docked Level 3 Inspector with full metadata, does not render a canvas pin, and displays a non-blocking toast: `"Công tơ [MÃ] chưa xác định vị trí trên Map V2"`.
