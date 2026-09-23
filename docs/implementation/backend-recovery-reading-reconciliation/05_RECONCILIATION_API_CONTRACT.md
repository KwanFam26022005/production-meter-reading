# BÁO CÁO 05 — ĐẶC TẢ HỢP ĐỒNG API ĐỐI SOÁT (RECONCILIATION API CONTRACT)

**Thời điểm ban hành:** 2026-09-21T14:15+07:00  
**Tên phân hệ:** Reading Persistence & Authoritative Reconciliation  
**Phương thức:** `GET`  
**Đường dẫn endpoint:** `/api/v1/meter-readings/rounds/{round_id}/meters/{meter_id}`  

---

## 1. Mục đích Thiết kế

Endpoint đối soát cung cấp cơ chế kiểm tra trạng thái lưu trữ thực tế của một công tơ trong một lượt ghi cụ thể mà không làm biến đổi dữ liệu (read-only và strictly idempotent).
Được thiết kế nhằm giải quyết các tình huống:
- Rớt mạng hoặc timeout sau khi gửi yêu cầu `POST /confirm`.
- Phản hồi `HTTP 409 Conflict` cần xác định xem đây là bản ghi của chính nhân viên vừa gửi thành công hay là do nhân viên khác ghi trước.
- Khôi phục phiên làm việc sau khi ứng dụng bị ngắt đột ngột.

---

## 2. Đặc tả Tham số Yêu cầu (Request Specification)

### 2.1. Path Parameters
| Tên tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `round_id` | `string` | Có | Định danh duy nhất của lượt ghi (`ReadingRound.id`) |
| `meter_id` | `string` | Có | Định danh duy nhất của công tơ (`Meter.id`) |

### 2.2. Headers
- `Cookie`: `access_token_cookie=...` (Yêu cầu xác thực tài khoản đang đăng nhập).

---

## 3. Đặc tả Cấu trúc Phản hồi (Response Schema)

### 3.1. Mô hình Pydantic (`MeterReadingReconciliationResponse`)
```python
class MeterReadingReconciliationResponse(BaseModel):
    exists: bool
    reading_id: Optional[str] = None
    meter_id: str
    round_id: str
    batch_id: Optional[str] = None
    reading_status: Optional[str] = None  # "CONFIRMED" | "REVIEW" | None
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    server_timestamp: Optional[str] = None
    formatted_time: Optional[str] = None
    recorded_by_employee_code: Optional[str] = None
```

### 3.2. Trường hợp A: Công tơ ĐÃ ĐƯỢC GHI NHẬN (`exists: true`)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "exists": true,
  "reading_id": "rd-84f9b2a1",
  "meter_id": "meter-001",
  "round_id": "round-20260921-01",
  "batch_id": "batch-20260921-ca1",
  "reading_status": "CONFIRMED",
  "reading": "12540.5",
  "ocr_reading": "12540.5",
  "confirmation_source": "OCR_CONFIRMED",
  "server_timestamp": "2026-09-21T07:15:00.000000Z",
  "formatted_time": "14:15:00 21/09/2026",
  "recorded_by_employee_code": "NV-042"
}
```

### 3.3. Trường hợp B: Công tơ CHƯA ĐƯỢC GHI NHẬN (`exists: false`)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "exists": false,
  "reading_id": null,
  "meter_id": "meter-002",
  "round_id": "round-20260921-01",
  "batch_id": "batch-20260921-ca1",
  "reading_status": null,
  "reading": null,
  "ocr_reading": null,
  "confirmation_source": null,
  "server_timestamp": null,
  "formatted_time": null,
  "recorded_by_employee_code": null
}
```

---

## 4. Bảng Mã Lỗi (HTTP Status Codes)

| Mã HTTP | Tình huống | Ý nghĩa |
| :--- | :--- | :--- |
| `200 OK` | Thành công | Trả về thông tin đối soát (kể cả khi chưa có bản ghi, `exists: false`). |
| `401 Unauthorized` | Chưa đăng nhập | Không có cookie hợp lệ hoặc phiên làm việc đã hết hạn. |
| `404 Not Found` | Không tìm thấy | `round_id` hoặc `meter_id` không tồn tại trong hệ thống. |
| `500 Internal Server Error` | Lỗi máy chủ | Lỗi cơ sở dữ liệu nội bộ không mong muốn. |

---

## 5. Quy tắc Xử lý Trạng thái Phía Frontend (Client State Transitions)

Khi client gọi `handleReconcileSubmission(targetValue)`:

1. **Khớp chỉ số (`rec.exists === true` && `normalize(rec.reading) === normalize(targetValue)`):**
   - Chuyển `submissionPhase` -> `CONFIRMED_BY_SERVER`.
   - Hiển thị banner thành công với ghi chú: *"Chỉ số đã được máy chủ ghi nhận (đối soát xác nhận thành công)"*.
   - Khóa các nút chỉnh sửa để tránh gửi trùng.
2. **Xung đột chỉ số (`rec.exists === true` && `rec.reading !== targetValue`):**
   - Chuyển `submissionPhase` -> `REJECTED`.
   - Cập nhật `conflictError`: *"Chỉ số của công tơ này đã được ghi nhận với giá trị {rec.reading} (Mã NV: {rec.recorded_by_employee_code}). Vui lòng kiểm tra lại."*.
3. **Chưa có bản ghi trên server (`rec.exists === false`):**
   - Chuyển `submissionPhase` -> `NOT_SUBMITTED`.
   - Cho phép nhân viên bấm "Xác nhận" để gửi lại một cách an toàn mà không sợ trùng lặp dữ liệu.
