# 05. Báo Cáo Thực Thi Kiểm Thử Tiêm Lỗi & Tính Bất Biến (Failure Injection Test Results)
**Tài liệu:** Failure Injection Test Results  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Ngày thực thi:** 21/09/2026  
**Môi trường:** Python 3.10.11 (Pytest 9.1.1) / Node.js v24.18.0 (Vitest)  
**Trạng thái:** TESTED & 100% PASSED  

---

## 1. Bảng Tổng Hợp Kiểm Thử Toàn Diện (Full Repository Test Summary)

| Phân Vùng Kiểm Thử | Lệnh Thực Thi Thực Tế | Số Test | Pass | Fail | Skip | Exit Code | Thời Gian |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Attendance Reconciliation Hardening (18 Scenarios)** | `python -m pytest tests/test_attendance_reconciliation.py -v` | **18** | **18** | 0 | 0 | **0** | 7.64s |
| **Auth & Attendance Business Suite** | `python -m pytest tests/test_auth_attendance.py -v` | **17** | **17** | 0 | 0 | **0** | 16.19s |
| **Meter Reading Reconciliation Suite** | `python -m pytest tests/test_meter_reading_reconciliation.py -v` | **4** | **4** | 0 | 0 | **0** | 6.07s |
| **Frontend Full Unit & Integration Suite** | `npm test -- --run` (trong thư mục `frontend/`) | **329** | **329** | 0 | 0 | **0** | 4.45s |
| **Frontend Production Build** | `npm run build` (trong thư mục `frontend/`) | - | **OK** | 0 | - | **0** | 4.90s |
| **TỔNG CỘNG HỆ THỐNG** | | **368** | **368** | **0** | **0** | **0** | - |

> **Giải Quyết Sự Sai Lệch Số Liệu Giữa Các Báo Cáo Cũ (352 vs 355 tests):**  
> - Báo cáo cũ ghi nhận 352 tests dựa trên: 23 backend (6 tests cũ + 17 auth) + 329 frontend tests = 352 tests.
> - Một số tài liệu khác ghi 355 tests do cộng thêm 4 tests của `test_meter_reading_reconciliation.py` trên nhánh frontend cũ (328 tests: 23 + 4 + 328 = 355).
> - **Con số thẩm định chính thức hiện tại:** Sau khi bổ sung toàn diện 18 kịch bản tiêm lỗi bắt buộc cho phân hệ Chấm công, toàn bộ dự án hiện có **39 backend tests** (18 + 17 + 4) và **329 frontend tests**, đạt tổng cộng **368 tests passed (100%)**.

---

## 2. Chi Tiết Kết Quả 18 Kịch Bản Tiêm Lỗi Bắt Buộc (Mandatory Scenarios)

### Kịch bản 01: `test_scenario_01_first_check_in_creates_one_event_and_one_image`
- **Mục tiêu:** Xác nhận lượt CHECK_IN đầu tiên tạo chính xác 01 bản ghi DB và 01 file ảnh trên đĩa có tên trùng với `photo_key`.
- **Kết quả:** **PASSED**. DB tạo 1 row với `event_type='CHECK_IN'`, `status='VALID'`, thư mục lưu trữ tạo đúng 1 file `.jpg`.

### Kịch bản 02: `test_scenario_02_same_id_same_payload_returns_original_event`
- **Mục tiêu:** Gửi lặp lại cùng `client_submission_id` và cùng nội dung ảnh (Idempotent Replay).
- **Kết quả:** **PASSED**. Trả về HTTP 200 kèm `id` của bản ghi cũ, không tạo thêm bản ghi DB mới, không sinh file ảnh thứ hai trên đĩa.

### Kịch bản 03: `test_scenario_03_same_id_different_image_is_rejected`
- **Mục tiêu:** Gửi lặp lại cùng `client_submission_id` nhưng tráo đổi nội dung ảnh khác.
- **Kết quả:** **PASSED**. Trả về HTTP 409 Conflict với thông điệp *"Mã gửi đã được sử dụng nhưng nội dung ảnh tải lên không trùng khớp."*

### Kịch bản 04: `test_scenario_04_same_id_different_event_type_is_rejected`
- **Mục tiêu:** Gửi cùng `client_submission_id` nhưng đổi `event_type` từ `CHECK_IN` sang `CHECK_OUT`.
- **Kết quả:** **PASSED**. Trả về HTTP 409 Conflict với thông điệp *"Mã gửi đã được sử dụng cho sự kiện khác."*

### Kịch bản 05: `test_scenario_05_different_id_same_user_day_action_cannot_create_duplicates`
- **Mục tiêu:** Nhân viên đã vào ca hôm nay, gửi một yêu cầu vào ca mới với `client_submission_id` khác.
- **Kết quả:** **PASSED**. Trả về HTTP 409 Conflict, CSDL vẫn duy trì đúng 1 bản ghi duy nhất trong ngày.

### Kịch bản 06: `test_scenario_06_concurrent_requests_same_id_do_not_create_two_events`
- **Mục tiêu:** Hai yêu cầu đồng thời có cùng `client_submission_id` và payload.
- **Kết quả:** **PASSED**. Cả hai đều nhận kết quả hợp lệ trỏ về cùng một bản ghi duy nhất, không vi phạm ràng buộc CSDL.

### Kịch bản 07: `test_scenario_07_concurrent_requests_different_id_do_not_produce_duplicates`
- **Mục tiêu:** Hai yêu cầu đồng thời với `client_submission_id` khác nhau cho cùng 1 ca làm việc trong ngày.
- **Kết quả:** **PASSED**. Ràng buộc `UniqueConstraint('user_id', 'business_date', 'event_type')` chặn đứng yêu cầu thứ hai, trả về HTTP 409 Conflict.

### Kịch bản 08: `test_scenario_08_failure_before_commit_cleans_up_temporary_file`
- **Mục tiêu:** Giả lập lỗi ném ra TRƯỚC khi `db.commit()` hoàn tất.
- **Kết quả:** **PASSED**. Transaction bị rollback, file ảnh tạm trên đĩa cứng bị xóa lập tức, không để lại ảnh mồ côi.

### Kịch bản 09: `test_scenario_09_failure_after_commit_does_not_remove_committed_image`
- **Mục tiêu:** Giả lập lỗi xảy ra SAU khi `db.commit()` đã hoàn tất (ví dụ: lỗi trong `db.refresh` hoặc serialize).
- **Kết quả:** **PASSED**. Cờ `is_committed = True` bảo vệ file ảnh thành công, file ảnh của bản ghi đã commit **KHÔNG** bị xóa nhầm.

### Kịch bản 10: `test_scenario_10_process_crash_leaves_recoverable_detectable_orphan`
- **Mục tiêu:** Giả lập tiến trình server bị crash đột ngột để lại một file ảnh không có tham chiếu trong CSDL.
- **Kết quả:** **PASSED**. Hàm `audit_and_cleanup_attendance_photos` ở chế độ `dry_run=True` phát hiện chính xác file mồ côi mà không làm gián đoạn hệ thống.

### Kịch bản 11: `test_scenario_11_cleanup_dry_run_never_removes_referenced_or_inflight_image`
- **Mục tiêu:** Tiện ích GC kiểm toán 3 loại file: file hợp lệ trong DB, file in-flight còn mới (<60 phút), và file mồ côi cũ (>2 giờ).
- **Kết quả:** **PASSED**. Dry-run không xóa file nào; Apply chỉ xóa đúng file mồ côi cũ, bảo vệ tuyệt đối file trong CSDL và file đang xử lý.

### Kịch bản 12: `test_scenario_12_missing_reconciliation_event_not_treated_as_proof_of_failure`
- **Mục tiêu:** Truy vấn đối soát khi CSDL chưa có bản ghi.
- **Kết quả:** **PASSED**. Trả về `NOT_RECORDED` / `null`, xác định là "chưa thấy tại thời điểm này", không xem là lỗi thất bại vĩnh viễn.

### Kịch bản 13: `test_scenario_13_matching_photo_hash_different_sub_id_not_treated_as_same_request`
- **Mục tiêu:** Gửi cùng một nội dung ảnh nhưng với một `client_submission_id` khác.
- **Kết quả:** **PASSED**. Server từ chối ghi nhận và trả về HTTP 409 Conflict.

### Kịch bản 14: `test_scenario_14_timeout_after_commit_can_be_reconciled_to_original_event`
- **Mục tiêu:** Yêu cầu đã commit nhưng client bị timeout.
- **Kết quả:** **PASSED**. Lệnh gọi `GET /today` tiếp theo đối soát khớp `client_submission_id` và xác nhận thành công mà không cần gửi lại.

### Kịch bản 15: `test_scenario_15_same_logical_request_safe_to_retry_with_original_id`
- **Mục tiêu:** Client thử lại yêu cầu POST với chính `client_submission_id` và payload ban đầu.
- **Kết quả:** **PASSED**. Server trả về HTTP 200 với thông tin bản ghi cũ một cách an toàn.

### Kịch bản 16: `test_scenario_16_legacy_rows_without_submission_id_remain_readable`
- **Mục tiêu:** Đảm bảo các dòng dữ liệu cũ trong CSDL (với `client_submission_id = NULL` và `payload_sha256 = NULL`) vẫn hoạt động bình thường.
- **Kết quả:** **PASSED**. `GET /today` và `GET /history` đọc dữ liệu thành công không gặp bất kỳ lỗi truy vấn hay serialization nào.

### Kịch bản 17: `test_scenario_17_authentication_csrf_and_user_isolation_enforced`
- **Mục tiêu:** Kiểm tra ranh giới bảo mật: Từ chối yêu cầu không đăng nhập (401), thiếu CSRF (403), và cô lập dữ liệu giữa Người dùng 1 và Người dùng 2.
- **Kết quả:** **PASSED**. Không rò rỉ trạng thái chấm công giữa các tài khoản.

### Kịch bản 18: `test_scenario_18_check_out_sequencing_and_business_date_behavior_preserved`
- **Mục tiêu:** Tan ca trước khi vào ca bị từ chối 409; Vào ca rồi Tan ca thành công; sau khi hoàn tất cả 2 thì `allowed_action` chuyển thành `null`.
- **Kết quả:** **PASSED**. Luồng nghiệp vụ chuẩn được bảo toàn tuyệt đối.
