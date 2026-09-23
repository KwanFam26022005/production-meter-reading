# Phase 8: Controlled Staging & Cutover Strategy

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `08_STAGING_AND_CUTOVER_PLAN.md`  
**Mục tiêu:** Xây dựng kế hoạch chuyển dịch có kiểm soát (Controlled Cutover) từ trang web đơn khối hiện tại sang hai cổng độc lập, bảo đảm không gián đoạn ca làm việc thực địa và duy trì khả năng hoàn nguyên độc lập.

> [!IMPORTANT]
> **Ràng buộc an toàn:** Tác vụ này chuẩn bị sẵn sàng môi trường staging và đóng gói phát hành. **KHÔNG thực hiện chuyển đổi sản xuất (cutover) trong tác vụ này** khi chưa có sự phê chuẩn chính thức từ Ban CNTT Cảng Sài Gòn.

---

## 1. Lộ trình Triển khai 6 Bước (6-Step Controlled Migration)

```
[BƯỚC 1: Hiện tại]
Trang web hiện tại tiếp tục hoạt động nguyên vẹn (:5173 / Production URL)
           │
           ▼
[BƯỚC 2: Kiểm thử Staging]
Triển khai song song cả hai cổng tại môi trường Staging (:5173 User, :5174 Ops)
Kết nối chung vào 1 Backend Staging và 1 DB cô lập
           │
           ▼
[BƯỚC 3: Nghiệm thu Chất lượng Staging]
Kiểm chứng toàn diện 7 luồng nghiệp vụ nhân viên & 8 tab nghiệp vụ quản trị
           │
           ▼
[BƯỚC 4: Đóng gói Bản phát hành Độc lập]
Sinh các gói lưu trữ phiên bản: user-web-<ver>.zip và operations-web-<ver>.zip
           │
           ▼
[BƯỚC 5: Thiết lập Kịch bản Hoàn nguyên (Rollback Gates)]
Kích hoạt quy trình rollback độc lập từng site (thời gian khôi phục < 30 giây)
           │
           ▼
[BƯỚC 6: Chuyển dịch URL Kế thừa (Legacy URL Migration)]
Duy trì cổng cũ có thông báo chuyển dịch nhẹ nhàng, bảo toàn shortcut PWA đã cài đặt
```

---

## 2. Chi tiết Từng Bước Thực hiện

### BƯỚC 1: Giữ nguyên vẹn trang web đang hoạt động (Preserve Current Website)
- Tiếp tục duy trì bản dựng hiện hành tại `frontend/src/App.tsx` và cấu hình Vite mặc định.
- Không xóa bất kỳ tệp nguồn cũ nào.
- Dịch vụ Windows `MeterReadingBackend` tiếp tục chạy liên tục trên cổng 8000.

### BƯỚC 2: Triển khai Staging phục vụ nghiệm thu
- Khởi chạy User Portal Staging:
  ```powershell
  npm --prefix frontend run dev:user
  # Lắng nghe tại: http://localhost:5173
  ```
- Khởi chạy Operations Portal Staging:
  ```powershell
  npm --prefix frontend run dev:operations
  # Lắng nghe tại: http://localhost:5174
  ```
- Cả hai kết nối tới Backend FastAPI duy nhất tại `http://127.0.0.1:8000`.

### BƯỚC 3: Ma trận Nghiệm thu Staging (Validation Checklist)
1. **Đăng nhập & Phiên làm việc:**
   - Nhân viên đăng nhập tại `http://localhost:5173`: Đăng nhập thành công, nhận cookie `csg_session` Host-Only.
   - Quản trị viên đăng nhập tại `http://localhost:5174`: Đăng nhập thành công vào trang tổng quan vận hành.
   - Nhân viên truy cập `http://localhost:5174`: Nhận màn hình **403 Access Denied**.
   - Quản trị viên truy cập `http://localhost:5173`: Nhận màn hình hướng dẫn chuyển sang Cổng Điều hành.
2. **Đối soát & Bằng chứng:**
   - Ghi chỉ số từ User Portal -> Hiện diện ngay lập tức trong bảng điều khiển và phần đối soát ảnh của Operations Portal.
   - Thử nghiệm mất kết nối mạng cục bộ -> Kích hoạt đúng trạng thái `OUTCOME_UNKNOWN` và nút đối soát máy chủ.

### BƯỚC 4: Đóng gói Phát hành Độc lập
- Chạy script đóng gói tự động:
  ```powershell
  powershell -ExecutionPolicy Bypass -File deployment\scripts\build_artifacts.ps1 -Version "20260921-v1.0.0"
  ```
- Sản phẩm đầu ra tại `deployment/artifacts/`:
  - `user-web-20260921-v1.0.0.zip` (Chỉ chứa tài nguyên User Portal & PWA)
  - `operations-web-20260921-v1.0.0.zip` (Chỉ chứa tài nguyên Operations Desktop)

### BƯỚC 5: Kịch bản Hoàn nguyên Tức thì (Instant Independent Rollback)
- Nếu User Portal gặp lỗi sau khi phát hành, quản trị viên chỉ cần hoàn nguyên User Portal mà **không làm gián đoạn Operations Portal và không khởi động lại backend**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File deployment\scripts\rollback_frontend.ps1 -Target user -Version "20260921-v1.0.0"
  ```
- Script tự động sao lưu thư mục lỗi trước khi giải nén phiên bản ổn định đã lưu trữ.

---

## 3. Chiến lược Chuyển dịch URL Cũ (Legacy URL Migration Strategy)

Trong giai đoạn chuyển giao (Dual-run Transition Window):
1. **Không chuyển hướng âm thầm (No Silent Redirect):**
   - Không cấu hình mã HTTP 301 tự động chuyển hướng toàn bộ người dùng khi họ đang nhập dở chỉ số hoặc đang chụp ảnh trong ca.
2. **Bảo tồn Shortcut PWA đã cài:**
   - Nhân viên đã cài đặt PWA từ URL cũ vẫn có thể tiếp tục sử dụng shell cũ cho đến khi hoàn thành ca làm việc.
   - Trên giao diện Home Hub cũ, hiển thị banner thông báo: *"Hệ thống đã nâng cấp phiên bản Cổng Nhân Viên mới. Vui lòng mở đường dẫn https://<user-domain> để cập nhật biểu tượng mới."*
3. **Cửa sổ Chuyển giao (Transition Window):**
   - Duy trì song song tối thiểu 14 ngày làm việc để toàn bộ nhân viên các ca chuyển đổi suôn sẻ.
   - Chỉ thu hồi điểm truy cập cũ sau khi có xác nhận bằng văn bản của Tổ trưởng Vận hành và Ban CNTT Cảng.
