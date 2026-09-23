# Thread Handoff — Business & Architecture Audit Baseline

**Target Audience:** UX Researchers, Product Designers & Target-State Software Architects  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Git Baseline:** Branch `feature/v16e-network-map-overlay-r1` @ commit `5d370474112fb978105f87e7498cdc9d339471a0`  
**Handoff Date:** 2026-09-23  

---

## 1. Context & Purpose of this Handoff

This document concludes **Thread 2 (Employee, Shift & Map V2 Business Audit)**. It encapsulates the factual, code-verified current state of the platform to serve as the launchpad for subsequent threads dedicated to **UX research, workflow redesign, and target-state engineering**.

No source code was modified, no database migrations were applied, and no speculative features were created. All observations reflect the local codebase as of commit `5d37047`.

---

## 2. Core Architectural Invariants (Current Ground Truth)

| Domain | Current Implementation Reality | Code Pointer |
| :--- | :--- | :--- |
| **Employee Admin** | **No UI and No REST API**. User creation and credential administration exist solely as backend Python CLI scripts (`backend/scripts/create_user.py`). | [`models.py#L22`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L22), [`create_user.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/scripts/create_user.py) |
| **Shift Assignment** | **Single shift per calendar day** (`uq_user_work_date`). Schedule grids display **unpersisted fallback shifts** (`CA1` / `OFF`) unless explicitly edited and saved. | [`models.py#L183`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L183), [`work_schedule.py#L140`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L140) |
| **Leave & Substitutes** | Approving a leave request with a substitute **silently overwrites the substitute's schedule** without conflict checks. | [`work_schedule.py#L320`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L320) |
| **Attendance** | Logged against a calendar date string. **Disconnected from shifts and zones**. **Overnight CA3 shifts crash at check-out** (HTTP 409 Conflict) due to midnight date cut-off. | [`models.py#L203`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L203), [`attendance.py#L206`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L206) |
| **Map V1 vs V2** | **Two separate worlds**. Map V1 uses SQLite and continuous standing assignments (`effective_from`), showing fictional shifts. Map V2 is client-side SVG demo using static JSON with **zero backend API calls**. | [`MapOperationsPage.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/MapOperationsPage.tsx), [`MapV2Workspace.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.tsx) |
| **Task Allocation** | **Open pool free-for-all**. Meters are never dispatched to individual workers. Any worker can read any meter in any zone. Unread meters have `recorded_by=None` (zero accountability). | [`meter_logbook.py#L90`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py#L90), [`admin.py#L1660`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py#L1660) |

---

## 3. Critical Recommendations for the Target-State Thread

When designing target-state workflows and UX, the incoming team should focus on these 5 architectural pillars:

1. **Build Unified Employee Management**:
   - Provide REST API endpoints (`GET/POST/PUT/DELETE /api/v1/employees`) and a dedicated Admin UI tab.
   - Enforce soft-deactivation (`is_active=False`) rather than database cascades to protect audit trails.
2. **Resolve the CA3 Overnight Attendance Defect**:
   - Attribute attendance to a `WorkSchedule` or shift anchor date rather than wall-clock `now().strftime("%Y-%m-%d")`.
   - Ensure workers checking out at 06:00 match against the previous evening's check-in.
3. **Link Shift Schedules to Zone Assignments**:
   - Replace permanent `ZoneAssignment` with date-and-shift-aware assignments: `(user_id, zone_id, work_date, shift_code)`.
   - Enable dispatchers to visualize zone coverage directly on the Staff Roster grid.
4. **Transition to Personal Worklists or Zone-Bound Pools**:
   - Allow dispatchers to assign reading rounds to specific operators or zone crews.
   - Restrict field workers' default views in `user.html` to their assigned meters/zones.
   - Record who was responsible when a meter is missed.
5. **Bridge Map V2 to the Operational Database**:
   - Connect `MapV2Workspace.tsx` to backend APIs (`/api/v1/operational-zones`, `/api/v1/meters`).
   - Define a single authoritative coordinate system or transformation matrix.
   - Remove hardcoded mock data and replace with live database queries.

---

## 4. Documentation Index

The complete audit evidence is located in `docs/research/employee-shift-map-audit/`:

```text
docs/research/employee-shift-map-audit/
├── 01_ARCHITECTURE_BASELINE.md
├── 02_EMPLOYEE_CRUD.md
├── 03_SHIFT_AND_LEAVE.md
├── 04_ATTENDANCE.md
├── 05_MAP_AND_ZONE_ASSIGNMENTS.md
├── 06_METER_READING_ALLOCATION.md
├── 07_CROSS_SCREEN_WORKFLOWS.md
├── 08_CURRENT_STATE_RELATIONSHIPS.md
├── 09_BUSINESS_RULES_AND_GAPS.md
├── 10_UNVERIFIED_QUESTIONS.md
├── AUDIT_REPORT.md
└── THREAD_HANDOFF.md
```

*Proceed to target-state UX research and design with full confidence in this verified baseline.*
