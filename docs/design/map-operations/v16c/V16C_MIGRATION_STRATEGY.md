# V16C Migration & Backward Compatibility Strategy

## 1. Zero Impact on Legacy Meters & Spatial Baseline

- **Additive Schema**: Tables `assets`, `meter_asset_relations`, `asset_connections` are strictly additive.
- **Existing Meters**: All 12 canonical meters operate without modification. No meter requires an asset association.
- **Spatial Geometry Freeze**: The published map version `tan-thuan-v16a-r2-frozen` (`7176b67f-37b8-4a62-98c1-02943dd98e7d`) and its canonical SHA-256 hash `ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3` are strictly untouched.
- **5 Spatial Review Meters**: `CT-001`, `CT-007`, `CT-008`, `CT-009`, `CT-010` remain untouched.
- **Route Graph**: V15 routes are not modified.

---

## 2. Candidate Ingestion Policy

- Discovered candidate assets (`ASSET_CANDIDATE_REGISTRY.v0.json`) and proposals (`ASSET_MIGRATION_PROPOSALS.v1.json`, `METER_ASSET_RELATION_PROPOSALS.v1.json`) are stored as **documentation review artifacts only**.
- They are **NOT** automatically seeded into the runtime production database.
- Runtime database starts with **0 verified production assets**, awaiting human engineering sign-off.
