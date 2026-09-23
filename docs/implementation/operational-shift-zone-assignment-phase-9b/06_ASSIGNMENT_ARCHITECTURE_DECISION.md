# 06 — Assignment architecture decision

**Decision: OPTION B, NEW_OPERATIONAL_ASSIGNMENT.** Map uses ZoneAssignment as current/default zone ownership, without shift/date context. Extending it would change frozen Map behavior and confuse historical assignment with defaults. A separate OperationalAssignment records WHO+WHERE+SHIFT for one work date and preserves cancellation history. Neither ReadingRound nor ReadingRoundMeter gains employee or assignment fields.

See [ARCHITECTURE_DECISION_RECORD.md](ARCHITECTURE_DECISION_RECORD.md) for rejected alternative and consequences.
