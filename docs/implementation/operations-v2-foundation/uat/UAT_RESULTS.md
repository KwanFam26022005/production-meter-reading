# Operations V2 UAT Results

**Candidate:** `e6d4b204cb871647b39fb1c5ec5d0f8e98d0fd85`
**Test date:** 2026-09-25 (`Asia/Ho_Chi_Minh`)
**Final source SHA / remote / worktree:** recorded in [UAT_HANDOFF.md](UAT_HANDOFF.md) after the final commits.

## Scenario summary

| ID | Result | Evidence/notes |
| --- | --- | --- |
| UAT-01 Authentication and authorization | PASS | Admin and Employee valid login/logout; invalid credentials returned 401; post-logout/invalid session returned 401; Employee Admin dashboard returned 403. See [auth-api.json](evidence/auth/auth-api.json). |
| UAT-02 Operations Dashboard | PASS | Current operational state and drilldowns loaded; CA3 at 00:00 was displayed correctly. Empty/error states were not forced where no safe production-like trigger existed. Current dashboard screenshots are in `evidence/responsive/`. |
| UAT-03 Phân ca | PASS | CA1/CA2/CA3/HC, OFF, approved leave, missing schedule, duplicate PRIMARY, valid SUPPORT, and controlled SUPPORT cancellation were checked. WorkSchedule eligibility and audit history were preserved. |
| UAT-04 Lịch ghi | PASS | Past/current/upcoming views and SNAPSHOT scope were checked. The controlled round returned 12 persisted RRM rows, including `zone_id_snapshot`; changing the selected date closed stale round detail. Cancellation retained history. |
| UAT-05 Meter inventory | PASS after fix | Electric, water, and UNKNOWN meters were checked in Admin inventory/drawer and API. `OTHER` stays “Khác”; UNKNOWN water remains UNKNOWN for unit/register. Operational and presentation zones are now visible. Asset links without verified relations are disclosed as unverified. |
| UAT-06 Employee task projection | PASS | Assigned PRIMARY and SUPPORT views, no-fallback behavior, snapshot zone intersection, CA3 work-date handling, and separate personal/global denominators were checked. Before SUPPORT cancellation DEMO2-009 saw shared zone tasks; after cancellation DEMO2-004 saw 1/10 personal progress against 1/12 global progress. |
| UAT-07 Field meter reading | PASS within genuine environment capability | The controlled authenticated MANUAL_ENTRY submission was accepted and updated Employee progress and downstream views. Existing deterministic OCR_CONFIRMED and REVIEW records were inspected without claiming real inference. USER_CORRECTED provenance rules are covered by the existing deterministic backend fixture tests; no live correction was fabricated. See the OCR/camera limitation below. |
| UAT-08 Hậu kiểm | PASS | Reading identity, round, configured unit, initial OCR value/provenance, correction/manual markers, navigation, keyboard focus guard, and unavailable-image messaging were reviewed. Missing evidence was reported truthfully. |
| UAT-09 Current Reporting | PASS | SNAPSHOT denominator, LEGACY_DYNAMIC behavior, completion, assignment coverage, assigned responsibility versus actual executor, separate electricity/water groups, interval rate, UNKNOWN readiness exclusion, and RESET_OR_ROLLOVER_SUSPECTED were checked. The 7-day same-window baseline correctly reported insufficient history where data did not support it. No combined utility total or forecasting claim was present. |
| UAT-10 Audit | PASS | Controlled round creation and assignment create/cancel events showed actor, timestamp, entity, action, before/after, and raw detail. Vietnamese labels mapped to real event types. |
| UAT-11 Cross-feature E2E | PASS | One controlled flow crossed Admin schedule/assignment, SNAPSHOT round/RRM, Employee task, MANUAL_ENTRY reading, progress, Dashboard, Hậu kiểm, Reporting, and Audit on the canonical database. Entity IDs are in [controlled-e2e-record.json](evidence/cross-feature/controlled-e2e-record.json). The controlled rows were removed by the approved deterministic reset. |
| UAT-12 Responsive review | COMPLETE | Operations was reviewed at 1024×768, 1366×768, and 1920×1080; User Portal at 360×800, 390×844, 430×932, and 768×1024. No page-level horizontal overflow or unreachable required drawer action was found. The Operations roster/table uses contained horizontal scrolling at 1024px; the 1366px inventory displays its columns. Vietnamese text wrapped; User task cards remained vertically scrollable. |

## Controlled cross-feature IDs

The observed controlled reading was `705.25` for meter `SIM-EM-001`, confirmed as `MANUAL_ENTRY` by Employee `DEMO2-004`. It belonged to a 12-meter SNAPSHOT round scheduled for 2026-09-25 00:00 local time, whose CA3 work date was 2026-09-24. The round-scope zone was `zone-technical`; the assigned PRIMARY and the actual executor remained distinct fields. Reporting computed a valid adjacent confirmed interval of approximately `0.3448 kWh` over 120 minutes (`0.1724 kW`). The 7-day same-window baseline was insufficient. No photo evidence was associated with this manual reading.

## Environment qualification limit

`REAL_OCR_INFERENCE_NOT_QUALIFIED_IN_CURRENT_ENVIRONMENT`: local OCR model artifacts were present and the launcher reported `READY`, but there was no authentic meter image for a genuine inference trial and the browser camera permission was denied. The User Portal truthfully showed camera unavailability. The actual OCR execution path was not simulated. Existing deterministic records and backend fixtures were used only for provenance/workflow assertions. No real OCR accuracy claim is made.

## Initial and final Demo V2 integrity

The initial database had the expected table counts and passed the then-current audit. Review during UAT found additional seed-semantic gaps that the earlier audit did not cover: V2 meters lacked their operational zones, snapshot zone IDs did not resolve to the operational-zone catalog, some generated assignments ignored schedule/leave eligibility, and some synthetic USER_CORRECTED rows had no original OCR value. The seed/audit tooling was corrected and the canonical database was reseeded through the approved V2 seed script.

The final semantic audit passed: 719 readings, 60 SNAPSHOT rounds, 720 RRM rows, 269 assignments; snapshot zones match the meter operational zones; timestamps resolve to the four intended local slots; active assignments match eligible schedules and leave; one unit remains UNKNOWN; readings include REVIEW and CONFIRMED; and provenance is consistent with the available deterministic OCR value. Final database checksum and online backup are recorded in [final-state.json](evidence/database/final-state.json).

## Final automated regression

The final RELEASE harness run against the UAT candidate range returned `PASSED`. It included backend-focused/full, harness self-tests, User and Operations tests/builds, bundle separation, B2 freeze, 9A/9B/9C, meter logbook, spatial audit/authority, unified simulation, documentation integrity, and `git diff --check`. The required responsive review remained a separate manual gate.

- Focused backend: 5/5 passed.
- Full backend: 386 passed, 4 failed nodes, 0 new failures (390 tests total). The Phase 2.6 aggregate was 380 passed / 7 known failures; the current suite includes three added chronology cases. All four currently failed nodes are present in `harness/known-failures.json` and their observed material reasons match the records:
  - `tests/test_v16c_asset_foundation.py::test_asset_create_read_update_and_audit` — asset list returned 0 after create; expected at least 1.
  - `tests/test_v16d_asset_verification.py::test_meter_review_matrix_and_summary_v16d` — spatial review meter list returned 0; expected 5.
  - `tests/test_v16e_asset_network.py::test_asset_network_endpoint_verified_only_default` — newly verified asset ID absent from the network node set.
  - `tests/test_v16e_asset_network.py::test_asset_network_utility_filter_and_focus` — newly verified connection ID absent from the network edge set.
- The harness compares exact node IDs and reports `UNVERIFIED_REASON`; the material-reason check above was completed manually against the final traceback and `harness/known-failures.json`.
- The other six nodes recorded in the 10-entry known-failure file passed in this run. Since the Phase 2.6 handoff supplied aggregate totals rather than a node-by-node result, those entries remain unchanged as historical records; no new product failure was classified.
- Harness self-tests: 59/59 passed. User suite: 92/92 passed. Operations suite: PASS (at least the 397-test accepted baseline). Focused 9A/9B/9C, logbook, spatial audit/authority, and simulation gates passed.
- User and Operations production builds, bundle separation, B2 checksum, docs integrity, and `git diff --check`: PASS.
- Demo V2 semantic audit: PASS. Final online backup and integrity details are in [final-state.json](evidence/database/final-state.json); full audit output is in [demo-v2-audit-final.log](evidence/database/demo-v2-audit-final.log).

## UAT defects and regression

Resolved product defects and environment limitations are itemized in [UAT_DEFECTS.md](UAT_DEFECTS.md). No BLOCKER remains. The resolved HIGH-severity seed/data-truth defects have no outstanding waiver. Automated regression results are recorded in [UAT_HANDOFF.md](UAT_HANDOFF.md) after verification.
