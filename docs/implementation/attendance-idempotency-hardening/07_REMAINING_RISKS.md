# 07. Rủi Ro Tồn Đọng, Giới Hạn Kỹ Thuật & Khuyến Nghị Vận Hành
**Tài liệu:** Remaining Risks & Technical Boundaries  
**Dự án:** local `production-meter-reading`  
**Giai đoạn:** Attendance Idempotency & Persistence Hardening  
**Trạng thái:** ANALYZED & TRANSPARENT  

---

## 1. Các Tuyên Bố Kỹ Thuật Minh Bạch (Boundary Disclaimers)

Nhằm đảm bảo tính trung thực và chuẩn mực kỹ thuật cao nhất của hệ thống:

1. **Không Tuyên Bố "Zero Orphan Photos" Trong Mọi Điều Kiện Đột Tử:**
   - Hệ thống đảm bảo triệt tiêu hoàn toàn ảnh mồ côi đối với mọi ngoại lệ được Python quản lý (`IntegrityError`, `HTTPException`, timeout DB, lỗi kết nối mạng).
   - Tuy nhiên, nếu hệ điều hành hoặc phần cứng bị mất điện đột ngột hoặc tiến trình bị buộc dừng bằng lệnh `kill -9` / `Taskkill /F` chính xác vào microsecond giữa thời điểm file ảnh vừa được ghi xuống ổ đĩa và thời điểm SQLite nhận lệnh `commit()`, file ảnh đó sẽ nằm lại trên đĩa mà không có bản ghi CSDL.
   - Đây là giới hạn vật lý vốn có giữa hệ thống file phi giao dịch (non-transactional filesystem) và CSDL quan hệ. Để khắc phục rủi ro này, tiện ích `attendance_gc.py` được xây dựng để quét và dọn dẹp định kỳ an toàn theo vùng đệm thời gian (grace period).
2. **Không Tuyên Bố "Exactly-Once HTTP Delivery":**
   - Trên mạng viễn thông di động 4G/Wifi hiện trường cảng biển, mạng truyền gói tin chỉ có thể đạt được ngữ nghĩa **"At-least-once"** với cơ chế gửi lại hoặc đối soát.
   - Nhờ có `client_submission_id` và khóa duy nhất trong CSDL, hệ thống đạt được **ngữ nghĩa xử lý Exactly-once ở tầng lưu trữ (Storage-level Exactly-Once Processing)**: dù client có gửi lại nhiều lần, máy chủ cũng chỉ ghi nhận duy nhất 1 bản ghi nghiệp vụ và 1 file ảnh hợp lệ.
3. **Không Tuyên Bố Sẵn Sàng Vận Hành Nếu Chưa Thực Hiện Khởi Động Lại Dịch Vụ:**
   - Mã nguồn đã hoàn thiện và vượt qua 100% các bài kiểm thử tự động, nhưng tiến trình dịch vụ Windows Service vẫn đang chạy phiên bản mã cũ trong bộ nhớ. Hệ thống chỉ chính thức vận hành tính năng mới sau khi Quản trị viên kích hoạt quy trình restart tại tài liệu `06_RUNTIME_ACCEPTANCE.md`.

---

## 2. Rủi Ro Nghiệp Vụ & Giới Hạn Cần Ban Lãnh Đạo Cảng Quyết Định

### 2.1. Ca Đêm Vượt Quá Nửa Đêm (Midnight-Crossing Shifts)
- **Hiện trạng:** Hệ thống tính ngày nghiệp vụ theo ngày công lịch địa phương (`Asia/Ho_Chi_Minh` từ 00:00:00 đến 23:59:59).
- **Hạn chế:** Công nhân vào ca lúc 22:00 ngày hôm trước sẽ không thể tự bấm "Tan ca" sau 00:00 ngày hôm sau qua ứng dụng vì hệ thống xem ngày hôm sau là một ngày công mới chưa có lượt vào ca.
- **Khuyến nghị dài hạn:** Bổ sung trường `shift_id` hoặc cấu hình ranh giới ca động (ví dụ: ngày làm việc tính từ 05:00 sáng hôm nay đến 05:00 sáng hôm sau).

### 2.2. Không Hỗ Trợ Hàng Đợi Ngoại Tuyến Qua Đêm (Offline Queue Limitation)
- Không giống như phân hệ Ghi chỉ số (Meter Reading) cho phép lưu hàng chục chỉ số vào IndexedDB để đồng bộ sau, phân hệ Chấm công không cho phép lưu hàng đợi offline qua đêm.
- **Lý do bảo mật:** Dấu thời gian hệ thống server (`server_timestamp`) là bằng chứng pháp lý duy nhất để tính công. Việc cho phép client lưu ảnh và đồng bộ giờ địa phương từ điện thoại sẽ mở ra nguy cơ gian lận giờ làm việc bằng cách sửa đồng hồ thiết bị di động.

### 2.3. Chính Sách Lưu Trữ Dài Hạn (Data Retention Policy)
- Dự kiến mỗi năm hệ thống tiếp nhận hàng chục nghìn ảnh chấm công. Cần ban hành chính sách nén ảnh hoặc chuyển vào kho lưu trữ lạnh (Cold Storage Archive) sau 90 ngày, chỉ giữ lại mã băm `photo_sha256` và `payload_sha256` trong CSDL để phục vụ tra cứu pháp lý.
