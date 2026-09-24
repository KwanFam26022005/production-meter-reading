# Saigon Port — Thread 9C Upstream Domains and Frozen Contracts

**Domain Intersections:**
```text
ReadingRound (WHEN)
      │
      ▼
ReadingRoundMeter (WHAT)
      │
      │ zone_id_snapshot
      ▼
      ∩
      ▲
      │ zone_id
OperationalAssignment (WHO + WHERE + SHIFT)
      │
      ├── user_id
      ├── work_date
      ├── shift_code
      └── assignment_role
      │
      ▼
UserTaskProjection (My Operational Tasks)
```

---

## 1. Frozen Domain Contracts

### 1.1 Thread 9A (WHEN & WHAT)
- `ReadingRound`:
  - Immutable historical schedule timestamps (`scheduled_at`).
  - Round status (`OPEN`, `CLOSED`).
  - Snapshot scope lock: in `SNAPSHOT` mode, meters included in `ReadingRoundMeter` define the universe of meters for that round.
- `ReadingRoundMeter`:
  - `meter_id`: Foreign key to `meters.id`.
  - `zone_id_snapshot`: Authoritative zone ID at round generation time.
  - `zone_code_snapshot`, `zone_name_snapshot`: Presentation text preserved at round creation time.

### 1.2 Thread 9B (WHO + WHERE + SHIFT)
- `OperationalAssignment`:
  - `user_id`: Field employee or supervisor.
  - `zone_id`: Operational zone covered.
  - `work_date`: Canonical date of shift start (`YYYY-MM-DD`).
  - `shift_code`: `CA1`, `CA2`, `CA3`, `HC`.
  - `assignment_role`: `PRIMARY` (exclusive per zone/shift) or `SUPPORT` (multiple permitted).
  - `status`: `ASSIGNED` or `CANCELLED`.
- `WorkSchedule`:
  - Shift assignment roster for each employee across the calendar month.

### 1.3 Forensic Executor Truth
- `MeterReading.user_id`:
  - Records the actual user who pressed "Xác nhận chỉ số" or "Báo kiểm tra".
  - May be the PRIMARY assignee, a SUPPORT assignee, or an ADMIN overriding on wharf.
  - Never retroactively altered by assignment modifications.
