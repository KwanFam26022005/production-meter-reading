# 09 — Contextual Administrative CRUD & Operational Workflows

**Document Reference:** `docs/research/employee-map-ux-design/09_CRUD_AND_INTERACTION_FLOWS.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies the core administrative CRUD workflows connecting employees, shifts, zones, and meter readings. It adheres to the architectural principle that **the map serves as a contextual launchpad**, while detailed data entry, validation, and multi-step forms take place in dedicated panels or modal workspaces to prevent map interaction friction.

---

## 2. Specification of the 7 Administrative Workflows

```
+----------------------------------------------------------------------------------------------------+
|                                  ADMINISTRATIVE WORKFLOWS MATRIX                                   |
+----+--------------------------------+--------------------+---------------------+-------------------+
| #  | Workflow                       | Entry Point        | Form Medium         | Backend Readiness |
+----+--------------------------------+--------------------+---------------------+-------------------+
| 1  | Employee → View Profile        | Map marker click   | Inspector Panel     | PARTIAL (Needs UI)|
| 2  | Zone → View Responsible Staff  | Zone polygon click | Inspector Panel     | IMPLEMENTED       |
| 3  | Zone → Assign/Replace Operator | Inspector CTA      | Modal Sheet         | PARTIAL (Needs API|
| 4  | Shift → View Assigned Staff    | Header Shift chip  | Slide-out Roster    | IMPLEMENTED       |
| 5  | Shift → Identify Uncovered Zone| Alert badge click  | Filtered Map View   | PROPOSED DESIGN   |
| 6  | Round → View Pending Meters    | Header Round pill  | Meter Drawer        | IMPLEMENTED       |
| 7  | Meter → View History & Provenance| Map meter point  | Inspection Drawer   | IMPLEMENTED       |
+----+--------------------------------+--------------------+---------------------+-------------------+
```

---

### Workflow 1: Employee → View Profile
- **Entry Point**: Click on Employee Marker (Variant B) on Map V2 or row click in Staff Roster.
- **Required Information**: Full Name, Employee Code, Role, Contact Phone/Radio, Current Shift Assignment, Attendance History (Last 7 days with selfie thumbnails), Assigned Home Zone.
- **Validation**: Read-only display.
- **Confirmation / Feedback**: Immediate tab render.
- **Permission**: `ADMIN` only.
- **Backend Readiness**: `PARTIALLY_IMPLEMENTED` (User model exists, but profile endpoint `GET /api/v1/employees/{id}` must be built).

---

### Workflow 2: Zone → View Responsible Staff
- **Entry Point**: Click on any zone polygon on Map V2 or select zone from map search bar.
- **Required Information**: Zone Code, Zone Name, Primary Assigned Operator, Backup Operator, Active Shift On-Duty Staff, Attendance Status.
- **Validation**: Displays warning if no operator is assigned for the active shift.
- **Permission**: `ADMIN` and `EMPLOYEE` (read-only).
- **Backend Readiness**: `IMPLEMENTED` via `GET /api/v1/map/zones/{id}/operators`.

---

### Workflow 3: Zone → Assign or Replace Responsible Operator
- **Entry Point**: Primary button inside Zone Contextual Inspector: `[Điều phối nhân sự / Gán ca]`.
- **Required Information**:
  - Target Zone (Pre-filled).
  - Target Shift (e.g., `CA1 — 2026-09-23`).
  - Selected Employee dropdown (Filtered to staff scheduled for `CA1` who are not on `LEAVE`).
  - Assignment Scope: `Chỉ ca này (This shift only)` vs `Cố định lâu dài (Permanent standing)`.
- **Validation**:
  - Warns if candidate employee is already assigned to another zone in the same shift.
  - Warns if candidate employee is on approved leave.
- **Confirmation Dialog**:
  `"Xác nhận điều phối NV003 - Lê Hoàng Nam phụ trách Khu cảng sà lan trong Ca 1 ngày 23/09/2026?"`
- **Feedback**: Success toast: `"Đã cập nhật phân công khu vực thành công"`. Map marker immediately updates to reflect new operator.
- **Audit Trail**: Logs admin ID, timestamp, previous operator, and new operator in `zone_assignment_audit`.
- **Backend Readiness**: `PARTIALLY_IMPLEMENTED` (Currently only supports permanent assignment in `zone_assignments`; shift-specific assignment requires new endpoint).

---

### Workflow 4: Shift → View Assigned Staff
- **Entry Point**: Click on the active Shift Chip in the global header (`[Ca 1: 06:00 - 14:00]`).
- **Required Information**: Complete list of all staff scheduled for this shift, categorized by:
  - `Đang trực tại khu vực` (Assigned to Zone A, B, C)
  - `Chưa phân công khu vực` (Unassigned reserve staff)
  - `Nghỉ phép / Vắng mặt` (On approved leave or absent)
- **Validation**: Read-only overview.
- **Backend Readiness**: `IMPLEMENTED` via `/work-schedules` and `/attendance`.

---

### Workflow 5: Shift → Identify Uncovered Zones
- **Entry Point**: Click on the Header Alert Badge: `[⚠️ 1 Khu vực chưa có nhân sự]`.
- **Action**: Map automatically dims covered zones (30% opacity) and zooms/highlights the uncovered zone with an animated amber beacon.
- **Inspector Panel**: Automatically opens with one-click CTA: `[Gán nhân sự ngay]`.
- **Backend Readiness**: `PROPOSED_DESIGN` (Derived via frontend join of zones and active assignments).

---

### Workflow 6: Reading Round → View Pending Meters
- **Entry Point**: Click on the Round Telemetry pill in the header: `[Lượt 08:00: 142/180]`.
- **Action**: Opens a bottom drawer or right panel listing all meters in the round.
- **Filter Tabs**: `Tất cả (180)`, `Đã ghi (142)`, `Chưa ghi (38)`, `Sự cố (0)`.
- **Map Interaction**: Clicking any meter in the list automatically pans the map to that meter’s coordinates.
- **Backend Readiness**: `IMPLEMENTED` via `/api/v1/meter-logbook/rounds/{id}/meters`.

---

### Workflow 7: Meter → View Reading History & Responsible Assignment
- **Entry Point**: Click on a meter dot on Map V2 or meter row in the Reading List.
- **Required Information**:
  - Meter Code, Serial Number, Physical Location, Zone Name.
  - Latest Reading Value, Photo Evidence thumbnail, OCR timestamp.
  - **Submitter Provenance**: `Ghi nhận bởi: NV001 - Nguyễn Văn Hải lúc 08:24`.
  - **Responsible Zone Operator**: `Phụ trách khu vực: NV001 - Nguyễn Văn Hải`.
- **Validation**: If unread, displays `Chưa ghi` with warning chip.
- **Backend Readiness**: `IMPLEMENTED` in database models, ready for UI display.
