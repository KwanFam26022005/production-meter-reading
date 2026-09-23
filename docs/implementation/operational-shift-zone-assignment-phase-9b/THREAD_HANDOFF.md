# Thread 9B handoff

| # | Question | Answer |
| --- | --- | --- |
| 1 | Full baseline SHA? | `86007aea7eaaa5fb929c32318c88967810d803ff`. |
| 2 | Was worktree clean? | Yes, verified before branching. |
| 3 | WorkSchedule before 9B? | Persisted user/date/shift/status rows; read projections invented missing shifts. |
| 4 | Did missing row fabricate CA1? | Yes, weekdays (Sunday OFF). |
| 5 | Missing row after 9B? | `UNASSIGNED`, not eligible for assignment. |
| 6 | ZoneAssignment before 9B? | Current/default zone owner consumed by Map, no date/shift. |
| 7 | Extended or new entity? | New `OperationalAssignment`. |
| 8 | Why? | Preserve frozen Map/default semantics and date/shift history. |
| 9 | WHO? | OperationalAssignment.user_id. |
| 10 | WHERE? | OperationalAssignment.zone_id. |
| 11 | SHIFT? | OperationalAssignment.shift_code plus explicit WorkSchedule. |
| 12 | work_date start date? | Yes. |
| 13 | CA3 after midnight? | Same start work_date; window extends to next-day 06:00. |
| 14 | User multiple zones? | Yes. |
| 15 | Zone multiple users? | Yes, PRIMARY and SUPPORT. |
| 16 | Multiple PRIMARY? | No, service and partial unique index reject it. |
| 17 | SUPPORT? | Yes, multiple distinct users. |
| 18 | OFF assignable? | No. |
| 19 | Approved leave assignable? | No for matching shift. |
| 20 | Shift change? | Cancel incompatible rows, retain history; no automatic migration. |
| 21 | Leave approval? | Cancel matching rows in review transaction. |
| 22 | Substitute auto-transfer? | No, nomination only. |
| 23 | Cancelled history retained? | Yes, actor/time/reason and original row. |
| 24 | Historical assignments fabricated? | No. |
| 25 | MeterReading.user_id? | Actual executor, unchanged. |
| 26 | ReadingRoundMeter meaning changed? | No. |
| 27 | ReadingBatch filtered? | No, global 9A scope remains. |
| 28 | Map V2 modified? | No. |
| 29 | Focused tests? | 32 passed, including 16 new 9B cases. |
| 30 | Operations tests? | 392 passed. |
| 31 | User tests? | 83 passed. |
| 32 | Backend failures attributed? | Same ten nodes and material reasons as 9A same-environment run; zero new 9B failures. |
| 33 | B2 hash? | `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`. |
| 34 | Bundle isolation? | Passed. |
| 35 | Builds? | User and Operations passed. |
| 36 | 9C contract? | ReadingRound scheduled time → work_date/shift → active actionable OperationalAssignment → ReadingRoundMeter zone snapshot → user task; actual executor stays separate. |

Thread 9C owns the intersection; 9B deliberately stops at the authoritative staffing assignment.
