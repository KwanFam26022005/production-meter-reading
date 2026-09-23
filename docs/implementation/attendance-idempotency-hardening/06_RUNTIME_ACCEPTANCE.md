# 06. Quy Trình Tiếp Nhận & Khởi Động Dịch Vụ Vận Hành (Runtime Acceptance)
**Tài liệu:** Runtime Acceptance & Service Deployment Procedure  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Trạng thái:** DOCUMENTED & READY FOR ADMIN RESTART  

---

## 1. Cơ Chế Nạp Mã & Cơ Sở Dữ Liệu Của Dịch Vụ Windows

- **Dịch vụ Windows:** `MeterReadingBackend` (quản lý qua `nssm.exe`).
- **Thực thi:** `-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`.
- **Cơ chế nạp mã nguồn:** Uvicorn trong môi trường production không sử dụng cờ `--reload`. Do đó, các thay đổi mã nguồn trong các file Python (`models.py`, `attendance.py`, `db.py`, `schemas.py`, `main.py`) **chưa được nạp vào tiến trình đang chạy**.
- **Cơ chế áp dụng Migration:** Hàm `migrate_db()` được cấu hình chạy tự động trong sự kiện khởi tạo (startup lifespan) của FastAPI trong `main.py`. Khi dịch vụ được khởi động lại:
  1. `migrate_db()` sẽ chạy tự động và an toàn trên CSDL `data/app.db`.
  2. Bổ sung các cột `client_submission_id` và `payload_sha256` nếu chưa có.
  3. Tạo chỉ mục từng phần: `uq_attendance_user_client_sub_id` trên `(user_id, client_submission_id) WHERE client_submission_id IS NOT NULL`.
  4. Nạp logic đối soát và bảo vệ ảnh không xóa nhầm sau commit.

---

## 2. Quy Trình Khởi Động Lại Có Thẩm Quyền (Admin Restart Procedure)

> [!IMPORTANT]
> Theo quy định an toàn vận hành, AI Agent **KHÔNG** tự ý thực hiện khởi động lại Windows Service. Quản trị viên hệ thống (Administrator) thực hiện các bước sau trong cửa sổ PowerShell với quyền Administrator (Run as Administrator):

### Bước 1: Kiểm tra trạng thái và nhật ký trước khi khởi động
```powershell
Get-Service -Name "MeterReadingBackend"
Get-Content -Path "backend_out.log" -Tail 20
```

### Bước 2: Khởi động lại dịch vụ Windows
```powershell
Restart-Service -Name "MeterReadingBackend"
```

### Bước 3: Kiểm tra trạng thái sau khởi động
```powershell
Get-Service -Name "MeterReadingBackend"
```
*Kỳ vọng:* `Status: Running`.

---

## 3. Danh Mục Kiểm Tra Xác Nhận Sau Khởi Động (Post-Restart Acceptance Checklist)

Sau khi quản trị viên đã kích hoạt restart dịch vụ thành công, thực hiện các bước xác thực sau:

1. **Kiểm tra Endpoint Sức Khỏe Hệ Thống (Health Check):**
   ```powershell
   curl.exe -s http://localhost:8000/health
   ```
   *Kỳ vọng:* Trả về JSON: `{"status":"ok","pipeline_version":"...","models_loaded":true}`.

2. **Kiểm tra CSDL Đã Tự Động Di Trú (Schema Migration Verification):**
   ```powershell
   python -c "import sqlite3; conn = sqlite3.connect('data/app.db'); cur = conn.cursor(); cur.execute('PRAGMA table_info(attendance_events)'); print([r[1] for r in cur.fetchall()]); conn.close()"
   ```
   *Kỳ vọng:* Danh sách cột xuất hiện `client_submission_id` và `payload_sha256`.

3. **Kiểm tra Truy Vấn Đối Soát Không Tạo Dữ Liệu Rác:**
   Truy cập `GET /api/v1/attendance/today` với tài khoản kiểm thử cách ly (hoặc qua trình duyệt đã đăng nhập).
   *Kỳ vọng:* Trả về HTTP 200, phản hồi chứa đầy đủ các trường `photo_sha256`, `payload_sha256`, `client_submission_id`.

4. **Kiểm tra Không Suy Giảm Phân Hệ Ghi Chỉ Số (Meter Reading & Home Hub):**
   Mở giao diện Web tại `http://localhost:5173`, xác nhận Home Hub hiển thị đúng 5 trạng thái (hoạt động bình thường, danh sách chỉ số và bản đồ số không bị ảnh hưởng).

---

## 4. Cam Kết Không Ảnh Hưởng Dữ Liệu Nhân Viên Thật

- Tuyệt đối không tạo bất kỳ lượt chấm công thử nghiệm nào bằng tài khoản nhân viên thật trên CSDL vận hành (`data/app.db`).
- Mọi kiểm thử tự động đã được cô lập hoàn toàn trên CSDL tạm thời `data/test_attendance_recon.db` và thư mục ảnh tổng hợp `data/test_attendance_recon_photos`.
- Bản sao lưu `data/app.db.bak_hardening` sẵn sàng phục vụ khôi phục nguyên trạng tức thì nếu xảy ra sự cố bất khả kháng.
