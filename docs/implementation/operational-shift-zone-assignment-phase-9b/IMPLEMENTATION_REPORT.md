# Thread 9B implementation report

**Branch:** `feature/operational-shift-zone-assignment-phase-9b` stacked on `86007aea7eaaa5fb929c32318c88967810d803ff`. **Decision:** `NEW_OPERATIONAL_ASSIGNMENT`.

## Changes

- Backend: `OperationalAssignment` model, SQLite partial unique indexes, date/shift window resolver, availability/preview/apply/cancel service, Admin and own-user APIs, roster and leave reconciliation, AdminAuditLog mutation records.
- Frontend: separate Lịch ca and Phân khu tác nghiệp tabs, date/shift board, PRIMARY/SUPPORT selector, conflict preview and cancellation, User schedule assignment list, explicit UNASSIGNED state, responsive styles, API types and methods.
- Tests: 16 new backend tests, 4 Operations tests, 4 User tests. Existing 9A reading scope and Map implementations were not modified.
- Visual acceptance: 17 controlled-fixture screenshots at 1440×1000 and 390×844; capture source is `scripts/capture_9b_acceptance.mjs`.

## Migration evidence

The project uses `Base.metadata.create_all()` plus idempotent SQLite patches. The local initialized DB has 331 WorkSchedule, 72 legacy ZoneAssignment, 3 LeaveRequest, and 0 OperationalAssignment records, with zero FK violations. No historical assignment was invented.

## Verification and attribution

Focused backend 32 passed; new 9B backend module 16 passed. Operations 392 passed; User 83 passed. Spatial 26 passed; unified simulation 30 passed; B2 hash and bundle isolation passed; TypeScript and both production builds passed. Final full backend: 248 passed/10 failed. All ten failure node IDs and material assertions match the 9A same-environment run at 232 passed/10 failed. `THREAD_9B_REGRESSION = 0` on observed comparison.

## Git accounting

The branch began clean; all tracked edits and new files listed in the 9B commit were created during this thread. `frontend/src/components/map-v2/`, Map operations, ReadingRound/ReadingRoundMeter semantics, reporting modules, and ReadingBatchView remain untouched. The screenshot script and PNGs are controlled test evidence, not production fixtures. PR targets the 9A branch; no merge is performed.
