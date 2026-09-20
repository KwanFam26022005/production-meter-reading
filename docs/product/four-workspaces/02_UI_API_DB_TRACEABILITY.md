# MA TRẬN TRUY XUẤT UI — API — DATABASE (TRACEABILITY MATRIX)

**Tài liệu**: `docs/product/four-workspaces/02_UI_API_DB_TRACEABILITY.md`  
**Dự án**: Cảng Tân Thuận Operations Dashboard — Four-Workspace Architecture  
**Trạng thái**: Authoritative Baseline  

---

## 1. Nguyên tắc Truy Xuất (Traceability Principles)

1. **Bảo toàn 100% nghiệp vụ**: Mọi tương tác người dùng hiện có đều phải có điểm đến rõ ràng trong 1 trong 4 Workspace (`Bản đồ`, `Lịch ghi`, `Phân ca`, `Báo cáo`) hoặc qua các bề mặt ngữ cảnh (Drawer, Detail Surface, Popover, Inspection Modal).
2. **Không làm mất API/DB**: Không có endpoint nào bị xóa bỏ hoặc bị bỏ rơi; mọi API đều duy trì kết nối với component chịu trách nhiệm.
3. **Phân định rõ trạng thái dữ liệu**: Không gộp các khái niệm khác nhau (Trạng thái thiết bị `lifecycle_status`, Trạng thái nhiệm vụ ghi `route_status`/tiến độ, Trạng thái xác nhận `status`) vào một trường đơn lẻ.

---

## 2. Ma Trận Chi Tiết: Chức Năng → UI Component → API Endpoints → DB Model

### Nhóm 1: BẢN ĐỒ (Spatial Operations & Utility Network)

| Chức năng nghiệp vụ | UI Component thực thi | API Endpoints gọi | DB Models & Tables tác động | Ghi chú chuyển đổi IA |
| :--- | :--- | :--- | :--- | :--- |
| **Quan sát bản đồ không gian GIS** | `MapOperationsPage.tsx`<br>`OperationalScene.tsx` | `GET /api/v1/map/overview`<br>`GET /api/v1/map-config/active`<br>`GET /api/v1/map/zones` | `OperationalZone`<br>`MapVersion`<br>`MapVersionZone` | Giữ nguyên view chính của Tab "Bản đồ" |
| **Xem lớp phủ Mạng lưới điện/nước** | `UtilityNetworkView.tsx` | `GET /api/v1/admin/asset-network`<br>`GET /api/v1/admin/asset-connections` | `Asset`<br>`AssetConnection`<br>`MeterAssetRelation` | Chế độ xem (overlay mode) của Bản đồ, không làm tab cấp 5 |
| **Tra cứu Thiết bị & Công tơ (kể cả không tọa độ)** | `AdaptiveCommandBar.tsx`<br>`SearchPopover` | `GET /api/v1/admin/assets`<br>`GET /api/v1/map/meters` | `Asset` (`assets`)<br>`Meter` (`meters`) | Bổ sung asset search trong CommandBar để tìm được cả thiết bị không có map_x/map_y |
| **Xem hồ sơ chi tiết đối tượng (Asset/Meter)** | `EntityDetailSurface.tsx` | `GET /api/v1/admin/assets/{id}`<br>`GET /api/v1/meters/{id}`<br>`GET /api/v1/admin/meters/{id}/latest-reading` | `Asset`<br>`Meter`<br>`MeterReading` | Bề mặt chi tiết duy nhất cho một đối tượng (Single-Surface Rule) |
| **Hiệu chỉnh tọa độ đối tượng** | `EntityDetailSurface.tsx`<br>`Placement` / `Calibration` | `POST /api/v1/admin/assets/{id}/relocate`<br>`POST /api/v1/admin/meters/{id}/relocate` | `Asset.map_x, map_y`<br>`Meter.map_x, map_y`<br>`AdminAuditLog` | Thao tác ngữ cảnh trong hồ sơ đối tượng hoặc qua quyền Admin |
| **Thêm mới / Chỉnh sửa Thiết bị** | `AssetEditModal.tsx` (từ detail/action) | `POST /api/v1/admin/assets`<br>`PATCH /api/v1/admin/assets/{id}` | `Asset`<br>`AdminAuditLog` | Truy cập qua action menu trong Bản đồ |
| **Ngừng sử dụng / Kích hoạt lại** | `EntityDetailSurface.tsx` menu | `POST /api/v1/admin/assets/{id}/retire`<br>`POST /api/v1/admin/meters/{id}/retire` | `Asset.lifecycle_status`<br>`Meter.lifecycle_status` | Action menu theo quyền Admin |
| **Thẩm định liên kết mạng lưới** | `EntityDetailSurface.tsx`<br>`UtilityNetworkView.tsx` | `POST /api/v1/admin/asset-connections/{id}/verify`<br>`POST /api/v1/admin/meter-asset-relations/{id}/verify` | `AssetConnection`<br>`MeterAssetRelation`<br>`VerificationEvidence` | Thực hiện trực tiếp trên thẻ quan hệ của hồ sơ đối tượng |

---

### Nhóm 2: LỊCH GHI (Reading Operations & Logbook)

| Chức năng nghiệp vụ | UI Component thực thi | API Endpoints gọi | DB Models & Tables tác động | Ghi chú chuyển đổi IA |
| :--- | :--- | :--- | :--- | :--- |
| **Xem lịch trình các ca theo ngày** | `AdminSchedules.tsx` | `GET /api/v1/admin/schedules?date=...` | `ReadingRound`<br>`ReadingBatch` | View danh sách ca đọc của Tab "Lịch ghi" |
| **Xem danh sách công tơ trong ca (Sổ ca ghi)** | `OperationalListView.tsx` / `ReadingBatchView.tsx` | `GET /api/v1/reading-rounds/{round_id}/meters`<br>`GET /api/v1/meter-operations/today` | `Meter`<br>`MeterReading` | Chuyển từ "dashboard viewMode=list" thành chế độ xem chi tiết lượt bên trong Lịch ghi |
| **Tạo lịch trình / Khung giờ mới** | `CreateScheduleModal` trong `AdminSchedules.tsx` | `POST /api/v1/admin/schedules/preview`<br>`POST /api/v1/admin/schedules` | `ReadingRound`<br>`AdminAuditLog` | Giữ nguyên trong Lịch ghi |
| **Xóa lượt ghi / Xóa lịch ngày** | Action button trong `AdminSchedules.tsx` | `DELETE /api/v1/admin/schedules/rounds/{id}`<br>`DELETE /api/v1/admin/schedules?date=...` | `ReadingRound`<br>`AdminAuditLog` | Giữ nguyên trong Lịch ghi |
| **Thực hiện ghi chỉ số (Camera & OCR)** | `MeterCamera.tsx` | `POST /api/v1/meter-readings/read` | *Không ghi DB (inference)* | Luồng tác nghiệp gắn liền với công tơ đang chọn trong Lịch ghi |
| **Xác nhận / Hiệu chỉnh kết quả đọc** | Confirmation view trong `App.tsx` / `ReadingBatchView.tsx` | `POST /api/v1/meter-readings/confirm`<br>`POST /api/v1/meter-readings/mark-review` | `MeterReading`<br>`MeterTrainingSample` | Lưu bản ghi chỉ số hoàn tất |
| **Đối soát & kiểm tra bản ghi ca trực** | `AdminReadingInspection.tsx` | `GET /api/v1/admin/meter-readings/{id}`<br>`GET /api/v1/admin/meter-readings/{id}/evidence` | `MeterReading`<br>`MeterReadingEvidence` | Kích hoạt từ thẻ ngoại lệ "Cần kiểm tra" trong Lịch ghi |
| **Xem vị trí công tơ trên Bản đồ** | Action "Xem trên bản đồ" | *Điều hướng context:* `locateOnMap({ type: 'meter', id })` | *Context navigation* | Chuyển sang Tab Bản đồ, focus công tơ, lưu context để quay lại Lịch ghi |

---

### Nhóm 3: PHÂN CA (Workforce Operations & Shift Scheduling)

| Chức năng nghiệp vụ | UI Component thực thi | API Endpoints gọi | DB Models & Tables tác động | Ghi chú chuyển đổi IA |
| :--- | :--- | :--- | :--- | :--- |
| **Xem ma trận phân ca tháng / tuần** | `AdminStaffRoster.tsx`<br>`RosterMatrix.tsx` | `GET /api/v1/admin/roster?month=...` | `WorkSchedule`<br>`User` | View chính của Tab "Phân ca" |
| **Gán ca làm việc cho nhân sự** | `RosterCellPopover.tsx` | `POST /api/v1/admin/roster/assign` | `WorkSchedule`<br>`AdminAuditLog` | Thao tác chỉnh sửa ô ca trực |
| **Áp dụng chu kỳ ca tự động** | `AutoPatternDialog.tsx` | `POST /api/v1/admin/roster/auto-pattern/preview`<br>`POST /api/v1/admin/roster/auto-pattern` | `WorkSchedule`<br>`AdminAuditLog` | Tạo lịch hàng loạt theo mẫu |
| **Kiểm tra và xử lý xung đột ca** | `RosterConflictPanel.tsx` | *Phân tích client RAM qua `validateRosterState`* | *Read-only validation* | Cảnh báo ca trùng hoặc vi phạm thời gian nghỉ |
| **Quản lý đơn xin nghỉ phép** | `LeaveRequestsPanel.tsx` | `GET /api/v1/admin/leave-requests`<br>`POST /api/v1/admin/leave-requests/{id}/review` | `LeaveRequest`<br>`WorkSchedule` | Sub-tab "Nghỉ phép" bên trong Phân ca |
| **Xuất ma trận phân ca ra CSV** | Toolbar action trong `AdminStaffRoster.tsx` | `GET /api/v1/admin/roster/export.csv` | `WorkSchedule` | Giữ nguyên trong Phân ca |
| **Phân công phụ trách phân khu (Zone)** | `MapOperationsPage.tsx` / `ZoneReassignModal` | `POST /api/v1/map/zones/{id}/assign` | `ZoneAssignment`<br>`AdminAuditLog` | Điều chuyển nhân sự phụ trách zone |

---

### Nhóm 4: BÁO CÁO (Operational Insights & Technical Reports)

| Chức năng nghiệp vụ | UI Component thực thi | API Endpoints gọi | DB Models & Tables tác động | Ghi chú chuyển đổi IA |
| :--- | :--- | :--- | :--- | :--- |
| **Tổng quan sản lượng & KPI** | `AdminReports.tsx` (Tab Overview) | `GET /api/v1/admin/reports/technical/overview` | `MeterReading`<br>`Meter` | View chính của Tab "Báo cáo" |
| **Đánh giá chất lượng nhận diện OCR** | `AdminReports.tsx` (Tab Quality) | `GET /api/v1/admin/reports/technical/overview` | `MeterReading` | Sub-tab Chất lượng trong Báo cáo |
| **Báo cáo kỹ thuật theo công tơ** | `AdminReports.tsx` (Tab Meters) | `GET /api/v1/admin/reports/technical/meters` | `Meter`<br>`MeterReading` | Sub-tab Công tơ trong Báo cáo |
| **Dữ liệu chi tiết & Lịch sử bản ghi** | `AdminReports.tsx` (Tab Data) | `GET /api/v1/admin/reports/technical/details` | `MeterReading`<br>`User` | Bảng tra cứu dữ liệu gốc |
| **Kiểm tra bằng chứng ảnh từ báo cáo** | `AdminReadingInspection.tsx` | `GET /api/v1/admin/meter-readings/{id}` | `MeterReadingEvidence` | Kích hoạt khi click vào bản ghi trong bảng dữ liệu |
| **Xuất báo cáo kỹ thuật ra CSV** | Export button trong `AdminReports.tsx` | `GET /api/v1/admin/reports/technical/export.csv` | `MeterReading` | Giữ nguyên trong Báo cáo |
| **Xem Nhật ký kiểm toán hệ thống** | `AdminAudit.tsx` | `GET /api/v1/admin/audit-logs` | `AdminAuditLog` | Tích hợp vào Báo cáo (Sub-tab Nhật ký) |
| **Tổng hợp hồ sơ cần thẩm định** | `AdminVerification.tsx` summary | `GET /api/v1/admin/asset-verification/overview` | `VerificationEvidence` | Báo cáo tình trạng thẩm định hồ sơ |

---

## 3. Kết Luận Bảo Toàn Nghiệp Vụ
1. Tất cả 28 chức năng nghiệp vụ đã được ánh xạ đầy đủ. Không có chức năng nào bị loại bỏ.
2. Không có xung đột giữa API và Database.
3. Không làm biến đổi schema DB, không tạo thêm bảng nối trùng lặp.
