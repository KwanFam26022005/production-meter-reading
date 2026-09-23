# 06. Kiểm toán Danh mục Thiết bị Hạ tầng (Asset Inventory Audit)

## 1. Thống kê Chủng loại Thiết bị (Asset Types)

Toàn bộ cơ sở dữ liệu có **52 thiết bị hạ tầng (Assets)**. Dưới đây là bảng thống kê chủng loại lưu trữ gốc (`asset_type`) và phân loại suy luận (`inferred_asset_class`):

| Chủng loại Lưu trữ (`asset_type`) | Số lượng | Phân loại Suy luận Kỹ thuật (`inferred_asset_class`) | Ghi chú Suy luận |
| :--- | :---: | :--- | :--- |
| `SUBSTATION` | 9 | `TRANSFORMER` (7) / `POSSIBLE_ELECTRICAL_SOURCE` (2) | Trạm biến áp 22kV / Trạm cắt / Nguồn cấp |
| `WATER_POINT` | 10 | `OTHER` (8) / `POSSIBLE_WATER_SOURCE` (2) | Trụ cấp nước tàu, họng cứu hỏa, đài nước cảng |
| `FEEDER` | 7 | `POSSIBLE_ELECTRICAL_DISTRIBUTION` (2) / `TRANSFORMER` (3) / `OTHER` (2) | Tuyến cáp ngầm, đường dây 110kV EVN |
| `SWITCHBOARD` | 6 | `CABINET` (6) | Tủ điện phân phối MDB, MSB, tủ nhánh |
| `QUAY_CRANE` | 5 | `OTHER` (5) | Cẩu bờ bốc xếp container QC-01..05 |
| `RTG` | 4 | `OTHER` (4) | Cẩu khung bãi container RTG-01..04 |
| `PUMP` | 3 | `PUMP` (3) | Trạm bơm nước sinh hoạt, bơm cứu hỏa |
| `OTHER` | 2 | `VALVE` (1) / `OTHER` (1) | Van cấp nước tổng, thiết bị phụ trợ |
| `TRANSFORMER` | 1 | `TRANSFORMER` (1) | Máy biến áp tự dùng |
| `SHORE_POWER_POINT` | 1 | `CABINET` (1) | Trụ cấp điện cầu tàu cho tàu biển |
| `COMPRESSOR` | 1 | `OTHER` (1) | Máy nén khí xưởng cơ điện |
| `REEFER_RACK` | 1 | `CABINET` (1) | Giàn cấp điện container lạnh |
| `WAREHOUSE` | 1 | `FACILITY` (1) | Kho bãi tổng hợp |
| `WORKSHOP` | 1 | `CABINET` (1) | Xưởng sửa chữa cơ điện |
| **TỔNG CỘNG** | **52** | | |

---

## 2. Nguồn gốc Dữ liệu và Tình trạng Xác minh

| Phân nhóm Dữ liệu | Số lượng | Có Tọa độ (`map_x, map_y`) | Tọa độ NULL | Trạng thái Xác minh | Đánh giá Tính xác thực |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`SIMULATED`** (Kịch bản `tan-thuan-demo-v1`) | **32** | 32 (100%) | 0 | `SIMULATION_APPROVED` | **Dữ liệu giả lập demo phục vụ Map V1 cũ** |
| **`REAL`** (Dữ liệu gắn nhãn thực tế) | **20** | **0 (0%)** | **20 (100%)** | 16 `VERIFIED`, 4 `UNVERIFIED` | **Dữ liệu sinh từ kịch bản test ghép cặp (xem mục 3)** |
| **TỔNG CỘNG** | **52** | **32** | **20** | | |

---

## 3. Phát hiện Quan trọng về 20 Thiết bị Gắn nhãn `REAL`

Qua kiểm tra chi tiết 20 thiết bị mang cờ `data_origin = 'REAL'`, kiểm toán viên phát hiện:
1. **Các thiết bị này xuất hiện theo từng cặp giống hệt nhau** với hậu tố mã hex ngẫu nhiên 6 ký tự:
   - `ASSET-CTX-51cf15` và `ASSET-CTX-c8a84b` (cùng tên: *Trạm Trắc Địa Tân Thuận*)
   - `ASSET-NET-V-9b16e3` và `ASSET-NET-V-fcfa16` (cùng tên: *Trạm Biến Áp Đã Xác Minh*)
   - `ASSET-NET-V2-984135` và `ASSET-NET-V2-e3c4fe` (cùng tên: *Tủ Phân Phối Đã Xác Minh*)
   - `ASSET-UP-9950b9` và `ASSET-UP-dafa41` (cùng tên: *Đường Dây 110kV EVN*)
   - `E-SRC-65226a` và `E-SRC-77471e` (cùng tên: *Trạm Cắt 22kV*)
   - `W-SRC-193426` và `W-SRC-fc54e5` (cùng tên: *Đài Nước Cảng*)
   - `W-DST-0a9d7c` và `W-DST-11da79` (cùng tên: *Trụ Nước Tàu Cầu Cảng*)
   - `E-DST-521ccc` và `E-DST-d543fb` (cùng tên: *Cẩu Bờ QC-01*)
   - `ASSET-NET-UV-6253fb` và `ASSET-NET-UV-daec7d` (cùng tên: *Trạm Biến Áp Chưa Xác Minh*)
   - `ASSET-NO-XY-136475` và `ASSET-NO-XY-c7270a` (cùng tên: *Máy Bơm Cứu Hỏa Dự Phòng*)
2. **Toàn bộ 20 thiết bị này đều có `map_x = NULL` và `map_y = NULL`**.
3. **Nguồn gốc thực tế**: Đây là các bản ghi kiểm thử (test fixtures) do các bộ test tự động sinh ra trong quá trình phát triển tính năng RBAC / Network Topology, không phải dữ liệu khảo sát hiện trường cảng.

*File dữ liệu xuất máy: `docs/implementation/map-v2-utility-network-audit/data/asset_inventory.csv` và `.json`.*
