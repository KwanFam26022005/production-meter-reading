# V16C Meter-Asset Relationship Architecture

## 1. Decoupled M:N Relationship Model

Rather than adding a simple `meters.asset_id` foreign key, V16C implements the `meter_asset_relations` entity:
- A Meter may be physically mounted at one Asset (`INSTALLED_AT`), but measure the electrical load of a different Asset (`MEASURES`).
- An Asset can have multiple meters (e.g. multi-circuit monitoring, separate power and water).
- Relationship history is preserved temporally using `valid_from` and `valid_to` (active when `valid_to IS NULL`).

---

## 2. Relation Types & Semantics

1. `INSTALLED_AT`:
   - Physical host enclosure, panel, or machinery chassis where the meter is physically mounted.
   - Example: Meter `EM-RTG04` mounted in *Substation TT2 Switchboard*.
2. `MEASURES`:
   - The operational equipment or facility whose consumption is measured.
   - Example: Meter `EM-RTG04` measures power to *Gantry Crane RTG-04*.

---

## 3. Active Primary Safety & Temporal Semantics

- **Primary Uniqueness**: For any given Meter, the service layer enforces that only **one active primary** relation of a specific `relation_type` may exist at any time.
- **Transfers**: When a Meter is transferred to a new Asset:
  1. The existing relation row has its `valid_to` set to current timestamp (closed, not deleted).
  2. A new relation row is inserted with `valid_from = now()`, `valid_to = NULL`.
- **Retired Meters**: A retired meter retains all historical relations for reporting, but new active relations cannot be attached.
