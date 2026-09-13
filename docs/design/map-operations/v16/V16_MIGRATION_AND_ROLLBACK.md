# V16 Database Migration, Seed Baseline, and Rollback Procedures

## 1. Baseline Seeding & Migration

To transition seamlessly from static configuration files to the persistent relational database without downtime or visual regressions:

1. **Deterministic Seeding Script**: `init_map_config_from_v10()` in `backend/app/map_config.py` seeds the canonical V10 baseline on startup if no active `MapVersion` exists.
2. **Exact Geometry Preservation**:
   - `canonical_width = 1915`
   - `canonical_height = 821`
   - `coordinate_system = 'tan-thuan-canonical-image-pixel-space-v1'`
   - 6 presentation zones: `pres-berth`, `pres-container-west`, `pres-container-center`, `pres-cfs-east`, `pres-technical`, `pres-gate`
   - 12 canonical physical meters mapped into relational rows.
3. **Zero-Downtime Guarantee**: The initialization routine runs idempotently; if an active published version already exists, the database is untouched.

---

## 2. Legacy Browser LocalStorage Migration

Users who configured custom drafts in older frontend builds had data stored in `localStorage` under `tan-thuan-map-calibration-draft:v10`.

1. **Migration Interceptor**: Upon opening the Calibration Workspace, `useMapCalibrationWorkspace.ts` inspects `localStorage`.
2. **Interactive Prompt**: If a legacy local draft is found and differs from the server, a banner prompts the administrator:
   > "Phát hiện bản nháp cũ trên trình duyệt này. Bạn có muốn đồng bộ lên máy chủ không?"
3. **Server Sync & Clean**: Clicking "Đồng bộ lên máy chủ" saves the draft to the backend database and cleans up `localStorage`, unifying persistence across all administrative devices.

---

## 3. Rollback Runbook & Procedures

If an erroneous geometry configuration is published in production, administrators can execute an immediate, zero-downtime rollback:

```bash
# Example API Call for emergency rollback via curl / backend script:
curl -X POST "http://localhost:8000/api/map-config/versions/1/rollback" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### UI Rollback Procedure:
1. Navigate to **Hiệu chỉnh bản đồ** (Map Calibration).
2. Open the **Lịch sử phiên bản** (Version History) drawer.
3. Locate the desired previous stable version (e.g. Version 1 - Canonical Baseline).
4. Click **Khôi phục phiên bản này** (Restore this version).
5. Confirm the action in the safety dialog.
6. The system clones the historical version into a new published configuration, updates the route statuses, writes an audit event, and immediately broadcasts the restored configuration to all clients.
