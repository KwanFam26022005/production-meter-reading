# MA TRẬN CHUYỂN ĐỔI LUỒNG TÁC NGHIỆP (WORKFLOW MIGRATION MATRIX)

**Tài liệu**: `docs/product/four-workspaces/05_WORKFLOW_MIGRATION_MATRIX.md`  
**Dự án**: Cảng Tân Thuận Operations Dashboard — Four-Workspace Consolidation  
**Phiên bản**: 1.0  

---

## 1. Bảng Chuyển Đổi Luồng Tác Nghiệp (Trước vs Sau)

| Mã Luồng | Quy trình tác nghiệp | Trạng thái Trước V16E | Trạng thái Sau V16E (4 Workspaces) | Bảo toàn nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| **WF-01** | **Xem vị trí công tơ & hạ tầng** | Mở tab "Bản đồ" (`dashboard`), zoom/pan hoặc click marker. | Nằm tại Tab **Bản đồ**. Bổ sung tra cứu được cả thiết bị chưa gắn tọa độ (`SIM-EXT-GRID`, `SIM-CITY-WATER`). | **100% Bảo toàn & Nâng cấp** |
| **WF-02** | **Xem sơ đồ mạng điện / nước** | Bấm nút "Mạng lưới" trên header `OperationalWorkspaceHeader`. | Nằm tại Tab **Bản đồ**: Người dùng chuyển đổi chế độ xem "Mạng lưới" (Network Overlay) ngay trong Bản đồ. Không tạo tab độc lập. | **100% Bảo toàn** |
| **WF-03** | **Tra cứu danh mục Thiết bị & Công tơ** | Bấm tab "Thiết bị" (`assets`) trên rail điều hướng chính, chuyển qua lại giữa 2 sub-tab "Hạ tầng" và "Công tơ". | Nằm tại Tab **Bản đồ**: Tra cứu thông qua thanh Command Bar hoặc danh sách trượt từ bên phải. Thao tác mở ra `EntityDetailSurface` duy nhất. | **100% Bảo toàn, gọn gàng hóa IA** |
| **WF-04** | **Hiệu chỉnh vị trí Thiết bị/Công tơ** | Bấm "Di chuyển" trong bảng AdminAssets hoặc AdminMeters. | Nằm tại Tab **Bản đồ**: Trong hồ sơ đối tượng (`EntityDetailSurface`), bấm action "Hiệu chỉnh vị trí" -> kích hoạt chế độ thả marker trên bản đồ vệ tinh. | **100% Bảo toàn** |
| **WF-05** | **Xem lịch trình và lập kế hoạch đọc** | Mở menu phụ [⋯] -> "Lịch ghi" (`schedules`). | Nằm trực tiếp tại Tab **Lịch ghi** (Top-level Tab 2). Hiển thị lịch ngày, tiến độ từng ca, nút "Tạo lịch đọc". | **100% Bảo toàn, nâng lên cấp 1** |
| **WF-06** | **Xem danh sách công tơ theo ca (Sổ ca ghi)** | Bấm nút "Sổ ca ghi" trên header Bản đồ (`viewMode='list'`). | Nằm tại Tab **Lịch ghi**: Khi bấm vào một ca/lượt đọc cụ thể, hệ thống mở Sổ ca ghi của lượt đó với danh sách 12 công tơ. | **100% Bảo toàn, đúng ngữ cảnh ca** |
| **WF-07** | **Thực hiện đọc chỉ số công tơ** | Từ Sổ ca ghi bấm "Ghi chỉ số" -> Camera -> OCR -> Xác nhận. | Nằm tại Tab **Lịch ghi**: Từ danh sách công tơ của ca, bấm "Ghi chỉ số" -> Camera AI -> Xác nhận/Đính chính. | **100% Bảo toàn** |
| **WF-08** | **Kiểm tra/Đối soát bản ghi nghi ngờ** | Mở menu phụ [⋯] -> "Thẩm định hồ sơ" -> chọn tab "Chỉ số ca trực", hoặc mở Inspection modal. | Nằm tại Tab **Lịch ghi** (hoặc Báo cáo): Bấm vào badge "Cần kiểm tra" của ca đọc để mở ngay modal đối soát ảnh gốc và ROI crop. | **100% Bảo toàn** |
| **WF-09** | **Xem vị trí công tơ từ Lịch ghi** | Chưa có luồng liền mạch giữa Sổ ca và Bản đồ. | Bấm nút "Xem trên bản đồ" tại dòng công tơ trong Lịch ghi -> Tự động chuyển sang Tab **Bản đồ**, focus vào marker công tơ đó, lưu ngữ cảnh để quay lại Lịch ghi. | **Nghiệp vụ Mới Hoàn Thiện** |
| **WF-10** | **Điều hành & Phân ca nhân sự** | Mở menu phụ [⋯] -> "Phân ca" (`staff_roster`). | Nằm trực tiếp tại Tab **Phân ca** (Top-level Tab 3). Đầy đủ ma trận phân ca, gán ca, áp dụng chu kỳ tự động, cảnh báo xung đột. | **100% Bảo toàn, nâng lên cấp 1** |
| **WF-11** | **Quản lý đơn xin nghỉ phép** | Mở tab con "Nghỉ phép" bên trong Phân ca. | Giữ nguyên bên trong Tab **Phân ca** (Sub-tab Nghỉ phép). Phê duyệt/từ chối đơn phép của nhân viên. | **100% Bảo toàn** |
| **WF-12** | **Xem báo cáo sản lượng & KPI** | Mở menu phụ [⋯] -> "Báo cáo" (`reports`). | Nằm trực tiếp tại Tab **Báo cáo** (Top-level Tab 4). Báo cáo tổng quan điện/nước, chất lượng nhận diện, chi tiết theo công tơ. | **100% Bảo toàn, nâng lên cấp 1** |
| **WF-13** | **Xem nhật ký kiểm toán hệ thống** | Mở menu phụ [⋯] -> "Nhật ký" (`audit`). | Nằm bên trong Tab **Báo cáo** (Sub-tab "Nhật ký kiểm toán"): Giữ nguyên bộ lọc hành động, loại tài nguyên và diff JSON. | **100% Bảo toàn** |
| **WF-14** | **Thẩm định hồ sơ liên kết hạ tầng** | Mở menu phụ [⋯] -> "Thẩm định hồ sơ" (`verification`). | Hai điểm truy cập trực quan: (1) Thực hiện trực tiếp trên thẻ quan hệ của từng đối tượng trong **Bản đồ**; (2) Xem báo cáo tổng hợp hồ sơ trong **Báo cáo**. | **100% Bảo toàn, loại bỏ tab rời rạc** |

---

## 2. Chi Tiết Luồng Chuyển Tiếp Trọng Yếu

### 2.1. Luồng: Lịch ghi → Xem trên bản đồ → Quay lại Lịch ghi
1. **Bước 1**: Người quản trị đang ở Tab `Lịch ghi`, xem ca `08:00 - 2026-09-20`.
2. **Bước 2**: Tại danh sách công tơ, bấm nút icon `MapPin` "Xem trên bản đồ" của công tơ `CT-001`.
3. **Bước 3**: 
   * `OperationalWorkspaceContext` lưu trữ `selectedDate = '2026-09-20'` và `selectedRoundId = 'round-0800'`.
   * Chuyển tab sang `dashboard` (Bản đồ).
   * Bản đồ tự động pan/zoom tới vị trí tọa độ `(map_x, map_y)` của `CT-001`, mở `EntityDetailSurface` của `CT-001`.
4. **Bước 4**: Trên thẻ chi tiết hoặc thanh điều hướng có nút quay lại "Quay lại Lịch ghi" -> Tab `Lịch ghi` được kích hoạt lại với đúng ngày và ca đã chọn trước đó, không bị reload hay reset về đầu ngày.

### 2.2. Luồng: Tra cứu thiết bị không có tọa độ trên Bản đồ
1. **Bước 1**: Tại Tab `Bản đồ`, người dùng gõ `SIM-EXT-GRID` vào thanh tìm kiếm Command Bar.
2. **Bước 2**: Danh sách kết quả hiển thị `Lưới điện Quốc gia (110kV EVN)` kèm badge xám "Nguồn ngoài / Chưa định vị".
3. **Bước 3**: Người dùng bấm chọn kết quả.
4. **Bước 4**: `EntityDetailSurface` mở ra hiển thị đầy đủ thông số kỹ thuật, các xuất tuyến điện hạ thế kết nối đến `SIM-SS-01` (Trạm biến áp trung tâm).
5. **Bước 5**: Nút "Xem trên bản đồ" được vô hiệu hóa kèm tooltip giải thích; nút "Hiệu chỉnh vị trí" sẵn sàng cho Admin gán tọa độ nếu cảng quyết định số hóa điểm đấu nối cột điện.
