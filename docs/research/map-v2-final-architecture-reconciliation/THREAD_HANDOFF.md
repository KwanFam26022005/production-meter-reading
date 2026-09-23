# Thread Handoff — Map V2 Final Architecture Reconciliation

**Target Audience:** Frontend Engineers, Full-Stack Developers, Implementation Thread Leads  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Git Baseline:** Branch `feature/v16e-network-map-overlay-r1` @ commit `5d370474112fb978105f87e7498cdc9d339471a0`  
**Handoff Date:** 2026-09-23  
**Thread:** 6 — Map V2 Final Architecture Reconciliation  

---

## 1. Context & Purpose

This document concludes **Thread 6 (Map V2 Final Architecture Reconciliation)**. Following the business audit in Thread 5, this thread reconciled all proposed features against actual local source code, database models, FastAPI route registrations, and shared frontend workspace providers.

**Execution Integrity**:  
- **Zero source code modified**: `git status --short` remains 100% byte-for-byte identical to the session opening baseline.
- **Zero database modifications**: SQLite database and migrations untouched.
- **Zero geometry modifications**: Canonical B2 coordinates and `tan_thuan_1_zones_edited.json` preserved.
- **Deliverables**: All artifacts isolated strictly within `docs/research/map-v2-final-architecture-reconciliation/`.

---

## 2. Core Architectural Baseline for Implementation

| Domain | Verified Implementation Reality | Reference Document |
| :--- | :--- | :--- |
| **Backend Map APIs** | **100% OPERATIONAL**. `/api/v1/map/overview`, `/api/v1/map/zones`, `/api/v1/map/meters`, `/api/v1/map/operators`, and `/api/v1/map/zones/{id}/assign` are fully active. | [`03_EXISTING_BACKEND_MAP_CAPABILITIES.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/03_EXISTING_BACKEND_MAP_CAPABILITIES.md) |
| **Shared Workspace** | `OperationalWorkspaceProvider` wraps the entire Admin persona in `App.tsx`. Exposes `selectedDate`, `selectedRoundId`, `utilityFilter`, `focusedEntity`, and `locateOnMap`. | [`02_CURRENT_APP_WORKSPACE_ARCHITECTURE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/02_CURRENT_APP_WORKSPACE_ARCHITECTURE.md) |
| **Zone Mapping** | Presentation ➔ Business Zone mapping architecture is already built (`MapVersionZone`). Specific V2 zone records pending Port confirmation. | [`04_ACTIVE_MAP_CONFIGURATION_MAPPING.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/04_ACTIVE_MAP_CONFIGURATION_MAPPING.md) |
| **Employee Reality** | Real standing zone assignees exist in SQLite (`ZoneAssignment`) and can replace demo markers immediately. Shift schedules and attendance gate check-ins do NOT have zone/GPS links. | [`07_EMPLOYEE_DATA_READINESS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/07_EMPLOYEE_DATA_READINESS.md) |
| **Progress Denominator** | Map V2 projects single-round progress: $\frac{\text{Confirmed Meters in Round}}{\text{Active Meters in Zone}} \times 100$. Explicit states: `NORMAL`, `REVIEW`, `OVERDUE`, `NO_DATA`, `NOT_DUE`. Never render `NO_DATA` as `0%`. | [`06_ZONE_PROGRESS_DENOMINATOR.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/06_ZONE_PROGRESS_DENOMINATOR.md) |
| **Measurement Unit** | `MEASUREMENT_UNIT_DATA_GAP` confirmed. No unit field in DB. Prohibit hardcoded "kWh" or "m³"; render raw numbers with ⚡/💧 icons. | [`08_METER_DATA_READINESS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/08_METER_DATA_READINESS.md) |
| **Toolbar Architecture** | Three orthogonal axes: Work Mode (Ops vs Tech), Overlays (6 Layers), Presentation (Light vs Neon in More menu). Target bar: Title + Date/Round + Search + Exceptions + Layers + More. | [`09_FINAL_TOOLBAR_ARCHITECTURE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-final-architecture-reconciliation/09_FINAL_TOOLBAR_ARCHITECTURE.md) |

---

## 3. Implementation Phase Recommendation

The incoming implementation team should structure delivery across three distinct phases:

### PHASE A — FRONTEND INTEGRATION READY (Zero Backend Changes)
*Can be implemented immediately using existing endpoints and context:*
1. **Wire Shared Workspace Context**: Connect `MapV2Workspace.tsx` to `useOperationalWorkspace()` (`selectedDate`, `selectedRoundId`, `utilityFilter`).
2. **Fetch Live Map Overview**: Call `getMapOverview(selectedDate, selectedRoundId)` to load real zone progress and meter states.
3. **Restructure Target Toolbar**: Build the refined primary bar (Title, Date/Round trigger, Quick Search, Exception chip, Layer Manager, More menu).
4. **Deploy Real Zone Assignees**: Replace `DEMO_MAP_V2_EMPLOYEES` with real standing assignees from `overview.zones`, positioned at zone operator anchors.
5. **Enforce NO_DATA Neutral State**: Render "Chưa mở lượt" with neutral track when round is upcoming or unopened; never display "0%".
6. **Integrate Reading Inspection Modal**: Connect meter inspector `[Kiểm tra ảnh chỉ số]` button to `openReadingInspection(readingId)`.
7. **Redirect `locateOnMap`**: Update `OperationalWorkspaceContext.tsx` so `locateOnMap()` targets `activeTab = 'map_v2'`.

### PHASE B — REQUIRES BUSINESS DECISION (Pending Port Confirmation)
*Features blocked until Port management confirms policy:*
1. **BD-04 (Zone Aggregation)**: Confirm whether Bãi tổng hợp (`ZONE_GENERAL`) aggregates Kho 1 & 2. (Current recommendation: treat as peer zones).
2. **BD-05 (Progress Denominator)**: Confirm denominator policy for single-round vs multi-round meters.
3. **BD-15 (Decommission Demo Markers)**: Confirm official date for removing demo animated Lissajous motion.
4. **BD-17 (Meter Coordinate Calibration)**: Approve visual normalization tool for placing meters on the 1536×1024 canvas.
5. **NEW-01 (Unit Contract)**: Confirm unit policy across electricity and water.

### PHASE C — REQUIRES BACKEND / DATA EXTENSION (Target-State)
*Future schema and API enhancements:*
1. **Measurement Unit Columns**: Add `measurement_unit` and `multiplier` to `meters` table in SQLite.
2. **Shift-Specific Zone Dispatch**: Add `shift_zone_assignments` table to support date-and-shift-specific handover (Model B).
3. **CA3 Overnight Attendance Fix**: Resolve midnight 409 conflict in `attendance.py` by anchoring to shift start date.

---

## 4. Documentation Index

The complete audit and reconciliation evidence is organized in `docs/research/map-v2-final-architecture-reconciliation/`:

```text
docs/research/map-v2-final-architecture-reconciliation/
├── 01_BASELINE.md
├── 02_CURRENT_APP_WORKSPACE_ARCHITECTURE.md
├── 03_EXISTING_BACKEND_MAP_CAPABILITIES.md
├── 04_ACTIVE_MAP_CONFIGURATION_MAPPING.md
├── 05_THREAD5_CORRECTIONS.md
├── 06_ZONE_PROGRESS_DENOMINATOR.md
├── 07_EMPLOYEE_DATA_READINESS.md
├── 08_METER_DATA_READINESS.md
├── 09_FINAL_TOOLBAR_ARCHITECTURE.md
├── 10_FINAL_ENTITY_INFORMATION_CONTRACT.md
├── 11_CROSS_SCREEN_INTEGRATION.md
├── 12_BUSINESS_DECISIONS_CLEANUP.md
├── 13_IMPLEMENTATION_READINESS.md
├── ARCHITECTURE_RECONCILIATION_REPORT.md
├── THREAD_HANDOFF.md
├── thread5_reclassification_matrix.csv
├── map_backend_capability_matrix.csv
├── final_toolbar_decision_matrix.csv
├── final_entity_information_contract.csv
├── cross_screen_integration_matrix.csv
└── implementation_readiness_matrix.csv
```

*Proceed to implementation with full confidence in this verified architectural baseline.*
