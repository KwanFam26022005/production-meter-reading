# V16C Asset Hierarchy & Cycle Protection

## 1. Hierarchy Semantics: Containment vs Utility Flow

- `parent_asset_id` models **organizational/physical containment** (e.g. Substation contains Switchboard; Warehouse contains Distribution Board).
- It does **NOT** represent utility flow direction (which is modeled via `asset_connections`).

---

## 2. Hierarchy Cycle Protection

The service layer validates hierarchy updates at arbitrary depth (`check_hierarchy_cycle`):
- Prevents self-parenting: `asset.parent_asset_id = asset.id` is rejected.
- Prevents loops: If asset A is parent of B, and B is parent of C, setting C as parent of A is rejected.
- Non-cascading retirement: Retiring a parent asset does not cascade-delete or automatically retire children.
