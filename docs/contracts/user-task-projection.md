# Domain Contract — User Task Projection & Execution

## Status
`FROZEN_AUTHORITATIVE`

## Origin / Owner Thread
Thread 9C — User Task Projection
Historical handoff: [`docs/implementation/user-task-projection-phase-9c/THREAD_HANDOFF.md`](../implementation/user-task-projection-phase-9c/THREAD_HANDOFF.md)

## Authoritative Entities
- `UserTaskProjection` ([`backend/app/user_tasks.py`](../../backend/app/user_tasks.py)): Derived read model projecting personalized meter reading tasks.
- [`ReadingRoundMeter`](../../backend/app/models.py): Round scope source providing `zone_id_snapshot`.
- [`OperationalAssignment`](../../backend/app/models.py) + [`WorkSchedule`](../../backend/app/models.py): Staffing authority providing assigned zones and shift validity.
- [`MeterReading`](../../backend/app/models.py): Physical execution record storing `user_id` (the actual field executor).

## Frozen Truth
1. **MY TASKS = ReadingRoundMeter ∩ OperationalAssignment**: Personal tasks are dynamically derived from the intersection of published round meter scope and active operational shift assignments.
2. **Derived Read Model Only**: Zero persistent task tables exist (no `user_tasks`, no `round_user_meters`).
3. **Zone Snapshot Join**: The authoritative join matches `ReadingRoundMeter.zone_id_snapshot == OperationalAssignment.zone_id`. Mid-day mutations to live `Meter.zone_id` are strictly ignored.
4. **Half-Open Shift Resolution (`Asia/Ho_Chi_Minh`)**:
   - `06:00 <= scheduled_time < 14:00` → `CA1`
   - `14:00 <= scheduled_time < 22:00` → `CA2`
   - `22:00 <= scheduled_time < 06:00 (+1)` → `CA3`
   Exact boundaries resolve cleanly: 14:00 is `CA2`, 22:00 is `CA3`, 06:00 is `CA1`.
5. **Overnight CA3 Resolution**: Scheduled rounds falling between 00:00 and 05:59 match CA3 shifts that commenced at 22:00 on the prior calendar date.
6. **Role Visibility & Authority**:
   - Both `PRIMARY` and `SUPPORT` assigned users receive full operational task visibility and reading submission authority for the zone.
   - When a user has multiple role assignments covering the same zone, `PRIMARY` takes precedence for display/reporting.
7. **Unassigned Fallback**: An employee without an active assignment for the round's shift and zone receives zero personal tasks (`assigned_total = 0`). The system never falls back to global round scope.
8. **Shared Scope & Execution Uniqueness**: Meters in zones with overlapping `PRIMARY` and `SUPPORT` assignments appear in both operators' task lists. However, meter reading records are unique per round and meter according to existing business rules.
9. **Assigned Responsibility vs Actual Execution**:
   - `OperationalAssignment.user_id`: Assigned responsibility (WHO is scheduled to read).
   - `MeterReading.user_id`: Actual physical execution (WHO captured and confirmed the reading in the field).
10. **Field Mutation Authorization**:
    - Meter must exist in published round scope (`ReadingRoundMeter`); otherwise HTTP 422.
    - Meter's `zone_id_snapshot` must be within the user's active assignment authority; otherwise HTTP 403 Forbidden.
    - Admin override: System administrators retain documented wharf-wide submission override. No other roles receive implicit override.
11. **Dual Truth Progress Resolution**:
    - **GLOBAL ROUND PROGRESS**: Denominator is the total scheduled meters in the round scope (`ReadingRoundMeter` count / `operations.current_round.progress.total`). Meaning: overall port operational progress. Used in [`HomeHub.tsx`](../../frontend/src/components/HomeHub.tsx) and [`BottomRadialNav.tsx`](../../frontend/src/components/home/BottomRadialNav.tsx) Progress Ring.
    - **PERSONAL TASK PROGRESS**: Denominator is unique meters projected to the current authenticated employee (`operations.summary.assigned_total`). Meaning: the employee's personal assigned workload. Used in [`ReadingBatchView.tsx`](../../frontend/src/components/ReadingBatchView.tsx).
    - Rules: Personal progress does NOT replace global denominator; global progress does NOT imply personal ownership; per-user assigned totals cannot be summed to reconstruct the global denominator because shared `PRIMARY`/`SUPPORT` assignments overlap.

## Required Invariants
- Zero persistent duplication tables for task projections.
- Tasks join strictly on `zone_id_snapshot`, never live `Meter.zone_id`.
- Shift windows use half-open intervals $[start, end)$.
- Personal progress and global progress maintain independent, non-interchangeable denominators.
- Unassigned field users receive HTTP 403 upon submission.

## Legacy / Compatibility Behavior
- Administrators retain wharf-wide submission override across all zones.
- Home Hub Progress Ring preserves its global round progress semantics as documented in [`DESIGN_DNA.md`](../../frontend/DESIGN_DNA.md) Section 7.2.

## Forbidden Reinterpretations
- Never collapse personal progress and global progress into a single metric.
- Never use live `Meter.zone_id` for round task projection.
- Never fallback to global round scope when a field user has no assignment.
- Never equate `MeterReading.user_id` with assigned personnel.
- Never create persistent task tables (`user_tasks`, etc.).

## Known Limitations / Unresolved Items
- Thread 9D reporting now uses published snapshot scope for denominators while keeping `LEGACY_DYNAMIC` explicitly dynamic ([`reporting.md`](reporting.md)).

## Source Evidence
- Backend projection & auth: [`backend/app/user_tasks.py`](../../backend/app/user_tasks.py)
- Tests: [`tests/test_user_task_projection_9c.py`](../../tests/test_user_task_projection_9c.py)
- Personal progress UI: [`frontend/src/components/ReadingBatchView.tsx`](../../frontend/src/components/ReadingBatchView.tsx)
- Global progress UI: [`frontend/src/components/HomeHub.tsx`](../../frontend/src/components/HomeHub.tsx), [`frontend/src/components/home/BottomRadialNav.tsx`](../../frontend/src/components/home/BottomRadialNav.tsx)
- Design specification: [`frontend/DESIGN_DNA.md`](../../frontend/DESIGN_DNA.md) (Sections 7.1, 7.2)

## Change Protocol
Modifications to task projection logic, submission authorization, or progress metrics require STANDARD mode, review across `user-task-projection`, `reading-schedule`, and `user-ui`, and verification via gate `user-task-projection` ([`backend-9c`](../../harness/commands.yml)) and `user-suite`.
