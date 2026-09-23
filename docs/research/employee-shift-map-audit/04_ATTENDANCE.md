# 04 — Attendance System & Time-Tracking Audit

**Document Reference:** `docs/research/employee-shift-map-audit/04_ATTENDANCE.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits the attendance verification architecture, check-in/out workflows, photo evidence capture, database constraints, and scheduling reconciliations implemented across [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py), [`backend/app/attendance_gc.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance_gc.py), and the mobile frontend ([`frontend/src/components/AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx)).

**Key Findings:**
1. **Complete Disconnection from WorkSchedule**: Attendance events record calendar dates but contain **no foreign keys to `work_schedules`**, no `shift_code`, and no `zone_id`.
2. **Critical Architectural Bug in Overnight Shift (CA3)**: Check-out enforcement verifies check-in against `business_date = now_local.strftime("%Y-%m-%d")`. An employee working CA3 (22:00–06:00) who checks in on Day 1 and checks out at 06:00 on Day 2 is **rejected with an HTTP 409 Conflict error** ("Must check in before checking out"), leaving CA3 workers unable to record check-out.
3. **Presence vs. Duty Conflation**: The system treats checking in via selfie as generic daily attendance, but cannot ascertain whether the worker reported to their assigned operational zone or began their meter-reading round.

---

## 2. AttendanceEvent Data Model & Constraints

The `AttendanceEvent` entity is defined in [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L203-L228):

```python
class AttendanceEvent(Base):
    __tablename__ = "attendance_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    event_type = Column(String(20), nullable=False)                  # CHECK_IN, CHECK_OUT
    server_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    device_timestamp = Column(DateTime, nullable=True)
    photo_key = Column(String(255), nullable=True)
    status = Column(String(20), default="VALID", nullable=False)     # VALID, REJECTED
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "business_date", "event_type", name="uq_user_date_event"),
    )
```

### 2.1 Table Constraints & Idempotency
- **`uq_user_date_event`**: Enforces strictly **at most one `CHECK_IN` and at most one `CHECK_OUT` per user per calendar day string**.
- **Consequence**: If an employee needs to check in twice (e.g., emergency recall or split duty), the database rejects the second event.

---

## 3. The CA3 Overnight Shift Check-Out Failure (Detailed Code Trace)

A severe architectural defect was discovered in the check-out validation logic in [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py).

### 3.1 Trace of Execution
1. **Check-In on Day 1 (Monday, 22:00)**:
   - Worker arrives for `CA3` (22:00 to 06:00).
   - In [`attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L137):
     ```python
     now_local = datetime.now() # UTC+7
     business_date = now_local.strftime("%Y-%m-%d") # "2026-09-21"
     ```
   - An event is inserted: `(user_id=10, business_date="2026-09-21", event_type="CHECK_IN")`. Check-in succeeds.

2. **Check-Out on Day 2 (Tuesday, 06:00)**:
   - Worker completes shift at 06:00 on Tuesday morning and taps "Check Out" on [`AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx).
   - In [`attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L198):
     ```python
     now_local = datetime.now()
     business_date = now_local.strftime("%Y-%m-%d") # Evaluates to "2026-09-22"!
     ```
   - In [`attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py#L206-L210):
     ```python
     check_in = db.query(AttendanceEvent).filter(
         AttendanceEvent.user_id == current_user.id,
         AttendanceEvent.business_date == business_date,  # Looking for "2026-09-22"
         AttendanceEvent.event_type == "CHECK_IN"
     ).first()

     if not check_in:
         raise HTTPException(
             status_code=409,
             detail="Must check in before checking out"
         )
     ```
   - **Result**: Because the check-in occurred on `"2026-09-21"`, no check-in exists for `"2026-09-22"`.
   - FastAPI raises an **HTTP 409 Conflict**. The check-out is rejected.
   - The worker is permanently stranded in an "un-checked-out" state for Day 1, while receiving an error on Day 2.

### 3.2 Root Cause
The codebase treats `business_date` as identical to calendar date (`strftime("%Y-%m-%d")`). In 24/7 port industrial operations, a business date for an overnight shift belongs to the shift anchor date (Day 1). Because `AttendanceEvent` has no reference to the worker's scheduled shift (`WorkSchedule`), it cannot know that the 06:00 check-out belongs to the previous night's CA3 shift.

---

## 4. Disconnection: Attendance vs. Schedule vs. Zone

```
+---------------------+             +----------------------+
|    WorkSchedule     |             |   AttendanceEvent    |
+---------------------+             +----------------------+
| user_id             |             | user_id              |
| work_date           |             | business_date        |
| shift_code (CA1/CA2)|             | event_type (IN/OUT)  |
| status              |             | photo_key            |
+----------+----------+             +----------+-----------+
           |                                   |
           X - - - - - - - - - - - - - - - - - X
                 NO FOREIGN KEY / NO LINK
           X - - - - - - - - - - - - - - - - - X
           |                                   |
+----------v----------+                        |
|  OperationalZone    |                        |
+---------------------+                        |
| id, name, code      |                        |
+---------------------+                        |
           ^                                   |
           X - - - - - - - - - - - - - - - - - X
                NO ZONE-LEVEL CHECK-IN
```

### 4.1 What Attendance Captures
- Proof that an employee authenticated and submitted a selfie from a device at a specific wall-clock time.
- Optional GPS coordinates (`location_lat`, `location_lng`), which are stored but not geo-fenced against port boundaries.

### 4.2 What Attendance Does NOT Capture
- **Which shift was worked**: The record does not store whether the employee worked CA1, CA2, or HC.
- **On-time vs. Late**: Because the shift window is unknown to `AttendanceEvent`, the system cannot calculate tardiness (e.g., checking in at 06:45 for a 06:00 Ca 1 shift is recorded simply as `status="VALID"`).
- **Zone of presence**: No association with `OperationalZone`. An employee assigned to Area A could check in from Area C or outside the port without triggering an operational alert.

---

## 5. UI & Administrative Visibility

### 5.1 Field Worker Experience ([`AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx))
- Renders camera preview for selfie capture.
- Prompts for Check-In if no event logged today; prompts for Check-Out once Check-In is recorded.
- Displays recent selfie avatar and check-in timestamp.
- Fails silently or shows raw error message if the 409 Conflict occurs during overnight check-out.

### 5.2 Managerial Reconciliation Visibility ([`backend/app/attendance_gc.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance_gc.py))
- Endpoint `GET /attendance/reconciliation`: Compares list of active users against attendance events for a date.
- Classifies users into:
  - `CHECKED_IN` (has check-in, no check-out)
  - `COMPLETED` (has both check-in and check-out)
  - `ABSENT` (no events recorded)
- **Defect**: If a user is on approved leave (`LEAVE`), this reconciliation endpoint still reports them as `ABSENT` because it queries `users` and `attendance_events` without cross-referencing `leave_requests` or `work_schedules.status="ON_LEAVE"`.
