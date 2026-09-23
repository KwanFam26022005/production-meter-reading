# 18 — Known limitations

- Legacy rounds remain dynamically scoped because their original meter sets are unknown.
- Shared Admin dashboard KPI/round/location aggregates and `backend/app/reporting.py` still use current active inventory. They are not the snapshot denominator; refactoring reporting is deferred to Thread 9C.
- Existing batch compatibility fields remain ambiguous; use the additive slot and unique-meter fields for new consumers.
- Cross-midnight creation (including 22:00–06:00) is explicitly rejected pending an operational-date rule.
- Persistent draft schedule records are not introduced; preview is the draft and create is publish.
- User work remains global. Employee/zone assignment and task intersection are deferred.
- The scope snapshot stores meter identity, operational/presentation zone IDs, and utility, but not a historical meter-location string or copied zone labels. The round API returns current zone details separately when available.
- The whole backend suite has 7 unresolved V16C/V16D/V16E fixture and date-sensitive failures (235 passed); details are in [16](16_TEST_AND_REGRESSION_RESULTS.md).
