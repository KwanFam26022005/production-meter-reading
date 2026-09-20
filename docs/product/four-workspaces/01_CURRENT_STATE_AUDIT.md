# BÁO CÁO AUDIT HIỆN TRẠNG SẢN PHẨM, UI VÀ DATABASE (PHASE A)

**Dự án**: Dashboard Vận hành Cảng Tân Thuận (Saigon Port Digital Operations)  
**Phiên bản khảo sát**: V16E — Chuyển dịch Kiến trúc 4 Workspaces  
**Thời điểm thực hiện**: 2026-09-20  
**Tác giả**: Senior Product Engineer, UX Architect & Database Analyst  

---

## 1. Trạng thái Git & Quy tắc An toàn

* **Current Branch**: `feature/v16e-network-map-overlay-r1`
* **Current HEAD**: `b5ebd58 style(network): correct on-map utility network overlay with Saigon Port maritime palette`
* **Working Tree**: Sạch (clean), không có uncommitted changes.
* **Remote Tracking**: `remotes/origin/HEAD -> origin/main`
* **Local Backup Branch**: Đã tạo nhánh sao lưu `backup/pre-v16e-four-workspaces-b5ebd58` trực tiếp từ commit `b5ebd58`.
* **Quy tắc an toàn tuân thủ**:
  1. Không tự checkout commit cũ; không reset, revert, cherry-pick hay force push.
  2. Database production, schema SQLite (`data/app.db`), migration và dữ liệu seed được giữ nguyên ở chế độ **READ-ONLY** (ZERO schema/data mutations).
  3. Không thay thế ảnh nền, geometry, hệ tọa độ (1915×821) hay MapVersion (`tan-thuan-sim-v1-5zone`).
  4. Không thêm CSS framework mới; tuân thủ toàn diện Saigon Port UI Design DNA (`frontend/DESIGN_DNA.md`).
  5. Không push lên remote repository.

---

## 2. A1. Audit Điều Hướng & Thông Tin Kiến Trúc (IA)

### 2.1. Render Path Thực Tế
Ứng dụng sử dụng React 18 với Vite (`frontend/src/App.tsx`). Quá trình phân giải render:
1. **Khởi động & Xác thực (`App.tsx:641-662`)**:
   * Kiểm tra session qua `getMe()` (`/api/v1/auth/me`).
   * Chưa xác thực: Render `LoginView.tsx`.
2. **Phân quyền người dùng**:
   * **Role `ADMIN` (`App.tsx:665-682`)**: Được bọc trong `OperationalWorkspaceProvider` (`frontend/src/context/OperationalWorkspaceContext.tsx`) và render `AdminWorkspaceApp` (`frontend/src/App.tsx:130-216`) kết hợp cùng `AdminShell` (`frontend/src/components/admin/AdminShell.tsx`).
   * **Role `EMPLOYEE` / `OPERATOR` (`App.tsx:684-750`)**: Được bọc trong `AuthenticatedShell` (`frontend/src/components/AuthenticatedShell.tsx`) điều hướng qua các màn hình cục bộ: `home` (`HomeHub.tsx`), `reading_batch` (`ReadingBatchView.tsx`), `meter` (`MeterCamera.tsx` + Xác nhận chỉ số), `attendance` (`AttendanceView.tsx`), `schedule` (`UserScheduleView.tsx`).

### 2.2. Bảng Thống Kê Entry Point Hiện Tại & Đề Xuất Chuyển Đổi

| Chức năng | Entry point hiện tại | Component | Route / State | Tab đích đề xuất (4 Workspaces) |
| :--- | :--- | :--- | :--- | :--- |
| **Bản đồ số & Không gian GIS** | Desktop Rail: "Bản đồ" | `MapOperationsPage.tsx` | `tab=dashboard` & `view=map` | **Bản đồ** |
| **Mạng lưới cấp điện & nước** | Header Mode Switch: "Mạng lưới" | `UtilityNetworkView.tsx` | `tab=dashboard` & `view=network` | **Bản đồ** (Lớp phủ mạng lưới) |
| **Sổ ca ghi (Danh sách 12 công tơ)** | Header Mode Switch: "Sổ ca ghi" | `OperationalListView.tsx` | `tab=dashboard` & `view=list` | **Lịch ghi** (Chế độ xem ca/lượt) |
| **Quản trị danh mục Thiết bị** | Desktop Rail: "Thiết bị" -> Sub-tab "Hạ tầng" | `AdminAssets.tsx` | `tab=assets` | **Bản đồ** (Tra cứu & Hồ sơ đối tượng) |
| **Quản trị danh mục Công tơ** | Desktop Rail: "Thiết bị" -> Sub-tab "Công tơ" | `AdminMeters.tsx` | `tab=meters` | **Bản đồ** (Tra cứu & Hồ sơ đối tượng) |
| **Hiệu chỉnh tọa độ Marker** | Command Bar / Asset Action Menu | `MapCalibrationWorkspace.tsx` / `placement` | Context state `calibration` / `placement` | **Bản đồ** (Thao tác quản trị vị trí) |
| **Lập & xem Lịch trình ca đọc** | Secondary Menu [⋯]: "Lịch ghi" | `AdminSchedules.tsx` | `tab=schedules` | **Lịch ghi** |
| **Thực hiện ghi chỉ số (Field)** | Employee Home -> "Đọc chỉ số" | `ReadingBatchView.tsx` -> `MeterCamera.tsx` | State `activeScreen='reading_batch' \| 'meter'` | **Lịch ghi** (Luồng thao tác ca trực) |
| **Đối soát / Kiểm tra bản ghi OCR** | Detail Overlay / Inspection Modal | `AdminReadingInspection.tsx` | State `inspectingReadingId` | **Lịch ghi** (Kiểm tra ngoại lệ ca) |
| **Phân ca & Lịch trực nhân sự** | Secondary Menu [⋯]: "Phân ca" | `AdminStaffRoster.tsx` | `tab=staff_roster` | **Phân ca** |
| **Đơn xin nghỉ phép & phê duyệt** | Sub-tab "Nghỉ phép" trong Phân ca | `LeaveRequestsPanel.tsx` | Sub-state trong `AdminStaffRoster` | **Phân ca** |
| **Báo cáo kỹ thuật & sản lượng** | Secondary Menu [⋯]: "Báo cáo" | `AdminReports.tsx` | `tab=reports` | **Báo cáo** |
| **Nhật ký kiểm toán hệ thống** | Secondary Menu [⋯]: "Nhật ký" | `AdminAudit.tsx` | `tab=audit` | **Báo cáo** (Tab Nhật ký kiểm toán) |
| **Thẩm định hồ sơ hạ tầng** | Secondary Menu [⋯]: "Thẩm định hồ sơ" | `AdminVerification.tsx` | `tab=verification` | **Bản đồ** (Hồ sơ) & **Báo cáo** (Tổng hợp) |
| **Chấm công khuôn mặt (Camera)** | Employee Home -> "Chấm công" | `AttendanceView.tsx` | State `activeScreen='attendance'` | **Phân ca** / Menu nhân sự |

---

## 3. A2. Audit Nghiệp Vụ & Quyền Thao Tác

1. **Xem và tìm kiếm vị trí thiết bị / công tơ**:
   * *Quyền*: ADMIN, EMPLOYEE, OPERATOR.
   * *Kích hoạt*: Search input trên `AdaptiveCommandBar.tsx` hoặc click marker trên `OperationalScene.tsx`.
   * *API*: `GET /api/v1/map/overview`, `GET /api/v1/map/meters`, `GET /api/v1/admin/asset-network`.
   * *Dữ liệu*: Đọc bảng `meters`, `assets`, `operational_zones`.
   * *Cập nhật UI*: Viewport map zoom/pan vào vị trí; mở `EntityDetailSurface.tsx`.
2. **Xem mạng điện / nước (Digital Twin Network)**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Nút "Mạng lưới" trên thanh điều hướng không gian.
   * *API*: `GET /api/v1/admin/asset-network?utility_type=...&verified_only=...`.
   * *Dữ liệu*: Đọc bảng `assets`, `asset_connections`, `meter_asset_relations`.
   * *Cập nhật UI*: Render các node và cạnh định hướng (flow direction) trên `UtilityNetworkView.tsx`.
3. **Thêm / sửa / ngừng sử dụng Thiết bị hoặc Công tơ**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Action menu trên `EntityDetailSurface.tsx` hoặc toolbar trong `AdminAssets`/`AdminMeters`.
   * *API*: `POST /api/v1/admin/assets`, `PATCH /api/v1/admin/assets/{id}`, `POST /api/v1/admin/assets/{id}/retire`, `PATCH /api/v1/admin/meters/{id}`, `POST /api/v1/admin/meters/{id}/retire`.
   * *Dữ liệu*: Ghi bảng `assets`, `meters`, `admin_audit_logs`.
   * *Cập nhật UI*: Refetch danh mục, cập nhật marker trên map và trạng thái lifecycle.
4. **Hiệu chỉnh vị trí không gian (Placement & Calibration)**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Chọn "Di chuyển vị trí" trên thẻ chi tiết hoặc kích hoạt Calibration Workspace.
   * *API*: `POST /api/v1/admin/meters/{id}/relocate`, `POST /api/v1/admin/assets/{id}/relocate`.
   * *Dữ liệu*: Ghi `meters.map_x`, `meters.map_y`, `assets.map_x`, `assets.map_y`, ghi `admin_audit_logs`.
   * *Cập nhật UI*: Marker di chuyển tức thời, không làm đảo lộn trạng thái nghiệp vụ đọc chỉ số.
5. **Lập và quản lý lịch ghi**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Nút "Tạo lịch đọc" trên `AdminSchedules.tsx`.
   * *API*: `POST /api/v1/admin/schedules/preview`, `POST /api/v1/admin/schedules`, `DELETE /api/v1/admin/schedules/{round_id}`.
   * *Dữ liệu*: Ghi bảng `reading_rounds`, `admin_audit_logs`.
   * *Cập nhật UI*: Cập nhật danh sách các ca/lượt trong ngày, hiển thị thanh tiến độ.
6. **Thực hiện ghi chỉ số (Field Meter Reading)**:
   * *Quyền*: EMPLOYEE, OPERATOR, ADMIN.
   * *Kích hoạt*: Nút "Ghi chỉ số" trên từng công tơ trong Sổ ca ghi.
   * *API*: `POST /api/v1/meter-readings/read` (inference AI), `POST /api/v1/meter-readings/confirm` hoặc `mark-review`.
   * *Dữ liệu*: Đọc/ghi `meter_readings`, `meter_reading_evidence`, `meter_training_samples`.
   * *Cập nhật UI*: Trạng thái công tơ chuyển từ PENDING sang CONFIRMED hoặc REVIEW.
7. **Xem xét, đối soát và điều chỉnh bản ghi (Inspection & Review)**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Bấm pill "Cần kiểm tra" hoặc ngoại lệ trong danh sách lượt ghi / báo cáo.
   * *API*: `GET /api/v1/admin/meter-readings/{id}`, `POST /api/v1/meter-readings/confirm`.
   * *Dữ liệu*: Đọc `meter_readings`, `meter_reading_evidence`; cập nhật `meter_readings.status = 'CONFIRMED'`.
   * *Cập nhật UI*: Đóng modal kiểm tra, giảm số lượng ngoại lệ cần xem xét.
8. **Phân công nhân sự & điều độ ca trực**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Ma trận phân ca trên `AdminStaffRoster.tsx` hoặc nút điều chuyển trên Map overview.
   * *API*: `POST /api/v1/admin/roster/assign`, `POST /api/v1/admin/roster/auto-pattern`, `POST /api/v1/map/zones/{zone_id}/assign`.
   * *Dữ liệu*: Ghi bảng `work_schedules`, `zone_assignments`, `admin_audit_logs`.
   * *Cập nhật UI*: Ô ca trực đổi màu theo mã ca (CA1, CA2, CA3, HC, OFF, LEAVE), avatar nhân sự hiển thị trên Zone.
9. **Thẩm định hồ sơ hạ tầng và liên kết thiết bị**:
   * *Quyền*: ADMIN.
   * *Kích hoạt*: Hồ sơ thiết bị hoặc bảng thẩm định hồ sơ.
   * *API*: `POST /api/v1/admin/assets/{id}/verify`, `POST /api/v1/admin/meter-asset-relations/{id}/verify`, `POST /api/v1/admin/asset-connections/{id}/verify`.
   * *Dữ liệu*: Ghi `verification_status = 'VERIFIED'`, tạo bản ghi `verification_evidences`.
   * *Cập nhật UI*: Huy hiệu "Đã thẩm định" hiển thị trong hồ sơ và trên mạng lưới.

---

## 4. A3. Audit Database & API (Read-Only)

Cơ sở dữ liệu SQLite tại `data/app.db` gồm **21 bảng**:

| Bảng DB | Số lượng bản ghi | Mục đích nghiệp vụ |
| :--- | :--- | :--- |
| `users` | 17 | Tài khoản người dùng (ADMIN, EMPLOYEE, OPERATOR) |
| `sessions` | 1611 | Token phiên đăng nhập và bảo mật |
| `attendance_events` | 8 | Sự kiện chấm công có ảnh chụp |
| `operational_zones` | 4 | 4 phân khu vận hành thực tế cảng |
| `zone_assignments` | 72 | Lịch sử và phân công nhân sự phụ trách phân khu |
| `map_versions` | 95 | Lịch sử các phiên bản bản đồ |
| `map_version_zones` | 563 | Dữ liệu đa giác phân khu theo từng phiên bản bản đồ |
| `meters` | 24 | 24 công tơ (12 SIMULATED đang hoạt động, 12 LEGACY đã retire) |
| `reading_batches` | 2 | Kỳ ghi chỉ số (Tháng 08/2026 và Tháng 09/2026-sim) |
| `reading_rounds` | 647 | Các lượt ghi chỉ số theo giờ/ca |
| `meter_readings` | 6873 | Bản ghi chỉ số (6823 CONFIRMED, 50 REVIEW) |
| `meter_reading_evidence`| 0 (RAM/File) | Siêu dữ liệu bằng chứng ảnh và ROI bbox |
| `meter_training_samples`| 4 | Mẫu dữ liệu huấn luyện khi có điều chỉnh OCR |
| `admin_audit_logs` | 2103 | Nhật ký kiểm toán mọi thao tác quản trị |
| `work_schedules` | 331 | Lịch phân ca theo ngày của nhân viên |
| `leave_requests` | 3 | Đơn xin nghỉ phép |
| `assets` | 32 | 32 thiết bị hạ tầng (30 có tọa độ, 2 không có tọa độ) |
| `meter_asset_relations` | 24 | Quan hệ lắp đặt và đo đếm giữa Meter và Asset |
| `asset_connections` | 31 | Kết nối mạng lưới điện (24) và cấp nước (7) |
| `verification_evidences`| 1 | Bằng chứng hồ sơ thẩm định |
| `simulation_scenarios` | 1 | Kịch bản mô phỏng (`tan-thuan-demo-v1`) |

### Trả Lời 8 Câu Hỏi Kiến Trúc Bắt Buộc:

1. **Lịch ghi được liên kết với lượt ghi như thế nào?**
   * *Quan hệ*: `ReadingRound.batch_id` tham chiếu `ReadingBatch.id` (FK `reading_batches.id`, cascade delete).
   * *Nghiệp vụ*: Lịch theo ngày được truy vấn từ bảng `reading_rounds` dựa trên `scheduled_at` quy đổi theo múi giờ `Asia/Ho_Chi_Minh` (`backend/app/admin.py:get_admin_schedules_list`).
2. **Lượt ghi được liên kết với các công tơ như thế nào?**
   * *Quan hệ*: Không có bảng nối tĩnh giữa Round và Meter. Lượt ghi áp dụng cho **toàn bộ công tơ đang kích hoạt** (`Meter.is_active == True`).
   * *Nghiệp vụ*: Trạng thái của từng công tơ trong lượt ghi được xác định động qua Left Join với bảng `meter_readings` theo cặp `(meter_id, reading_round_id)` (`backend/app/meter_logbook.py:get_round_meters_with_status`). Nếu có bản ghi, trạng thái là `CONFIRMED` hoặc `REVIEW`; nếu chưa có, trạng thái là `PENDING`.
3. **Công tơ được phân công cho nhân sự bằng quan hệ nào?**
   * *Quan hệ*: `Meter.zone_id` liên kết với `OperationalZone.id`. Bảng `zone_assignments` liên kết `zone_id` với `user_id` (`assignment_role = 'PRIMARY'`).
   * *Nghiệp vụ*: Nhân sự phụ trách một phân khu chịu trách nhiệm ghi toàn bộ các công tơ nằm trong phân khu đó (`backend/app/map_operations.py:get_map_zones`). Phân công nhân sự theo ngày được quản lý tại bảng `work_schedules`.
4. **Trạng thái hoàn thành của một ca được tính từ đâu?**
   * *Công thức*: Được tính toán động từ số lượng bản ghi `MeterReading` có `reading_round_id` tương ứng (`backend/app/meter_logbook.py:calculate_round_progress`):
     * `total` = tổng số công tơ `is_active == True`
     * `confirmed` = số bản ghi có `status == 'CONFIRMED'`
     * `review` = số bản ghi có `status == 'REVIEW'`
     * `pending` = `total - (confirmed + review)`
5. **Các bản ghi cần xem xét hoặc đối soát được lưu ở đâu?**
   * *Đối soát chỉ số*: Lưu tại bảng `meter_readings` với cờ `status = 'REVIEW'` (hiện có đúng 50 bản ghi).
   * *Thẩm định hạ tầng*: Lưu tại các cột `verification_status` trên bảng `assets`, `meter_asset_relations`, `asset_connections`, và chi tiết bằng chứng trong bảng `verification_evidences`.
6. **Asset và Meter được gắn vị trí như thế nào?**
   * *Hệ tọa độ*: Tọa độ chuẩn hóa `(map_x, map_y)` dạng số thực `[0.0, 1.0]` tương ứng với không gian ảnh chuẩn `1915 × 821` pixel (`tan-thuan-canonical-image-pixel-space-v1`).
   * *Gán vị trí*: Cả `meters` và `assets` đều lưu trực tiếp `map_x`, `map_y` và `zone_id`.
7. **Mạng điện/nước lấy quan hệ từ đâu?**
   * *Cấu trúc Topology*: Bảng `asset_connections` lưu cạnh có hướng từ `source_asset_id` đến `target_asset_id` kèm `utility_type` (`ELECTRICITY` hoặc `WATER`) và `connection_type` (`SUPPLIES` hoặc `CONNECTED_TO`).
   * *Liên kết công tơ*: Bảng `meter_asset_relations` liên kết công tơ đo đếm với thiết bị mạng lưới (`relation_type = 'MEASURES' | 'INSTALLED_AT'`).
8. **Dữ liệu mô phỏng và legacy được cách ly bằng cơ chế nào?**
   * Cột `data_origin` trên các bảng `meters`, `assets`, `meter_asset_relations`, `asset_connections` mang các giá trị: `'REAL'`, `'SIMULATED'`, `'LEGACY_SIMULATION'`, `'LEGACY_TEST_DATA'`.
   * Cột `scenario_id` định danh kịch bản (ví dụ `'tan-thuan-demo-v1'`).
   * Cột `is_legacy` (boolean) trên bảng `reading_rounds` để phân tách các đợt chạy thử nghiệm cũ.

---

## 5. A4. Audit Tính Nhất Quán (Consistency Audit)

* **Thiết bị có tọa độ vs Chưa có tọa độ**:
  * Trong tổng số 32 assets: 30 assets có tọa độ không gian chính xác, **2 assets không có tọa độ** (`map_x = null, map_y = null`): `SIM-EXT-GRID` (Lưới điện Quốc gia 110kV EVN) và `SIM-CITY-WATER` (Đường ống Cấp nước Thành phố Sawaco). Đây là các điểm nguồn cấp bên ngoài cảng.
  * **Yêu cầu UI**: Thanh tra cứu trong Bản đồ phải tìm được 2 đối tượng này và mở được `EntityDetailSurface` của chúng mà không bị lỗi vị trí.
* **Công tơ điện vs Công tơ nước**:
  * 24 công tơ tổng cộng: 12 công tơ active trong kịch bản mô phỏng gồm **8 công tơ điện** (`ELECTRICITY`) và **4 công tơ nước** (`WATER`). 12 công tơ cũ đã ở trạng thái `RETIRED`.
* **Công tơ có liên kết vs Không có liên kết Asset**:
  * Cả 12 công tơ active đều có 2 quan hệ tương ứng trong `meter_asset_relations`: 1 quan hệ `INSTALLED_AT` và 1 quan hệ `MEASURES` (tổng cộng 24 quan hệ `SIMULATION_APPROVED`).
* **ReadingRound hiện tại vs Lịch sử**:
  * Bảng `reading_rounds` có 647 lượt ghi. Ca hiện tại được xác định dựa trên thời gian thực `now()` và ngày đang chọn. Trạng thái ca quá khứ đã chốt không bị ghi đè bởi tiến độ hiện tại.
* **Phân công nhân sự**:
  * Bảng `zone_assignments` có 72 bản ghi phân công phân khu; bảng `work_schedules` có 331 bản ghi phân ca chi tiết theo ngày. Phân định rạch ròi: `zone_assignments` chỉ định người chịu trách nhiệm phân khu; `work_schedules` chỉ định ca làm việc cụ thể của từng ngày.

---

## 6. Kết luận Phase A
Toàn bộ thông tin đường dẫn, component, API và dữ liệu thực tế đã được khảo sát tường minh mà không làm biến động bất kỳ dữ liệu production nào. Hệ thống sẵn sàng cho việc chốt kiến trúc 4 Workspaces trong Phase B.
