# 12 — Legacy migration strategy

Migration sets existing `reading_rounds.scope_mode` to `LEGACY_DYNAMIC` and creates an empty scope table. It does not backfill the current active meter set because that would present present-day inventory as original historical truth.

New schedule creation sets `SNAPSHOT` and materializes all scope rows in the same transaction. The isolated migration test starts with one legacy round, zero readings, and zero scope rows; after two migration runs it asserts one round, zero readings, zero scope rows, and `LEGACY_DYNAMIC` on the old round.

No production database was migrated during this implementation. Application startup applies the repository's idempotent SQLite migration to the configured database.
