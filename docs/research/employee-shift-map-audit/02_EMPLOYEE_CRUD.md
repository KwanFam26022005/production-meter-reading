# 02 — Employee Management & Identity CRUD Audit

**Document Reference:** `docs/research/employee-shift-map-audit/02_EMPLOYEE_CRUD.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits the user and employee lifecycle, identity data structures, authentication/authorization boundaries, and administrative capabilities within the Saigon Port Production Meter Reading platform.

**Key Finding:** There is **NO graphical user interface (UI)** and **NO REST API endpoints** for employee CRUD operations. Employee provisioning, password administration, and role assignments exist exclusively as local command-line interface (CLI) Python scripts executed by server administrators. In the running application, employees are only discoverable as side-effect query results in the Staff Roster (`/work-schedules`) and Map Operator dropdowns (`/api/v1/map/operators`).

---

## 2. Employee Identity Data Model

The employee entity is defined in [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L22-L38):

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(32), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="EMPLOYEE", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

### 2.1 Field Specifications & Invariants
- `id`: Auto-incrementing primary key (SQLite integer).
- `employee_code`: Unique identifier (e.g., `NV001`, `NV002`, `NV010`, `ADMIN01`). Enforced by unique database index.
- `full_name`: Display name (e.g., "Nguyễn Văn Hải", "Trần Minh Tuấn").
- `password_hash`: Bcrypt hashed password string.
- `role`: Plain VARCHAR(20) string. Validated at the application level against `EMPLOYEE` and `ADMIN`.
- `is_active`: Boolean flag indicating whether the user is permitted to authenticate. Default `True`.
- `created_at`: UTC timestamp of account creation.

### 2.2 Missing HR / Employee Profile Attributes
The current `User` table lacks standard enterprise workforce management attributes:
- **No Contact Info**: No phone number, email, or emergency contact.
- **No Organizational Unit**: No department, division, work team, or supervisory hierarchy.
- **No Employment Type**: No distinction between permanent staff, contractor, seasonal, or third-party inspector.
- **No Skill / Qualification**: No technical tier, meter reading certification, or safety clearance attributes.
- **No Avatar / Photo URL**: Profile images are not persisted on the `User` record; attendance photos exist only in `AttendanceEvent`.

---

## 3. Roles, Permissions & Authorization Boundaries

### 3.1 Role Hierarchy
The system implements a flat, two-tier role model:
1. `ADMIN`: Full access to the Operations Portal (`operations.html`), operational dashboards, roster assignments, reading schedule generation, and map console.
2. `EMPLOYEE`: Access restricted to the User Portal (`user.html`), personal check-in/out, reading logbook execution, and personal shift view.

### 3.2 Authorization Enforcement
Enforcement occurs in [`backend/app/auth.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/auth.py):
- `get_current_user()` (Lines 68–87): Decodes JWT Bearer token, extracts `sub` (employee_code), queries database, and asserts `user.is_active is True`.
- `require_admin()` (Lines 89–95): Enforces `if current_user.role != "ADMIN": raise HTTPException(status_code=403, detail="Admin role required")`.

### 3.3 Two-Site Multi-Bundle Isolation
As validated by [`tests/test_two_site_auth_and_rbac.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/tests/test_two_site_auth_and_rbac.py):
- Field workers (`role="EMPLOYEE"`) logging into `operations.html` are blocked by frontend guards in [`AuthenticatedShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AuthenticatedShell.tsx#L55-L65) and backend 403 responses.
- Administrators (`role="ADMIN"`) can log into both `operations.html` and `user.html` (for mobile inspection and emergency field overrides).

---

## 4. Comprehensive Employee CRUD Matrix

| Operation | Implementation Status | Channel / Entry Point | Source File & Reference | Notes / Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Create (Provision)** | `PARTIALLY_IMPLEMENTED` | CLI Script Only | [`backend/scripts/create_user.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/scripts/create_user.py#L1-L45) | Requires direct SSH/terminal access. No REST API (`POST /api/v1/employees`). |
| **Read (Detail)** | `IMPLEMENTED` | REST API (Self only) | [`backend/app/auth.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/auth.py#L104-L115) (`GET /auth/me`) | Returns the authenticated caller's profile. No endpoint for viewing another employee's detail. |
| **Read (List)** | `PARTIALLY_IMPLEMENTED` | REST API (Side-Effect) | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L125) & [`map_operations.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L110) | No dedicated `GET /api/v1/employees`. User lists are piggybacked onto roster and zone operator endpoints. |
| **Update (Profile)** | `MISSING` | None | N/A | No API or UI to update `full_name` or profile attributes. |
| **Update (Password)** | `PARTIALLY_IMPLEMENTED` | CLI Script Only | [`backend/scripts/set_user_password.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/scripts/set_user_password.py) | Users cannot change their own password via UI. Admins cannot reset passwords via UI. |
| **Update (Role)** | `PARTIALLY_IMPLEMENTED` | CLI Script Only | [`backend/scripts/set_user_role.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/scripts/set_user_role.py) | Role modification requires running CLI script directly against `app.db`. |
| **Delete / Deactivate** | `MISSING` | None | N/A | No soft delete, no deactivation toggle (`is_active=False`) in API or UI. Deletion requires manual SQL execution. |

---

## 5. UI Investigation: Absence of Employee Management View

Inspection of [`frontend/src/components/admin/AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L50-L75) confirms the complete absence of an Employee / Staff Management screen:

```tsx
// AdminShell.tsx Navigation Tabs:
const tabs = [
  { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { id: 'staff', label: 'Phân công trực', icon: Users },         // -> AdminStaffRoster (Shift Schedule only)
  { id: 'reading', label: 'Lịch ghi chỉ số', icon: Calendar },    // -> Reading Schedule
  { id: 'meters', label: 'Quản lý đồng hồ', icon: Gauge },       // -> Meter CRUD
  { id: 'map-v2', label: 'Bản đồ số V2', icon: Map },           // -> Digital Twin
  { id: 'map-v16', label: 'Console V16', icon: Activity },       // -> Map Operations V1
];
```

The `'staff'` tab navigates directly to [`AdminStaffRoster.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminStaffRoster.tsx), which is purely a shift assignment grid across dates. It provides:
- No button to add a new employee.
- No ability to edit an employee's code, full name, or status.
- No ability to deactivate an employee.
- No employee search, pagination, or role filtering.

---

## 6. Audit Trails & Historical Record Preservation

1. **No Audit Log for Identity**: There is no `user_audit_log` or historical tracking table. Changes to passwords or roles executed via CLI leave no trace of who performed the change or when.
2. **Referential Integrity on Deletion**:
   - `work_schedules.user_id` has a foreign key to `users.id` with `ondelete="CASCADE"` ([`models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L173)).
   - `attendance_events.user_id` has a foreign key to `users.id` with `ondelete="CASCADE"` ([`models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L206)).
   - `meter_readings.user_id` has a foreign key to `users.id` without explicit cascade (defaults to `RESTRICT` in SQLite when foreign keys are active).
   - **Hazard**: If a user record is manually deleted in SQLite, historical `work_schedules` and `attendance_events` will be **permanently wiped out via CASCADE**, corrupting compliance and payroll audit trails. Soft deactivation (`is_active=False`) is mandatory for enterprise operation but unimplemented in the API.
