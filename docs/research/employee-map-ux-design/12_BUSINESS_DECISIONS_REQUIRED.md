# 12 — Strategic Business Decisions & Governance Register

**Document Reference:** `docs/research/employee-map-ux-design/12_BUSINESS_DECISIONS_REQUIRED.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document formalizes the six strategic operational and policy decisions that must be resolved by **Saigon Port executive leadership** prior to initiating production engineering. For each item, the operational context, alternatives, and technical impacts are structured to enable rapid executive sign-off.

---

## 2. Executive Decision Register

```
+----------------------------------------------------------------------------------------------------+
|                                    EXECUTIVE DECISION REGISTER                                     |
+----+--------------------------------+----------------------------+---------------------------------+
| #  | Decision Area                  | Recommended Option         | Impacted Subsystems             |
+----+--------------------------------+----------------------------+---------------------------------+
| 1  | Operating Assignment Model     | Hybrid Model (Shift-Duty)  | models.py, Map V2, Roster       |
| 2  | Task Dispatch Granularity      | Zone-Level Team Pool       | ReadingBatchView, admin.py      |
| 3  | CA3 Overnight Business Date    | Anchor to Shift Start Date | attendance.py, payroll reports  |
| 4  | Split / Double Duty Policy     | Allow with Supervisor Flag | models.py (uq_user_work_date)   |
| 5  | Map V1 vs V2 Convergence       | Retire V1; Standardize V2  | MapOperationsPage, portMapConfig|
| 6  | Offline Field Operation        | Local Offline Queueing     | Service Worker, IndexedDB       |
+----+--------------------------------+----------------------------+---------------------------------+
```

---

### Decision 1: Operating Assignment Model Selection
- **The Question**: How should operators be bound to zones?
  - **Option 1 (Model A)**: Permanent standing assignment. Simple, but inflexible across rotating 3-ca 4-kíp shifts.
  - **Option 2 (Model B)**: Dynamic assignment for every 8-hour shift. High flexibility, moderate dispatcher overhead.
  - **Option 3 (Hybrid - RECOMMENDED)**: Default standing zones auto-populate shifts, with dispatcher override capability.
- **Architectural Consequence**: If Option 3 is approved, backend adds table `shift_zone_assignments` and updates Map V2 queries.

---

### Decision 2: Task Dispatch Granularity
- **The Question**: When an inspection round begins, are meters assigned to individuals or to the zone crew?
  - **Option 1 (Individual Checklist)**: Each meter has a specific assignee. High accountability, high dispatch friction.
  - **Option 2 (Zone Team Pool - RECOMMENDED)**: All active meters in Zone A belong to the Zone A shift crew. Any crew member can read; unread meters penalize the crew on duty.
  - **Option 3 (Free-for-All)**: Current legacy state. Any worker anywhere reads whatever they want; zero accountability.
- **Architectural Consequence**: Approving Option 2 binds round reconciliation to active shift zone operators, eliminating `recorded_by=None` ambiguity.

---

### Decision 3: Overnight Shift (CA3) Business Date Attribution
- **The Question**: How does port HR define the working date of an overnight shift (22:00 Monday to 06:00 Tuesday)?
  - **Option 1 (Start-Date Anchoring - RECOMMENDED)**: The entire 8-hour shift is attributed to Monday (`business_date = "2026-09-21"`). Check-out at 06:00 Tuesday matches Monday’s check-in.
  - **Option 2 (Completion-Date Anchoring)**: Attributed to Tuesday.
  - **Option 3 (Split Hours)**: 2 hours on Monday, 6 hours on Tuesday.
- **Architectural Consequence**: Approving Option 1 eliminates the HTTP 409 Conflict bug in [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L206) with zero impact on single-day shifts.

---

### Decision 4: Split Shifts & Emergency Double Shifts
- **The Question**: Are employees ever allowed to work two shifts in one calendar day (e.g. Ca 1 + Ca 3)?
  - **Option 1 (Strict Single Shift)**: Keep `uq_user_work_date`. Never allow >1 shift per day.
  - **Option 2 (Permitted with Override - RECOMMENDED)**: Drop `uq_user_work_date`, enforce uniqueness on `(user_id, work_date, shift_code)`, and require manager approval for double shifts.
- **Architectural Consequence**: Enables legal coverage during typhoon alerts or sudden vessel surges.

---

### Decision 5: Map V1 vs. Map V2 Convergence Strategy
- **The Question**: What is the roadmap for Map V1 (Console V16) vs. Map V2 (Digital Twin)?
  - **Option 1 (Unified Map V2 - RECOMMENDED)**: Migrate all operational APIs to Map V2’s 1536×1024 coordinate system. Deprecate legacy Map V1 entirely.
  - **Option 2 (Dual Systems)**: Keep V1 for daily dispatch and V2 for executive presentation. (High maintenance cost, duplicate coordinates).
- **Architectural Consequence**: Unifies all developer effort on the modern SVG digital twin.

---

### Decision 6: Offline Field Connectivity Requirements
- **The Question**: Do field technicians experience cellular blind spots in container rows or electrical vaults?
  - **Option 1 (Online Only)**: Current implementation. Requires constant 4G/Wi-Fi.
  - **Option 2 (Offline Queueing - RECOMMENDED)**: Cache active round meters in IndexedDB; capture readings and photos offline; auto-sync upon returning to wharf Wi-Fi.
- **Architectural Consequence**: Adds Service Worker and offline store to `user.html`.
