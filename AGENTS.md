# Saigon Port — Agent Engineering Rules & Execution Standards

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Scope:** Universal agent execution guidelines across field mobile reading, desktop operations, and map digital twin tasks.

---

## 1. Skill Loading & Progressive Disclosure Policy

Agents working in this repository must practice **targeted progressive disclosure** rather than blanket recursive reading of customization directories.

### 1.1 Discovery Hierarchy
- The repository provides domain-specific instructions in `.agent/skills/saigon-port-ui/SKILL.md` (Git-tracked) and design tokens in `frontend/DESIGN_DNA.md`.
- Generic creative skills in `.agents/skills/` (`banner-design`, `brand`, `design`, `slides`) are auxiliary tools for external marketing and must remain dormant during engineering tasks.

### 1.2 Task-Based Selection Matrix

| Task Domain | Primary Skill to Read | Canonical Spec / Reference | Prohibited / Skipped Skills |
| :--- | :--- | :--- | :--- |
| **Mobile User Portal** (Camera, OCR, Attendance, Home Hub) | `saigon-port-ui` (User Portal Scope) | `frontend/DESIGN_DNA.md` | `banner-design`, `brand`, `design`, `slides` |
| **Operations Portal & Map V2** (Desktop Admin, GIS Network) | `saigon-port-ui` (Operations & Map V2 Scope) | `frontend/DESIGN_DNA.md` | `banner-design`, `brand`, `design`, `slides` |
| **Backend API, SQLite, Schemas, Reconciliation** | None (Inspect `backend/app/`) | Python test fixtures | All UI and graphic design skills |
| **General UX Edge Cases** (Touch bounds, ARIA, WCAG) | Top-level `ui-ux-pro-max/SKILL.md` only | WCAG 2.1 specifications | `.agents/skills/ui-ux-pro-max/data/` (Never dump) |

### 1.3 Loading Invariants
1. **Never dump directory trees**: Do NOT inspect `.agent` or `.agents` recursively.
2. **Never load dormant data tables**: Do NOT open the 164 CSV/JSON data files in `.agents/skills/ui-ux-pro-max/data/` unless explicitly commanded.
3. **Read on demand**: Inspect the skill description from system metadata first; only call `view_file` on `SKILL.md` when the task directly relates to its domain.

---

## 2. Event-Driven Background-Job Execution Policy

Antigravity features a fully reactive task lifecycle with guaranteed automatic wake-up. Polling loops and manual waiting commands are strictly prohibited.

### 2.1 The Four Execution Invariants

```text
INVARIANT 1 (Synchronous Wait First):
When launching commands expected to complete quickly (< 10 seconds), always supply 
WaitMsBeforeAsync: 10000 in run_command. Allow the tool to return synchronously.

INVARIANT 2 (Never Poll Task Status):
If a long-running process transitions to a background task, retain its TaskId. 
DO NOT repeatedly call manage_task(action: 'status') solely to ask if it has finished.

INVARIANT 3 (No Shell Sleep or Timer Loops):
NEVER execute Start-Sleep, sleep, or while-loops in terminal commands to wait for processes. 
NEVER invoke schedule with short self-wake-up timers to check on tasks.

INVARIANT 4 (Yield Control Cleanly):
After launching a background command, either proceed with genuinely independent file work 
or conclude your turn by stopping tool calls. The runtime will automatically resume execution 
with MESSAGE_PRIORITY_HIGH when the process exits.
```

### 2.2 Prohibited vs. Permitted Command Usage
- **Prohibited**: Loops of `manage_task(action: 'status')`, `Start-Sleep -Seconds 3`, `ps`, `Get-Process` solely to wait for build, test, or lint scripts.
- **Permitted**: One-time process inspection for debugging hanging daemons, verifying port binding during development server launch, or explicit service lifecycle management.

---

## 3. Evidence-Backed Skill Compliance Model

Ceremonial compliance reports listing unread skills are obsolete. Future task deliverables must report skill compliance using an evidence-backed status taxonomy:

### 3.1 Status Classification Taxonomy
- `DISCOVERED`: Skill metadata was recognized by the runtime scanner.
- `READ`: Skill entry point (`SKILL.md`) was explicitly viewed via `view_file`.
- `APPLIED`: Concrete guidance from the skill directly shaped code or configuration changes.
- `VERIFIED`: Compliance was empirically validated through passing tests, builds, or visual captures.
- `NOT_APPLICABLE`: Skill was outside the assigned task's functional scope.
- `NOT_READ`: Skill was not loaded during the session.
- `UNVERIFIED`: Implementation was attempted but automated verification was unavailable.

### 3.2 Reporting Standard
Whenever summarizing work, document compliance using a concise evidence table:

| Skill | Status | File / Section Cited | Concrete Application & Test Evidence |
| :--- | :--- | :--- | :--- |
| `saigon-port-ui` | `APPLIED` / `VERIFIED` | Scoped Operating Profiles | Applied Operations scope; verified via `npm run test:operations` |
| `banner-design` | `NOT_APPLICABLE` | — | Non-engineering marketing skill intentionally skipped |
