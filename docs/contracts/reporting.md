# Domain Contract — Reporting & Usage Analytics

## Status

`FROZEN_AUTHORITATIVE`

## Owner and sources

Thread 9D — Admin Reporting. Implementation: `backend/app/reporting_scope.py`,
`backend/app/usage_analytics.py`, `backend/app/admin_reports.py`,
`backend/app/reporting.py`, and the Reporting routes in `backend/app/main.py`.

This contract depends on the frozen 9A reading schedule, 9B assignment, and 9C
user task contracts. It does not redefine their authority.

## Operational workload

1. A meter-round is one scheduled meter within one published, non-cancelled
   reading round. Cancelled rounds remain available for audit, not active work.
2. For `SNAPSHOT`, the denominator is the count of `ReadingRoundMeter` rows with
   `scope_status = SCHEDULED`. The snapshot survives later inventory additions,
   deactivation, retirement, and zone or utility changes.
3. Snapshot zone and utility filters use `zone_id_snapshot` and
   `utility_type_snapshot`. Current `Meter.location`, `zone_id`, and
   `utility_type` cannot rewrite publication-time scope.
4. `LEGACY_DYNAMIC` continues to resolve currently active, non-retired meters
   at query time. It is labeled as dynamic; no historic immutable scope is
   fabricated.
5. A scheduled meter-round becomes due when its scheduled UTC timestamp is at
   or before the current timestamp. Future rows are `UPCOMING`, never `MISSING`.
6. Every due row has exactly one reporting outcome: `CONFIRMED`, `REVIEW`, or
   `MISSING`. A valid reading record determines the first two; absent records
   are missing. Their counts cannot exceed the due denominator.
7. Confirmation-source filtering is an outcome or provenance view. It never
   changes scheduled or due workload, completion, or missing counts.
8. Display zone names currently resolve from `OperationalZone`; the immutable
   zone ID owns grouping. The existing 9A schema has no `zone_name_snapshot`.
9. The compatibility User report response retains a `locations` field name,
   but its entries now represent operational zones. User CSV exports likewise
   use unit-neutral values and disclose scope mode.

## Assignment coverage and execution

1. Coverage joins each scheduled meter-round's snapshot zone and scheduled
   timestamp to active `OperationalAssignment` authority. It uses the canonical
   9B `shift_window` rule, including previous-day CA3 work dates.
2. `assigned_due` counts unique due meter-rounds with one or more covering
   assignments. PRIMARY plus SUPPORT still counts as one assigned workload item.
3. `unassigned_due = due - assigned_due`; coverage is
   `assigned_due / due`, with zero denominator displayed safely as zero.
4. PRIMARY and SUPPORT identities are retained. Both are valid assigned
   responsibility, as in 9C.
5. `MeterReading.user_id` is the actual executor. It is never replaced by an
   assigned user. A SUPPORT or Admin execution is not automatically a violation.
6. Round, zone, expected shift, task, and reading IDs remain available for
   drill-down. Unassigned expected shifts are derived through the same 9B
   shift windows, not through an independent clock table.

## Measurement metadata authority

1. `Meter.utility_type` names the utility. It does not define a measurement
   unit or register behavior.
2. `Meter.measurement_unit` is `UNKNOWN`, `KWH`, or `M3`.
   `Meter.register_semantics` is `UNKNOWN`, `CUMULATIVE`, or `INTERVAL`.
3. Existing database rows migrate to `UNKNOWN` for both new fields. No meter
   is assigned kWh or m³ from utility type, code, or LCD/MECHANICAL technology.
4. Admins configure these fields through the existing authenticated, CSRF
   protected meter metadata API. The update is audited. Incompatible
   `WATER + KWH` and `ELECTRICITY + M3` combinations are rejected.
5. Measurement metadata currently lives on the meter, not a historical
   effective-date table. A later metadata correction changes how historical
   intervals are interpreted; the original readings remain unchanged. Admins
   must verify metadata before treating retrospective totals as physical usage.

## Derived usage interval

1. Usage is a read model, not a persisted table.
2. Endpoints are adjacent chronological `CONFIRMED` readings of the same
   meter, ordered by scheduled round timestamp. `REVIEW` is never an endpoint.
3. For `CUMULATIVE`, `delta = to_value - from_value`. Both values must parse
   as finite decimal numbers; elapsed scheduled time must be positive.
4. A negative difference is `RESET_OR_ROLLOVER_SUSPECTED`, never negative
   consumption. No rollover is calculated without an authoritative register
   maximum. Both raw values and reading IDs remain available.
5. `UNKNOWN` register semantics and known `INTERVAL` semantics do not assert a
   cumulative consumption interval. They retain a quality state.
6. A positive raw difference with unknown unit may be disclosed as a register
   difference, but cannot enter a physical usage total or receive a rate unit.
7. With explicit `ELECTRICITY + KWH + CUMULATIVE`, interval delta is kWh and
   `delta / elapsed_hours` is kW, labeled average interval power.
8. With explicit `WATER + M3 + CUMULATIVE`, interval delta is m³ and the
   average interval flow is m³/h.
9. Quality states include `VALID`, `INSUFFICIENT_DATA`,
   `NON_NUMERIC_READING`, `UNKNOWN_REGISTER_SEMANTICS`, `UNKNOWN_UNIT`,
   `INTERVAL_REGISTER_NOT_DERIVED`, `INVALID_INTERVAL`,
   `RESET_OR_ROLLOVER_SUSPECTED`, and `INCOMPATIBLE_METADATA`.
10. Each interval exposes endpoint IDs, scheduled timestamps, raw values,
    elapsed minutes, source provenance, delta when derivable, and rate only
    when physically supported.

## Baseline and variation

1. A V1 baseline compares a valid meter interval with valid prior intervals
   from the previous seven local calendar days having identical local start
   and end clock times.
2. At least three comparable prior intervals are required. Their median
   delta is the baseline; otherwise status is `INSUFFICIENT_HISTORY` and no
   baseline or normal band is invented.
3. `difference = actual_delta - baseline_delta`.
   `deviation_percent = difference / baseline_delta * 100` only if the baseline
   is nonzero. A zero baseline has a null percentage.
4. Variation is descriptive. No business threshold, anomaly diagnosis,
   leak diagnosis, or forecasting is supplied by this contract.

## Aggregation and coverage

1. Electricity and water are never added into one physical total. Different
   measurement units are never added without a conversion contract.
2. Groups are keyed by snapshot utility type and configured measurement unit.
   Incompatible metadata stays out of physical totals.
3. An interval contributes to the selected range and zone only when its **to**
   round is in published scope. Its prior confirmed point may precede the
   selected range. Zone attribution uses that to-round snapshot zone.
4. `eligible_meters` counts distinct scoped meters in a group.
   `meters_with_valid_interval` counts distinct contributors with at least one
   valid interval ending in the selection. Coverage is their ratio.
5. Every group and zone breakdown exposes these counts and percentage. A
   missing contributor is never silently represented as zero consumption.

## Action and OCR quality separation

1. The operational queue orders unassigned due work, missing due work, review
   work, then record-level integrity issues; oldest scheduled item comes first
   within each category. No opaque severity score is used.
2. `USER_CORRECTED` and `MANUAL_ENTRY` are OCR provenance, not operational
   incidents by themselves. OCR quality retains source distribution, trends,
   meter type, zone, watchlist, latency, and pipeline configuration.
3. The OCR direct-confirmation rate is not called OCR accuracy because no
   independently verified ground truth is present.
4. An integrity record is actionable when a source reading ID supports drill.
   Global integrity totals may include records outside the selected report
   range and remain disclosed separately.

## Resolution and limits

- Data points follow published manual/OCR reading rounds. They are not
  telemetry, instantaneous load, or a fixed 15-minute time series.
- Unknown units, unknown register semantics, single-point histories, review
  gaps, resets, and sparse comparable history reduce usable coverage.
- Automatic leak detection, billing, tariffs, carbon, ML anomaly thresholds,
  and predictive forecasts are outside Thread 9D.
- Legacy dynamic scope cannot be reconstructed as a historical snapshot.
