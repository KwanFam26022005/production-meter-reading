# BÁO CÁO 07 — RỦI RO CÒN LẠI VÀ HƯỚNG DẪN VẬN HÀNH (REMAINING RISKS & GUIDANCE)

**Thời điểm ghi nhận:** 2026-09-21T14:25+07:00  
**Tình trạng tổng thể:** P0 Backend Recovery & Reconciliation đã hoàn thành kiểm thử 100%.

---

## 1. Rủi ro Tiến trình Dịch vụ Đang chạy (Running Service In-Memory Cache)

### Mô tả rủi ro:
- Dịch vụ backend đang lắng nghe trên cổng 8000 được quản lý bởi **Windows Service `MeterReadingBackend`** thông qua công cụ NSSM, chạy dưới tài khoản `LocalSystem` (Session 0).
- Mã nguồn Python trên đĩa (`backend/app/meter_logbook.py`, `backend/app/main.py`) đã được chỉnh sửa và vượt qua toàn bộ 100% bài kiểm thử.
- Tuy nhiên, tiến trình Python `uvicorn` đang chạy trong bộ nhớ của Windows Service sẽ không tự động nạp lại mã nguồn mới nếu chưa được restart.
- Tài khoản người dùng dòng lệnh thông thường (`msi\user`) không có quyền gửi tín hiệu kết thúc hoặc khởi động lại dịch vụ chạy dưới quyền hệ thống (`Access is denied`).

### Hướng dẫn hành động cho Quản trị viên (Admin Action Required):
Mở terminal **PowerShell với quyền Run as Administrator** và thực thi lệnh sau:
```powershell
Restart-Service MeterReadingBackend
```
Hoặc:
```powershell
nssm restart MeterReadingBackend
```
Sau khi khởi động lại, dịch vụ backend sẽ áp dụng ngay lập tức hàm `to_utc_datetime` và mở endpoint đối soát `/api/v1/meter-readings/rounds/{round_id}/meters/{meter_id}`.

---

## 2. Rủi ro Khóa Ghi Cơ sở Dữ liệu SQLite (SQLite Write Concurrency)

### Mô tả rủi ro:
- Cơ sở dữ liệu SQLite tại `data/app.db` hoạt động dựa trên cơ chế khóa tệp (`file locking`).
- Khi nhiều nhân viên đồng thời gửi xác nhận chỉ số tại cùng một thời điểm: SQLite sẽ xếp hàng các giao dịch ghi.

### Biện pháp đã thực hiện và giảm thiểu:
- Giao dịch `db.commit()` trong `confirm_meter_reading()` đã được tối ưu hóa tối đa: thực hiện ngay sau khi chèn dòng dữ liệu, **trước khi** tiến hành lưu ảnh bằng chứng dung lượng lớn vào ổ đĩa.
- Nhờ vậy, thời gian giữ lock của SQLite chỉ kéo dài vài mili-giây, hoàn toàn đáp ứng tốt quy mô 12 công tơ và 20 nhân viên vận hành tại cảng Tân Thuận.

---

## 3. Khuyến nghị Chuẩn hóa Datetime cho các Tính năng Mới

### Quy chuẩn lập trình:
Để ngăn ngừa vĩnh viễn các lỗi phân mảnh múi giờ tương tự:
1. **Lưu trữ:** Luôn sử dụng `datetime.now(timezone.utc)` khi gán giá trị cho các cột `DateTime` của SQLAlchemy.
2. **Sắp xếp / So sánh:** Luôn bọc thuộc tính datetime qua hàm `to_utc_datetime(dt)` trước khi truyền vào `sort()` hoặc các toán tử so sánh `<, >, ==`.
3. **Hiển thị:** Chuyển đổi sang múi giờ địa phương (`Asia/Ho_Chi_Minh`, UTC+7) chỉ tại tầng hiển thị (Presentation Layer) hoặc serializer.

---

## 4. Tóm tắt Trạng thái Nghiệm thu (Sign-off Summary)

| Hạng mục | Trạng thái | Đánh giá |
| :--- | :---: | :--- |
| Khôi phục sự cố 500 Home Hub | **HOÀN THÀNH** | Lỗi phân mảnh naive/aware datetime đã được giải quyết triệt để |
| API Đối soát kết quả ghi chỉ số | **HOÀN THÀNH** | Endpoint GET độc lập, an toàn, idempotent |
| Tích hợp Frontend State Machine | **HOÀN THÀNH** | Tự động đối soát khi gặp 409; cung cấp nút đối soát khi mất mạng |
| Kiểm thử Tự động Backend | **39 / 39 PASS** | 100% ca kiểm thử vượt qua |
| Kiểm thử Tự động Frontend | **325 / 325 PASS** | 100% ca kiểm thử vượt qua, build thành công |
