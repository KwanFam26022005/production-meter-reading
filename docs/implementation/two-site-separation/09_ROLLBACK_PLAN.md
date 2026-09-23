# Phase 8 & 9: Independent Frontend Rollback Plan

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `09_ROLLBACK_PLAN.md`  
**Mục tiêu:** Định nghĩa quy trình hoàn nguyên độc lập chi tiết từng bước cho User Portal và Operations Portal, bảo đảm thời gian gián đoạn (RTO) < 30 giây và không mất mát dữ liệu (RPO = 0).

---

## 1. Nguyên tắc Hoàn nguyên Độc lập (Core Principles)

1. **Phân tách Rủi ro (Fault Isolation):**
   - Sự cố ở một frontend không bao giờ được phép lây lan sang frontend kia.
   - Nếu bản phát hành mới của Operations Portal bị lỗi JavaScript màn hình bản đồ, việc hoàn nguyên Operations Portal **tuyệt đối không đụng chạm đến file tĩnh của User Portal**.
2. **Không Khởi động lại Backend (Zero Backend Disruption):**
   - Việc rollback chỉ là thao tác tráo đổi tệp tĩnh HTML/JS/CSS trong thư mục web server (`dist/user` hoặc `dist/operations`).
   - Windows Service `MeterReadingBackend` (FastAPI) và tiến trình nạp mô hình AI trong RAM tiếp tục phục vụ bình thường.
3. **Sao lưu Tự động Trước Khi Rollback (Safety Pre-backup):**
   - Mọi thao tác rollback đều tự động đóng gói trạng thái hiện thời của thư mục đích vào `pre-rollback-backup-<target>-<timestamp>` phục vụ phân tích nguyên nhân gốc (RCA).

---

## 2. Kịch bản Hoàn nguyên Từng Phần

### 2.1. Kịch bản A: Hoàn nguyên Cổng Nhân viên (User Portal Rollback)
- **Dấu hiệu kích hoạt:** Nhân viên báo lỗi màn hình camera trên thiết bị di động, lỗi PWA manifest sau cập nhật, hoặc rớt hiệu năng JavaScript.
- **Lệnh thực thi:**
  ```powershell
  # Cú pháp: powershell -ExecutionPolicy Bypass -File deployment\scripts\rollback_frontend.ps1 -Target user -Version <Phien_Ban_On_Dinh>
  powershell -ExecutionPolicy Bypass -File deployment\scripts\rollback_frontend.ps1 -Target user -Version "20260921-v1.0.0"
  ```
- **Hành động tự động của script:**
  1. Tạo thư mục sao lưu: `deployment/artifacts/pre-rollback-backup-user-<timestamp>`.
  2. Dọn sạch `frontend/dist/user/*`.
  3. Giải nén `deployment/artifacts/user-web-20260921-v1.0.0.zip` vào `frontend/dist/user/`.
  4. Web server ngay lập tức phục vụ phiên bản cũ mà không cần reload proxy.
- **Tác động tới Operations Portal:** Không có (Operations Portal tiếp tục chạy bình thường).
- **Tác động tới Backend:** Không có.

### 2.2. Kịch bản B: Hoàn nguyên Cổng Điều hành (Operations Portal Rollback)
- **Dấu hiệu kích hoạt:** Quản trị viên báo lỗi tải dữ liệu bản đồ số Tân Thuận, lỗi giao diện phân ca, hoặc xung đột CSS desktop.
- **Lệnh thực thi:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File deployment\scripts\rollback_frontend.ps1 -Target operations -Version "20260921-v1.0.0"
  ```
- **Tác động tới User Portal:** Không có (nhân viên ngoài hiện trường tiếp tục đọc chỉ số và chấm công bình thường).

### 2.3. Kịch bản C: Khôi phục Khẩn cấp về Bản dựng Đơn khối (Emergency Legacy Fallback)
- Trong trường hợp bất khả kháng khi hạ tầng mới gặp sự cố toàn diện, hệ thống có thể quay trở lại phục vụ bản dựng đơn khối ban đầu:
  ```powershell
  npm --prefix frontend run build:legacy
  ```
- Bản dựng cũ sẽ được xuất ra `frontend/dist/` và phục vụ như trước khi phân tách.

---

## 3. Thời gian Mục tiêu & Bảng Kiểm tra sau Hoàn nguyên

| Chỉ số | Mục tiêu cam kết | Kết quả kiểm thử thực tế |
| :--- | :---: | :---: |
| **Thời gian khôi phục (RTO)** | $\le 60\text{s}$ | **~2 giây** (kiểm thử thực tế) |
| **Mất mát dữ liệu (RPO)** | $0$ (Không mất dữ liệu) | **0** (Dữ liệu lưu tại SQLite backend) |
| **Gián đoạn dịch vụ backend** | Không gián đoạn | **0 gián đoạn** (Service không khởi động lại) |

### Danh mục kiểm tra sau hoàn nguyên (Post-Rollback Verification):
1. [ ] Kiểm tra URL `https://<portal-domain>/health` trả về `{"models_loaded": true}`.
2. [ ] Mở trình duyệt ẩn danh, đăng nhập thử một tài khoản nhân viên hoặc quản trị.
3. [ ] Xác nhận không còn lỗi JavaScript trên Console trình duyệt.
4. [ ] Thu hồi bản phát hành lỗi trên hệ thống CI/CD để ngăn triển khai lặp lại.
