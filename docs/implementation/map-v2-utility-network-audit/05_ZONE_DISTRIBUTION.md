# 05. Kiểm toán Phân bố Công tơ theo Phân khu Vận hành (Zone Distribution Matrix)

## 1. Ma trận Phân bố Công tơ theo Phân khu

Bảng dưới đây thể hiện sự phân bổ của 24 công tơ trên các phân khu vận hành được lưu trữ trong cơ sở dữ liệu:

| Mã Phân khu | Tên Phân khu Nghiệp vụ | Điện (`ELECTRICITY`) | Nước (`WATER`) | Khác / Chưa rõ (`UNKNOWN`) | Dữ liệu Thực tế | Dữ liệu Mô phỏng | Có Tọa độ | Chưa có Tọa độ | TỔNG CÔNG TƠ |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ZONE-BERTH` | Khu vực Cầu cảng (Berths 1 - 3) | 1 | 0 | 2 | 0 | 3 | 3 | 0 | **3** |
| `ZONE-CONTAINER` | Khu vực Bãi Container (CY) | 0 | 0 | 2 | 0 | 2 | 2 | 0 | **2** |
| `ZONE-WAREHOUSE` | Khu vực Kho hàng Tổng hợp (B, C, D) | 0 | 0 | 3 | 0 | 3 | 3 | 0 | **3** |
| `ZONE-TECHNICAL` | Khu Kỹ thuật & Trạm Phụ trợ Điện | 0 | 0 | 4 | 0 | 4 | 4 | 0 | **4** |
| `UNASSIGNED_OR_NULL` | *Chưa gán phân khu nghiệp vụ (`zone_id IS NULL`)* | 8 | 4 | 0 | 0 | 12 | 12 | 0 | **12** |
| **TỔNG CỘNG** | | **9** | **4** | **11** | **0** | **24** | **24** | **0** | **24** |

---

## 2. Bất cập Quan hệ giữa Phân khu Nghiệp vụ và Hiển thị (Zone Disconnect)

Kiểm toán dữ liệu phát hiện sự ngắt quãng logic giữa 2 thế hệ dữ liệu:
1. **12 Công tơ Mô phỏng cũ (`CT-001..012`)**:
   - Được gắn chặt chẽ với các `zone_id` nghiệp vụ (`zone-berth`, `zone-container`, `zone-warehouse`, `zone-technical`).
   - Nhưng toàn bộ đều mang trạng thái `RETIRED` và không có quan hệ liên kết thiết bị (`meter_asset_relations = 0`).
2. **12 Công tơ Mô phỏng hiện hành (`SIM-EM-*`, `SIM-WM-*`)**:
   - Trường `zone_id` nghiệp vụ bị bỏ trống (`NULL`).
   - Tuy nhiên, trường `presentation_zone_id` lại được điền các mã hiển thị tạm thời:
     - `pres-berth`: `SIM-EM-002`, `SIM-WM-002`
     - `pres-container-west`: `SIM-EM-003`, `SIM-EM-007`
     - `pres-container-center`: `SIM-EM-004`, `SIM-EM-008`
     - `pres-cfs-east`: `SIM-EM-005`, `SIM-WM-003`
     - `pres-technical`: `SIM-EM-001`, `SIM-EM-006`, `SIM-WM-001`, `SIM-WM-004`
3. **Ý nghĩa đối với Map V2**: Khi đưa hạ tầng lên Map V2, hệ thống phải chuẩn hóa việc map giữa phân khu nghiệp vụ (`operational_zones.id`) và các polygon của Map V2 (`tan_thuan_1_zones_edited.json`), thay vì dựa vào trường chuỗi tự do `presentation_zone_id`.
