# 01. Tuyên bố Phạm vi & An toàn Kỹ thuật (Scope & Safety Declaration)

**Dự án:** Hệ thống Quản lý Chỉ số Đồng hồ & Hạ tầng Cảng Sài Gòn — Cảng Tân Thuận  
**Giai đoạn:** Phase 1 — Thiết kế Bố cục Mạng Lưới Hạ tầng Kỹ thuật Mô phỏng trên Bản đồ V2 (Map V2 Utility Demo Layout Design)  
**Ngày thực hiện:** 22/09/2026  
**Trạng thái:** Hoàn tất & Tuân thủ Tuyệt đối (Strict Read-Only & Presentation-Only)

---

## 1. Mục tiêu & Giới hạn Biên giới Phase 1

Mục tiêu duy nhất của Phase 1 là **thiết kế bố cục hình học (Display Geometry)** sạch, rõ ràng, thẩm mỹ, khoa học cho mạng lưới điện và nước mô phỏng Demo trên không gian tọa độ chuẩn $1536 \times 1024$ của **Bản đồ V2 (Map V2)**.

### Những việc ĐÃ hoàn thành trong Phase 1:
1. **Lọc tập dữ liệu Demo chuẩn:** Chỉ nhận diện đúng 8 đồng hồ điện (`SIM-EM-001` đến `SIM-EM-008`) và 4 đồng hồ nước (`SIM-WM-001` đến `SIM-WM-004`) từ tập kịch bản `tan-thuan-demo-v1`.
2. **Xác lập 3 phương án bố cục hình học:**
   - **Phương án A (Perimeter / Road Corridor):** Tuyến bám theo hành lang đường nội bộ và tường ranh cảng.
   - **Phương án B (Central Backbone — Khuyến nghị):** Tuyến trục xương sống trung tâm chạy dọc hành lang kỹ thuật giữa Bãi tổng hợp và Bãi container.
   - **Phương án C (Zone-Based Distribution):** Tuyến phân phối gom cụm theo từng phân khu chức năng độc lập.
3. **Đo đạc chỉ số hình học định lượng:** Tính toán tổng chiều dài tuyến, số điểm bẻ góc (bends), số điểm giao cắt, và kiểm tra 100% tránh va chạm chướng ngại vật (kho hàng, cổng cảng, hotspot).
4. **Tích hợp tầng hiển thị (Presentation Layer):** Xây dựng component SVG `MapV2UtilityLayer.tsx` tích hợp trực tiếp vào `MapV2Canvas.tsx` với công tắc chuyển chế độ `[Tắt lưới | Điện | Nước | Cả hai]` và chọn phương án `[PA A | PA B ★ | PA C]`.
5. **Minh bạch hóa mô phỏng:** Hiển thị huy hiệu và cảnh báo *"Mạng mô phỏng Demo"* trên thanh công cụ và tooltip định danh.

---

## 2. Cam kết An toàn Kỹ thuật — Tuyệt đối Không Thay đổi Dữ liệu (Strictly Non-Mutating)

Trong toàn bộ quá trình thiết kế và triển khai Phase 1, các cam kết an toàn sau đây được bảo đảm nghiêm ngặt 100%:

| Hành vi nghiêm cấm | Kết quả thực tế | Cơ chế bảo đảm |
| :--- | :--- | :--- |
| **Ghi đè / Sửa đổi CSDL SQLite** | **KHÔNG CÓ (0 bytes)** | Kết nối backend giữ nguyên, không chạy bất kỳ câu lệnh `INSERT / UPDATE / DELETE` nào. |
| **Ghi tọa độ ngược lại `meters.map_x / map_y`** | **KHÔNG CÓ** | Tọa độ bố cục Map V2 tồn tại hoàn toàn trong cấu hình frontend TypeScript (`utilityDemoLayout.ts`). Không chạm vào trường `map_x/map_y` của Map V1. |
| **Tạo bản ghi Asset / AssetConnection mới** | **KHÔNG CÓ** | Mô hình mạng sử dụng đúng 17 asset và 15 connection đã được phê duyệt trong kịch bản `tan-thuan-demo-v1`. |
| **Chạy Migrations / Seed DB** | **KHÔNG CÓ** | `migrate_db()` và các script seed bị nghiêm cấm tuyệt đối. |
| **Khởi động lại Windows Service** | **KHÔNG CÓ** | Dịch vụ `MeterReadingBackend` (PID 6988) vận hành liên tục không gián đoạn. |
| **Tạo Tab menu chính mới** | **KHÔNG CÓ** | Không tạo tab sidebar mới, tính năng tích hợp trực tiếp như một chế độ lớp (layer mode) trong Tab **Bản đồ V2**. |
| **Thực hiện hiệu ứng di chuyển / Animation (Trace / Retract)** | **KHÔNG CÓ** | Phase 1 chỉ thiết kế tĩnh (Static Display Geometry). Hiệu ứng động được phân định chặt chẽ cho Phase 2. |
| **Tuyên bố tuyến vật lý thực tế** | **KHÔNG CÓ** | Mọi nhãn, tooltip và tài liệu đều tuyên bố rõ ràng: *"Dữ liệu mô phỏng Demo (tan-thuan-demo-v1)"*. |

---

## 3. Nguyên tắc Tách biệt Cốt lõi (Decoupling Invariant)

Dự án áp dụng triệt để nguyên tắc kiến trúc:

$$\text{NETWORK TOPOLOGY (Database Authority)} \quad\neq\quad \text{DISPLAY GEOMETRY (Presentation Configuration)}$$

1. **Topology Logic ($A \to B \to C$):**
   - Bản quyền dữ liệu thuộc về SQLite và kịch bản `tan-thuan-demo-v1`.
   - Tuyệt đối không thay đổi quan hệ cha - con, không bẻ nối $A \to B$ thành $A \to D$ chỉ vì $D$ gần hơn về mặt thị giác.
2. **Hình học Hiển thị (Display Geometry):**
   - Bản quyền thuộc về tầng Presentation (`utilityDemoLayout.ts`).
   - Quyết định danh sách tọa độ các điểm uốn (waypoints) để vẽ đường SVG né kho hàng, đi theo tim đường kỹ thuật mà không làm biến dạng đồ thị logic.
