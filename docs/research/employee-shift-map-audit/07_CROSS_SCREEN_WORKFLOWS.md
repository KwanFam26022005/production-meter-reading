# 07 — Cross-Screen Workflows & UI State Synchronization Audit

**Document Reference:** `docs/research/employee-shift-map-audit/07_CROSS_SCREEN_WORKFLOWS.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits navigation paths, state preservation, contextual synchronization, and operational friction across screens in both the Desktop Operations Portal (`operations.html`) and Mobile User Portal (`user.html`).

**Key Findings:**
1. **Total State Fragmentation Across Admin Tabs**: Active context (selected calendar date, shift, operational zone, reading round) is discarded whenever an administrator navigates between tabs in [`AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx).
2. **Double-Handling for Shift & Zone Reassignments**: Reassigning field duty requires an admin to modify shifts in the Staff Roster, navigate to Map V1 Console to update the zone assignment, and manually contact the worker outside the software.
3. **Context Blindness in Mobile Field App**: The field worker's [`HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx) displays today's shift code (`CA1`), but **does not display which operational zone they are assigned to**, nor does the meter reading screen pre-filter meters by zone.

---

## 2. Desktop Operations Portal Navigation & Context Flow

In [`frontend/src/components/admin/AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L110-L165):

```
+-----------------------------------------------------------------------------------+
| ADMIN CONSOLE (AdminShell.tsx)                                                    |
|                                                                                   |
| [Dashboard]  [Staff Roster]  [Reading Schedule]  [Meters]  [Map V2]  [Console V16]|
+------+-------------+----------------+---------------+---------+------------+------+
       |             |                |               |         |            |
       v             v                v               v         v            v
  +---------+   +----------+    +-----------+    +---------+ +------+   +----------+
  | Metrics |   |  Roster  |    |  Rounds   |    |  Meter  | |  V2  |   |  Map V1  |
  | Summary |   |  Matrix  |    | Generator |    |  CRUD   | | Twin |   | Console  |
  +---------+   +----+-----+    +-----+-----+    +----+----+ +---+--+   +----+-----+
                     |                |               |          |           |
                     X - - - - - - - -X - - - - - - - X - - - - -X - - - - - X
                                NO CONTEXT SHARING / NO STATE SYNC
```

### 2.1 Tab-by-Tab Context Isolation
- **Staff Roster (`AdminStaffRoster.tsx`)**:
  - Manages date window (e.g., `2026-09-20` to `2026-09-26`).
  - State is held in local React state (`useState`). Navigating away and returning resets the date picker back to current week.
  - Zero zone awareness: Roster rows only show employee names and shifts. No indication of which zone the employee is assigned to.
- **Reading Schedule (`AdminSchedule.tsx`)**:
  - Generates reading rounds and batches.
  - Has no awareness of roster staffing levels. A round can be scheduled for 08:00 without checking if any operators are scheduled for `CA1`.
- **Meter Management (`AdminMeters.tsx`)**:
  - Lists physical meters.
  - Filterable by zone dropdown, but the selected zone is not preserved when switching to Map V1 or Map V2.
- **Console V16 (`MapOperationsPage.tsx`)**:
  - Manages `ZoneAssignment` and real-time round progress on the 1915×821 canvas.
  - Completely detached from Map V2.
- **Map V2 Digital Twin (`MapV2Workspace.tsx`)**:
  - Client-side static JSON viewer. Completely isolated from all database tabs.

---

## 3. The 3-Step Reassignment Double-Handling Friction

When an employee is absent or recalled and an administrator must reassign operational duty, the software enforces high-friction manual coordination:

```
+-----------------------------------------------------------------------------------+
| 1. Staff Roster (AdminStaffRoster.tsx)                                            |
|    - Admin changes Worker A from CA1 to LEAVE.                                    |
|    - Admin changes Worker B from OFF to CA1.                                      |
+-----------------------------------------+-----------------------------------------+
                                          | (Manual Context Switch)
                                          v
+-----------------------------------------------------------------------------------+
| 2. Map Console V16 (MapOperationsPage.tsx)                                        |
|    - Admin navigates to Map Console.                                              |
|    - Admin locates Zone B.                                                        |
|    - Admin reassigns Zone B from Worker A to Worker B.                            |
|    - (System does NOT check if Worker B was actually scheduled in Step 1!)        |
+-----------------------------------------+-----------------------------------------+
                                          | (Out-of-Band Communication)
                                          v
+-----------------------------------------------------------------------------------+
| 3. External Messaging (Zalo / Phone / Radio)                                      |
|    - The platform has NO push notifications or field alerts.                      |
|    - Admin must call Worker B to notify them of the zone change.                  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Mobile Field Worker Experience & Gaps

In [`frontend/src/components/HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx#L85-L160):

### 4.1 HomeHub Screen Breakdown
- **Identity Card**: Shows avatar selfie, full name, employee code, and today's shift badge (`Ca 1 (06:00 - 14:00)`).
- **Attendance Card**: Displays Check-In time and button to Check-Out.
- **Action Shortcuts**:
  1. *Điểm danh* -> Navigates to `AttendanceView.tsx`.
  2. *Lịch trực* -> Navigates to `UserScheduleView.tsx`.
  3. *Ghi chỉ số* -> Navigates to `ReadingBatchView.tsx`.

### 4.2 Critical Disconnections in the Field Flow
1. **Unassigned Zone Blindness**:
   - The worker's home screen tells them they are working `CA1`, but **does not state which operational zone they are responsible for**.
   - If the worker does not remember or wasn't told verbally, there is no place in `user.html` to inspect their assigned zone.
2. **Global Meter List Dump**:
   - When tapping *Ghi chỉ số*, the worker enters `ReadingBatchView`.
   - The screen defaults to showing every active meter across the entire port (Zone A, B, C, D).
   - The worker must manually remember their zone, tap the zone dropdown, and select it every time they open the screen.
3. **No Dynamic Task Dispatch**:
   - If a supervisor reassigns Zone C to this worker while they are in the field, no notification is received, and no visual prompt updates their worklist.
