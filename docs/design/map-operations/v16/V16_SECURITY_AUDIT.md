# V16 Security, Authorization, and Audit Logging

## 1. Role-Based Access Control (RBAC)

Spatial administration is strictly partitioned from general operator and field staff access:

| Action | Allowed Roles | Backend Enforcement | Frontend Enforcement |
| :--- | :--- | :--- | :--- |
| **View Published Map** | All authenticated users (`ADMIN`, `MANAGER`, `OPERATOR`, `FIELD_OPERATOR`) | `GET /api/map-config/active` allows any valid token | Default Map Operations view |
| **View Calibration Workspace** | `ADMIN`, `ROLE_ADMIN`, `MANAGER`, `ROLE_MANAGER` | `can_administer_map` dependency check | Calibration button rendered only for authorized roles |
| **Create / Update Drafts** | `ADMIN`, `ROLE_ADMIN`, `MANAGER`, `ROLE_MANAGER` | HTTP 403 Forbidden on non-admin | Calibration edit controls locked |
| **Publish / Rollback Map** | `ADMIN`, `ROLE_ADMIN` | HTTP 403 Forbidden unless `user.role == 'ADMIN'` | Publish modal requires Admin confirmation |
| **Relocate / Deactivate Meters** | `ADMIN`, `ROLE_ADMIN`, `MANAGER`, `ROLE_MANAGER` | Validated in `/api/admin/meters/*` | Relocation crosshairs and "Ngừng sử dụng" actions |
| **Hard Delete Meter** | `ADMIN`, `ROLE_ADMIN` | HTTP 403 for non-admins; HTTP 409 if readings exist | Guarded with destructive confirmation dialog |

---

## 2. Audit Trail System

All spatial mutations write immutable entries to the `audit_logs` table.

### 2.1 Audit Event Schema
Each audit record captures:
- `actor_id`: User ID of the administrator performing the action.
- `action`: Standardized uppercase event identifier (e.g. `MAP_DRAFT_CREATED`, `MAP_PUBLISHED`, `MAP_ROLLED_BACK`, `METER_RELOCATED`, `METER_DEACTIVATED`).
- `entity_type`: Target domain object (`MapVersion`, `MapVersionZone`, `Meter`).
- `entity_id`: Identifier of the affected record.
- `details`: JSON payload containing diffs (e.g. `{"old_coordinates": {"x": 980, "y": 260}, "new_coordinates": {"x": 995, "y": 275}}`).
- `timestamp`: UTC timestamp of the mutation.

### 2.2 Standard Audit Events
- `MAP_DRAFT_CREATED`: Triggered when an admin creates a new working draft.
- `ZONE_GEOMETRY_UPDATED`: Triggered upon saving zone polygon vertices or anchors.
- `MAP_PUBLISHED`: Triggered upon atomic draft promotion.
- `MAP_ROLLED_BACK`: Triggered upon rolling back to a historical version.
- `METER_RELOCATED`: Triggered when meter coordinates are updated.
- `METER_DEACTIVATED`: Triggered when an active meter is set to soft-deleted ("Ngừng sử dụng").
- `METER_REACTIVATED`: Triggered when a soft-deleted meter is reactivated.
