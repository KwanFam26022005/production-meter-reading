# Phase 3: Authentication, Host-Only Cookies, CSRF & RBAC

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `04_AUTH_COOKIE_CSRF_AND_RBAC.md`  
**Mục tiêu:** Quy định và chứng minh cơ chế xác thực, quản lý cookie phiên, bảo vệ CSRF và phân quyền vai trò (RBAC) trên kiến trúc hai cổng độc lập.

---

## 1. Cơ chế Xác thực và Quản lý Phiên (Session Management)

### 1.1. Hiện trạng triển khai tại Backend (`backend/app/auth.py`)
- **Lưu trữ phiên:** Bảng cơ sở dữ liệu `SessionModel` (`sessions`), sử dụng mã băm SHA-256 của token phiên ngẫu nhiên 32-byte (`token_hash`).
- **Cookie Phiên:**
  - Tên: `csg_session`.
  - Cấu hình: `httponly=True`, `samesite="lax"`, `path="/"`.
  - Thuộc tính `secure`: Tự động bật khi `ENVIRONMENT=production`.
  - **Không có thuộc tính `Domain`:** Đây là cookie **Host-Only**.

### 1.2. Tính chất Host-Only trên Hai Tên miền Độc lập
- Khi User Portal hoạt động tại `https://user.meter.saigonport.vn` (hoặc tên miền độc lập) và Operations Portal hoạt động tại `https://ops.meter.saigonport.vn`:
  - Trình duyệt sẽ lưu trữ cookie `csg_session` riêng biệt cho từng Host (Host-Only Cookie).
  - Không thiết lập cookie chia sẻ `Domain=.saigonport.vn` để triệt tiêu hoàn toàn nguy cơ tấn công đánh cắp phiên chéo giữa các ứng dụng phụ trợ.
  - **Hệ quả chủ đích:** Người dùng cần đăng nhập độc lập trên từng cổng. Việc đăng xuất tại cổng này không làm ảnh hưởng phiên đang hoạt động tại cổng kia.

---

## 2. Bảo vệ Chống Giả mạo Yêu cầu (CSRF Protection)

### 2.1. Thuật toán Sinh và Kiểm tra CSRF Token
- **Tạo mã:** HMAC SHA-256 giữa khóa bí mật phía máy chủ (`settings.csrf_secret`) và `session_token` của phiên hiện tại:
  $$\text{CSRF\_Token} = \text{HMAC-SHA256}(\text{csrf\_secret}, \text{session\_token})$$
- **Truy xuất:** Client gọi `GET /api/v1/auth/csrf` để nhận token.
- **Xác thực:** Mọi yêu cầu thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) bắt buộc mang theo header `X-CSRF-Token`. Backend so khớp bằng hàm `hmac.compare_digest` để chống tấn công Timing Attack.

### 2.2. Hoạt động trên Kiến trúc Hai Cổng
- Do cả hai frontend đều gọi qua reverse proxy của chính mình với đường dẫn tương đối `/api/v1/*`, trình duyệt xem các cuộc gọi này là **Same-Origin**:
  - Không phát sinh lỗi CORS phức tạp.
  - Header `X-CSRF-Token` được gửi kèm tự nhiên.
  - Backend xác thực token CSRF tương ứng chính xác với session cookie của host đang gọi.

---

## 3. Phân quyền Vai trò Phía Máy chủ (Server-Side RBAC)

> [!IMPORTANT]
> **Quy tắc An ninh Bất biến:** Ranh giới bảo mật nằm tại Backend, không nằm ở giao diện Frontend.

1. **User Portal (Cổng Nhân viên):**
   - Phục vụ nhân viên hiện trường (`EMPLOYEE`, `OPERATOR`, `FIELD_OPERATOR`...).
   - Các API nghiệp vụ yêu cầu `get_current_active_user`:
     - Ghi nhận và đối soát chấm công (`/api/v1/attendance/*`).
     - Đọc chỉ số và xác nhận công tơ (`/api/v1/meter-reading/*`, `/api/v1/read-meter`).
     - Xem lịch ca cá nhân (`/api/v1/schedule/my-monthly`).
   - Nếu tài khoản `ADMIN` đăng nhập vào User Portal: Frontend hiển thị thông báo chuyển hướng sang Operations Portal. Dù Admin có cố tình gọi API nhân viên, các API này vẫn an toàn vì được định danh người dùng rõ ràng.

2. **Operations Portal (Cổng Điều hành & Quản trị):**
   - Phục vụ Quản trị viên (`ADMIN`) và Quản lý (`MANAGER`).
   - Các API quản trị được bảo vệ bởi dependency `require_admin`:
     - Quản lý công tơ & vòng đời (`/api/v1/admin/meters/*`).
     - Quản lý tài sản & topo (`/api/v1/assets/*`).
     - Hiệu chuẩn hình học bản đồ (`/api/v1/map-config/*`).
     - Phân ca & điều phối nhân sự (`/api/v1/admin/schedules/*`).
     - Nhật ký kiểm toán (`/api/v1/admin/audit-logs`).
   - Nếu tài khoản nhân viên thường đăng nhập vào Operations Portal:
     - Frontend hiển thị màn hình 403 Access Denied.
     - Nếu kẻ xấu vượt qua kiểm tra frontend để gửi request trực tiếp đến các endpoint quản trị, Backend trả về ngay lập tức:
       `HTTP 403 Forbidden: {"detail": "Bạn không có quyền thực hiện thao tác này."}`.

---

## 4. Bảng Ma trận Kiểm soát Truy cập (Access Control Matrix)

| Endpoint Backend | Phương thức | Quyền yêu cầu | User Portal | Operations Portal |
| :--- | :---: | :---: | :---: | :---: |
| `/api/v1/auth/login` | POST | Public (Rate Limited) | Cho phép | Cho phép |
| `/api/v1/auth/csrf` | GET | Authenticated | Cho phép | Cho phép |
| `/api/v1/auth/me` | GET | Authenticated | Cho phép | Cho phép |
| `/api/v1/auth/logout` | POST | Authenticated + CSRF | Cho phép | Cho phép |
| `/api/v1/attendance/today` | GET | Active User | Cho phép | Không dùng |
| `/api/v1/attendance` | POST | Active User + CSRF | Cho phép | Không dùng |
| `/api/v1/meter-reading/*` | GET/POST | Active User (+ CSRF) | Cho phép | Không dùng |
| `/api/v1/read-meter` | POST | Active User (+ CSRF) | Cho phép | Không dùng |
| `/api/v1/admin/dashboard` | GET | `require_admin` | **Bị chặn (403)** | Cho phép |
| `/api/v1/admin/meters/*` | ALL | `require_admin` (+ CSRF) | **Bị chặn (403)** | Cho phép |
| `/api/v1/assets/*` | ALL | `require_admin` (+ CSRF) | **Bị chặn (403)** | Cho phép |
| `/api/v1/map-config/*` | ALL | `require_admin` (+ CSRF) | **Bị chặn (403)** | Cho phép |
| `/api/v1/admin/audit-logs` | GET | `require_admin` | **Bị chặn (403)** | Cho phép |
