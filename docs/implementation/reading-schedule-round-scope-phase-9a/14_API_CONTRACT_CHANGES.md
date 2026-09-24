# 14 — API contract changes

Schedule requests now include a typed `scope` object and create requests include `expected_scope_fingerprint`. Preview returns `AdminSchedulePreviewResponse.scope` with exact membership summary and fingerprint. Create returns `scope_fingerprint` and `scope_materialized_count`.

Round list/current/detail contracts expose `scope_mode` and snapshot scope count where applicable. Round meter items expose scope row ID, origin/status, saved zone/utility, current zone fields where available, and meter availability. Batch progress adds separate unique-meter and meter-slot fields while retaining its compatibility fields.

Out-of-scope confirm/Review is HTTP 422; stale preview is HTTP 409. Existing pre-9A round responses identify `LEGACY_DYNAMIC`.
