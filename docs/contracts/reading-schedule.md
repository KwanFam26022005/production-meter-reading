# Domain Contract — Reading Schedule & Round Scope

## Status
`FROZEN_AUTHORITATIVE`

## Origin / Owner Thread
Thread 9A — Reading Schedule Round Scope
Historical handoff: [`docs/implementation/reading-schedule-round-scope-phase-9a/THREAD_HANDOFF.md`](../implementation/reading-schedule-round-scope-phase-9a/THREAD_HANDOFF.md)

## Authoritative Entities
- [`ReadingRound`](../../backend/app/models.py): Defines **WHEN**. Owns schedule timestamp, status (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), scope mode, scope origin, and preview fingerprint.
- [`ReadingRoundMeter`](../../backend/app/models.py): Defines **WHAT**. Owns the persisted, immutable publication-time meter scope for each round.

## Frozen Truth
1. **WHEN = ReadingRound; WHAT = ReadingRoundMeter**: Round scheduling and meter scope definition are strictly decoupled from operational staffing.
2. **Snapshot Persistence**: All newly published rounds persist scope rows in [`ReadingRoundMeter`](../../backend/app/models.py) within an atomic publish transaction.
3. **Snapshot Denominator**: The round scope denominator for snapshot rounds is the count of persisted, scheduled scope rows (`ReadingRoundMeter`), not dynamic active inventory.
4. **Publication-Time Identity**: Each scope row preserves immutable snapshot attributes: `meter_id`, `meter_code_snapshot`, `meter_name_snapshot`, `zone_id_snapshot`, `zone_name_snapshot`, `presentation_zone_id_snapshot`, `utility_type_snapshot`, `scope_origin`, and `scope_status`.
5. **Scope Immutability**: Historical scope rows never mutate when a meter is subsequently created, retired, or moved to a different operational zone.
6. **Creation Validation**: Empty scope publication is rejected. Server re-verifies scope cardinality and compares preview SHA-256 fingerprint; stale publish requests return HTTP 409 Conflict.
7. **Supported Scope Modes**:
   - `ALL_ELIGIBLE`: All active, non-retired meters across the port.
   - `BY_ZONE`: Filtered to designated operational zones.
   - `BY_UTILITY`: Filtered by utility type (`ELECTRICITY` or `WATER`).
   - `SELECTED_METERS`: Explicit list of valid meter IDs.
   All modes resolve active, non-retired meters sorted deterministically by meter code.
8. **Submission Boundary**: Reading submissions or confirmations outside the published snapshot scope are rejected with HTTP 422.
9. **Cancellation Semantics**: Cancelled rounds are non-actionable and excluded from active queues and current round selection. Scope rows and reading history are preserved for audit.

## Required Invariants
- `ReadingRoundMeter` rows for a published round are immutable.
- A round cannot be published with zero resolved scope meters.
- Submissions outside round scope are rejected with HTTP 422.
- Snapshot denominator equals the exact count of scheduled scope rows.
- Cancelled rounds never appear in current operational queues.

## Legacy / Compatibility Behavior
- Historical rounds prior to Thread 9A are marked `LEGACY_DYNAMIC` and resolve active meters dynamically at query time.
- Legacy dynamic rounds are never presented as immutable snapshots; no synthetic scope rows are backfilled.
- [`backend/app/reporting.py`](../../backend/app/reporting.py) intentionally preserved dynamic inventory denominators throughout 9A.

## Forbidden Reinterpretations
- Never assign employees in this contract; `ReadingRound` and `ReadingRoundMeter` do not own staffing.
- Never place `user_id` onto `ReadingRoundMeter` to represent assigned responsibility.
- Never reinterpret `MeterReading.user_id` as assigned staff (it remains the actual physical executor).
- Never fabricate historical scope rows for legacy dynamic rounds.

## Known Limitations / Unresolved Items
- Staffing assignment is owned by Thread 9B ([`operational-assignment.md`](operational-assignment.md)).
- Personal task projection is owned by Thread 9C ([`user-task-projection.md`](user-task-projection.md)).
- Reporting denominators in [`backend/app/reporting.py`](../../backend/app/reporting.py) remain dynamic active inventory (deferred to Thread 9D).

## Source Evidence
- Models: [`backend/app/models.py`](../../backend/app/models.py) (`ReadingRound`, `ReadingRoundMeter`, `RoundScopeMode`, `RoundScopeOrigin`)
- Service logic: [`backend/scripts/create_reading_rounds.py`](../../backend/scripts/create_reading_rounds.py)
- Test assertions: [`tests/test_reading_round_scope_9a.py`](../../tests/test_reading_round_scope_9a.py)

## Change Protocol
Modifications to round scope persistence, denominator calculation, or submission validation require STANDARD mode, impact review of `reading-schedule` and dependent domains, and verification via gate `reading-schedule` ([`backend-9a`](../../harness/commands.yml)).
