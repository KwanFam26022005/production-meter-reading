# 03 — WorkSchedule truth

`WorkSchedule` stores `user_id`, `work_date`, `shift_code`, `status`, and notes, with one row per user/date. Working codes are CA1 06:00–14:00, CA2 14:00–22:00, CA3 22:00–06:00, and HC 07:30–16:30. OFF and LEAVE are nonworking. Auto-pattern apply writes real WorkSchedule rows. Preview simulates without writing.

Before 9B both monthly User schedule and Admin roster projected missing rows as CA1 weekdays or OFF Sunday. This was `IMPLICIT_SCHEDULE_FABRICATION`. After 9B missing rows project `UNASSIGNED` with no start/end time, no shift count, and no assignment eligibility. `UNASSIGNED` is projection-only; it is not persisted by simply reading the calendar. Explicit OFF remains distinct from missing schedule.
