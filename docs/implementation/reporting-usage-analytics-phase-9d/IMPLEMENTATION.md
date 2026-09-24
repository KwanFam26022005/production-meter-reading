# Thread 9D — Reporting & Usage Analytics

Base: `44ff48875b1f73e25c5391c990ad10fea00b5044` on
`infra/lean-se-harness-foundation`. Work branch:
`feature/reporting-usage-analytics-phase-9d`.

## What changed

- `reporting_scope.py` projects published meter-round scope in bulk. SNAPSHOT
  uses scheduled `ReadingRoundMeter` rows and their zone/utility snapshots;
  LEGACY_DYNAMIC resolves current active inventory and is labeled. Outcomes
  and staffing use the frozen 9A–9C rules. PRIMARY plus SUPPORT covers one
  meter-round. Assigned identities and the reading executor remain separate.
- The Admin operational API exposes workload, coverage, round/zone/shift
  breakdown, individual tasks, and an ordered action queue. Technical and
  compatibility User report denominators, meter scope counts, and CSV exports
  now follow the same scheduled scope. The compatibility `locations` field in
  the User overview displays operational zones; this semantic change is
  explicit in the reporting contract.
- Existing meter metadata and its audited Admin update API now accept
  `measurement_unit` and `register_semantics`. The idempotent SQLite upgrade
  leaves existing rows `UNKNOWN`; no utility-to-unit backfill occurs. There
  was no Admin device metadata editor using this API to extend. Configuration
  therefore depends on an authorized Admin API request until a dedicated
  metadata editor is approved.
- `usage_analytics.py` derives adjacent confirmed cumulative intervals in
  memory. A prior endpoint may precede the selected date range. It returns
  raw evidence, quality states, configured physical deltas/rates, seven-day
  comparable-window median baselines, separated utility/unit groups, zone and
  meter contributors, and contributor coverage. The API has dedicated
  overview and per-meter routes.
- Admin Reporting keeps its existing technical reports and audit evidence in
  six ordered tabs: Điều hành, Tiêu thụ & dao động, Việc cần xử lý, Chất lượng
  OCR, Công tơ, Kiểm toán. The first view emphasizes due/completed/unassigned/
  actionable work. Usage offers interval bars, baseline comparison, a day ×
  slot heatmap, and per-meter consumption/rate/raw-register switching. OCR
  provenance and pipeline settings remain in the quality tab.
  Due and completed KPI cards expand their underlying tasks, including
  reading evidence actions for completed rows.

## Semantics and limits

The frozen [reporting contract](../../contracts/reporting.md) owns the exact
denominator, coverage, unit, interval, baseline, and action definitions.
Current meter metadata is not effective-dated, so correcting it changes the
interpretation of past readings without changing the raw reading evidence.
Unknown metadata never produces a physical total or rate. Negative deltas are
flagged for review; rollover is not guessed. Only published manual/OCR reading
rounds are available, so the displays cannot claim telemetry or instantaneous
power. Baselines require three comparable prior intervals, and no anomaly or
leak threshold is asserted.

No Map V2, simulation, spatial, GitLab, notification, billing, forecasting,
or persisted usage table was added. The User Portal UI is unchanged; its
existing reporting API received the 9A scope correction.
