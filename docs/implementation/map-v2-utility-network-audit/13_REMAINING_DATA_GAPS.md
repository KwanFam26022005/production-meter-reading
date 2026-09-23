# 13. Khoảng trống Dữ liệu và Yêu cầu Thu thập (Remaining Data Gaps)

## 1. Bảng Tổng hợp 7 Khoảng trống Dữ liệu Trọng yếu

| STT | Lĩnh vực Khoảng trống | Thực trạng trong Database | Tác động Kỹ thuật đối với Map V2 | Mức độ Nghiêm trọng |
| :---: | :--- | :--- | :--- | :---: |
| **GAP-01** | **Danh mục Công tơ Thực địa** | 0 công tơ thực tế trong DB; 100% là mô phỏng | Không có đối tượng thực tế để hiển thị giám sát sản lượng cảng | **CHẶN HOÀN TOÀN** (CRITICAL) |
| **GAP-02** | **Hệ Tọa độ Map V2** | Tọa độ hiện tại là tỷ lệ `[0, 1]` trên ảnh Map V1 1915×821 | Lệch hình học 55% nếu đưa sang ảnh Map V2 1536×1024 | **CHẶN VỊ TRÍ** (HIGH) |
| **GAP-03** | **Sơ đồ Cung cấp Điện (SLD)** | Chưa có bản vẽ nguyên lý 110kV/22kV/0.4kV | Không thể xác định trạm nào cấp nguồn cho tủ/công tơ nào | **CHẶN MẠNG LƯỚI** (HIGH) |
| **GAP-04** | **Sơ đồ Cấp nước (P&ID)** | Chưa có bản vẽ mạng cấp nước từ Sawaco/giếng khoan | Không thể vẽ hướng dòng chảy và van kiểm soát | **CHẶN MẠNG LƯỚI** (HIGH) |
| **GAP-05** | **Nút Nguồn Cung cấp** | Không có nguồn điện/nước thực tế nào có hồ sơ bảo chứng | Không có gốc (Root) để dựng cây phân cấp năng lượng | **CHẶN MẠNG LƯỚI** (HIGH) |
| **GAP-06** | **Hồ sơ Xác minh Hiện trường** | Bảng `verification_evidences` chỉ có 1 bản ghi mồ côi | Không thể chứng minh độ tin cậy của sơ đồ với ban giám đốc | **TRUNG BÌNH** (MEDIUM) |
| **GAP-07** | **Gán Phân khu Nghiệp vụ** | Các công tơ active đều có `zone_id` là `NULL` | Không thể lọc công tơ theo phân khu nghiệp vụ trên UI | **TRUNG BÌNH** (MEDIUM) |

---

## 2. Bản Yêu cầu Cung cấp Dữ liệu từ Ban Kỹ thuật Cảng Sài Gòn (Data Request Form)

Để có thể thiết kế và hiển thị mạng lưới điện/nước chính xác trên Map V2, nhóm kỹ thuật cần Cảng Sài Gòn cung cấp các tài liệu sau:

```text
================================================================================
PHIẾU ĐỀ NGHỊ CUNG CẤP DỮ LIỆU HẠ TẦNG KỸ THUẬT - CẢNG TÂN THUẬN
Dự án: Số hóa Bản đồ Năng lượng Map V2 (Digital Twin)
================================================================================

1. HỒ SƠ DANH MỤC CÔNG TƠ & ĐỒNG HỒ NƯỚC:
   - Danh sách Excel toàn bộ công tơ điện (mã công tơ, số chế tạo, vị trí đặt, cấp điện áp, dòng định mức, trạm biến áp cấp nguồn).
   - Danh sách toàn bộ đồng hồ đo lưu lượng nước (mã đồng hồ, cỡ van DN, vị trí hố van, nguồn cấp từ Sawaco hay giếng ngầm).

2. TÀI LIỆU SƠ ĐỒ NGUYÊN LÝ & BẢN VẼ HOÀN CÔNG (AS-BUILT):
   - Bản vẽ Sơ đồ Đơn tuyến Điện (Single Line Diagram - SLD) từ Trạm tiếp nhận 110kV/22kV qua các Trạm biến áp SS1, SS2... đến các Tủ MSB, Tủ phân phối bãi container và cầu cảng.
   - Bản vẽ Mặt bằng Hoàn công Tuyến cáp ngầm trung thế/hạ thế toàn cảng.
   - Bản vẽ Mặt bằng Mạng lưới Cấp thoát nước & PCCC (Đường kính ống, vị trí van chặn, họng cứu hỏa, đài nước).

3. ĐỐI SOÁT VỊ TRÍ TRÊN BẢN ĐỒ MAP V2:
   - Cử cán bộ phụ trách điện/nước phối hợp với nhóm kỹ thuật chấm điểm tọa độ thực tế (X, Y) của các trạm biến áp, tủ điện chính, van nước và công tơ trên nền ảnh Map V2 (1536 × 1024).
================================================================================
```
