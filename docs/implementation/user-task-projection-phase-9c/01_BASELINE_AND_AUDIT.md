# Saigon Port — Thread 9C Baseline and Upstream Audit

**Thread:** 9C — User Task Projection  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Base Branch:** `feature/operational-shift-zone-assignment-phase-9b`  
**Base Commit SHA:** `c190e7ff45d8aa74f668fa9b9adad6e6e1b65fd1`  
**Target Branch:** `feature/user-task-projection-phase-9c`  
**Date:** 2026-09-24  

---

## 1. Upstream Audit & Verification

Before initiating any changes in Thread 9C, the repository was audited at `c190e7ff45d8aa74f668fa9b9adad6e6e1b65fd1`.

### 1.1 Git Invariant Verification
```bash
git status --short
# Clean working tree on feature/operational-shift-zone-assignment-phase-9b
git rev-parse HEAD
# c190e7ff45d8aa74f668fa9b9adad6e6e1b65fd1
```

### 1.2 Upstream Evidence Inspected
1. `docs/implementation/reading-schedule-round-scope-phase-9a/THREAD_HANDOFF.md`
2. `docs/implementation/operational-shift-zone-assignment-phase-9b/THREAD_HANDOFF.md`
3. `docs/implementation/operational-shift-zone-assignment-phase-9b/21_HANDOFF_TO_THREAD_9C.md`

### 1.3 Core Findings
- **Thread 9A Ownership (WHEN & WHAT):**
  - `ReadingRound`: Encapsulates schedule time (`scheduled_at`), open/closed state (`status`), and `scope_mode` (`SNAPSHOT` vs `DYNAMIC_LEGACY`).
  - `ReadingRoundMeter`: Persists the frozen round scope with `meter_id`, `zone_id_snapshot`, `zone_code_snapshot`, `zone_name_snapshot`, and `display_order`.
- **Thread 9B Ownership (WHO, WHERE, SHIFT):**
  - `OperationalAssignment`: Links `user_id`, `zone_id`, `work_date`, `shift_code`, `assignment_role` (`PRIMARY` | `SUPPORT`), `status` (`ASSIGNED` | `CANCELLED`).
  - `WorkSchedule`: Provides monthly and weekly shift roster truth (`CA1`, `CA2`, `CA3`, `HC`, `OFF`, `LEAVE`).
  - Legacy `ZoneAssignment`: Deprecated default/fallback Map ownership. **Never confers task authority.**
- **Actual Executor Invariant:**
  - `MeterReading.user_id` records the true physical person who confirmed or reviewed the reading on site, preserving forensic auditability.
