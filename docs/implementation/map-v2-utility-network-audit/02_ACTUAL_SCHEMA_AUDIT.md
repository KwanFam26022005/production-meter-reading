# 02. Kiểm toán Schema Cơ sở Dữ liệu Thực tế (Actual Schema Audit)

## 1. Tổng quan Trạng thái Các Bảng Trọng yếu

Kiểm toán trực tiếp từ `sqlite_master` và `PRAGMA table_info` trên cơ sở dữ liệu runtime xác nhận: **Toàn bộ 10/10 bảng nghiệp vụ yêu cầu đều tồn tại thực tế**, với cấu trúc cột và quan hệ khóa ngoại hoàn chỉnh.

| Bảng nghiệp vụ | Trạng thái thực tế | Số lượng bản ghi | Khóa chính | Số lượng Cột | Khóa ngoại (FK) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `meters` | **TỒN TẠI** | 24 | `id` | 22 | `zone_id`, `retired_by` |
| `operational_zones` | **TỒN TẠI** | 4 | `id` | 8 | Không có |
| `assets` | **TỒN TẠI** | 52 | `id` | 21 | `parent_asset_id`, `zone_id`, `created_by`, `updated_by` |
| `meter_asset_relations` | **TỒN TẠI** | 24 | `id` | 16 | `meter_id`, `asset_id`, `created_by` |
| `asset_connections` | **TỒN TẠI** | 41 | `id` | 15 | `source_asset_id`, `target_asset_id`, `created_by` |
| `verification_evidences` | **TỒN TẠI** | 1 | `id` | 9 | `verified_by` |
| `simulation_scenarios` | **TỒN TẠI** | 1 | `id` | 8 | Không có |
| `map_versions` | **TỒN TẠI** | 95 | `id` | 16 | `parent_version_id`, `created_by_user_id`, `published_by_user_id` |
| `map_version_zones` | **TỒN TẠI** | 563 | `id` | 14 | `map_version_id` |
| `meter_readings` | **TỒN TẠI** | 6873 | `id` | 17 | `meter_id`, `batch_id`, `reading_round_id`, `user_id` |

*Ghi chú: Toàn bộ cơ sở dữ liệu có tổng cộng 21 bảng (bao gồm `users`, `sessions`, `attendance_events`, `work_schedules`, `leave_requests`, `reading_batches`, `reading_rounds`, `admin_audit_logs`, `meter_training_samples`, `meter_reading_evidence`, `zone_assignments`).*

---

## 2. So sánh với Khai báo SQLAlchemy Models (`models.py`)

So sánh chi tiết giữa schema vật lý và `backend/app/models.py` cho thấy:
1. **Không có Schema Drift cấu trúc**: Các bảng `meters`, `assets`, `meter_asset_relations`, `asset_connections`, `verification_evidences` đều có đầy đủ tất cả các trường đã được khai báo trong model SQLAlchemy (bao gồm các trường mở rộng như `reading_method`, `communication_protocol`, `data_origin`, `scenario_id`, `mobility_type`, `position_source`, `position_verification_status`).
2. **Cột bổ sung kiểm toán**: Bảng `meters` và `assets` đều có cặp tọa độ số thực `map_x`, `map_y` (kiểu `FLOAT`).
3. **Cơ chế Migration Idempotent**: Hàm `migrate_db()` trong `backend/app/db.py` chỉ bổ sung cột `is_legacy` cho `reading_rounds` và cột `client_submission_id`, `payload_sha256` cho `attendance_events`. Trong database runtime, các cột này đã tồn tại đầy đủ.

---

## 3. Chi tiết Cấu trúc các Bảng Trọng yếu

### A. Bảng `meters` (22 cột)
- Cột: `id`, `meter_code`, `name`, `location`, `meter_type`, `zone_id`, `presentation_zone_id`, `map_x`, `map_y`, `route_status`, `is_active`, `lifecycle_status`, `reading_method`, `communication_protocol`, `utility_type`, `data_origin`, `scenario_id`, `retired_at`, `retired_by`, `retirement_reason`, `created_at`, `updated_at`.
- Chỉ mục (Indexes): `ix_meters_meter_code` (UNIQUE), `ix_meters_is_active`, `ix_meters_lifecycle_status`, `ix_meters_zone_id`, `ix_meters_presentation_zone_id`, `ix_meters_data_origin`, `ix_meters_scenario_id`, `ix_meters_route_status`.

### B. Bảng `assets` (21 cột)
- Cột: `id`, `code`, `name`, `asset_type`, `parent_asset_id`, `zone_id`, `mobility_type`, `position_source`, `map_x`, `map_y`, `lifecycle_status`, `verification_status`, `position_verification_status`, `data_origin`, `scenario_id`, `source`, `metadata_json`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- Chỉ mục (Indexes): `ix_assets_code` (UNIQUE), `ix_assets_asset_type`, `ix_assets_parent_asset_id`, `ix_assets_zone_id`, `ix_assets_lifecycle_status`, `ix_assets_verification_status`, `ix_assets_position_verification_status`, `ix_assets_data_origin`, `ix_assets_scenario_id`, `ix_assets_source`.

### C. Bảng `meter_asset_relations` (16 cột)
- Cột: `id`, `meter_id`, `asset_id`, `relation_type`, `mount_point`, `is_primary`, `verification_status`, `confidence`, `data_origin`, `scenario_id`, `source`, `notes`, `valid_from`, `valid_to`, `created_at`, `created_by`.
- Chỉ mục (Indexes): `ix_meter_asset_relations_meter_id`, `ix_meter_asset_relations_asset_id`, `ix_meter_asset_relations_relation_type`, `ix_meter_asset_relations_verification_status`, `ix_meter_asset_relations_data_origin`, `ix_meter_asset_relations_scenario_id`, `ix_meter_asset_rel_active` (`meter_id`, `relation_type`, `valid_to`).

### D. Bảng `asset_connections` (15 cột)
- Cột: `id`, `source_asset_id`, `target_asset_id`, `utility_type`, `connection_type`, `verification_status`, `confidence`, `data_origin`, `scenario_id`, `source`, `valid_from`, `valid_to`, `metadata_json`, `created_at`, `created_by`.
- Chỉ mục (Indexes): `ix_asset_connections_source_asset_id`, `ix_asset_connections_target_asset_id`, `ix_asset_connections_utility_type`, `ix_asset_connections_verification_status`, `ix_asset_connections_data_origin`, `ix_asset_connections_scenario_id`, `ix_asset_conn_src_tgt` (`source_asset_id`, `target_asset_id`, `utility_type`).
