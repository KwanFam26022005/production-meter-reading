# 09 — Admin schedule workflow

Admin Lịch ghi follows date → time window → interval → meter scope → preview → confirm. The scope choices use zone and meter IDs; no Vietnamese label matching is used. Preview reports round count, local time list, meter count per round, utility mix, zone distribution, task-slot total, and conflicts.

After publishing, the schedule table and round detail read the stored scope. Detail reports scheduled, confirmed, review, and pending counts and lists the exact meters. It labels legacy rounds as “Phạm vi lịch cũ”. Inactive/retired/missing scheduled items remain visible with an availability state. Cancel/delete dialogs use safe wording and keyboard focus handling.

Cross-midnight schedules such as 22:00–06:00 are rejected explicitly; the current API does not assign post-midnight rounds to an operational date.
