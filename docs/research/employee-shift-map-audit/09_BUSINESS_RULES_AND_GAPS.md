# 09 — Comprehensive Business Rules, Functional Gaps & Risk Matrix

**Document Reference:** `docs/research/employee-shift-map-audit/09_BUSINESS_RULES_AND_GAPS.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document presents a consolidated, evidence-backed matrix of all business rules, functional gaps, and operational risks identified across the Saigon Port Production Meter Reading platform. Every finding is classified according to the audit taxonomy (`IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `MISSING`, `DEMO_ONLY`, `LEGACY`, `UNVERIFIED`) and paired with exact source code references.

---

## 2. Business Rules & Functional Gaps Matrix

### 2.1 Employee Identity & Profile Administration

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EMP-01** | Employee Code Uniqueness | `IMPLEMENTED` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L25) | `employee_code` unique index enforced in SQLite. | Low |
| **EMP-02** | User Management UI | `MISSING` | [`AdminShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminShell.tsx#L55-L75) | No UI screen exists to view, create, edit, or deactivate employees. | **High** |
| **EMP-03** | User Provisioning API | `MISSING` | [`backend/app/main.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L40-L70) | No `POST /api/v1/employees` or `POST /users` endpoint exists. | **High** |
| **EMP-04** | Administrative CLI Tooling | `IMPLEMENTED` | [`backend/scripts/create_user.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/scripts/create_user.py) | Accounts can only be created via CLI script on server. | Medium |
| **EMP-05** | Soft Deactivation API | `MISSING` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L28) | `is_active` flag exists in DB but no API exists to toggle it. | Medium |
| **EMP-06** | Historical Audit Trail | `MISSING` | N/A | No audit log table for credential updates, role changes, or deletions. | Medium |

---

### 2.2 Shift Scheduling & Roster Planning

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SFT-01** | Canonical Shifts (CA1, CA2, CA3, HC, OFF, LEAVE) | `IMPLEMENTED` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L45-L53) | Defined in memory with standard port hours and color tokens. | Low |
| **SFT-02** | Single Shift Per Date Invariant | `IMPLEMENTED` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L183) | `uq_user_work_date` prevents multiple shifts per user per date. | High (Inflexible) |
| **SFT-03** | Dynamic Fallback Shift Synthesis | `PARTIALLY_IMPLEMENTED` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L140-L142) | Missing DB records return synthesized `OFF` (Sun) and `CA1` (Mon-Sat). | **Critical** (Deceptive UI) |
| **SFT-04** | Auto-Pattern Rotation Generator | `IMPLEMENTED` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L165-L215) | Date-modulo pattern generator (`POST /work-schedules/pattern`). | Medium |
| **SFT-05** | Minimum Rest Period Validation | `MISSING` | N/A | No enforcement of 12h rest between shifts (e.g. CA3 -> CA1). | **High** (Labor Compliance) |
| **SFT-06** | Consecutive Workday Limits | `MISSING` | N/A | No validation warning if worker is scheduled > 6 consecutive days. | Medium |

---

### 2.3 Leave Requests & Substitute Management

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LEV-01** | Leave Request Submission & Review | `IMPLEMENTED` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L240-L335) | Field workers submit; admins approve/reject (`POST /review`). | Low |
| **LEV-02** | Automatic Requester Schedule Update | `IMPLEMENTED` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L305-L315) | Approving leave marks requester as `LEAVE` (`status="ON_LEAVE"`). | Low |
| **LEV-03** | Substitute Conflict Detection | `MISSING` | [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L320-L330) | System blindly writes shift to substitute, overwriting existing duty. | **Critical** (Unstaffed Shifts) |

---

### 2.4 Attendance & Time-Tracking

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ATT-01** | Photo-Verified Check-In/Out | `IMPLEMENTED` | [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L112-L225) | Uploads camera photo, stores photo key, checks idempotency. | Low |
| **ATT-02** | Schedule Association | `MISSING` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L203-L228) | `AttendanceEvent` lacks FK to `work_schedules` or `shift_code`. | **High** |
| **ATT-03** | Overnight Shift (CA3) Check-Out | `PARTIALLY_IMPLEMENTED` | [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L206) | Check-out on Day 2 fails with 409 Conflict across midnight. | **Critical** (System Failure) |
| **ATT-04** | Zone-Level Presence Verification | `MISSING` | [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L140) | GPS coordinates captured but not geo-fenced to port zones. | Medium |
| **ATT-05** | Tardiness / Lateness Computation | `MISSING` | N/A | Status is always marked `VALID` regardless of check-in time. | Medium |

---

### 2.5 Operational Zones & Map Visualizations

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MAP-01** | Operational Zone Polygons (V1) | `IMPLEMENTED` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L89-L105) | Polygons defined in SQLite and rendered on 1915×821 canvas. | Low |
| **MAP-02** | Continuous Zone Assignment (V1) | `PARTIALLY_IMPLEMENTED` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L108-L125) | Standing assignments only. Not shift-specific or date-specific. | **High** |
| **MAP-03** | Map V1 Fictional Shift Derivation | `PARTIALLY_IMPLEMENTED` | [`deriveOperatorShiftSummary.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/utils/deriveOperatorShiftSummary.ts#L38-L63) | Shifts on map cards derived from round clock time, not schedules. | **High** (Deceptive UI) |
| **MAP-04** | Map V2 Digital Twin | `DEMO_ONLY` | [`MapV2Workspace.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.tsx) | Client-side SVG viewer using static JSON. Zero API calls to DB. | High (Architectural) |
| **MAP-05** | Map V2 Database Integration | `MISSING` | N/A | Does not read `operational_zones`, `zone_assignments`, or `meters`. | **High** |

---

### 2.6 Meter Reading Task Allocation & Exceptions

| Item ID | Capability / Rule | Status | Source File & Reference | Observed Implementation & Gap | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MTR-01** | Batch & Round Execution Pipeline | `IMPLEMENTED` | [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py#L75-L180) | Macro batches and micro inspection rounds manage reading lifecycles. | Low |
| **MTR-02** | Duplicate Prevention per Round | `IMPLEMENTED` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L258) | `uq_round_meter` prevents duplicate readings for the same meter. | Low |
| **MTR-03** | Individual Task Dispatch | `MISSING` | N/A | No `ReadingTask` table. Meters are not assigned to workers. | **High** |
| **MTR-04** | Zone Boundary Enforcement | `MISSING` | [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py#L100) | Workers can submit readings for meters outside their assigned zone. | Medium |
| **MTR-05** | Unfinished Work Accountability | `MISSING` | [`backend/app/admin.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py#L1657-L1673) | Missing readings are flagged `recorded_by=None` without owner. | **Critical** (Operational Void) |
| **MTR-06** | Simulated Infrastructure Boundary | `DEMO_ONLY` | [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L300-L330) | Demo utility cables and demo assets exist with `data_origin="SIMULATED"`. | Medium |
