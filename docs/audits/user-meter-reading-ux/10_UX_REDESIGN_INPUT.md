# 10 — UX REDESIGN INPUT & OPPORTUNITIES SPECIFICATION

**Document Version:** 1.0.0  
**Target Audience:** UI/UX Designers, Product Architects, ChatGPT Redesign Agent  
**Context:** Local Audit of `production-meter-reading` (Field User Meter Reading Flow)  
**Verification Baseline:** Git commit `5d37047`, Node v20.18.0, Python 3.12, Edge Playwright Runtime  

---

## 1. MỤC ĐÍCH TÀI LIỆU

Tài liệu này tổng hợp toàn bộ các phát hiện về mặt trải nghiệm người dùng (UX Issues), các điểm ma sát (Friction Points), rủi ro thao tác ngoài hiện trường (Field Operation Hazards), và các cơ hội tái thiết kế (Design Opportunities).

Tất cả các khuyến nghị thiết kế trong tài liệu này đều được gắn chặt với:
1. **Bằng chứng thực tế:** Code reference và ảnh chụp màn hình kiểm chứng.
2. **Ràng buộc nghiệp vụ:** Không được vi phạm các bất biến kỹ thuật của backend và ML pipeline.
3. **Môi trường vận hành thực địa:** Điều kiện làm việc khắc nghiệt của công nhân ghi điện bến cảng (nắng gắt, gió biển, găng tay bảo hộ, sóng 4G chập chờn, áp lực thời gian).

---

## 2. PHÂN LOẠI CÁC PHÁT HIỆN UX & MA TRẬN MỨC ĐỘ ƯU TIÊN

| Finding ID | Tiêu đề phát hiện | Màn hình / State ảnh hưởng | Mức độ nghiêm trọng | Độ tin cậy kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **UX-01** | Nguy cơ mất trắng dữ liệu khi vuốt Back vật lý / Reload tab | D3 (Camera), D4 (Result), D5 (Review) | **CRITICAL** | `VERIFIED_STATIC` |
| **UX-02** | Xung đột ghi nhận (HTTP 409) gây hoang mang sau khi rớt mạng | D4 (Result State 4A / 4B) | **CRITICAL** | `VERIFIED_RUNTIME` |
| **UX-03** | Khung ngắm Reticle gây ngộ nhận crop ảnh vs Full-frame OCR | D3 (Camera Reticle) | **HIGH** | `VERIFIED_STATIC` |
| **UX-04** | Thumb Zone kém thân thiện khi thao tác một tay bằng găng tay | D1 (Worklist), D4 (Result), D5 (Review) | **HIGH** | `VERIFIED_RUNTIME` |
| **UX-05** | Thiếu kiểm tra biến động chỉ số (Spike / Drop / Rollover check) | D4 (Edit), D5 (Manual Entry) | **HIGH** | `VERIFIED_STATIC` |
| **UX-06** | Hardcoded "Đo đếm điện năng" (kWh) cản trở đo đếm nước | D1 (Worklist), D4, D5, D6 | **MEDIUM** | `VERIFIED_STATIC` |
| **UX-07** | Thiếu chế độ tương phản cao dưới ánh nắng chói chang bến cảng | D1, D3, D4, D5 (Toàn bộ flow) | **MEDIUM** | `REPORTED` / `INFERRED` |
| **UX-08** | Không có chế độ Offline Queue khi mất sóng trong trạm biến áp | D3 (Capture) -> D4 (OCR Submit) | **MEDIUM** | `VERIFIED_STATIC` |
| **UX-09** | Thiếu phản hồi xúc giác (Haptic) và âm thanh xác nhận | D3 (Shutter), D4 (Confirm success) | **LOW** | `VERIFIED_STATIC` |
| **UX-10** | Danh mục công tơ thiếu bộ lọc thông minh theo lộ trình di chuyển | D1 (Worklist) | **LOW** | `VERIFIED_RUNTIME` |

---

## 3. BẢNG ĐẶC TẢ CHI TIẾT CÁC VẤN ĐỀ UX (STRUCTURED FINDINGS)

---

### UX-01: Nguy cơ mất trắng dữ liệu do điều hướng phi trạng thái (State Loss on Navigation)

- **Màn hình / State bị ảnh hưởng:**
  - `D3` (Camera Live Stream & Image Preview)
  - `D4` (State 4A: OCR Success / State 4A-Edit: Inline Edit)
  - `D5` (State 5: Review Fallback Manual Entry)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Trạng thái màn hình ghi chỉ số phụ thuộc hoàn toàn vào React Local State (`activeTab: "reading"`, `readingSubTab: "camera" | "preview" | "result" | "review"`, `capturedImage: string | null`, `ocrResult: OcrResult | null`) trong component `frontend/src/features/meter-reading/MeterReadingPage.tsx`.
  - Không hề có cơ chế lưu vết vào URL Query Params, React Router Memory, hoặc `sessionStorage` / `localStorage` / `IndexedDB`.
  - Ứng dụng có bắt sự kiện nút Back nội bộ giao diện (`.btn-header-back`) để hiển thị `UnsavedWorkConfirmModal` (ảnh `14-unsaved-work-modal-mobile.png`).
  - **TUY NHIÊN:** Khi công nhân sử dụng phím Back vật lý của Android, cử chỉ vuốt cạnh màn hình (Edge Swipe Back gesture), hoặc trình duyệt bị refresh (Pull-to-refresh / tab reload), không hề có bộ lắng nghe `window.onbeforeunload` hay `popstate` hook (`frontend/src/features/meter-reading/MeterReadingPage.tsx#L85-L130`).
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/MeterReadingPage.tsx#L125-L160` (quản lý state rời rạc, không URL synchronization).
  - Screenshot: `14-unsaved-work-modal-mobile.png` (chỉ bảo vệ được nút bấm in-app).
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Công nhân leo lên thang hoặc cúi vào gầm tủ điện chụp được một bức ảnh rất khó khăn, OCR vừa nhận dạng xong đang chuẩn bị bấm lưu thì vô tình vuốt tay vào cạnh viền máy (cử chỉ back phổ biến trên Android). Toàn bộ ảnh chụp, kết quả OCR và dữ liệu vừa gõ biến mất tức thì, buộc công nhân phải mở tủ chụp lại từ đầu. Cảm giác cực kỳ ức chế và tốn công sức.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Đồng bộ trạng thái đọc chỉ số tối thiểu vào SessionStorage hoặc IndexedDB (`pmr_active_session_{meter_id}`).
  2. Bổ sung hook điều hướng chặn `beforeunload` và đồng bộ History API (`history.pushState`) để khi người dùng ấn Back vật lý, modal xác nhận hủy bỏ vẫn bật lên thay vì thoát trang.
  3. Cơ chế phục hồi phiên làm việc (Session Recovery Banner): "Bạn có một phiên đọc chưa hoàn tất cho công tơ SIM-EM-001. Bạn có muốn tiếp tục?".
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Ảnh JPEG Base64 trong RAM có dung lượng 1.5MB - 3.5MB. Không lưu vào `localStorage` vì vượt hạn mức 5MB của trình duyệt. Nên lưu ảnh vào `IndexedDB` hoặc `CacheStorage`.

---

### UX-02: Lỗi HTTP 409 Conflict gây hoang mang khi rớt mạng hoặc gửi đúp (Network Retry Conflict)

- **Màn hình / State bị ảnh hưởng:**
  - `D4` (State 4A/4B: Confirmation Action)
  - `D5` (State 5: Review Action)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Database schema áp đặt ràng buộc duy nhất: `UniqueConstraint("meter_id", "reading_round_id")` (`backend/app/models/meter_logbook.py#L38`).
  - Endpoint `POST /api/v1/meter-operations/confirm` kiểm tra nếu bản ghi đã tồn tại với trạng thái `CONFIRMED`, backend ngay lập tức trả về mã lỗi `HTTP 409 Conflict` với thông báo: `"Meter reading already recorded for this round"` (`backend/app/api/v1/meter_reading.py#L225-L230`).
  - Frontend hiển thị thông báo lỗi dưới dạng toast đỏ tiêu chuẩn: `"Lỗi ghi nhận: Meter reading already recorded for this round"`.
- **Bằng chứng kiểm chứng:**
  - Code: `backend/app/api/v1/meter_reading.py#L227` và `frontend/src/features/meter-reading/MeterReadingPage.tsx#L320-L345`.
  - Độ tin cậy: `VERIFIED_RUNTIME`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Trong điều kiện sóng 4G yếu ở bến cảng, công nhân bấm "Xác nhận & Lưu". Request đã tới máy chủ và DB đã commit thành công, nhưng gói tin phản hồi HTTP 200 bị drop trên đường truyền di động.
  - Sau vài giây chờ đợi không thấy phản hồi, công nhân bấm lại lần 2. Lúc này máy chủ trả về `HTTP 409 Conflict`.
  - Giao diện báo đỏ thông báo lỗi tiếng Anh, công nhân tưởng rằng chỉ số của mình **bị lỗi không lưu được**, hoang mang không biết số liệu đã vào hệ thống hay chưa, hoặc nghi ngờ có ai đó vừa ghi đè công tơ của mình.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Thiết kế Idempotency Key (khóa bất biến) cho mỗi lượt submit từ client (sinh UUID ngay khi mở modal).
  2. Phía frontend, nếu gặp mã lỗi 409 cho chính meter và round hiện tại, UI nên tự động chuyển thành trạng thái **Thành công (Success reconciliation)** kèm nhãn: *"Chỉ số của bạn đã được hệ thống ghi nhận trước đó lúc HH:mm"*.
  3. Chuyển đổi thông điệp lỗi kỹ thuật tiếng Anh sang tiếng Việt thân thiện, rõ ràng: *"Công tơ này đã được hoàn thành trong ca làm việc hiện tại"*.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Không được phép cho phép tạo 2 bản ghi chỉ số cho cùng 1 công tơ trong 1 ca (Round). Đây là quy tắc toàn vẹn dữ liệu kế toán điện tử bắt buộc.

---

### UX-03: Khung ngắm Reticle trên Camera gây hiểu lầm về vùng cắt ảnh (Reticle Misconception)

- **Màn hình / State bị ảnh hưởng:**
  - `D3` (Camera Live Stream)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Giao diện camera hiển thị một khung viền hình chữ nhật nét đứt màu xanh ngọc `.reticle-box` (`frontend/src/features/meter-reading/components/CameraCaptureModal.tsx#L140-L155`), kèm hướng dẫn: `"Căn chỉnh mặt số công tơ vào khung hình chữ nhật"`.
  - Tuy nhiên, trong mã nguồn chụp ảnh:
    ```typescript
    ctx.drawImage(video, 0, 0, width, height); // Toàn bộ khung hình video gốc 1080p
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    ```
  - Khung ngắm chỉ là một phần tử HTML/CSS thuần túy (`div.reticle-box`), **hoàn toàn không thực hiện crop ảnh**. Toàn bộ bức ảnh toàn cảnh (full-frame uncropped) được gửi lên backend OCR.
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/components/CameraCaptureModal.tsx#L85-L105`.
  - Screenshot: `05-camera-ready-mobile.png`.
  - Pipeline ML: `backend/app/ml/inference.py#L90-L135` (YOLOv8 phát hiện trên toàn bộ ảnh).
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Công nhân cố gắng tiến thật sát, nghiêng máy hoặc zoom sao cho dãy số nằm lọt khít 100% vào trong ô chữ nhật. Việc này vô tình làm mất phần tem mã trạm, mất góc nhìn toàn cảnh của vỏ công tơ, hoặc làm camera bị out nét (macro focus blur) vì đặt quá gần.
  - Ngược lại, nếu công nhân đứng chụp xa một chút mà dãy số lọt ra ngoài khung ngắm, họ lại lo sợ máy sẽ không đọc được, gây mất thời gian căn chỉnh không cần thiết.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Đổi thông điệp hướng dẫn rõ ràng hơn: *"Chụp rõ toàn bộ mặt trước công tơ (khung ngắm chỉ dùng để định hướng)"*.
  2. Hoặc thiết kế khung ngắm dạng góc mở 4 góc (corner brackets) thay vì hộp kín đặc, mang tính định hướng không gian hơn là ranh giới cắt ảnh.
  3. Bổ sung chỉ báo chất lượng ảnh trực tiếp (Live Quality Heuristics): phát hiện rung mờ (blur detection) hoặc quá tối (low light indicator) ngay trên luồng video trước khi bấm chụp.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - **TUYỆT ĐỐI KHÔNG ĐƯỢC CROP ẢNH** trước khi gửi lên backend. Mô hình YOLOv8 cần ngữ cảnh toàn bộ mặt công tơ để định vị chính xác anchor box của dòng số hiển thị.

---

### UX-04: Vùng chạm ngón tay cái (Thumb Zone) và công thái học một tay (One-Handed Ergonomics)

- **Màn hình / State bị ảnh hưởng:**
  - `D1` (Worklist), `D4` (OCR Result), `D5` (Review)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Thanh tiêu đề Top Bar chứa nút Back (`.btn-header-back`), nút Đóng (`.btn-header-close`), và nút Đổi cảng (`.btn-port-switch`) nằm ở góc trên cùng bên trái/phải màn hình (`Y: 10px - 50px`).
  - Nút chuyển tab Segmented Filter (`Tất cả`, `Chưa đọc`, `Cần duyệt`, `Đã đọc`) nằm ở nửa trên (`Y: 260px`).
  - Các nút hành động chính ở màn hình kết quả: Nút "Chụp lại" (`.btn-secondary`) nằm song song với nút "Xác nhận & Lưu" (`.btn-primary`) ở thanh Bottom Navigation.
- **Bằng chứng kiểm chứng:**
  - CSS: `frontend/src/features/meter-reading/meter-reading.css#L120-L180`.
  - Screenshots: `01-reading-worklist-top-mobile.png`, `09-ocr-success-mobile.png`, `11-edit-reading-mobile.png`.
  - Độ tin cậy: `VERIFIED_RUNTIME`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Công nhân một tay phải giữ dây leo, vịn lan can bến tàu hoặc cầm đèn pin soi tủ điện; chỉ có một tay cầm điện thoại (thường là màn hình lớn 6.1" - 6.7").
  - Với ngón cái tay thuận, vùng với lên Top Bar để đóng modal hoặc đổi chế độ rất khó với tới, dễ làm rơi máy xuống sàn bê tông hoặc rơi xuống nước biển.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Đưa toàn bộ các hành động mang tính quyết định xuống vùng "Natural Thumb Zone" (1/3 dưới cùng của màn hình).
  2. Sử dụng Bottom Sheets (vuốt xuống để đóng) thay vì đặt nút 'X' ở góc trên cùng bên phải.
  3. Kích thước nút bấm tối thiểu đạt chuẩn công nghiệp: 48px x 48px, khoảng cách đệm (padding) đủ lớn để không bị bấm nhầm khi đeo găng tay vải hoặc găng tay cao su mỏng.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Đảm bảo tương thích trên màn hình nhỏ (375px như iPhone SE) không bị tràn hoặc che khuất vùng nhập liệu bàn phím ảo.

---

### UX-05: Thiếu kiểm tra biến động chỉ số (Anomaly & Spurious Reading Detection)

- **Màn hình / State bị ảnh hưởng:**
  - `D4` (State 4A-Edit: Inline Edit)
  - `D5` (State 5: Review Fallback Manual Entry)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Hệ thống kiểm tra hợp lệ chỉ số bằng biểu thức chính quy: `^\d+(\.\d+)?$` với độ dài tối đa 12 ký tự (`backend/app/schemas/meter_reading.py#L45-L55`).
  - Không hề có bất kỳ logic nào so sánh chỉ số mới nhập (`new_reading`) với chỉ số của ca đọc liền trước (`previous_reading`):
    - Không cảnh báo nếu chỉ số mới **nhỏ hơn** chỉ số cũ (ngoại trừ trường hợp quay vòng công tơ 999999 -> 000000 - Rollover).
    - Không cảnh báo nếu sản lượng tiêu thụ trong 1 ca (ví dụ 1 giờ) tăng đột biến gấp 100 lần công suất cực đại của trạm (Spike Consumption).
- **Bằng chứng kiểm chứng:**
  - Code: `backend/app/api/v1/meter_reading.py#L210-L260` (chỉ insert DB, không có sanity check).
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Do mỏi mắt hoặc phản chiếu ánh sáng, nếu OCR nhận diện nhầm số `8` thành số `3` (chỉ số giảm từ 1258.4 xuống 1253.4) hoặc công nhân gõ thừa một số `0` (12580.4), hệ thống vẫn chấp nhận lưu thành công.
  - Sai sót này chỉ bị phát hiện khi xuất hóa đơn kế toán hoặc khi quản đốc đối soát, dẫn đến quy trình hủy hóa đơn và phạt biên bản rất phức tạp.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Hiển thị trực quan mức tiêu thụ ước tính (Delta Consumption): `Δ = Chỉ số mới - Chỉ số cũ` ngay bên dưới ô nhập liệu.
  2. Nếu `Δ < 0`: Hiển thị cảnh báo vàng/đỏ: *"Chỉ số mới nhỏ hơn chỉ số ca trước (1258.4 kWh). Có phải công tơ đã quay vòng?"*.
  3. Nếu `Δ > Ngưỡng định mức trạm`: Yêu cầu công nhân xác nhận lần hai hoặc bắt buộc chụp lại ảnh để đối soát.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Không được chặn cứng (hard block) việc lưu nếu công tơ thực sự bị thay thế mới (Meter replacement) hoặc quay vòng (Rollover). Phải cho phép công nhân chọn lý do: "Công tơ quay vòng" hoặc "Thay mới công tơ".

---

### UX-06: Hardcoded "Đo đếm điện năng" (kWh) cản trở mở rộng đo đếm nước (Water Utility Extension)

- **Màn hình / State bị ảnh hưởng:**
  - Toàn bộ giao diện Mobile (`D1`, `D2`, `D3`, `D4`, `D5`, `D6`)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Database schema hỗ trợ trường `utility_type: "ELECTRICITY" | "WATER"` (`backend/app/models/meter_logbook.py#L18`).
  - Bản đồ giám sát Admin (`AdminMapOverlayPage.tsx`) có bộ lọc chuyển đổi giữa Điện (kWh) và Nước ($m^3$).
  - **NHƯNG:** Toàn bộ giao diện Mobile của công nhân bị gán cứng nhãn:
    - Tiêu đề trang: `"Đo đếm điện năng"`
    - Đơn vị đo: `"kWh"` cố định trên mọi thẻ công tơ và màn hình kết quả
    - Mô hình AI OCR chỉ phát hiện hộp số điện (`lcd_digit_line`, `mechanical_black_row`).
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/MeterReadingPage.tsx#L210`, `frontend/src/features/meter-reading/components/MeterCard.tsx#L55`.
  - Screenshots: `01-reading-worklist-top-mobile.png`, `09-ocr-success-mobile.png`.
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Khi đơn vị triển khai mở rộng đo đếm đồng hồ cấp nước cho tàu biển tại cầu cảng, công nhân không thể phân biệt được công tơ nào là điện, đồng hồ nào là nước trong danh sách đọc, hoặc bị nhầm lẫn đơn vị đo $m^3$ thành kWh.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Hiển thị Icon và Badge phân loại tiện ích động: Biểu tượng Tia sét vàng (`⚡ Điện`) hoặc Giọt nước xanh (`💧 Nước`).
  2. Đơn vị đo động theo trường dữ liệu backend: `kWh` cho điện và `m³` cho nước.
  3. Đối với đồng hồ nước, cung cấp hướng dẫn chụp riêng hoặc form nhập tay chuyên dụng nếu mô hình OCR chưa hỗ trợ mặt số kim xoay.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Backend đã sẵn sàng trường `utility_type`. Frontend chỉ cần bind dữ liệu động thay vì hardcode chuỗi ký tự.

---

### UX-07: Khả năng hiển thị dưới ánh nắng chói chang bến cảng (High Glare & Sunlight Legibility)

- **Màn hình / State bị ảnh hưởng:**
  - Toàn bộ giao diện người dùng ngoài hiện trường.
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Giao diện hiện tại sử dụng tông màu chủ đạo: Nền sáng nhẹ (`#f8fafc`), chữ xám trung tính (`#64748b` cho subtitle), viền xám nhạt (`#e2e8f0`).
  - Thẻ tóm tắt tiến độ sử dụng gradient xanh biển mềm mại (`linear-gradient(135deg, #1e3a8a, #0284c7)`).
- **Bằng chứng kiểm chứng:**
  - CSS: `frontend/src/features/meter-reading/meter-reading.css#L15-L80`.
  - Screenshot: `01-reading-worklist-top-mobile.png`.
  - Độ tin cậy: `VERIFIED_RUNTIME`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Dưới ánh nắng gắt miền biển vào buổi trưa (11h - 14h), màn hình điện thoại bị phản chiếu cực mạnh (glare). Màu chữ xám `#64748b` và các viền thẻ mảnh `#e2e8f0` gần như vô hình, buộc công nhân phải căng mắt hoặc lấy tay che nắng để đọc thông tin.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Thiết kế chế độ hiển thị ngoài trời (Outdoor / High Contrast Sunlight Mode): Sử dụng nền đen chữ vàng/trắng hoặc nền trắng tinh chữ đen đậm `#000000`.
  2. Tăng kích thước phông chữ các trường thông tin trọng yếu (Mã công tơ, Vị trí tủ điện, Hạn giờ ca đọc).
  3. Tăng độ đậm (font-weight) của các nhãn trạng thái từ `400` lên `600` hoặc `700`.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Tuân thủ độ tương phản WCAG 2.1 cấp độ AAA (tối thiểu 7:1) cho các thành phần văn bản ngoài trời.

---

### UX-08: Thiếu cơ chế hàng đợi ngoại tuyến khi mất sóng (Offline Reading & Sync Queue)

- **Màn hình / State bị ảnh hưởng:**
  - `D3` (Capture) -> `D4` (OCR / Confirmation)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Mọi thao tác đọc chỉ số đều yêu cầu kết nối mạng thời gian thực:
    - Bấm chụp -> Gửi ngay `POST /api/v1/meter-operations/read-meter` (Base64 JPEG).
    - Bấm lưu -> Gửi ngay `POST /api/v1/meter-operations/confirm`.
  - Nếu mất mạng, hệ thống lập tức báo lỗi đỏ và đứng yên tại chỗ. Không có cơ chế lưu tạm vào hàng đợi (Queue) để tự động đồng bộ khi có sóng trở lại.
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/MeterReadingPage.tsx#L280-L360`.
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Nhiều tủ điện đặt sâu trong hầm kỹ thuật cáp ngầm, trong kho kín hoặc phía sau các container kim loại dày đặc nơi sóng 4G hoàn toàn bị triệt tiêu (No service). Công nhân không thể thực hiện công việc nếu ứng dụng đòi hỏi kết nối mạng 100%.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Hỗ trợ chụp và lưu trữ tạm thời ảnh cùng thời gian chụp vào IndexedDB khi không có mạng.
  2. Thanh trạng thái kết nối mạng trực quan: `● Ngoại tuyến (Đã lưu tạm 3 chỉ số)`.
  3. Khi có sóng trở lại, tự động gửi ảnh lên máy chủ để chạy OCR và đẩy vào danh sách "Chờ xác nhận lại".
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Cần bảo đảm mốc thời gian chụp ảnh thực tế (`client_captured_at`) được mã hóa bảo mật để chống gian lận thời gian ca đọc.

---

### UX-09: Thiếu phản hồi xúc giác (Haptic) và âm thanh hỗ trợ khi thao tác

- **Màn hình / State bị ảnh hưởng:**
  - `D3` (Nút chụp ảnh Shutter Button)
  - `D4` (Nút xác nhận hoàn thành)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Khi bấm nút chụp hoặc bấm lưu, hệ thống chỉ có chuyển đổi giao diện hình ảnh (hiển thị spinner xoay). Hoàn toàn không kích hoạt Web Vibration API (`navigator.vibrate`) hay âm thanh thông báo ngắn.
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/components/CameraCaptureModal.tsx#L90-L115`.
  - Độ tin cậy: `VERIFIED_STATIC`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Môi trường bến cảng có tiếng ồn máy móc, cẩu trục và tàu thủy rất lớn. Nếu chỉ có tín hiệu thị giác, công nhân khó biết chắc chắn mình đã chạm trúng nút chụp hay chưa, dẫn đến việc bấm liên tiếp nhiều lần gây lag ứng dụng.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Kích hoạt phản hồi rung ngắn (Haptic Tap - 50ms) khi chạm nút chụp ảnh.
  2. Phản hồi rung đôi (Success Haptic - 50ms, 100ms pause, 50ms) và âm thanh "ting" nhẹ khi xác nhận chỉ số thành công.
  3. Phản hồi rung dài cảnh báo (Error Haptic - 200ms) khi OCR thất bại hoặc gặp lỗi xung đột.
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Web Vibration API được hỗ trợ tốt trên Android Chrome/Edge nhưng bị giới hạn trên iOS Safari nếu chưa có tương tác người dùng phù hợp. Cần kiểm tra `if ("vibrate" in navigator)` trước khi gọi.

---

### UX-10: Danh mục công tơ thiếu bộ lọc thông minh theo lộ trình di chuyển thực tế (Route-based Sorting)

- **Màn hình / State bị ảnh hưởng:**
  - `D1` (Worklist Screen)
- **Hiện trạng ghi nhận được (Observed Behavior):**
  - Danh sách công tơ được sắp xếp cố định theo danh mục trạm hoặc thứ tự tạo trong cơ sở dữ liệu (`frontend/src/features/meter-reading/MeterReadingPage.tsx#L180-L200`).
  - Bộ lọc duy nhất hiện có là phân đoạn trạng thái: `Tất cả` / `Chưa đọc` / `Cần duyệt` / `Đã đọc`.
- **Bằng chứng kiểm chứng:**
  - Code: `frontend/src/features/meter-reading/MeterReadingPage.tsx#L240-L260`.
  - Screenshot: `01-reading-worklist-top-mobile.png`.
  - Độ tin cậy: `VERIFIED_RUNTIME`.
- **Tác động tới công nhân ngoài hiện trường:**
  - Một cảng có thể có 20 - 50 công tơ nằm dọc theo các cầu bến dài hàng cây số. Công nhân phải cuộn tìm thủ công tên công tơ tiếp theo trên màn hình thay vì danh sách tự sắp xếp theo thứ tự bước đi từ Cầu tàu số 1 đến Cầu tàu số 5.
- **Hướng thiết kế tiềm năng (Design Directions):**
  1. Bổ sung tùy chọn sắp xếp: `Theo lộ trình di chuyển (Inspection Route)`, `Theo vị trí tủ điện`, hoặc `Theo bảng chữ cái`.
  2. Bổ sung ô tìm kiếm nhanh (Quick Search by Meter Code / Location) ghim cố định ở đầu trang.
  3. Tự động đề xuất công tơ kế tiếp gần nhất sau khi bấm xác nhận công tơ hiện tại thành công ("Tiếp tục đo SIM-EM-002").
- **Ràng buộc nghiệp vụ / kỹ thuật:**
  - Cần backend bổ sung trường `route_order` hoặc `sequence_number` trong bảng `meters` để xác định thứ tự chuẩn của tuyến tuần tra.

---

## 4. TỔNG HỢP NGUYÊN TẮC BÀN GIAO CHO CHATGPT REDESIGN

Khi tiến hành thiết kế lại giao diện người dùng (UI/UX Redesign), ChatGPT cần tuân thủ nghiêm ngặt 5 "Nguyên tắc vàng" sau:

1. **Camera Full-frame là bất biến:** Không bao giờ thiết kế tính năng crop ảnh trên client trước khi gửi OCR. Mọi khung ngắm trên UI chỉ đóng vai trò hướng dẫn căn chỉnh thị giác.
2. **Một công tơ - Một chỉ số - Một ca đọc:** Không thiết kế luồng tạo nhiều chỉ số trong cùng một vòng đọc. Thiết kế phải xử lý khéo léo lỗi 409 thành màn hình xem lại hoặc chỉnh sửa hợp lệ.
3. **Ưu tiên công thái học hiện trường:** Thiết kế cho công nhân đứng thao tác bằng một tay, đeo găng tay bảo hộ, dưới ánh nắng chói chang và môi trường ồn ào. Vùng thao tác trọng yếu luôn nằm ở đáy màn hình.
4. **Bảo vệ dữ liệu tuyệt đối:** Bất kỳ thao tác hủy bỏ nào cũng phải được cảnh báo. Lưu tạm phiên làm việc vào bộ nhớ cục bộ để không bao giờ mất ảnh và số liệu khi người dùng vô tình chạm nút Back.
5. **Minh bạch giá trị OCR và Giá trị Chốt:** Luôn lưu giữ và hiển thị rõ ràng giá trị máy đọc được ban đầu (`ocr_reading`) và giá trị con người xác nhận sau cùng (`reading`), phục vụ kiểm toán và tái huấn luyện mô hình ML.
