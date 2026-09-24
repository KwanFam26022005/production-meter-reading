# Saigon Port — Thread 9C Handoff Dossier

**Thread:** 9C — User Task Projection  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Base Commit SHA:** `c190e7ff45d8aa74f668fa9b9adad6e6e1b65fd1`  
**Branch:** `feature/user-task-projection-phase-9c`  
**Status:** COMPLETE & READY FOR STACKED PR  

---

## 1. Domain Truth Summary

| Domain | Entity Owner | Authority & Semantics |
| :--- | :--- | :--- |
| **WHEN** | `ReadingRound` | Round schedule timestamp, status, and scope mode. |
| **WHAT** | `ReadingRoundMeter` | Immutable round scope with `zone_id_snapshot`. |
| **WHO + WHERE + SHIFT** | `OperationalAssignment` + `WorkSchedule` | Staffing assignments, shift windows, and operational roles (`PRIMARY`, `SUPPORT`). |
| **ACTUAL EXECUTOR** | `MeterReading.user_id` | True physical user who pressed confirmation in the field. |
| **USER TASKS** | `UserTaskProjection` | Derived read model: $\text{ReadingRoundMeter} \cap \text{OperationalAssignment}$. |

---

## 2. Invariant Verification

- [x] **Zero Persistent Duplication:** No `user_tasks` or `round_user_meters` tables created.
- [x] **Dual Truth Progress:** Personal progress (`confirmed / assigned_total`) never replaces or redefines global round denominator (`global_round_total`).
- [x] **Half-Open Shift Windows:** Half-open $[start, end)$ in `Asia/Ho_Chi_Minh` prevents ambiguous double assignments at 06:00, 14:00, and 22:00 boundaries.
- [x] **CA3 Overnight Resolution:** Rounds between 00:00 and 05:59 correctly match CA3 shifts commencing at 22:00 on the prior day.
- [x] **Zone Snapshot Join:** Tasks join via `ReadingRoundMeter.zone_id_snapshot`, ignoring mid-day changes to `Meter.zone_id`.
- [x] **Authority Gate:** Unassigned field employees receive HTTP 403 Forbidden; administrators retain wharf-wide override.
- [x] **Map V2 Freeze:** Zero changes to `frontend/src/components/map-v2/`; B2 freeze hash `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a` verified intact.
- [x] **Reporting Untouched:** Zero changes to `backend/app/reporting.py`.
- [x] **Full Regression Pass:** All 43 pytest 9C tests pass, all 90 frontend user tests pass, 392 operations tests pass, and zero regressions detected.

---

## 3. Pull Request Details

- **Target Branch (HEAD):** `feature/user-task-projection-phase-9c`
- **Base Branch (BASE):** `feature/operational-shift-zone-assignment-phase-9b`
- **Commit Message Convention:** `feat(operations): project reading tasks by shift assignment`
