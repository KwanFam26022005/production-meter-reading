# 06. Rủi Ro Tồn Đọng, Giới Hạn & Các Quyết Định Cần Ban Lãnh Đạo Phê Duyệt
**Phân hệ:** User Attendance (Chấm công Vào ca & Tan ca)  
**Dự án:** Production Meter Reading — Cảng Sài Gòn  
**Ngày lập:** 21/09/2026  

---

## 1. Các Rủi Ro Kỹ Thuật Còn Tồn Đọng & Giới Hạn Hiện Tại

### 1.1. Giới hạn xử lý Ca đêm qua ngày (Midnight Crossing Shifts)
- **Thực tế nghiệp vụ cảng biển:** Nhiều kíp trực điều độ, bốc dỡ hoặc kỹ thuật điện nước làm ca đêm từ 22:00 hôm trước đến 06:00 sáng hôm sau.
- **Giới hạn kỹ thuật hiện tại:** Bảng `attendance_events` gắn cứng khóa ngày `date = now(Asia/Ho_Chi_Minh).strftime("%Y-%m-%d")` và `UniqueConstraint('user_id', 'date', 'event_type')`.
  - Khi nhân viên vào ca lúc 22:00 ngày 21/09, bản ghi mang `date = 2026-09-21`.
  - Khi nhân viên bấm "Tan ca" lúc 06:00 ngày 22/09, hệ thống tính `date = 2026-09-22`. Vì ngày 22/09 chưa có bản ghi `check_in`, hệ thống sẽ trả về lỗi HTTP 400: *"Bạn chưa vào ca trong ngày làm việc hôm nay."*
- **Tác động:** Nhân viên ca đêm không thể tự chấm công tan ca qua app sau 00:00.

### 1.2. Hàng đợi Ngoại tuyến (Offline Queue) đối với Chấm công
- **Phân biệt với Meter Reading:** Phân hệ Ghi chỉ số (Meter Reading) cho phép lưu hàng đợi ngoại tuyến trong IndexedDB và đồng bộ hóa hàng loạt khi có mạng trở lại.
- **Giới hạn ở Chấm công:** Hiện tại Chấm công chưa hỗ trợ lưu trữ ngoại tuyến qua đêm do các lý do:
  1. Yêu cầu tính xác thực thời gian: Dấu thời gian hệ thống server (`server_timestamp`) là bằng chứng pháp lý duy nhất. Nếu cho phép lưu ngoại tuyến và đồng bộ sau, nhân viên có thể thay đổi giờ đồng hồ trên điện thoại để gian lận giờ vào ca/tan ca.
  2. Dung lượng ảnh selfie (1-2 MB mỗi ảnh) tích lũy trong IndexedDB có thể làm chậm trình duyệt mobile.

---

## 2. Các Quyết Định Nghiệp Vụ Cần Product Owner / Ban Lãnh Đạo Cảng Sài Gòn Phê Duyệt

### Quyết định 1: Định nghĩa ranh giới ca làm việc (Shift Boundary Policy)
- **Lựa chọn A (Khuyến nghị cho giai đoạn tiếp theo):** Bổ sung bảng `work_shifts` hoặc logic ngưỡng giờ chuyển giao ca (ví dụ: ngày làm việc tính từ 05:00 sáng hôm nay đến 05:00 sáng hôm sau, hoặc liên kết ca dựa trên `active_shift_id`).
- **Lựa chọn B (Quy trình quản trị tạm thời):** Cho phép Giám sát viên (`SUPERVISOR`) bổ sung giờ tan ca thủ công trên giao diện Lịch sử Chấm công đối với các trường hợp ca đêm vượt 00:00.
- **Câu hỏi cho Lãnh đạo:** Ban Điều hành Cảng muốn áp dụng quy chế phân ca cố định theo kíp (3 ca 4 kíp) hay linh hoạt theo khoảng thời gian làm việc thực tế?

### Quyết định 2: Chính sách xử lý trường hợp quên chấm công (Forgot Check-in/Check-out)
- **Tình huống:** Nhân viên quên chấm công vào ca lúc sáng, đến chiều bấm tan ca hoặc hôm sau mới nhớ ra.
- **Hiện tại:** Hệ thống từ chối tan ca nếu chưa vào ca.
- **Khuyến nghị:** Cần xây dựng màn hình "Gửi giải trình chấm công bổ sung" (Attendance Adjustment Request) để nhân viên gửi lý do kèm xác nhận của Đội trưởng/Giám sát viên.

### Quyết định 3: Tần suất lưu trữ và dọn dẹp ảnh cũ (Data Retention Policy)
- **Dung lượng dự kiến:** Với 100 công nhân viên x 2 ảnh/ngày x 500 KB = ~100 MB/ngày (~3 GB/tháng).
- **Khuyến nghị chính sách:**
  - Lưu trữ ảnh gốc đầy đủ trong 90 ngày phục vụ thanh tra và đối soát bảng lương.
  - Sau 90 ngày: Chạy cron job định kỳ nén ảnh về kích thước thumbnail (50 KB) hoặc lưu trữ lạnh (Cold Storage), bảo toàn mã băm `photo_sha256` trong CSDL để đảm bảo tính pháp lý.
