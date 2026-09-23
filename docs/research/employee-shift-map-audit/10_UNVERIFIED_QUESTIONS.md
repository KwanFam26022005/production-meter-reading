# 10 — Operational Ambiguities & Unverified Business Questions

**Document Reference:** `docs/research/employee-shift-map-audit/10_UNVERIFIED_QUESTIONS.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document formalizes the critical operational, legal, and business governance questions that cannot be resolved through source code inspection alone. Before architectural modifications or UX redesigns are implemented, these questions must be formally presented to and answered by Saigon Port operational stakeholders.

---

## 2. Workforce Scheduling & Labor Governance

### Question 1: What is the official shift rotation model for Saigon Port?
- **Current Code**: Implements arbitrary date modulo pattern (`POST /work-schedules/pattern`) with shifts CA1 (06:00–14:00), CA2 (14:00–22:00), CA3 (22:00–06:00), and HC (07:30–16:30).
- **Ambiguity**: Does the port operate under the Vietnamese industrial standard "3 ca 4 kíp" (3 shifts, 4 crews with rotating rest days), or do workers have fixed shift assignments?
- **Architectural Impact**: Governs how the auto-roster generator must be structured and whether multi-week schedule templates are required.

### Question 2: Can an employee work multiple shifts in a single calendar day?
- **Current Code**: The database enforces `uq_user_work_date (user_id, work_date)`, strictly forbidding more than one shift per day.
- **Ambiguity**: In port emergencies, vessel docking surges, or colleague sickness, are employees permitted to work split shifts or double shifts (e.g., CA1 in morning + CA3 overnight)?
- **Architectural Impact**: If yes, `work_schedules` must drop `uq_user_work_date` and introduce shift-instance primary keys or `(user_id, work_date, shift_code)` uniqueness.

### Question 3: How should overnight shift (CA3) business dates be attributed for payroll and attendance?
- **Current Code**: The system uses `now_local.strftime("%Y-%m-%d")`, which switches calendar dates at midnight, causing the 06:00 check-out to fail with HTTP 409 Conflict.
- **Ambiguity**: Does Saigon Port HR count an overnight shift (22:00 Monday to 06:00 Tuesday) as working hours on Monday (the shift start date) or Tuesday (the shift completion date)?
- **Architectural Impact**: Determines how `business_date` must be calculated in the backend attendance and payroll aggregation engine.

---

## 3. Zone Assignment & Operational Cadence

### Question 4: What is the lifecycle and cadence of a Zone Assignment?
- **Current Code**: `zone_assignments` has `effective_from` and `effective_to` with no shift or date link (standing continuous assignment).
- **Ambiguity**: Are workers assigned to zones as:
  1. Permanent departmental assignments (e.g., "Worker A always covers Wharf 1–3")?
  2. Weekly or monthly rotations?
  3. Dynamic shift-by-shift assignments (e.g., "Worker A covers Zone A on Monday Ca 1, but covers Zone B on Tuesday Ca 2")?
- **Architectural Impact**: Dictates whether `ZoneAssignment` needs a `(work_date, shift_code)` foreign key composite or should remain a standing baseline.

### Question 5: How are zone absences and emergency reassignments handled?
- **Current Code**: When leave is approved, the substitute is assigned to the requester's shift in `work_schedules`, but `zone_assignments` is **never updated**.
- **Ambiguity**: When Worker B substitutes for Worker A, is Worker B automatically responsible for Worker A's zone, or does a dispatcher explicitly assign zones during shift handover?
- **Architectural Impact**: Governs whether leave approvals should automatically cascade into zone reassignment records.

---

## 4. Meter Reading Dispatch & Accountability

### Question 6: What is the desired task dispatch model: Individual Worklist or Shared Team Pool?
- **Current Code**: Open global pool. All workers see all meters in the port; readings are unassigned.
- **Ambiguity**: Does port management require:
  - **Option A (Strict Individual Assignment)**: Each meter is dispatched to a specific worker. The worker has a personal checklist. Unread meters directly penalize that worker's KPI.
  - **Option B (Zone-Level Team Pool)**: Meters belong to a zone. Any worker assigned to that zone can read any meter in that zone. Unread meters penalize the zone crew.
  - **Option C (Free-for-All / First-Available)**: The current implementation where any worker anywhere reads whatever is convenient.
- **Architectural Impact**: Fundamental decision determining whether a new `ReadingTask` table and personal worklist API must be constructed.

### Question 7: Can workers cross zone boundaries to assist peers?
- **Current Code**: Completely unrestricted. An operator assigned to Zone A can submit readings for meters in Zone D.
- **Ambiguity**: Is cross-zone meter reading allowed, allowed only with supervisor authorization, or strictly prohibited by safety/security regulations?
- **Architectural Impact**: Determines whether `POST /api/v1/meter-logbook/readings` must reject out-of-zone submissions with HTTP 403 Forbidden.

---

## 5. Map V1 vs. Map V2 Convergence

### Question 8: What is the target-state relationship between Map V1 (Console V16) and Map V2 (Digital Twin)?
- **Current Code**: Map V1 is operational and linked to SQLite (1915×821 canvas). Map V2 is client-side demo only (1536×1024 SVG).
- **Ambiguity**: Is Map V2 intended to **replace** Map V1 entirely, or will they serve different personas (e.g., Map V1 for operations dispatch, Map V2 for executive facility digital twin)?
- **Architectural Impact**: If Map V2 is the target, all backend APIs, meter coordinates, and zone assignments must be migrated to Map V2's 1536×1024 coordinate space, and Map V1 should be marked for deprecation.

### Question 9: What is the authoritative coordinate system for physical assets?
- **Current Code**: `meters.map_x` and `map_y` store Map V1 canvas pixels. `tan_thuan_1_zones_edited.json` stores Map V2 SVG polygon vertices.
- **Ambiguity**: Are real GPS coordinates (WGS84 lat/lng) available for meters and zone perimeters, or will the port rely permanently on 2D schematic pixel projections?
- **Architectural Impact**: Determines whether GIS/spatial extensions (SpatiaLite / PostGIS) or simple 2D pixel matrices should be adopted.

---

## 6. Offline Field Operation & Connectivity

### Question 10: Do field workers require offline meter reading capability?
- **Current Code**: Completely online. All API requests (`POST /readings`, camera image upload) require instantaneous network connectivity.
- **Ambiguity**: Are there cellular dead zones in the port (e.g., inside steel electrical substations, underground valve vaults, or between high-stacked container rows)?
- **Architectural Impact**: If dead zones exist, the mobile app requires IndexedDB local storage, offline queueing, and background synchronization upon reconnecting.
