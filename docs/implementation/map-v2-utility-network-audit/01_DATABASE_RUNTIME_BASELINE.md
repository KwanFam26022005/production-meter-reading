# 01. Kiểm toán Đường cơ sở Database Runtime (Database Runtime Baseline)

## 1. Thông tin Định danh Cơ sở Dữ liệu Thực tế

Qua kiểm tra cấu hình dịch vụ hệ điều hành Windows, biến môi trường, tham số khởi động tiến trình và cấu hình ứng dụng, đường dẫn cơ sở dữ liệu SQLite thực tế đang được backend sử dụng đã được xác định tuyệt đối.

| Thuộc tính | Giá trị kiểm toán | Nguồn bằng chứng |
| :--- | :--- | :--- |
| **DATABASE_URL** | `sqlite:///./data/app.db` | `backend/app/config.py` (Lớp `Settings`) |
| **Đường dẫn Tuyệt đối** | `D:\Projects\production-meter-reading\production-meter-reading\data\app.db` | NSSM Registry `AppDirectory` + `Settings.database_url` |
| **Kích thước File DB** | `11,460,608 bytes` (11.46 MB) | Filesystem inspection (`data\app.db`) |
| **Thời gian cập nhật DB** | `2026-09-21 15:57:57` | Filesystem timestamp |
| **Trạng thái WAL** | **CÓ** (`data\app.db-wal`: `4,849,272 bytes`) | Sửa đổi lúc `22:16:xx 22/09/2026` (Đang hoạt động) |
| **Trạng thái SHM** | **CÓ** (`data\app.db-shm`: `32,768 bytes`) | Khởi tạo lúc `09:22:xx 22/09/2026` |
| **Phiên bản SQLite** | `3.45.1` | Python stdlib `sqlite3.sqlite_version` |
| **Journal Mode** | `WAL` (Write-Ahead Logging) | `PRAGMA journal_mode;` trả về `wal` |
| **Phân loại Môi trường** | **PRODUCTION_RUNTIME / ACTIVE_STAGING** | Dịch vụ Windows `MeterReadingBackend` đang phục vụ trực tiếp |

---

## 2. Bằng chứng Thực thi Dịch vụ Runtime

Hệ thống đang chạy nền dưới dạng một Windows Service chính thức:

```powershell
Get-CimInstance Win32_Service -Filter "Name = 'MeterReadingBackend'"
# Name: MeterReadingBackend, State: Running, StartMode: Auto, PathName: C:\WINDOWS\system32
ssm.exe
```

Chi tiết tham số quản lý bởi NSSM trong Windows Registry (`HKLM:\SYSTEM\CurrentControlSet\Services\MeterReadingBackend\Parameters`):
- **Application**: `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe`
- **AppParameters**: `-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
- **AppDirectory**: `D:\Projects\production-meter-reading\production-meter-reading`
- **AppStdout**: `D:\Projects\production-meter-reading\production-meter-reading\backend_out.log`
- **AppStderr**: `D:\Projects\production-meter-reading\production-meter-reading\backend_err.log`

Tiến trình Python runtime thực tế (`PID 6988`) khởi động từ `09:22:23 22/09/2026`, ghi nhận nhật ký kết nối HTTP và các giao dịch đọc/ghi liên tục vào file `app.db-wal`.

---

## 3. Phân biệt các File `app.db` khác trong Kho lưu trữ

Trong kho lưu trữ tồn tại nhiều file cơ sở dữ liệu SQLite, đã được kiểm tra và loại trừ như sau:

| Đường dẫn File | Dung lượng | Thời gian cập nhật | Vai trò xác định | Lý do loại trừ |
| :--- | :--- | :--- | :--- | :--- |
| `backend\data\app.db` | 430,080 bytes | 13/09/2026 11:35 | Local Dev cũ | Dung lượng nhỏ, không có WAL/SHM, không trùng working directory của service |
| `data\app_backup_20260916_205151.db` | 11,456,512 bytes | 16/09/2026 20:51 | Backup tĩnh | Bản sao lưu đóng băng ngày 16/09 |
| `data\app_backup_pre_map_operations_20260909.db` | 4,997,120 bytes | 09/09/2026 10:47 | Backup tiền Map | Bản sao lưu trước khi tích hợp Map V1 |
| `data\app_test_copy.db` | 11,407,360 bytes | 16/09/2026 20:50 | Test snapshot | Bản sao dùng cho kiểm thử tự động |
| `data\test_app.db` | 630,784 bytes | 21/09/2026 16:06 | Test runner DB | Cơ sở dữ liệu tạm sinh ra từ `pytest` |
| **`data\app.db` (AUTHORITATIVE)** | **11,460,608 bytes** | **21/09/2026 15:57** | **RUNTIME ACTIVE** | **Có WAL (4.8MB) và SHM (32KB), liên kết trực tiếp với service PID 6988** |

---

## 4. Cơ chế Đảm bảo An toàn Tuyệt đối (Strict Read-Only)

Để đảm bảo không ảnh hưởng đến dịch vụ đang hoạt động, quá trình kiểm toán tuân thủ nghiêm ngặt các nguyên tắc:
1. Mở kết nối SQLite với cờ đọc URI chế độ chỉ đọc:
   ```python
   sqlite3.connect('file:D:/Projects/production-meter-reading/production-meter-reading/data/app.db?mode=ro', uri=True)
   ```
2. Tạo một bản sao lưu nhất quán (consistent snapshot) vào thư mục scratch thông qua API `backup()` của SQLite:
   ```python
   src_conn.backup(dst_conn)
   ```
   Cơ chế này tích hợp nguyên vẹn trạng thái từ WAL tại thời điểm kiểm toán mà không thực hiện checkpoint, khóa bảng hay làm gián đoạn backend.
3. **TUYỆT ĐỐI KHÔNG** gọi lệnh ghi, không chạy migrations (`migrate_db()`), không sửa đổi dữ liệu hay restart service.
