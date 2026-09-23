# 03 — Existing Backend Map API Overview Consumption

**Scope:** Consuming `getMapOverview` and `getAdminSchedules` without backend modifications or duplicate endpoints.

---

## 1. Endpoints Consumed

1. **`getMapOverview(date?: string, roundId?: string): Promise<MapOverviewResponse>`**
   - Location: `frontend/src/services/api.ts` -> `/api/v1/map/overview`
   - Returns:
     - `map_version`: version tag
     - `target_date`: target date string
     - `current_round_time`: time of active round
     - `current_round_status`: status of active round ('OPEN' | 'CLOSED' | etc.)
     - `zones`: Array of `OperationalZoneOut` (zone operational stats, assigned user, counts)
     - `meters`: Array of `MapMeterOut` (coordinates, reading status, utility type, meter type)

2. **`getAdminSchedules(date?: string): Promise<ReadingRoundListResponse>`**
   - Location: `frontend/src/services/api.ts` -> `/api/v1/admin/schedules`
   - Returns list of `ReadingRound` for the date, populating the reading round selector in the context popover.

---

## 2. Non-Blocking Degraded Error Handling

- **Invariants:**
  - Map geometry (`tan_thuan_1_zones_edited.json`) must NEVER be cleared or replaced with a blank screen when network or backend requests fail.
  - When `getMapOverview` throws an error, `loadingOverview` terminates, `overviewError` is recorded, and a non-blocking degraded operational banner is rendered atop the workspace.
  - An inline "Thử lại" (Retry) action calls `fetchOverviewData(selectedDate, selectedRoundId)` cleanly.
  - The canvas remains 100% interactive for inspection and review in read-only/offline mode.
