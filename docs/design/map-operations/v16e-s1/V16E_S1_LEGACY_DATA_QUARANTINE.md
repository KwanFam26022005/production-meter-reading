# V16E-S1: Legacy Data Quarantine & Audit Preservation

## 1. Absolute History Preservation Rule

The system guarantees the immutable preservation of all prior historical records:
- **Rule**: DO NOT delete legacy meters `CT-001` through `CT-012`.
- **Reason**: 2,841 historical meter readings are bound to these meter IDs. Deleting them would violate enterprise data integrity and orphan historical audit logs.

---

## 2. Quarantine State Classification

### 12 Legacy Meters (`CT-001` .. `CT-012`)
- `lifecycle_status`: `"RETIRED"`
- `data_origin`: `"LEGACY_SIMULATION"`
- `is_active`: `False`
- `retired_at`: `2026-09-16 00:00:00`
- `retirement_reason`: `"Reclassified to legacy simulation in V16E-S1 baseline"`
- **Visibility**: Excluded from default map views, operational shift logbooks, and active utility networks. Visible in Admin Meters when filtering by `LEGACY_SIMULATION` or `RETIRED`.

### 364 Legacy Assets
- `data_origin`: `"LEGACY_TEST_DATA"`
- `verification_status`: `"UNVERIFIED"`
- `scenario_id`: `None`
- **Visibility**: Excluded from `tan-thuan-demo-v1` operational views. Accessible via Admin Assets when selecting the `Dữ liệu thử nghiệm cũ` scope.

### 90 Legacy Meter-Asset Relations & 102 Legacy Connections
- Tagged with `data_origin = "LEGACY_TEST_DATA"`.
- Zero active foreign key violations (`PRAGMA foreign_key_check = 0`).

---

## 3. Database Migration Script

The quarantine was executed via `scripts/migrate_v16e_s1_schema.py`:
1. Alters SQLite tables to add `data_origin` (default `'VERIFIED'`) and `scenario_id` (nullable).
2. Updates `CT-001`..`CT-012` to `RETIRED` and `LEGACY_SIMULATION`.
3. Sets existing assets, relations, and connections to `LEGACY_TEST_DATA`.
4. Creates `simulation_scenarios` table and registers `tan-thuan-demo-v1`.
