# Map V2 Final Architecture Reconciliation — 01. Baseline & Invariants

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Execution Mode:** READ-ONLY Architecture Reconciliation  
**Date:** 2026-09-23  

---

## 1. Git Baseline & Working Tree Status

Prior to performing reconciliation analysis, the repository environment was audited in accordance with Section 1 Safety Invariants:

```bash
git branch --show-current
# Output: feature/v16e-network-map-overlay-r1

git rev-parse HEAD
# Output: 5d370474112fb978105f87e7498cdc9d339471a0

git status --short
# Output: Substantial active working tree containing untracked test fixtures,
# local Map V2 components, user portal assets, and research deliverables.
```

### Safety Policy Enforced
- **Zero source code modification**: No production frontend (`.tsx`, `.ts`, `.css`) or backend (`.py`) files modified.
- **Zero database modification**: SQLite database untouched, no migrations executed, no test seeding run.
- **Zero geometry alteration**: Canonical B2 busbar/feeder coordinates and `tan_thuan_1_zones_edited.json` polygons preserved without change.
- **Zero git mutation**: No commits, branches, stashes, resets, or cleans executed.
- **Isolation guarantee**: All deliverables generated strictly inside `docs/research/map-v2-final-architecture-reconciliation/`.

---

## 2. Skill Compliance Evidence Table

In compliance with Saigon Port Agent Engineering Rules (`AGENTS.md` Section 3):

| Skill | Status | File / Section Cited | Concrete Application & Evidence |
| :--- | :---: | :--- | :--- |
| `saigon-port-ui` | `APPLIED` / `VERIFIED` | Scoped Operating Profiles — Operations & Map V2 (`SKILL.md#L50-L70`); Visual Direction (`SKILL.md#L98-L122`); Brand Palette (`SKILL.md#L124-L177`) | Applied three-axis toolbar architecture, information density rules, NO_DATA neutral state design, tabular-nums formatting, maritime porcelain aesthetic. |
| `banner-design` | `NOT_APPLICABLE` | — | Non-engineering marketing skill intentionally skipped. |
| `brand` | `NOT_APPLICABLE` | — | Marketing brand identity skill intentionally skipped. |
| `design` | `NOT_APPLICABLE` | — | Creative agency design skill intentionally skipped. |
| `slides` | `NOT_APPLICABLE` | — | Presentation deck generation skill intentionally skipped. |

---

## 3. Scope of Reconciliation (Thread 6 vs Prior Threads)

| Prior Thread | Focus & Findings | Relationship to Thread 6 |
| :--- | :--- | :--- |
| **Thread 2** (`employee-shift-map-audit`) | Documented disconnection between shifts, attendance, zones, and task pool. Identified standing assignments in SQLite vs mock demo in Map V2. | Baseline for employee role taxonomy (Standing Assignee vs Scheduled vs Checked-in). |
| **Thread 3** (`employee-map-ux-design`) | Produced UX design specifications (Variant B status marker, L1-L3 progressive disclosure, docked inspector). | Source for interaction ergonomics and disclosure constraints. |
| **Thread 4** (`reporting-map-handoff`) | *Not yet created* (explicitly audited as absent in `docs/research/`). | Findings requiring reporting integration are strictly partitioned as `SAFE_NAVIGATION_NOW` vs `REPORTING_CONTRACT_REQUIRED` vs `CONSUMPTION_RULE_REQUIRED`. |
| **Thread 5** (`map-v2-business-information-density-audit`) | Conducted 31-control toolbar inventory, entity contracts, parent-child hierarchy audit. Recommended Option B toolbar and listed 17 business decisions. | **Primary audit artifact under reconciliation**. Corrected where Thread 5 was overly pessimistic about backend capabilities. |
| **Thread 6** (This Document) | Architectural reconciliation across backend FastAPI endpoints, shared frontend context, local Map V2 code, and Port business rules. | **Final implementation-ready specification**. |

---

## 4. Fundamental Discovery Classification

In accordance with Critical Principle 0:

- **A. DATA / API DOES NOT EXIST**:
  - Personal meter reading quotas / individual progress denominators.
  - Authoritative meter measurement units (`measurement_unit`, `unit`, `multiplier`, `scale`).
  - GPS device telematics for field operators.
  - Parent-child operational zone aggregation logic.
  - Period consumption delta computation rules (rollover, meter replacement).

- **B. DATA / API EXISTS BUT MAP V2 DOES NOT CONSUME IT**:
  - `GET /api/v1/map/overview` (returns date, round, kpis, zone progress, meter semantic states).
  - `GET /api/v1/map/zones` (returns active zones with assigned operators).
  - `GET /api/v1/map/meters` (returns active meters with coordinates and semantic states).
  - `GET /api/v1/map/operators` (returns available operators for zone assignment).
  - `POST /api/v1/map/zones/{zone_id}/assign` (reassigns zone operator with audit logging).
  - `GET /api/v1/map-config/active` (returns published map version with presentation zone mappings).

- **C. SHARED FRONTEND INFRASTRUCTURE EXISTS BUT MAP V2 IS NOT CONNECTED**:
  - `OperationalWorkspaceContext.tsx` is mounted at `App.tsx` admin root, but `MapV2Workspace.tsx` does not consume `useOperationalWorkspace()`.
  - Shared state (`selectedDate`, `selectedRoundId`, `utilityFilter`, `focusedEntity`) is ignored by Map V2.
  - Deep-link helpers (`locateOnMap`, `openReadingInspection`, `openMeterDetails`, `openAssetDetails`) are not connected to Map V2.

- **D. BUSINESS RULE IS UNDEFINED**:
  - Progress denominator policy: all active meters in zone vs meters scheduled for specific round.
  - Presentation zone hierarchy: does Bãi tổng hợp (`ZONE_GENERAL`) aggregate Kho 1 & Kho 2, or is it mutually exclusive?
  - Model A (Standing Assignment) vs Model B (Shift Dispatch) vs Hybrid assignment policy.
  - Task ownership: open pool vs assigned operator pool.

- **E. FEATURE IS DEMO-ONLY**:
  - Animated employee movement (`DEMO_MAP_V2_EMPLOYEES` in `useEmployeeAnimation.ts`).
  - Utility network SVG topology (`utilityDemoLayout.ts` with layout keys A, B, B2, C).

- **F. FEATURE IS ALREADY OPERATIONAL**:
  - Admin app tab routing (`App.tsx`, `AdminShell.tsx`).
  - Reading inspection modal (`AdminReadingInspection.tsx`).
  - Reading confirmation & reconciliation pipeline (`reconcileMeterReading`).
  - Active map configuration publication pipeline (`map_config.py`).
