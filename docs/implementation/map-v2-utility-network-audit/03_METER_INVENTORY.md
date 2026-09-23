# 03. Kiểm toán Danh mục Công tơ (Meter Inventory Audit)

## 1. Tổng quan Phân loại Công tơ theo Utility Type

| Tiêu chí Kiểm toán | ELECTRICITY | WATER | UNKNOWN | TỔNG CỘNG |
| :--- | :---: | :---: | :---: | :---: |
| **Tổng số lượng công tơ** | **9** | **4** | **11** | **24** |
| Đang hoạt động (`is_active=1` & `ACTIVE`) | 8 | 4 | 0 | 12 |
| Ngừng hoạt động / Đã nghỉ hưu (`RETIRED`) | 1 (`CT-003`) | 0 | 11 (`CT-001..012` trừ 003) | 12 |
| **Nguồn dữ liệu: THỰC TẾ (REAL)** | **0** | **0** | **0** | **0** |
| Nguồn dữ liệu: MÔ PHỎNG (SIMULATED) | 8 | 4 | 0 | 12 |
| Nguồn dữ liệu: MÔ PHỎNG CŨ (LEGACY_SIMULATION) | 1 | 0 | 11 | 12 |
| Có tọa độ bản đồ (`map_x`, `map_y` NOT NULL) | 9 | 4 | 11 | 24 (100%) |
| Chưa có tọa độ bản đồ | 0 | 0 | 0 | 0 |
| Đã gán Phân khu nghiệp vụ (`zone_id` NOT NULL) | 1 (`CT-003`) | 0 | 11 | 12 |
| Chưa gán Phân khu nghiệp vụ (`zone_id` IS NULL) | 8 (`SIM-EM-*`) | 4 (`SIM-WM-*`) | 0 | 12 |
| Trạng thái Lộ trình: `VALID` | 9 | 4 | 11 | 24 (100%) |
| Trạng thái Lộ trình: `REVIEW_REQUIRED` / `INVALID` | 0 | 0 | 0 | 0 |
| Có lịch sử đọc chỉ số (`has_readings=True`) | 9 | 4 | 11 | 24 (100%) |

> [!IMPORTANT]
> **PHÁT HIỆN CỐT LÕI**: Cơ sở dữ liệu hiện tại **CHƯA CÓ BẤT KỲ CÔNG TƠ THỰC TẾ NÀO (`data_origin = 'REAL'` là 0)**.
> Toàn bộ 24 công tơ đều là dữ liệu mô phỏng, chia làm 2 thế hệ:
> 1. **12 công tơ mô phỏng cũ (`CT-001` đến `CT-012`)**: Đều có `lifecycle_status = 'RETIRED'`, 11/12 có `utility_type = 'UNKNOWN'`, được gán phân khu nghiệp vụ cũ.
> 2. **12 công tơ mô phỏng mới (`SIM-EM-001..008`, `SIM-WM-001..004`)**: Thuộc kịch bản demo `tan-thuan-demo-v1`, đang `ACTIVE`, phân loại điện/nước rõ ràng, nhưng `zone_id` là `NULL` (chỉ có `presentation_zone_id`).

---

## 2. Bảng Danh mục Chi tiết Toàn bộ 24 Công tơ

*Lưu ý bảo mật & tuân thủ: Báo cáo chỉ hiển thị số lượt đọc và mốc thời gian đọc mới nhất; không hiển thị giá trị sản lượng/chỉ số điện nước.*

| Mã công tơ | Tên công tơ | Loại phụ tải | Nguồn dữ liệu | Trạng thái | Tọa độ (X, Y) | Zone ID | Pres Zone ID | Số lượt đọc | Lần đọc cuối |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `CT-001` | Công tơ Trạm A | UNKNOWN | LEGACY_SIM | RETIRED | (0.5995, 0.8356) | zone-technical | pres-technical | 582 | 2026-09-09 03:00 |
| `CT-002` | Công tơ Kho B | UNKNOWN | LEGACY_SIM | RETIRED | (0.2648, 0.5664) | zone-warehouse | pres-container-west | 582 | 2026-09-09 03:00 |
| `CT-003` | Công tơ Cầu cảng 1 | ELECTRICITY | LEGACY_SIM | RETIRED | (0.1760, 0.3849) | zone-berth | pres-berth | 582 | 2026-09-09 03:00 |
| `CT-004` | Công tơ Cầu cảng 2 | UNKNOWN | LEGACY_SIM | RETIRED | (0.3624, 0.3837) | zone-berth | pres-berth | 582 | 2026-09-09 03:00 |
| `CT-005` | Công tơ Kho C | UNKNOWN | LEGACY_SIM | RETIRED | (0.3337, 0.5786) | zone-warehouse | pres-container-west | 582 | 2026-09-09 03:00 |
| `CT-006` | Công tơ Kho D | UNKNOWN | LEGACY_SIM | RETIRED | (0.8773, 0.4629) | zone-warehouse | pres-cfs-east | 582 | 2026-09-09 03:00 |
| `CT-007` | Công tơ Trạm B | UNKNOWN | LEGACY_SIM | RETIRED | (0.5577, 0.8770) | zone-technical | pres-technical | 582 | 2026-09-09 03:00 |
| `CT-008` | Công tơ Cầu cảng 3 | UNKNOWN | LEGACY_SIM | RETIRED | (0.7311, 0.3021) | zone-berth | pres-berth | 582 | 2026-09-09 03:00 |
| `CT-009` | Công tơ Khu kỹ thuật 1 | UNKNOWN | LEGACY_SIM | RETIRED | (0.6418, 0.8295) | zone-technical | pres-technical | 582 | 2026-09-09 03:00 |
| `CT-010` | Công tơ Khu kỹ thuật 2 | UNKNOWN | LEGACY_SIM | RETIRED | (0.8564, 0.6821) | zone-technical | pres-gate | 582 | 2026-09-09 03:00 |
| `CT-011` | Công tơ Bãi Container 1 | UNKNOWN | LEGACY_SIM | RETIRED | (0.6115, 0.5323) | zone-container | pres-container-center | 582 | 2026-09-09 03:00 |
| `CT-012` | Công tơ Bãi Container 2 | UNKNOWN | LEGACY_SIM | RETIRED | (0.7321, 0.5164) | zone-container | pres-container-center | 582 | 2026-09-09 03:00 |
| `SIM-EM-001` | Công tơ tổng MDB-01 | ELECTRICITY | SIMULATED | ACTIVE | (0.7258, 0.6760) | NULL | pres-technical | 1 | 2026-09-16 03:00 |
| `SIM-EM-002` | Công tơ xuất tuyến Cầu cảng | ELECTRICITY | SIMULATED | ACTIVE | (0.4674, 0.3654) | NULL | pres-berth | 1 | 2026-09-16 03:00 |
| `SIM-EM-003` | Công tơ xuất tuyến Bãi Tây | ELECTRICITY | SIMULATED | ACTIVE | (0.3943, 0.5542) | NULL | pres-container-west | 1 | 2026-09-16 03:00 |
| `SIM-EM-004` | Công tơ xuất tuyến Bãi Trung tâm | ELECTRICITY | SIMULATED | ACTIVE | (0.5979, 0.5786) | NULL | pres-container-center | 1 | 2026-09-16 03:00 |
| `SIM-EM-005` | Công tơ xuất tuyến Kho CFS | ELECTRICITY | SIMULATED | ACTIVE | (0.8695, 0.4446) | NULL | pres-cfs-east | 1 | 2026-09-16 03:00 |
| `SIM-EM-006` | Công tơ phụ tải Xưởng Cơ điện | ELECTRICITY | SIMULATED | ACTIVE | (0.6997, 0.7004) | NULL | pres-technical | 1 | 2026-09-16 03:00 |
| `SIM-EM-007` | Công tơ nhánh Cẩu RTG-W01 | ELECTRICITY | SIMULATED | ACTIVE | (0.2454, 0.5786) | NULL | pres-container-west | 1 | 2026-09-16 03:00 |
| `SIM-EM-008` | Công tơ Giàn lạnh Container | ELECTRICITY | SIMULATED | ACTIVE | (0.7285, 0.4811) | NULL | pres-container-center | 1 | 2026-09-16 03:00 |
| `SIM-WM-001` | ĐH nước tổng Cổng Cảng | WATER | SIMULATED | ACTIVE | (0.7363, 0.6882) | NULL | pres-technical | 1 | 2026-09-16 03:00 |
| `SIM-WM-002` | ĐH nước cấp Cầu tàu | WATER | SIMULATED | ACTIVE | (0.5901, 0.4263) | NULL | pres-berth | 1 | 2026-09-16 03:00 |
| `SIM-WM-003` | ĐH nước sinh hoạt Kho CFS | WATER | SIMULATED | ACTIVE | (0.8668, 0.4080) | NULL | pres-cfs-east | 1 | 2026-09-16 03:00 |
| `SIM-WM-004` | ĐH mạng cấp nước Cứu hỏa | WATER | SIMULATED | ACTIVE | (0.7389, 0.6395) | NULL | pres-technical | 1 | 2026-09-16 03:00 |

*File dữ liệu xuất máy: `docs/implementation/map-v2-utility-network-audit/data/meter_inventory.csv` và `.json`.*
