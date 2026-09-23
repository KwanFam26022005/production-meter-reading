# 11. Kiểm toán Mức độ Nhiễm Dữ liệu Mô phỏng (Simulation Contamination Audit)

## 1. Ma trận Nhiễm bẩn Toàn diện (Contamination Matrix)

Bảng phân tích rạch ròi tỷ lệ giữa dữ liệu Thật (`REAL`), Dữ liệu Mô phỏng (`SIMULATED`), và Dữ liệu Cũ (`LEGACY`):

| Loại Thực thể (`ENTITY TYPE`) | Thực tế (`REAL`) | Mô phỏng (`SIMULATED`) | Dữ liệu Cũ (`LEGACY`) | Chưa rõ (`UNKNOWN`) | Tổng số Bản ghi | Tỷ lệ Nhiễm Mô phỏng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Công tơ (`METERS`)** | **0 (0.0%)** | 12 (50.0%) | 12 (50.0%) | 0 | 24 | **100.0%** |
| **Thiết bị Hạ tầng (`ASSETS`)** | 20 (38.5%) | 32 (61.5%) | 0 | 0 | 52 | **61.5%** *(20 thực thể REAL là test fixtures)* |
| **Liên kết Công tơ ↔ Thiết bị** | **0 (0.0%)** | 24 (100.0%) | 0 | 0 | 24 | **100.0%** |
| **Kết nối Hạ tầng (`CONNECTIONS`)** | 10 (24.4%) | 31 (75.6%) | 0 | 0 | 41 | **75.6%** *(10 kết nối REAL là test fixtures)* |

---

## 2. Chi tiết Kịch bản Mô phỏng Hoạt động

Trong bảng `simulation_scenarios` có duy nhất 1 kịch bản đang ở trạng thái `ACTIVE`:
- **Scenario Code**: `tan-thuan-demo-v1`
- **Tên hiển thị**: `Tân Thuận Demo V1`
- **Loại kịch bản**: `SIMULATION`
- **Seed khởi tạo**: `16092026`
- **Metadata**: `{"description": "Mô phỏng hạ tầng mẫu Cảng Tân Thuận (32 Assets, 12 Meters)"}`
- **Thời gian khởi tạo**: `2026-09-16T02:59:17`

### Thống kê thực thể gắn trực tiếp với `tan-thuan-demo-v1`:
- **Số công tơ gắn kết**: 12 công tơ (`SIM-EM-001..008`, `SIM-WM-001..004`)
- **Số thiết bị hạ tầng gắn kết**: 32 thiết bị (`SIM-EXT-GRID`, `SIM-SS-01`, `SIM-CITY-WATER`, `SIM-MSB-01`, ...)
- **Số liên kết công tơ ↔ thiết bị**: 24 liên kết
- **Số kết nối mạng lưới hạ tầng**: 31 kết nối

---

## 3. Đánh giá Mức độ Chung sống Dữ liệu (Coexistence)

Kiểm toán xác nhận:
1. **Không có sự pha trộn giữa dữ liệu thực địa của cảng và dữ liệu mô phỏng**: Lý do đơn giản là **chưa có bất kỳ công tơ hay quan hệ mạng lưới thực tế nào của cảng được nhập vào hệ thống**.
2. Toàn bộ hạ tầng điện/nước đang hiển thị trên các màn hình demo hiện tại là một **quần thể mô phỏng khép kín** (`tan-thuan-demo-v1`).
3. 20 thiết bị và 10 kết nối mang cờ `REAL` là các fixture của hệ thống kiểm thử tự động, hoàn toàn đứng riêng rẽ thành các cặp không có tọa độ và không dính líu đến kịch bản demo.
