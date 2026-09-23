# Consolidated Business, Architecture & Database Audit Report

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Document Reference:** `docs/research/employee-shift-map-audit/AUDIT_REPORT.md`  
**Audit Completed:** 2026-09-23  
**Auditor:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Execution Mode:** Read-Only Source & Architecture Audit  

---

## Executive Summary

This comprehensive audit investigated the actual implementation of employee management, work scheduling, attendance tracking, operational zone assignments, meter-reading workflows, and Map V2 within the Saigon Port platform.

The audit was executed under strict repository isolation invariants: zero branch changes, zero commits, zero code alterations, and zero database writes. Every substantive finding has been validated directly against local source files, database models, and frontend component implementations.

The overarching finding is that while individual modules (authentication, camera capture, roster grids, and canvas map rendering) exhibit functional maturity in isolation, **the core operational relationships linking Employees, Shifts, Zones, and Meter Readings are largely disconnected or unassigned**, relying on unpersisted fallbacks, client-side simulations, and out-of-band coordination.

---

## Section A: What Exists Today (Verified Baseline)

| Subsystem | Implemented & Verified Capabilities | Primary Source Artifacts |
| :--- | :--- | :--- |
| **Authentication & RBAC** | - JWT Bearer token authentication with bcrypt password hashing.<br>- Binary roles (`ADMIN` vs `EMPLOYEE`).<br>- Multi-bundle separation (`user.html` for field staff, `operations.html` for admins). | [`backend/app/auth.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/auth.py)<br>[`tests/test_two_site_auth_and_rbac.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/tests/test_two_site_auth_and_rbac.py) |
| **Shift Definitions & Roster** | - Standard shift catalog: `CA1` (06:00-14:00), `CA2` (14:00-22:00), `CA3` (22:00-06:00), `HC` (07:30-16:30), `OFF`, `LEAVE`.<br>- Desktop grid view for weekly/monthly shift scheduling.<br>- Leave request submission, review, and automatic schedule status update (`status="ON_LEAVE"`).<br>- Automated pattern rotation generator via modulo date arithmetic. | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py)<br>[`AdminStaffRoster.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminStaffRoster.tsx)<br>[`UserScheduleView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/UserScheduleView.tsx) |
| **Attendance Verification** | - Selfie photo upload with image normalization.<br>- Check-in and check-out event logging with device and server timestamps.<br>- Database unique constraint `uq_user_date_event` preventing duplicate daily entries. | [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py)<br>[`AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx) |
| **Map V1 (Console V16)** | - Operational zone polygons defined in SQLite (`OperationalZone`).<br>- Continuous standing operator assignment (`ZoneAssignment`).<br>- 1915×821 interactive canvas rendering meters and live round completion. | [`backend/app/map_operations.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py)<br>[`MapOperationsPage.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/MapOperationsPage.tsx) |
| **Map V2 (Digital Twin)** | - 1536×1024 responsive SVG digital twin of Tan Thuan 1 port facility.<br>- Zone reveal animations, utility network overlays (cables, pipes, substations).<br>- Client-side inspection drawer. | [`frontend/src/components/map-v2/MapV2Workspace.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.tsx)<br>[`tan_thuan_1_zones_edited.json`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json) |
| **Meter Reading Execution** | - Hierarchical pipeline: `ReadingBatch` → `ReadingRound` → `Meter` → `MeterReading`.<br>- Mobile camera OCR and manual reading capture.<br>- Unique constraint `uq_round_meter` preventing duplicate readings in a single round.<br>- Administrative reconciliation identifying missing meter readings. | [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py)<br>[`ReadingBatchView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/ReadingBatchView.tsx)<br>[`backend/app/admin.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py) |

---

## Section B: How Components Currently Interact

```
+---------------------------------------------------------------------------------------------------+
| ACTUAL CURRENT-STATE RUNTIME INTERACTION                                                          |
|                                                                                                   |
|  [Staff Roster]         [Map V1 Console]         [Attendance]              [Field Reading]        |
|  (AdminStaffRoster)     (MapOperationsPage)      (AttendanceView)          (ReadingBatchView)     |
|          |                      |                       |                          |              |
|          v                      v                       v                          v              |
|   work_schedules         zone_assignments       attendance_events            meter_readings       |
|   (Unpersisted           (Permanent standing    (Logged to bare date;       (Shared global pool;  |
|    fallback to CA1/OFF)   assignment; shift      NO shift or zone link;      NO user assignment;  |
|                           fictionalized)         CA3 breaks at midnight)     user_id = recorder)  |
|                                                                                                   |
|  [Map V2 Digital Twin]                                                                            |
|  (MapV2Workspace) -> Standalone static JSON; ZERO API calls; ZERO database interaction.            |
+---------------------------------------------------------------------------------------------------+
```

1. **Staff Roster to Operations**: Staff schedules are maintained in `work_schedules`. However, the table contains only overrides; unassigned days dynamically return fallback shifts (`OFF` or `CA1`). This data does **not** feed into zone assignments.
2. **Zone Assignment to Map V1**: Zone operators are stored in `zone_assignments` as permanent assignments. When rendered on Map V1, the system does not look up what shift the operator is scheduled for; it infers a synthetic shift based solely on the current hour of the reading round.
3. **Attendance to Shift & Zone**: When a worker checks in via selfie, an `AttendanceEvent` is created for today's calendar string. The system does not check what shift the employee was scheduled for, does not verify whether they are in their assigned zone, and cannot handle overnight shifts (CA3) due to calendar date mismatch.
4. **Meter Reading Dispatch**: During an active round, all active meters across all zones are dumped into a shared pool. Field employees select meters without zone restriction. When readings are recorded, `MeterReading.user_id` records who submitted the reading, but unread meters remain unassigned with zero accountability.
5. **Map V2 Isolation**: Map V2 operates in total isolation from SQLite. It visualizes simulated utility networks and hardcoded zone vertices, with zero live operational data.

---

## Section C: What Is Missing (Architectural & Operational Gaps)

1. **Missing Employee CRUD**: No UI screen and no REST API endpoints exist to create, edit, or deactivate employees (`POST /users` missing). User management is restricted to server CLI scripts.
2. **Missing Shift-Specific Zone Assignment**: `zone_assignments` has no date or shift code attributes. A worker cannot be assigned to Zone A for Ca 1 and Zone B for Ca 2.
3. **Overnight Shift (CA3) Attendance Failure**: Check-out queries `business_date = now_local.strftime("%Y-%m-%d")`. Workers on CA3 (22:00 to 06:00) checking out at 06:00 on Day 2 receive an HTTP 409 Conflict error because their check-in was registered on Day 1.
4. **Substitute Overwrite Conflict**: Approving a leave request with a substitute blindly overwrites the substitute's schedule on those dates, without checking if the substitute was already scheduled to work another shift.
5. **Missing Personal Worklists & Individual Accountability**: There is no task dispatch entity. When a round finishes with unread meters, the reconciliation engine lists `recorded_by=None`. The system cannot determine which operator was responsible for the missed meters.
6. **Map V2 Backend Integration Void**: Map V2 does not consume backend APIs, rendering it a presentation mockup rather than an operational digital twin.

---

## Section D: Risks Analysis

| Risk Area | Specific Failure Mode | Severity | Impact on Operations |
| :--- | :--- | :--- | :--- |
| **Data Integrity & Compliance** | Manual deletion of a `User` cascades and permanently deletes historical `work_schedules` and `attendance_events`. | **Critical** | Irreversible destruction of labor compliance records and payroll audit trails. |
| **Operational Continuity** | CA3 overnight workers cannot record check-out via mobile app due to the midnight date cut-off bug. | **Critical** | Night shift workers are perpetually marked as incomplete/failed attendance. |
| **Labor Scheduling Conflict** | Approving leave with a substitute silently overwrites the substitute's existing shift. | **High** | Critical port shifts are left unstaffed without dispatcher awareness. |
| **Operational Governance** | Missed meter readings have no assigned owner. | **High** | Inability to enforce accountability or evaluate field staff performance. |
| **Presentation vs Reality** | Simulated utility lines in Map V2 may be mistaken for verified physical port infrastructure. | Medium | Risk of field accidents if personnel rely on demo utility lines for maintenance. |

---

## Section E: Questions Requiring Business Confirmation

The following 5 core operational questions must be resolved with Saigon Port management:
1. **Shift Model**: Does Saigon Port use the 3-ca 4-kíp shift rotation, and are split/double shifts permitted in emergencies?
2. **CA3 Business Date**: Does HR/payroll count an overnight shift starting at 22:00 Monday as working hours for Monday or Tuesday?
3. **Zone Cadence**: Are zone assignments permanent, weekly, or dynamic per shift?
4. **Task Dispatch**: Should meter readings be assigned to individual workers (personal worklists) or handled as shared zone pools?
5. **Map Convergence**: Is Map V2 intended to replace Map V1 entirely, and what is the authoritative coordinate system for physical assets?

---

## Section F: Detailed Audit Deliverables Index

The detailed findings of this audit are partitioned across 10 specialized module reports in `docs/research/employee-shift-map-audit/`:

1. [`01_ARCHITECTURE_BASELINE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/01_ARCHITECTURE_BASELINE.md) — Git status, stack summary, multi-bundle layout, and domain classification.
2. [`02_EMPLOYEE_CRUD.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/02_EMPLOYEE_CRUD.md) — Employee data model, CLI administration tools, RBAC, and absence of user management UI.
3. [`03_SHIFT_AND_LEAVE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/03_SHIFT_AND_LEAVE.md) — Shift definitions, fallback synthesis, auto-pattern scheduling, and substitute overwrite flaw.
4. [`04_ATTENDANCE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/04_ATTENDANCE.md) — Attendance model, photo verification, lack of shift linking, and CA3 check-out failure.
5. [`05_MAP_AND_ZONE_ASSIGNMENTS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/05_MAP_AND_ZONE_ASSIGNMENTS.md) — Map V1 vs Map V2 comparison, continuous zone assignments, and fictional shift derivation.
6. [`06_METER_READING_ALLOCATION.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/06_METER_READING_ALLOCATION.md) — Reading pipeline, pool-based free-for-all, and missing accountability for unread meters.
7. [`07_CROSS_SCREEN_WORKFLOWS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/07_CROSS_SCREEN_WORKFLOWS.md) — Navigation state fragmentation, 3-step reassignment friction, and field app context blindness.
8. [`08_CURRENT_STATE_RELATIONSHIPS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/08_CURRENT_STATE_RELATIONSHIPS.md) — Current-state ERD, missing relationship callouts, and sequence flow diagrams.
9. [`09_BUSINESS_RULES_AND_GAPS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/09_BUSINESS_RULES_AND_GAPS.md) — Consolidated matrix of rules, gaps, and risks classified by audit taxonomy.
10. [`10_UNVERIFIED_QUESTIONS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/10_UNVERIFIED_QUESTIONS.md) — 10 critical business and operational questions requiring port leadership alignment.
11. [`AUDIT_REPORT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/AUDIT_REPORT.md) — This consolidated audit synthesis.
12. [`THREAD_HANDOFF.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/THREAD_HANDOFF.md) — Concise handoff brief for subsequent UX and target-state engineering threads.
