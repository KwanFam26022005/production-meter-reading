---
name: saigon-port-ui
description: >-
  Use this skill whenever designing, reviewing, or implementing frontend UI for the Saigon Port
  production meter reading application, including the mobile User Portal, desktop Operations Portal,
  and Map V2 digital twin workspaces. Do not activate for backend API, SQLite, or database tasks.
---

# Saigon Port UI Skill

Use this skill whenever designing, reviewing, or implementing frontend UI for this repository.

## Mission

Create a **Saigon Port operational workspace** spanning field mobile meter reading and desktop operations.

The product aesthetic is:

**Maritime Operational Minimalism**

The UI must feel trustworthy, operational, maritime, and human. AI is an invisible capability, not the visual theme.

## Authority

When this skill conflicts with generic frontend styles, this skill wins.

Priority:

1. Existing product/API behavior in the repository.
2. This skill.
3. `frontend/DESIGN_DNA.md`.
4. Accessibility/mobile usability.
5. Generic UI/frontend skills.
6. Framework defaults.

## Scoped Operating Profiles

To prevent ambiguity between field mobile reading and desktop administrative control, visual and ergonomic guidelines are partitioned into three explicit operational scopes:

### 1. User Portal (Mobile-First Operational Experience)
Field meter reading, camera capture, and shift attendance under harsh wharf sunlight.
- **Priorities**:
  - Outdoor readability: high-contrast surfaces with `--sgp-corporate-porcelain` (`#FCFCFC`) canvas.
  - Linear camera and meter-reading workflow without modal interruptions.
  - Large touch targets (minimum 48x48px, primary CTA 52–56px).
  - Concise Vietnamese operational terminology (`Chụp công tơ`, `Đang đọc chỉ số...`, `Xác nhận`).
  - Restrained maritime-blue styling (`#003875`, `#415C94`).
  - **Strict prohibition**: No neon, no glow, no dark mode default, no decorative animation.

### 2. Operations Portal (Desktop-First Operational Workspace)
Centralized wharf operations, meter inventory, staff rosters, audit logbook, and reporting.
- **Priorities**:
  - Information density appropriate for desktop viewports (1280px–1920px).
  - Clear data tables, inspection split-panels, and explicit administrative filters.
  - Consistent Saigon Port corporate identity and unified header/sidebar typography.
  - Full keyboard accessibility, focus indicators (`#0068FF`), and WCAG 2.1 AA/AAA contrast.
  - High legibility on standard laptop and desktop monitors under office lighting.

### 3. Map V2 (GIS Infrastructure Digital Twin)
Technical GIS network overlay of Tan Thuan substation, distribution busbars, and utility meters.
- **Permitted Modes**:
  - **Technical Light** (Default operational mode): High-contrast daytime network overlay on porcelain/white canvas.
  - **Neon Digital Twin** (Restrained presentation mode): Explicitly approved dark digital-twin mode utilizing controlled SVG filter glow (`stdDeviation="2.2"`) for high-contrast electricity/water trunk trace.
- **Invariants**:
  - Maintain correct canonical geometry (frozen B2 busbar and feeder coordinates).
  - Clear utility-network hierarchy: 22kV Substation -> Feeder Lines -> Meter Points.
  - Simulation disclosure: explicit watermark/badge indicating simulated topology.
  - Readable electricity (Amber `#FFB703` / `#FCC959`) and water (Blue `#0068FF`) separation.
  - No continuous decorative animation or ornamental particle effects.

---

## Product Scope & Information Architecture

The application serves field personnel and administrative operations across six core modules:

1. **Đăng nhập (Login)**: Xác thực an toàn cho nhân viên tác nghiệp và quản trị viên cảng qua mã nhân viên và mật khẩu.
2. **Trung tâm Tác nghiệp (Home Hub)**: Hub điều hướng di động tinh gọn cho nhân sự ca trực với User Context, Progress Ring phản ánh tiến độ ghi toàn cảng, Actionable Insight Feed theo thời gian thực và Bottom Radial Navigation.
3. **Đo đếm điện năng (Meter Reading)**: Sổ ghi chỉ số theo đợt/lượt, giao diện chụp ảnh công tơ với khung định chuẩn, xử lý OCR, màn hình kết quả kiểm tra với ảnh ROI phóng to, xác nhận, hiệu chỉnh số đọc hoặc nhập thủ công.
4. **Chấm công ca làm (Photo Attendance)**: Giao diện chụp ảnh chấm công vào ca / tan ca thời gian thực với ghi nhận tọa độ và mốc thời gian máy chủ.
5. **Lịch làm việc & Phép (Schedule & Leave)**: Thời khóa biểu tháng cá nhân, xem ca trực kế tiếp, đăng ký nghỉ phép và yêu cầu hoán đổi ca.
6. **Không gian Quản trị (Admin Workspace)**: Hệ thống điều hành tập trung gồm Bản đồ số Digital Twin (hạ tầng mạng lưới điện/nước Tân Thuận), Danh mục thiết bị & công tơ, Lịch ghi & đợt đọc, Sắp ca & điều độ nhân sự (Staff Roster), Hậu kiểm chỉ số (Reading Inspection & Verification), Nhật ký kiểm toán (Audit Log) và Báo cáo sản lượng.

### Invariant OCR Workflow Constraints

Khi thực hiện tác vụ ghi chỉ số công tơ, luồng thao tác bắt buộc tuân thủ tuần tự bảo vệ trường dữ liệu thực địa:

```text
Chọn đợt/lượt -> Chụp ảnh (Capture) -> Xem trước (Preview) -> Nhận diện (Processing) -> Xác nhận/Hiệu chỉnh (Result)
```

- **Khung ngắm camera**: Hình chữ nhật tối giản với 4 dấu góc gãy gọn, không dùng lưới quét HUD viễn tưởng hay hiệu ứng laser beam.
- **Chỉ dẫn chụp**: Ngắn gọn, ví dụ: `Đặt dãy số công tơ rõ trong khung`.
- **Màn hình nhận diện (Processing)**: Hiển thị trạng thái đang xử lý thực tế, không dùng phần trăm giả lập hoặc từ ngữ viễn tưởng kiểu "AI đang suy nghĩ".
- **Màn hình kết quả (Result)**: Số đọc công tơ là nhân vật chính (hero element), cỡ lớn 44–56px, định dạng số dạng bảng (`tabular-nums lining-nums`).
- **Trạng thái xem xét (Review)**: Là một trạng thái vận hành bình thường khi ảnh mờ hoặc phản sáng, luôn cung cấp nút hành động rõ ràng: **Chụp lại** và tùy chọn nhập tay nếu cần.

## Visual direction

Use:

- Nền vận hành Porcelain sáng, bề mặt thẻ White sạch sẽ,
- Màu xanh hải quân chủ đạo (Primary Navy) vững chãi, uy tín,
- Chữ đen và than đậm (Black/Charcoal) độ tương phản cao cho văn bản,
- Chữ số đọc công tơ lớn, rõ ràng, hiển thị đơn vị kWh chuẩn mực,
- Câu lệnh và nhãn tiếng Việt súc tích, tác nghiệp trực quan,
- Bộ biểu tượng đường nét viền (outlined icons) 1.75–2px đồng nhất,
- Phân cấp giao diện bằng đường viền tinh tế thay vì đổ bóng nặng,
- Độ tương phản cực cao đảm bảo thao tác dưới ánh sáng mặt trời gay gắt ngoài cầu cảng/bãi hàng,
- Khoảng cách chạm tối thiểu 48x48px cho môi trường sử dụng găng tay/thực địa.

Do not use:

- Giao diện cyberpunk HUD hoặc viền dạ quang neon/glow (Ngoại lệ duy nhất: Chế độ trình diễn Neon Digital Twin được phê duyệt trên Map V2 thuộc Operations Portal với bộ lọc phát sáng kiềm chế stdDeviation="2.2", tuyệt đối không dùng neon/glow trong User Portal thực địa),
- Dải màu tím SaaS chuyển sắc (purple gradients),
- Kính mờ dày đặc (heavy glassmorphism),
- Khối 3D container, tàu biển hoặc khiên bảo vệ trang trí vô nghĩa,
- Họa tiết AI viễn tưởng (mạch điện tử, tia quét),
- Chế độ nền tối mặc định (dark mode default cho mobile User Portal),
- Bản đồ thế giới trang trí nền,
- Đám đông thẻ KPI vụn vặt và badge con nhộng rải rác khắp nơi.

## Brand Palette & Token Hierarchy

### 1. Approved Source Palette (User Dresscode Sheet)

Bảng màu gốc được cung cấp trực tiếp từ tài liệu dresscode trang phục Saigon Port. Đây là các giá trị HEX nguyên bản được phê duyệt làm hạt nhân nhận diện màu sắc:

```css
/* Primary */
--sgp-corporate-navy: #003875;         /* Xanh navy chủ đạo */
--sgp-corporate-blue: #415C94;         /* Xanh corporate thứ cấp */

/* Brand accents */
--sgp-corporate-yellow: #FCC959;       /* Vàng thương hiệu */
--sgp-corporate-orange: #F39200;       /* Cam điểm nhấn */
--sgp-corporate-digital-blue: #0068FF; /* Xanh kỹ thuật số tương tác */

/* Base */
--sgp-corporate-white: #FFFFFF;        /* Bề mặt thẻ trắng */
--sgp-corporate-porcelain: #FCFCFC;    /* Nền trang porcelain */

/* Neutral */
--sgp-corporate-black: #181818;        /* Chữ chính, tiêu đề */
--sgp-corporate-charcoal: #252525;     /* Chữ thân bài, nội dung */
--sgp-corporate-gray: #5E5B5B;         /* Chữ phụ, nhãn thứ cấp */
```

> [!NOTE]
> **Ghi chú provenance**: Bảng màu trên được người dùng cung cấp từ bảng dresscode trang phục thực tế của Saigon Port. Bảng nguồn không phải là toàn bộ Corporate Brand Manual chính thức dành riêng cho ứng dụng số, nhưng là căn cứ thẩm mỹ chính xác cao nhất về màu thương hiệu. Không tự ý thay đổi mã HEX của các source colors này.

### 2. Canonical Token Architecture & Derived Tokens

Để tránh lặp lại định nghĩa CSS và bảo đảm nguồn chân lý duy nhất (Single Source of Truth), các token dẫn xuất số (Digital Derived Tokens), phân tầng ngữ nghĩa chức năng (Functional Semantic Tier), và bảng tra cứu tương phản WCAG 2.1 AA/AAA được chuẩn hóa chính thức tại:

👉 [**frontend/DESIGN_DNA.md — Section 4 (Color System) & Section 5 (Accessibility)**](../../../frontend/DESIGN_DNA.md#4-color-system)

Mọi biến CSS dẫn xuất (`--sgp-navy-hover`, `--sgp-border-derived`, `--sgp-success`, `--sgp-warning`, `--sgp-danger`, v.v.) tuân thủ tuyệt đối các giá trị đã khai báo trong `frontend/DESIGN_DNA.md`.

## Color Usage Rules

1. **Primary Navy (`#003875`) & Corporate Blue (`#415C94`)**:
   - Primary Navy dùng cho thanh tiêu đề ứng dụng (Header), thanh điều hướng dưới (Bottom bar), nút kích hoạt trung tâm (Radial FAB), và các nút hành động chính (Primary CTA).
   - Corporate Blue dùng cho phân cấp tiêu đề phụ, thanh phân đoạn (segmented control), trạng thái tab đang chọn.
2. **Accent 1: Yellow (`#FCC959`) & Orange (`#F39200`)**:
   - Dùng có chủ đích làm viền điểm xuyết nhỏ, huy hiệu nổi bật hoặc chỉ báo chú ý.
   - **QUY TẮC BẮT BUỘC VỀ ACCESSIBILITY**: TUYỆT ĐỐI KHÔNG dùng chữ trắng trên nền Yellow (`#FCC959`) hoặc Orange (`#F39200`) vì tỷ lệ tương phản không đạt chuẩn WCAG. Khi dùng nền vàng/cam, chữ phải là màu Black (`#181818`) hoặc Navy (`#003875`).
3. **Accent 2: Digital Blue (`#0068FF`)**:
   - Đóng vai trò điểm nhấn tương tác phụ: liên kết chi tiết, icon phụ trợ, viền focus bàn phím, badge thông tin bổ trợ. Không được dùng để cạnh tranh với Primary CTA của màn hình.
4. **Base: White (`#FFFFFF`) & Porcelain (`#FCFCFC`)**:
   - Porcelain (`#FCFCFC`) làm nền bao phủ trang (canvas).
   - White (`#FFFFFF`) làm bề mặt thẻ (cards), danh sách, hộp thoại (modals).
5. **Neutral: Black (`#181818`), Charcoal (`#252525`), Gray (`#5E5B5B`)**:
   - Black (`#181818`) cho tiêu đề cấp 1 và số đọc công tơ.
   - Charcoal (`#252525`) cho nội dung văn bản thông thường.
   - Gray (`#5E5B5B`) cho siêu dữ liệu, chú thích phụ và placeholder.

## User Home Hub Redesign Rules

### A. Bottom Radial Navigation

- **Vị trí**: Nằm cố định ở đáy viewport (`bottom: 0, left: 0, right: 0`), thanh đáy gọn gàng bảo đảm không che khuất nội dung cuộn bên dưới.
- **Màu sắc**: Thanh đáy và nút trung tâm (Central FAB) phủ Primary Navy (`#003875`). Có thể bổ sung viền chỉ Warm Yellow (`#FCC959`) tinh tế làm điểm nhấn nhận diện, không phủ vàng toàn bộ thanh.
- **Cơ chế Radial Arc**: Khi người dùng chạm nút trung tâm, 3 chức năng chính mở bung lên trên theo hình cánh cung:
  1. **Đo đếm điện năng**: Icon Zap, mở sổ ghi / camera đọc chỉ số.
  2. **Chấm công ca làm**: Icon Clock, mở camera vào/tan ca.
  3. **Lịch & Phép**: Icon CalendarDays, mở thời khóa biểu & xin nghỉ.
- **Bảo toàn luồng OCR**: Menu chỉ tồn tại tại Home Hub. Khi người dùng bấm vào tác vụ Đo đếm và bước vào camera/preview/result, menu radial hoàn toàn không hiện diện, đảm bảo 100% không che khuất camera hay các nút xác nhận.

### B. Progress Ring (Vòng tiến độ toàn cảng)

- **Vị trí**: Vòng tròn SVG bao bọc ngay sát nút radial trung tâm tại thanh điều hướng đáy.
- **Ý nghĩa nghiệp vụ**: Phản ánh tiến độ ghi chỉ số của **toàn bộ cảng** trong lượt hiện tại (`confirmed` / `total`), không phải tiến độ cá nhân.
- **Màu sắc & Tương phản**: Cung tiến độ dùng màu Corporate Digital Blue (`#0068FF`) hoặc Corporate Yellow (`#FCC959`) nổi bật trên nền Navy của nút.
- **Trạng thái chưa mở ca / chưa có lượt**: Vòng tròn hiển thị ở trạng thái **trung tính** (Neutral track xám nhạt `--sgp-border-derived-strong`), thông báo văn bản hiển thị "Chưa mở lượt đọc". TUYỆT ĐỐI không hiển thị "0%" gây nhầm lẫn là nhân viên chậm trễ hay hệ thống lỗi.
- Không dùng màu vàng/cam để ngụ ý phê bình tiến độ nhân viên nếu chưa có luật nghiệp vụ quy định.

### C. Actionable Insight Feed

- **Bề mặt**: Thẻ insight dùng bề mặt White (`#FFFFFF`) trên nền Porcelain (`#FCFCFC`), viền mỏng `--sgp-border-derived`.
- **Phân cấp chữ**: Tiêu đề và số lượng dùng Black (`#181818`), mô tả dùng Charcoal (`#252525`), thời gian dùng Gray (`#5E5B5B`).
- **Nút hành động (CTA)**: Nút hành động chính luôn ưu tiên Primary Navy (`#003875`) chữ trắng.
- **Tính chân thực của dữ liệu**: 100% nội dung insight lấy trực tiếp từ các API vận hành thực tế (`getTodayOperations`, `getTodayAttendance`, `getUserMonthlySchedule`). Không tạo ra bất kỳ nội dung tĩnh giả lập nào.

## Typography

Preferred family:

```css
font-family: "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
```

Use tabular lining numbers for readings:

```css
font-variant-numeric: tabular-nums lining-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
```

Do not use sci-fi monospace for meter values.

Recommended mobile sizes:

- title: 22–26 px / 700,
- section header: 17–19 px / 650,
- body: 15–16 px,
- button: 15–16 px / 600,
- reading: 44–56 px / 700,
- metadata: 12–13 px.

## Spacing / shape

Use a 4 px rhythm:

`4, 8, 12, 16, 20, 24, 32, 40`

Mobile horizontal padding: 16–20 px normally.

Radii:

- controls: 8 px,
- standard surfaces: 12 px,
- media/result surfaces: 16 px,
- sheets & radial fab: 20–28 px / circle 50%.

Prefer subtle borders to heavy shadows.

## Field usability

- minimum touch target: 48 x 48 px,
- main action height: 52–56 px,
- one strong primary action per state,
- support one-handed mobile use,
- never communicate status with color alone,
- ensure high contrast in bright outdoor environments,
- do not require precise gestures.

## Components

### Primary button

- full-width on narrow screens,
- Primary Navy background (`#003875`),
- white text (`#FFFFFF`),
- 52–56 px height,
- 12 px radius,
- visible focus state.

### Secondary button

- same touch height,
- white/porcelain surface,
- visible neutral border (`--sgp-border-derived`),
- Charcoal (`#252525`) or Primary Navy label.

### Reading display

- 44–56 px,
- strongest contrast (`#181818`),
- tabular numbers,
- unit clearly attached but secondary.

### Status notice

Use subtle semantic surface only when explanation is needed. Do not create oversized decorative alert cards.

### Image preview

- radius 16 px,
- preserve relevant image detail,
- clear replace/retake action nearby.

## Iconography

Use one outline icon family with consistent 1.75–2 px stroke and rounded joins.

Prefer familiar camera, gallery, retry, check, warning icons.

Do not use ships, containers, cranes or shields as repeated decoration.

## Motion

Allowed:

- opacity,
- small 4–8 px translation,
- button press feedback,
- radial menu expansion transition (180–240 ms ease-out).

Timing:

- interaction: 120–180 ms,
- transition: 180–240 ms,
- result reveal: <= 280 ms.

Avoid continuous animation, parallax, scanning, 3D motion and ornamental choreography.

## Copy style

Vietnamese copy must be short, operational and non-technical.

Preferred:

- `Chụp công tơ`
- `Chọn từ thư viện`
- `Đọc chỉ số`
- `Chụp lại`
- `Xác nhận`
- `Đang đọc chỉ số...`

Avoid exposing YOLO, PaddleOCR, confidence thresholds, AI model names or inference terminology in the normal operator UI.

## Implementation instructions for agents

Before writing UI code:

1. Read `frontend/DESIGN_DNA.md`.
2. Inspect existing frontend files; preserve working product behavior.
3. State the visual direction as `Maritime Operational Minimalism` in the implementation plan.
4. Use design tokens rather than scattered raw colors.
5. Test narrow mobile viewport first, then tablet/desktop responsiveness.
6. Review every screen against the anti-style rules before completion.

## Review checklist

Reject a UI implementation if any of these are true:

- unclear primary action,
- touch targets < 48 px,
- meter image is visually secondary on capture/preview,
- result number is visually secondary on success,
- multiple competing primary buttons,
- fake AI progress,
- purple/cyber/neon visual language,
- unnecessary generic SaaS dashboard template introduced,
- technical AI vocabulary shown to operators,
- excessive glass/gradient/3D decoration,
- REVIEW state lacks a direct retake action,
- text contrast is weak for outdoor use,
- white text rendered on yellow or orange backgrounds without required dark contrast.
