# 10 — Availability and conflicts

New assignment requires an active User and OperationalZone, an explicit WorkSchedule on the same start date with exactly the selected working shift, and no matching APPROVED leave. Missing row = UNASSIGNED_SHIFT; OFF = OFF; LEAVE/ON_LEAVE/approved request = APPROVED_LEAVE; wrong shift = SHIFT_MISMATCH; inactive user = INACTIVE_USER. Pending leave yields PENDING_LEAVE plus a warning, while still assignable.

Preview reports per-item errors and warnings, total conflicts, and projected CREATE outcome. Apply is all-or-nothing. Inactive staff/zone after publication keeps historical rows; the read projection marks them `actionable=false` and the board labels them unavailable.
