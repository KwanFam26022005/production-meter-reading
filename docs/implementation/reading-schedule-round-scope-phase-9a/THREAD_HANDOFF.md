# Thread handoff — 9A to 9B/9C

1. **Full baseline SHA?** `57db422b668bb77dfce8cb1a3fea64b29fe60178`.
2. **Old scope behavior?** Active meters were re-read at query time for round progress, round meters, and the User current queue.
3. **Do new rounds persist scope?** Yes; each new round is `SNAPSHOT` and has scope rows in the publish transaction.
4. **Scope entity?** `ReadingRoundMeter` / SQLite `reading_round_meters`.
5. **Snapshots preserved?** Meter code/name, operational zone ID, presentation zone ID, utility, scope origin/status, creation time.
6. **Scope modes?** `ALL_ELIGIBLE`, `BY_ZONE`, `BY_UTILITY`, `SELECTED_METERS`.
7. **Legacy rounds?** `LEGACY_DYNAMIC`, continuing old active-inventory calculation.
8. **Are old rounds presented as exact?** No; no fake backfill is made, and APIs expose legacy mode.
9. **How is scope resolved?** Active and non-retired meters, stable IDs, deterministic meter-code ordering.
10. **Admin modes?** All eligible, by zone, by utility, selected meters.
11. **Does preview show exact counts?** Yes: per-round count, utility mix, zones, invalid selections, conflicts, and projected meter-round tasks.
12. **Fingerprint protection?** Yes; preview SHA-256 is compared after server-side re-resolution; stale publish returns 409.
13. **Atomic creation?** Yes; round and scope rows share one transaction with cardinality checks and rollback.
14. **Can a new round exist without scope?** No through schedule creation; empty scope is rejected.
15. **Round denominator?** Scheduled scope rows for snapshots; legacy active-meter count for legacy rounds.
16. **Does a new meter change an old snapshot?** No.
17. **Does retirement change it?** No; the row remains and availability is explicit.
18. **Does a zone move change the old zone snapshot?** No; current and saved zone fields can coexist in the round API.
19. **Can User submit outside scope?** No; confirm and Review return 422.
20. **Does User share Admin scope?** Yes for current snapshot queues and round details.
21. **Employee filtering added?** No.
22. **Does `MeterReading.user_id` retain executor meaning?** Yes.
23. **Delete behavior with readings?** Round is cancelled; reading and scope history remain. Direct delete is guarded.
24. **Are cancelled rounds current/actionable?** No; current/upcoming selection and User queue exclude them.
25. **Batch ambiguity?** Old `total` is current active meter count while confirm/review are reading rows; additive unique-meter and slot metrics now separate them.
26. **Reports still legacy?** `backend/app/reporting.py` still uses current active inventory for expected slots and round/location denominators.
27. **WorkSchedule/ZoneAssignment unchanged?** Yes.
28. **Map V2 files untouched?** Yes; B2 checksum passes. Shared dashboard aggregates retain their existing inventory projection.
29. **Did all regressions pass?** No. Focused 9A 59/59, Operations 388/388, User 79/79, combined frontend 492/492, spatial 26/26, unified simulation 30/30, both builds, B2 hash, and bundle isolation pass. The full backend suite reports 235 passed and 7 failed: five V16C/V16D/V16E asset/simulation fixture failures with missing seeded records or empty asset-network results, plus two assertions that hard-coded 2026-09-16 work is still DUE on runtime date 2026-09-23. The simulation DB fixture migration issue was fixed and cleared two earlier failures.
30. **What should 9B implement?** Assignment ownership (`WHO + WHERE`) with existing shift/zone concepts, without mutating the 9A published scope.

## Contract for 9B/9C

`WHEN = ReadingRound`; `WHAT = ReadingRoundMeter`; future user tasks are `ReadingRoundMeter ∩ OperationalAssignment`. Do not put `user_id` on scope rows or reinterpret `MeterReading.user_id`.
