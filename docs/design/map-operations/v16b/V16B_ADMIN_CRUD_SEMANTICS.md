# V16B — ADMIN CRUD SEMANTICS SPECIFICATION

## 1. REST API Contracts

### A. Non-Destructive Retirement
- **Route**: `POST /api/v1/admin/meters/{meter_id}/retire`
- **Payload**:
  ```json
  {
    "reason": "Màn hình hỏng, thay thế bằng đồng hồ số mới"
  }
  ```
- **Behavior**:
  - Validates current state (`ACTIVE` or `INACTIVE` -> allowed; `RETIRED` -> 400).
  - Sets `lifecycle_status = 'RETIRED'`.
  - Sets `is_active = False` (backward compatibility).
  - Sets `retired_at = datetime.now(timezone.utc)`.
  - Sets `retired_by = admin_user.id`.
  - Sets `retirement_reason = payload.reason`.
  - Emits `AdminAuditLog` record with `action = 'METER_RETIRED'`.
  - Returns `AdminMeterItem`.

### B. Temporary Deactivation (Soft Pause)
- **Route**: `POST /api/v1/admin/meters/{meter_id}/deactivate`
- **Behavior**:
  - Validates current state (`ACTIVE` -> allowed; `INACTIVE` -> idempotent; `RETIRED` -> 400).
  - Sets `lifecycle_status = 'INACTIVE'`, `is_active = False`.
  - Emits `AdminAuditLog` record with `action = 'METER_DEACTIVATED'`.

### C. Reactivation
- **Route**: `POST /api/v1/admin/meters/{meter_id}/reactivate`
- **Behavior**:
  - Validates current state (`INACTIVE` -> allowed; `ACTIVE` -> idempotent; `RETIRED` -> 400).
  - Sets `lifecycle_status = 'ACTIVE'`, `is_active = True`.
  - Emits `AdminAuditLog` record with `action = 'METER_REACTIVATED'`.

### D. Hard Deletion (Pristine Records Only)
- **Route**: `DELETE /api/v1/admin/meters/{meter_id}`
- **Behavior**:
  - Checks reading count + training sample count.
  - If count > 0 -> rejects with **409 Conflict**.
  - If count == 0 -> deletes record and emits `METER_HARD_DELETED`.

---

## 2. Admin Meter Listing & Filtering
- **Route**: `GET /api/v1/admin/meters?status={ALL|ACTIVE|INACTIVE|RETIRED}`
- **Response Shape**:
  ```json
  {
    "total": 12,
    "active_count": 12,
    "inactive_count": 0,
    "retired_count": 0,
    "meters": [...]
  }
  ```

---

## 3. UI Interaction Workflow
1. **Active Meter Details**:
   - Status badge shows: **Đang sử dụng** (quiet green/success).
   - Actions: `Đặt lại vị trí`, `Chuyển phân khu`, `Tạm ngừng`, `Ngừng sử dụng`.
2. **Inactive Meter Details**:
   - Status badge shows: **Tạm ngừng** (quiet amber/warning).
   - Actions: `Chuyển phân khu`, `Kích hoạt lại`, `Ngừng sử dụng`.
3. **Retired Meter Details**:
   - Status badge shows: **Đã ngừng sử dụng** (neutral slate).
   - Shows metadata: `Thời điểm ngừng`, `Lý do ngừng`.
   - Actions: Spatial mutation controls hidden; display quiet informational banner:
     *"Công tơ đã ngừng sử dụng vĩnh viễn. Toàn bộ lịch sử chỉ số, cảnh báo và kiểm toán được bảo lưu an toàn."*
