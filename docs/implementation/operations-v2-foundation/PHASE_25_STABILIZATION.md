# Phase 2.5 continuation - Windows runtime stabilization

Status: **PHASE_2_5_DEFAULT_PORT_GATE_PENDING**. Isolated runtime qualification passes.
The full RELEASE regression findings below also remain unresolved. Phase 2.6 and
Phase 2.7 have not started.

## Recovered checkpoint

- Branch: `integration/operations-v2-foundation`.
- `PHASE_25_RESUME_HEAD`: `45945cb18006b4da3fe00bf870579209388fdc63`.
- `PHASE_25_DIRTY_STATE`: modified `scripts/dev.ps1`, `scripts/stop-dev.ps1`;
  untracked `scripts/dev-runtime-helpers.ps1`, `scripts/test-dev-qualification.ps1`,
  `tests/test_dev_launcher_logic.py`.
- All five files inspected and classified **A: valid Phase 2.5 work**. No initial
  generated, unrelated, or uncertain dirty files. Existing work was continued.
- No concurrent editing process was observed. The other Codex process was a VS Code
  app server; the five files had unchanged timestamps from the interrupted work.
- No clone, worktree, or Python environment was created or removed.

## Stall investigation and fix

A bounded Python `Popen` capture of the original Windows PowerShell launcher on
18000/15173/15174 timed out after 50 seconds. At that point `poll()` returned 0
and the state registry existed. After stopping only the recorded service trees,
capture received EOF; the captured text contained `Development stack READY.`.
The launcher had exited; its lifetime was not the cause.

All original long-running services used `Start-Process -NoNewWindow`, inheriting
caller I/O. Adding `Start-Process` stdout/stderr file redirection alone still failed
the explicit EOF assertion on this Windows host. The final helper uses native
`CreateProcessW` with `inheritHandles=false` and `CREATE_NO_WINDOW`. A hidden
`cmd.exe /d /s /c` trampoline opens canonical stdout/stderr log files and NUL stdin
before executing Python or npm.cmd. This prevents Python, cmd, npm, and Vite from
retaining the qualification caller's capture handles or console. It also handles
npm.cmd paths containing spaces. No service shutdown or arbitrary sleep is used
to make successful launcher capture return.

Canonical logs are under `D:\Projects\production-meter-reading\.runtime\logs`:
`backend.log`, `backend.err.log`, `user-vite.log`, `user-vite.err.log`,
`operations-vite.log`, `operations-vite.err.log`; optional tunnels have matching
stdout/stderr files. Logs are replaced on each service start. The launcher emits a
startup summary with source SHA, runtime, DB, Python, npm, URLs, PIDs, API capability,
log location, and truthful OCR artifact status. It returns after readiness;
`-NonInteractive` remains compatible.

The npm development scripts no longer hardcode CLI ports. Existing Vite configs
retain defaults 5173/5174. The launcher supplies exactly one `--port` and
`--strictPort`; `VITE_BACKEND_URL` follows the selected backend port. Build scripts
and product source remain unchanged.

Additional defects found in the recovered runtime work:

- Role-like command text and `-Force` could authorize unrelated process termination.
  Records now include PID, creation timestamp, executable, and exact command line.
  Stop validates each identity, including recorded orphaned children; `-Force`
  cannot bypass ownership. Legacy records without identity proof are not trusted.
- Double-start previously trusted arbitrary healthy listeners. It now validates
  recorded identity, listener ancestry, ports, source, runtime, SHA, and current API.
- The launcher lock is now an exclusive OS file handle, released on exit/crash.
- The recovered qualification hardcoded unrelated PID 15244, omitted CASE E, and
  mislabeled a preflight collision as partial-stack failure. It now owns a controlled
  listener for F, launches genuinely missing npm scripts after backend/User readiness
  for D/E, and tests stale PID reuse in G. Injection is restricted to test ports.
- Python tests now invoke real PowerShell helpers rather than duplicating their logic.

## Runtime qualification

Executed `powershell.exe -NoProfile -ExecutionPolicy Bypass -File
scripts/test-dev-qualification.ps1` under **Windows PowerShell 5.1**.
Final result: **47 passed, 0 failed**. The earlier file-redirection attempt failed
with `Launcher exited but capture did not receive EOF`; its owned stack was cleaned.

| Case | Result | Observed acceptance |
| --- | --- | --- |
| A | PASS | All three listeners, identity registry, canonical logs, current API, frontend proxy, exactly one port argument, exit 0 and captured EOF |
| B | PASS | Owned stop, all test ports released, registry removed |
| C | PASS | Second start and stop without manual cleanup |
| D | PASS | User npm launch fails after backend startup; complete rollback |
| E | PASS | Operations npm launch fails after User readiness; complete rollback |
| F | PASS | Controlled unknown listener preserved; no false registry |
| G | PASS | Stale/reused PID preserved; fresh stack starts and stops |
| H | PASS | Already-running message; registry unchanged; no duplicate stack |
| I | PASS | Actual PowerShell 5.1 parser and runtime |

Local execution evidence (canonical runtime, not checked-in product data):
`logs/phase25-before-detachment.log` and `logs/qualification-1.log` through
`logs/qualification-10.log`. The passing assertion transcript was observed directly
in the execution tool; these numbered logs contain individual launcher/stop output.

## Default-port blocker

After qualification: 5173, 5174, 18000, 15173, and 15174 were free. Port **8000**
remained bound on `0.0.0.0` by **PID 15244**, parent PID 29512, created
2026-09-24 21:16:09 local time. Windows returned no executable or command line.
There is no dev registry proving its ownership. It was preserved throughout.

The operator must release port 8000 safely. Then run the actual default
`dev.ps1 -> stop-dev.ps1 -> dev.ps1` sequence, verify 8000/5173/5174 ownership,
repeat the semantic DB check, and finish the Phase 2.5 freeze. Do not use alternate
ports to waive this acceptance gate. No workspace cleanup or UAT may begin yet.

## Product integrity

The canonical DB is `D:\Projects\production-meter-reading\.runtime\data\app.db`.
Before and after runtime qualification:

| Table | Before | After |
| --- | ---: | ---: |
| meter_readings | 719 | 719 |
| reading_rounds | 60 | 60 |
| reading_round_meters | 720 | 720 |
| operational_assignments | 269 | 269 |

Demo Data V2 semantic audit passed before and after. SHA-256 of the UTF-8 SQLite
logical dump was identical:
`66c18f308bc50a067a96017a39419d4834c7417663ab2c1493d9647773efcc9a`.
No reset, seed, evidence fabrication, model download, topology change, B2 geometry
change, or product redesign was performed. OCR model artifacts are unavailable and
reported as a warning, not local-inference success.

## Regression and freeze

Verification mode: **RELEASE**, derived from launcher/package paths. The test path
also routes to backend-core; the selected focused node is
`tests/test_dev_launcher_logic.py`. Product API/model source was inspected for
startup and data isolation; it was not changed.

Executed the harness verification command once with RELEASE, the focused test node,
and explicit harness/User/Operations suites. Evidence:
`logs/phase25-harness-verification.json`. Its JSON stores only the first 200 stdout
characters per command; frontend counts are therefore not asserted from that file.

| Gate | Result |
| --- | --- |
| Focused runtime helper tests | PASS, 5/5 |
| User suite | PASS |
| Operations suite | PASS |
| User build | PASS |
| Operations build | PASS (existing bundle-size warning) |
| Bundle separation | PASS, after fresh builds |
| Harness self-tests | Final standalone rerun: PASS, 59/59 after checkpoint commits; initial 57/59 explained below |
| Full backend | FAIL, 17 failed nodes; 12 outside the recorded known list |
| Diff check | Initial gate failed on two test-generated historical artifacts; PASS after scoped restoration |
| Demo V2 audit | PASS before/after runtime qualification |

The full backend suite's existing spatial CLI test regenerated two tracked historical
files (`meter_spatial_audit.csv`, `spatial_audit_summary.json`). They were clean at
resume; after inspecting the generated diff and the test's output paths, both were
restored byte-for-byte from HEAD. No historical evidence change is retained.

The 17 failed nodes were rerun once, explicitly selected, to recover material
reasons omitted by the harness JSON. All 17 reproduced. Detailed local evidence:
`logs/phase25-failure-reasons.log`.

New relative to `harness/known-failures.json` (not silently added to that baseline):

| Exact node | Material reason |
| --- | --- |
| `tests/harness/test_harness_cli.py::test_cli_plan_json_output` | CLI plan over HEAD~1 plus dirty backend-routed test file requires `--test-node`; test expects exit 0 without supplying it |
| `tests/harness/test_harness_cli.py::test_cli_verify_dry_run_exit_code_0` | Same input requirement, actual exit 2 instead of expected 0 |
| `tests/test_admin_technical_reports.py::test_admin_technical_overview_metrics` | One quality location returned, expected two |
| `tests/test_auth_attendance.py::test_protected_meter_reading_and_no_image_persistence` | Real inference raises FileNotFoundError for absent OCR artifacts |
| `tests/test_meter_logbook.py::test_no_meter_image_persistence_across_full_lifecycle` | Same missing OCR artifacts |
| `tests/test_meter_spatial_audit_and_seed.py::test_repository_audit_execution` | Local DB has 12 meters, expected 24 |
| `tests/test_v16e_s1_simulation.py::test_5zone_map_active_pres_gate_absent` | Frozen V16A map version returned, expected Demo V1 five-zone version |
| `tests/test_v16e_s1_simulation.py::test_clean_asset_and_meter_baselines` | Zero Demo V1 assets, expected 32 |
| `tests/test_v16e_s1_simulation.py::test_deterministic_readings_and_active_round` | Zero Demo V1 readings, expected 4032 |
| `tests/test_v16e_s1_simulation.py::test_electricity_and_water_network_acyclic` | Zero Demo V1 network edges, expected 24 |
| `tests/test_v16e_s1_simulation.py::test_legacy_meters_quarantined_and_retired` | Zero legacy meters, expected 12 |
| `tests/test_v16e_s1_simulation.py::test_seed_idempotency` | Demo V1 seed violates `meters.measurement_unit` NOT NULL |

Known-node comparison by exact ID and material reason:

| Exact node | Classification |
| --- | --- |
| `tests/test_v16c_asset_foundation.py::test_asset_create_read_update_and_audit` | KNOWN_FAILURE: empty asset list |
| `tests/test_v16d_asset_verification.py::test_meter_review_matrix_and_summary_v16d` | KNOWN_FAILURE: empty spatial review list |
| `tests/test_v16e_asset_network.py::test_asset_network_endpoint_verified_only_default` | KNOWN_FAILURE: new node absent from empty set |
| `tests/test_v16e_asset_network.py::test_asset_network_utility_filter_and_focus` | KNOWN_FAILURE: new edge absent from empty set |
| `tests/test_v16e_s1_simulation.py::test_scenario_isolation_in_apis` | KNOWN_FAILURE_CHANGED_REASON: now fails earlier expecting 32 Demo V1 assets, rather than the recorded 364 legacy assets |

The full run reported these baseline improvements: the two current-round tests in
`test_meter_logbook.py`, `test_report_overview_metrics_hourly_and_locations`,
`test_fresh_seed_current_round_zero_of_twelve`, and
`test_one_meter_completion_real_workflow`. Historical baseline policy was not edited.

The product failures are in unchanged source/tests, with concrete environment/fixture
mismatches recorded above. They remain unresolved qualification findings. No OCR
model download, Demo V1 reset, Map topology change, or broad product fix was used to
force a green gate. The full RELEASE result remains FAILED.

After committing the runtime change and this separate documentation checkpoint,
`python -m pytest tests/harness -q` passed **59/59**. The two CLI failures were
resolved by the now-clean HEAD~1 documentation range, without changing harness
policy/tests. This does not waive the ten other newly listed failures or the one
changed known-failure reason. No full-suite rerun or redundant frontend rebuild
was performed; only the concrete failed harness gate was repeated.

Checkpoint commit `c2b9c56` contains the runtime implementation and real tests.
The following documentation commit records the pending checkpoint; these commits
are stabilization work, not a qualified `PHASE_25_FINAL_SHA`.

## Final manual default-port gate

The user explicitly directed that PID 15244 remain untouched and that this gate
be completed manually only after port 8000 is free. Test ports are qualification
ports, not a new permanent configuration. From PowerShell, run:

```powershell
Set-Location 'D:\Projects\production-meter-reading\production-meter-reading-integration'
$env:PMR_RUNTIME_ROOT = 'D:\Projects\production-meter-reading\.runtime'
$env:PMR_PYTHON_EXE = 'D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe'
$occupied = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000, 5173, 5174 })
if ($occupied.Count) {
    $occupied | Select-Object LocalAddress, LocalPort, OwningProcess
    throw 'Default ports are still occupied. Preserve unowned processes.'
}
.\scripts\dev.ps1
if ($LASTEXITCODE -ne 0) { throw 'First default startup failed.' }
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-WebRequest http://localhost:5173 -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:5174 -UseBasicParsing | Select-Object StatusCode
Get-Content "$env:PMR_RUNTIME_ROOT\state\dev-pids.json"
.\scripts\stop-dev.ps1
if ($LASTEXITCODE -ne 0) { throw 'Default stop failed.' }
$remaining = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000, 5173, 5174 })
if ($remaining.Count) { throw 'Default ports were not released.' }
.\scripts\dev.ps1
if ($LASTEXITCODE -ne 0) { throw 'Second default startup failed.' }
& $env:PMR_PYTHON_EXE scripts/audit_demo_data_v2.py
if ($LASTEXITCODE -ne 0) { throw 'Demo V2 audit failed.' }
```

Expected: all three services READY with identity-backed state and COMPATIBLE API,
first stop releases all three ports, second start succeeds, Demo audit passes.
The final stack is intentionally left running. Use `stop-dev.ps1` when finished.
Do not begin Phase 2.6 until the manual gate and remaining freeze requirements pass.

`PHASE_25_FINAL_SHA`: **not established** (default ports not qualified).
`UAT_CANDIDATE_SHA`: **not established**.
`UAT_FINAL_SHA`: **not established**.

Future approved concepts remain deferred: Map = Operations Command Center;
Reporting = Analytics Workbench; Map topology audit; Phase 3 User Portal UX;
OCR model readiness. No merge to main is authorized or performed.
