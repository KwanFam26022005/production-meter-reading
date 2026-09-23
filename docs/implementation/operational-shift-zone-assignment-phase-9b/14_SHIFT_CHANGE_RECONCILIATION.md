# 14 — Shift change reconciliation

Manual roster changes and auto-pattern apply call `cancel_incompatible_shift()` before saving the new WorkSchedule. It cancels all active assignments for that user/work_date whose shift differs, records `SHIFT_CHANGED`, actor, time, and an AdminAuditLog entry. This runs in the same transaction as the schedule change. CA1→OFF and CA1→CA2 both cancel CA1 records; no CA2 assignment is inserted implicitly. Auto-pattern preview counts the affected records.
