# 01. Báo Cáo Tình Trạng Hiện Tại & Đánh Giá An Toàn Dữ Liệu Chấm Công
**Phân hệ:** User Attendance (Chấm công Vào ca & Tan ca)  
**Dự án:** Production Meter Reading — Cảng Sài Gòn  
**Ngày lập:** 21/09/2026  
**Trạng thái:** Hoàn tất kiểm toán, củng cố độ tin cậy & tinh chỉnh UX  

---

## 1. Bối Cảnh & Mục Tiêu Dự Án

Hệ thống ghi chỉ số điện nước tại Cảng Sài Gòn (`production-meter-reading`) vận hành phân hệ Chấm công (`User Attendance`) phục vụ nhân viên hiện trường ghi nhận thời điểm vào ca và tan ca kèm ảnh chụp tự chụp (selfie) xác minh.

Trước đợt kiểm toán này, phân hệ Chấm công tồn tại một số điểm nghẽn về độ tin cậy:
1. **Rủi ro ảnh mồ côi (Orphan Photos):** Khi nhân viên gửi yêu cầu chấm công, file ảnh được ghi vào đĩa trước khi commit database. Nếu transaction database gặp lỗi (như vi phạm Unique Constraint, timeout, lỗi kết nối DB), file ảnh vẫn nằm lại trên đĩa cứng mà không có bản ghi tương ứng trong CSDL.
2. **Thiếu cơ chế đối soát khi mất kết nối mạng:** Khi gặp timeout (504/408) hoặc 5xx, người dùng chỉ nhận được thông báo lỗi chung chung và phải chụp lại từ đầu hoặc bấm gửi lại. Việc gửi lại mù quáng tạo ra lỗi 400 vi phạm trình tự (nếu yêu cầu trước thực tế đã commit thành công trên server).
3. **Đồng nhất trạng thái trên Home Hub:** Giao diện trang chủ trước đây chưa phân định rạch ròi giữa trạng thái đang tải (`LOADING`), trạng thái lỗi kết nối/server (`ERROR`), và trạng thái thực sự chưa chấm công (`NOT_CHECKED_IN`), dẫn đến hiện tượng chớp nháy hoặc hiển thị sai lệch thông điệp nghiệp vụ.

Đợt tinh chỉnh này áp dụng triệt để kiến trúc chống rò rỉ và đối soát hai chiều tương tự như phân hệ **Meter Reading**, đảm bảo tính toàn vẹn dữ liệu, trải nghiệm người dùng liền mạch và an toàn vận hành.

---

## 2. Đánh Giá An Toàn Dữ Liệu & Ranh Giới Lưu Trữ

### 2.1. Mô hình CSDL & Khóa Ngoại
- **Bảng CSDL:** `attendance_events`
- **Các trường dữ liệu chính:**
  - `id`: Khóa chính định danh sự kiện (chuỗi ngẫu nhiên prefix UUID/timestamp).
  - `user_id`: Khóa ngoại liên kết `users.id` (CASCADE on delete).
  - `event_type`: Loại sự kiện (`CHECK_IN` hoặc `CHECK_OUT`).
  - `timestamp`: Thời điểm sự kiện (UTC, gắn múi giờ Asia/Ho_Chi_Minh khi hiển thị).
  - `date`: Ngày công nghiệp vụ định dạng `YYYY-MM-DD` (tính theo giờ địa phương Việt Nam UTC+7).
  - `photo_path`: Đường dẫn tương đối lưu file ảnh trên đĩa (`static/attendance/...`).
  - `photo_sha256`: Mã băm SHA-256 (64 ký tự hex) của file ảnh, dùng để kiểm tra tính toàn vẹn và đối soát.
  - `client_submission_id`: Khóa định danh phiên gửi phía client (Idempotency Key, chuỗi 64 ký tự, có chỉ mục).
  - `created_at`: Thời điểm tạo bản ghi trong CSDL.

### 2.2. Ràng Buộc Nghiệp Vụ CSDL
- **Ràng buộc duy nhất:** `UniqueConstraint('user_id', 'date', 'event_type', name='uq_user_date_event')`
- **Quy tắc:** Mỗi nhân viên trong một ngày làm việc (00:00:00 - 23:59:59 Asia/Ho_Chi_Minh) chỉ được phép có **tối đa 01 lần Vào ca (`CHECK_IN`)** và **tối đa 01 lần Tan ca (`CHECK_OUT`)**.
- **Không bắt buộc chấm công trước khi ghi chỉ số:** Chấm công là một thao tác nghiệp vụ độc lập. Nhân viên vẫn có thể ghi chỉ số bình thường ngay cả khi chưa chấm công hoặc chấm công muộn, không gây gián đoạn dây chuyền tác nghiệp tại cảng.

---

## 3. Ranh Giới Xác Thực & Quyền Hạn (Authentication & RBAC)

| Endpoint | Phương thức | Quyền hạn (Role) | Chức năng |
| :--- | :--- | :--- | :--- |
| `/api/v1/attendance/today` | `GET` | All authenticated (`EMPLOYEE`, `SUPERVISOR`, `ADMIN`) | Đọc trạng thái chấm công trong ngày của chính user đăng nhập |
| `/api/v1/attendance/check-in` | `POST` | All authenticated (chấm công cho chính mình) | Tiếp nhận ảnh selfie, ghi nhận vào ca |
| `/api/v1/attendance/check-out` | `POST` | All authenticated (chấm công cho chính mình) | Tiếp nhận ảnh selfie, ghi nhận tan ca |
| `/api/v1/attendance/history` | `GET` | All authenticated (`EMPLOYEE` xem của mình; `SUPERVISOR`/`ADMIN` xem toàn đơn vị) | Xem lịch sử chấm công |
| `/api/v1/attendance/{event_id}/photo` | `GET` | All authenticated (chính chủ hoặc `SUPERVISOR`/`ADMIN`) | Truy xuất ảnh chụp chấm công |

- **Bảo vệ CSRF:** Mọi mutation `POST /check-in` và `POST /check-out` đều yêu cầu token `X-CSRF-Token` trong header (Double Submit Cookie Pattern).
- **Phân định chủ quyền:** Người dùng chỉ có thể gửi chấm công cho tài khoản của chính mình được trích xuất từ JWT cookie / Bearer session. Không có tham số `user_id` trong payload của `POST /check-in` và `/check-out`.

---

## 4. Nguyên Tắc Quyền Riêng Tư & An Toàn Hình Ảnh

- **Không tích hợp nhận diện khuôn mặt tự động (No AI/Biometrics):** Hệ thống chỉ đóng vai trò lưu trữ bằng chứng thị giác phục vụ đối soát hậu kiểm của giám sát viên/quản trị viên. Không trích xuất vector khuôn mặt, không phân tích sinh trắc học và không lưu trữ dữ liệu nhận dạng AI.
- **Không chia sẻ công khai:** File ảnh được lưu trữ trong thư mục bảo vệ `data/attendance/` và chỉ phục vụ thông qua endpoint có chứng thực và kiểm tra quyền hạn.
- **Dữ liệu kiểm thử:** Toàn bộ test suite và QA script sử dụng ảnh tổng hợp hình học (1x1 pixel hoặc hình màu ngẫu nhiên), tuyệt đối không lưu trữ ảnh nhân viên thật trong git repository hoặc fixtures.
