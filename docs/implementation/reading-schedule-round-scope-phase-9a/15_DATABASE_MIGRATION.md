# 15 — Database migration

The project has no Alembic history. `init_db()` uses SQLAlchemy `create_all()` followed by the existing idempotent SQLite compatibility patch in `backend/app/db.py`.

The patch adds `scope_mode` with default `LEGACY_DYNAMIC` when absent, creates `reading_round_meters`, unique constraints and lookup indexes, and triggers that protect round scope mode, meter identity/snapshots, and operational history. A scope meter FK may change only from its meter ID to `NULL` through `ON DELETE SET NULL`; it cannot be reassigned. Foreign-key policy is round `RESTRICT`, meter scope `SET NULL`, and reading/meter and reading/round history `RESTRICT`. Legacy scope is not fabricated.

The migration path was tested twice against an isolated SQLite fixture. Before and after counts were round=1, reading=0, scope=0; post-migration modes were legacy=1, snapshot=0. The round remained `LEGACY_DYNAMIC`. The controlled UI acceptance database was created under the OS temporary directory and contained only demo 9A fixtures.
