# 16 — API contracts

| Endpoint | Contract |
| --- | --- |
| `GET /api/v1/admin/operational-assignments?date=YYYY-MM-DD&shift_code=CA1` | Admin board with zones, assigned roles, staff availability, cancelled history, and shift window. |
| `POST /api/v1/admin/operational-assignments/preview` | Admin + CSRF; request `{work_date, shift_code, items:[{user_id,zone_id,assignment_role,notes?}]}`; returns item conflicts/warnings. |
| `POST /api/v1/admin/operational-assignments/apply` | Same request/auth; all-or-nothing insert, returns persisted assignments; 409 on changed/conflicting state. |
| `POST /api/v1/admin/operational-assignments/{id}/cancel` | Admin + CSRF; request `{reason}`; retains cancelled history. |
| `GET /api/v1/operational-assignments/me?date=…` or `?month=YYYY-MM` | Own active assignments only. |

Pydantic validates date, shift, role, item count, and cancel reason. The server rechecks availability in apply. `actionable` is a read-time boolean derived from current staff/zone/schedule/leave availability; stored `status` remains historical ASSIGNED or CANCELLED.
