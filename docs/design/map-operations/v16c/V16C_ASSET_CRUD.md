# V16C Asset Administration & CRUD API

## 1. REST API Endpoints

All asset operations require `ADMIN` role authentication. Mutation endpoints enforce CSRF tokens.

### Assets:
- `GET /api/v1/admin/assets`: List assets with filtering (`asset_type`, `zone_id`, `lifecycle_status`, `verification_status`, `mobility_type`, `search`, pagination).
- `POST /api/v1/admin/assets`: Create asset with validation and audit log `ASSET_CREATED`.
- `GET /api/v1/admin/assets/{id}`: Detailed asset inspection.
- `PATCH /api/v1/admin/assets/{id}`: Update asset metadata and audit log `ASSET_UPDATED`.
- `POST /api/v1/admin/assets/{id}/relocate`: Set coordinates with audit log `ASSET_RELOCATED`.
- `POST /api/v1/admin/assets/{id}/set-parent`: Change parent with cycle detection and audit log `ASSET_PARENT_CHANGED`.
- `POST /api/v1/admin/assets/{id}/deactivate`: Set lifecycle to `INACTIVE`.
- `POST /api/v1/admin/assets/{id}/reactivate`: Set lifecycle to `ACTIVE`.
- `POST /api/v1/admin/assets/{id}/retire`: Non-destructive retirement with reason and audit log `ASSET_RETIRED`.

### Meter-Asset Relations:
- `GET /api/v1/admin/meter-asset-relations`: List relations.
- `POST /api/v1/admin/meter-asset-relations`: Create relation with primary uniqueness enforcement.
- `POST /api/v1/admin/meter-asset-relations/{id}/close`: Close active relation (`valid_to = now()`).
- `POST /api/v1/admin/meter-asset-relations/{id}/transfer`: Atomic transfer to new asset.
- `POST /api/v1/admin/meter-asset-relations/{id}/verify`: Verify relation status.

### Asset Connections & Topology:
- `GET /api/v1/admin/asset-connections`: List network connections.
- `POST /api/v1/admin/asset-connections`: Create connection.
- `POST /api/v1/admin/asset-connections/{id}/close`: Close connection.
- `POST /api/v1/admin/asset-connections/{id}/verify`: Verify connection.
- `GET /api/v1/admin/asset-topology/trace`: Cycle-safe downstream/upstream graph tracing.
