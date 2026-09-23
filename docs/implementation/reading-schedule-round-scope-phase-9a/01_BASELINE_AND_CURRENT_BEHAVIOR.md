# 01 — Baseline and current behavior

## Verified repository state

- Thread 8B baseline: `57db422b668bb77dfce8cb1a3fea64b29fe60178`
- Working branch: `feature/reading-schedule-round-scope-phase-9a`
- Safe-resume audit: the four dirty backend files were partial 9A changes; no unrelated or ambiguous hunk was found.

## Before Thread 9A

For a round without persisted scope, `calculate_round_progress()` used the current count of active meters as its denominator. `get_round_meters_with_status()` and the current User queue also resolved meters from current active inventory. A later activation, retirement, or inventory addition could therefore change the apparent round total. Batch compatibility fields mixed current unique inventory with reading-row counts.

The baseline test contracts for the frontend were Operations 384, User 74, Spatial 26, and Unified Simulation 30. The SQLite project uses `create_all()` plus an idempotent compatibility migration in `backend/app/db.py`; it does not use Alembic.

## After Thread 9A

New rounds are `SNAPSHOT` and have persisted `reading_round_meters` rows. Existing rounds remain `LEGACY_DYNAMIC`; the migration does not infer their old scope. The User current queue and Admin round list/detail use persisted scope for snapshots. The separate shared Admin dashboard and reports retain their inventory-based aggregates as documented in [07](07_ROUND_PROGRESS_SEMANTICS.md) and [18](18_KNOWN_LIMITATIONS.md).

Map V2 source files were not changed. The frozen B2 checksum was verified unchanged.
