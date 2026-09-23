# 03. Kiểm Toán Giao Dịch CSDL, Lưu Trữ Ảnh & Dọn Dẹp File Mồ Côi
**Phân hệ:** User Attendance (Chấm công Vào ca & Tan ca)  
**Dự án:** Production Meter Reading — Cảng Sài Gòn  
**Ngày lập:** 21/09/2026  

---

## 1. Kiểm Toán Ranh Giới Giao Dịch & Rủi Ro Tồn Tại Trước Đây

### 1.1. Luồng xử lý trước khi kiểm toán
```text
[Client POST /check-in]
      ↓
[1. Đọc bytes ảnh & validate kích thước/MIME]
      ↓
[2. Lưu file ảnh xuống đĩa cứng (static/attendance/xxx.jpg)]  <-- VẤN ĐỀ
      ↓
[3. db.add(AttendanceEvent)]
      ↓
[4. db.commit()]  <-- NẾU LỖI Ở ĐÂY (Vd: UniqueConstraint, DB crash, timeout)
      ↓
[File xxx.jpg bị bỏ quên vĩnh viễn trên đĩa cứng mà không có bản ghi CSDL!]
```

### 1.2. Hậu quả của kiến trúc cũ
1. **Lãng phí dung lượng lưu trữ:** Hàng nghìn file ảnh mồ côi (không thể dọn dẹp theo cách thông thường do không biết ảnh nào thuộc bản ghi nào).
2. **Nguy cơ rò rỉ quyền riêng tư:** Các ảnh chụp không gắn với bản ghi hợp lệ vẫn nằm trên server.
3. **Mất toàn vẹn tham chiếu:** Không có cơ chế đối soát hoặc kiểm tra tính toàn vẹn (photo hash SHA-256).

---

## 2. Kiến Trúc Mới: Nguyên Tử Hóa & Tự Động Thu Hồi (Atomic Rollback Cleanup)

### 2.1. Thiết kế xử lý giao dịch an toàn trong `attendance.py`
```python
# Trích đoạn mã nguồn thực tế backend/app/attendance.py:
saved_file_path: Optional[Path] = None
try:
    # 1. Tạo thư mục và lưu ảnh
    photo_filename = f"{user.id}_{today_str}_{event_type.lower()}_{uuid.uuid4().hex[:8]}.jpg"
    saved_file_path = attendance_dir / photo_filename
    with open(saved_file_path, "wb") as f:
        f.write(contents)
    
    # 2. Tạo đối tượng model
    attendance_event = AttendanceEvent(
        id=str(uuid.uuid4()),
        user_id=user.id,
        event_type=event_type,
        timestamp=now_utc,
        date=today_str,
        photo_path=f"attendance/{photo_filename}",
        photo_sha256=photo_sha256,
        client_submission_id=client_submission_id,
    )
    db.add(attendance_event)
    db.commit()
    db.refresh(attendance_event)

except IntegrityError:
    db.rollback()
    # THU HỒI NGAY LẬP TỨC: Xóa file ảnh trên đĩa cứng
    if saved_file_path and saved_file_path.exists():
        try:
            saved_file_path.unlink()
        except OSError:
            pass
    # Xử lý trả về 409 Conflict với thông tin bản ghi đã có
    raise HTTPException(status_code=409, detail="...")

except Exception as ex:
    db.rollback()
    # THU HỒI NGAY LẬP TỨC nếu có bất kỳ lỗi nào khác
    if saved_file_path and saved_file_path.exists():
        try:
            saved_file_path.unlink()
        except OSError:
            pass
    raise
```

### 2.2. Kiểm thử xác minh (Automated Verification)
Đã triển khai hai test suite tự động chuyên biệt trong `tests/test_attendance_reconciliation.py`:
- `test_orphan_photo_cleaned_up_on_database_failure`: Giả lập lỗi ném ngoại lệ giữa lúc ghi file và commit DB. Kết quả xác nhận file ảnh lập tức bị `unlink` và không còn tồn tại trên đĩa.
- `test_orphan_photo_cleaned_up_on_integrity_error_race`: Giả lập 2 yêu cầu check-in cùng lúc vi phạm UniqueConstraint. Kết quả xác nhận transaction thứ hai bị rollback và file ảnh thứ hai bị xóa ngay lập tức.

---

## 3. Quản Lý File & Cấu Trúc Đường Dẫn

- **Thư mục lưu trữ:** `data/attendance/` (nằm ngoài code base, được bảo vệ trong container/volume).
- **Quy ước đặt tên file:** `{user_id}_{YYYY-MM-DD}_{event_type}_{entropy_8chars}.jpg`
- **Mã băm SHA-256:** Tính toán trực tiếp từ mảng bytes ngay khi nhận được file, lưu vào cột `photo_sha256` của bảng `attendance_events`. Phục vụ:
  1. Kiểm tra tính toàn vẹn (chống giả mạo, hỏng hóc file trên ổ cứng).
  2. Đối soát an toàn giữa Frontend và Backend khi đối soát kết quả.

---

## 4. Chính Sách Quyền Riêng Tư & An Toàn Dữ Liệu Nhân Viên

1. **Phạm vi sử dụng:** Ảnh chụp chỉ được sử dụng cho mục đích chấm công và kiểm tra tuân thủ trang phục bảo hộ lao động / đồng phục Cảng Sài Gòn.
2. **Không áp dụng Trí tuệ Nhân tạo sinh trắc học:** Tuyệt đối không cài đặt module nhận diện khuôn mặt AI tự động (Face ID/Liveness Detection). Tránh các rủi ro pháp lý về dữ liệu sinh trắc học cá nhân.
3. **Phân quyền truy cập ảnh:** Endpoint `GET /api/v1/attendance/{event_id}/photo` được kiểm soát nghiêm ngặt:
   - Nhân viên chỉ được xem ảnh chấm công của chính mình.
   - Chỉ có Giám sát viên (`SUPERVISOR`) hoặc Quản trị viên (`ADMIN`) mới có quyền xem ảnh của nhân viên khác phục vụ công tác thanh tra hiện trường.
4. **Bảo vệ môi trường test:** Mã nguồn kiểm thử sử dụng ảnh nhân tạo hình học (`tests/test_attendance_reconciliation.py` và `scripts/capture_attendance_reliability_deliverables.mjs`), tuyệt đối không đưa hình ảnh nhân viên thật vào kho lưu trữ mã nguồn.
