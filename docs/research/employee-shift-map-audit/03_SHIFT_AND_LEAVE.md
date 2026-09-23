# 03 — Shift Scheduling, Roster & Leave Management Audit

**Document Reference:** `docs/research/employee-shift-map-audit/03_SHIFT_AND_LEAVE.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits the work shift modeling, roster assignment mechanisms, automated pattern generation, and leave approval workflows in [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py) and frontend roster components ([`AdminStaffRoster.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminStaffRoster.tsx) and [`UserScheduleView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/UserScheduleView.tsx)).

**Key Findings:**
1. **Single Shift Per Date Invariant**: The database enforces `uq_user_work_date (user_id, work_date)`. An employee can have at most **one shift per calendar date**, making split shifts, overtime double shifts, or shift crossovers impossible to model natively.
2. **Ghost / Fallback Shifts**: Shifts displayed in the Admin Staff Roster and User Schedule are largely **unpersisted fallback defaults** (`OFF` on Sundays, `CA1` on Mon–Sat) dynamically synthesized by the API when no row exists in SQLite.
3. **Substitute Overwrite Vulnerability**: When approving a leave request with a designated substitute, the backend blindly overwrites the substitute's schedule for those dates without verifying whether the substitute was already scheduled to work, creating hidden labor conflicts.

---

## 2. Shift Definitions & Time Windows

Shift codes and canonical working hours are defined in [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L45-L53):

| Shift Code | Display Name | Time Window | Spans Midnight? | UI Color Token | Operational Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CA1`** | Ca 1 | 06:00 – 14:00 (8h) | No | `#2563EB` (Blue) | Morning field meter-reading & operations |
| **`CA2`** | Ca 2 | 14:00 – 22:00 (8h) | No | `#16A34A` (Green) | Afternoon/evening inspection round |
| **`CA3`** | Ca 3 | 22:00 – 06:00 (8h) | **YES (+1 Day)** | `#9333EA` (Purple) | Overnight monitoring & emergency response |
| **`HC`** | Hành chính | 07:30 – 16:30 (9h) | No | `#D97706` (Amber) | Standard administrative office hours |
| **`OFF`** | Nghỉ | 00:00 – 00:00 (0h) | No | `#6B7280` (Gray) | Scheduled weekly rest day |
| **`LEAVE`**| Phép | 00:00 – 00:00 (0h) | No | `#DC2626` (Red) | Approved annual / medical leave |

---

## 3. WorkSchedule Data Model & Constraints

The `WorkSchedule` model is defined in [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L169-L186):

```python
class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    shift_code = Column(String(20), nullable=False)
    status = Column(String(20), default="SCHEDULED", nullable=False)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "work_date", name="uq_user_work_date"),
    )
```

### 3.1 Architectural Impact of `uq_user_work_date`
1. **Split Shifts Impossible**: An employee cannot work morning Ca 1 (06:00–14:00) and later cover an evening Ca 3 (22:00–06:00) on the same date because SQLite rejects the second insert with `UNIQUE constraint failed: work_schedules.user_id, work_schedules.work_date`.
2. **Overnight Ca 3 Calendar Ambiguity**: A Ca 3 shift beginning at 22:00 on Monday and ending at 06:00 on Tuesday is anchored exclusively to Monday (`work_date="YYYY-MM-DD"`). On Tuesday, the employee is physically present until 06:00, but Tuesday's schedule row can either be `OFF` or another shift, creating operational confusion for check-out and attendance (detailed in Document 04).

---

## 4. Persisted Shifts vs. Dynamic Fallback Synthesis

A critical finding of this audit is how the backend handles unassigned schedule dates.

### 4.1 Fallback Implementation
In [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L135-L148) and [`L345-L355`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L345-L355):

```python
# Query existing rows from work_schedules for date range
existing_map = {(ws.user_id, ws.work_date): ws for ws in existing_schedules}

# For each user and each date in range:
if (user.id, date_str) in existing_map:
    # Use real persisted record from DB
    shift = existing_map[(user.id, date_str)]
else:
    # SYNTHESIZE DYNAMIC FALLBACK:
    is_sunday = current_dt.weekday() == 6
    fallback_code = "OFF" if is_sunday else "CA1"
    # Returned to frontend as if it were scheduled!
```

### 4.2 Business Implications
1. **The Roster UI Lies to Dispatchers**: When an administrator opens [`AdminStaffRoster.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/admin/AdminStaffRoster.tsx), every cell is populated with `CA1` or `OFF`. There is **no visual distinction** between a shift explicitly planned and approved by management versus a synthetic default fallback.
2. **Lazy Persistence**: The database table `work_schedules` may be completely empty for future months, yet the UI shows a complete full-time roster. Records are only written to SQLite when an admin manually clicks a cell, selects a different shift, and triggers `POST /work-schedules` or `POST /work-schedules/bulk`.

---

## 5. Auto-Pattern Scheduling Algorithm

The platform provides a pattern rotation generator via `POST /work-schedules/pattern` in [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L165-L215):

- **Input**: `user_id`, `start_date`, `end_date`, `pattern` (e.g., `["CA1", "CA1", "CA2", "CA2", "CA3", "OFF"]`).
- **Algorithm**:
  ```python
  pattern_len = len(pattern)
  for idx, single_date in enumerate(date_range):
      shift_code = pattern[idx % pattern_len]
      # Upsert into work_schedules
  ```
- **Evaluation**: The algorithm operates on pure date modulo. It does not account for port operational rotation standards (e.g., "3 ca 4 kíp"), does not check mandatory rest hours between transitions (e.g., transitioning from CA3 at 06:00 directly to CA1 at 06:00 the same day if pattern length allows), and does not check zone requirements.

---

## 6. Leave Requests & The Substitute Conflict Flaw

Leave requests are managed via `LeaveRequest` in [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L188-L201):

```python
class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    reason = Column(Text, nullable=True)
    substitute_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
```

### 6.1 Review and Approval Logic
In [`backend/app/work_schedule.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/work_schedule.py#L295-L335) (`POST /work-schedules/leave-requests/{id}/review`):
1. Admin sets `status="APPROVED"`.
2. Requester's schedule for all dates in `[start_date, end_date]` is updated to `shift_code="LEAVE"`, `status="ON_LEAVE"`.
3. If `substitute_user_id` is present:
   ```python
   for d in date_range:
       orig_shift = get_user_original_shift(requester_id, d)
       # Blindly set substitute's schedule:
       upsert_work_schedule(substitute_user_id, d, shift_code=orig_shift, status="SCHEDULED")
   ```

### 6.2 The Substitute Overwrite Vulnerability
- **The Bug**: The review logic **never queries what the substitute was already scheduled to do** on date `d`.
- **Scenario**:
  - Employee A is scheduled for `CA1` (06:00–14:00) on Friday.
  - Substitute Employee B is already scheduled for `CA2` (14:00–22:00) on Friday.
  - Employee A requests leave with Employee B as substitute.
  - Admin approves the request.
  - System executes upsert on `(substitute_user_id, "2026-09-25")`.
  - Because of `uq_user_work_date`, Employee B's original `CA2` shift is **completely overwritten with `CA1`**!
  - Result: Employee B's afternoon shift has now been dropped from the roster with zero warning to the dispatcher, creating an unstaffed afternoon shift at the port.

---

## 7. Roster Validation Deficiencies

| Validation Rule | Standard Port Requirement | Current Codebase Status | Consequence |
| :--- | :--- | :--- | :--- |
| **Minimum Rest Period** | Minimum 12 hours between consecutive shifts | `MISSING` | An employee can be scheduled CA3 (ends 06:00) followed immediately by CA1 (starts 06:00) or HC (starts 07:30). |
| **Max Consecutive Days** | Maximum 6 consecutive work days before OFF | `MISSING` | Dispatchers can assign 30 consecutive work days without validation warnings. |
| **Minimum Zone Staffing**| Every operational zone must have at least 1 qualified operator per shift | `MISSING` | Shifts are assigned in isolation from zone assignments. The roster does not know which zone an employee belongs to. |
| **Substitute Conflict Check**| Substitute must be `OFF` on the days they are asked to cover | `MISSING` | Approved leave silently overwrites the substitute's existing working shifts. |
