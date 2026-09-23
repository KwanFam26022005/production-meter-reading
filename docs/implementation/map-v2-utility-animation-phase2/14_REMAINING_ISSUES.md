# Các Vấn đề Còn lại và Khuyến nghị Phát triển Tiếp theo — Giai đoạn 2 (Remaining Issues & Recommendations)

> **Phân hệ**: Định hướng Nâng cấp & Hoàn thiện Hệ thống Mạng Lưới Hạ tầng Kỹ thuật  
> **Trạng thái**: Phase 2 hoàn tất 100% mục tiêu tương tác hoạt họa  
> **Tài liệu tham chiếu**: `docs/audits/UTILITY_NETWORK_DATA_AUDIT_REPORT.md`

---

## 1. Các Giới hạn Hiện tại của Tầng Trình diễn (Current Presentation Constraints)

1. **Bản chất Dữ liệu Mô phỏng (Demo-Only Provenance)**:
   - Toàn bộ 17 nút và 15 tuyến cáp/ống trong Layout B2 đều mang cờ `demoOnly: true`.
   - Các nút này được xây dựng dựa trên dữ liệu mô phỏng của bộ kịch bản kiểm thử Tân Thuận (`tan-thuan-demo-v1`), chưa phản ánh hoàn toàn 100% tuyến đi ngầm thực địa dưới lòng đất cảng (vốn đang thiếu bản vẽ CAD ngầm chuẩn xác như đã chỉ ra trong báo cáo Audit).
2. **Cấu trúc Cây Đồ thị Đơn nhất (Tree Topology Assumption)**:
   - Giải thuật lập lịch và truy vết nguồn hiện tại giả định mạng lưới là **Cây Định hướng không chu trình (Acyclic Directed Tree)** với một nút gốc duy nhất.
   - Trong trường hợp hạ tầng thực tế triển khai mạch vòng dự phòng (Ring Bus Topology hoặc Dual-Feed Switching), giải thuật truy vết cần được nâng cấp với thuật toán Cây khung Tối thiểu (Minimum Spanning Tree - MST) hoặc trạng thái đóng/ngắt máy cắt (Breaker Switch State).
3. **Quy đổi Khoảng cách Điểm ảnh sang Mét thực tế (Pixel to Meter Scale)**:
   - Chiều dài tính toán hiện tại dựa trên đơn vị pixel trong không gian tọa độ chuẩn $1536 \times 1024$.
   - Khi có dữ liệu trắc địa GIS chính thức, hệ số tỷ lệ ($1\text{ px} \approx k\text{ mét}$) cần được tích hợp vào công thức hiển thị độ dài cáp/ống cho cán bộ kỹ thuật.

---

## 2. Khuyến nghị Kế hoạch Triển khai Giai đoạn Tiếp theo (Future Roadmap)

### Giai đoạn 3: Tích hợp Đo xa Thời gian thực (Live Telemetry & Digital Twin Overlay)
- **Tích hợp WebSocket / SSE**: Kết nối các nút đồng hồ (`SIM-EM-001` đến `008`, `SIM-WM-001` đến `004`) với luồng dữ liệu đo xa thực tế từ backend `MeterReadingBackend`.
- **Chỉ báo Tải dòng và Áp lực Nước (Dynamic Load & Flow Indication)**:
  - Khi một nhánh tiêu thụ điện vượt định mức, tuyến cáp chuyển dần từ màu hổ phách sang đỏ cảnh báo.
  - Khi trạm bơm PCCC `SIM-FP-01` kích hoạt, áp lực đường ống nước được thể hiện bằng nhịp xung quang học (pulsing wave).

### Giai đoạn 4: Đối chiếu Đồng bộ Thực địa (Field Survey & Database Reconciliation)
- Sử dụng công cụ số hóa trên Map V2 để hỗ trợ đội khảo sát kỹ thuật ngầm cập nhật tọa độ GPS thực tế của các hố ga, tủ điện phân phối và van chặn.
- Thiết lập quy trình di chuyển an toàn có phê duyệt (Safe Migration Flow) để ghi tọa độ chính thức vào các trường `meters.map_x` và `meters.map_y` của cơ sở dữ liệu SQLite sau khi được Giám đốc Cảng phê duyệt.
