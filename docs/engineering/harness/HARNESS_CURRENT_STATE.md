# H0 — Engineering harness and skill current state

## 1. Baseline and scope

- `H0_BASE_SHA`: `c469814645253b16f8e9908633a9081bd2402856` on clean `feature/user-task-projection-phase-9c`; H0 branch `infra/lean-se-harness-foundation` starts at that exact commit. Parent checkpoint: `c190e7ff45d8aa74f668fa9b9adad6e6e1b65fd1`.
- H0 is documentation only. It does not continue 9D, alter product behavior, run historical suites, or create H1 files.
- The reported 9C checkpoint is 43/43 backend, 9B 16/16, 9A 14/14, logbook 31/31, User 90/90, Operations 392/392, build pass, B2 hash `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`, bundle isolation pass. These are **reported evidence**, not H0 reruns.
- Primary evidence: [`AGENTS.md`](../../../AGENTS.md), [UI skill](../../../.agent/skills/saigon-port-ui/SKILL.md), [DESIGN_DNA](../../../frontend/DESIGN_DNA.md), [package scripts](../../../frontend/package.json), [README](../../../README.md), the 9A/9B/9C handoffs, and selectively cited verification records below.

## 2. Current architecture

The product has distinct field User, desktop Operations, and Map V2 surfaces. The 9A–9C domain chain is `WHEN = ReadingRound`, `WHAT = ReadingRoundMeter`, `WHO + WHERE + SHIFT = OperationalAssignment + WorkSchedule`, `MY TASKS = UserTaskProjection = ReadingRoundMeter ∩ OperationalAssignment`; `MeterReading.user_id` is the actual executor. [9A handoff](../../implementation/reading-schedule-round-scope-phase-9a/THREAD_HANDOFF.md), [9B handoff](../../implementation/operational-shift-zone-assignment-phase-9b/THREAD_HANDOFF.md), [9C handoff](../../implementation/user-task-projection-phase-9c/THREAD_HANDOFF.md).

There is no tracked `harness/`, `tools/`, or `docs/contracts/` today (`git ls-files` check). Harness behavior exists as prose, scripts, tests, handoffs, and Git conventions. The [README](../../../README.md) explains the older OCR/logbook and iPhone demo path; it is not an authority for the 9A–9C task projection or a current verification matrix.

## 3. Skill inventory and routing

Only `.agent/skills/saigon-port-ui/SKILL.md` is Git tracked. The immediate `.agents/skills/` children are local external installations, not repo tracked. The system skill catalog and local `SKILL.md` existence resolve the named references; none of the six named AGENTS references is missing. `PRESENT_EXTERNAL` means available here, not guaranteed on another machine.

| Skill/reference | Declared location | Actual location/status | Repo tracked? | Responsibility; normal SE? | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `saigon-port-ui` | `.agent/skills/saigon-port-ui` | Same; `PRESENT_TRACKED` | Yes | Shared UI; yes for UI work | Keep a shorter core; split Admin responsive and Map specifics |
| `ui-ux-pro-max` | `.agents/skills/ui-ux-pro-max` top-level | Same and `C:/Users/User/.agents/skills/ui-ux-pro-max`; `PRESENT_EXTERNAL` | No | Optional accessibility/UX edge cases; no for routine SE | Route only for relevant edge cases; no data-table loading |
| `banner-design` | `.agents/skills/banner-design` | Same/local catalog; `OPTIONAL_EXTERNAL` | No | Marketing; no | Leave dormant |
| `brand` | `.agents/skills/brand` | Same/local catalog; `OPTIONAL_EXTERNAL` | No | External brand work; no | Leave dormant |
| `design` | `.agents/skills/design` | Same/local catalog; `OPTIONAL_EXTERNAL` | No | Marketing/design artifacts; no | Leave dormant |
| `slides` | `.agents/skills/slides` | Same/local catalog; `OPTIONAL_EXTERNAL` | No | Presentations; no | Leave dormant |
| `design-system`, `ui-styling` | Immediate `.agents/skills/` children, not named by AGENTS | Local copies; `PRESENT_EXTERNAL` | No | Optional design work; no | Do not auto-load |

For portability, mark all external skills optional and specify fallback to repo rules. The `.agents/skills/` path is present locally, so calling it a stale or unresolved reference here would be inaccurate.

## 4. `AGENTS.md` audit

| Major section | Disposition | Evidence and H1–H4 boundary |
| --- | --- | --- |
| Discovery hierarchy and progressive disclosure | `KEEP`, `SHORTEN` | Targeted reads and no recursive dumps are valuable universal routing/safety rules. |
| Task selection matrix | `SHORTEN` | Keep a few domain triggers; task-to-skill path mapping belongs in harness context/impact configuration. |
| Creative skill exclusion list | `SHORTEN` | One sentence suffices; repeated names add context cost. |
| Antigravity `run_command`, `WaitMsBeforeAsync`, `manage_task`, `TaskId`, `MESSAGE_PRIORITY_HIGH` | `MOVE_TO_HARNESS`, `REMOVE` runtime-specific tokens | The current execution environment exposes `exec_command`, not those APIs. Preserve the portable rule: allow short commands to finish, do not poll or sleep to wait. |
| Skill status taxonomy | `MOVE_TO_HARNESS` | Evidence reporting is verification policy, not always-loaded product instruction. |
| Mandatory compliance table in every summary | `SHORTEN`, `MOVE_TO_HARNESS` | 9C has a separate 1.9 KB report repeating mostly non-applicable skills; require concise evidence only when skills shape the change. |
| Repository path/header | `SHORTEN` | Absolute machine path and broad product description are redundant in a portable agent entry point. |

Target `AGENTS.md`: routing, universal safety, and portable execution invariants. It should not hold command inventories, skill implementation detail, or document templates.

## 5. `saigon-port-ui` content audit

The tracked skill is 360 lines. Its authority list puts the UI skill above `DESIGN_DNA`, although `DESIGN_DNA` claims to be the official token source. The skill also repeats Home Hub details and an acceptance checklist from `DESIGN_DNA`.

| Content group | Decision | Reason |
| --- | --- | --- |
| Shared identity, restrained maritime visual language, concise Vietnamese copy | `KEEP_IN_CORE_UI_SKILL` | Applies to both product surfaces. |
| User Portal outdoor readability and large targets | `KEEP_IN_CORE_UI_SKILL` | Main field ergonomics; concise profile sufficient. |
| Operations/Admin density, tables, filters, keyboard use | `KEEP_IN_CORE_UI_SKILL` | Shared scope summary; detailed responsive constraints go to Admin skill. |
| Admin viewport-height/modal/table behavior | `MOVE_TO_ADMIN_RESPONSIVE_SKILL` | Absent from current skill and needed as a task-specific rule set. |
| Map Technical Light/Neon modes and utility hierarchy | `MOVE_TO_MAP_V2_SKILL` | GIS-only semantics, unrelated to normal UI tasks. |
| Frozen B2 geometry and simulation disclosure | `MOVE_TO_DOMAIN_CONTRACT` | Product invariants need Map contract ownership; Map skill can refer to it. |
| OCR capture/preview/review flow and no fake progress | `KEEP_IN_CORE_UI_SKILL` | Field interaction behavior; detailed persisted truth belongs in domain contract/code. |
| Brand HEX palette and derived tokens | `MOVE_TO_DESIGN_DNA` | Palette is already duplicated in `DESIGN_DNA` §4. |
| Typography, spacing, radii, motion timings | `MOVE_TO_DESIGN_DNA` | Measurable values are design data, currently repeated. |
| Component sizes and contrast pair rules | `MOVE_TO_DESIGN_DNA` | Keep behavioral summaries in skill; precise numbers and color pairing in DNA. |
| Accessibility, focus, color-independent status | `KEEP_IN_CORE_UI_SKILL` | Retain universal behavior; cite DNA/WCAG for measurements. |
| Implementation steps and review checklist | `REMOVE_DUPLICATION` | Move verification triggers to harness gates; keep only scope-specific review cues. |
| Global Home Hub progress semantics | `MOVE_TO_DOMAIN_CONTRACT` | 9C added personal assigned-task progress without changing global round denominator. |

## 6. `DESIGN_DNA` authority boundary

`DESIGN_DNA` (314 lines) should own approved source colors, derived/semantic tokens, contrast pairs, typography, spacing/radii, component dimensions, and measurable motion. The core skill should own purpose, scope routing, visual judgment, workflow behavior, and anti-style guidance. `DESIGN_DNA` currently also repeats product architecture, Home Hub spec, OCR screens, and an acceptance checklist from the skill (§§6–11). Extract domain truth to contracts, retain one concise visual spec, and link across sources rather than copying token tables.

Exact overlaps include source HEX values (skill palette vs DNA §4.1), text/background contrast and yellow/orange prohibition (skill color rules vs DNA §5), `Be Vietnam Pro` and 44–56 px meter number (skill typography vs DNA §9), 4 px spacing rhythm/component radii (skill vs DNA component specs), Home Hub radial nav/ring/feed (skill vs DNA §7), OCR screens (skill vs DNA §8), and final test/build checklist (skill vs DNA §11). The skill's `font-family` fallback list differs from DNA's; neither should redefine the canonical stack twice.

## 7. Admin responsiveness gap

Classification refers to **skill guidance**, not whether some current CSS happens to handle a case.

| Requirement | Status | Current evidence |
| --- | --- | --- |
| Viewport width | `PARTIAL` | Operations profile says 1280–1920 px; no width behavior below/within that range. |
| Viewport height | `ABSENT` | No height rules. |
| Tablet | `PARTIAL` | Generic “tablet/desktop responsiveness” implementation step, no Admin layout criteria. |
| 1366×768 laptop | `ABSENT` | No exact viewport acceptance. |
| 1536×864 laptop | `ABSENT` | No exact viewport acceptance. |
| Wide but short window | `ABSENT` | No height-constrained case. |
| External monitors | `PARTIAL` | 1280–1920 desktop range, no windowed-height behavior. |
| Browser zoom | `ABSENT` | No reflow/zoom acceptance. |
| Modal max-height | `ABSENT` | Not specified by skill. |
| Scrollable modal body | `ABSENT` | Not specified by skill. |
| Persistent dialog footer | `ABSENT` | Not specified by skill. |
| Table progressive disclosure | `ABSENT` | “Clear data tables” only. |
| Container queries | `ABSENT` | No component-sized layout criteria. |
| Page horizontal overflow | `ABSENT` | No overflow acceptance. |

Observed implementation evidence: [index.css](../../../frontend/src/index.css) has `.admin-modal-overlay` centered with 20 px padding (around line 8180), `.admin-modal-body` with `overflow-y:auto` (8223), and `.admin-modal-box` width cap 480/680 px but no height cap (8558). The body cannot reliably scroll within viewport height unless its parent has a constrained height/flex layout. A schedule form can grow the centered box beyond 768 px height while still satisfying the existing “desktop-first” width guidance. H2 should add an Admin responsive skill with viewport-height, zoom, modal/footer, table and overflow acceptance; H0 makes no CSS change.

## 8. Map skill separation and User skill decision

Map-only material in the core skill includes Technical Light default, approved restrained Neon mode, `stdDeviation="2.2"` glow, B2 frozen busbar/feeder geometry, electricity/water colors, 22 kV hierarchy, simulated-topology disclosure, and no ornamental animation (skill lines 59–71 and visual exception near line 111). [9C protected-boundary evidence](../../implementation/user-task-projection-phase-9c/13_MAP_V2_AND_REPORTING_NON_GOALS.md) identifies the B2 hash script and frozen Map path. H2 should put Map interaction/visual rules in `.agent/skills/saigon-port-map-v2/SKILL.md`, with geometry and provenance invariants in `docs/contracts/map-v2.md`.

A separate `saigon-port-user-mobile` skill is **not justified** now: the current core skill can carry a short User profile, and the main missing specialization is Admin height responsiveness. Target core set: `saigon-port-ui`, `saigon-port-admin-responsive`, `saigon-port-map-v2`. Add a User skill only after independent, recurring field-specific rules exceed a compact core profile.

## 9. Implicit harness inventory

| Category | Current truth location | Problem |
| --- | --- | --- |
| `POLICY` | `AGENTS.md`, task prompts, UI skill | Runtime-specific instructions and recurring prompt text. |
| `COMMAND` | `frontend/package.json`, `tests/`, `scripts/`, handoff examples | No single machine-readable command catalog. |
| `GATE` | Task prompts, dossier test matrices, skill checklist | Release checks repeated per task. |
| `CONTEXT` | 9A/9B/9C handoffs, README, UI skill, DNA | Domain truth reloaded through long histories. |
| `BASELINE` | 9A attribution record, 9B result, 9C report | Exact ten failures are prose, with inconsistent aggregate counts. |
| `SKILL ROUTING` | `AGENTS.md` and skill frontmatter | One UI skill spans three different workspaces. |
| `EVIDENCE` | 21 9C Markdown files and 11 screenshots | Duplication and repeated compliance reporting. |
| `GIT SAFETY` | Task prompts and handoffs | Clean/branch/SHA checks are manual conventions. |

## 10. Canonical command inventory for H1

Commands below are **recorded**, not run. Backend commands are repository-root commands; `npm --prefix frontend` avoids ambiguous cwd. The future runner should set cwd to `frontend` for standalone `npx` commands. The frontend package scripts remain the canonical source for its suites/builds.

| Gate | Current command | Current source | Subsystem |
| --- | --- | --- | --- |
| Backend focused | `python -m pytest -q tests/<affected_test>.py` | 9A–9C test matrices, `tests/` | Changed backend domain |
| Backend full | `python -m pytest -q` | 9A/9B regression records | Backend integration/release |
| 9A | `python -m pytest -q tests/test_reading_round_scope_9a.py` | 9C test matrix | Reading schedule |
| 9B | `python -m pytest -q tests/test_operational_assignments_9b.py` | 9C test matrix | Assignment |
| 9C | `python -m pytest -q tests/test_user_task_projection_9c.py` | 9C test matrix | Task projection |
| Meter logbook | `python -m pytest -q tests/test_meter_logbook.py` | 9C test matrix | Logbook |
| User frontend | `npm --prefix frontend run test:user` | `frontend/package.json` | User UI |
| Operations frontend | `npm --prefix frontend run test:operations` | `frontend/package.json` | Operations UI/Map |
| User build | `npm --prefix frontend run build:user` | `frontend/package.json` | User bundle + `tsc` |
| Operations build | `npm --prefix frontend run build:operations` | `frontend/package.json` | Operations bundle + `tsc` |
| Combined build | `npm --prefix frontend run build` | `frontend/package.json` | Both bundles |
| TypeScript only | `npx tsc --noEmit` (cwd `frontend`) | 9B regression record; package `build:*` also runs `tsc` | Shared frontend |
| B2 freeze hash | `node scripts/verify_b2_freeze_hash.mjs` | Script + 9C protected-boundary note | Map B2 |
| Bundle isolation | `node scripts/verify_bundle_separation.mjs` **after both builds** | Script + 9C note | Build boundary |
| Spatial audit/seed | `python -m pytest -q tests/test_meter_spatial_audit_and_seed.py` | 9C test matrix | Spatial |
| Spatial CRUD/authority | `python -m pytest -q tests/test_v16_spatial_crud.py tests/test_v16a_spatial_authority.py` | Existing test filenames; proposed selection, not a documented historic gate | Spatial |
| Unified simulation | `npx tsx --test tests/mapV2UnifiedSimulationInfrastructure.test.ts` (cwd `frontend`) | 9B regression record and existing test file | Map simulation |

The B2 script prints a hash but does **not** compare it to the expected hash or exit nonzero on mismatch. H1 must compare stdout with the frozen value. The bundle script reads `frontend/dist/{user,operations}`; running it before builds risks stale or missing artifact conclusions. The `test:operations` glob includes Map tests but does not replace the isolated unified simulation command.

## 11. Verification overhead: 9C case study

| Check | Classification | Daily/release rule |
| --- | --- | --- |
| 9C focused tests | `FOCUSED_GATE` | Daily for projection changes. |
| 9A regression | `AFFECTED_SUBSYSTEM_GATE` | When schedule scope or shared backend semantics change; otherwise historical. |
| 9B regression | `AFFECTED_SUBSYSTEM_GATE` | When assignment/shift logic or shared backend semantics change. |
| Meter logbook | `AFFECTED_SUBSYSTEM_GATE` | When mutations, authorization, or reading projection change. |
| User suite | `AFFECTED_SUBSYSTEM_GATE` | User UI or shared frontend API/types changes. |
| Operations suite | `AFFECTED_SUBSYSTEM_GATE` | Operations/Map UI or shared frontend changes. |
| B2 freeze hash | `AFFECTED_SUBSYSTEM_GATE` | Map geometry/shared layout changes; also release checkpoint. |
| Bundle separation | `RELEASE_GATE` | After both production builds, or build-entry changes. |
| Visual screenshots | `AFFECTED_SUBSYSTEM_GATE` | Changed UI at representative viewports; historic 9C captures are `HISTORICAL_EVIDENCE_ONLY`. |
| Full build | `RELEASE_GATE` | Integration/release; affected single build earlier if UI changed. |
| Skill compliance report | `HISTORICAL_EVIDENCE_ONLY` | Replace standalone report with brief evidence in task handoff when relevant. |

For a documentation-only H0, no product gates run. “Full regression pass” in the 9C handoff means no **new** regression in its scope; the 9C matrix itself reports `294 passed, 7 failed` for full backend, while 9B recorded ten known failures. Do not convert either aggregate into a clean full-suite claim. Preserve node-level attribution until a same-environment rerun can reconcile the aggregate difference.

## 12. Documentation overhead

9C contains 17 numbered documents plus ADR, implementation report, skill report, and handoff: **21 Markdown files, 36,901 bytes**, with 11 screenshots. Selected evidence shows repetition: 9C handoff and implementation report both state the domain chain and test results; `14_TEST_MATRIX_AND_REGRESSION_EVIDENCE.md` repeats counts; skill report repeats test and protected-boundary evidence. The ADR can remain historical; the 9C domain invariants are unique and belong in compact contracts. [9C dossier index](../../implementation/user-task-projection-phase-9c/THREAD_HANDOFF.md).

Keep historical documents and screenshots untouched. Future small task: `HANDOFF.md` only. Standard task: `IMPLEMENTATION.md`, `TEST_REPORT.md`, `HANDOFF.md`, with links to generated evidence. ADR only when there is a genuine architectural fork such as 9B's decision to introduce `OperationalAssignment` instead of changing legacy `ZoneAssignment`. The handoff should record changed files, decisions, gate outcomes, known failure delta, and remaining limits once.

## 13. Context reload overhead

| Repeated fact | Proposed destination | Smallest reload |
| --- | --- | --- |
| 9A snapshot vs `LEGACY_DYNAMIC` and frozen denominator | `docs/contracts/reading-schedule.md` | Contract, not entire 9A dossier |
| 9B shift/date assignment and legacy `ZoneAssignment` distinction | `docs/contracts/operational-assignment.md` | Contract |
| 9C intersection, personal/global progress, executor truth | `docs/contracts/user-task-projection.md` | Contract |
| B2 geometry, simulation provenance, Map modes | `docs/contracts/map-v2.md` plus Map skill | Contract + skill only for Map work |
| Palette and component numbers | `frontend/DESIGN_DNA.md` | Relevant section only |
| Ten known backend failures | `harness/known-failures.json` | Node-level lookup |
| Which sources to load for changed files | `harness/context-index.yml` | Selected path mapping |

## 14. Known-failure strategy

The authoritative attribution checkpoint is baseline SHA `57db422b668bb77dfce8cb1a3fea64b29fe60178`, tested in a detached worktree on **2026-09-23** with the same environment as 9A, in [9A test results](../../implementation/reading-schedule-round-scope-phase-9a/16_TEST_AND_REGRESSION_RESULTS.md). It recorded **218 passed, 10 failed**; 9A same-environment comparison had **232 passed, 10 failed**. [9B test results](../../implementation/operational-shift-zone-assignment-phase-9b/18_TEST_AND_REGRESSION_RESULTS.md) says the same ten nodes and reasons persisted at 248 passed/10 failed. No historical rerun is needed for H0.

Proposed JSON shape: `{ "schema_version": 1, "baseline_sha": "57db...", "first_verified_checkpoint": "2026-09-23 / 9A baseline attribution", "failures": [{ "test_node_id": "tests/...::test_...", "classification": "PRE_EXISTING_DATE_DRIFT", "material_reason": "fixed date expected DUE", "first_verified_checkpoint": "2026-09-23 / 9A baseline attribution" }] }`. Use exact full SHA in H1; all ten entries need exact IDs. Compare sets of node IDs, flag any new failures, and never silently bless a known failure that changes assertion reason. A passing former failure is a baseline improvement to review/remove, not a regression.

| Exact node ID (`tests/` prefix implicit) | Classification / material reason |
| --- | --- |
| `test_v16c_asset_foundation.py::test_asset_create_read_update_and_audit` | `PRE_EXISTING_FIXTURE_EXPECTATION`; create followed by list returned 0. |
| `test_v16d_asset_verification.py::test_meter_review_matrix_and_summary_v16d` | Same; spatial review list 0 vs 5. |
| `test_v16e_asset_network.py::test_asset_network_endpoint_verified_only_default` | Same; verified asset absent from empty nodes. |
| `test_v16e_asset_network.py::test_asset_network_utility_filter_and_focus` | Same; verified connection absent from empty edges. |
| `test_v16e_s1_simulation.py::test_scenario_isolation_in_apis` | Same; legacy asset list 0 vs 364. |
| `test_v16e_s1_simulation.py::test_fresh_seed_current_round_zero_of_twelve` | `PRE_EXISTING_DATE_DRIFT`; fixed 2026-09-16 round due count 0 vs 12. |
| `test_v16e_s1_simulation.py::test_one_meter_completion_real_workflow` | Same; due count 0 vs 11. |
| `test_meter_logbook.py::test_reading_round_creation_and_current_selection` | `PRE_EXISTING_DATE_DRIFT`; current-round assertion depends on runtime date. |
| `test_meter_logbook.py::test_today_meter_operations_active_meters_and_current_status` | Same; current-status assertion depends on runtime date. |
| `test_reporting.py::test_report_overview_metrics_hourly_and_locations` | Same; report/current-round assertion depends on runtime date. |

## 15. Minimum contract extraction plan

Each future contract should target 1–2 pages, link source code/tests and the frozen handoff, and avoid UI token/command duplication.

| Contract / owner | Entities and frozen invariants | Legacy caveat / forbidden reinterpretation | Source |
| --- | --- | --- | --- |
| `reading-schedule.md` / schedule domain | `ReadingRound`, `ReadingRoundMeter`; published snapshot scope, zone snapshot, stable denominator, cancellation history | `LEGACY_DYNAMIC` stays explicitly dynamic; never backfill as exact or add employee to scope | 9A handoff, `tests/test_reading_round_scope_9a.py` |
| `operational-assignment.md` / workforce domain | `OperationalAssignment`, `WorkSchedule`; explicit shift, work date, PRIMARY uniqueness, SUPPORT, CA3 overnight, cancellation history | Legacy `ZoneAssignment` remains Map/default owner; no fabricated history or automatic substitution | 9B handoff, `tests/test_operational_assignments_9b.py` |
| `user-task-projection.md` / task projection domain | Intersection through `zone_id_snapshot`, half-open shift, role precedence, personal/global denominators, executor identity and 403 gate | No persisted task table, no current `Meter.zone_id` join, no replacement of `MeterReading.user_id` | 9C handoff, `tests/test_user_task_projection_9c.py` |
| `map-v2.md` / Map domain | B2 geometry/hash, utility hierarchy, simulation disclosure/provenance, Technical Light/Neon permissions | Do not treat simulated topology or legacy default assignment as live 9B staffing | Map skill section, B2 script, Map handoff |

No reporting contract before 9D unless an existing authoritative reporting contract is identified; H0 found only legacy README/implementation references, not a frozen reporting contract.

## 16. Proposed H1 declarative harness structure

| Candidate | Decision | Minimum purpose |
| --- | --- | --- |
| `harness/README.md` | `NEEDED` | How to read config and run `plan`/`verify`; short. |
| `harness/config.yml` | `MERGE_WITH_OTHER_FILE` | Put small defaults in `gates.yml`; no extra indirection. |
| `harness/modes.yml` | `MERGE_WITH_OTHER_FILE` | Put three mode definitions in `gates.yml`. |
| `harness/commands.yml` | `NEEDED` | Stable command IDs, cwd, dependencies, expected outputs. |
| `harness/impact-map.yml` | `NEEDED` | Paths, shared-file escalation, skill/context routing hints. |
| `harness/gates.yml` | `NEEDED` | Modes, impact-to-gate rules, escalation, B2 expected hash. |
| `harness/known-failures.json` | `NEEDED` | Ten exact baseline nodes and reasons. |
| `harness/context-index.yml` | `NEEDED` | Minimal authoritative docs by impact domain. |

Thus H1 needs six files: README, commands, impact map, gates, known failures, context index. Avoid a framework or duplicated policy layers. H1 is declarative skeleton only; runner belongs later.

## 17. Mode model

Three modes suffice: `FAST` for isolated UI/CSS/small bug (focused test or targeted visual check), `STANDARD` for feature/API/domain changes (focused plus affected subsystem tests/build), `RELEASE` for integration/merge/release (full backend with known-failure comparison, both frontend suites/builds, bundle separation, relevant Map/spatial/simulation gates). A user may request a stricter mode; otherwise derive the minimum mode from changed paths and semantic impact. Automatically escalate FAST to STANDARD for shared files, migrations, auth/permission, cross-domain behavior, or uncertain reach; escalate to RELEASE for integration/release or changed bundle entry/boundary and cross-surface changes. The H0 docs-only case resolves to no product gates plus `git diff --check` and path/source verification.

## 18. Impact model

| Domain | Illustrative paths/trigger | Default affected gate |
| --- | --- | --- |
| `backend-core` | `backend/app/main.py`, `models.py`, `db.py`, shared schemas | Backend focused plus affected domain suites; semantic review |
| `reading-schedule` | schedule/round code and 9A tests | 9A, logbook as needed |
| `operational-assignment` | assignment/work schedule code and 9B tests | 9B, 9C when eligibility changes |
| `user-task-projection` | `backend/app/user_tasks.py`, 9C tests | 9C, User when API shape changes |
| `user-ui` | User components/styles/tests | User suite, User build when bundling changes |
| `operations-ui` | Admin components/styles/tests | Operations suite, Operations build |
| `admin-responsive` | Admin layout CSS/modal/table | Targeted viewport visual acceptance, Operations focused tests |
| `map-v2` | `frontend/src/components/map-v2/`, map tests | Map tests, B2 hash, Operations build |
| `spatial` | spatial models/endpoints/scripts | Spatial tests and Map integration as affected |
| `simulation` | Map simulation data/logic | Unified simulation tests, provenance check |
| `deployment` | build entries, scripts, future CI | Both builds, bundle isolation, release review |

Path mapping is only a first pass. `frontend/src/types.ts` and `frontend/src/services/api.ts` can change both portals; `backend/app/models.py` and `backend/app/main.py` can affect every API/domain. A semantic escalation rule or explicit impact declaration is required for these files, plus imports/dependency review for shared CSS. Unknown paths should require a conservative STANDARD plan, not an empty gate list.

## 19. Future thin runner scope

`python tools/harness.py plan` and `python tools/harness.py verify` are enough. `plan` reports changed files, derived and declared impacts, loaded skills/context links, commands, mode, and gates in a concise reviewable plan. `verify` executes selected gates once, captures exit status and command output, compares exact known-failure nodes/reasons for full backend, and emits a short report. It should support an explicit base SHA/mode override and dry plan, with no daemon, server, database, dashboard, queue, or plugin framework. Do not implement it in H0 or H1 skeleton.

## 20. Token/time hotspots, ranked

| Rank | Source | Context | Tools | Runtime | Documentation | Highest-return change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Repeated 9A/9B/9C dossier loading | HIGH | MEDIUM | LOW | HIGH | Four compact frozen contracts + context index. |
| 2 | Broad historical verification matrix per task | LOW | HIGH | HIGH | MEDIUM | Impact gates and FAST/STANDARD/RELEASE modes. |
| 3 | 21-file 9C dossier and repeated results | HIGH | MEDIUM | LOW | HIGH | Three-file standard task template; ADR only for fork. |
| 4 | 360-line UI skill plus 314-line DNA overlap | HIGH | MEDIUM | LOW | MEDIUM | Core skill split, single token source. |
| 5 | Repeated screenshots and skill audit tables | MEDIUM | HIGH | MEDIUM | MEDIUM | Changed-UI visual scope and inline evidence. |

These are qualitative estimates; no token/runtime measurement was collected in H0.

## 21. Stale or conflicting sources

| Source A | Source B | Conflict / risk | Recommended authority |
| --- | --- | --- | --- |
| `AGENTS.md` Antigravity API names | Current `exec_command` tool | `WaitMsBeforeAsync`, `manage_task`, and guaranteed runtime wake-up are not portable | Portable harness execution policy + current runtime API |
| UI skill authority list | DNA official design-system status | Skill outranks DNA yet duplicates official tokens | DNA for values, skill for behavior |
| UI skill/DNA global ring text | 9C personal progress | Could be read as all progress being global | 9C projection contract for personal/global meanings; DNA for rendering |
| 9A/9B pre-9C User notes | 9C handoff | Older handoff says User queue still global/no projection | 9C contract and current source/tests |
| README old logbook hierarchy | 9A–9C contracts | README lacks immutable scope and assignment intersection | Contracts for new domain behavior |
| Generic UI skill Map mode | Map-specific frozen evidence | Map rules load during ordinary UI work | Map skill + Map contract |
| 9C test matrix `294/7` | 9B same-environment `248/10` and 9A baseline | Aggregate failure count differs; environments/date may differ | Exact node-level baseline; rerun only at affected/release checkpoint |
| Skill/DNA completion checklists | Lean impact gates | “All frontend tests/build/screenshots” per small task is costly | Harness gate policy |

No named AGENTS skill was unresolved in this local environment. External installations remain optional and should not be assumed available elsewhere.

## 22. Target authority and recommended H1–H4 decisions

Separate authority by concern rather than forcing one mixed priority list:

| Concern | Authority order |
| --- | --- |
| Product truth | Current source behavior and tests, then frozen domain contract, then handoff history; a discrepancy triggers investigation rather than silent override. |
| Design truth | `DESIGN_DNA` for tokens/measurements; task-specific UI skill for Map/Admin interactions; core UI skill for shared visual behavior; generic external skills last. |
| Execution policy | User task instruction and portable `AGENTS.md` safety, then harness mode/command configuration, then runtime-specific tool rules. Skills do not override execution safety. |
| Verification policy | User-required gates, harness impact/mode gates and exact known-failure baseline, then task-local evidence. Historic green counts are evidence, not current passes. |

H1: create the six declarative files above, with explicit command cwd/dependencies, three modes, shared-file escalation, exact B2 hash comparison, and ten node-level known failures. H2: shorten `AGENTS.md` and core UI skill; add Admin responsive and Map V2 skills; make DNA sole numeric design source. H3: extract the four compact frozen contracts and route them through context index. H4: add the thin `plan`/`verify` runner and use it on a documentation-only and an affected-subsystem scenario before considering CI. No CI/CD or GitLab change follows from H0.

## 23. Explicit non-goals and H0 evidence

H0 changes only this report. It does not change backend/frontend behavior, fix the Admin modal, alter Map V2/Reporting, create skill or contract files, add harness YAML/runner, delete history, merge branches, or begin 9D/CI. Validation is limited to `git diff --check`, Markdown/path/command source review, and a changed-file check. No product tests, builds, B2 hash run, screenshots, or full historical verification matrix are required for this documentation-only audit.

| Skill | Status | Evidence |
| --- | --- | --- |
| `saigon-port-ui` | `READ` / `APPLIED` | Its 360-line entry point was audited for scope, authority, duplication, and Admin/Map gaps; this report is the application. No product verification claim. |
| `ui-ux-pro-max` | `DISCOVERED` / `NOT_READ` | Local top-level entry point exists; its content/data were outside this infrastructure audit. |
| `banner-design`, `brand`, `design`, `slides` | `NOT_APPLICABLE` / `NOT_READ` | Local external marketing/presentation skills; no engineering application. |
