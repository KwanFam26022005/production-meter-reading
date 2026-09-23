# 17 — Visual acceptance

Screenshots were captured at a consistent 1440×1000 Operations viewport and 390×844 User viewport, with `Asia/Ho_Chi_Minh` timezone and a controlled temporary SQLite fixture. No production database was used.

Admin evidence: [01 default](screenshots/01_schedule_default.png), [02 all scope](screenshots/02_create_schedule_scope_all.png), [03 zone](screenshots/03_scope_by_zone.png), [04 utility](screenshots/04_scope_by_utility.png), [05 selected meters](screenshots/05_scope_selected_meters.png), [06 preview](screenshots/06_schedule_preview.png), [07 preview summary](screenshots/07_scope_preview_summary.png), [08 created scope](screenshots/08_created_round_scope.png), [09 round detail](screenshots/09_round_meter_detail.png), [10 legacy round](screenshots/10_legacy_round.png), [11 cancelled round](screenshots/11_cancelled_round_if_implemented.png).

User evidence: [12 current scope](screenshots/12_user_current_round_scope.png), [13 pending scope](screenshots/13_user_pending_scope.png), [14 electricity and water](screenshots/14_user_mixed_electricity_water.png), [15 completed scope](screenshots/15_user_completed_scope.png).

The User capture verified no out-of-scope meter appeared. A controlled successful confirm changed the pending task state before the completed-scope capture. See screenshot test notes in the implementation report.
