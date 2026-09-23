# Event-Driven Background-Job Execution Policy & Polling Remediation

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Governing Standard:** `AGENTS.md` (Project Root)  
**Date:** 2026-09-23  
**Status:** FULLY ENFORCED & EMPIRICALLY VERIFIED  

---

## 1. Engine Capability Architecture

Google Antigravity's task execution subsystem is built on a **fully reactive, event-driven messaging architecture**. Unlike standard interactive shells that require active polling, Antigravity provides guaranteed background process tracking and automatic model resumption.

### 1.1 The Reactive Lifecycle
1. **Command Launch:** A command is dispatched via `run_command`. By specifying `WaitMsBeforeAsync` (up to 10,000ms), the tool blocks synchronously, returning immediate results if the process completes within the threshold.
2. **Asynchronous Hand-off:** If the process runs longer than `WaitMsBeforeAsync`, the engine automatically transitions the process to a managed background task (e.g., `task-118`).
3. **Turn Conclusion:** The agent retains the task ID and either conducts independent file operations or concludes its turn by ceasing tool calls.
4. **Authoritative Wake-Up Event:** When the background process exits, the Antigravity engine dispatches a high-priority system event:
   ```text
   <SYSTEM_MESSAGE>
   [Message] timestamp=... sender=ab8fb3c0-.../task-118 priority=MESSAGE_PRIORITY_HIGH 
   content=Task id "..." finished with result:
   The command exited with code 0.
   Output: ...
   </SYSTEM_MESSAGE>
   ```
5. **Model Resumption:** The agent turn is resumed automatically, equipped with the complete command output, exit code, and execution metadata in its context queue.

---

## 2. The Four Mandatory Execution Invariants

To eliminate the historical polling waste of 15,000 to 25,000 tokens per session, all agents must adhere to the following four rules:

```text
INVARIANT 1 (Synchronous Wait First):
When running fast commands (< 10 seconds), always supply WaitMsBeforeAsync: 10000. 
Allow the tool to return synchronously whenever possible.

INVARIANT 2 (Never Poll Task Status):
If a long-running process transitions to a background task, retain its TaskId. 
DO NOT call manage_task(action: 'status') in a loop.

INVARIANT 3 (No Shell Sleep or Timer Loops):
NEVER execute Start-Sleep, sleep, or while-loops in terminal commands to wait for processes. 
NEVER invoke schedule with short self-wake-up timers to check on tasks.

INVARIANT 4 (Yield Control Cleanly):
After launching a background command, either proceed with genuinely independent file work 
or conclude your turn by stopping tool calls. The runtime will automatically resume execution 
with MESSAGE_PRIORITY_HIGH when the process exits.
```

---

## 3. Empirical Verification in Phase 1

During this optimization phase, three separate long-running commands were executed strictly under this policy. In all three instances, **zero polling calls** were made, and the engine provided flawless automatic wake-up:

| Task ID | Executed Command | Wall Duration | Status Polling Calls | Shell Sleeps | Timers | Wake-Up Received? | Exit Code | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`task-48`** | Binary analysis on `agy.exe` | 12 seconds | **0** | **0** | **0** | **YES (`MESSAGE_PRIORITY_HIGH`)** | `0` | Symbol offsets located |
| **`task-118`** | Frontend regression test suite (40 tests) | 18 seconds | **0** | **0** | **0** | **YES (`MESSAGE_PRIORITY_HIGH`)** | `0` | 40 passed, 0 failed |
| **`task-122`** | Operations Portal Vite production build | 32 seconds | **0** | **0** | **0** | **YES (`MESSAGE_PRIORITY_HIGH`)** | `0` | Complete bundles in `dist/` |

---

## 4. Permitted vs. Prohibited Execution Practices

To maintain practical troubleshooting capabilities without re-introducing polling loops, execution tools are governed by the following boundaries:

| Practice / Tool | Status | Conditions / Policy |
| :--- | :--- | :--- |
| `manage_task(action: 'status')` in loops | **PROHIBITED** | Polling solely to check if an unchanged background task has completed is strictly banned. |
| `manage_task(action: 'kill')` | **PERMITTED** | Allowed when canceling runaway, frozen, or superseded processes. |
| `Start-Sleep` / `sleep` loops | **PROHIBITED** | Using shell sleep commands to wait for server initialization or test completion is banned. |
| `schedule` with short durations (< 60s) | **PROHIBITED** | Creating artificial timers to wake oneself up to inspect a command is banned. |
| `Get-Process` / `ps` one-time inspection | **PERMITTED** | Allowed once for diagnosing zombie ports, memory leaks, or specific lifecycle debugging. |
| Parallel background tasks | **PERMITTED** | Running independent tests or builds concurrently is allowed provided they do not share mutable ports, DB fixtures, or build directories. |

---

## 5. Application to Standard Project Workflows

This policy applies universally across all repository engineering procedures:

1. **Frontend Unit Tests:** `npx tsx --test tests/*.test.ts`
2. **Operations Portal Build:** `npm run build:operations`
3. **User Portal Build:** `npm run build:user`
4. **Playwright Integration Tests:** `npx playwright test`
5. **Video & Screenshot Capture Scripts:** `node scripts/capture_*.mjs`
6. **Backend Unit & Reconciliation Tests:** `pytest tests/`
7. **Linting and Bundle Separation Verification:** `node scripts/verify_bundle_separation.mjs`
