# 07 — Round progress semantics

For `SNAPSHOT` rounds, `calculate_round_progress()` counts `SCHEDULED` scope rows. Confirmed and Review counts are readings whose meter IDs are in that scope; pending is the remaining scheduled row count. Current `is_active` does not change the denominator.

For `LEGACY_DYNAMIC` rounds, the old current-active-meter calculation remains as a compatibility path, and API responses expose `scope_mode` so consumers can identify it.

Admin Lịch ghi round rows/details and User operations use the snapshot-aware round APIs. The shared Admin dashboard round progress and location aggregates remain current-inventory projections during the Map V2 freeze; they are a known legacy projection, not the persisted schedule denominator. Reports are documented in [18](18_KNOWN_LIMITATIONS.md).
