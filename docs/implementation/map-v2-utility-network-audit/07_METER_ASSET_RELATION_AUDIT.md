# 07. Kiểm toán Liên kết Công tơ ↔ Thiết bị (Meter-Asset Relations Audit)

## 1. Thống kê Quan hệ Liên kết

Trong bảng `meter_asset_relations` ghi nhận tổng cộng **24 bản ghi liên kết**.

| Chỉ số Kiểm toán | Giá trị đo đạc | Đánh giá Nghiệp vụ |
| :--- | :---: | :--- |
| **Tổng số liên kết (`rows`)** | **24** | Tất cả đều có `valid_to IS NULL` (đang có hiệu lực) |
| Liên kết kiểu `INSTALLED_AT` (Lắp đặt tại) | 12 | 12 công tơ mô phỏng gắn vào 12 tủ/vị trí thiết bị |
| Liên kết kiểu `MEASURES` (Đo lường phụ tải cho) | 12 | 12 công tơ mô phỏng đo đếm cho thiết bị tiêu thụ |
| Số công tơ có CẢ HAI quan hệ (`INSTALLED_AT` & `MEASURES`) | 12 | 100% 12 công tơ mô phỏng `SIM-EM-*` và `SIM-WM-*` |
| Số công tơ KHÔNG CÓ bất kỳ liên kết nào | 12 | 100% 12 công tơ mô phỏng cũ `CT-001..012` |
| **Số công tơ có liên kết thực tế (`REAL`)** | **0** | **Không có liên kết thực tế nào trong cơ sở dữ liệu** |
| Trạng thái xác minh: `SIMULATION_APPROVED` | 24 (100%) | Thuộc kịch bản `tan-thuan-demo-v1` |
| Trạng thái xác minh: `VERIFIED` / `UNVERIFIED` | 0 | Không có |
| Khóa ngoại mồ côi (Dangling Foreign Keys) | 0 | 100% `meter_id` và `asset_id` đều trỏ tới bản ghi hợp lệ |
| Xung đột loại hạ tầng (Điện gắn vào Nước hoặc ngược lại) | 0 | 100% công tơ điện gắn vào thiết bị điện, nước vào nước |

---

## 2. Phát hiện về Khóa Chính Đơn (`is_primary`)

Trong thiết kế nghiệp vụ, mỗi công tơ thường chỉ có tối đa 1 liên kết chính (`is_primary = True`) cho mỗi loại quan hệ.
- Trong cơ sở dữ liệu hiện tại, **cả 24 bản ghi đều có `is_primary = 1`**.
- Do mỗi công tơ mô phỏng sở hữu đồng thời 1 bản ghi `INSTALLED_AT` (`is_primary = 1`) và 1 bản ghi `MEASURES` (`is_primary = 1`), điều này hoàn toàn hợp lệ nếu xét theo từng cặp `(meter_id, relation_type)`.

---

## 3. Danh sách Chi tiết 24 Cặp Liên kết Công tơ ↔ Thiết bị

| Mã công tơ | Loại phụ tải | Mã thiết bị gắn kết | Tên thiết bị gắn kết | Chủng loại thiết bị | Loại quan hệ | Trạng thái | Nguồn gốc |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| `SIM-EM-001` | ELECTRICITY | `SIM-MSB-01` | Tủ phân phối tổng MSB-01 | SWITCHBOARD | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-001` | ELECTRICITY | `SIM-SS-01` | Trạm biến áp Trung tâm SS-01 | SUBSTATION | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-002` | ELECTRICITY | `SIM-DB-BERTH` | Tủ điện phân phối Cầu cảng | SWITCHBOARD | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-002` | ELECTRICITY | `SIM-FEEDER-01` | Tuyến cáp ngầm Cầu cảng | FEEDER | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-003` | ELECTRICITY | `SIM-DB-YARD-W` | Tủ điện phân phối Bãi Tây | SWITCHBOARD | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-003` | ELECTRICITY | `SIM-FEEDER-02` | Tuyến cáp ngầm Bãi Container Tây | FEEDER | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-004` | ELECTRICITY | `SIM-DB-YARD-C` | Tủ điện phân phối Bãi Trung tâm | SWITCHBOARD | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-004` | ELECTRICITY | `SIM-FEEDER-03` | Tuyến cáp ngầm Bãi Trung tâm | FEEDER | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-005` | ELECTRICITY | `SIM-DB-CFS` | Tủ điện phân phối Kho CFS | SWITCHBOARD | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-005` | ELECTRICITY | `SIM-FEEDER-04` | Tuyến cáp ngầm Kho CFS | FEEDER | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-006` | ELECTRICITY | `SIM-WS-01` | Xưởng sửa chữa Cơ điện | WORKSHOP | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-006` | ELECTRICITY | `SIM-COMP-01` | Trạm máy nén khí | COMPRESSOR | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-007` | ELECTRICITY | `SIM-QC-01` | Cẩu bờ QC-01 | QUAY_CRANE | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-007` | ELECTRICITY | `SIM-RTG-01` | Cẩu bãi RTG-01 | RTG | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-008` | ELECTRICITY | `SIM-REEFER-01` | Giàn cấp điện Container lạnh | REEFER_RACK | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-EM-008` | ELECTRICITY | `SIM-REEFER-01` | Giàn cấp điện Container lạnh | REEFER_RACK | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-001` | WATER | `SIM-V-MAIN` | Van cấp nước tổng Cổng Cảng | OTHER | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-001` | WATER | `SIM-CITY-WATER` | Đường ống Cấp nước TP (Sawaco) | WATER_POINT | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-002` | WATER | `SIM-WP-BERTH-01` | Trụ cấp nước Tàu biển Berths 1-2 | WATER_POINT | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-002` | WATER | `SIM-WP-BERTH-01` | Trụ cấp nước Tàu biển Berths 1-2 | WATER_POINT | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-003` | WATER | `SIM-WH-CFS` | Kho tổng hợp & CFS | WAREHOUSE | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-003` | WATER | `SIM-WH-CFS` | Kho tổng hợp & CFS | WAREHOUSE | MEASURES | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-004` | WATER | `SIM-PUMP-FIRE` | Trạm bơm Phòng cháy chữa cháy | PUMP | INSTALLED_AT | SIMULATION_APPROVED | SIMULATED |
| `SIM-WM-004` | WATER | `SIM-PUMP-FIRE` | Trạm bơm Phòng cháy chữa cháy | PUMP | MEASURES | SIMULATION_APPROVED | SIMULATED |

*File dữ liệu xuất máy: `docs/implementation/map-v2-utility-network-audit/data/meter_asset_relations.csv`.*
