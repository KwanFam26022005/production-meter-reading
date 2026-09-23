# 04. Hợp Đồng Đối Soát Nâng Cao (Reconciliation Contract V2)
**Tài liệu:** Reconciliation Contract V2  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Trạng thái:** IMPLEMENTED & TESTED  

---

## 1. Nguyên Tắc Cốt Lõi Của Hợp Đồng Đối Soát V2

Phiên bản V2 nâng cấp hợp đồng đối soát từ mức "Heuristic dự đoán" lên mức **"Khẳng định có thẩm quyền" (Authoritative Assertion)**:

1. **Khóa Định Danh Duy Nhất (`client_submission_id`):** Là định danh logic duy nhất của một lần gửi chấm công.
2. **Loại Bỏ Đối Soát Mù Bằng Mã Băm Đơn Lẻ:** Một mã băm hình ảnh trùng khớp ĐƠN LẺ KHÔNG BAO GIỜ được xem là bằng chứng rằng chính yêu cầu đó đã thành công nếu thiếu hoặc sai lệch `client_submission_id`.
3. **Xung Đột Toàn Vẹn (Integrity Conflict):** Nếu bản ghi trên máy chủ có cùng `client_submission_id` nhưng mang `event_type` khác hoặc `payload_sha256` khác, hệ thống xác định đây là một xung đột dữ liệu nghiêm trọng (`CONFLICT`), tuyệt đối không báo thành công giả tạo.
4. **Ngữ Nghĩa Của Trường Hợp Chưa Thấy Bản Ghi (`NOT_RECORDED`):**
   - Khi `GET /api/v1/attendance/today` trả về `null`, điều đó có nghĩa là: **"Chưa quan sát thấy bản ghi trên máy chủ tại thời điểm truy vấn."**
   - Điều này **KHÔNG** chứng minh rằng yêu cầu POST trước đó chắc chắn 100% sẽ không bao giờ commit (ví dụ: máy chủ đang chịu tải cao và transaction đang bị nghẽn mạng). Do đó, client không xóa phiên làm việc mà giữ nguyên `client_submission_id` và payload ban đầu để có thể thử lại an toàn nhờ tính bất biến (idempotency) phía backend.

---

## 2. Đặc Tả Thuật Toán Đối Soát Phía Client (`reconcileAttendance`)

```typescript
export async function reconcileAttendance(
  eventType: 'CHECK_IN' | 'CHECK_OUT',
  clientSubmissionId?: string,
  payloadSha256?: string
): Promise<AttendanceReconciliationResult>
```

### 2.1. Quy Trình Phân Xử 4 Nhánh Logic
```
+---------------------------------------------------------------------------------+
|                       Gọi GET /api/v1/attendance/today                          |
+---------------------------------------------------------------------------------+
                                         |
                       Có bản ghi cho eventType hôm nay?
                                    /        \
                                  CÓ          KHÔNG
                                 /              \
         Khớp client_submission_id?             Có bản ghi ở eventType kia trùng ID?
               /            \                               /                \
             CÓ            KHÔNG                          CÓ                KHÔNG
            /                \                           /                    \
Khớp payload_sha256?      CONFLICT                 CONFLICT               NOT_RECORDED
     /        \       (Đã ghi nhận từ           (Trùng ID nhưng        (Chưa quan sát thấy
   CÓ        KHÔNG     phiên khác hôm nay)      khác sự kiện)         bản ghi tại thời điểm này)
  /            \
CONFIRMED    CONFLICT
(Thành công  (Trùng ID nhưng
authoritative) khác ảnh)
```

---

## 3. Cỗ Máy Trạng Thái Giao Diện (`AttendanceSubmissionPhase`)

Giao diện người dùng tuân thủ nghiêm ngặt 7 trạng thái vòng đời:

| Trạng Thái (Phase) | Kích Hoạt Bởi | Hành Động Cho Phép Phía Người Dùng | Trạng Thái Dữ Liệu |
| :--- | :--- | :--- | :--- |
| **`NOT_SUBMITTED`** | Mở form hoặc sau khi chụp ảnh xem trước | Bấm "Xác nhận vào ca / tan ca" | Chưa gửi HTTP request |
| **`SUBMITTING`** | Người dùng bấm xác nhận | Vô hiệu hóa mọi nút tác nghiệp (Spinner) | Đang gửi multipart POST |
| **`CONFIRMED_BY_SERVER`** | Server trả về 200 hoặc đối soát thành công | Hiển thị màn hình Xanh thành công, nút "Về trang chủ" | Đã có `AttendanceActionResponse` có thẩm quyền |
| **`OUTCOME_UNKNOWN`** | Nhận HTTP 504, 5xx hoặc rớt mạng kết nối | Nút chính: **"Đối soát trạng thái"**; Nút phụ: "Xem trạng thái ca" | Giữ nguyên `clientSubmissionId` & payload |
| **`RECONCILING`** | Người dùng bấm "Đối soát trạng thái" | Spinner "Đang đối soát..." | Đang gọi `GET /today` |
| **`CONFLICT`** | Trùng lặp phiên khác hoặc xung đột dữ liệu | Hiển thị thông báo giải thích chi tiết, nút tải lại | Không cho gửi đè |
| **`REJECTED`** | Lỗi 400 (ảnh hỏng) hoặc 401 (hết hạn phiên) | Hiển thị thông báo lỗi, yêu cầu đăng nhập lại / chụp lại | Form dừng lại |

> **Lưu ý về thuật ngữ "7 trạng thái vs 8 trạng thái":**  
> `NOT_RECORDED` là một kết quả trả về của hàm đối soát `reconcileAttendance` (outcome), chứ không phải một trạng thái UI riêng biệt. Khi đối soát trả về `NOT_RECORDED`, cỗ máy trạng thái UI chuyển về `NOT_SUBMITTED` kèm thông điệp hướng dẫn an toàn, cho phép người dùng bấm gửi lại cùng `client_submission_id`. Do đó, cỗ máy trạng thái UI có **chính xác 7 phase**.

---

## 4. Bảo Mật Quyền Riêng Tư Khi Tải Lại Trang (Page Reload Security)

- **Nguyên Tắc Bảo Vệ Dữ Liệu Khuôn Mặt:** File ảnh chụp selfie của nhân viên **TUYỆT ĐỐI KHÔNG** được lưu trữ vào `localStorage` hoặc `sessionStorage` của trình duyệt. Việc lưu trữ dữ liệu sinh trắc học/hình ảnh chưa mã hóa trong Web Storage tiềm ẩn nguy cơ rò rỉ nghiêm trọng nếu thiết bị di động dùng chung hoặc bị tấn công XSS.
- **Hành Vi Khi Người Dùng F5 / Reload:**
  - Nếu người dùng tải lại trang trong khi đang ở trạng thái `OUTCOME_UNKNOWN`, bộ nhớ RAM trình duyệt sẽ giải phóng Blob ảnh tạm.
  - Khi tải lại, ứng dụng tự động truy vấn `GET /api/v1/attendance/today`. Nếu bản ghi đã được máy chủ ghi nhận trước khi F5, giao diện Home Hub lập tức hiển thị trạng thái `IN_SHIFT` hoặc `COMPLETED`.
  - Nếu bản ghi chưa được ghi nhận, nhân viên chỉ cần thao tác chụp lại ảnh mới để gửi với một `client_submission_id` mới hoàn toàn an toàn.
