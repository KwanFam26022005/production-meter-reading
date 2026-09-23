# 11 — OPEN BUSINESS & TECHNICAL QUESTIONS

**Document Version:** 1.0.0  
**Target Audience:** Product Owners, Port Operations Managers, System Architects, UI/UX Designers  
**Context:** Local Audit of `production-meter-reading` (Field User Meter Reading Flow)  
**Verification Baseline:** Git commit `5d37047`, Node v20.18.0, Python 3.12, Edge Playwright Runtime  

---

## 1. MỤC ĐÍCH TÀI LIỆU

Trong quá trình phân tích tĩnh (Static Code Analysis) và kiểm thử động (Runtime Execution) toàn diện hệ thống `production-meter-reading`, nhóm kiểm định đã phát hiện ra một số điểm chưa đồng nhất giữa mã nguồn hiện tại, quy chuẩn nghiệp vụ bến cảng, và thiết kế giao diện.

Tài liệu này liệt kê các câu hỏi nghiệp vụ và kỹ thuật trọng yếu (Priority Open Questions) cần sự thống nhất từ Ban điều hành sản xuất, Chủ sở hữu sản phẩm (PO) và Kiến trúc sư giải pháp trước khi triển khai thiết kế lại giao diện (UI/UX Redesign).

---

## 2. DANH MỤC CÂU HỎI NGHIỆP VỤ TRỌNG YẾU (BUSINESS QUESTIONS)

---

### BQ-01: Lộ trình và phương thức đọc đồng hồ đo nước (Water Utility Roadmap)

- **Bối cảnh hiện tại:**
  - Cơ sở dữ liệu backend và màn hình Admin Map Overlay hỗ trợ đầy đủ `utility_type: "ELECTRICITY" | "WATER"`.
  - Tuy nhiên, toàn bộ giao diện Mobile của công nhân bị gán cứng nhãn `"Đo đếm điện năng"` và đơn vị `"kWh"`.
  - Mô hình ML AI (`inference.py`) chỉ được huấn luyện để nhận dạng mặt số công tơ điện (`lcd_digit_line`, `mechanical_black_row`), hoàn toàn không nhận dạng được mặt số đồng hồ nước cơ học (kim xoay 4-5 mặt đồng hồ tròn nhỏ).
- **Câu hỏi đặt ra:**
  1. *Đồng hồ nước sẽ được đọc bằng cách nào trong phiên bản tiếp theo?*
     - **Lựa chọn A:** Tiếp tục dùng chụp ảnh nhưng chỉ ghi nhận hình ảnh bằng chứng, nhân viên phải nhập tay số khối ($m^3$) 100% (Manual Entry with Photo Evidence).
     - **Lựa chọn B:** Sẽ có một mô hình ML mới chuyên dụng cho đồng hồ nước bến cảng được tích hợp vào pipeline OCR.
     - **Lựa chọn C:** Tạm thời ẩn toàn bộ đồng hồ nước khỏi ứng dụng di động của công nhân, chỉ hiển thị công tơ điện cho đến khi có thông báo mới.
  2. *Nếu hỗ trợ đồng hồ nước, danh sách công tơ nên gom chung hay tách tab riêng biệt giữa Điện và Nước?*

---

### BQ-02: Phân bổ công việc: Danh mục chung toàn Cảng vs Giao việc theo Cá nhân / Tuyến

- **Bối cảnh hiện tại:**
  - Endpoint `GET /api/v1/meter-operations/today?port_id=...` trả về danh sách toàn bộ công tơ của cảng đã chọn. Mọi nhân viên khi đăng nhập vào cùng một cảng đều nhìn thấy một danh sách giống hệt nhau.
  - Không có khái niệm phân công ca trực cá nhân (Personal Assigned Meters) hay tuyến tuần tra (Assigned Patrol Route).
- **Câu hỏi đặt ra:**
  1. *Quy trình vận hành tại cảng là "Ai đến trước đọc trước" (First-come, first-served) hay "Phân công cụ thể cho từng nhân viên"?*
  2. *Nếu có nhiều nhân viên cùng đi đọc trong một ca, có cần cơ chế "Khóa tạm thời" (Locking / In-progress Indicator) để tránh 2 người cùng đi đến 1 công tơ hay không?*
  3. *Có cần bổ sung thứ tự tuyến đường (Sequence / Route order) để sắp xếp danh sách theo lộ trình đi bộ ngắn nhất của công nhân dọc theo cầu cảng không?*

---

### BQ-03: Ràng buộc Điểm danh (Attendance Check-in Gate: Hard Block hay Soft Warning?)

- **Bối cảnh hiện tại:**
  - Màn hình làm việc di động có hiển thị trạng thái điểm danh của nhân viên.
  - Tuy nhiên, tại backend, endpoint `POST /api/v1/meter-operations/confirm` **hoàn toàn không kiểm tra** nhân viên đã điểm danh hay chưa (`has_checked_in`). Nhân viên chưa điểm danh vẫn có thể bấm ghi và lưu chỉ số thành công vào cơ sở dữ liệu (`backend/app/api/v1/meter_reading.py#L210-L260`).
- **Câu hỏi đặt ra:**
  1. *Về mặt kỷ luật lao động, nhân viên chưa điểm danh đầu ca có được phép ghi chỉ số công tơ hay không?*
     - **Nếu KHÔNG (Hard Block):** Backend và Frontend cần chặn nút chụp ảnh và yêu cầu nhân viên điểm danh trước khi bắt đầu công việc.
     - **Nếu CÓ (Soft Warning):** Cho phép ghi nhưng hệ thống sẽ gắn cờ cảnh báo (Flag: `recorded_without_attendance`) để quản đốc kiểm tra sau.

---

### BQ-04: Xử lý quay vòng công tơ (Rollover) và Thay mới công tơ (Meter Replacement)

- **Bối cảnh hiện tại:**
  - Hệ thống hiện tại chỉ kiểm tra định dạng số dương `^\d+(\.\d+)?$`.
  - Không có cơ chế kiểm tra chênh lệch chỉ số giữa ca này và ca trước ($\Delta = \text{Chỉ số mới} - \text{Chỉ số cũ}$).
- **Câu hỏi đặt ra:**
  1. *Khi công tơ cơ khí đạt giới hạn và quay về 000000 (Rollover), hoặc khi công tơ cũ bị cháy hỏng và được thay thế bằng công tơ mới có chỉ số ban đầu nhỏ hơn chỉ số cũ:*
     - Giao diện có cần cho phép công nhân đánh dấu lý do: `[x] Công tơ quay vòng` hoặc `[x] Thay thế công tơ mới` không?
     - Mức tiêu thụ ($\Delta$) trong trường hợp quay vòng sẽ được hệ thống tính toán theo công thức nào (ví dụ: $(1000000 - \text{Cũ}) + \text{Mới}$)?
  2. *Có cần thiết lập ngưỡng cảnh báo sản lượng bất thường (Anomaly Spike Alert) khi sản lượng tăng vọt quá 300% so với trung bình các ca trước hay không?*

---

### BQ-05: Thẩm quyền duyệt chỉ số trạng thái "Cần duyệt" (REVIEW Status Authority)

- **Bối cảnh hiện tại:**
  - Khi OCR có độ tin cậy thấp hoặc công nhân bấm "Gửi duyệt", bản ghi được tạo trong DB với trạng thái `REVIEW`.
  - Sau đó, nếu nhân viên mở lại công tơ đó trên mobile và bấm chụp lại hoặc nhập tay rồi lưu, bản ghi sẽ tự động chuyển thành `CONFIRMED`.
- **Câu hỏi đặt ra:**
  1. *Ai là người có thẩm quyền cao nhất để phê duyệt một bản ghi `REVIEW`?*
     - Chỉ có Quản đốc / Giám sát viên (Admin / Supervisor) trên Web Portal mới có quyền duyệt?
     - Hay chính nhân viên hiện trường có thể tự giải quyết bằng cách đo lại hoặc nhập tay?
  2. *Nếu chỉ số cần duyệt tồn đọng đến hết ca làm việc mà không ai xử lý, ca đọc (Reading Round) có được phép chốt sổ không, hay phải chờ duyệt hết 100%?*

---

## 3. DANH MỤC CÂU HỎI KỸ THUẬT TRỌNG YẾU (TECHNICAL QUESTIONS)

---

### TQ-01: Kiến trúc Ngoại tuyến (Offline Caching & Background Sync Strategy)

- **Bối cảnh hiện tại:**
  - Ứng dụng hiện tại là SPA thuần túy phụ thuộc 100% vào mạng trực tuyến thời gian thực.
  - Các tủ điện bến cảng có thể nằm trong vùng lõm sóng di động (hầm cáp ngầm, kho kín, tàu biển che chắn).
- **Câu hỏi đặt ra:**
  1. *Phạm vi hỗ trợ ngoại tuyến (Offline Scope) mong muốn là gì?*
     - **Mức 1 (Tối thiểu):** Chụp ảnh và lưu tạm thời vào IndexedDB trên máy khi mất mạng. Khi ra vùng có sóng 4G, người dùng ấn "Đồng bộ" để gửi toàn bộ ảnh lên OCR.
     - **Mức 2 (Toàn diện - PWA):** Tải trước toàn bộ danh sách công tơ và lịch đọc vào Cache Storage, cho phép nhập tay chỉ số khi ngoại tuyến và tự động đồng bộ ngầm khi có mạng.
  2. *Vấn đề bảo mật mốc thời gian (Timestamp Integrity):* Nếu thiết bị ngoại tuyến và đồng hồ của điện thoại bị chỉnh sai lệch, hệ thống làm thế nào để đảm bảo mốc thời gian chụp ảnh (`captured_at`) là trung thực và thuộc về đúng ca đọc đó?

---

### TQ-02: Cơ chế chống xung đột mạng (409 Conflict Resolution & Idempotency)

- **Bối cảnh hiện tại:**
  - Khi người dùng gửi request xác nhận nhưng gặp chập chờn mạng và bấm lại lần hai, backend trả về `HTTP 409 Conflict`. Frontend hiện tại hiển thị lỗi đỏ gây hoang mang cho công nhân.
- **Câu hỏi đặt ra:**
  1. *Backend có thể hỗ trợ Idempotency Key (khóa bất biến) không?*
     - Nếu client gửi lại request cùng một `idempotency_key` (hoặc cùng cặp `meter_id` + `reading_round_id` + `reading` từ cùng một user trong vòng 5 phút), backend nên trả về `HTTP 200 OK` kèm dữ liệu đã lưu thay vì bắn lỗi `HTTP 409`.
  2. *Nếu giữ nguyên backend trả về 409, Frontend có được phép tự động xử lý thành trạng thái "Đã ghi nhận thành công từ trước" để trấn an người dùng hay không?*

---

### TQ-03: Quản lý dung lượng đĩa và chính sách lưu trữ bằng chứng (Evidence Retention Policy)

- **Bối cảnh hiện tại:**
  - Mỗi bức ảnh xác nhận được lưu dưới dạng file JPEG nguyên bản chất lượng cao (Q95, 1.5MB - 3.5MB/ảnh) tại thư mục cục bộ `data/meter_reading_evidence/{YYYYMMDD}/`.
  - Các ảnh mẫu huấn luyện được lưu tại `data/meter_training_samples/`.
  - Với một cảng có 50 công tơ, đọc 6 ca/ngày:
    $$\text{Dung lượng} \approx 50 \times 6 \times 2.5\text{MB} = 750\text{MB/ngày} \approx 22.5\text{GB/tháng} \approx 270\text{GB/năm}$$
- **Câu hỏi đặt ra:**
  1. *Chính sách lưu trữ và dọn dẹp bằng chứng hình ảnh (Evidence Retention Policy) như thế nào?*
     - Giữ ảnh gốc chất lượng cao trong bao nhiêu ngày (30 ngày / 90 ngày)?
     - Sau thời hạn đó, có nén xuống định dạng WebP chất lượng thấp hơn hoặc chuyển lên lưu trữ đám mây (S3 / Cloud Storage / Cold Storage) không?
  2. *Ảnh có cần gắn Watermark vĩnh viễn (In chìm Mã công tơ, Tên người đọc, Tọa độ GPS, Mốc thời gian) trực tiếp vào pixel ảnh trước khi lưu đĩa để phục vụ pháp lý không?*

---

### TQ-04: Đồng bộ trạng thái điều hướng với History API & Cứu vãn dữ liệu (Session Resilience)

- **Bối cảnh hiện tại:**
  - Toàn bộ flow di động nằm trong 1 route React duy nhất (`/`). Trạng thái chụp ảnh và kết quả OCR chỉ nằm trong React state tạm thời.
  - Phím Back vật lý trên Android hoặc vuốt cạnh viền (Edge Swipe) sẽ thoát ứng dụng hoặc refresh trang, làm mất trắng ảnh vừa chụp.
- **Câu hỏi đặt ra:**
  1. *Thiết kế lại có bắt buộc phải ánh xạ các bước đọc chỉ số vào URL Hash hoặc Memory Route không?* (Ví dụ: `#/reading/capture/{meter_id}`, `#/reading/result/{meter_id}`)
  2. *Có chấp thuận việc lưu tạm ảnh Base64 vào IndexedDB ngay sau khi bấm chụp để phòng trường hợp ứng dụng bị hệ điều hành Android tự động thu hồi bộ nhớ (OS Memory Eviction / Low Memory Killer) không?*

---

## 4. MA TRẬN TỔNG HỢP VÀ ĐỀ XUẤT HÀNH ĐỘNG (ACTION MATRIX)

| Mã câu hỏi | Chủ đề | Bên chịu trách nhiệm phản hồi | Đề xuất khuyến nghị tạm thời cho UI Redesign |
| :--- | :--- | :--- | :--- |
| **BQ-01** | Đồng hồ đo nước | Product Owner / Vận hành | Thiết kế UI hỗ trợ Icon/Badge động (`⚡` / `💧`) và đơn vị động (`kWh` / `m³`), luồng nước hỗ trợ chụp ảnh + nhập tay số liệu. |
| **BQ-02** | Phân công công việc | Trưởng ban Vận hành Cảng | Giữ danh mục chung toàn cảng nhưng bổ sung bộ lọc theo Lộ trình di chuyển (Route) và ô tìm kiếm nhanh. |
| **BQ-03** | Ràng buộc Điểm danh | Nhân sự / Vận hành Cảng | Hiện cảnh báo nổi bật (Soft Warning banner) nếu chưa điểm danh; không hard block để tránh nghẽn công việc đột xuất. |
| **BQ-04** | Rollover & Thay công tơ | Kế toán kỹ thuật / Cơ điện | Bổ sung nút chuyển đổi: `[ ] Công tơ quay vòng / Thay mới` để bỏ qua kiểm tra âm sản lượng. |
| **BQ-05** | Thẩm quyền duyệt REVIEW | Trưởng ca / Quản đốc | Cho phép nhân viên hiện trường tự đo lại để chuyển sang `CONFIRMED`; web admin có quyền duyệt chốt sổ cuối cùng. |
| **TQ-01** | Ngoại tuyến (Offline) | Tech Lead / Frontend Arch | Thiết kế giao diện có chỉ báo kết nối mạng (`Online` / `Offline`); chuẩn bị sẵn luồng lưu ảnh tạm vào IndexedDB. |
| **TQ-02** | Xung đột 409 | Backend Lead / Frontend | Xử lý lỗi 409 phía UI thành thông báo: *"Chỉ số đã được ghi nhận trước đó"* và hiển thị trạng thái hoàn thành. |
| **TQ-03** | Lưu trữ ảnh bằng chứng | DevOps / Hạ tầng | Tiếp tục gửi ảnh đầy đủ lên server; chuẩn bị sẵn không gian UI cho việc xem lại ảnh bằng chứng kèm metadata. |
| **TQ-04** | Cứu vãn dữ liệu Back | Frontend Architect | Chặn sự kiện `beforeunload` và đồng bộ History API để ngăn chặn triệt để mất dữ liệu khi vuốt Back nhầm. |
