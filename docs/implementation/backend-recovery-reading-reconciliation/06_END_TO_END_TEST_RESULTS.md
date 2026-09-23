# BÁO CÁO 06 — KẾT QUẢ KIỂM THỬ ĐẦU CUỐI (END-TO-END TEST RESULTS)

**Thời điểm thực hiện:** 2026-09-21T14:20+07:00  
**Phạm vi:** Backend Unit & Integration Tests, Frontend Invariant Tests, Production Build.

---

## 1. Bảng Tổng hợp Kết quả Kiểm thử Toàn diện

| Phân hệ / Tệp kiểm thử | Số ca kiểm thử | Kết quả | Thời gian chạy |
| :--- | :---: | :---: | :---: |
| `tests/test_meter_logbook_datetime_sort.py` | 4 | **4 / 4 PASS (100%)** | 2.15s |
| `tests/test_meter_reading_reconciliation.py` | 4 | **4 / 4 PASS (100%)** | 9.66s |
| `tests/test_meter_logbook.py` | 31 | **31 / 31 PASS (100%)** | 31.17s |
| `frontend/tests/userMeterVerificationRefinement.test.ts` | 37 | **37 / 37 PASS (100%)** | 0.14s |
| `frontend/tests/focusedMeterCapture.test.ts` | 15 | **15 / 15 PASS (100%)** | 0.13s |
| **Toàn bộ Test Suite Frontend (Full Suite)** | **325** | **325 / 325 PASS (100%)** | 4.87s |
| **Frontend Production Build (`npm run build`)** | - | **THÀNH CÔNG (Exit Code 0)** | 4.99s |

---

## 2. Ma trận Kiểm thử các Kịch bản Lỗi & Đối soát (Error Scenarios Matrix)

### Kịch bản 1: Luồng chuẩn thành công (Happy Path)
- **Hành động:** Nhân viên chụp ảnh, OCR nhận diện, bấm "Xác nhận".
- **Kết quả:** Backend commit DB, trả lời HTTP 200 OK. Frontend chuyển sang `CONFIRMED_BY_SERVER`, hiển thị thẻ thành công màu xanh cảng biển.

### Kịch bản 2: Mất kết nối sau khi commit (Post-Commit Network Drop)
- **Giả lập:** Yêu cầu POST đã được backend commit vào `data/app.db`, nhưng đường truyền mạng phía client bị đứt trước khi nhận gói tin phản hồi.
- **Phản ứng Frontend:** Bắt lỗi kết nối, chuyển `submissionPhase` -> `OUTCOME_UNKNOWN`. Hiển thị banner cảnh báo kèm nút *"Đối soát máy chủ"*.
- **Khi nhân viên bấm "Đối soát máy chủ":**
  - Frontend gọi `GET /api/v1/meter-readings/rounds/{round_id}/meters/{meter_id}`.
  - Kết quả trả về `exists: true` và `reading === submittedReading`.
  - Frontend nhận diện đối soát khớp 100%, tự động chuyển sang `CONFIRMED_BY_SERVER` với thông báo: *"Chỉ số đã được máy chủ ghi nhận thành công (kết quả đối soát khớp)"*.

### Kịch bản 3: Gửi lại nhiều lần (Double-Submit / In-flight Retry) dẫn đến HTTP 409
- **Giả lập:** Nhân viên bấm nút nhiều lần hoặc retry khi yêu cầu đầu tiên đã commit. Backend trả về `HTTP 409 Conflict`.
- **Phản ứng Frontend:**
  - Logic mới tự động gọi hàm đối soát ngầm trước khi hiển thị lỗi.
  - Nếu bản ghi trong cơ sở dữ liệu có cùng giá trị chỉ số: Frontend nhận diện đây là hành động idempotent hợp lệ, chuyển thẳng sang `CONFIRMED_BY_SERVER`.
  - Nhân viên không bị chặn oan uổng bởi mã lỗi 409.

### Kịch bản 4: Xung đột dữ liệu thực sự (Genuine Data Conflict)
- **Giả lập:** Một nhân viên khác đã ghi nhận chỉ số công tơ này với giá trị khác (ví dụ: `15000.0` thay vì `14900.0`).
- **Phản ứng Frontend:**
  - Backend trả lời 409.
  - Đối soát phát hiện `rec.reading !== targetValue`.
  - Frontend giữ nguyên trạng thái `REJECTED`, hiển thị thông tin trung thực: *"Chỉ số của công tơ này đã được ghi nhận với giá trị 15000.0 (Mã NV: NV-02). Vui lòng kiểm tra lại danh sách"*.

### Kịch bản 5: Lỗi kết nối trước khi commit (Pre-Commit Failure)
- **Giả lập:** Gói tin POST chưa tới được backend hoặc backend gặp sự cố trước lệnh `db.commit()`.
- **Phản ứng Frontend:**
  - Frontend vào trạng thái `OUTCOME_UNKNOWN`.
  - Bấm "Đối soát máy chủ": backend trả về `exists: false`.
  - Frontend cập nhật thông báo: *"Máy chủ chưa ghi nhận chỉ số. Bạn có thể bấm xác nhận để gửi lại an toàn."*, chuyển về `NOT_SUBMITTED`. Nhân viên gửi lại thành công.

---

## 3. Xác minh Bản dựng Production (Production Build Verification)

Lệnh `npm run build` thực thi `tsc && vite build`:
- **0 lỗi TypeScript (TS2551, TS6133 đã xử lý triệt để).**
- Sinh bundle tĩnh tối ưu tại thư mục `frontend/dist/`:
  - `dist/index.html` (1.46 kB)
  - `dist/assets/index-CDsAOm_I.css` (360.91 kB)
  - `dist/assets/index-bhM5LwOx.js` (937.75 kB)
- Đảm bảo ứng dụng sẵn sàng phục vụ môi trường vận hành thực địa.
