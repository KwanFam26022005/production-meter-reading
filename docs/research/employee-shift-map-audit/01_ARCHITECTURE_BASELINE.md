# 01 — Architecture Baseline & Repository State

**Document Reference:** `docs/research/employee-shift-map-audit/01_ARCHITECTURE_BASELINE.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document establishes the verified baseline of the **Production Meter Reading — Cảng Sài Gòn** repository. It documents the exact Git working tree state, runtime environments, application bundles, backend database configuration, and the classification of all functional modules across the codebase.

Strict audit invariants were adhered to throughout this investigation:
- **Zero repository pollution**: No branch changes, commits, stashes, resets, or code modifications were performed.
- **Zero database writes**: No migrations were executed, and no SQLite test records were inserted or modified.
- **Service isolation**: Existing backend and frontend development processes were undisturbed.
- **Direct source inspection**: Every architecture and data observation was extracted directly from local source files, test fixtures, and static assets.

---

## 2. Git & Working Tree Baseline

The audit was executed against the following local repository state:

| Property | Value | Evidence / Command Reference |
| :--- | :--- | :--- |
| **Local Path** | `D:\Projects\production-meter-reading\production-meter-reading` | User environment configuration |
| **Git Branch** | `feature/v16e-network-map-overlay-r1` | `git status -s` |
| **Git Commit HEAD** | `5d370474112fb978105f87e7498cdc9d339471a0` | Git HEAD reference |
| **Working Tree Status** | Dirty (Active parallel thread validating skills & UI tokens) | Observed modified files in `.agent/`, `backend/`, `frontend/` |

### 2.1 Preserved Working Tree Modifications
The following modified and untracked files from concurrent development threads were strictly preserved without interference:
- Backend: [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py), [`backend/app/db.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/db.py), [`backend/app/main.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py), [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py), [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py), [`backend/app/schemas.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py).
- Frontend: [`frontend/src/App.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx), [`frontend/src/components/AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx), [`frontend/src/components/AuthenticatedShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AuthenticatedShell.tsx), [`frontend/src/components/HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx), [`frontend/src/components/MeterCamera.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/MeterCamera.tsx), [`frontend/src/components/admin/AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx), [`frontend/src/services/api.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/services/api.ts), [`frontend/src/types.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts).
- Skills & Specs: [`AGENTS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/AGENTS.md), [`.agent/skills/saigon-port-ui/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md), [`frontend/DESIGN_DNA.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/DESIGN_DNA.md).

---

## 3. Technology Stack & Multi-Bundle Architecture

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|                                                                                       |
|   +------------------------------------+   +--------------------------------------+   |
|   |         USER MOBILE PORTAL         |   |      OPERATIONS DESKTOP PORTAL       |   |
|   |            (user.html)             |   |          (operations.html)           |   |
|   |  - Mobile Viewport (<480px)        |   |  - Desktop Console (>1024px)         |   |
|   |  - HomeHub, AttendanceView         |   |  - AdminShell, Roster, Schedules     |   |
|   |  - ReadingBatchView, MeterCamera   |   |  - Map V1 (Operations) & Map V2 Twin |   |
|   +-----------------+------------------+   +------------------+-------------------+   |
|                     |                                         |                       |
|                     +--------------------+--------------------+                       |
|                                          | HTTP / REST (JWT Bearer Auth)              |
+------------------------------------------v--------------------------------------------+
|                                    BACKEND TIER                                       |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   | FastAPI Application (backend/app/main.py)                                      |   |
|   |  - /auth                 (Login, Me, Tokens)                                  |   |
|   |  - /work-schedules       (Roster, Shifts, Leave Requests)                     |   |
|   |  - /attendance           (Check-in, Check-out, Reconciliation)                |   |
|   |  - /api/v1/map           (Operational Zones, Continuous Zone Assignments)     |   |
|   |  - /api/v1/meter-logbook (Batches, Rounds, Meter Readings, Exceptions)        |   |
|   |  - /admin                (Dashboard Metrics, Reconciliation, Analytics)       |   |
|   +--------------------------------------+----------------------------------------+   |
|                                          | SQLAlchemy 2.0 ORM                         |
|                                          v                                            |
|   +-------------------------------------------------------------------------------+   |
|   | SQLite Database Engine (app.db / WAL Mode / Foreign Keys Enforced)            |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### 3.1 Backend Specifications
- **Framework**: FastAPI (Python 3.10+) running with Uvicorn.
- **ORM**: SQLAlchemy 2.0 Declarative Base (`backend/app/models.py`).
- **Database Engine**: SQLite located at `backend/app.db`.
- **Database Connection Strategy**: [`backend/app/db.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/db.py):
  - Enforces `PRAGMA foreign_keys=ON;` on every connection via SQLite event listener (`connect`).
  - Sets `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;` for concurrent read performance.
- **Authentication**: JWT Bearer tokens signed via HS256 (`backend/app/auth.py`). Passwords hashed via `passlib[bcrypt]`.
- **RBAC**: Binary role assignment (`EMPLOYEE` vs `ADMIN`).

### 3.2 Frontend Specifications
- **Framework**: React 18.3, TypeScript 5.5, Vite 5.4.
- **Styling**: Tailwind CSS with Saigon Port brand tokens (`DESIGN_DNA.md`).
- **Multi-App Bundle Architecture**:
  1. `frontend/user.html` (Entry: `src/apps/user/main.tsx`): Scoped for mobile field workers (Attendance, HomeHub, Camera, Meter Logbook).
  2. `frontend/operations.html` (Entry: `src/apps/operations/main.tsx`): Scoped for desktop dispatchers/admins (Admin Dashboard, Roster, Schedules, Map V1, Map V2).
  3. `frontend/index.html` (Monolith Legacy Entry: `src/main.tsx`): Contains legacy conditional routing between `UserApp` and `OperationsApp`.

---

## 4. Source Directory Inventory & Domain Mapping

| Directory / Module | Key Files | Functional Domain |
| :--- | :--- | :--- |
| **`backend/app/`** | `models.py`, `schemas.py`, `db.py` | Canonical SQLAlchemy data models and Pydantic validation schemas. |
| | `auth.py`, `main.py` | JWT authentication, user context extraction, router registration. |
| | `work_schedule.py` | Work schedules, shift roster, pattern generation, leave requests. |
| | `attendance.py`, `attendance_gc.py` | Check-in/out endpoints, image upload, status reconciliation. |
| | `map_operations.py`, `map_config.py` | Map V1 operational zones, zone assignments, mock operator data. |
| | `meter_logbook.py`, `admin.py` | Reading batches, inspection rounds, readings, reconciliation. |
| **`backend/scripts/`** | `create_user.py`, `set_user_role.py`, `set_user_password.py` | CLI administrative tooling for user account management. |
| **`frontend/src/components/`** | `HomeHub.tsx`, `AttendanceView.tsx` | Mobile field user portal components. |
| | `ReadingBatchView.tsx`, `MeterCamera.tsx` | Field meter reading execution and camera capture interface. |
| | `UserScheduleView.tsx` | Mobile employee shift and leave request calendar view. |
| **`frontend/src/components/admin/`** | `AdminShell.tsx`, `AdminStaffRoster.tsx` | Desktop operations portal navigation, staff roster management. |
| **`frontend/src/features/map-operations/`**| `MapOperationsPage.tsx`, `portMapConfig.ts` | Map V1 Operational Console (1915×821 canvas). |
| **`frontend/src/components/map-v2/`** | `MapV2Workspace.tsx`, `MapV2Layers.tsx` | Map V2 Digital Twin (1536×1024 SVG, client-side only). |
| | `data/tan_thuan_1_zones_edited.json` | Static zone geometry and presentation metadata for Map V2. |

---

## 5. Domain Capability Classification Matrix

To avoid misrepresenting draft or simulated features as working enterprise capabilities, each functional domain is classified using the rigorous evidence-backed taxonomy:

| Domain | Capability | Status | Evidence Reference |
| :--- | :--- | :--- | :--- |
| **Employee Management** | User Model & Authentication | `IMPLEMENTED` | `models.py` L22-38, `auth.py` L50-95 |
| | Employee CRUD (UI & REST API) | `MISSING` | No `POST/PUT/DELETE /users` in `main.py` |
| | Administrative CLI Tooling | `IMPLEMENTED` | `scripts/create_user.py`, `set_user_role.py` |
| **Shift & Roster** | Shift Definitions (CA1, CA2, CA3, HC, OFF) | `IMPLEMENTED` | `work_schedule.py` L45-53 |
| | Schedule Persistence vs Dynamic Fallback | `PARTIALLY_IMPLEMENTED` | `work_schedule.py` L140-142 (fallback to CA1/OFF) |
| | Unique Constraint per User per Day | `IMPLEMENTED` | `models.py` L183 (`uq_user_work_date`) |
| | Leave Requests & Approval | `IMPLEMENTED` | `work_schedule.py` L240-330 |
| | Substitute Shift Conflict Detection | `MISSING` | `work_schedule.py` L310-325 blindly overwrites substitute |
| **Attendance** | Photo-verified Check-in / Check-out | `IMPLEMENTED` | `attendance.py` L112-225 |
| | Shift-Aware Attendance Linking | `MISSING` | `models.py` L203-228 (`AttendanceEvent` lacks schedule FK) |
| | CA3 Overnight Shift Check-out | `PARTIALLY_IMPLEMENTED` | `attendance.py` L206 (Fails with 409 Conflict across midnight) |
| **Zone Management** | Operational Zone Model (Map V1) | `IMPLEMENTED` | `models.py` L89-105, `map_operations.py` L40-120 |
| | Continuous Zone Assignment (Map V1) | `PARTIALLY_IMPLEMENTED` | `models.py` L108-125 (Standing only; lacks date/shift link) |
| | Map V2 Digital Twin | `DEMO_ONLY` | `MapV2Workspace.tsx`, static JSON, zero backend API |
| | Map V2 to SQLite Synchronization | `MISSING` | Completely isolated client-side mock data |
| **Meter Reading** | Batch & Round Execution | `IMPLEMENTED` | `meter_logbook.py` L75-180 |
| | Individual Task Dispatch / Worklists | `MISSING` | Workers see shared pool; no `ReadingTask` table |
| | Unfinished Work Accountability | `MISSING` | `admin.py` L1657-1673 flags `MISSING` with no operator |
