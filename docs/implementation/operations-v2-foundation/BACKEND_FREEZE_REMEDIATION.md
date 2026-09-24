# Backend freeze remediation

## Scope and checkpoint

Starting HEAD: `aa7598ef14bd7ba88ba3bbbe2f9c8ab3e353f2c7`.
Phase 2.6 and UAT remain blocked. The default-port gate is separate; unowned
PID 15244 and port 8000 are untouched.

The only executable non-test change is the legacy V1 seeder: explicit fixture
KWH/M3 cumulative metadata and LEGACY_DYNAMIC scope for raw SQL round inserts.
Current fresh schemas require these fields; migrated databases could mask their
absence with SQL defaults. No schema constraints or application services changed.

## Test changes

- Technical report fixture uses two explicit operational zones and asserts their
  names and confirmed counts, excluding arbitrary meter location labels (9D).
- Opt-in function-scoped V1 fixture creates the current schema in pytest tmp_path,
  an administrator, 12 retired CT meters with one preserved history record each,
  and 364 distinguishable legacy assets. It runs the authoritative V1 seeder and
  five-zone publisher against this database only. Historical local count 2841
  is replaced by the fixture's explicit 12 history records.
- V1 assertions retain 32 assets, 12 active meters, 4032 readings, 24 electricity
  edges and 7 water edges. Idempotency compares reading identities/values,
  foreign-key integrity, metadata, and preservation of LEGACY_DYNAMIC scope.
- Scenario settings and the dashboard clock are scoped to each V1 test and
  restored by monkeypatch. The clock is the scenario's 2026-09-16 06:00 local
  shift start, removing wall-clock dependence from DUE assertions.
- Spatial audit and both CLI tests use isolated V1 data; generated audit reports
  go to tmp_path instead of overwriting repository historical evidence.
- Both image non-persistence tests use real in-memory JPEG uploads and stub only
  `reader.read`. Auth/CSRF, decoding, confirmation API, DB and file assertions
  execute. The unauthenticated path must not call inference; authenticated paths
  must call it exactly once. The local D:/Users image dependency is removed.
  These are business-contract tests, **not qualification of real OCR inference**.
  E2, recognition inference directory and digit dictionary remain unavailable.

## Focused evidence

Ordered focused run: technical report, seed idempotency, V1 suite, spatial suite,
then both image non-persistence nodes: **42 passed** (pytest deduplicated the
explicit idempotency node included again through its module).
Standalone runs: reporting 1 passed; seed idempotency 1 passed; V1 13 passed;
spatial 26 passed; image non-persistence 2 passed.

Full backend and regression qualification are pending at this checkpoint.
The four protected historical failures and known-failures.json are unchanged.

## Harness routing

RELEASE plan against aa7598e: backend-core, reading-schedule, simulation, spatial.
`tests/conftest.py` is explicitly reviewed as opt-in backend test infrastructure;
it does not import/initialize the application at collection time. UI skills are
not applicable: the user limits this work to backend/test compatibility and no
UI, topology or geometry changes occur. Frozen 9A and Map contracts were reviewed.
The harness CLI self-tests inspect HEAD~1 without focused-node arguments; their
result therefore depends on the latest commit's paths. This documentation
checkpoint records actual focused evidence before full qualification. The real
qualification plan retains aa7598e as its base and explicit affected test nodes.

## Canonical data baseline

Counts before: meter_readings=719, reading_rounds=60,
reading_round_meters=720, operational_assignments=269.
Read-only SQLite iterdump SHA-256:
`66c18f308bc50a067a96017a39419d4834c7417663ab2c1493d9647773efcc9a`.
Raw baseline: `.runtime/logs/backend-freeze-before.json` outside source.
