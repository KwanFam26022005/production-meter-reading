# Architecture decision record — immutable reading round scope

## Status

Implemented on `feature/reading-schedule-round-scope-phase-9a`.

## Decision

Persist a `ReadingRoundMeter` row for each scheduled meter when publishing a new round. Preserve meter code/name, operational and presentation zone IDs, utility, origin, status, and creation time. Mark old rounds `LEGACY_DYNAMIC` without reconstructing scope from current inventory.

Resolve new membership on the server from stable IDs, fingerprint sorted membership at preview, re-resolve during publish, and write rounds plus scope in one transaction. Snapshot rounds use their own rows for round detail, progress, User queue, and submission checks.

## Consequences

Inventory changes cannot silently rewrite new round membership. Meter deletion with existing readings and direct deletion of rounds with readings are blocked; unreferenced deleted meters can be represented by a null meter FK while retaining snapshot identity. Cross-midnight schedule creation remains rejected. Shared report/dashboard aggregates remain legacy for this thread.

## Deferred decisions

Employee assignment intersection, historical meter location labels, reporting migration, persistent drafts, and map projection migration belong to later threads.
