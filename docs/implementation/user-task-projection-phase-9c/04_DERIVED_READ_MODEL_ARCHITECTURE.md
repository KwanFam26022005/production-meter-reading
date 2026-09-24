# Saigon Port — Thread 9C Derived Read Model Architecture

**ADR Reference:** Architecture Decision Record (ADR-009C)  
**Status:** ACCEPTED & IMPLEMENTED  

---

## 1. Architectural Choice: Dynamic Projection vs Persistent Duplication

### 1.1 Decision
We implement `UserTaskProjection` as a **pure derived read model** computed on-the-fly from the mathematical intersection:
$$\text{UserTaskProjection} = \text{ReadingRoundMeter} \cap \text{OperationalAssignment}$$

No persistent tables (`user_tasks`, `round_user_meters`, `task_assignments`) have been introduced.

### 1.2 Rationale
1. **Zero Dual-Write Hazard:**
   - If user tasks were physically duplicated into a database table upon round generation, any administrative shift change, leave approval, or zone re-assignment in Thread 9B would require multi-table transaction cascades to synchronize pending tasks.
   - Dynamic derivation guarantees that changes to `OperationalAssignment` (e.g. status transition from `ASSIGNED` to `CANCELLED`) take effect immediately across all user interfaces without background cron reconcilers.
2. **Authoritative Snapshot Preservation:**
   - Thread 9A already persists the immutable round scope in `ReadingRoundMeter` (`zone_id_snapshot`).
   - Thread 9B already persists assignment authority in `OperationalAssignment`.
   - Computing the projection queries only existing indexed foreign keys (`reading_round_meters.reading_round_id`, `operational_assignments.user_id`, `operational_assignments.work_date`), executing in sub-5ms across SQLite.
3. **Audit Trail Protection:**
   - Physical execution records (`MeterReading`) persist actual `user_id` upon submission. A persistent task table would create confusion regarding whether an unread record represents scheduled duty vs executed reality.
