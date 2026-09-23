# 00 — BẮT ĐẦU TẠI ĐÂY: HƯỚNG DẪN TIẾP NHẬN TOÀN BỘ TÀI LIỆU AUDIT & BẰNG CHỨNG
## (EXECUTIVE SUMMARY & NAVIGATION GUIDE FOR CHATGPT REDESIGN)

**Package Identifier:** `user-meter-reading-ux-audit`  
**Git Baseline:** Commit `5d370478148bcf7b2fb0a8b9eb5e7090b8f36c53` (Branch: `feature/v16e-network-map-overlay-r1`)  
**Audit Date:** 2026-09-21  
**Author Roles:** Senior Product Analyst, Frontend Architect, UX Researcher, QA Engineer  
**Output ZIP Target:** `docs/audits/user-meter-reading-ux-audit.zip`  

---

## 1. TỔNG QUAN DỰ ÁN VÀ MỤC ĐÍCH CỦA BỘ TÀI LIỆU NÀY

Tài liệu này là cửa ngõ chính (Entry Point) của gói bàn giao kiểm định chuyên sâu về **Quy trình và Trải nghiệm đọc chỉ số công tơ của nhân viên hiện trường (User / Employee Meter Reading Journey)** trong hệ thống `production-meter-reading`.

Đây là gói bàn giao phục vụ **NGHIÊN CỨU VÀ TÁI THIẾT KẾ UI/UX (UI/UX REDESIGN HANDOFF)**. Nhiệm vụ của gói tài liệu này là cung cấp cho ChatGPT và đội ngũ thiết kế toàn bộ sự thật khách quan về hệ thống:
1. Cơ sở dữ liệu, API contracts, và logic nghiệp vụ thực tế (Business Rules & Invariants).
2. Toàn bộ các trạng thái giao diện hiện có (State Machine & Screen Inventory) kèm bằng chứng ảnh chụp màn hình 100% trung thực.
3. Các rủi ro vận hành ngoài hiện trường (Field UX Hazards, Thumb Zone, Mất mạng, Chói nắng).
4. Các bất biến kỹ thuật bắt buộc phải tuân thủ (ví dụ: khung hình camera không được crop trước khi đưa vào ML OCR).

---

## 2. QUY CHUẨN ĐỘ TIN CẬY CỦA DỮ LIỆU (VERIFICATION TAXONOMY)

Mọi thông tin, phát hiện, và quy tắc trong gói tài liệu này đều được phân loại nghiêm ngặt theo 6 cấp độ kiểm chứng:

- `VERIFIED_RUNTIME`: Đã được chạy thực tế trên môi trường máy chủ cục bộ (Localhost Dev Server, Edge Playwright headless, Pytest, Vitest) và ghi nhận kết quả xác thực.
- `VERIFIED_STATIC`: Đã được đối chiếu và kiểm chứng trực tiếp từng dòng mã nguồn (Python Backend, React/TypeScript Frontend, SQL Schema, ML Inference).
- `REPORTED`: Thông tin được ghi nhận từ tài liệu nội bộ, comment mã nguồn hoặc tài liệu kiến trúc có sẵn.
- `INFERRED`: Suy luận logic có căn cứ kỹ thuật rõ ràng dựa trên hành vi thực tế của hệ thống.
- `UNKNOWN`: Thông tin chưa thể xác định chắc chắn từ mã nguồn hoặc môi trường thử nghiệm hiện tại.
- `NOT_IMPLEMENTED`: Tính năng có xuất hiện trong ý tưởng, mô hình dữ liệu hoặc nhãn giao diện nhưng chưa được lập trình trong logic cốt lõi.

---

## 3. CẤU TRÚC GÓI TÀI LIỆU VÀ MỤC LỤC CHI TIẾT

Gói bàn giao được tổ chức khoa học thành 12 tài liệu Markdown chuyên đề, 4 sơ đồ kiến trúc Mermaid, 18 ảnh chụp màn hình kiểm chứng và 3 tệp dữ liệu trích xuất kỹ thuật:

```
docs/audits/user-meter-reading-ux/
├── 00_README_FIRST.md                     <- [BẠN ĐANG ĐỌC TÀI LIỆU NÀY]
├── 01_SYSTEM_BASELINE.md                  <- Cấu trúc mã nguồn, React State vs URL, Vòng đời Component
├── 02_BUSINESS_RULES_AND_DATA_MODEL.md    <- Thực thể DB, Điện vs Nước, Ràng buộc ca đọc, Quy tắc kế toán
├── 03_USER_JOURNEYS.md                    <- 8 kịch bản hành trình chi tiết của công nhân ngoài hiện trường
├── 04_STATE_MACHINE.md                    <- Ma trận 11 trạng thái UI/UX, Guards, Transitions, Z-index stacking
├── 05_SCREEN_INVENTORY.md                 <- Danh mục chi tiết màn hình D1 đến D7, Kích thước touch target
├── 06_UI_UX_FINDINGS.md                   <- 6 phát hiện trọng yếu về công thái học, rủi ro mất dữ liệu
├── 07_API_AND_DATA_FLOW.md                <- Chi tiết 7 REST API, Nguồn gốc dữ liệu (Provenance), Vòng đời ảnh
├── 08_SCREENSHOT_MANIFEST.md              <- Bảng kê đối soát 18 ảnh chụp màn hình kiểm chứng (Metadata & SHA)
├── 09_TEST_AND_RUNTIME_REPORT.md          <- Báo cáo thực thi 313 ca kiểm thử (Vitest & Pytest), Build log
├── 10_UX_REDESIGN_INPUT.md                <- Bảng đặc tả 10 vấn đề UX & Hướng thiết kế tiềm năng cho ChatGPT
├── 11_OPEN_QUESTIONS.md                   <- 5 câu hỏi nghiệp vụ và 4 câu hỏi kỹ thuật trọng yếu
├── ZIP_VALIDATION_REPORT.md               <- Báo cáo kiểm định 10 tiêu chí toàn vẹn của tệp ZIP bàn giao
│
├── diagrams/                              <- 4 Sơ đồ kiến trúc & luồng dữ liệu (Mermaid định dạng chuẩn)
│   ├── architecture.mmd                   <- Kiến trúc tổng thể Client - Server - ML - File Storage
│   ├── user-journey.mmd                   <- Sơ đồ hành trình 5 pha của nhân viên vận hành
│   ├── reading-state-machine.mmd          <- Máy trạng thái hữu hạn FSM (S0 -> S6)
│   └── data-flow.mmd                      <- Biểu đồ tuần tự (Sequence) RAM Inference -> Disk Evidence
│
├── evidence/                              <- Dữ liệu trích xuất kỹ thuật nguyên bản
│   ├── git-baseline.md                    <- Bằng chứng Git commit, branch status, clean working tree
│   ├── sanitized-api-contracts.md         <- Bản đặc tả Request/Response JSON đã khử nhạy cảm của 7 API
│   └── source-reference-index.md          <- Bảng tra cứu chéo mã nguồn (Line-by-line code mapping)
│
└── screenshots/                           <- 18 Ảnh chụp màn hình kiểm chứng thực tế (390x844, 768x1024, 1280x800)
    ├── 01-reading-worklist-top-mobile.png
    ├── 02-reading-worklist-scrolled-mobile.png
    ├── 03-meter-detail-mobile.png
    ├── 04-hourly-schedule-mobile.png
    ├── 05-camera-ready-mobile.png
    ├── 06-camera-permission-error-mobile.png
    ├── 07-image-preview-mobile.png
    ├── 08-ocr-processing-mobile.png
    ├── 09-ocr-success-mobile.png
    ├── 10-ocr-review-mobile.png
    ├── 11-edit-reading-mobile.png
    ├── 12-manual-entry-mobile.png
    ├── 13-confirmation-success-mobile.png
    ├── 14-unsaved-work-modal-mobile.png
    ├── 15-no-active-round-mobile.png
    ├── 16-confirmed-meter-mobile.png
    ├── 17-reading-worklist-tablet.png
    └── 18-reading-worklist-desktop.png
```

---

## 4. TÓM TẮT 5 PHÁT HIỆN BẢN LỀ (KEY SYSTEM INVARIANTS)

Khi bắt đầu nghiên cứu gói tài liệu này, người thiết kế cần ghi nhớ ngay 5 sự thật bản lề của hệ thống:

1. **Khung hình Camera không được Crop (Full-frame Uncropped Invariant):**
   - Khung chữ nhật màu xanh trên giao diện camera (`05-camera-ready-mobile.png`) chỉ là chỉ dẫn căn chỉnh bằng mắt. Ứng dụng chụp toàn bộ khung hình camera 1080p và gửi nguyên bản lên backend. Mô hình YOLOv8 cần toàn cảnh mặt công tơ để nhận diện chính xác. Thiết kế mới **tuyệt đối không được tự ý crop ảnh trên client**.
2. **Ràng buộc duy nhất: Một công tơ - Một chỉ số - Một ca đọc:**
   - Cơ sở dữ liệu áp đặt `UniqueConstraint("meter_id", "reading_round_id")`. Không thể có 2 bản ghi chỉ số cho cùng 1 công tơ trong cùng 1 ca. Gửi lại sẽ nhận `HTTP 409 Conflict`.
3. **Thực tế Điện vs Nước (The Utility Reality):**
   - Cơ sở dữ liệu và Admin Map Overlay hỗ trợ cả Điện (`ELECTRICITY`) và Nước (`WATER`). Nhưng ứng dụng di động thực địa hiện tại đang bị **hardcode 100% cho Điện** (tiêu đề `"Đo đếm điện năng"`, đơn vị `kWh`, mô hình AI chỉ nhận diện số điện).
4. **Vòng đời ảnh: Bộ nhớ RAM vs Đĩa cứng:**
   - Khi chạy OCR suy luận (`POST /api/v1/meter-operations/read-meter`), ảnh chỉ nằm trong RAM của server, **hoàn toàn không ghi đĩa**.
   - Chỉ khi người dùng bấm "Xác nhận & Lưu" (`POST /api/v1/meter-operations/confirm`), ảnh mới được ghi xuống đĩa cứng tại `data/meter_reading_evidence/` để phục vụ đối soát kế toán.
5. **Lỗ hổng mất dữ liệu khi điều hướng di động (State Loss Hazard):**
   - Toàn bộ flow di động phụ thuộc vào React Local State. Không có URL routing, không có history state, và không có bộ chặn `window.onbeforeunload`. Một cú vuốt Back vô tình của công nhân trên Android sẽ làm mất trắng ảnh chụp và kết quả OCR mà không có cơ hội phục hồi.

---

## 5. HƯỚNG DẪN DÀNH CHO CHATGPT KHI BẮT ĐẦU THIẾT KẾ LẠI (INSTRUCTIONS FOR CHATGPT)

Kính gửi ChatGPT (hoặc AI Agent đảm nhiệm vai trò UI/UX Redesign), xin hãy làm theo quy trình khuyến nghị sau:

### Bước 1: Đọc và nắm vững bối cảnh thực tế
- Đọc kỹ tài liệu này (`00_README_FIRST.md`) để nắm bức tranh toàn cảnh.
- Đọc `02_BUSINESS_RULES_AND_DATA_MODEL.md` để hiểu các quy tắc nghiệp vụ không thể thay đổi của backend.
- Đọc `07_API_AND_DATA_FLOW.md` để nắm rõ các trường dữ liệu API bắt buộc.

### Bước 2: Quan sát hiện trạng trực quan qua ảnh chụp
- Mở `08_SCREENSHOT_MANIFEST.md` và đối chiếu với các tệp ảnh trong thư mục `screenshots/`.
- Đặc biệt chú ý:
  - `01-reading-worklist-top-mobile.png`: Màn hình danh sách công việc chính.
  - `05-camera-ready-mobile.png`: Giao diện ngắm camera và reticle.
  - `09-ocr-success-mobile.png`: Màn hình trả về kết quả đọc thành công (Hero reading 52px).
  - `10-ocr-review-mobile.png`: Màn hình trường hợp OCR không chắc chắn (Review fallback).
  - `14-unsaved-work-modal-mobile.png`: Modal cảnh báo hủy bỏ công việc.

### Bước 3: Nghiên cứu các điểm nghẽn UX cần giải quyết
- Đọc `10_UX_REDESIGN_INPUT.md`: Đây là tài liệu quan trọng nhất chứa danh mục 10 bài toán UX từ UX-01 đến UX-10 kèm tác động thực tế ngoài công trường và hướng giải quyết gợi ý.
- Đọc `11_OPEN_QUESTIONS.md`: Để hiểu rõ những câu hỏi nghiệp vụ cần giải định hoặc làm rõ với khách hàng.

### Bước 4: Đề xuất thiết kế mới dựa trên sự thật hệ thống
- Khi đề xuất Wireframe, User Flow hoặc UI Design System mới, hãy bảo đảm:
  - Đặt các nút bấm trọng yếu trong tầm với của ngón cái (Bottom Thumb Zone).
  - Tích hợp cơ chế lưu tạm phiên đọc (IndexedDB/Session) để chống mất dữ liệu khi Back.
  - Xử lý lỗi mạng 409 thành màn hình xác nhận nhẹ nhàng, không gây hoang mang.
  - Hỗ trợ hiển thị linh hoạt cho cả Điện (`kWh`) và Nước (`m³`).
  - Đảm bảo độ tương phản cao phục vụ công nhân thao tác dưới ánh nắng chói chang bến cảng.
