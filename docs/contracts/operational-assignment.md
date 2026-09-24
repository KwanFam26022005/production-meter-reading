# Domain Contract — Operational Assignment & Work Schedule

## Status
`FROZEN_AUTHORITATIVE`

## Origin / Owner Thread
Thread 9B — Operational Shift & Zone Assignment  
Historical handoff: [`docs/implementation/operational-shift-zone-assignment-phase-9b/THREAD_HANDOFF.md`](../implementation/operational-shift-zone-assignment-phase-9b/THREAD_HANDOFF.md)

## Authoritative Entities
- [`OperationalAssignment`](../../backend/app/models.py): Defines **WHO + WHERE + SHIFT**. Owns operational staffing assignments linking `user_id`, `zone_id`, `work_date`, `shift_code`, `assignment_role` (`PRIMARY`, `SUPPORT`), and status (`ACTIVE`, `CANCELLED`).
- [`WorkSchedule`](../../backend/app/models.py): Defines working eligibility. Owns explicit shift schedules (`user_id`, `work_date`, `shift_code`, `schedule_status`).

## Frozen Truth
1. **WHO + WHERE + SHIFT = OperationalAssignment + WorkSchedule**: Task responsibility requires both an explicit operational assignment and an active, compatible work schedule.
2. **Missing WorkSchedule is UNASSIGNED**: If no `WorkSchedule` row exists for a user and date, the status is strictly `UNASSIGNED`. Missing schedules must never default to implicit CA1.
3. **Explicit Schedule Requirement**: An `OperationalAssignment` can only be created if the employee possesses a matching active, non-leave `WorkSchedule` for that shift and date.
4. **Canonical Shift Definitions (`Asia/Ho_Chi_Minh`)**:
   - `CA1`: 06:00–14:00
   - `CA2`: 14:00–22:00
   - `CA3`: 22:00–06:00 (crosses midnight into next calendar day)
   - `HC`: 07:30–16:30 (administrative day shift)
5. **CA3 Start Date Rule**: The `work_date` for a CA3 shift is strictly the calendar date on which the shift **starts** (22:00), extending to 06:00 the following day.
6. **Operational Roles**:
   - `PRIMARY`: Main responsible operator for the zone during that shift.
   - `SUPPORT`: Supporting operator.
7. **Cardinality & Uniqueness**:
   - An employee may be assigned to multiple zones within the same shift.
   - A zone may have at most ONE active `PRIMARY` assignment per `(zone_id, work_date, shift_code)`, enforced by service validation and database partial unique index.
   - A zone may have multiple active `SUPPORT` employees.
8. **Ineligibility Rules**: Employees marked `OFF` or with approved `LEAVE` for a shift cannot be assigned.
9. **Schedule Mutation & Cancellation**: When an approved leave or shift change invalidates an active assignment, the affected `OperationalAssignment` rows are cancelled atomically in the same transaction. Original rows are retained with full audit history (`cancelled_at`, `cancelled_by`, `cancellation_reason`).
10. **Substitute Nomination**: Nominating a substitute records candidate intent only; it does not automatically transfer or create operational assignments.

## Required Invariants
- At most one active `PRIMARY` assignment per `(zone_id, work_date, shift_code)`.
- Active assignment requires a valid, matching, non-leave `WorkSchedule`.
- `work_date` for CA3 is the date the shift begins at 22:00.
- Cancelled assignments are retained for audit and never physically deleted.
- Unscheduled employees cannot receive operational assignments.

## Legacy / Compatibility Behavior
- Legacy [`ZoneAssignment`](../../backend/app/models.py) does NOT grant operational task authority. It represents default spatial/administrative zone ownership consumed by legacy views and Map V2 defaults.
- No synthetic historical `OperationalAssignment` records are backfilled.

## Forbidden Reinterpretations
- Never use legacy `ZoneAssignment` as operational task authority.
- Never fabricate historical `OperationalAssignment` rows.
- Never infer missing `WorkSchedule` as implicit CA1.
- Never rewrite `MeterReading.user_id` as assigned staff.

## Known Limitations / Unresolved Items
- Thread 9B deliberately stops at operational assignment authority; intersection with published round scope is owned by Thread 9C ([`user-task-projection.md`](user-task-projection.md)).
- Substitute workflows do not perform automatic assignment creation.

## Source Evidence
- Models: [`backend/app/models.py`](../../backend/app/models.py) (`OperationalAssignment`, `WorkSchedule`, `AssignmentRole`, `ShiftCode`)
- Services: [`backend/app/operational_assignments.py`](../../backend/app/operational_assignments.py), [`backend/app/work_schedule.py`](../../backend/app/work_schedule.py)
- Test assertions: [`tests/test_operational_assignments_9b.py`](../../tests/test_operational_assignments_9b.py), [`tests/test_work_schedule.py`](../../tests/test_work_schedule.py)

## Change Protocol
Modifications to assignment constraints, shift windows, or schedule validation require STANDARD mode, impact review of `operational-assignment` and `user-task-projection`, and verification via gate `operational-assignment` ([`backend-9b`](../../harness/commands.yml)).
