# QUY ƯỚC ĐIỀU HƯỚNG VÀ DEEP LINK TƯƠNG THÍCH (NAVIGATION & DEEPLINK CONTRACT)

**Tài liệu**: `docs/product/four-workspaces/06_NAVIGATION_AND_DEEPLINK_CONTRACT.md`  
**Dự án**: Cảng Tân Thuận Operations Dashboard — Four-Workspace Architecture  
**Phiên bản**: 1.0  

---

## 1. Bản Ký Kết Điều Hướng Cấp Cao (Top-Level Navigation Contract)

### 1.1. Bốn Workspace Nghiệp Vụ Chính Thức

| Vị trí | Tab ID | Tên hiển thị (Desktop & Mobile) | Icon đại diện | Mô tả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `dashboard` | **Bản đồ** | `<Map size={20} />` | Vận hành không gian GIS, bản đồ cảng vệ tinh, mạng lưới điện/nước, tra cứu và hồ sơ thiết bị/công tơ |
| **2** | `schedules` | **Lịch ghi** | `<Calendar size={20} />` | Lập lịch, điều hành ca đọc chỉ số, sổ ca ghi theo giờ, ghi chỉ số và đối soát bản ghi nghi ngờ |
| **3** | `staff_roster` | **Phân ca** | `<Users size={20} />` | Quản lý nhân sự, ma trận phân ca tháng/tuần, chu kỳ ca tự động, giải quyết xung đột ca và đơn nghỉ phép |
| **4** | `reports` | **Báo cáo** | `<BarChart3 size={20} />` | Báo cáo sản lượng điện/nước, tiến độ hoàn thành, đánh giá AI OCR, dữ liệu gốc và nhật ký kiểm toán hệ thống |

### 1.2. Quy Tắc Bất Biến Về UI
* **Số lượng tab**: Đúng 4 tab. Tuyệt đối không xuất hiện tab thứ 5 trên Desktop Rail, Drawer hoặc Mobile Navigation.
* **Tên gọi nhất quán**: Tên gọi trên Desktop Rail, Drawer mở rộng và Mobile Topbar/Drawer phải hoàn toàn trùng khớp: `Bản đồ`, `Lịch ghi`, `Phân ca`, `Báo cáo`.
* **Thứ tự**: Cố định từ trái sang phải / trên xuống dưới: 1. Bản đồ -> 2. Lịch ghi -> 3. Phân ca -> 4. Báo cáo.
* **Trạng thái Active**: Mỗi thời điểm chỉ duy nhất 1 trong 4 tab mang thuộc tính `aria-current="page"` và class `.active`.

---

## 2. Bảng Ánh Xạ Deep Link Tương Thích (Backward Compatibility Route Map)

Mọi bookmark, link chia sẻ hoặc đường dẫn cũ đều được hỗ trợ tự động thông qua bộ phân giải `Route Compatibility Resolver` trong `App.tsx`:

| Đường dẫn cũ / Deep Link | Tab kích hoạt | Ngữ cảnh khởi tạo (Context Initialization) | Trải nghiệm người dùng |
| :--- | :--- | :--- | :--- |
| `/?tab=dashboard` | `dashboard` (**Bản đồ**) | Mở bản đồ vệ tinh ở mức zoom mặc định. | Truy cập Bản đồ không gian |
| `/?tab=dashboard&view=network` | `dashboard` (**Bản đồ**) | Kích hoạt lớp phủ mạng lưới Digital Twin (`viewMode='network'`). | Xem sơ đồ mạng điện / nước |
| `/?tab=dashboard&view=list` | `schedules` (**Lịch ghi**) | Chuyển sang Sổ ca ghi của ca hiện tại trong Lịch ghi. | Xem danh sách công tơ cần ghi |
| `/?tab=assets` | `dashboard` (**Bản đồ**) | Mở bảng tra cứu thiết bị hạ tầng. | Tra cứu thiết bị trên Bản đồ |
| `/?tab=assets&asset=SIM-SS-01` | `dashboard` (**Bản đồ**) | Tự động định vị và mở `EntityDetailSurface` của thiết bị `SIM-SS-01`. | Mở hồ sơ thiết bị trực tiếp |
| `/?tab=meters` | `dashboard` (**Bản đồ**) | Mở bảng tra cứu công tơ. | Tra cứu công tơ trên Bản đồ |
| `/?tab=meters&meter=CT-001` | `dashboard` (**Bản đồ**) | Tự động định vị và mở `EntityDetailSurface` của công tơ `CT-001`. | Mở hồ sơ công tơ trực tiếp |
| `/?tab=schedules` | `schedules` (**Lịch ghi**) | Hiển thị lịch trình ca đọc của ngày hôm nay. | Xem lịch ca ghi |
| `/?tab=schedules&date=2026-09-15` | `schedules` (**Lịch ghi**) | Chọn ngày `2026-09-15` và tải các ca tương ứng. | Xem lịch ca theo ngày cụ thể |
| `/?tab=staff_roster` | `staff_roster` (**Phân ca**) | Hiển thị ma trận phân ca tháng hiện tại. | Điều độ nhân sự |
| `/?tab=reports` | `reports` (**Báo cáo**) | Mở báo cáo kỹ thuật tổng quan. | Xem báo cáo sản lượng & KPI |
| `/?tab=reports&subTab=audit` | `reports` (**Báo cáo**) | Mở tab "Nhật ký kiểm toán" bên trong Báo cáo. | Tra cứu nhật ký audit |
| `/?tab=audit` | `reports` (**Báo cáo**) | Chuyển hướng tương thích vào sub-tab Nhật ký kiểm toán của Báo cáo. | Tra cứu nhật ký audit |
| `/?tab=verification` | `reports` (**Báo cáo**) | Hiển thị tổng hợp hồ sơ thẩm định trong Báo cáo, kèm link đến từng đối tượng trên Bản đồ. | Báo cáo tình trạng thẩm định |

---

## 3. Quy Ước Tham Số Query (Query Parameters Contract)

Khi thay đổi trạng thái, ứng dụng sử dụng `window.history.replaceState` để đồng bộ URL mà không gây tải lại trang:

* `tab`: `dashboard` | `schedules` | `staff_roster` | `reports`
* `view`: `map` | `network` (dùng cho Bản đồ)
* `date`: Chuỗi ngày định dạng `YYYY-MM-DD` (Asia/Ho_Chi_Minh)
* `round_id`: Định danh lượt đọc UUID
* `entity`: Mã thiết bị hoặc công tơ đang được mở hồ sơ
* `utility`: `ALL` | `ELECTRICITY` | `WATER`

---

## 4. Kiểm Thử Tránh Hồi Quy (Test Invariant Contract)
Bộ kiểm thử tự động (`npm test`) và các smoke check phải xác nhận:
1. Giao diện rail/drawer chỉ render đúng 4 button điều hướng chính.
2. Không có bất kỳ button nào mang tab id khác ngoài 4 tab được chỉ định.
3. Chuyển tab giữa 4 workspace 10 lần liên tiếp không làm rò rỉ RAM, không để lại DOM ma và bảo toàn tính toàn vẹn của state.
