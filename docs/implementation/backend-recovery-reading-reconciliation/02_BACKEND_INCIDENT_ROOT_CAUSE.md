# BÁO CÁO 02 — NGUYÊN NHÂN GỐC RỄ SỰ CỐ BACKEND (ROOT CAUSE ANALYSIS)

**Mã sự cố:** INC-20260921-METER-OPERATIONS-500  
**Triệu chứng người dùng:**  
Tại màn hình Home Hub của nhân viên và điều hành, giao diện xuất hiện thông báo lỗi:
> *"Không thể tải dữ liệu điều hành công tơ hôm nay."*

---

## 1. Phân tích Luồng Dữ liệu Đầu cuối (E2E Data Flow)

Khi người dùng mở ứng dụng tại màn hình Home Hub:
1. Frontend component `HomeHub.tsx` gọi hàm `getTodayOperations()` trong `frontend/src/services/api.ts`.
2. Hàm này gửi HTTP GET request tới endpoint backend:
   ```http
   GET /api/v1/meter-operations/today?date=2026-09-21
   ```
3. Backend tiếp nhận request tại route `get_today_meter_operations()` trong file `backend/app/meter_logbook.py`.
4. Thay vì trả về payload danh sách 12 công tơ cùng tiến độ lượt ghi, endpoint phản hồi:
   ```http
   HTTP/1.1 500 Internal Server Error
   Content-Type: application/json
   {"detail": "Internal Server Error"}
   ```
5. Frontend bắt `ApiError(500)` và hiển thị thông báo lỗi thân thiện người dùng: `"Không thể tải dữ liệu điều hành công tơ hôm nay."`.

---

## 2. Bằng chứng Nhật ký Lỗi Hệ thống (Log Evidence)

Kiểm tra trực tiếp file nhật ký lỗi runtime backend tại `backend_err.log` (dòng 7740 - 7755) phát hiện traceback nguyên nhân:

```text
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "uvicorn/protocols/http/h11_impl.py", line 407, in run_asgi
    result = await app(self.scope, self.receive, self.send)
  ...
  File "backend/app/meter_logbook.py", line 1116, in get_today_meter_operations
    confirmed_readings.sort(key=lambda x: x.server_timestamp, reverse=True)
TypeError: can't compare offset-naive and offset-aware datetimes
```

---

## 3. Bản chất Kỹ thuật của Lỗi (Technical Root Cause)

### 3.1. Sự phân mảnh Datetime trong SQLite
SQLite không có kiểu dữ liệu datetime bản địa mà lưu trữ dưới dạng text ISO-8601 (hoặc số thực).
Khi ORM SQLAlchemy ánh xạ cột `server_timestamp = Column(DateTime, default=datetime.utcnow)`:
- Trong dữ liệu ban đầu / seed fixtures / bản ghi cũ: `server_timestamp` được sinh bằng `datetime.utcnow()` mà không có `tzinfo` (đối tượng **offset-naive**).
- Trong các chức năng mới bổ sung gần đây (ví dụ luồng xác nhận mới tuân thủ chuẩn ISO UTC): mã nguồn sử dụng `datetime.now(timezone.utc)` (đối tượng **offset-aware**).

### 3.2. Lệnh sắp xếp Python in-memory
Tại dòng 1116 và dòng 1244 của `backend/app/meter_logbook.py`:
```python
# Đoạn mã gây lỗi:
confirmed_readings.sort(key=lambda x: x.server_timestamp, reverse=True)
meter_confirmed.sort(key=lambda x: x.server_timestamp, reverse=True)
```
Khi trong cùng một danh sách `confirmed_readings` có cả bản ghi cũ (naive) và bản ghi mới xác nhận trong ngày hôm nay (aware), phương thức `.sort()` của Python thực hiện so sánh trực tiếp `<` và `>`.
Theo đặc tả của Python 3 (`PEP 495` và `datetime module`):
> `TypeError: can't compare offset-naive and offset-aware datetimes`

Sự cố này cũng tiềm ẩn nguy cơ xuất hiện tại các vị trí sắp xếp danh sách `day_rounds` theo `scheduled_at` trong hàm `get_current_or_nearest_round()`.

---

## 4. Kết luận

- **Không phải do mất kết nối mạng hay lỗi cơ sở dữ liệu bị hỏng (DB corruption).**
- **Không phải do frontend gửi tham số sai.**
- **Nguyên nhân chính xác 100%:** Lỗi không đồng nhất timezone (`naive vs aware`) khi thực hiện `list.sort()` trong hàm `get_today_meter_operations()` tại backend.
- Việc khắc phục đòi hỏi chuẩn hóa toàn bộ datetime về cùng một chuẩn UTC có `tzinfo` trước khi so sánh hoặc sắp xếp trong backend.
