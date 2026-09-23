# 01 — Baseline and audit

The source worktree was clean on `feature/reading-schedule-round-scope-phase-9a` at `86007aea7eaaa5fb929c32318c88967810d803ff`. The stacked branch is `feature/operational-shift-zone-assignment-phase-9b`. Thread 9A retains ownership of ReadingRound, ReadingRoundMeter, scope mode, denominator, and MeterReading.user_id.

Source inspected: `models.py`, `work_schedule.py`, `map_operations.py`, `admin.py`, `schemas.py`, `main.py`, `db.py`, AdminStaffRoster, UserScheduleView, API/types, and existing roster tests. `ZoneAssignment` is queried directly by Map operations as current default zone ownership. `WorkSchedule` is persisted per employee and date, but its read projections previously invented CA1 on weekdays and OFF on Sunday when no row existed. Leave approval also inferred CA1 for a missing requester schedule and assigned that inferred shift to a nominated substitute.

The 9A regression report establishes ten baseline backend failures on the same local date/environment: five asset/simulation fixture expectations, two fixed 2026-09-16 due assertions, and three current-round timing assertions. See [18_TEST_AND_REGRESSION_RESULTS.md](18_TEST_AND_REGRESSION_RESULTS.md).
