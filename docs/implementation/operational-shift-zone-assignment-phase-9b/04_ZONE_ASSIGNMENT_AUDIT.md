# 04 — ZoneAssignment audit

`ZoneAssignment` has zone/user, role, effective_from/to, and is_active, but no work date or shift. Map operations query active rows directly to label zone operators and reassign current zone ownership. Its FKs have legacy cascade behavior, and Map reassignment deactivates the current row before adding another. The model cannot express multiple shift-specific SUPPORT staff or a date-specific PRIMARY without changing Map semantics.

9B leaves ZoneAssignment and Map consumers unchanged. The new board exposes current ZoneAssignment as `default_user_id` suggestion metadata only; it never copies rows into authoritative operational assignment. Historical WHO+WHERE+SHIFT is unavailable before 9B.
