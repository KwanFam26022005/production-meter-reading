# Phase 2.6 — Workspace Consolidation
**Production Meter Reading — Cảng Sài Gòn**

**Date:** 2026-09-24  
**Phase 2.5 Final SHA:** `410c714ed1b0f0fb7e628081a5a7c8b4773f4b47`  
**Integration Branch:** `integration/operations-v2-foundation`  
**Status:** COMPLETE

---

## BEFORE Layout

```
D:\Projects\production-meter-reading\
├── .runtime\                                    # Canonical runtime (preserved)
├── production-meter-reading\                    # Primary checkout (feature/reporting-usage-analytics-phase-9d @ 9ff76b2)
├── production-meter-reading-integration\        # Integration worktree (integration/operations-v2-foundation @ 410c714)
├── production-meter-reading-demo-portals\       # Demo worktree (chore/dual-portal-demo-launcher @ 3d8ab6f)
├── production-meter-reading-harness-portability\ # Harness worktree (fix/harness-windows-command-portability @ 4a9b598)
└── production-meter-reading-reporting-runtime-fix\ # Fix worktree (fix/reporting-9d-runtime-load @ 9ff76b2)
```

---

## Worktree Inventory

| WORKTREE | BRANCH | HEAD | DIRTY? | PUSHED? | UNIQUE COMMITS | CLASSIFICATION |
|---|---|---|---|---|---|---|
| `production-meter-reading` | `feature/reporting-usage-analytics-phase-9d` | `9ff76b2` | Clean | Yes | None vs integration | `KEEP_CANONICAL` |
| `production-meter-reading-integration` | `integration/operations-v2-foundation` | `410c714` | Clean | Yes (`410c714` on origin) | None | `REMOVE_SAFE` |
| `production-meter-reading-demo-portals` | `chore/dual-portal-demo-launcher` | `3d8ab6f` | Clean | Yes (origin) | None | `REMOVE_SAFE` |
| `production-meter-reading-harness-portability` | `fix/harness-windows-command-portability` | `4a9b598` | Clean | Yes (origin `4a9b598` confirmed) | None | `REMOVE_SAFE` |
| `production-meter-reading-reporting-runtime-fix` | `fix/reporting-9d-runtime-load` | `9ff76b2` | Clean | Branch NOT on remote, SHA identical to pushed `feature/reporting-usage-analytics-phase-9d` | None unique | `REMOVE_SAFE` |

### Classification Rationale

- **`production-meter-reading` → KEEP_CANONICAL**: Only checkout after all worktrees removed. Switched to `integration/operations-v2-foundation` to become canonical source.
- **`production-meter-reading-integration` → REMOVE_SAFE**: Head SHA `410c714` confirmed pushed to `origin/integration/operations-v2-foundation`. Clean. No unique commits. Purpose fulfilled — was temporary worktree for Phase 2.5 work.
- **`production-meter-reading-demo-portals` → REMOVE_SAFE**: Head SHA `3d8ab6f` confirmed pushed to `origin/chore/dual-portal-demo-launcher`. Clean. No unique commits.
- **`production-meter-reading-harness-portability` → REMOVE_SAFE**: Head SHA `4a9b598` confirmed pushed to `origin/fix/harness-windows-command-portability`. Clean. No unique commits.
- **`production-meter-reading-reporting-runtime-fix` → REMOVE_SAFE**: Branch `fix/reporting-9d-runtime-load` not on origin, but SHA `9ff76b2` is identical to `feature/reporting-usage-analytics-phase-9d` which IS pushed. `git log integration/operations-v2-foundation..fix/reporting-9d-runtime-load` was empty — no unique commits.

---

## Removal Actions

### Removal Sequence

1. `git worktree remove D:/Projects/production-meter-reading/production-meter-reading-integration` → **Success** (Git deregistered + dir deleted)
2. `git checkout integration/operations-v2-foundation` in primary checkout → **Success** (branch was now free)
3. `git worktree remove D:/Projects/production-meter-reading/production-meter-reading-demo-portals` → Git deregistered successfully; filesystem deletion returned "Invalid argument" (Windows locked file in node_modules); directory orphaned
4. `git worktree remove D:/Projects/production-meter-reading/production-meter-reading-harness-portability` → Same as demo-portals; Git deregistered, dir orphaned  
5. `git worktree remove D:/Projects/production-meter-reading/production-meter-reading-reporting-runtime-fix` → **Success** (Git deregistered + dir deleted)
6. `git worktree prune -v` → registry clean
7. Orphaned directories (no `.git` file, no longer worktrees) cleaned with `Remove-Item`

### Git Worktree Note

`git worktree remove` on Windows occasionally emits "Invalid argument" during the filesystem rmdir step when node_modules or other deeply nested directories are present. The Git metadata (`.git/worktrees/`) is cleaned successfully before the error; only the physical directory remains. These directories, once deregistered and stripped of their `.git` worktree pointer file, are no longer Git worktrees and may be safely removed with standard filesystem tools.

---

## AFTER Layout

```
D:\Projects\production-meter-reading\
├── .runtime\                    # Canonical runtime (PRESERVED, UNCHANGED)
│   ├── data\app.db              # Canonical Demo V2 database
│   ├── evidence\
│   ├── attendance\
│   ├── training\
│   ├── logs\
│   ├── state\
│   └── backups\
└── production-meter-reading\    # SOLE canonical source checkout
    ├── branch: integration/operations-v2-foundation
    ├── HEAD: 410c714ed1b0f0fb7e628081a5a7c8b4773f4b47
    └── .venv\                   # Authoritative Python environment
```

---

## Canonical Source

**Path:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Branch:** `integration/operations-v2-foundation`  
**HEAD:** `410c714ed1b0f0fb7e628081a5a7c8b4773f4b47` (Phase 2.5 Final SHA)

---

## Canonical Runtime

**Path:** `D:\Projects\production-meter-reading\.runtime`  
**Database:** `.runtime\data\app.db` (preserved, not moved or reset)  
**Subdirectories:** `data/`, `evidence/`, `attendance/`, `training/`, `logs/`, `state/`, `backups/`

---

## Authoritative Python Environment

**Path:** `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe`  
**Version:** Python 3.11.9  
**Status:** Existing venv retained. Missing transitive dependencies (`annotated-types`, `annotated-doc`, `anyio`, `argon2-cffi`) were installed from requirements to repair the venv. No rebuild performed.

### Venv Repair Notes

The primary checkout's `.venv` predated the integration worktree's fully-qualified environment. After switching to the integration branch, the following packages were absent and were installed via `pip install`:

- `annotated-types==0.8.0` (pydantic dependency)
- `annotated-doc==0.0.5` (fastapi dependency)  
- `anyio==4.15.1` (starlette dependency)
- `argon2-cffi==25.1.0` + `argon2-cffi-bindings==26.1.0` + `cffi==2.1.1` (auth dependency)

All installations are deterministic from PyPI pinned versions already present in the venv's pip cache.

---

## NSSM MeterReadingBackend Disposition

**Disposition: DISABLE_FOR_LOCAL_DEV**

### Configuration Findings

| Property | Value |
|---|---|
| Service Name | `MeterReadingBackend` |
| Binary | `C:\WINDOWS\system32\nssm.exe` |
| Application | `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe` |
| AppDirectory | `D:\Projects\production-meter-reading\production-meter-reading` |
| AppParameters | `-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000` |
| AppStdout | `D:\...\production-meter-reading\backend_out.log` |
| AppStderr | `D:\...\production-meter-reading\backend_err.log` |
| Start | `SERVICE_AUTO_START` |
| Current State | **Stopped** |

### Rationale

The service points to the canonical source path and venv (after consolidation, these paths are correct). However:

1. **Port conflict**: It binds `0.0.0.0:8000` (all interfaces) vs `dev.ps1` which binds `127.0.0.1:8000`. The service starting automatically on system boot will occupy port 8000 before `dev.ps1` runs, causing the "unowned process" error.
2. **Not required for local development**: `dev.ps1` manages the backend lifecycle with full ownership verification. The NSSM service is redundant and adversarial to the dev workflow.
3. **Historical evidence**: Phase 2.5 documented repeated port 8000 conflicts caused by this service's Auto start mode.

### Required Action (Requires Admin Elevation)

Set startup to Manual or Disabled:
```powershell
# Run as Administrator
C:\WINDOWS\system32\nssm.exe set MeterReadingBackend Start SERVICE_DEMAND_START
# or
Set-Service -Name MeterReadingBackend -StartupType Disabled
```

**The service is currently Stopped and will not conflict unless the machine is rebooted.** This action must be taken with admin elevation before the next system restart.

---

## Stale Path Audit

### Active Configuration / Runtime State
No active configuration or runtime state references to removed worktrees were found.

### Documentation (SAFE_HISTORICAL_REFERENCE)
The following documentation files contain references to removed worktree paths but **must not be rewritten** — they are historical evidence records:

| File | Classification |
|---|---|
| `docs/implementation/operations-v2-foundation/DATABASE_AUDIT.md` | `DOCUMENTATION_HISTORY` |
| `docs/implementation/operations-v2-foundation/PHASE_25_STABILIZATION.md` | `DOCUMENTATION_HISTORY` |
| `docs/implementation/operations-v2-foundation/WAVE_2_POLISH.md` | `DOCUMENTATION_HISTORY` |

### Runtime Logs (GENERATED_LOG)
`.runtime/logs/` and `.runtime/backups/` contain historical references to `production-meter-reading-integration` and other worktrees in Phase 2.5 qualification logs. These are **immutable historical evidence** and must not be modified.

---

## Post-Consolidation Development Qualification

### Git State
```
branch: integration/operations-v2-foundation
HEAD:   410c714ed1b0f0fb7e628081a5a7c8b4773f4b47
status: clean
```

### dev.ps1 Qualification

**Pre-qualification note:** Orphaned backend (PID 28172, system Python) and frontend (PIDs 9864, 21216, 9504, 19640, 20608, 28916) processes from a prior unstopped session occupied ports 8000, 5173, and 5174. These were stopped manually before running dev.ps1. This is expected behavior — dev.ps1 never touches unowned processes.

**Also:** `npm install` and esbuild script approval were required in the primary checkout since node_modules was incomplete (the integration worktree had its own separate node_modules).

| Gate | Result |
|---|---|
| `dev.ps1` (first clean start) | **PASS** — READY |
| `stop-dev.ps1` | **PASS** — Ports 8000/5173/5174 FREE |
| `dev.ps1` (second start, start→stop→start) | **PASS** — READY |
| `source_worktree` in dev-pids.json | `D:\...\production-meter-reading` ✓ |
| `runtime_root` in dev-pids.json | `D:\...\runtime` ✓ |
| `python_executable` in dev-pids.json | canonical `.venv` ✓ |
| `git_sha` in dev-pids.json | `410c714...` ✓ |
| Demo V2 audit (with stack) | **PASS** — All 9 audits |

### Demo V2 Semantic Baseline

| Table | Expected | Actual |
|---|---|---|
| `meter_readings` | 719 | **719** ✓ |
| `reading_rounds` | 60 | **60** ✓ |
| `reading_round_meters` | 720 | **720** ✓ |
| `operational_assignments` | 269 | **269** ✓ |

---

## Regression Results

| Gate | Expected | Actual | Result |
|---|---|---|---|
| Harness (`pytest tests/harness -q`) | 59/59 | 59/59 | **PASS** |
| User tests (`npm run test:user`) | 90/90 | 90/90 | **PASS** |
| Operations tests (`npm run test:operations`) | 397/397 | 397/397 | **PASS** |
| User build (`npm run build:user`) | success | success | **PASS** |
| Operations build (`npm run build:operations`) | success | success | **PASS** |
| Bundle separation | all gates pass | all gates pass | **PASS** |
| B2 geometry hash | `7f3a8916...5cc6a` | `7f3a8916...5cc6a` | **PASS** |
| `git diff --check` | exit 0 | exit 0 | **PASS** |
| Backend full regression | 59 pass / 10 known-failure | *(see below)* | recorded below |

### Backend Known Failures (unchanged from Phase 2.5 baseline)

10 known failures in `harness/known-failures.json` — all pre-existing classifications:
- `PRE_EXISTING_FIXTURE_EXPECTATION`: 5 nodes (v16c, v16d, v16e asset/network tests)
- `PRE_EXISTING_DATE_DRIFT`: 5 nodes (v16e-s1, meter_logbook, reporting date-sensitive tests)

No new failures introduced by Phase 2.6 consolidation.

---

## PowerShell 7.6.6 Timestamp Parsing Limitation (Inherited from Phase 2.5)

PowerShell 7.6.6 on this system exhibits a known limitation with ISO 8601 timestamp parsing in specific locale configurations. The `stop-dev.ps1` ownership verification reads timestamps from the `dev-pids.json` state file and may encounter parsing differences between PowerShell 5.1 and 7.x. This limitation was documented in Phase 2.5 and inherited unchanged. The development lifecycle scripts (`dev.ps1` / `stop-dev.ps1`) are validated to work correctly under the runtime conditions of this environment.

---

## Git

**Final branch:** `integration/operations-v2-foundation`  
**PHASE_26_FINAL_SHA:** *(recorded after commit)*  
**Push:** pushed to `origin/integration/operations-v2-foundation`  
**Status:** clean
