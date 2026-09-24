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

Full backend and regression qualification were pending at this checkpoint;
completed results follow below.
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


## Completed qualification (2026-09-24)

Full backend: **380 passed, 7 failed**. All seven exact node IDs occur in the
unchanged frozen baseline; zero new failed nodes. No pytest skip or xfail was
introduced. The four protected failures retain their material reasons exactly.

| Exact pytest node ID | Current failure | Baseline comparison |
| --- | --- | --- |
| `tests/test_v16c_asset_foundation.py::test_asset_create_read_update_and_audit` | Asset list `0 >= 1` fails | Same protected historical reason |
| `tests/test_v16d_asset_verification.py::test_meter_review_matrix_and_summary_v16d` | Spatial meter list `0 == 5` fails | Same protected historical reason |
| `tests/test_v16e_asset_network.py::test_asset_network_endpoint_verified_only_default` | Created asset ID absent from empty node set | Same protected historical reason |
| `tests/test_v16e_asset_network.py::test_asset_network_utility_filter_and_focus` | Created connection ID absent from empty edge set | Same protected historical reason |
| `tests/test_meter_logbook.py::test_reading_round_creation_and_current_selection` | `nearest_upcoming_round` is None | Frozen runtime-date dependence; next round crosses local midnight |
| `tests/test_meter_logbook.py::test_today_meter_operations_active_meters_and_current_status` | 2 today slots, expected 3 | Frozen runtime-date dependence; future round is tomorrow |
| `tests/test_reporting.py::test_report_overview_metrics_hourly_and_locations` | 2 hourly rows, expected at least 3 | Frozen runtime-date dependence; future round is tomorrow |

### Date-dependent reason investigation

The full run occurred around 23:11 Asia/Saigon. These three unchanged test bodies
create rounds relative to datetime.now, including a future round one hour later.
Product queries correctly filter to the requested local operational day.
`get_current_or_nearest_round` filters `day_rounds` by local date;
reporting loads scope tasks only for that date. Their fixture assumptions about
three same-day rounds therefore fail near midnight.

AST comparison confirmed all three test bodies identical to aa7598e. The product
files `backend/app/meter_logbook.py` and `backend/app/reporting.py` are byte-identical
to aa7598e. A separate diagnostic pytest invocation injected a temporary plugin
that replaced only each test module's datetime and the two product modules'
datetime with 2026-09-24 03:00 UTC (10:00 local). **All three passed**. No repository
file was changed by this diagnostic; it does not replace the real-clock result.
This proves environment/time dependence, rather than a new product regression.
No baseline entry was changed to accept a new reason.

The V1 scenario-isolation node now passes against actual 364 legacy fixture rows.
Both V1 fixed-date DUE nodes now pass with their scoped scenario clock. The frozen
known-failures registry still contains these three improvements, per the user's
explicit prohibition on editing it.

### Regression results and raw evidence

Evidence directory (outside source): `.runtime/logs/backend-freeze/`.

| Gate | Actual result | Evidence |
| --- | --- | --- |
| Ordered required focused nodes | 42 passed | Recorded terminal run before commits |
| Broader affected modules | 91 passed, 2 frozen logbook date failures | `01.log` |
| Backend full | 380 passed, 7 frozen failures | `02.log` |
| User build | PASS | `03.log` |
| Operations build | PASS | `04.log` |
| Bundle separation | PASS | `05.log` |
| Harness | 59/59 PASS | `06.log` |
| B2 checksum | Exact frozen checksum PASS | `07.log` |
| Full logbook module | 29 passed, 2 frozen date failures | `08.log` |
| Operations suite | 397/397 PASS | `09.log` |
| 9A focused | 14/14 PASS | `10.log` |
| Spatial audit/seed | 26/26 PASS | `11.log` |
| Spatial CRUD/authority | 11/11 PASS | `12.log` |
| Unified simulation | 30/30 PASS | `13.log` |
| User suite | 90/90 PASS | `14.log` |
| Demo V2 semantic audit after regression | PASS | `demo-audit-final.log` |
| Diff check against aa7598e | PASS after documentation LF normalization | `git diff --check aa7598e` |

The RELEASE harness command itself returned **FAILED**, not an all-green result:
its broad backend-focused and logbook gates do not apply backend-full's known-node
allowance, and its first diff check detected CRLF whitespace in this new document.
The document was normalized to LF and diff check rerun successfully. The two test
gates fail solely on the frozen date nodes investigated above. Backend-full was
`QUALIFIED_WITH_KNOWN_FAILURES`; the harness marks reasons UNVERIFIED_REASON, which
was resolved by the explicit manual reason review recorded here. No harness
policy, assertion, known-failure record, or product behavior was weakened.

### Canonical integrity and disposition

After all regression commands and the final read-only Demo audit, counts remain
719 readings / 60 rounds / 720 round meters / 269 assignments. Before and after
SQLite logical hashes both equal
`66c18f308bc50a067a96017a39419d4834c7417663ab2c1493d9647773efcc9a`.
Evidence: `.runtime/logs/backend-freeze-before.json` and
`.runtime/logs/backend-freeze-after.json`.

9A/9B/9C/9D application sources, Map B2 geometry, known-failures.json and canonical
Demo V2 were not changed. Real OCR inference remains unqualified because artifacts
are absent; neither image non-persistence test claims model accuracy/readiness.

**BACKEND_FREEZE_GATE_GREEN** under the explicitly accepted frozen backend-full
failure contract. **PHASE_2_5_DEFAULT_PORT_GATE_PENDING**. Phase 2.6 and UAT remain
blocked until the user frees port 8000 and authorizes the real-port
8000/5173/5174 start -> stop -> start qualification. No permanent port change,
worktree creation, consolidation, main merge or deployment was performed.
