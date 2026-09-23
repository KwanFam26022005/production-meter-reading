# 08 — Shift window and work date

`work_date` is the **start calendar date** in `Asia/Ho_Chi_Minh`. The server's `shift_window()` is authoritative: CA1 06:00–14:00, CA2 14:00–22:00, CA3 22:00–next-day 06:00, HC 07:30–16:30. `timing_state()` derives UPCOMING/CURRENT/PAST from this interval; only CANCELLED is persisted. The board returns start/end timestamps so Admin does not recompute them.

Test: CA3 `2030-09-23` covers `2030-09-24 02:00` and ends `2030-09-24 06:00`, while retaining work_date `2030-09-23`.
