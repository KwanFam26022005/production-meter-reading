# 05. Báo Cáo Thực Thi Kiểm Thử Độ Tin Cậy (Test Execution Report)
**Phân hệ:** User Attendance (Chấm công Vào ca & Tan ca)  
**Dự án:** Production Meter Reading — Cảng Sài Gòn  
**Ngày thực thi:** 21/09/2026  
**Môi trường:** Python 3.11 (Pytest) / Node.js v20 (Vitest) / Microsoft Edge (Playwright)  

---

## 1. Tổng Hợp Kết Quả Kiểm Thử (Executive Summary)

| Phân Loại Kiểm Thử | Công Cụ | Số Lượng Test | Kết Quả | Tỷ Lệ Đạt |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Attendance & Auth Tests** | `pytest tests/test_auth_attendance.py` | 17 | 17 PASSED | 100% |
| **Backend Attendance Reconciliation Tests** | `pytest tests/test_attendance_reconciliation.py` | 6 | 6 PASSED | 100% |
| **Backend Meter Reading Reconciliation Tests** | `pytest tests/test_meter_reading_reconciliation.py` | 4 | 4 PASSED | 100% |
| **Frontend Attendance Reliability Unit Tests** | `vitest userAttendanceReliability.test.ts` | 3 | 3 PASSED | 100% |
| **Frontend Full Suite Regression Tests** | `npm test -- --run` | 328 | 328 PASSED | 100% |
| **Frontend Production Build** | `npm run build` | - | SUCCESS | 100% |
| **End-to-End Visual QA Deliverables** | `scripts/capture_attendance_reliability_deliverables.mjs` | 9 ảnh + 2 video | Đã bàn giao đầy đủ | 100% |

---

## 2. Chi Tiết Các Ca Kiểm Thử Độ Tin Cậy Backend (`pytest`)

### 2.1. Suite `tests/test_attendance_reconciliation.py`
1. `test_check_in_idempotency_with_client_submission_id`:
   - **Mục tiêu:** Gửi 2 lần cùng `client_submission_id` với cùng một file ảnh.
   - **Kỳ vọng:** Lần 2 trả về HTTP 200, cùng event ID, cùng photo SHA-256, không tạo thêm bản ghi mới trong DB.
   - **Kết quả:** **PASSED** (0.42s).
2. `test_orphan_photo_cleaned_up_on_database_failure`:
   - **Mục tiêu:** Giả lập ngoại lệ cơ sở dữ liệu xảy ra sau khi ghi file ảnh xuống đĩa.
   - **Kỳ vọng:** Database rollback; file ảnh trên đĩa cứng bị xóa lập tức (`unlink`); thư mục lưu trữ không còn tồn tại file mồ côi.
   - **Kết quả:** **PASSED** (0.39s).
3. `test_orphan_photo_cleaned_up_on_integrity_error_race`:
   - **Mục tiêu:** Giả lập race condition vi phạm `UniqueConstraint('user_id', 'date', 'event_type')`.
   - **Kỳ vọng:** Transaction thứ 2 rollback, file ảnh thứ 2 bị xóa, endpoint trả về HTTP 409 Conflict kèm thông điệp rõ ràng.
   - **Kết quả:** **PASSED** (0.41s).
4. `test_sequence_violation_check_out_without_check_in`:
   - **Mục tiêu:** Cố tình gọi `POST /check-out` khi chưa có bản ghi `check-in` trong ngày.
   - **Kỳ vọng:** Trả về HTTP 400 với thông báo vi phạm trình tự nghiệp vụ; không lưu file rác.
   - **Kết quả:** **PASSED** (0.38s).
5. `test_today_summary_endpoint_read_only_and_hash_included`:
   - **Mục tiêu:** Đảm bảo `GET /attendance/today` hoàn toàn không ghi đè dữ liệu (idempotent read-only) và trả về đầy đủ `photo_sha256`, `client_submission_id`.
   - **Kết quả:** **PASSED** (0.35s).
6. `test_history_includes_reconciliation_metadata`:
   - **Mục tiêu:** Đảm bảo danh sách lịch sử chứa thông tin hash và submission ID phục vụ đối soát thanh tra.
   - **Kết quả:** **PASSED** (0.36s).

---

## 3. Chi Tiết Kiểm Thử Frontend (`Vitest`)

### 3.1. Suite `frontend/tests/userAttendanceReliability.test.ts`
1. `should cleanly discriminate among all 5 business attendance states`:
   - Kiểm tra `priorityInsightLogic.ts` phân định độc lập:
     - `LOADING` khi `loadingAttendance === true`.
     - `ERROR` khi `attendanceError === '...'` (không biến thành "Chưa vào ca").
     - `NOT_CHECKED_IN` khi `allowed_action === 'CHECK_IN'`.
     - `IN_SHIFT` khi `allowed_action === 'CHECK_OUT'`.
     - `COMPLETED` khi `allowed_action === null`.
   - **Kết quả:** **PASSED** (12ms).
2. `reconciliation state machine should support the 7 distinct submission phases`:
   - Kiểm tra vòng đời của `AttendanceSubmissionPhase`: `NOT_SUBMITTED` → `SUBMITTING` → `CONFIRMED_BY_SERVER` / `OUTCOME_UNKNOWN` → `RECONCILING` → `NOT_RECORDED` / `CONFLICT` / `REJECTED`.
   - **Kết quả:** **PASSED** (8ms).
3. `reconcileAttendance positive correlation matching logic`:
   - Kiểm tra hàm `reconcileAttendance` khớp chính xác khi có cùng `client_submission_id` hoặc cùng `photo_sha256`, và phát hiện `CONFLICT` khi có bản ghi khác không trùng khớp.
   - **Kết quả:** **PASSED** (9ms).

---

## 4. Bằng Chứng Thực Nghiệm Trực Quan (QA Artifacts)

Toàn bộ 9 ảnh chụp màn hình và 2 video mô phỏng tương tác thực tế đã được lưu trữ tại `docs/implementation/user-attendance-reliability-refinement/`:

### 4.1. Ảnh chụp màn hình (`screenshots/`)
1. `01-homehub-not-checked-in-mobile.png`: Thẻ ưu tiên "Chưa vào ca" trên Home Hub (Mobile).
2. `02-attendance-overview-not-checked-in-mobile.png`: Màn hình tổng quan Chấm công khi chưa vào ca.
3. `03-attendance-camera-view-mobile.png`: Khung ngắm Camera chân dung 3:4 với viền hướng dẫn hình bầu dục.
4. `04-attendance-preview-screen-mobile.png`: Màn hình kiểm tra và xác nhận ảnh selfie đã chụp.
5. `05-attendance-success-check-in-mobile.png`: Màn hình thông báo "✓ VÀO CA THÀNH CÔNG" kèm dấu thời gian hệ thống.
6. `06-attendance-overview-in-shift-mobile.png`: Màn hình tổng quan cập nhật trạng thái "Đang trong ca" và nút "Chấm công tan ca".
7. `07-attendance-outcome-unknown-network-error-mobile.png`: Màn hình cảnh báo "Chưa xác định kết quả" khi gặp lỗi mạng/504 kèm nút "Đối soát trạng thái".
8. `08-attendance-reconciled-success-mobile.png`: Màn hình sau khi đối soát thành công, tự động ghi nhận mà không cần gửi lại.
9. `09-homehub-attendance-error-state-desktop.png`: Giao diện Home Hub trên Desktop khi gặp lỗi kết nối máy chủ, hiển thị rõ thẻ lỗi phân biệt với trạng thái chưa vào ca.

### 4.2. Video tương tác thực tế (`videos/`)
1. `01-standard-check-in-flow.webm` (716 KB): Toàn bộ quy trình chuẩn từ Home Hub → Mở Camera → Chụp ảnh → Xác nhận → Thành công → Cập nhật Home Hub.
2. `02-network-drop-reconciliation-flow.webm` (608 KB): Kịch bản mô phỏng rớt mạng 504 Gateway Timeout → Hiển thị cảnh báo đối soát → Bấm "Đối soát trạng thái" → Xác nhận thành công tức thì.
