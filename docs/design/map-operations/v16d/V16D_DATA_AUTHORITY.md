# V16D — Data Authority & Boundary Invariants

## 1. Immutable Boundaries
The following components are strictly authoritative and must NEVER be mutated by candidate ingestion or verification workflows:

1. **Spatial Baseline**:
   - `docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json`
   - Canonical image dimensions: `1915 x 821`
   - Checksum invariant SHA-256: `ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3`
2. **Canonical Meters**:
   - Exactly 12 meters (`CT-001` .. `CT-012`).
   - Spatial coordinates `(map_x, map_y)` and `presentation_zone_id` are frozen.
3. **Spatial Review Meters**:
   - The 5 meters (`CT-001`, `CT-007`, `CT-008`, `CT-009`, `CT-010`) remain flagged as `SPATIAL_REVIEW_REQUIRED` until a physical survey campaign is officially signed off.
   - Candidate ingestion and asset verification must NOT clear or alter their coordinates.

---

## 2. Candidate Boundary
- `ASSET_MIGRATION_PROPOSALS.v1.json` and `METER_ASSET_RELATION_PROPOSALS.v1.json` are strictly candidate proposals.
- They are imported with `source = 'DISCOVERY_PROPOSAL'` and `verification_status = 'UNVERIFIED'`.
- They have NO spatial coordinates upon ingestion.

---

## 3. Operational Integrity
Production meter reading rounds, camera OCR, manual logging, and mobile applications operate against meters and zones. If asset tables contain zero verified records, production operations continue with 100% normal functionality.
