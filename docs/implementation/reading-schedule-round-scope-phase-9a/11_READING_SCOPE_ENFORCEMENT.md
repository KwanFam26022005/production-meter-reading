# 11 — Reading scope enforcement

Confirm and Review submissions check snapshot membership before accepting a new reading. A meter outside the round scope receives HTTP 422. `LEGACY_DYNAMIC` rounds retain compatibility behavior. The existing unique meter/round constraint and reconciliation behavior remain in place.

`MeterReading.user_id` still records the user who actually performed the reading. No assignment identity was added to scope rows or rounds.
