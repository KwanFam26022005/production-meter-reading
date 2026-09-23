# Phase 0: Local Repository & Runtime Inventory — Dependency Map

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tác vụ:** Chia tách Frontend thành 2 ứng dụng độc lập (User Portal & Operations Portal)  
**Ngày thực hiện:** 21/09/2026  
**Trạng thái kiểm kê:** Hoàn tất khảo sát hiện trạng mã nguồn và runtime cục bộ  

---

## 1. Phân định ranh giới hiện trạng (Status Classification)

Để đảm bảo tính an toàn tuyệt đối và tuân thủ các ràng buộc an toàn (Safety Constraints), hiện trạng hệ thống được phân định rõ ràng thành 4 nhóm:

| Nhóm phân loại | Mô tả | Thành phần xác minh |
| :--- | :--- | :--- |
| **VERIFIED LOCAL CODE** | Đã kiểm tra trực tiếp mã nguồn, diff, AST và import tree trong local working copy. | `frontend/src/App.tsx`, `api.ts`, `types.ts`, `index.css`, `sw.js`, `manifest.webmanifest`, `backend/app/auth.py`, `backend/app/main.py`, `pytest.ini`, test suites. |
| **VERIFIED RUNTIME** | Đã kiểm tra tiến trình đang chạy, socket port lắng nghe, dịch vụ Windows và cấu hình registry thực tế. | Windows Service `MeterReadingBackend` (NSSM) chạy port 8000; Vite dev server chạy port 5173; `httpd` chạy port 80/443; SQLite `data/app.db`. |
| **DOCUMENTED ONLY** | Có file cấu hình trong kho mã nguồn nhưng không hoạt động trong môi trường runtime hiện tại. | `docker-compose.prod.yml`, `Dockerfile.web`, `Caddyfile`, `DEPLOYMENT.md` (Docker daemon không hoạt động trên máy host). |
| **UNKNOWN** | Chưa có thông tin thực tế từ hạ tầng mạng trung tâm Cảng Sài Gòn. | Cấu hình DNS/TLS cấp doanh nghiệp, tên miền chính thức cho 2 portal, cấu hình chi tiết của `httpd` PID 4636. |

---

## 2. Kiểm kê Frontend hiện tại (A. Frontend Structure)

### 2.1. Điểm khởi đầu và điều hướng theo vai trò (Entry Point & Role Dispatch)
- **Điểm vào ứng dụng:** `frontend/index.html` tải `frontend/src/main.tsx`.
- **Đăng ký Service Worker:** `main.tsx` đăng ký `/sw.js` khi `PROD === true`.
- **`frontend/src/App.tsx`:** Đang đảm nhiệm toàn bộ việc hiển thị điều kiện dựa trên trạng thái phiên:
  1. `!currentUser`: Hiển thị `LoginView.tsx`.
  2. `currentUser.role === 'ADMIN'`: Bao bọc trong `OperationalWorkspaceProvider` và render `AdminWorkspaceApp` (chứa toàn bộ 8 tab nghiệp vụ quản trị).
  3. `currentUser.role !== 'ADMIN'` (Nhân viên hiện trường): Điều hướng theo `activeScreen`:
     - `'home'`: `HomeHub.tsx` (Trang chủ nghiệp vụ).
     - `'reading_batch'`: `ReadingBatchView.tsx` (Danh sách công tơ theo ca/đợt).
     - `'meter'`: Chế độ đọc công tơ tập trung (Camera stream, Chụp ảnh, OCR inference, Xác nhận chỉ số, Nhập thủ công, Ghi chú kiểm tra, Pan/Zoom ROI).
     - `'attendance'`: `AttendanceView.tsx` (Chấm công chụp ảnh selfie, đối soát lượt vào/ra).
     - `'schedule'`: `UserScheduleView.tsx` (Lịch làm việc cá nhân, đăng ký nghỉ phép).

### 2.2. Ma trận phụ thuộc của các màn hình Nhân viên (Employee Screens)
- **`HomeHub.tsx`:** Phụ thuộc vào `User`, `TodayAttendance`, `api.getTodayAttendance`, `BottomRadialNav`, `InsightFeed`, các primitives trạng thái.
- **`ReadingBatchView.tsx`:** Phụ thuộc vào `ReadingBatch`, `ReadingRound`, `api.getOpenReadingBatch`, `api.getBatchMeters`, `MeterSparkline`.
- **`MeterCamera.tsx` & Workflow OCR trong `App.tsx`:** Phụ thuộc vào `api.readMeter`, `api.confirmMeterReading`, `api.markMeterReview`, `api.reconcileMeterReading`, `ImageViewerModal`, `UnsavedWorkConfirmModal`.
- **`AttendanceView.tsx`:** Phụ thuộc vào `api.recordAttendance`, `api.getTodayAttendance`, `api.reconcileAttendance`, `AttendanceSubmissionPhase`.
- **`UserScheduleView.tsx`:** Phụ thuộc vào `api.getUserMonthlySchedule`, `api.createLeaveRequest`, `LeaveRequestModal`.

### 2.3. Ma trận phụ thuộc của các màn hình Quản trị (Admin Screens)
- **`AdminShell.tsx`:** Khung điều hướng máy tính bảng/desktop, danh sách tab quản trị (`AdminTab`).
- **`AdminDashboard.tsx`:** Thống kê tổng quan ca, chỉ số công tơ, telemetry, kiểm tra nhanh ảnh đọc.
- **`AdminDevicesWorkspace.tsx` / `AdminMeters.tsx` / `AdminAssets.tsx`:** Quản lý vòng đời công tơ & tài sản thiết bị cảng.
- **`OperationalWorkspaceContext.tsx` & `features/map-operations/*`:** Bản đồ số Digital Twin Tân Thuận, topo mạng lưới điện nước cáp, truy vết upstream/downstream, không gian hiệu chuẩn hình học.
- **`AdminVerification.tsx`:** Đối soát hình ảnh và ma trận kiểm tra công tơ.
- **`AdminSchedules.tsx`:** Điều phối lịch ca, tạo đợt đọc, phân bổ nhân sự.
- **`AdminStaffRoster.tsx` + `components/admin/roster/*`:** Phân ca làm việc, duyệt phép, tạo ca tự động.
- **`AdminReadingInspection.tsx`:** Soi chi tiết ảnh đọc gốc, vùng ROI, vết kiểm toán OCR.
- **`AdminReports.tsx` + `ReportsView.tsx`:** Báo cáo sản lượng, xuất CSV kỹ thuật.
- **`AdminAudit.tsx`:** Nhật ký kiểm toán hệ thống.

### 2.4. Thành phần dùng chung (Shared Modules)
- **Hợp đồng dữ liệu:** `frontend/src/types.ts` chứa toàn bộ type định danh, request/response payload, enum trạng thái.
- **API Client:** `frontend/src/services/api.ts` (quản lý CSRF cache, bắt lỗi 401 tập trung, relative URL `/api/*`).
- **Design Tokens & Style:** `frontend/src/index.css` (bảng màu hàng hải Cảng Sài Gòn, lớp token nautical, responsive resets).
- **UI Primitives:** `LoadingState`, `EmptyState`, `ErrorState`, `ImageViewerModal`, `LogoutConfirmModal`, `UnsavedWorkConfirmModal`, `VnDatePicker`, `SgpPrimitives`.
- **Tài nguyên đồ họa:** `saigon-port-ui-icon.svg`, logo port.

---

## 3. Kiểm kê Hợp đồng Backend (B. Backend Contracts)

### 3.1. Xác thực và Phiên làm việc (Auth & Session)
- **Cơ chế:** Server-side session lưu tại bảng `sessions` (SQLite).
- **Session Cookie:**
  - Tên cookie: `csg_session` (cấu hình qua `settings.session_cookie_name`).
  - Thuộc tính: `HttpOnly=True`, `SameSite=Lax`, `Path=/`.
  - Thuộc tính `Secure`: Tự động kích hoạt khi `ENVIRONMENT=production`.
  - **Không cấu hình thuộc tính `Domain`:** Đây là cookie **Host-Only**, chỉ gắn với chính xác FQDN phát hành ra nó.
- **Bảo vệ CSRF:**
  - Token được sinh bằng thuật toán HMAC SHA-256 (`csrf_secret` + `session_token`).
  - Client lấy token qua `GET /api/v1/auth/csrf`.
  - Tất cả các phương thức thay đổi trạng thái (`POST`, `PUT`, `PATCH`, `DELETE`) bắt buộc có header `X-CSRF-Token`.
  - Backend xác thực tính tương thích HMAC giữa cookie session và header CSRF.

### 3.2. Phân quyền vai trò (Role Authorization)
- Endpoint `/api/v1/auth/me` trả về thông tin `User` (`id`, `employee_code`, `full_name`, `role`).
- Endpoint nghiệp vụ nhân viên yêu cầu `get_current_active_user`:
  - `POST /api/v1/read-meter`
  - `POST /api/v1/meter-reading/confirm`
  - `POST /api/v1/meter-reading/review`
  - `POST /api/v1/meter-reading/reconcile`
  - `POST /api/v1/attendance`
  - `GET /api/v1/attendance/today`
  - `POST /api/v1/attendance/reconcile`
- Endpoint quản trị yêu cầu `require_admin` (HTTP 403 Forbidden nếu không phải `ADMIN`):
  - Toàn bộ nhóm `/api/v1/admin/*`
  - Quản lý tài sản `/api/v1/assets/*`
  - Cấu hình bản đồ `/api/v1/map-config/*`
  - Xuất báo cáo `/api/v1/reports/*`

### 3.3. Chính sách lưu trữ dữ liệu và bằng chứng hình ảnh (Evidence & Privacy)
- **Ảnh công tơ:** Xử lý trực tiếp trong RAM, không lưu trữ đĩa ở luồng suy luận thông thường. Chỉ ghi mẫu huấn luyện có gắn cờ hoặc lưu trữ bằng chứng khi quản trị kích hoạt.
- **Ảnh chấm công:** Lưu trữ tại thư mục bảo mật `data/attendance_photos/`, tước bỏ metadata, kiểm tra hash SHA-256 chống trùng lặp.
- **Mô hình OCR:** Single instance duy nhất chạy qua tiến trình backend (E2 YOLO Detector + PP-OCRv6 SVTR_LCNet).

---

## 4. Kiểm kê Môi trường Triển khai (C. Deployment Reality)

### 4.1. Dịch vụ Windows (Verified Runtime)
- **Tên dịch vụ:** `MeterReadingBackend`
- **Trình quản lý:** NSSM (`C:\WINDOWS\system32\nssm.exe`)
- **Trạng thái:** `Running` (Auto start)
- **Lệnh thực thi:** `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
- **Ghi chú an toàn:** Tuyệt đối không khởi động lại hoặc tắt service này mà không có ủy quyền rõ ràng.

### 4.2. Mạng và Cổng lắng nghe (Listening Ports)
- `0.0.0.0:8000`: Backend FastAPI (PID 27520, Python).
- `0.0.0.0:5173`: Frontend Vite dev server (PID 7048, Node).
- `0.0.0.0:80` & `0.0.0.0:443`: Apache `httpd` (PID 4636).

### 4.3. Docker & Caddy (Documented Only)
- `docker-compose.prod.yml` và `Dockerfile.web` tồn tại trong repository phục vụ tài liệu và đóng gói container trong tương lai.
- Docker daemon **không hoạt động** trên máy chủ phát triển hiện tại (`docker ps` không kết nối được pipe).
- Caddy Web Server là kiến trúc mục tiêu được định nghĩa trong `Caddyfile` phục vụ triển khai sản xuất hoặc staging độc lập.

---

## 5. Bản đồ phụ thuộc tổng thể (Dependency Map)

```
                              SHARED BACKEND & DATA
                               [FastAPI :8000]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
   [/api/v1/attendance/*]                               [/api/v1/admin/*]
   [/api/v1/read-meter]                                 [/api/v1/assets/*]
   [/api/v1/meter-reading/*]                            [/api/v1/map-config/*]
   [/api/v1/schedule/my-monthly]                        [/api/v1/reports/*]
            │                                                   │
            ▼                                                   ▼
┌───────────────────────┐                           ┌───────────────────────┐
│      USER PORTAL      │                           │   OPERATIONS PORTAL   │
│   (Mobile-first/PWA)  │                           │    (Desktop-first)    │
├───────────────────────┤                           ├───────────────────────┤
│ • Employee Login      │                           │ • Admin Login         │
│ • HomeHub             │                           │ • Admin Dashboard     │
│ • MeterCamera & OCR   │                           │ • Devices & Meters    │
│ • Meter Worklist      │                           │ • Digital Twin Map    │
│ • Attendance View     │                           │ • Shift & Schedules   │
│ • User Schedule View  │                           │ • Staff Roster        │
│ • Leave Request Modal │                           │ • Reading Inspection  │
│ • PWA Manifest & SW   │                           │ • Reports & Export    │
│                       │                           │ • Audit Logs          │
└───────────┬───────────┘                           └───────────┬───────────┘
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      │
                                      ▼
                        GENUINE SHARED PACKAGES / CORE
                        ├─ api-client (services/api.ts)
                        ├─ contracts (types.ts)
                        ├─ design-tokens (index.css)
                        └─ common-ui (Loading, Error, Modals)
```

---

## 6. Kết luận & Phương hướng thực hiện

1. Kiến trúc hiện tại hoàn toàn phù hợp để chia tách thành hai ứng dụng:
   - **User Portal (`user-web`):** Đóng gói phục vụ nhân viên hiện trường, duy trì PWA/Service Worker, camera OCR và các màn hình cá nhân. Tuyệt đối loại bỏ mã nguồn của 8 tab Admin khỏi bundle.
   - **Operations Portal (`operations-web`):** Đóng gói phục vụ quản trị viên và điều hành cảng, giao diện desktop-first, tích hợp bản đồ số Digital Twin và quản lý thiết bị/nhân sự. Tuyệt đối không chứa UI chụp ảnh camera/nhập chỉ số hiện trường.
2. Hai ứng dụng chia sẻ chung 100% hợp đồng API (`types.ts`), client gọi API (`api.ts`), hệ thống token màu sắc (`index.css`), và các UI primitives cơ bản.
3. Không thực hiện các thao tác di chuyển tệp phá hủy (destructive file moves) làm ảnh hưởng đến các thay đổi uncommitted hiện có trên nhánh `feature/v16e-network-map-overlay-r1`.
