# CURRENT PRODUCT MODEL AUDIT

## 1. Domain Entities & Database Model
The application is backed by an SQLite relational database (`data/app.db`) defined in `backend/app/models.py`.

```
                    ┌───────────────────────────┐
                    │      OperationalZone      │
                    └──────┬─────────────┬──────┘
                           │             │
                    zone_id│             │zone_id
                           ▼             ▼
                    ┌───────────┐   ┌───────────┐
      ┌────────────►│   Asset   │   │   Meter   │◄───────────┐
      │parent_asset └─────┬─────┘   └─────┬─────┘            │
      │                   │               │                  │meter_id
      └───────────────────┘       asset_id│                  │
                                          ▼                  │
                           ┌───────────────────────────┐     │
                           │    MeterAssetRelation     │─────┘
                           │ (INSTALLED_AT / MEASURES) │
                           └───────────────────────────┘
                                          ▲
                                          │
                           ┌──────────────┴────────────┐
                           │      AssetConnection      │
                           │   (SUPPLIES / Topology)   │
                           └───────────────────────────┘
```

### A. Meter (`meters` table)
- **Primary key**: `id: UUID`
- **Domain Identity**: `meter_code` (unique, e.g., `SIM-EM-001`), `name`, `meter_type` (`LCD` | `MECHANICAL`), `utility_type` (`ELECTRICITY` | `WATER`).
- **Telemetry & Lifecycle**: `is_active` (boolean), `lifecycle_status` (`ACTIVE` | `INACTIVE` | `RETIRED`), `retired_at`, `retired_by`, `retirement_reason`.
- **Spatial Position**: `map_x`, `map_y` (normalized canonical coordinates [0.0..1.0]), `presentation_zone_id` (e.g. `pres-technical`).
- **Direct Child**: `MeterReading` (parent of all historical reading series, OCR timestamps, values).

### B. Asset (`assets` table)
- **Primary key**: `id: UUID`
- **Domain Identity**: `code` (unique, e.g., `SIM-MDB-01`), `name`, `asset_type` (22 categories including `SUBSTATION`, `FEEDER`, `SWITCHBOARD`, `RTG`, `PUMP`, `WATER_POINT`).
- **Hierarchy**: `parent_asset_id` (self-referencing DAG hierarchy for equipment containment).
- **Spatial Position**: `map_x`, `map_y`, `mobility_type` (`FIXED` | `MOBILE`), `position_source`, `position_verification_status`.
- **Governance**: `lifecycle_status` (`ACTIVE` | `INACTIVE` | `RETIRED`), `verification_status` (`UNVERIFIED` | `VERIFIED` | `REJECTED` | `SIMULATION_APPROVED`).

### C. MeterAssetRelation (`meter_asset_relations` table)
- Decoupled M:N relation between `Meter` and `Asset`.
- **Relation Types**:
  1. `INSTALLED_AT`: Physical enclosure / mount chassis hosting the meter.
  2. `MEASURES`: Equipment or facility whose power or water consumption is quantified by this meter.
- **Constraints**: Enforces single active primary relation per `relation_type` per meter (`valid_to IS NULL`).

### D. AssetConnection (`asset_connections` table)
- Directional edge (`source_asset_id` -> `target_asset_id`) for utility distribution networks.
- Attributes: `utility_type` (`ELECTRICITY` | `WATER`), `connection_type` (`SUPPLIES`), `verification_status`.

---

## 2. Product Semantics: Meter vs. Asset

| Semantic Question | Factual Code / DB Answer |
| :--- | :--- |
| **Is Meter a subtype of Asset?** | **NO.** Meter and Asset are stored in separate database tables (`meters` vs `assets`) with distinct schemas, separate foreign keys, and separate API endpoints. |
| **Are they completely separate entities?** | **YES.** A Meter can exist without an Asset (legacy production mode), and an Asset can exist without a Meter (unmetered equipment). |
| **Does the UI use "Thiết bị" for both?** | **YES.** Historical code in `AdminMeters.tsx` renders header `"Danh sách thiết bị"`. In V16, `AdminAssets.tsx` is named `"Kho Thiết bị"`. The top workspace header disambiguated this by renaming the meter list to `"Sổ ca ghi"`. |
| **Can one Asset have many Meters?** | **YES.** A switchboard or substation can measure multiple branch feeders, each with its own meter. |
| **Can one Meter relate to multiple Assets?** | **YES.** A meter can be `INSTALLED_AT` a switchboard (Asset A) while it `MEASURES` an RTG crane (Asset B). |

---

## 3. Simulation Scope (`tan-thuan-demo-v1`)
- Under `active_scenario = "tan-thuan-demo-v1"`:
  - **12 Active Meters**: 8 electricity (`SIM-EM-001`..`008`) and 4 water (`SIM-WM-001`..`004`).
  - **32 Active Assets**: Substations, distribution switchboards, RTG cranes, reefer racks, quay cranes, and water points.
  - **24 Active Meter-Asset Relations**: 12 `INSTALLED_AT` and 12 `MEASURES` pairs (all verified).
  - **31 Active Asset Connections**: 24 electricity and 7 water supply edges forming complete DAG graphs.
  - **12 Quarantined Legacy Meters**: `CT-001` through `CT-012` permanently retired with `data_origin = 'LEGACY_SIMULATION'`.
