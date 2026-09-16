# V16D — Asset Review & Verification Workflow

## 1. Scope & Objective
This document outlines the standard operating procedure (SOP) for Port Administrators, Chief Electrical Engineers, and Maintenance Supervisors reviewing and verifying candidate assets.

---

## 2. Roles & Permissions
- **Viewer / Operator**: Can view asset candidates and verification statuses in the admin workspace; cannot sign off or modify evidence.
- **Port Admin / Senior Engineer (`ADMIN`)**: Authorized to:
  - Ingest candidate proposals (`POST /api/v1/admin/assets/import-candidates`).
  - Verify or reject assets with mandatory evidence input.
  - Verify or reject meter-asset relationships.
  - Verify asset spatial positions.
  - Update meter technical metadata.

---

## 3. Review Workspace Operations

The web portal provides a dedicated workspace under **Admin Portal → Đối soát (Verification)**:

### 3.1 Overview KPIs
- **Đề xuất (Candidates)**: Total candidates ingested from discovery proposals.
- **Đã xác minh (Verified)**: Total assets validated with concrete evidence.
- **Chờ đối soát (Unverified)**: Active review backlog.
- **Bị từ chối (Rejected)**: Proposed entities identified as inaccurate or non-existent.
- **Phân khu kiểm tra (Spatial Review)**: 5 meters requiring physical boundary reconciliation.

### 3.2 Candidate Ingestion Step
1. Click **"Nạp dữ liệu Đề xuất"**.
2. The server idempotently parses `ASSET_MIGRATION_PROPOSALS.v1.json` and `METER_ASSET_RELATION_PROPOSALS.v1.json`.
3. Candidate records are created with:
   - `verification_status = 'UNVERIFIED'`
   - `source = 'DISCOVERY_PROPOSAL'`
   - `map_x = NULL, map_y = NULL`
   - `position_verification_status = 'UNVERIFIED'`
4. Subsequent calls return 0 created entities without creating duplicate records.

---

## 4. Asset Verification Procedure

1. Navigate to the **"Chờ xác minh"** tab.
2. Filter or search by asset name, code, or type.
3. Click **"Đối soát & Xác minh"** on an asset card to open the Verification Modal.
4. Fill in the required evidence fields:
   - **Loại bằng chứng thực tế**: Select from dropdown (e.g. `FIELD_INSPECTION`, `PORT_DOCUMENT`, `EQUIPMENT_NAMEPLATE`).
   - **Số hiệu / Định danh tài liệu**: Enter the document number, drawing reference, or inspection docket (e.g. `BB-KT-2026-03-A`).
   - **Ghi chú kỹ thuật** *(optional)*: Additional notes on capacity, serial number, or wiring.
5. Click **"Xác minh Thiết Bị"**:
   - The asset transitions to `verification_status = 'VERIFIED'`.
   - A row is appended to `verification_evidences` with timestamp, user ID, and document reference.
   - An entry is recorded in `admin_audit_logs`.

---

## 5. Rejection & Reopening Procedure

### 5.1 Rejection
1. If a proposed asset does not exist in reality or corresponds to obsolete equipment, open the modal and specify:
   - **Lý do từ chối**: (e.g. "Không tồn tại trên mặt bằng thực địa", "Đã thanh lý năm 2024").
2. Click **"Từ chối thiết bị"**.
3. Status transitions to `REJECTED`.

### 5.2 Reopening
1. Navigate to the **"Bị từ chối"** tab.
2. Click **"Mở lại rà soát"** on any rejected asset if new historical documentation is discovered.
3. The asset transitions back to `UNVERIFIED` and re-enters the active queue.

---

## 6. Spatial Position Placement Workflow

1. Click **"Đặt vị trí"** (or **"Đổi tọa độ"**) on the asset card.
2. Enter normalized coordinates `[0.0000, 1.0000]` for `map_x` and `map_y`.
3. Provide evidence reference (e.g. "Bản đồ tọa độ GPS thực địa").
4. If coordinates lie outside all 6 presentation zones, the system displays an informative warning banner:
   > *"Cảnh báo: Tọa độ (x, y) nằm ngoài tất cả 6 presentation zones."*
5. The warning **does not block saving** (maritime decoupled spatial model). The coordinate is saved, and `position_verification_status` transitions to `VERIFIED`.
