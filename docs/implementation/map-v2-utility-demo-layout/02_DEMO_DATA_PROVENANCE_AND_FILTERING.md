# 02. Nguồn gốc Dữ liệu Mô phỏng & Tiêu chí Lọc (Demo Data Provenance & Filtering)

**Tài liệu tham chiếu:** `docs/implementation/map-v2-utility-network-audit/`  
**Kịch bản dữ liệu thẩm định:** `tan-thuan-demo-v1` (Approved Simulation Scenario)

---

## 1. Nguồn gốc Dữ liệu (Provenance)

Dữ liệu mạng lưới được sử dụng để xây dựng lớp hiển thị bắt nguồn 100% từ kết quả kiểm toán SQLite thực tế tại các bảng:
- `meters`: Lưu trữ danh sách đồng hồ.
- `assets`: Lưu trữ các thực thể hạ tầng kỹ thuật (trạm biến áp, tủ điện, van nước, trụ nước).
- `meter_asset_relations`: Bản đồ liên kết giữa đồng hồ và thiết bị hạ tầng.
- `asset_connections`: Cây phân phối hình học logic từ nguồn đến phụ tải.

---

## 2. Danh sách 8 Đồng hồ Điện Demo Đang Hoạt động (Active Electricity Meters)

Tất cả 8 đồng hồ điện thuộc kịch bản `tan-thuan-demo-v1` đều ở trạng thái `is_active = 1`, `lifecycle_status = ACTIVE`, và liên kết với các thiết bị hạ tầng đã kiểm toán:

| Mã Đồng hồ | Tên Đồng hồ | Thiết bị Hạ tầng Đăng cai | Loại Thiết bị | Phân khu Logic |
| :--- | :--- | :--- | :--- | :--- |
| **SIM-EM-001** | Đồng hồ tủ phân phối tổng MDB-01 | `SIM-MDB-01` | Tủ phân phối hạ thế chính (MDB) | `ZONE_GENERAL` |
| **SIM-EM-002** | Đồng hồ xuất tuyến Cầu cảng Berth 1-3 | `SIM-FDR-BERTH` | Tủ cấp nguồn tàu biển & cẩu chân đế | `ZONE_QUAY` |
| **SIM-EM-003** | Đồng hồ xuất tuyến Bãi tổng hợp | `SIM-FDR-WEST` | Tủ phân phối bãi phía Tây | `ZONE_GENERAL` |
| **SIM-EM-004** | Đồng hồ xuất tuyến Bãi Container | `SIM-FDR-CENTER` | Tủ phân phối bãi container trung tâm | `ZONE_CONTAINER` |
| **SIM-EM-005** | Đồng hồ phụ tải Kho CFS & Đóng gói | `SIM-FDR-CFS` | Tủ điện kho đóng rút hàng CFS | `ZONE_CONTAINER` |
| **SIM-EM-006** | Đồng hồ phân xưởng Cơ điện & Kỹ thuật | `SIM-FDR-TECH` | Tủ điện xưởng bảo dưỡng cơ giới | `ZONE_GENERAL` |
| **SIM-EM-007** | Đồng hồ nhánh Cẩu RTG Bãi Tây | `SIM-YDB-W01` | Tủ nhánh bãi RTG phía Tây | `ZONE_GENERAL` |
| **SIM-EM-008** | Đồng hồ nhánh Giàn lạnh Container Reefe | `SIM-YDB-C01` | Tủ phân phối giàn lạnh bãi container | `ZONE_CONTAINER` |

---

## 3. Danh sách 4 Đồng hồ Nước Demo Đang Hoạt động (Active Water Meters)

| Mã Đồng hồ | Tên Đồng hồ | Thiết bị Hạ tầng Đăng cai | Loại Thiết bị | Phân khu Logic |
| :--- | :--- | :--- | :--- | :--- |
| **SIM-WM-001** | Đồng hồ nước tổng Cổng Cảng (Sawaco) | `SIM-WIN-01` | Điểm đấu nối tiếp nhận nước sạch | `ZONE_GENERAL` |
| **SIM-WM-002** | Đồng hồ cấp nước ngọt tàu biển Berth 1-2 | `SIM-WP-B01` | Trụ cấp nước ngọt cầu tàu | `ZONE_QUAY` |
| **SIM-WM-003** | Đồng hồ nước sinh hoạt Kho CFS | `SIM-WP-CFS-01` | Điểm cấp nước vệ sinh & văn phòng CFS | `ZONE_CONTAINER` |
| **SIM-WM-004** | Đồng hồ mạng cấp nước Cứu hỏa Cảng | `SIM-FP-01` | Trạm bơm tăng áp & PCCC bãi cảng | `ZONE_GENERAL` |

---

## 4. Các Nút Nguồn & Nút Phân phối Trung gian (Sources & Intermediate Nodes)

### Mạng Lưới Điện (Electricity Graph):
1. `SIM-EXT-GRID` (Nút nguồn 110kV EVN, Cấp bậc 0)
2. `SIM-SS-01` (Trạm biến áp trung tâm 22/0.4kV SS-01, Cấp bậc 1)
3. `SIM-TR-01` (Máy biến áp tự dùng TR-01, Cấp bậc 2)

### Mạng Cấp Nước (Water Graph):
1. `SIM-CITY-WATER` (Nút nguồn cấp nước sạch Sawaco, Cấp bậc 0)
2. `SIM-WJ-01` (Cụm van chia nước phân nhánh WJ-01, Cấp bậc 2)

---

## 5. Tiêu chuẩn Lọc Nghiêm ngặt (Filtering & Exclusion Rules)

Để tránh gây nhiễu và bảo đảm tính chính xác của bản đồ kỹ thuật:
1. **Loại bỏ 12 đồng hồ cũ đã nghỉ hưu (`CT-001` đến `CT-012`):**
   - Các đồng hồ này có `lifecycle_status = RETIRED` và thuộc không gian tọa độ chuẩn hóa cũ của Map V1.
   - 100% bị loại trừ khỏi tầng hiển thị Map V2.
2. **Loại bỏ các bản ghi kiểm thử (QA Fixtures):**
   - Các bản ghi có mã chứa `TEST`, `MTR-DEV`, `QA-FIXTURE` hoặc `utility_type = UNKNOWN` (11 bản ghi chưa phân loại) đều bị loại bỏ.
3. **Cờ đánh dấu Demo (`demoOnly: true`):**
   - Tất cả 17 node hiển thị và 15 cạnh hiển thị đều mang thuộc tính `demoOnly: true` để tránh nhầm lẫn với hạ tầng thực tế.
