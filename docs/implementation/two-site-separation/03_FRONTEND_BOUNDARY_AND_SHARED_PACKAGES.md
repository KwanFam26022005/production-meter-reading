# Phase 1 & 2: Frontend Boundary & Shared Packages

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `03_FRONTEND_BOUNDARY_AND_SHARED_PACKAGES.md`  
**Mục tiêu:** Xác lập ranh giới mã nguồn rõ ràng giữa User Portal, Operations Portal và các gói chia sẻ dùng chung (Shared Packages).

---

## 1. Nguyên tắc Tổ chức Thư mục & An toàn Git

Theo quy tắc an toàn cốt lõi:
- Local repository hiện đang chứa các chỉnh sửa uncommitted trên nhánh `feature/v16e-network-map-overlay-r1`.
- Không thực hiện di chuyển tệp phá hủy (destructive file moves) làm đứt gãy lịch sử Git hoặc xung đột với uncommitted work.
- Áp dụng cấu trúc **"Non-destructive Modular Split"** trong `frontend/` kết hợp với giao diện mở rộng chuẩn hóa `apps/` và `packages/`.

```
production-meter-reading/
├── apps/
│   ├── user-web/              # Facade / Documentation & Root package bindings
│   └── operations-web/        # Facade / Documentation & Root package bindings
├── packages/
│   ├── api-client/            # Shared API client & error boundaries
│   ├── contracts/             # Authoritative TypeScript types & contracts
│   └── ui/                    # Reusable UI primitives (Loading, Error, Modals)
├── frontend/
│   ├── src/
│   │   ├── apps/
│   │   │   ├── user/          # User Portal Entry Point & Root Component
│   │   │   │   ├── main.tsx
│   │   │   │   └── UserApp.tsx
│   │   │   └── operations/    # Operations Portal Entry Point & Root Component
│   │   │       ├── main.tsx
│   │   │       └── OperationsApp.tsx
│   │   ├── components/
│   │   │   ├── admin/         # Exclusively imported by Operations Portal
│   │   │   ├── home/          # Exclusively imported by User Portal
│   │   │   └── ui/            # Shared primitives
│   │   ├── features/
│   │   │   ├── map-operations/# Exclusively imported by Operations Portal
│   │   │   └── workspace/     # Exclusively imported by Operations Portal
│   │   ├── services/
│   │   │   └── api.ts         # Authoritative API Client
│   │   └── types.ts           # Authoritative Domain Types
│   ├── user.html              # Dedicated HTML for User Portal
│   ├── operations.html        # Dedicated HTML for Operations Portal
│   ├── vite.config.user.ts    # Dedicated build config for User Portal (-> dist/user)
│   ├── vite.config.operations.ts # Dedicated build config for Operations Portal (-> dist/operations)
│   └── package.json           # Scripts: build:user, build:operations, test:user, test:operations
```

---

## 2. Ranh giới Thành phần Chi tiết (Component Boundaries)

### 2.1. User Portal (`UserApp.tsx`)
- **Chỉ nhập các module phục vụ nhân viên:**
  - `LoginView.tsx` (Form đăng nhập nhân viên)
  - `AuthenticatedShell.tsx` (Khung giao diện di động: Avatar, ca làm việc, nút đăng xuất)
  - `HomeHub.tsx` (Bảng điều khiển cá nhân của nhân viên)
  - `AttendanceView.tsx` (Chấm công chụp ảnh & đối soát lượt vào/ra)
  - `ReadingBatchView.tsx` (Danh sách công tơ theo ca làm việc)
  - `UserScheduleView.tsx` & `LeaveRequestModal.tsx` (Lịch ca & đăng ký nghỉ phép)
  - Quy trình đọc công tơ tập trung: `MeterCamera.tsx`, preview ROI, `ImageViewerModal.tsx`, xác nhận chỉ số, nhập chỉ số thủ công, gắn cờ kiểm tra thực địa, đối soát xung đột.
- **Xử lý tài khoản ADMIN trên User Portal:**
  - Nếu tài khoản có vai trò `ADMIN` đăng nhập vào User Portal, giao diện hiển thị thông báo hướng dẫn rõ ràng: *"Tài khoản Quản trị viên. Bạn đang ở Cổng Nhân viên Hiện trường. Vui lòng chuyển sang Cổng Điều hành (Operations Portal) để quản lý hệ thống."* kèm nút chuyển cổng và nút Đăng xuất.
  - **Tuyệt đối không tự động nạp giao diện Admin** trên User Portal.

### 2.2. Operations Portal (`OperationsApp.tsx`)
- **Chỉ nhập các module phục vụ giám sát & quản trị:**
  - `LoginView.tsx` (Form đăng nhập quản trị)
  - `AdminShell.tsx` (Khung giao diện desktop: thanh bên điều hướng, đồng hồ hệ thống, thông tin người dùng)
  - `AdminDashboard.tsx` (Tổng quan vận hành cảng)
  - `AdminDevicesWorkspace.tsx`, `AdminMeters.tsx`, `AdminAssets.tsx` (Quản lý thiết bị)
  - `OperationalWorkspaceProvider.tsx` & `features/map-operations/*` (Bản đồ số Digital Twin & Topo mạng lưới)
  - `AdminVerification.tsx` (Đối soát & xác thực dữ liệu)
  - `AdminSchedules.tsx` (Quản lý lịch ca & đợt đọc)
  - `AdminStaffRoster.tsx` & `components/admin/roster/*` (Bảng phân ca & duyệt phép)
  - `AdminReadingInspection.tsx` (Soi chi tiết chỉ số & bằng chứng ảnh)
  - `AdminReports.tsx` & `ReportsView.tsx` (Báo cáo sản lượng & xuất CSV)
  - `AdminAudit.tsx` (Nhật ký kiểm toán)
- **Xử lý tài khoản không có quyền trên Operations Portal:**
  - Nếu người dùng có vai trò nhân viên (`EMPLOYEE`, `STAFF`...) cố gắng đăng nhập vào Operations Portal, giao diện hiển thị màn hình từ chối truy cập (Access Denied / 403 UX): *"Truy cập bị từ chối: Cổng Điều hành chỉ dành cho Quản trị viên và Quản lý. Vui lòng truy cập Cổng Nhân viên Hiện trường."* kèm nút đăng xuất.
- **Cách ly tuyệt đối:** Không chứa `MeterCamera`, luồng chụp ảnh OCR, hay giao diện selfie chấm công.

---

## 3. Gói Dùng Chung (Shared Packages Contract)

1. **`packages/contracts` (`frontend/src/types.ts`):**
   - Hợp đồng bất biến: Toàn bộ kiểu dữ liệu nghiệp vụ (`User`, `Meter`, `MeterReadResponse`, `TodayAttendance`, `ReadingBatch`, `ReadingRound`, `AdminDashboardResponse`, v.v.).
   - Đảm bảo tính nhất quán 100% giữa hai frontend khi giao tiếp với cùng một backend FastAPI.

2. **`packages/api-client` (`frontend/src/services/api.ts`):**
   - Khởi tạo `apiFetch` với chế độ `credentials: 'include'`.
   - Cơ chế tự động quản lý CSRF cache (`/api/v1/auth/csrf` -> `X-CSRF-Token`).
   - Bộ lắng nghe hết hạn phiên tập trung (`setOnAuthExpired` -> `notifyAuthExpired`).
   - Đường dẫn tương đối `/api/v1/*` bảo đảm hoạt động đồng nguồn qua reverse proxy.

3. **`packages/ui`:**
   - Các component trạng thái: `LoadingState`, `ErrorState`, `EmptyState`.
   - Các modal tiện ích: `LogoutConfirmModal`, `ImageViewerModal`, `UnsavedWorkConfirmModal`, `VnDatePicker`.
   - Primitives giao diện Cảng Sài Gòn: `SgpPrimitives`.
