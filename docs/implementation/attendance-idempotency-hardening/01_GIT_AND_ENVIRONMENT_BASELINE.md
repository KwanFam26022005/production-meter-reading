# 01. Cơ Sở Git, Môi Trường & An Toàn Dữ Liệu Vận Hành
**Tài liệu:** Git & Environment Baseline  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Thời điểm thực hiện:** 21/09/2026 15:05:00 UTC+7  
**Trạng thái:** RUNTIME AUDITED & VERIFIED  

---

## 1. Kiểm Toán Hiện Trạng Git (Git Baseline)

### 1.1. Lệnh Kiểm Tra & Kết Quả
```powershell
git status --short --branch
## feature/v16e-network-map-overlay-r1
 M .agent/skills/saigon-port-ui/SKILL.md
 M backend/app/attendance.py
 M backend/app/db.py
 M backend/app/main.py
 M backend/app/meter_logbook.py
 M backend/app/models.py
 M backend/app/schemas.py
 M frontend/DESIGN_DNA.md
 M frontend/src/App.tsx
 M frontend/src/components/AttendanceView.tsx
 M frontend/src/components/AuthenticatedShell.tsx
 M frontend/src/components/HomeHub.tsx
 M frontend/src/components/MeterCamera.tsx
 M frontend/src/index.css
 M frontend/src/services/api.ts
 M frontend/src/types.ts
```

### 1.2. Nhật Ký Cam Kết Gần Nhất (Git Log)
```text
5d37047 (HEAD -> feature/v16e-network-map-overlay-r1, origin/feature/v16e-network-map-overlay-r1) feat(v16e-r1): handoff desktop UX r1 - admin schedules, reports, logbook & QA capture script
1f0d3eb (backup/pre-v16e-desktop-ux-r1-1f0d3eb) feat(v16e): consolidate information architecture to four workspaces
b5ebd58 (backup/pre-v16e-four-workspaces-b5ebd58) style(network): correct on-map utility network overlay with Saigon Port maritime palette
0e4500a feat(network): implement V16E map-native digital twin utility network overlay
a17335a (recovery/v16e-ui-stabilization) docs(recovery): capture r2 mobile device review evidence
```

### 1.3. Cam Kết An Toàn Tuyệt Đối (Git Safety Adherence)
- **Không reset / clean:** Giữ nguyên 100% các file sửa đổi chưa commit.
- **Không stash:** Không tạo stash mới hoặc xóa stash cũ.
- **Không checkout đè / force checkout:** Không làm mất bất kỳ dòng mã nào.
- **Không push / merge:** Không gửi mã lên remote origin hoặc merge vào master/main.

---

## 2. Kiểm Toán Môi Trường Thực Thi (Runtime Environment)

| Thành Phần | Giá Trị Thực Tế | Ghi Chú |
| :--- | :--- | :--- |
| **Hệ Điều Hành** | Windows 10/11 Enterprise | Vận hành local trên trạm làm việc Cảng Sài Gòn |
| **Python** | `Python 3.10.11` | Môi trường virtualenv: `D:\Projects\production-meter-reading\production-meter-reading\.venv` |
| **Node.js** | `v24.18.0` | Quản lý frontend Vite, React 18, TypeScript 5 |
| **Database Dialect** | SQLite 3 (`sqlite:///./data/app.db`) | Cơ sở dữ liệu cục bộ |
| **Môi Trường Runtime** | `ENVIRONMENT=development` | Cấu hình trong `.env` và `config.py` (`DATA_MODE=SIMULATION`) |

---

## 3. Cấu Hình Dịch Vụ Windows `MeterReadingBackend`

- **Trình điều khiển dịch vụ:** NSSM (`C:\WINDOWS\system32\nssm.exe`)
- **Tên dịch vụ:** `MeterReadingBackend`
- **Trạng thái thực tế:** `Running` (PID 29276)
- **Đường dẫn Python thực thi:** `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe`
- **Tham số dòng lệnh:** `-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
- **Thư mục làm việc (Working Directory):** `D:\Projects\production-meter-reading\production-meter-reading`
- **File nhật ký:** 
  - Stdout: `backend_out.log`
  - Stderr: `backend_err.log`
- **Cơ chế nạp mã nguồn:** Uvicorn chạy **không có cờ `--reload`**, nghĩa là tiến trình đang chạy tải toàn bộ module Python vào bộ nhớ lúc khởi động. Bất kỳ thay đổi nào trong code chỉ có hiệu lực sau khi service được khởi động lại có chủ đích.
- **Quy tắc an toàn nghiêm ngặt:** **Tuyệt đối KHÔNG tự ý khởi động lại dịch vụ Windows khi chưa có lệnh ủy quyền.** Toàn bộ kiểm thử được thực thi trên môi trường cách ly (isolated temporary database và synthetic images).

---

## 4. Bảo Vệ Dữ Liệu Vận Hành & Bản Sao Lưu (Data Safety)

Trước khi thực hiện bất kỳ bước can thiệp schema nào:
1. Đã tạo bản sao lưu vật lý toàn vẹn của CSDL vận hành:
   `Copy-Item -Path "data/app.db" -Destination "data/app.db.bak_hardening"`
   - Kích thước: `11,460,608 bytes` (11.4 MB).
2. Kiểm tra dữ liệu hiện tại trong `attendance_events`:
   - Tổng số bản ghi hiện có: **9 bản ghi** (toàn bộ là dữ liệu lịch sử từ các phiên trước).
   - Không có bản ghi nào bị trùng lặp `(user_id, business_date, event_type)`.
   - CSDL thực tế đang bảo toàn 100% dữ liệu gốc.
