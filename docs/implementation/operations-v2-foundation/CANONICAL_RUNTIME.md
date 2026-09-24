# Operations V2 Foundation: Canonical Development Runtime

**Date:** 2026-09-24  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Document:** `docs/implementation/operations-v2-foundation/CANONICAL_RUNTIME.md`

---

## 1. Problem Statement & Motivation

During earlier multi-branch and worktree development, SQLite connections defaulted to relative paths (`sqlite:///./data/app.db`). This caused each Git worktree to instantiate independent databases with conflicting schemas, unsynchronized simulation states, and divergent test artifacts.

The **Canonical Development Runtime** establishes a single project runtime ecosystem positioned **outside** Git worktrees.

---

## 2. Directory Layout

The canonical runtime resides at `D:\Projects\production-meter-reading\.runtime/`:

```
D:\Projects\production-meter-reading\.runtime/
├── data/
│   └── app.db               # Canonical development SQLite database
├── evidence/                # Official meter reading photo evidence
├── attendance/              # Employee attendance verification selfies
├── training/                # OCR hard samples / training dataset
├── logs/                    # Centralized daemon & server logs
├── state/
│   └── dev-pids.json        # Process ID registry for owned dev processes
└── backups/
    ├── <timestamp>/         # Timestamped historical backups
    │   ├── manifest.json    # SHA256 integrity manifest
    │   └── *.db             # Preserved SQLite database snapshots
```

---

## 3. Environment Configuration & Resolution

The runtime path is controlled via the environment variable `PMR_RUNTIME_ROOT`:

```powershell
$env:PMR_RUNTIME_ROOT = 'D:\Projects\production-meter-reading\.runtime'
```

### Backend Resolution (`backend/app/config.py`)
When `PMR_RUNTIME_ROOT` is set, Pydantic's `Settings` dynamically resolves:
- `database_url`: `sqlite:///{PMR_RUNTIME_ROOT}/data/app.db`
- `meter_reading_evidence_dir`: `{PMR_RUNTIME_ROOT}/evidence`
- `attendance_photo_dir`: `{PMR_RUNTIME_ROOT}/attendance`
- `meter_training_dir`: `{PMR_RUNTIME_ROOT}/training`

### Backward Compatibility Invariant
If `PMR_RUNTIME_ROOT` is unset, `config.py` defaults to `sqlite:///./data/app.db` and relative paths. Historical workflows (e.g. `demo-iphone.ps1`) remain functional.

---

## 4. Port Safety & Ownership Tracking

Development environments are managed via `scripts/dev.ps1` and `scripts/stop-dev.ps1`:
- **Backend Port:** 8000
- **User Portal Port:** 5173
- **Operations Portal Port:** 5174
- **Ownership Check:** Before binding to port 8000, `dev.ps1` verifies if the listening process is owned via `.runtime/state/dev-pids.json`. If an unknown process is detected, it fails with a clear diagnostic message rather than silently conflicting or killing unknown system tasks.
- **Controlled Termination:** `stop-dev.ps1` terminates **only** the processes registered in `dev-pids.json` without blanket system kills (`taskkill /IM node.exe`).
