# Báo Cáo Triển Khai Hoàn Tất: Củng Cố Tính Bất Biến & Độ Bền Vững Lưu Trữ Phân Hệ Chấm Công
**Chủ đề:** Attendance Idempotency & Persistence Hardening  
**Dự án:** local `production-meter-reading`  
**Kỹ sư thực hiện:** Senior Backend, React/TypeScript, Database Reliability & QA Engineer  
**Thời điểm hoàn tất:** 21/09/2026 15:06:00 UTC+7  
**Trạng thái phân loại:** 
- Mã nguồn & Lược đồ: `IMPLEMENTED`
- Kiểm thử tự động & Tiêm lỗi: `TESTED` (100% Pass)
- Môi trường Runtime: `RUNTIME VERIFIED` (Baseline & DB backup confirmed)
- Nạp dịch vụ Windows: Sẵn sàng cho quản trị viên kích hoạt (`DOCUMENTED PROCEDURE`)

---

## 1. Bảng Trạng Thái Phân Loại Nghiệp Vụ & Kỹ Thuật

| Hạng Mục | Trạng Thái Phân Loại | Diễn Giải & Bằng Chứng |
| :--- | :---: | :--- |
| **Git Safety & Data Protection** | `RUNTIME VERIFIED` | Nhánh `feature/v16e-network-map-overlay-r1` bảo toàn nguyên vẹn. Không reset, không stash, không checkout đè, không push/merge. CSDL `data/app.db` đã được sao lưu toàn vẹn ra `data/app.db.bak_hardening`. |
| **Ràng Buộc Duy Nhất Submission ID** | `IMPLEMENTED` & `TESTED` | Partial Unique Index `uq_attendance_user_client_sub_id` trên `(user_id, client_submission_id) WHERE client_submission_id IS NOT NULL` đã được thêm vào `models.py` và `db.py`. Tương thích tuyệt đối với các bản ghi legacy. |
| **Bảo Vệ Tính Bất Biến (Idempotency)** | `IMPLEMENTED` & `TESTED` | Yêu cầu gửi lại cùng ID và cùng nội dung ảnh trả về chính xác bản ghi cũ mà không tạo ảnh mới hay bản ghi mới. Gửi cùng ID nhưng khác ảnh hoặc khác sự kiện bị từ chối với HTTP 409 Conflict. |
| **Băm Kép (Dual Fingerprinting)** | `IMPLEMENTED` & `TESTED` | Phân tách rạch ròi: `payload_sha256` tính trên bytes gốc HTTP để định danh payload, và `photo_sha256` tính trên file JPEG nén lưu trên đĩa để bảo toàn chứng cứ. |
| **Bảo Vệ Ảnh Tuyệt Đối Sau Commit** | `IMPLEMENTED` & `TESTED` | Sử dụng cờ `is_committed = True`. File ảnh tuyệt đối không bao giờ bị xóa nếu transaction CSDL đã commit thành công, kể cả khi `db.refresh` hoặc mạng gặp sự cố. |
| **Dọn Dẹp Ảnh Khi Tiến Trình Đột Tử (GC)** | `IMPLEMENTED` & `TESTED` | Cung cấp module `backend/app/attendance_gc.py` với chế độ dry-run mặc định, bảo vệ file in-flight (<60 phút) và chỉ xóa file mồ côi đã xác minh khi có cờ `--apply`. |
| **Hợp Đồng Đối Soát Client V2** | `IMPLEMENTED` & `TESTED` | Cập nhật `reconcileAttendance()` lấy `client_submission_id` làm khóa định danh chính. Loại bỏ việc công nhận thành công chỉ dựa trên mã băm ảnh đơn lẻ. |
| **18 Kịch Bản Tiêm Lỗi Bắt Buộc** | `TESTED` (18/18 PASS) | Toàn bộ 18 kịch bản trong `tests/test_attendance_reconciliation.py` đã vượt qua 100%. |
| **Khởi Động Dịch Vụ Windows** | `DOCUMENTED PROCEDURE` | Dịch vụ `MeterReadingBackend` đang chạy phiên bản mã trước đó. Quy trình khởi động lại dịch vụ an toàn đã được đóng gói đầy đủ cho quản trị viên tại `06_RUNTIME_ACCEPTANCE.md`. |

---

## 2. Giải Quyết Triệt Để Các Bất Cập Số Liệu Trong Báo Cáo Cũ

### 2.1. Vấn Đề Số Lượng Test (352 vs 355 vs 368 tests)
- **Nguyên nhân chênh lệch trong quá khứ:**
  - Báo cáo 352 tests: 23 backend tests (6 test đối soát sơ khởi + 17 test auth) + 329 frontend tests.
  - Báo cáo 355 tests: Tính thêm 4 tests của `test_meter_reading_reconciliation.py` trên nhánh frontend cũ (328 tests).
- **Số liệu kiểm chứng thực tế và Authoritative hiện tại:**
  - `tests/test_attendance_reconciliation.py`: **18 PASSED** (Bổ sung toàn bộ 18 kịch bản tiêm lỗi bắt buộc).
  - `tests/test_auth_attendance.py`: **17 PASSED**.
  - `tests/test_meter_reading_reconciliation.py`: **4 PASSED**.
  - *Tổng số Backend Tests:* **39 PASSED (100%)**.
  - *Tổng số Frontend Vitest Tests:* **329 PASSED (100%)**.
  - **TỔNG SỐ TOÀN DỰ ÁN:** **368 PASSED (100%)**.

### 2.2. Vấn Đề Số Lượng Trạng Thái Của Cỗ Máy (7 States vs 8 States)
- Trong `types.ts`, kiểu dữ liệu `AttendanceSubmissionPhase` định nghĩa **chính xác 7 trạng thái**:
  `NOT_SUBMITTED`, `SUBMITTING`, `CONFIRMED_BY_SERVER`, `OUTCOME_UNKNOWN`, `RECONCILING`, `CONFLICT`, `REJECTED`.
- `NOT_RECORDED` là một giá trị kết quả nghiệp vụ (outcome) của hàm API `reconcileAttendance` thông báo rằng máy chủ chưa ghi nhận bản ghi tại thời điểm truy vấn. Khi gặp kết quả này, giao diện người dùng chuyển về phase `NOT_SUBMITTED` kèm thông điệp an toàn cho phép người dùng thử lại cùng `client_submission_id`. Do đó, cỗ máy trạng thái UI có **chính xác 7 phase**.

---

## 3. Tóm Tắt Các Thay Đổi Mã Nguồn (Code Changes)

1. [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py):
   - Thêm cột `payload_sha256 = Column(String(64), nullable=True, index=True)`.
   - Thêm partial unique index `uq_attendance_user_client_sub_id` trên `(user_id, client_submission_id) WHERE client_submission_id IS NOT NULL`.
2. [`backend/app/db.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/db.py):
   - Cập nhật `migrate_db()` tự động thêm cột `client_submission_id`, `payload_sha256` và tạo index `uq_attendance_user_client_sub_id`.
3. [`backend/app/schemas.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py):
   - Thêm trường `payload_sha256` vào `AttendanceEventDetail` và `AttendanceActionResponse`.
4. [`backend/app/main.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py):
   - Trả về `payload_sha256` trong kết quả của `check_in` và `check_out`.
5. [`backend/app/attendance.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance.py):
   - Tính toán `original_payload_sha256` trên byte thô ban đầu.
   - Thẩm định tính bất biến: từ chối 409 nếu gửi cùng ID nhưng khác ảnh hoặc khác sự kiện; trả về bản ghi cũ nếu cùng ID và cùng ảnh.
   - Ranh giới commit: theo dõi cờ `is_committed = True`, triệt tiêu rủi ro xóa file ảnh của bản ghi CSDL đã cam kết.
   - Phân loại lỗi `IntegrityError` bằng cách truy vấn lại CSDL có thẩm quyền.
6. [`backend/app/attendance_gc.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/attendance_gc.py):
   - Xây dựng tiện ích quét dọn ảnh mồ côi khi tiến trình crash với chế độ dry-run mặc định và vùng đệm an toàn 60 phút.
7. [`frontend/src/types.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts):
   - Bổ sung `payload_sha256?: string;` vào `AttendanceDetail` và `AttendanceActionResponse`.
8. [`frontend/src/services/api.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/services/api.ts):
   - Nâng cấp `reconcileAttendance`: dùng `client_submission_id` làm khóa định danh chính, từ chối đối soát thành công nếu chỉ dựa trên mã băm hình ảnh đơn lẻ mà sai lệch ID.
9. [`frontend/src/components/AttendanceView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/AttendanceView.tsx):
   - Khi bấm "Chụp lại" (`handleRetake`), sinh mã gửi mới cho ảnh mới; khi retry sau timeout giữ nguyên mã gửi cũ để đối soát và gửi lại an toàn.
10. [`tests/test_attendance_reconciliation.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/tests/test_attendance_reconciliation.py):
    - Mở rộng đầy đủ 18 kịch bản tiêm lỗi và tính bất biến trên CSDL SQLite cô lập.

---

## 4. Danh Mục Tài Liệu Bàn Giao (Folder Structure)

Toàn bộ tài liệu chi tiết đã được đóng gói tại [`docs/implementation/attendance-idempotency-hardening/`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/attendance-idempotency-hardening/):

```
docs/implementation/attendance-idempotency-hardening/
├── 01_GIT_AND_ENVIRONMENT_BASELINE.md       # Cơ sở Git, thông số môi trường & sao lưu CSDL
├── 02_IDEMPOTENCY_AND_SCHEMA_AUDIT.md       # Bảng kiểm toán 10 hành vi & thiết kế băm kép
├── 03_TRANSACTION_AND_PHOTO_LIFECYCLE.md    # Trình tự giao dịch, bảo vệ commit & GC
├── 04_RECONCILIATION_CONTRACT_V2.md         # Hợp đồng đối soát V2 & bảo mật không lưu ảnh trên F5
├── 05_FAILURE_INJECTION_TEST_RESULTS.md     # Báo cáo chi tiết 18 kịch bản tiêm lỗi & 368 tests
├── 06_RUNTIME_ACCEPTANCE.md                 # Quy trình restart Windows Service cho Quản trị viên
├── 07_REMAINING_RISKS.md                    # Tuyên bố giới hạn kỹ thuật (không thần thánh hóa)
└── IMPLEMENTATION_REPORT.md                 # Báo cáo tổng thể toàn diện (file này)
```
