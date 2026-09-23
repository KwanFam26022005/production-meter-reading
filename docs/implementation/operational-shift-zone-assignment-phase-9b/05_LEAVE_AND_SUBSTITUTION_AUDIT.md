# 05 — Leave and substitution audit

`LeaveRequest` stores requester, date interval, optional shift, substitute nomination, PENDING/APPROVED/REJECTED/CANCELLED, reviewer, and notes. The existing approval path changes the requester's WorkSchedule to LEAVE. Before 9B it also created or changed the substitute's WorkSchedule using a CA1 fallback if the requester had no schedule.

After 9B PENDING is an availability warning and remains assignable. APPROVED blocks the matching shift, cancels matching active OperationalAssignments in the approval transaction, and retains cancellation history. For shift-specific leave, unrelated shifts remain visible. `substitute_user_id` remains an informational suggestion in Admin leave records; it never creates WorkSchedule or OperationalAssignment for the substitute. Admin must explicitly schedule and assign that person.
