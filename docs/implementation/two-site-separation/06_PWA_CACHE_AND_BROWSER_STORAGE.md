# Phase 5: PWA, Cache & Browser Storage Isolation

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `06_PWA_CACHE_AND_BROWSER_STORAGE.md`  
**Mục tiêu:** Kiểm toán và cô lập cấu hình Service Worker, PWA Manifest và bộ nhớ trình duyệt (localStorage / sessionStorage) giữa User Portal và Operations Portal.

---

## 1. Phân định PWA và Service Worker

### 1.1. Cổng Nhân viên (User Portal) — Bảo toàn PWA
- **Mục tiêu:** Tối ưu trải nghiệm mobile-first hiện trường, hỗ trợ cài đặt ra màn hình chính điện thoại của nhân viên, mở toàn màn hình (standalone).
- **PWA Manifest (`manifest.webmanifest`):**
  - `name`: "Đọc Công Tơ - Cảng Sài Gòn"
  - `short_name`: "Đọc Công Tơ"
  - `start_url`: "/"
  - `scope`: "/"
  - `display`: "standalone"
  - `theme_color`: "#073B5C"
- **Service Worker (`sw.js`):**
  - Cache tĩnh giới hạn cho shell: `/`, `/index.html`, `/manifest.webmanifest`, các biểu tượng icon.
  - **Chính sách Network-First cho navigation:** Đảm bảo khi phát hành phiên bản mới, người dùng không bị ghim ở file JavaScript cũ.
  - **Tuyệt đối không cache API:** Kiểm tra chặn toàn bộ `/api/*`, phương thức non-GET và domain môi trường thử nghiệm.
  - Kích hoạt đăng ký Service Worker chỉ trên User Portal khi ở môi trường Production.

### 1.2. Cổng Điều hành (Operations Portal) — Không biến thành PWA
- **Mục tiêu:** Ứng dụng quản trị màn hình lớn cho văn phòng cảng, truy cập bằng trình duyệt desktop.
- **Không đăng ký Service Worker:** Loại bỏ hoàn toàn script đăng ký `sw.js` khỏi điểm vào của Operations Portal.
- **Không nhúng manifest PWA:** Tránh việc trình duyệt nhắc nhở "Cài đặt ứng dụng" không cần thiết trên máy tính điều hành.

---

## 2. Cô lập Bộ nhớ Trình duyệt (Browser Storage Audit)

### 2.1. Kiểm toán các biến lưu trữ hiện tại
Qua rà soát mã nguồn:
1. `sessionStorage.getItem('admin_active_tab')` / `setItem('admin_active_tab')`:
   - Biến này dùng để ghi nhớ tab quản trị đang chọn (`dashboard`, `meters`, `schedules`, v.v.).
   - Trước khi chia tách: Nằm lẫn lộn trong file `App.tsx` duy nhất.
   - Sau khi chia tách: Chuyển toàn bộ sang `OperationsApp.tsx`. User Portal **hoàn toàn không truy cập hay đọc/ghi** biến này.

2. **Chính sách Không Lưu Trữ Dữ liệu Nhạy cảm trong Browser Storage:**
   - **Cam kết quyền riêng tư & bảo mật:**
     - Tuyệt đối không lưu trữ ảnh selfie chấm công trong `localStorage` hay `sessionStorage`.
     - Tuyệt đối không lưu trữ ảnh chụp công tơ, token phiên, hay mật khẩu người dùng trong bộ nhớ trình duyệt.
     - Dữ liệu ảnh chỉ tồn tại dưới dạng Blob URL tạm thời trong RAM và bị thu hồi (`URL.revokeObjectURL`) ngay khi kết thúc tác vụ hoặc đổi ca.
     - Trạng thái đăng nhập duy trì hoàn toàn bằng cookie máy chủ `csg_session` (HttpOnly).

### 2.2. Ma trận Cô lập Trình duyệt

| Thành phần | Cổng Nhân viên (User Portal) | Cổng Điều hành (Operations Portal) |
| :--- | :--- | :--- |
| **Origin Trình duyệt** | `https://<user-domain>` | `https://<operations-domain>` |
| **Cookie Session Store** | Host-Only (`<user-domain>`) | Host-Only (`<operations-domain>`) |
| **Service Worker Scope** | Scope `/` tại Origin User | Không đăng ký SW |
| **Cache Storage Name** | `csg-meter-reading-shell-v2` | Không dùng Cache Storage |
| **`sessionStorage` Keys** | Trống (không lưu tab admin) | `admin_active_tab` |
| **`localStorage` Keys** | Không lưu trữ dữ liệu nhạy cảm | Không lưu trữ dữ liệu nhạy cảm |
