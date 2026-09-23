# BÁO CÁO 01 — MÔI TRƯỜNG HỆ THỐNG VÀ GIT BASELINE

**Dự án:** `production-meter-reading`  
**Thời điểm ghi nhận:** 2026-09-21T14:00+07:00  
**Người thực hiện:** Senior Backend & Fullstack QA Engineer  
**Mục tiêu:** Ghi nhận hiện trạng toàn diện môi trường runtime, tiến trình, cơ sở dữ liệu và cấu hình Git trước và sau sự cố.

---

## 1. Hiện trạng Git & An toàn Repository

- **Nhánh hiện tại:** `feature/v16e-network-map-overlay-r1`
- **Commit HEAD:** `5d37047` (V16E-R1 Final: Full test suite 305/305 pass, zero regression)
- **Chính sách an toàn (Git Safety Boundary):**
  - Tuyệt đối KHÔNG thực hiện: `git reset --hard`, `git clean -fd`, `git checkout --force`, `git stash`, `git push`, `git rebase`, hoặc `git merge`.
  - Giữ nguyên vẹn tất cả file untracked và staged/unstaged của các phân hệ trước đó (V16E network map, focused capture deliverables, dresscode audit).

### Trạng thái Git Status
```text
## feature/v16e-network-map-overlay-r1
 M backend/app/main.py
 M backend/app/meter_logbook.py
 M backend/app/schemas.py
 M frontend/src/App.tsx
 M frontend/src/services/api.ts
 M frontend/src/types.ts
 M frontend/tests/userMeterVerificationRefinement.test.ts
?? tests/test_meter_logbook_datetime_sort.py
?? tests/test_meter_reading_reconciliation.py
?? docs/implementation/backend-recovery-reading-reconciliation/
```

---

## 2. Thông tin Máy chủ & Môi trường Runtime

- **Hệ điều hành:** Windows 11 (build x86_64)
- **Shell:** PowerShell (`pwsh`)
- **Python Runtime:** Python 3.10.11 (`D:\User\Appdata\python.exe`)
- **Node.js Runtime:** Node.js v24.18.0, npm 10.x, Vite v6.4.3
- **Cơ sở dữ liệu:** SQLite cục bộ tại `data/app.db` (Kích thước: 11.4 MB)
  - Integrity check: `PRAGMA integrity_check;` -> `ok`
  - Bảng dữ liệu chính: `meters`, `reading_batches`, `reading_rounds`, `meter_readings`, `meter_reading_provenance`, `users`, `map_configurations`.

---

## 3. Kiến trúc Quản lý Tiến trình Dịch vụ (Process Architecture)

- **Cơ chế quản lý tiến trình:** Windows Service `MeterReadingBackend`.
- **Service Wrapper:** NSSM (`C:\WINDOWS\system32\nssm.exe`).
- **Account thực thi:** `LocalSystem` (Session 0).
- **Cổng dịch vụ backend:** `127.0.0.1:8000`.
- **Cổng dịch vụ frontend (dev/preview):** `127.0.0.1:5173` / tĩnh bundle tại `dist/`.
- **Lưu ý quan trọng về khởi động lại dịch vụ:**
  - Vì tiến trình `uvicorn` trên cổng 8000 được chạy dưới quyền `LocalSystem` của Windows Service `MeterReadingBackend`, các token người dùng bình thường (`msi\user`) không có quyền gửi tín hiệu dừng trực tiếp (`taskkill /F` trả về `Access is denied`).
  - Khi cần tải lại mã nguồn Python mới nhất vào bộ nhớ runtime của tiến trình dịch vụ đang chạy, người vận hành cần chạy PowerShell với quyền Administrator:
    ```powershell
    Restart-Service MeterReadingBackend
    ```
    hoặc:
    ```powershell
    nssm restart MeterReadingBackend
    ```

---

## 4. Bảo toàn Dữ liệu và Bằng chứng

- **Cơ sở dữ liệu SQLite (`data/app.db`):** Giữ nguyên vẹn toàn bộ 12 công tơ cảng Tân Thuận, các ca làm việc, lượt ghi chỉ số lịch sử và dữ liệu chấm công. Không xóa bảng, không drop schema, không truncate.
- **Dữ liệu hình ảnh bằng chứng & Trọng số AI:** Toàn bộ thư mục `data/` và trọng số PaddleOCR / YOLOv8 giữ nguyên vẹn 100%.
- **Bảo mật:** Không in token đăng nhập, session cookie hoặc mật khẩu trong bất kỳ file log hay báo cáo nào.
