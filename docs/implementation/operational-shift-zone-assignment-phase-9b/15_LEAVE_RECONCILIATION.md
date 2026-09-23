# 15 — Leave reconciliation

On APPROVED, the existing leave review transaction invokes `cancel_for_leave()` for matching user/date/shift assignments, recording `APPROVED_LEAVE`, actor, time, and audit. The requester's matching WorkSchedule becomes LEAVE; an ALL leave may create an explicit LEAVE row for a previously unscheduled day. Shift-specific leave does not rewrite a different shift. REJECTED and PENDING leave do not cancel assignments. A nominated substitute receives neither roster nor zone responsibility automatically.
