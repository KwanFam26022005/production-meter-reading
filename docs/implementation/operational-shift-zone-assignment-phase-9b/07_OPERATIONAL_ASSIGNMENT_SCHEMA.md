# 07 — OperationalAssignment schema

`operational_assignments` has UUID id; RESTRICT FKs to User and OperationalZone; work_date; shift_code; role PRIMARY/SUPPORT; status ASSIGNED/CANCELLED; source MANUAL; notes; creator/time; updater/time; canceller/time/reason. RESTRICT prevents hard deletion of referenced staff or zones from erasing operational evidence. Existing lifecycle operations use `is_active`, so names remain available through those records; redundant name snapshots are not needed.

SQLite partial unique indexes enforce one active user/zone/date/shift and one active PRIMARY per zone/date/shift. Date+shift, user, zone, status indexes serve board/availability and history queries. Cancelled rows remain, allowing replacement by a new row. `created_by` and `cancelled_by` use SET NULL so account cleanup cannot erase the assignment record.
