# Saigon Port — Thread 9C Shift Window and CA3 Overnight Resolution

**Module:** `backend/app/user_tasks.py`  
**Timezone:** `Asia/Ho_Chi_Minh` (UTC+7)  

---

## 1. Shift Window Definitions

Shift windows are evaluated as **half-open intervals** $[start, end)$:

| Shift Code | Local Start | Local End | Overnight | Half-Open Interval Semantics |
| :--- | :--- | :--- | :--- | :--- |
| **CA1** | 06:00 | 14:00 | False | $[06:00, 14:00)$ — 14:00 belongs to CA2 |
| **CA2** | 14:00 | 22:00 | False | $[14:00, 22:00)$ — 22:00 belongs to CA3 |
| **CA3** | 22:00 | 06:00 (+1) | True | $[22:00, 06:00 \text{ next day})$ — 06:00 belongs to CA1 |
| **HC** | 07:30 | 16:30 | False | $[07:30, 16:30)$ — Overlaps CA1 and CA2 |

---

## 2. Overnight CA3 Shift Boundary Resolution

The authoritative `work_date` of a CA3 shift is the **calendar date on which the shift commences at 22:00**.

### 2.1 Morning Hours Resolution (00:00 - 05:59)
When a round executes at `2026-09-24 02:00:00`:
- The local time hour is $< 06:00$.
- In addition to checking assignments for `2026-09-24`, the resolver queries assignments for `2026-09-23` where `shift_code == 'CA3'`.
- The CA3 shift starting at `2026-09-23 22:00` covers until `2026-09-24 06:00`, successfully matching the 02:00 round.

### 2.2 Boundary Invariants Verified by Tests
- `06:00:00` belongs strictly to `CA1` of that day.
- `14:00:00` belongs strictly to `CA2` of that day.
- `22:00:00` belongs strictly to `CA3` starting on that date.
- `05:59:59` belongs strictly to `CA3` starting on the prior date.

All edge cases are covered by unit tests in `tests/test_user_task_projection_9c.py::test_ca3_overnight_coverage`.
