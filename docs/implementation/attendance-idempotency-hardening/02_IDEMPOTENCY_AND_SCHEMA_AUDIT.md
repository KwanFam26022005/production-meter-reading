# 02. Kiểm Toán Tính Bất Biến (Idempotency) & Ràng Buộc Lược Đồ CSDL
**Tài liệu:** Idempotency & Schema Audit  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Trạng thái:** IMPLEMENTED & TESTED  

---

## 1. Bảng Kiểm Toán Hành Vi Thực Tế (Audit Table)

| Mục Kiểm Toán | Hành Vi Hiện Tại (Trước Hardening) | Bằng Chứng Mã Nguồn | Rủi Ro Kỹ Thuật | Yêu Cầu Thay Đổi (Đã Triển Khai) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Sinh & Tái sử dụng Submission ID** | `clientSubmissionId` sinh 1 lần trên FE, nhưng khi bấm "Chụp lại" (`handleRetake`) ID cũ không bị xóa. | `AttendanceView.tsx` (dòng 235 cũ không reset ID). | Nhân viên chụp lại ảnh mới nhưng gửi kèm ID của ảnh cũ; server có thể xem là replay. | Reset `clientSubmissionId` mỗi khi chụp lại ảnh mới; chỉ giữ nguyên ID khi retry cùng một ảnh. |
| **2. Gửi lặp lại cùng ID & cùng nội dung** | Server tìm thấy `existing_sub` và trả về, nhưng không kiểm tra `event_type` hoặc payload hash. | `attendance.py` (dòng 157-167 cũ). | Nếu lặp lại đúng thì thành công, nhưng tạo tiền đề cho việc trả về nhầm sự kiện. | Kiểm tra cả `event_type == existing.event_type` và `payload_sha256 == existing.payload_sha256`. |
| **3. Gửi lặp lại cùng ID nhưng khác ảnh** | Server thấy trùng ID liền lập tức trả về bản ghi cũ mà không so sánh ảnh. | `attendance.py` (dòng 166 cũ: `if existing_sub: return existing_sub`). | Gian lận hoặc lỗi phần mềm: thay ảnh khác vẫn báo thành công bằng ảnh cũ! | Bắt buộc trả về HTTP 409 Conflict: *"Mã gửi đã được sử dụng nhưng nội dung ảnh không trùng khớp"*. |
| **4. Gửi lặp lại cùng ID nhưng khác Event Type** | Server trả về bản ghi cũ (Vd: gửi CHECK_OUT cùng ID với CHECK_IN vẫn trả về CHECK_IN). | `attendance.py` (truy vấn không lọc theo `event_type`). | Sai lệch logic trạng thái chấm công nghiêm trọng. | Bắt buộc trả về HTTP 409 Conflict: *"Mã gửi đã được sử dụng cho sự kiện khác"*. |
| **5. Ranh giới Commit & Xóa ảnh** | `record_attendance` gọi `unlink()` trong khối `except Exception` chung. | `attendance.py` (dòng 260-265 cũ). | Nếu DB commit thành công nhưng `db.refresh` hoặc mạng bị lỗi, ảnh của bản ghi đã commit bị xóa mất! | Dùng cờ `is_committed = True`. Tuyệt đối không xóa file ảnh nếu transaction đã commit thành công. |
| **6. Xung đột Race Condition** | Khi xảy ra `IntegrityError`, server chỉ bắt lỗi chung mà không phân loại nguyên nhân. | `attendance.py` (dòng 227-256 cũ). | Không phân biệt được do trùng lặp ID (replay) hay do trùng ca công nhật. | Truy vấn lại CSDL có thẩm quyền để phân biệt: cùng submission ID hay khác submission ID. |
| **7. Đối soát qua `GET /today`** | Thuật toán chấp nhận `idMatches \|\| hashMatches` (chỉ cần trùng hash là báo thành công). | `api.ts` (dòng 306 cũ). | Trùng hash nhưng khác submission ID có thể do chụp ảnh tương tự hoặc giả mạo. | Lấy `client_submission_id` làm khóa định danh chính. Hash ảnh đơn lẻ không đủ để khẳng định thành công. |
| **8. Băm hình ảnh (Fingerprinting)** | Server chỉ băm ảnh JPEG sau khi OpenCV đã nén lại chất lượng 90 (`persisted_bytes`). | `attendance.py` (dòng 66-74 cũ). | Mã băm của client (tính trên raw file) không bao giờ khớp với mã băm của server! | Tính thêm `payload_sha256` trên mảng bytes NGUYÊN BẢN của request để định danh payload. |
| **9. Ràng buộc CSDL với Submission ID** | Chỉ có chỉ mục thường `Index('ix_attendance_events_client_submission_id')`, không có Unique Constraint. | `models.py` & `db.py`. | CSDL không ngăn chặn được 2 transaction đồng thời ghi cùng một `client_submission_id`. | Thêm Partial Unique Index trên `(user_id, client_submission_id) WHERE client_submission_id IS NOT NULL`. |
| **10. Bản ghi cũ không có ID (Legacy rows)** | Cột `client_submission_id` là NULL trên các dòng dữ liệu cũ. | CSDL SQLite `data/app.db`. | Nguy cơ vi phạm unique constraint nếu không hỗ trợ NULL. | Sử dụng partial index SQLite cho phép nhiều giá trị NULL, xử lý an toàn tương thích ngược. |

---

## 2. Thiết Kế Lược Đồ CSDL & Ràng Buộc Bất Biến

### 2.1. Partial Unique Index trên SQLite
Nhằm đảm bảo một `client_submission_id` chỉ thuộc về duy nhất một bản ghi của người dùng đó (scoped to user), nhưng vẫn tương thích hoàn toàn với các dòng legacy có `client_submission_id = NULL`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_user_client_sub_id 
ON attendance_events (user_id, client_submission_id) 
WHERE client_submission_id IS NOT NULL;
```

### 2.2. Khóa Duy Nhất Nghiệp Vụ Theo Ngày (Business Invariant)
Vẫn duy trì nghiêm ngặt ràng buộc:
```python
UniqueConstraint("user_id", "business_date", "event_type", name="uq_user_date_event")
```
Một nhân viên trong một ngày công lịch (`Asia/Ho_Chi_Minh`) chỉ được phép có tối đa 01 lượt `CHECK_IN` và 01 lượt `CHECK_OUT`.

---

## 3. Kiến Trúc Băm Kép (Dual-Hash Architecture)

Nhằm giải quyết triệt để sự bất đối xứng giữa ảnh gốc tải lên và ảnh đã chuẩn hóa nén JPEG:

1. **`payload_sha256` (Original Payload Fingerprint):**
   - Tính toán trực tiếp trên mảng byte thô nhận được từ HTTP Request:
     `original_payload_sha256 = hashlib.sha256(image_bytes).hexdigest()`
   - Dùng để xác thực tính toàn vẹn của yêu cầu gửi lên: đảm bảo cùng một `client_submission_id` không bị tráo đổi nội dung ảnh.
2. **`photo_sha256` (Normalized Persisted Evidence Hash):**
   - Tính toán trên mảng byte của file JPEG chất lượng 90 sau khi OpenCV xử lý loại bỏ EXIF metadata và chuẩn hóa định dạng:
     `photo_sha256 = hashlib.sha256(persisted_bytes).hexdigest()`
   - Dùng làm chứng cứ lưu trữ bất biến phục vụ thanh tra và đối soát tính toàn vẹn file trên đĩa cứng.
