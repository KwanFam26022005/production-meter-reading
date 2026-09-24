# Thread 9D — Handoff

- Base SHA: `44ff48875b1f73e25c5391c990ad10fea00b5044`
- Branch: `feature/reporting-usage-analytics-phase-9d`
- Contract: [Reporting & Usage Analytics](../../contracts/reporting.md),
  `FROZEN_AUTHORITATIVE`
- Harness: STANDARD; `backend-core`, `operations-ui`, `admin-responsive`;
  no Harness V1 routing defect identified.

## Admin questions answered

The operational API supplies scheduled and due meter-round counts, completed
and unassigned due work, coverage, and round/zone/shift drill-down. The action
queue identifies work requiring intervention, with assigned PRIMARY/SUPPORT
and actual executor identities. Reading IDs support evidence drill-down.

The usage API supplies separate electricity/water and measurement-unit
groups, interval deltas and average interval rates when metadata supports
them, highest interval, baseline variation, zone/meter contributors, raw
register points, and contributor coverage. OCR quality retains provenance,
trend, zone/type breakdown, watchlist, latency, and pipeline configuration.

## Outstanding business inputs

- BD-02: existing meters remain `UNKNOWN` until their unit and register
  semantics are verified through the current Admin meter metadata API.
- A baseline is unavailable with fewer than three matching prior intervals
  in seven local calendar days. Sparse published rounds also limit interval
  resolution and contributor coverage.
- Thresholds for anomaly or leak detection and any register maximum for
  rollover correction remain undefined. No automatic diagnosis is present.
- Meter metadata is current-state only. Historical effective dates would be
  needed to re-interpret periods after a meter register or unit replacement.

## Product boundary and next step

Map V2, User Portal UI, GitLab, real-time telemetry, ML, leak diagnosis, and
billing were not changed. Stop after qualification, commit, and push this
branch; do not merge automatically.
