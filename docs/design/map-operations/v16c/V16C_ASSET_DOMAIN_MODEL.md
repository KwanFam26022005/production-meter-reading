# V16C Asset Domain Model Specification

## 1. Domain Architecture Overview

Phase V16C establishes the **Asset-Centric Domain Foundation** for industrial port operations at Tân Thuận Port.
In legacy phases (V1–V16B), meters were treated as standalone spatial entities directly associated with general operational zones. V16C decouples:
1. **The Physical / Operational Asset**: The machinery, facility, or electrical infrastructure consuming or transforming energy/resources (e.g., RTG Crane, Substation Transformer, Switchboard).
2. **The Metering Device**: The sensor, register, or digital dial recording consumption (`Meter`).
3. **The Spatial Map**: Authoritative background geography and presentation zones (`MapVersion`, `MapVersionZone`).

```
OperationalZone
      |
      └──< Asset
             |
             ├── parent Asset (containment hierarchy)
             |
             ├──< MeterAssetRelation >── Meter
             |           |                  |
             |           ├── INSTALLED_AT   └──< MeterReading
             |           └── MEASURES
             |
             ├──< AssetConnection (source)
             |
             └──< AssetConnection (target)
```

---

## 2. Core Entities & Table Schema

### 2.1. `assets` Table
- `id` (VARCHAR(36), PK): UUID.
- `code` (VARCHAR(64), UNIQUE, INDEX): Unique stable business code.
- `name` (VARCHAR(200)): Human-readable asset name.
- `asset_type` (VARCHAR(64), INDEX): Validated port taxonomy.
- `parent_asset_id` (VARCHAR(36), FK `assets.id` ON DELETE SET NULL): Containment hierarchy.
- `zone_id` (VARCHAR(36), FK `operational_zones.id` ON DELETE SET NULL): Primary operational zone.
- `mobility_type` (VARCHAR(32)): `FIXED` | `MOBILE`.
- `position_source` (VARCHAR(32)): `STATIC_MAP` | `ASSIGNED` | `LAST_KNOWN` | `GPS` | `UNKNOWN`.
- `map_x`, `map_y` (REAL): Normalized canvas coordinates `[0, 1]`.
- `lifecycle_status` (VARCHAR(32), INDEX): `ACTIVE` | `INACTIVE` | `RETIRED`.
- `verification_status` (VARCHAR(32), INDEX): `UNVERIFIED` | `VERIFIED` | `REJECTED`.
- `metadata_json` (TEXT): Optional JSON properties.
- `created_at`, `updated_at` (DATETIME): UTC audit timestamps.
- `created_by`, `updated_by` (VARCHAR(36), FK `users.id` ON DELETE SET NULL).

### 2.2. Non-Destructive Lifecycle
- Retiring an Asset (`RETIRED`) does **not** cascade delete meters, readings, relations, or topology connections.
- Historical relations and audit trail are preserved permanently.
