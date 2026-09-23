# 04. Hợp Đồng Đối Soát (Reconciliation Contract) Frontend - Backend
**Phân hệ:** User Attendance (Chấm công Vào ca & Tan ca)  
**Dự án:** Production Meter Reading — Cảng Sài Gòn  
**Ngày lập:** 21/09/2026  

---

## 1. Nguyên Lý Thiết Kế Hợp Đồng

Khi nhân viên chấm công trên thiết bị di động tại hiện trường cảng biển, kết nối 4G/Wifi thường xuyên chập chờn. Yêu cầu POST có thể đã đến máy chủ và được ghi nhận thành công, nhưng gói tin phản hồi HTTP 200 bị thất lạc (Network Drop / 504 Gateway Timeout).

Nếu client mù quáng bấm gửi lại (blind retry):
- Gây lỗi 400 vi phạm thứ tự hoặc 409 Conflict.
- Gây hoang mang cho người dùng và tạo ra các yêu cầu rác.

Hệ thống triển khai giao thức đối soát hai chiều (**Reconciliation Protocol**) dựa trên:
1. Khóa định danh phiên gửi (`client_submission_id`).
2. Mã băm hình ảnh (`photo_sha256`).
3. Truy vấn trạng thái có căn cứ (`GET /api/v1/attendance/today`).

---

## 2. Đặc Tả Giao Diện API Đối Soát

### 2.1. Yêu Cầu Ghi Nhận: `POST /api/v1/attendance/check-in` & `check-out`
- **Content-Type:** `multipart/form-data`
- **Các trường gửi lên:**
  - `photo`: File ảnh selfie (JPEG/PNG, dung lượng <= 5MB).
  - `client_submission_id` *(Mới)*: Chuỗi định danh ngẫu nhiên do client sinh ra trước khi gửi (Ví dụ: `att_1726903200000_x9a8f`).
- **Header:** `X-CSRF-Token`
- **Phản hồi Thành Công (HTTP 200):**
  ```json
  {
    "status": "success",
    "id": "att-evt-001",
    "event_type": "CHECK_IN",
    "server_timestamp": "2026-09-21T07:05:00Z",
    "formatted_time": "07:05:00 - 21/09/2026",
    "message": "Đã ghi nhận vào ca thành công lúc 07:05:00 - 21/09/2026.",
    "photo_sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "client_submission_id": "att_1726903200000_x9a8f"
  }
  ```
- **Xử lý Idempotency trên Server:** Nếu nhận được `client_submission_id` đã tồn tại trong CSDL cho user đó trong ngày, server không tạo bản ghi mới mà trả về ngay bản ghi hiện có kèm HTTP 200.

---

### 2.2. Truy Vấn Đối Soát: `GET /api/v1/attendance/today`
- **Mục đích:** Đọc hiện trạng chấm công trong ngày của người dùng mà không làm thay đổi dữ liệu (Read-only query).
- **Phản hồi (HTTP 200):**
  ```json
  {
    "date": "2026-09-21",
    "check_in": {
      "id": "att-evt-001",
      "timestamp": "2026-09-21T07:05:00Z",
      "formatted_time": "07:05:00 - 21/09/2026",
      "status": "VALID",
      "photo_sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "client_submission_id": "att_1726903200000_x9a8f"
    },
    "check_out": null,
    "allowed_action": "CHECK_OUT"
  }
  ```

---

## 3. Thuật Toán Đối Soát Phía Frontend (`reconcileAttendance`)

Hàm `reconcileAttendance(targetAction, clientSubmissionId, photoSha256)` trong `src/services/api.ts` thực thi quy trình thẩm định logic 4 bước:

```typescript
// Trích đoạn thuật toán đối soát:
1. Gọi GET /api/v1/attendance/today
2. Trích xuất event tương ứng với targetAction (check_in hoặc check_out).
3. Thẩm định tương quan:
   a. NẾU event == null:
      -> KẾT LUẬN: NOT_RECORDED (Máy chủ chưa ghi nhận). Cho phép client gửi lại an toàn.
   b. NẾU event != null:
      - Kiểm tra matchById: event.client_submission_id === clientSubmissionId
      - Kiểm tra matchByHash: event.photo_sha256 === photoSha256
      - NẾU (matchById || matchByHash):
        -> KẾT LUẬN: RECONCILED_SUCCESS (Chính yêu cầu vừa rồi đã được lưu thành công trên máy chủ).
           Chuyển UI sang màn hình Thành công, không gửi lại.
      - NẾU KHÔNG KHỚP cả 2:
        -> KẾT LUẬN: CONFLICT (Đã có một bản ghi khác được tạo từ trước).
           Cảnh báo người dùng về xung đột dữ liệu.
```

---

## 4. Bảng Chuyển Đổi Trạng Thái UI (`AttendanceSubmissionPhase`)

```
+------------------+       Bấm Xác nhận       +------------------+
|  NOT_SUBMITTED   | -----------------------> |    SUBMITTING    |
+------------------+                          +------------------+
         ^                                              |
         | An toàn gửi lại                              | 
         |                                              v
+------------------+      Bấm "Đối soát"      +------------------+
|  NOT_RECORDED    | <----------------------- | OUTCOME_UNKNOWN  |  (Khi gặp Timeout / 5xx / Drop)
+------------------+                          +------------------+
                                                        |
                                                        | Đối soát thành công (khớp ID/Hash)
                                                        v
                                              +---------------------+
                                              | CONFIRMED_BY_SERVER |
                                              +---------------------+
```

- **Khi ở phase `OUTCOME_UNKNOWN`:**
  - Nút bấm chính: **"Đối soát trạng thái"** (màu xanh dương đậm Saigon Port).
  - Tuyệt đối không hiển thị nút "Gửi lại ngay" để ngăn chặn người dùng kích hoạt tạo ảnh mồ côi hoặc lỗi 409.
