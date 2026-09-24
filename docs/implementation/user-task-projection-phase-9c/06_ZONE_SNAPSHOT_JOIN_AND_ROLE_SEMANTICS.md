# Saigon Port — Thread 9C Zone Snapshot Join and Role Semantics

**Join Invariant:**
```sql
ReadingRoundMeter.zone_id_snapshot = OperationalAssignment.zone_id
```

---

## 1. Authoritative Zone Join Semantics

Task projection joins `OperationalAssignment.zone_id` against `ReadingRoundMeter.zone_id_snapshot`, **never** `Meter.zone_id` current master value.

### 1.1 Rationale
- If an administrator modifies a meter's spatial or administrative zone in `Meter` table mid-day, existing open and past reading rounds must maintain the exact operational perimeter captured when the round was scheduled.
- If a meter lacked a zone snapshot at round creation, fallback is made to `meter.zone_id` to maintain backwards compatibility with legacy fixtures.

---

## 2. Assignment Role Priority & Multi-Zone Semantics

### 2.1 Role Definitions
- **PRIMARY:** The employee holds primary operational ownership for all scheduled meters in that zone during the shift. Only one active PRIMARY assignment is permitted per zone per shift.
- **SUPPORT:** The employee provides assistance in that zone (e.g. during heavy barge discharge). Multiple SUPPORT assignments may co-exist.

### 2.2 Deduplication and Priority
If an employee is assigned both PRIMARY and SUPPORT across multiple records (or via administrative overlap), the task projector assigns role precedence:
$$\text{PRIMARY} \succ \text{SUPPORT}$$
The employee sees the meter in their worklist with the highest role badge (`Chính`).

### 2.3 Multiple Zones
An employee may be assigned to multiple zones simultaneously (e.g., PRIMARY at `CONTAINER` and SUPPORT at `CFS`). The projection aggregates meters across all covered zones without duplicate entries.
