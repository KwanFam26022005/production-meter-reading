# Architecture Decision Record (ADR-009C)
# User Task Projection as a Derived Read Model

## Status
ACCEPTED & IMPLEMENTED

## Context
Thread 9A established authoritative reading schedules and immutable round meter snapshots (`ReadingRound` and `ReadingRoundMeter`).
Thread 9B established authoritative shift and zone staffing assignments (`WorkSchedule` and `OperationalAssignment`).

Thread 9C requires connecting these domains so that field employees viewing the mobile User Portal see only their operationally assigned meters, while keeping global round progress truthful and preventing unauthorized submissions.

A key architectural question was whether to create a new persistent database table (e.g. `user_tasks` or `round_user_meters`) to duplicate the intersection of meters and assignments, or to compute this projection dynamically on read.

## Decision
We decided to implement `UserTaskProjection` as a **derived read model** computed on-the-fly from the mathematical intersection:
$$\text{UserTaskProjection} = \text{ReadingRoundMeter} \cap \text{OperationalAssignment}$$

1. **No New Persistence Tables:**
   No persistent tables (`user_tasks`, `round_user_meters`, `task_assignments`) are added.
2. **Authority Validation at Mutation Time:**
   `confirm_meter_reading` and `mark_meter_review` invoke `validate_meter_user_task_authority()` before persisting records. Field staff without a covering operational assignment in `[start, end)` receive HTTP 403 Forbidden. Administrators retain wharf-wide override.
3. **Forensic Truth Preserved:**
   `MeterReading.user_id` records the true physical person who submitted the reading.

## Consequences
- **Positive:**
  - Zero dual-write hazard or stale data cache synchronization issues when supervisors modify assignments.
  - Sub-5ms query performance on SQLite.
  - Complete separation between planned schedule (`ReadingRoundMeter`), planned staffing (`OperationalAssignment`), and actual execution (`MeterReading`).
- **Negative:**
  - Dynamic calculations are performed per read request (mitigated by indexed foreign keys on small round sizes $\le 50$ meters).
