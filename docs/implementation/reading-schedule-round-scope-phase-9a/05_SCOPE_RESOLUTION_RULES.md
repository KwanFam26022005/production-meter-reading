# 05 — Scope resolution rules

`resolve_schedule_scope()` is the authority for preview and creation. Eligibility is `Meter.is_active == true` and `lifecycle_status != RETIRED`; route status is not an additional exclusion. Results are sorted by `meter_code`.

Supported ID-based modes:

- `ALL_ELIGIBLE`: all eligible meters.
- `BY_ZONE`: one or more stable `zone_ids`.
- `BY_UTILITY`: one or more supported utility types.
- `SELECTED_METERS`: one or more stable `meter_ids`.

Pydantic validation rejects irrelevant or missing mode parameters. Unknown, inactive, and retired manual selections are returned as invalid selections. A selected zone/utility with no eligible members is invalid. Empty resolved scope is rejected at publish. Scope provenance is recorded as `ALL_ELIGIBLE`, `ZONE_FILTER`, `UTILITY_FILTER`, or `MANUAL_SELECTION`.
