# BÁO CÁO NGHIỆM THU — AVATAR STATUS & ZERO-GREETING HOME HUB
**Hệ thống:** Ghi Chỉ Số Công Tơ Nước Cảng Sài Gòn (CSG-OPS)  
**Nhánh:** `feature/v16e-network-map-overlay-r1`  
**HEAD Commit:** `5d37047`  
**Thời gian thực hiện:** 21/09/2026  
**Trọng tâm:** Loại bỏ hoàn toàn khối định danh riêng/lời chào tại User Home Hub, chuyển trạng thái ca vào Avatar Header (`N◉`) và mở rộng Account Popover.

---

## 1. TỔNG QUAN THIẾT KẾ & PHẠM VI HOÀN TẤT

### 1.1. Zero-Greeting Home Hub (Giao diện Tinh gọn Tác nghiệp)
- **Xóa bỏ triệt để:** Toàn bộ thẻ/khối thông tin riêng (`.workspace-user-context`), tên người dùng, mã nhân viên, chức vụ, lời chào buổi sáng/chiều/xin chào và badge trạng thái ca cũ trên Home Hub.
- **Bố cục trực diện:** Ngay dưới Header chuẩn hóa, nội dung đầu tiên của màn hình là feed tác nghiệp với thẻ nổi bật `VIỆC CẦN LÀM` (Hero Action Card) hoặc `CẬP NHẬT HÔM NAY` (Compact Feed).
- **Khoảng cách thị giác sạch sẽ:** Loại bỏ hoàn toàn khoảng trắng dư thừa do CSS cũ, padding đỉnh đồng nhất `20px`, đảm bảo mắt người vận hành hiện trường lập tức tiếp cận tác vụ cần thực thi.

### 1.2. Avatar Status Indicator (`N◉`)
- **Nền tảng thương hiệu Cảng Sài Gòn:** Nút Avatar tài khoản giữ nguyên nền xanh hải quân (`#003875`, `--sgp-corporate-navy`), chữ cái viết tắt màu trắng (`#FFFFFF`) từ tên nhân viên (fallback `'U'`).
- **Dot chỉ báo trạng thái (`.avatar-status-badge`):** Đặt tại góc trên bên phải (top: -1px, right: -1px, 11x11px, viền 2px tiệp màu Header).
- **Vòng viền tinh tế (`box-shadow` subtle ring):**
  - **Chưa vào ca:** Cam cảnh báo (`#F39200`, `--sgp-corporate-orange`)
  - **Đang trong ca:** Xanh lá thành công (`#167A5A`, `--sgp-success`)
  - **Đã hoàn tất ca:** Xám hoàn thành (`#5E5B5B`, `--sgp-corporate-completed`)
  - **Đang tải:** Xám nhạt trung tính (`#94A3B8`)
  - **Lỗi API / Chưa có dữ liệu:** Trung tính (`#94A3B8`) — **tuyệt đối trung thực, không bao giờ khẳng định giả tạo là "Chưa vào ca"**.
- **Tiếp cận & Hỗ trợ người dùng khiếm thị (A11y):**
  - Gán accessible name trực quan: `aria-label="Mở tài khoản, trạng thái: <statusLabel>"`.

### 1.3. Account Popover (Lưu trữ Hồ sơ & Trạng thái Ca)
- **Bảo lưu đầy đủ hồ sơ nhân sự:** Họ tên đầy đủ (`account-popover-name`), mã nhân viên (`account-popover-code`), vai trò phân quyền (`account-popover-role`).
- **Dòng trạng thái ca chuyên dụng (`account-popover-status-section`):** Hiển thị nhãn "Trạng thái ca", dot chỉ báo màu chuẩn hóa và tên trạng thái hiện tại.
- **Thao tác hệ thống:** Nút đóng popover và nút đăng xuất tài khoản (`account-popover-logout-btn`).

### 1.4. Độc lập & Đồng bộ Dữ liệu (Single Source of Truth)
- Hoisting trạng thái `todayAttendance`, `loadingAttendance`, `attendanceError` lên tầng điều phối `App.tsx`.
- Đồng bộ hóa 100% giữa Avatar trên Shell và Insight Feed trên Home Hub; tự động làm mới khi nhân viên hoàn tất thao tác chấm công và quay trở lại Home Hub (`activeScreen === 'home'`).

---

## 2. BẢNG MÀU DRESSCODE & DESIGN TOKENS ÁP DỤNG

| Thành phần UI | Token CSS | Mã Màu Hex / Box-Shadow | Ý nghĩa & Vai trò |
| :--- | :--- | :--- | :--- |
| **Avatar Header Nền** | `var(--sgp-corporate-navy)` | `#003875` | Nhận diện cốt lõi Cảng Sài Gòn |
| **Avatar Ký tự viết tắt** | `#ffffff` | `#FFFFFF` | Ký tự tên người dùng tương phản cao |
| **Dot Chưa vào ca** | `var(--sgp-corporate-orange)` | `#F39200` | Cảnh báo tác vụ chưa kích hoạt |
| **Ring Chưa vào ca** | `.btn-account-avatar--warning` | `box-shadow: 0 0 0 2px rgba(243, 146, 0, 0.55)` | Vòng hào quang tinh tế |
| **Dot Đang trong ca** | `var(--sgp-success)` | `#167A5A` | Trạng thái ca đang hoạt động bình thường |
| **Ring Đang trong ca** | `.btn-account-avatar--success` | `box-shadow: 0 0 0 2px rgba(22, 122, 90, 0.55)` | Vòng hào quang tích cực |
| **Dot Đã hoàn tất ca** | `var(--sgp-corporate-gray)` | `#5E5B5B` | Trạng thái ca đã kết thúc an toàn |
| **Ring Đã hoàn tất ca** | `.btn-account-avatar--completed` | `box-shadow: 0 0 0 2px rgba(94, 91, 91, 0.45)` | Viền trầm ổn định |
| **Dot Chưa xác định** | `#94a3b8` | `#94A3B8` | Không xác định / Lỗi API mạng |
| **Ring Chưa xác định** | `.btn-account-avatar--unknown` | `box-shadow: 0 0 0 1.5px rgba(148, 163, 184, 0.4)` | Viền trung tính tối thiểu |

---

## 3. DANH SÁCH FILE THAY ĐỔI & MÃ NGUỒN

1. **[`frontend/src/components/AuthenticatedShell.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AuthenticatedShell.tsx)**:
   - Export pure state mapper `resolveAvatarShiftStatus(attendance, loading, error): AvatarShiftStatus`.
   - Mở rộng `AuthenticatedShellProps` nhận `attendance`, `loadingAttendance`, `attendanceError`.
   - Bổ sung dot `.avatar-status-badge` và ring `.btn-account-avatar--${statusVariant}` vào avatar button kèm `aria-label` tự động.
   - Bổ sung khối `.account-popover-status-section` với dot trạng thái và nhãn "Trạng thái ca" bên trong menu popover.

2. **[`frontend/src/App.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx)**:
   - Nâng trạng thái điểm danh lên Shell (`todayAttendance`, `loadingAttendance`, `attendanceError`, `fetchTodayAttendance`).
   - Truyền dữ liệu dùng chung xuống đồng thời cả `AuthenticatedShell` và `HomeHub`.
   - Tự động kích hoạt `fetchTodayAttendance()` khi quay về `activeScreen === 'home'`.

3. **[`frontend/src/components/HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx)**:
   - Xóa bỏ hoàn toàn khối JSX `<section className="workspace-user-context">`.
   - Đặt `<InsightFeed>` làm thành phần trực tiếp đầu tiên trong `.workspace-container`.
   - Giữ lại các hàm tiện ích (`getShortDisplayName`, `formatEmployeeMeta`, `getTimeBasedGreeting`) phục vụ tương thích ngược.

4. **[`frontend/src/index.css`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/index.css)**:
   - Khai báo quy chuẩn `.btn-account-avatar` (40x40px, navy, ring states).
   - Khai báo quy chuẩn `.avatar-status-badge` và 5 biến thể màu (`--warning`, `--success`, `--completed`, `--neutral`, `--unknown`).
   - Khai báo quy chuẩn `.account-popover-status-section`, `.account-popover-status-label`, `.account-popover-status-val`.
   - Loại bỏ triệt để các selector CSS cũ không còn sử dụng (`.workspace-user-context`, `.workspace-operator-name`, `.workspace-subcontext`, `.workspace-employee-meta`, `.workspace-status-badge`).

5. **[`frontend/tests/userAvatarStatus.test.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/userAvatarStatus.test.ts)**:
   - Bộ 6 test kiểm thử toàn diện: pure state mapping, header avatar accessibility, popover metadata & shift status, zero-greeting contract, app sync hoisting, CSS token compliance.

6. **[`frontend/tests/userMinimalIdentity.test.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/userMinimalIdentity.test.ts)**:
   - Cập nhật assertions để đồng bộ với kiến trúc Home Hub không chứa greeting và không chứa identity riêng.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & BUILD PRODUCTION

### 4.1. Kết quả kiểm thử tự động (Unit & Integration Tests)
```text
> production-meter-reading-frontend@1.0.0 test
> node --import tsx --test tests/**/*.test.ts

✔ Minimal Identity: getShortDisplayName extracts short name naturally without greeting salutations (0.4325ms)
✔ Minimal Identity: formatEmployeeMeta formats code and role accurately without trailing bullets (0.2312ms)
✔ Zero-Greeting Home Hub: Complete removal of identity block and salutations (2.1245ms)
✔ Avatar Status Badge: CSS defines indicator dot and shift rings with Saigon Port dresscode (3.0841ms)
✔ Minimal Identity: Preserves priority selection logic and radial invariants (1.2943ms)
✔ Avatar Shift Status: Pure mapper handles all 5 shift states truthfully (0.5123ms)
✔ Header Avatar: Accessible name and class bindings in AuthenticatedShell (1.1092ms)
✔ Account Popover: Houses full identity metadata and dedicated shift status row (1.4312ms)
✔ Zero-Greeting Home Hub: Clean layout with no greeting and no duplicate identity (1.6841ms)
✔ Attendance Sync: App.tsx manages shared attendance and refreshes on return to home (1.3524ms)
✔ CSS Tokens: Avatar and status badges follow Saigon Port palette (2.8945ms)
...
ℹ tests 273
ℹ suites 0
ℹ pass 273
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5260.8ms
```
**Đạt tỷ lệ: 273 / 273 tests PASS (100%)**

### 4.2. Kiểm thử biên dịch TypeScript & Production Build
```text
> production-meter-reading-frontend@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming...
✓ 1710 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                1.46 kB │ gzip:   0.67 kB
dist/assets/auth-login-port-hEED9HAp.webp    119.94 kB
dist/assets/auth-loading-port-BWRuCCDI.webp  130.48 kB
dist/assets/tan-thuan-port-v8-cfaZ-ZJs.webp  496.99 kB
dist/assets/index-Cz4wxvSG.css               346.97 kB │ gzip:  54.50 kB
dist/assets/index-Cd6z3z6B.js                924.33 kB │ gzip: 226.85 kB
✓ built in 4.70s
```
**Biên dịch: 0 lỗi TypeScript, 0 cảnh báo cú pháp nghiêm trọng.**

---

## 5. THƯ VIỆN HÌNH ẢNH NGHIỆM THU (VISUAL ACCEPTANCE GALLERY)

Tất cả ảnh nghiệm thu được chụp tự động bằng Microsoft Edge Headless ở độ phân giải thực tế:
- **Mobile:** 390 × 844 px (`deviceScaleFactor: 2.0`)
- **Tablet:** 768 × 1024 px (`deviceScaleFactor: 2.0`)

| STT | Kịch bản / Trạng thái | Tên tệp hình ảnh | Đường dẫn tệp nghiệm thu |
| :---: | :--- | :--- | :--- |
| **01** | Avatar Chưa vào ca (High-Contrast White on Navy) | `01-avatar-not-checked-in-mobile-390x844.png` | [Xem ảnh](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-avatar-attendance-refinement/screenshots/01-avatar-not-checked-in-mobile-390x844.png) |
| **02** | Avatar Đang trong ca (Success Green Dot with White Border) | `02-avatar-in-shift-mobile-390x844.png` | [Xem ảnh](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-avatar-attendance-refinement/screenshots/02-avatar-in-shift-mobile-390x844.png) |
| **03** | Avatar Hoàn tất ca (Completed Gray Dot with White Border) | `03-avatar-completed-shift-mobile-390x844.png` | [Xem ảnh](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-avatar-attendance-refinement/screenshots/03-avatar-completed-shift-mobile-390x844.png) |
| **04** | Account Popover mở (Navy Avatar on White Card Surface) | `04-account-popover-open-mobile-390x844.png` | [Xem ảnh](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-avatar-attendance-refinement/screenshots/04-account-popover-open-mobile-390x844.png) |
| **05** | Avatar Focus Ring (Golden Yellow Maritime Ring) | `05-avatar-focused-ring-mobile-390x844.png` | [Xem ảnh](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-avatar-attendance-refinement/screenshots/05-avatar-focused-ring-mobile-390x844.png) |

---

## 6. CÁC BẢO ĐẢM BẤT BIẾN & GIỚI HẠN AN TOÀN

1. **Bảo tồn tính bất biến của Git:**
   - Không reset, clean, force checkout, force push hay commit tùy tiện.
   - Nhánh `feature/v16e-network-map-overlay-r1` được giữ nguyên vẹn an toàn.
2. **Bảo tồn hệ thống màu chuẩn hóa:**
   - Tuyệt đối không thay đổi mã hex gốc của thương hiệu Cảng Sài Gòn (`#003875`, `#415C94`, `#FCC959`, `#F39200`, `#167A5A`).
3. **Bảo tồn các chức năng nghiệp vụ khác:**
   - Khu vực Admin, Luồng nhập chỉ số OCR, Bản đồ số Tân Thuận, Menu Radial và Tiến độ vòng cung hoàn toàn nguyên vẹn và không bị ảnh hưởng phụ.
