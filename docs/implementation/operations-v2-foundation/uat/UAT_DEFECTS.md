# Operations V2 UAT Defects

Severity is based on business impact, not visual preference. Each entry records the required reproduction context and its disposition.

## Resolved product defects

### UAT-DEF-01 — Equal sync timestamps could select the wrong latest reading

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** User Portal, Operations Dashboard, Reporting, meter logbook / Employee and Admin
- **Precondition:** Two confirmed readings for one meter share a server timestamp but belong to rounds with different scheduled times.
- **Steps:** Create/inspect the later-scheduled round first or sync the two readings at the same server time; open history, task, dashboard, or report.
- **Expected:** Latest/trend order follows scheduled round time, then server timestamp and stable ID.
- **Actual:** Server timestamp alone could make a prior round appear latest.
- **Evidence:** Controlled E2E reading detail in [controlled-e2e-record.json](evidence/cross-feature/controlled-e2e-record.json); regression nodes in `tests/test_admin_operations.py`, `tests/test_meter_logbook.py`, `tests/test_reporting_9d.py`, and `tests/test_user_task_projection_9c.py`.
- **Suspected layer:** BUSINESS / API
- **Fix:** Shared round chronology key used across affected read models and history views.

### UAT-DEF-02 — Demo V2 seed claimed USER_CORRECTED without an original OCR value

- **Severity:** HIGH — RESOLVED
- **Workspace / role:** User Portal, Reporting, Demo V2 data / Employee and Admin
- **Precondition:** Deterministic seed selects USER_CORRECTED while the generated row has no OCR value to correct.
- **Steps:** Seed Demo V2; inspect `confirmation_source`, `ocr_reading`, and reporting provenance.
- **Expected:** USER_CORRECTED has a genuine original OCR value; otherwise the row is MANUAL_ENTRY.
- **Actual:** Some deterministic rows asserted correction provenance with no original OCR value.
- **Evidence:** Initial provenance counts are in [initial-state.json](evidence/database/initial-state.json); final seed audit log and source regression are recorded with final state and the seed/audit scripts.
- **Suspected layer:** DATA / BUSINESS
- **Fix:** Seed maps unsupported synthetic corrections to MANUAL_ENTRY and audit checks provenance consistency. No OCR value is fabricated.

### UAT-DEF-03 — Meter metadata was omitted or inferred in downstream projections

- **Severity:** HIGH — RESOLVED
- **Workspace / role:** User task, meter detail, inspection, and Reporting / Employee and Admin
- **Precondition:** A meter has utility/unit/register metadata, including an UNKNOWN unit or register.
- **Steps:** Compare meter API, task projection, meter history/report, and Admin inspection.
- **Expected:** Preserve configured metadata across APIs and show UNKNOWN explicitly without inferring kWh, m³, or cumulative semantics.
- **Actual:** Some projections omitted configured fields and UI paths could substitute utility-derived units.
- **Evidence:** Admin meter API/drawer screenshots under `evidence/meters/`; User task screenshots under `evidence/responsive/`; final semantic audit in [final-state.json](evidence/database/final-state.json).
- **Suspected layer:** API / UI / DATA
- **Fix:** Metadata propagated through schemas and projections; User unit labels now use configured measurement units only.

### UAT-DEF-04 — OTHER/UNKNOWN meter types were presented as LCD

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** User Portal, Admin meter inventory, Hậu kiểm / Employee and Admin
- **Precondition:** A meter type is OTHER or UNKNOWN.
- **Steps:** Open the task card, meter inspection, or Admin edit drawer.
- **Expected:** OTHER reads “Khác”; UNKNOWN reads “Chưa cấu hình loại.”
- **Actual:** A fallback label could imply an LCD meter.
- **Evidence:** [admin-meter-detail-unknown-v2-1366x768-postfix.png](evidence/meters/admin-meter-detail-unknown-v2-1366x768-postfix.png) and User task screenshots under `evidence/responsive/`.
- **Suspected layer:** UI
- **Fix:** Shared truthful meter-type labels; Admin edit preserves OTHER and UNKNOWN.

### UAT-DEF-05 — Changing the schedule date left an unrelated round detail open

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** Lịch ghi / Admin
- **Precondition:** A round detail is open and the selected day changes to a date that does not contain that round.
- **Steps:** Open a round, change the date, and inspect the detail panel.
- **Expected:** Close the stale detail and clear its meter rows/errors.
- **Actual:** Previous-date snapshot detail could remain under the new date.
- **Evidence:** Current schedule/detail screenshots under `evidence/schedule/`; source-contract regression in `frontend/tests/v9aReadingScheduleScope.test.ts`.
- **Suspected layer:** UI
- **Fix:** Clear the selection and loaded detail when it leaves the selected day's scope.

### UAT-DEF-06 — Current audit events lacked Vietnamese action labels

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** Audit / Admin
- **Precondition:** Inspect round, assignment, schedule, or meter lifecycle events.
- **Steps:** Open the audit list and expand a controlled assignment event.
- **Expected:** Vietnamese action label maps to the actual event; actor, time, entity, before/after, and raw detail remain available.
- **Actual:** Several current event types lacked a direct label.
- **Evidence:** Assignment create/cancel screenshots under `evidence/audit/`; source-contract regression in `frontend/tests/v9dReportingAnalytics.test.ts`.
- **Suspected layer:** UI
- **Fix:** Added event labels and field summaries for current schedule, assignment, and meter lifecycle actions.

### UAT-DEF-07 — CA3 at midnight was labeled from the calendar day instead of round time

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** Operations Dashboard and command context / Admin
- **Precondition:** A round is scheduled at 00:00 local time during the CA3 shift that began the prior day.
- **Steps:** Open the dashboard/command bar at the 00:00 round.
- **Expected:** Show CA3 and work date of the prior shift start.
- **Actual:** Display could default to CA1 from the new calendar day.
- **Evidence:** `evidence/responsive/admin-dashboard-1024x768-postfix.png`, `admin-dashboard-1366x768-postfix.png`, and `admin-dashboard-1920x1080-postfix.png`.
- **Suspected layer:** BUSINESS / UI
- **Fix:** Derive the displayed shift from the round time using the frozen CA3 boundary.

### UAT-DEF-08 — Admin meter inventory omitted the V2 operational zone

- **Severity:** MEDIUM — RESOLVED
- **Workspace / role:** Admin meter inventory/drawer / Admin
- **Precondition:** Canonical V2 meter has `zone_name` and `presentation_zone_name`, while physical `location` is null.
- **Steps:** Open SIM-EM-001 in the Admin inventory and inspect its location/detail.
- **Expected:** Show the operational zone and distinguish the Map presentation zone from physical location.
- **Actual:** Inventory showed `—`; API returned the configured zone.
- **Evidence:** Before: `evidence/meters/admin-meter-detail-zone-missing-before-1366x768.png`; after: `evidence/meters/admin-meter-inventory-v2-1366x768-postfix.png` and `admin-meter-detail-unknown-v2-1366x768-postfix.png`.
- **Suspected layer:** UI
- **Fix:** Inventory and mobile cards show the operational zone; edit drawer separately labels operational and Map presentation zones.

### UAT-DEF-09 — Demo V2 meter and snapshot zones did not join to operational assignments

- **Severity:** HIGH — RESOLVED
- **Workspace / role:** Employee task projection and Demo V2 data / Employee and Admin
- **Precondition:** A V2 employee has an active assignment, but meter and persisted round snapshot zone IDs are absent from or inconsistent with the operational-zone catalog.
- **Steps:** Open the current task projection for an assigned employee and compare `OperationalAssignment.zone_id`, `Meter.zone_id`, and `ReadingRoundMeter.zone_id_snapshot`.
- **Expected:** Matching operational zones project the round's persisted meters; an actually unassigned employee receives zero tasks with an unassigned reason.
- **Actual:** The pre-fix assigned employee had zero meters with `NO_METERS_IN_ZONE`; the initial state recorded 12 V2 meters missing zones and 720 snapshot zones outside the operational catalog.
- **Evidence:** [pre-fix projection](evidence/user-task/baseline-projection-api.json), [initial database state](evidence/database/initial-state.json), and [final semantic audit](evidence/database/final-state.json).
- **Suspected layer:** DATA / BUSINESS
- **Fix:** Corrected the Demo V2 seed's operational zone mapping and snapshot data; strengthened the audit to require equality with the operational-zone catalog. The separate live no-assignment case is shown in `evidence/user-task/no-assignment-employee-001-768x1024.png`.

### UAT-DEF-10 — Demo V2 seeded assignments without checking schedule and leave eligibility

- **Severity:** HIGH — RESOLVED
- **Workspace / role:** Phân ca and Demo V2 data / Admin
- **Precondition:** A generated assignment targets an OFF, approved-leave, or nonmatching/missing WorkSchedule row.
- **Steps:** Compare seeded active assignments with each employee's WorkSchedule and approved leave, then preview assignment for OFF/leave/unscheduled employees.
- **Expected:** Every active assignment has an explicit compatible schedule and no OFF/approved-leave conflict; ineligible previews are rejected.
- **Actual:** The initial seed could choose any employee without considering shift eligibility, so the generated baseline could contradict its roster.
- **Evidence:** Eligibility audit in [final-state.json](evidence/database/final-state.json); live OFF/approved-leave previews under `evidence/roster/`.
- **Suspected layer:** DATA / BUSINESS
- **Fix:** Seed now chooses only schedule-eligible employees; the audit checks every active assignment against WorkSchedule and approved leave. API eligibility behavior remained enforced.

## Environment/process limitations

### UAT-ENV-01 — Default active scenario hid canonical V2 meters

- **Severity:** MEDIUM — RESOLVED FOR UAT CONFIGURATION
- **Workspace / role:** Operations Admin meter inventory / Admin
- **Precondition:** Canonical DB is seeded with `tan-thuan-demo-v2`, but `active_scenario` defaults to `tan-thuan-demo-v1`.
- **Steps:** Start the development stack without `ACTIVE_SCENARIO`; open Admin meters.
- **Expected:** UAT's canonical V2 meter inventory shows its 12 meters.
- **Actual:** The default V1 scope returned an empty inventory.
- **Evidence:** `evidence/meters/meter-master-empty-scenario-mismatch-1366x768.png`; V2 API/inventory screenshots after setting the scenario are under `evidence/meters/`.
- **Suspected layer:** ENVIRONMENT
- **Disposition:** Started this UAT with `ACTIVE_SCENARIO=tan-thuan-demo-v2`; source default was not changed because that setting also scopes other simulation workspaces. This is recorded as an explicit local UAT precondition.

### UAT-ENV-02 — Camera permission prevented a live image-based field trial

- **Severity:** MEDIUM — ENVIRONMENT LIMITATION
- **Workspace / role:** User Portal reading / Employee
- **Precondition:** Local browser camera permission denied; no authentic meter photo available in the local evidence/fixture locations.
- **Steps:** Open a pending meter task and request camera capture.
- **Expected:** A real capture may proceed to the supported OCR/review/manual workflow.
- **Actual:** The browser denied camera access and the app truthfully reported that the camera could not be opened. No OCR was executed. Existing deterministic fixtures cover USER_CORRECTED contract behavior; MANUAL_ENTRY was exercised through the authenticated reading API and progress refreshed in the UI.
- **Evidence:** `evidence/reading/camera-unavailable-390x844.png` and the existing meter-logbook backend fixture tests.
- **Suspected layer:** ENVIRONMENT
- **Disposition:** No image or OCR output was fabricated. Record `REAL_OCR_INFERENCE_NOT_QUALIFIED_IN_CURRENT_ENVIRONMENT`; qualify the live camera/OCR path later on an authorized camera-enabled device with a genuine test meter image.

### UAT-ENV-03 — Raw pre-reset copy did not include SQLite WAL readings

- **Severity:** MEDIUM — PROCESS DEVIATION, FINAL BASELINE RECOVERED
- **Workspace / role:** Canonical database / UAT operator
- **Precondition:** SQLite database is in WAL journal mode and a raw file copy is taken without the WAL.
- **Steps:** Copy `app.db` immediately before the approved deterministic V2 reset; inspect the copied tables.
- **Expected:** Backup is a consistent restorable snapshot containing the latest controlled rows.
- **Actual:** The copied file reported zero readings and was not a valid restore point. The earlier initial backup remained valid; the V2 seed restored the deterministic baseline; a consistent SQLite online backup was then created and verified.
- **Evidence:** Incomplete copy `phase27-uat-pre-final-reset-20260925.sqlite` has SHA-256 `9413e5e84a8f877eb3b7e5fc0f5bff68dc3617abe2fe792aa45afb7db380be85`; verified final online backup details are in `evidence/database/final-state.json`.
- **Suspected layer:** ENVIRONMENT
- **Disposition:** Final canonical database is healthy and deterministic. The incomplete copy is explicitly excluded from restoration; no unknown UAT rows remain.

### UAT-ENV-04 — Standalone spatial gate resolved the legacy repository database

- **Severity:** MEDIUM — RESOLVED FOR REGRESSION RUNNER
- **Workspace / role:** Automated test environment / UAT operator
- **Precondition:** Run the legacy spatial test modules outside the full backend test process without setting `DATABASE_URL`.
- **Steps:** Run `tests/test_v16_spatial_crud.py` and `tests/test_v16a_spatial_authority.py` as a standalone command.
- **Expected:** Spatial assertions use the isolated six-zone test database.
- **Actual:** The legacy module resolved repository-local `data/app.db`, whose active map has five zones; two assertions expected six. The module also runs draft cleanup as an automatic fixture. A post-run read-only check found `integrity_check=ok` and zero DRAFT rows there; the pre-run DRAFT count was not captured. The canonical UAT database was not the target and retained its audited 719/60/720/269 counts.
- **Evidence:** The initial failing diagnostic and corrected 11/11 run with `DATABASE_URL=sqlite:///./data/test_app.db`; canonical final state in `evidence/database/final-state.json`.
- **Suspected layer:** ENVIRONMENT
- **Disposition:** Run regression tests with `DATABASE_URL=sqlite:///./data/test_app.db`. The initial diagnostic is recorded as a noncanonical test-environment deviation; no database restore was attempted.
