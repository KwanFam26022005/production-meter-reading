# 21 — Handoff to Thread 9C

9A: WHEN = ReadingRound, WHAT = ReadingRoundMeter. 9B: WHO+WHERE+SHIFT = explicit WorkSchedule and OperationalAssignment. ACTUAL EXECUTOR = MeterReading.user_id. 9C should derive UserTaskProjection by resolving each round's scheduled time into a work_date/shift window, intersecting OperationalAssignment zone with `ReadingRoundMeter.zone_id_snapshot`, then projecting tasks per user. It should exclude cancelled or nonactionable assignments, preserve historical scope snapshots, and never reinterpret actual executor as assignment. No intersection is implemented in 9B.
