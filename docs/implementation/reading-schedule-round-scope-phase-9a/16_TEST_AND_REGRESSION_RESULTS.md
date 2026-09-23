# 16 — Test and regression results

## Passing gates

- Focused backend schedule, Admin operations, and meter-logbook suite: **59 passed** (`tests/test_admin_operations.py`, `tests/test_meter_logbook.py`, `tests/test_reading_round_scope_9a.py`).
- Operations frontend: 388 passed (baseline 384, +4 Thread 9A tests).
- User frontend: 79 passed (baseline 74, +5 Thread 9A tests).
- Combined frontend `npm run test`: 492 passed.
- TypeScript `npx tsc --noEmit`: passed.
- Operations and User production builds: passed.
- Spatial gate: **26 passed** (`tests/test_meter_spatial_audit_and_seed.py`).
- Unified simulation gate: **30 passed** (`tests/mapV2UnifiedSimulationInfrastructure.test.ts`).
- B2 checksum: passed with `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`; bundle isolation: passed.
- Browser keyboard acceptance: Admin scope keyboard selection, visible-focus entry, Tab wrap, Enter/Space activation, Escape close, and opener-focus restoration passed; User keyboard navigation and dialog Escape close passed.

## Full backend suite

The final whole-repository run reported **235 passed and 7 failed**. Five failures are in V16C/V16D/V16E asset and simulation fixture expectations (asset create then list returns no row, expected spatial-review/legacy seed records are absent, and asset-network fixture queries return empty results). Two failures assert that a hard-coded 2026-09-16 round is `DUE`; the runtime date is 2026-09-23, so the unchanged projection classifies it as past/overdue. The direct SQLite simulation fixture now calls the idempotent migration; this cleared two earlier schema failures. These seven failures remain unresolved suite gates, not Thread 9A passes. No Map V2 code was changed to make the date-sensitive assertions pass.

The regression comparison and exact commands are in [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md).
