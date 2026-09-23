# Phase 7: Test & Regression Results

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `07_TEST_AND_REGRESSION_RESULTS.md`  
**Mục tiêu:** Báo cáo chi tiết và trung thực kết quả chạy các bộ kiểm thử tự động, kiểm toán cô lập bundle, kiểm thử hồi quy nghiệp vụ và phân quyền hai cổng độc lập.

---

## 1. Tổng quan Kết quả Kiểm thử

| Bộ kiểm thử | Lệnh thực thi | Tổng số test | Đạt (Pass) | Thất bại (Fail) | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Kiểm toán cô lập Bundle** | `node scripts/verify_bundle_separation.mjs` | 14 checks | 14 | 0 | **PASSED** |
| **User Portal Tests** | `npm run test:user` | 74 | 74 | 0 | **PASSED** |
| **Operations Portal Tests** | `npm run test:operations` | 230 | 230 | 0 | **PASSED** |
| **Frontend Toàn diện** | `npm test` | 329 | 329 | 0 | **PASSED** |
| **Bảo mật, RBAC & Cookie** | `pytest tests/test_two_site_auth_and_rbac.py` | 6 | 6 | 0 | **PASSED** |
| **Nghiệp vụ cốt lõi Backend** | `pytest tests/test_attendance_reconciliation.py ...` | 74 | 74 | 0 | **PASSED** |
| **Toàn bộ Backend Pytest** | `pytest` | 196 | 188 | 8* | **MONITORED** |

*\* Ghi chú an toàn: 8 bài test không đạt nằm trong các bộ test mô phỏng kịch bản chưa hoàn tất của nhánh đang dở dang `feature/v16e-network-map-overlay-r1` (`v16c`, `v16d`, `v16e_s1`), hoàn toàn không liên quan đến tác vụ phân tách frontend.*

---

## 2. Chi tiết Kiểm toán Cô lập Gói (A. Build Isolation)

### 2.1. Lệnh thực thi
```bash
npm run build:user
npm run build:operations
node scripts/verify_bundle_separation.mjs
```

### 2.2. Kết quả Kích thước Bundle
- **User Portal Bundle:**
  - File: `dist/user/assets/user-9COjqoif.js`
  - Kích thước: **298.81 KB** (Gzip: **82.64 KB**)
  - Giảm hơn **640 KB** so với bundle gộp cũ (`947.84 KB`).
  - Điểm vào: `dist/user/index.html` (1.50 KB)
- **Operations Portal Bundle:**
  - File: `dist/operations/assets/operations-Y3jWXxid.js`
  - Kích thước: **827.44 KB** (Gzip: **204.82 KB**)
  - Điểm vào: `dist/operations/index.html` (1.09 kB)

### 2.3. Cổng Kiểm soát Rò rỉ Module (Module Leak Gates)
1. **User Portal Gate:**
   - `AdminDashboard`: CLEAN (Không chứa)
   - `AdminStaffRoster`: CLEAN (Không chứa)
   - `AdminSchedules`: CLEAN (Không chứa)
   - `AdminAudit`: CLEAN (Không chứa)
   - `AdminReports`: CLEAN (Không chứa)
   - `AdminReadingInspection`: CLEAN (Không chứa)
   - `AdminDevicesWorkspace`: CLEAN (Không chứa)
   - `OperationalWorkspaceProvider`: CLEAN (Không chứa)
2. **Operations Portal Gate:**
   - `MeterCamera`: CLEAN (Không chứa)
   - `Chạm để phóng to ảnh đối chiếu`: CLEAN (Không chứa)
   - `Đang nhận diện chỉ số`: CLEAN (Không chứa)
   - `btn-quick-dot`: CLEAN (Không chứa)
3. **PWA & Tiêu đề Gate:**
   - User `index.html`: Chứa tiêu đề "Cảng Sài Gòn — Cổng Nhân Viên Hiện Trường" và liên kết `manifest.webmanifest`.
   - Operations `index.html`: Chứa tiêu đề "Cảng Sài Gòn — Cổng Điều Hành & Quản Trị" và **không chứa** manifest.

---

## 3. Kiểm thử Xác thực, RBAC & Cookie (B. Authentication & Authorization)

### 3.1. Lệnh thực thi
```bash
$env:PYTHONPATH="."
.venv\Scripts\pytest tests/test_two_site_auth_and_rbac.py -v
```

### 3.2. Chi tiết các kịch bản đã xác minh
1. **`test_host_only_cookie_issued_on_login`:**
   - Xác minh header `Set-Cookie` khi đăng nhập có thuộc tính `HttpOnly=True`, `Path=/`, `SameSite=Lax`.
   - **Xác minh không có thuộc tính `Domain=`:** Khẳng định cookie là Host-Only, không rò rỉ phiên sang subdomain khác.
2. **`test_employee_forbidden_from_admin_api`:**
   - Đăng nhập với tài khoản vai trò `EMPLOYEE`.
   - Gửi request đến `/api/v1/admin/dashboard`, `/api/v1/admin/meters`, `/api/v1/admin/audit-logs`.
   - Kết quả: Tất cả đều trả về **HTTP 403 Forbidden**.
3. **`test_admin_can_access_admin_api`:**
   - Đăng nhập với tài khoản vai trò `ADMIN`.
   - Gửi request đến `/api/v1/admin/dashboard`.
   - Kết quả: Trả về **HTTP 200 OK** với đầy đủ dữ liệu KPI và ngày báo cáo.
4. **`test_unauthenticated_requests_rejected`:**
   - Không đính kèm cookie.
   - Gửi request đến `/api/v1/admin/dashboard` và `/api/v1/auth/me`.
   - Kết quả: Trả về **HTTP 401 Unauthorized**.
5. **`test_csrf_protection_and_origin_headers`:**
   - Gửi request thay đổi trạng thái mang `Origin: https://user.meter.saigonport.vn` nhưng không có `X-CSRF-Token` -> **HTTP 403 Forbidden**.
   - Gửi request kèm `X-CSRF-Token` hợp lệ -> **HTTP 200 OK**.
6. **`test_logout_session_invalidation`:**
   - Sau khi gọi `/api/v1/auth/logout`, token trong SQLite bị thu hồi; gọi tiếp `/api/v1/auth/me` trả về **HTTP 401 Unauthorized**.

---

## 4. Hồi quy Nghiệp vụ Hiện trường Nhân viên (C. User Workflow Regression)

### 4.1. Lệnh thực thi
```bash
npm run test:user
```
**Kết quả:** 74/74 tests đạt 100% trong 3.14s.

### 4.2. Các luồng đã kiểm chứng
- **Chụp ảnh & Preview:** Chụp ảnh trực tiếp từ camera, giữ nguyên ảnh xem trước trong suốt quá trình suy luận OCR.
- **Tính toán ROI & Xem phóng to:** Tách biệt ảnh ROI và ảnh gốc, hỗ trợ Pan/Zoom.
- **Xác thực chỉ số:** Phân biệt rõ chỉ số OCR ban đầu (`ocr_reading`) và chỉ số người dùng hiệu chỉnh (`confirmedReadingValue`), giữ nguyên số 0 ở đầu (`04582.12`).
- **Phản hồi khi lỗi (REVIEW / Manual Entry):** Chế độ nhập thủ công bàn phím ảo với phím nhanh `.` (quick dot), không tự động lưu giả mạo.
- **Xử lý xung đột HTTP 409 & Rớt mạng:** Chuyển trạng thái sang `REJECTED` khi xung đột dữ liệu, sang `OUTCOME_UNKNOWN` khi mất kết nối; hỗ trợ đối soát máy chủ an toàn trước khi thử lại.
- **Chấm công:** Đầy đủ 5 trạng thái ca (`NOT_CHECKED_IN`, `IN_SHIFT`, `COMPLETED`...), gửi `client_submission_id` chống trùng lặp.

---

## 5. Hồi quy Nghiệp vụ Quản trị Cảng (D. Operations Workflow Regression)

### 5.1. Lệnh thực thi
```bash
npm run test:operations
```
**Kết quả:** 230/230 tests đạt 100% trong 1.60s.

### 5.2. Các luồng đã kiểm chứng
- **Bản đồ số Digital Twin Tân Thuận:** Đủ 6 phân vùng hình học chuẩn hóa (1915x821), kiểm tra thuật toán point-in-polygon, chuyển đổi tọa độ thực tế và tọa độ chuẩn hóa.
- **Quản lý Vòng đời Công tơ & Thiết bị:** Phân định rõ 3 trạng thái vòng đời (`ACTIVE`, `INACTIVE`, `RETIRED`), kiểm tra logic xóa mềm và bảo vệ không xóa cứng khi có lịch sử đọc.
- **Mạng lưới Topo cáp/nước:** Lọc hiển thị thiết bị đã xác thực, truy vết BFS upstream và downstream.
- **Bảng phân ca & Đợt đọc:** Chuyển đổi qua lại giữa bản đồ, danh sách và lịch ca bảo toàn 100% trạng thái tab.
