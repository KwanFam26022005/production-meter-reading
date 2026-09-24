# Thread 9D — Qualification evidence

## Harness selection

`STANDARD` was selected after semantic review of shared backend models,
routes, schemas, and frontend types/API. Declared impacts are `backend-core`,
`operations-ui`, and `admin-responsive`. The compatibility User report API
changed, so the `user-suite` gate is included. Frozen 9A, 9B, and 9C
regression gates are included explicitly. Harness V1 files were not changed.

The `python tools/harness.py verify` run selected these gates:

| Gate | Result |
| --- | --- |
| `backend-focused` (`tests/test_reporting_9d.py`, `tests/test_reporting.py`) | PASS; 27 tests (22 + 5) |
| `reading-schedule` (9A) | PASS |
| `operational-assignment` (9B) | PASS |
| `user-task-projection` (9C) | PASS |
| `docs-integrity` | PASS |
| `admin-responsive-small` | MANUAL_REQUIRED; evidence below |
| `operations-suite`, `operations-build`, `user-suite` | Harness command launch FAIL on Windows; direct commands PASS |

The harness process returned `FAILED` because its Python subprocess runner
invokes `npm` directly. On this Windows machine PowerShell finds `npm.ps1`,
but `subprocess.run(["npm", ...])` raises `FileNotFoundError: [WinError 2]`.
This was reproduced with `npm --version` through the same Python launch
method. No product test failure or domain-routing defect was found, and
Harness V1 remains frozen. The exact configured commands were then run from
PowerShell: `npm run test:operations` **396 passed**,
`npm run build:operations` **passed**, and `npm run test:user` **90 passed**. The
Operations build reported its existing large-chunk advisory; it produced the
bundle successfully. Backend full, User build, Map, spatial, and simulation
gates were not selected. Known-failure delta is not applicable without a
backend-full gate.

## Admin responsive acceptance

Three representative captures show the running Admin Reporting component
with mock API responses at the required small matrix. The temporary preview
entry was removed after capture. Browser document overflow checks returned
no horizontal overflow at each viewport.

| Viewport | View and checked controls | Evidence |
| --- | --- | --- |
| 1024 × 768 | Tabs, wrapping filters, KPI row, round/zone/shift table and drill | [Overview](reporting-1024-overview.png) |
| 1366 × 768 | Usage filters, coverage cards, interval/heatmap mode, chart width | [Usage](reporting-1366-usage.png) |
| 1920 × 1080 | Action table, responsibility/executor, drill action | [Actions](reporting-1920-actions.png) |

The 1920 meter detail was also inspected with the consumption/rate/raw switch
and original cumulative register evidence. Keyboard tab and filter controls
remain native buttons/selects; the tab list supports left/right arrows.
`admin-responsive-small` remains a manual gate in Harness V1 and therefore
reports `MANUAL_REQUIRED`; the screenshots and checks are the separate human
acceptance evidence.

## Data states exercised

Focused tests cover empty dates and zero scope, future work, no assignment,
PRIMARY plus SUPPORT, one confirmed point, unknown unit/semantics, review
endpoint exclusion, nonnumeric values, negative delta, long gaps, insufficient
and zero baselines, mixed utilities and units, full completion, integrity
actions, and API response wiring. Visual states for healthy and actionable
work, unknown unit, and electricity/water displays were inspected in the
Admin component and focused frontend assertions.
