# 06 — Scope preview and fingerprint

`POST /api/v1/admin/schedules/preview` returns proposed local times, conflicts, exact eligible meter count per round, electricity/water/other counts, zone distribution, invalid selections, and a scope summary.

The fingerprint is SHA-256 over stable JSON containing the scope mode and sorted meter IDs. It does not include labels or UI order. `POST /api/v1/admin/schedules` resolves the scope again and compares `expected_scope_fingerprint`. A changed member list returns HTTP 409 with a Vietnamese re-preview message. The create response includes the accepted fingerprint and materialized row count.

The fingerprint detects membership changes between preview and create; it is not a client-authored scope list and the server never trusts submitted meter IDs without resolving eligibility again.
