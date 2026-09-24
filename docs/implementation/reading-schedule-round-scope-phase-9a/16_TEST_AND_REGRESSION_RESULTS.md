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

## Baseline Regression Attribution

- Baseline: `57db422b668bb77dfce8cb1a3fea64b29fe60178` (detached temporary worktree).
- Thread 9A comparison HEAD: `f775ac796f279857d3172762e3fbff95f518e45b`.
- Command in each worktree: `python -m pytest -q`, using the same `.venv`, `.env`, a SQLite backup of the local test database, and the same local model/spatial assets. The baseline worktree used the existing PaddleOCR checkout through `PADDLEOCR_REPO`.
- Baseline full-backend result: **218 passed, 10 failed**.
- Previously recorded Thread 9A result: **235 passed, 7 failed**. A fresh run on 2026-09-23 yielded **232 passed, 10 failed**. The three newly visible failures also reproduced at baseline, with the same current-round/time assertions: `tests/test_meter_logbook.py::test_reading_round_creation_and_current_selection`, `tests/test_meter_logbook.py::test_today_meter_operations_active_meters_and_current_status`, and `tests/test_reporting.py::test_report_overview_metrics_hourly_and_locations`.

| Exact test node ID | Matching assertion at baseline and Thread 9A | Attribution |
| --- | --- | --- |
| `tests/test_v16c_asset_foundation.py::test_asset_create_read_update_and_audit` | Asset list total `0`, expected at least `1` after create. | `PRE_EXISTING_FIXTURE_EXPECTATION` |
| `tests/test_v16d_asset_verification.py::test_meter_review_matrix_and_summary_v16d` | Spatial review meter list length `0`, expected `5`. | `PRE_EXISTING_FIXTURE_EXPECTATION` |
| `tests/test_v16e_asset_network.py::test_asset_network_endpoint_verified_only_default` | Newly created verified asset ID absent from an empty returned node set. | `PRE_EXISTING_FIXTURE_EXPECTATION` |
| `tests/test_v16e_asset_network.py::test_asset_network_utility_filter_and_focus` | Newly created verified connection ID absent from an empty returned edge set. | `PRE_EXISTING_FIXTURE_EXPECTATION` |
| `tests/test_v16e_s1_simulation.py::test_scenario_isolation_in_apis` | Legacy asset list total `0`, expected `364`. | `PRE_EXISTING_FIXTURE_EXPECTATION` |
| `tests/test_v16e_s1_simulation.py::test_fresh_seed_current_round_zero_of_twelve` | `due_count` `0`, expected `12` for the fixed 2026-09-16 round. | `PRE_EXISTING_DATE_DRIFT` |
| `tests/test_v16e_s1_simulation.py::test_one_meter_completion_real_workflow` | `due_count` `0`, expected `11` for the fixed 2026-09-16 round. | `PRE_EXISTING_DATE_DRIFT` |

The runtime date was verified as **2026-09-23** in `Asia/Ho_Chi_Minh`; both date-sensitive tests use 2026-09-16 data. The baseline and Thread 9A runs both classify those tasks as no longer due. Attribution for the seven originally reported failures: **5 `PRE_EXISTING_FIXTURE_EXPECTATION`, 2 `PRE_EXISTING_DATE_DRIFT`, 0 `THREAD_9A_REGRESSION`**. The three additional current failures also reproduce at baseline; this comparison does not fix or reclassify the underlying tests.

**Conclusion: `THREAD_9A_BACKEND_REGRESSION = CLEAN` for the seven reported failures.**
