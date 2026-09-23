# Map V2 Final Architecture Reconciliation — ARCHITECTURE REPORT

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Git Baseline:** Branch `feature/v16e-network-map-overlay-r1` @ commit `5d370474112fb978105f87e7498cdc9d339471a0`  
**Execution Mode:** READ-ONLY Architecture Reconciliation  
**Date:** 2026-09-23  

---

## 1. Skill Compliance Evidence Table

In accordance with Saigon Port Agent Engineering Rules (`AGENTS.md` Section 3):

| Skill | Status | File / Section Cited | Concrete Application & Evidence |
| :--- | :---: | :--- | :--- |
| `saigon-port-ui` | `APPLIED` / `VERIFIED` | Scoped Operating Profiles — Operations & Map V2 (`SKILL.md#L50-L70`); Visual Direction (`SKILL.md#L98-L122`); Brand Palette (`SKILL.md#L124-L177`) | Designed three-axis toolbar architecture, NO_DATA neutral state design, tabular-nums formatting, maritime porcelain aesthetic, docked inspector ergonomics. |
| `banner-design` | `NOT_APPLICABLE` | — | Non-engineering marketing skill intentionally skipped. |
| `brand` | `NOT_APPLICABLE` | — | Marketing brand identity skill intentionally skipped. |
| `design` | `NOT_APPLICABLE` | — | Creative agency design skill intentionally skipped. |
| `slides` | `NOT_APPLICABLE` | — | Presentation deck generation skill intentionally skipped. |

---

## 2. Executive Synthesis & Core Reconciliation Findings

Thread 6 was convened to reconcile the findings of Thread 5 (Business & Information Density Audit) against the actual implementation reality of the local repository. 

Our core finding is that **Map V2 is NOT blocked by missing backend architecture**:

1. **Backend Map APIs are 100% Implemented**:  
   FastAPI endpoints `/api/v1/map/overview`, `/api/v1/map/zones`, `/api/v1/map/meters`, `/api/v1/map/operators`, and `/api/v1/map/zones/{zone_id}/assign` are already fully registered in `backend/app/main.py` and implemented in `backend/app/map_operations.py`. They already project date/round context, zone progress, confirmed/review/overdue counts, assigned operators, and meter semantic states.
2. **Shared Frontend Context Already Surrounds Map V2**:  
   `OperationalWorkspaceProvider` is already mounted at the root of `App.tsx` for the Admin persona. Map V2 was isolated simply because `MapV2Workspace.tsx` did not call `useOperationalWorkspace()`.
3. **Zone Mapping Architecture Exists**:  
   The database model `MapVersionZone` and endpoint `GET /api/v1/map-config/active` already support `presentation_id` ➔ `business_zone_id` translation. What is pending is merely Port confirmation of the mapping table for Map V2's 7 specific zones (`ZONE_QUAY`, etc.).
4. **Employee Data is Ready for Standing Assignees**:  
   `DEMO_MAP_V2_EMPLOYEES` can be replaced immediately with real standing assignees returned by `/api/v1/map/zones` without backend changes.
5. **Measurement Unit Gap Identified**:  
   No authoritative `measurement_unit` or `multiplier` exists in the `meters` database table (`MEASUREMENT_UNIT_DATA_GAP`). Hardcoding "kWh" or "m³" on Map V2 is prohibited; numbers must be displayed with utility-first icons (⚡/💧).
6. **Toolbar Overload Solved by Three Orthogonal Axes**:  
   The 31-control toolbar is restructured into: (A) Work Mode, (B) Overlays/Layers, and (C) Presentation Theme.

---

## 3. The 19 Direct Architecture Answers

### 1. Which Thread 5 conclusions remain valid?
- Toolbar overload (~31 controls on wide screens) mixing operational, technical, and theme concerns.
- Visual nesting in frontend geometry (`BLDG_KHO_1` and `2` inside `ZONE_GENERAL`) not supported by backend flat model.
- Strict requirement for data truthfulness disclosures on demo animations and simulated B2 networks.
- Prohibition of personal completion percentages or individual quotas for field operators.
- Compact docked inspector layout (320px–360px) does not occlude the map on desktop viewports.

### 2. Which Thread 5 classifications were incorrect or too pessimistic?
Thread 5 classified almost all operational integration items as `NEEDS_BACKEND_DATA`. In reality:
- **Map Date & Round Context**: Classified as `NEEDS_BACKEND_DATA` ➔ **Corrected to `FRONTEND_STATE_INTEGRATION`** (`overview` already takes `date` and `round_id`).
- **Zone-Level Progress**: Classified as `NEEDS_BACKEND_DATA` ➔ **Corrected to `FRONTEND_INTEGRATION_ONLY`** (`map_operations.py` already computes zone completion).
- **Assigned Employee**: Classified as `NEEDS_BACKEND_DATA` ➔ **Corrected to `FRONTEND_INTEGRATION_ONLY`** (`assigned_user` is already returned).
- **Operational Meters**: Classified as `NEEDS_BACKEND_DATA` ➔ **Corrected to `FRONTEND_INTEGRATION_ONLY`** (`MapMeterOut` already exists).
- **Zone ID Mapping**: Classified as `NEEDS_BACKEND_DATA` ➔ **Corrected to `ALREADY_AVAILABLE`** (Architecture) / `BUSINESS_RULE_REQUIRED` (Specific V2 records).

### 3. Which Map V2 features already have backend support?
- `GET /api/v1/map/overview`: Complete round projection, port KPIs, zone metrics, meter semantic states.
- `GET /api/v1/map/zones`: Active operational zones with primary assigned operators.
- `GET /api/v1/map/operators`: Active personnel available for dispatch.
- `GET /api/v1/map/meters`: Filtered meters with coordinates, utility types, and reading states.
- `POST /api/v1/map/zones/{zone_id}/assign`: Reassignment with immutable audit trail.
- `GET /api/v1/map-config/active`: Active published GIS map configuration.

### 4. Which features only need frontend integration?
- Connecting Map V2 to `OperationalWorkspaceContext` (`selectedDate`, `selectedRoundId`, `utilityFilter`).
- Replacing `DEMO_MAP_V2_EMPLOYEES` with real standing assignees from `overview.zones`.
- Rendering live zone progress pills on canvas zone cards.
- Restructuring toolbar controls into the Three-Axis architecture.
- Moving technical metadata (`CANONICAL`, `1536×1024`) and theme toggles into More menu (`⋯`).
- Client-side quick search for zones and meters.
- Deep links from inspector dock to Reading Inspection, Schedules, and Staff Roster.

### 5. Which features genuinely require backend work?
- Adding `measurement_unit` and `multiplier` columns to `meters` table (Phase C).
- Creating a date-and-shift-specific assignment table `shift_zone_assignments` (Phase C, Model B).
- Fixing CA3 overnight attendance check-out boundary bug in `attendance.py` (Phase C).

### 6. Which features require Port business confirmation?
- **BD-04**: Hierarchy aggregation rules (does Bãi tổng hợp aggregate Kho 1 & Kho 2?).
- **BD-05**: Progress denominator policy (all active meters vs scheduled meters in round).
- **BD-10**: Standing zone assignment (Model A) vs shift dispatch (Model B).
- **BD-15**: Official date for decommissioning demo moving markers.
- **BD-17**: Approval of meter coordinate normalization for Map V2's 1536×1024 canvas.
- **NEW-01**: Confirmation of measurement unit contract across utilities.

### 7. Can real standing zone assignees replace demo employees now?
**YES.**  
`GET /api/v1/map/zones` and `overview.zones` already return `assigned_user`. They can be mapped immediately to zone operator anchors as stationary markers.

### 8. Can real zone progress be displayed now?
**YES.**  
`map_operations.py` already calculates `confirmed_count`, `total_meters`, and `completion_percent` for each zone in the requested reading round.

### 9. What exactly is the valid progress denominator?
- **Formula**: Total count of active meters physically assigned to the zone (`m.is_active == True` and `m.lifecycle_status == 'ACTIVE'`).
- **Target Round Numerator**: Count of meters in that zone with status `CONFIRMED` in the selected round.
- **Label Standard**: `"Đã ghi 34 / 42 công tơ trong lượt"` (distinguishing single-round status from cumulative all-day slots).

### 10. Can Map V2 consume real meter data now?
**YES.**  
The `MapMeterOut` schema exposes meter code, utility type, location, semantic state, latest reading value, and timestamp. Once coordinate mapping for the 1536×1024 space is registered, live meter pins can be rendered immediately.

### 11. Is an authoritative measurement unit available?
**NO.**  
Audited as `MEASUREMENT_UNIT_DATA_GAP`. Neither SQLite nor FastAPI contains a unit field. Hardcoding "kWh" or "m³" on Map V2 is prohibited; display raw tabular numbers with ⚡/💧 icons.

### 12. What is the final toolbar architecture?
A **Three-Axis Architectural Model**:
- **Axis 1 (Work Mode)**: Vận hành (default) vs Kiểm tra hình học (role-gated to ADMIN).
- **Axis 2 (Overlays/Layers)**: Zones, Employees, Meters, Exceptions, Simulated Power, Simulated Water in Layer Manager.
- **Axis 3 (Presentation)**: Chuẩn kỹ thuật (Light Navy) vs Neon số (Dark Twin) in More menu (`⋯`).

### 13. What should Employee hover/inspector contain?
- **Hover (L2)**: Code, full name, zone responsibility, assignment role (`Phụ trách chính`), verified shift (if available), demo disclosure (if animated). **No personal percentages**.
- **Inspector (L3)**: Profile header, standing assignment period, verified schedule, verified attendance, **zone-level progress** (labeled as zone progress), CTA to Staff Roster.

### 14. What should Zone hover/inspector contain?
- **Hover (L2)**: Zone name, code, reading round progress (`Đã ghi X / Y công tơ`), exception count (`⚠️ Z cần kiểm tra`), round status.
- **Inspector (L3)**: Zone header, assigned operator summary, full round breakdown, list of attention meters, CTAs to Reports and Schedules. Explicit states: `NORMAL`, `REVIEW`, `OVERDUE`, `NO_DATA`, `NOT_DUE` (never render `NO_DATA` as `0%`).

### 15. What should Meter hover/inspector contain?
- **Hover (L2)**: Utility icon (⚡/💧), meter code, name, location, semantic state badge, tabular reading value (raw number), concise time.
- **Inspector (L3)**: Header, large reading hero element, confirmation metadata (submitter, timestamp, source), exception banner (if flagged), secondary OCR diagnostics, CTAs to `openReadingInspection()` and `openMeterDetails()`.

### 16. How should Map integrate with Schedules, Roster, and Reports?
Via context methods:
- To Inspection: `openReadingInspection(readingId)` ➔ mounts high-res ROI modal overlay.
- To Devices: `openMeterDetails(meterId, meterCode)` ➔ navigates to Meters tab.
- To Schedules: `setActiveTab('schedules')`.
- To Roster: `setActiveTab('staff_roster')`.
- To Reports: `setActiveTab('reports')`.
- From Schedules/Reports to Map: `locateOnMap(entity)` updated to target `'map_v2'`.

### 17. Which existing architecture should be reused?
- **Global State**: [`OperationalWorkspaceContext.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/context/OperationalWorkspaceContext.tsx).
- **Backend Services**: [`map_operations.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py) and [`map_config.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py).
- **Inspection Modal**: [`AdminReadingInspection.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminReadingInspection.tsx).

### 18. What should the next implementation phase change?
Execute **Phase A (Frontend Integration)**:
- Connect `MapV2Workspace.tsx` to `useOperationalWorkspace()`.
- Fetch live data from `getMapOverview()`.
- Restructure toolbar into the Three-Axis operational bar.
- Replace demo employees with real standing assignees.
- Wire contextual deep links.

### 19. What must it explicitly NOT change?
- **DO NOT** modify canonical B2 frozen geometry (`verify_b2_freeze_hash.mjs`).
- **DO NOT** alter camera pan/zoom/inertia physics in `MapV2Canvas.tsx`.
- **DO NOT** remove data truthfulness disclosures on simulated networks.
- **DO NOT** fabricate personal progress metrics.
- **DO NOT** implement automatic parent-child aggregation without Port approval.
- **DO NOT** hardcode unverified measurement units.
