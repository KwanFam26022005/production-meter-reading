# 08 — Batch progress semantics

A batch can contain the same meter in several rounds. A unique meter count and a count of meter-round tasks are different metrics.

`BatchProgress` now adds `unique_meter_count`, `scheduled_slot_count`, `confirmed_slot_count`, `review_slot_count`, and `pending_slot_count`. Slots are aggregated across non-cancelled rounds; snapshot slots use persisted scope. Legacy rounds use the active-inventory compatibility rule.

The old fields remain for deployed consumers: `total` is current active meter count, while `confirmed`/`review` count matching reading rows in that batch. Those old fields do not share one denominator and remain ambiguous. Operators see round task counts as “nhiệm vụ đọc” in schedule preview.
