# V16C Utility Topology Foundation

## 1. Graph Model (`asset_connections`)

The `asset_connections` entity provides a topology-ready graph model for port infrastructure:
- `source_asset_id` (FK `assets.id` ON DELETE RESTRICT)
- `target_asset_id` (FK `assets.id` ON DELETE RESTRICT)
- `utility_type`: `ELECTRICITY` | `WATER` | `OTHER`
- `connection_type`: `SUPPLIES` (directional source -> target) | `CONNECTED_TO` (bidirectional)
- `verification_status`: `UNVERIFIED` | `VERIFIED` | `REJECTED`
- `valid_from`, `valid_to`: Temporal validity

---

## 2. Graph Traversal & Cycle Safety

The pure-domain topology service (`backend/app/topology_service.py`) provides:
- `get_downstream`: Follows `SUPPLIES` connections outbound.
- `get_upstream`: Follows `SUPPLIES` connections inbound.
- `get_connected`: Bidirectional traversal across all connections.

### Cycle Protection:
- All graph traversals use a `visited_assets` set and `visited_connections` set. Loops in physical or logical networks do not cause infinite recursion.

### Operational Policy:
- Default queries strictly return **VERIFIED** connections only (`include_unverified = False`). Unverified candidate edges are never presented as operational truth.
