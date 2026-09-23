# 17 — Database migration

Repository convention is SQLAlchemy `Base.metadata.create_all()` followed by the existing idempotent SQLite `migrate_db()`, not Alembic. The new mapped table and indexes are created by `init_db()` on existing SQLite databases; repeated creation leaves data intact. No ZoneAssignment or WorkSchedule rows are backfilled into operational history.

Observed local SQLite after initialization: 331 WorkSchedule rows, 72 ZoneAssignment rows, 3 LeaveRequest rows, **0 OperationalAssignment rows**, and `PRAGMA foreign_key_check` returned no violations. This is a local development/test database (the full suite uses it); counts are not a claim about production. Before-9B operational assignment count is conceptually zero because the table did not exist at the verified Git baseline. In-memory migration tests initialize the new schema without fabricating records.
