# Operations V2 UAT Plan

**Phase:** 2.7 — Product acceptance
**Candidate:** `e6d4b204cb871647b39fb1c5ec5d0f8e98d0fd85`
**Date:** 2026-09-25 (`Asia/Ho_Chi_Minh`)

## Objective and boundaries

Verify that the current Operations V2 implementation supports the administrative and field-reading chain against one canonical database:

`Admin → Phân ca → Lịch ghi → employee tasks → meter reading → Hậu kiểm → Dashboard → Reporting → Audit`.

This is acceptance of the current implementation. It does not authorize the Phase 2.8 Reporting or Map direction, topology work, a User Portal redesign, OCR model changes, or unrelated refactoring. Frozen 9A–9D meanings remain authoritative.

## Environment and data controls

- Source: `D:\Projects\production-meter-reading\production-meter-reading`, branch `integration/operations-v2-foundation`.
- Runtime/database: `D:\Projects\production-meter-reading\.runtime` and `.runtime\data\app.db`.
- Initial database counts: 719 readings, 60 rounds, 720 round-scope rows, 269 assignments. The captured state and checksum are in [initial-state.json](evidence/database/initial-state.json).
- Run the Demo V2 semantic audit before test mutations. Make a verified database backup before any reset. Use only the repository V2 seed/audit tooling with `PMR_RUNTIME_ROOT` set to the canonical runtime.
- Keep Admin and Employee sessions isolated in separate browser profiles. Do not save credentials, cookies, tokens, or private browser state.
- Record every controlled mutation and its entity IDs. Restore the deterministic Demo V2 baseline at the end and run the semantic audit again.

## Scenario checklist

| ID | Acceptance area | Core checks |
| --- | --- | --- |
| UAT-01 | Authentication and authorization | Admin and Employee login/logout; invalid credentials/session; Employee Admin API request returns 403. |
| UAT-02 | Operations Dashboard | Current status, attention records, drilldowns, and CA3 midnight interpretation. |
| UAT-03 | Phân ca | CA1/CA2/CA3/HC, OFF/approved leave, explicit WorkSchedule, PRIMARY uniqueness, SUPPORT, cancellation. |
| UAT-04 | Lịch ghi | Past/current/upcoming rounds, SNAPSHOT counts and persisted RRM identity/zone snapshots, cancellation history. |
| UAT-05 | Meter inventory | Electric, water, and UNKNOWN metadata; zone, unit, register, type, lifecycle, and asset relation disclosure. |
| UAT-06 | Employee projection | RRM snapshot ∩ active OperationalAssignment; no-assignment behavior; PRIMARY/SUPPORT; personal versus global progress; CA3 boundary. |
| UAT-07 | Field reading | MANUAL_ENTRY, deterministic OCR/provenance records, REVIEW, pending work, and limits on real OCR qualification. |
| UAT-08 | Hậu kiểm | Original OCR value/provenance, unit, evidence availability, navigation, and keyboard-focus guard. |
| UAT-09 | Current Reporting | Snapshot/legacy denominators, completion/coverage, responsibility versus executor, separate utility groups, interval rate/readiness, rollover suspicion, and UNKNOWN exclusion. |
| UAT-10 | Audit | Controlled assignment/round actions, actor/time/entity/action, before/after, and raw detail. |
| UAT-11 | Cross-feature E2E | One controlled Admin-to-Employee reading with IDs traced across the canonical database and workspaces. |
| UAT-12 | Responsive review | Operations at 1024×768, 1366×768, 1920×1080; User Portal at 360×800, 390×844, 430×932, 768×1024. |

## Evidence and gate policy

Store screenshots and sanitized API/database evidence under `evidence/`, grouped by workspace. Screenshots are observations, not substitutes for server authorization or data checks. The responsive review is manual; no synthetic automated evidence is accepted.

Use the repository harness in RELEASE mode for the final regression. Run the requested harness, backend, User, Operations, build, bundle separation, B2 checksum, Demo V2 audit, and diff checks once after fixes are complete. Compare backend failures by exact test node and material reason in `harness/known-failures.json`.

## Exit criteria

Acceptance requires the user-provided Phase 2.7 gate: all required workflows pass within genuine environment capability, zero BLOCKERs, zero unwaived HIGH defects, required automated gates pass, Demo V2 final integrity passes, the worktree is clean, and the integration branch is pushed. Record limitations and future UX/IA observations separately; do not begin Phase 2.8.
