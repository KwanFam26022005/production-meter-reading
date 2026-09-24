# SAIGON PORT MOBILE UI DESIGN DNA v2

Status: **Official Design System Specification for Saigon Port Meter Reading & Field Operations**.

Provenance: **Màu sắc thương hiệu được cập nhật trực tiếp dựa trên bảng dresscode trang phục thực tế do người dùng cung cấp**. Bảng màu này đóng vai trò là Approved Source Palette làm hạt nhân nhận diện thị giác cho toàn bộ hệ thống số Saigon Port. Tài liệu này chuẩn hóa và dẫn xuất hệ token cho giao diện số (Digital Derived Tokens), phân tách rành mạch với lớp trạng thái chức năng (Functional Semantics) và thiết lập quy tắc thiết kế nhất quán từ ứng dụng thực địa đến không gian quản trị.

---

## 1. Brand context used for this design

Thông điệp và định hướng chiến lược của Cảng Sài Gòn:

- "Kết nối con người, kết nối thế giới, đưa Việt Nam thịnh vượng từ biển."
- "Dẫn đầu Việt Nam — Vươn tầm châu lục."
- Khai thác cảng và dịch vụ logistics là năng lực cốt lõi.
- An toàn lao động, tốc độ xử lý, hiệu quả vận hành và tối ưu hóa quy trình luân chuyển hàng hóa.
- Nâng cao trải nghiệm người dùng và chuyển đổi số thực chất.
- Phát triển theo mô hình cảng xanh (Green Port) và cảng thông minh (Smart Port).

Bốn phẩm chất thiết kế cốt lõi:

1. **Tin cậy (Trustworthy)** — Dữ liệu số đo, tọa độ định vị và trạng thái ca làm hiển thị chân thực, có thể kiểm chứng, không giả lập.
2. **Tác nghiệp thực tế (Operational)** — Thao tác nhanh gọn, trực quan, hỗ trợ tối đa người công nhân vận hành trong điều kiện thực địa gắt gao.
3. **Chất biển Cảng Sài Gòn (Maritime)** — Nhận diện gắn kết mật thiết với truyền thống hàng hải Cảng Sài Gòn qua sắc xanh Navy trang nhã, không lạm dụng họa tiết mô hình 3D sáo rỗng.
4. **Lấy con người làm trung tâm (Human)** — Giao diện phục vụ người vận hành; trí tuệ nhân tạo (AI/OCR) là năng lực vô hình hỗ trợ phía sau.

---

## 2. Named aesthetic direction: Maritime Operational Minimalism

Giao diện vận hành thực địa tinh gọn, sáng sủa, độ tương phản cao, sử dụng sắc xanh Navy chủ đạo kiên định của Cảng Sài Gòn, các nút bấm vật lý lớn dễ chạm, nghệ thuật chữ số dạng bảng rõ ràng và tuyệt đối không rườm rà.

### Visual thesis

Khi ẩn logo, giao diện vẫn được nhận diện lập tức qua:

- Sắc xanh Primary Navy (`#003875`) và Corporate Blue (`#415C94`) lịch lãm, điềm tĩnh.
- Nền vận hành Porcelain (`#FCFCFC`) và bề mặt thẻ White (`#FFFFFF`) sạch sẽ, trong sáng.
- Khung ngắm chụp ảnh công tơ hình chữ nhật với 4 dấu góc chuẩn xác.
- Chữ số đọc công tơ 44–56px siêu nổi bật, dễ đọc ngay cả khi màn hình điện thoại chói nắng.
- Vòng tròn tiến độ toàn cảng (Progress Ring) bao bọc nút điều hướng đáy (Bottom Radial Nav).
- Tỷ lệ tương phản văn bản đạt chuẩn WCAG AA/AAA.

---

## 3. Non-goals / Anti-style

Tuyệt đối tránh:

- Giao diện cyberpunk viễn tưởng, HUD vũ trụ, viền neon rực sáng.
- Dải màu tím chuyển sắc (purple SaaS gradients).
- Kính mờ dày đặc làm giảm độ sắc nét (heavy glassmorphism).
- Khối 3D container, tàu biển, cần cẩu hoặc khiên bảo vệ trang trí vô bổ.
- Chế độ nền tối mặc định (Dark mode default) gây khó nhìn ngoài trời nắng gắt.
- Bản đồ thế giới trang trí nền không liên quan đến tọa độ Cảng Tân Thuận / Cảng Sài Gòn.
- Hiệu ứng quét laser, chùm tia quét AI giả tạo.
- Phần trăm nhận diện giả lập ("AI đang tư duy 78%...").
- Các thẻ KPI vụn vặt và hàng loạt huy hiệu tròn màu mè chen chúc.

---

## 4. Color system

### 4.1 Approved Source Palette (User Dresscode Sheet)

Bảng mã HEX gốc do người dùng cung cấp từ bảng dresscode trang phục doanh nghiệp Cảng Sài Gòn:

```css
/* Primary */
--sgp-corporate-navy: #003875;         /* Xanh Navy chủ đạo - độ uy quyền, vững chãi */
--sgp-corporate-blue: #415C94;         /* Xanh Corporate - hỗ trợ phân cấp giao diện */

/* Brand accents */
--sgp-corporate-yellow: #FCC959;       /* Vàng thương hiệu - điểm xuyết ấm áp */
--sgp-corporate-orange: #F39200;       /* Cam thương hiệu - nhấn mạnh điểm nóng */
--sgp-corporate-digital-blue: #0068FF; /* Xanh kỹ thuật số - tương tác số phụ trợ */

/* Base */
--sgp-corporate-white: #FFFFFF;        /* Trắng tuyệt đối - bề mặt thẻ, modal, popover */
--sgp-corporate-porcelain: #FCFCFC;    /* Trắng sứ Porcelain - nền bao phủ trang (canvas) */

/* Neutral */
--sgp-corporate-black: #181818;        /* Đen than đậm - tiêu đề H1, số đọc hero */
--sgp-corporate-charcoal: #252525;     /* Than mờ - văn bản thân bài (body text) */
--sgp-corporate-gray: #5E5B5B;         /* Xám trung tính - nhãn phụ, placeholder, timestamp */
```

> [!NOTE]
> Bảng màu nguồn này xuất phát từ dresscode trang phục thực tế của Cảng Sài Gòn, thể hiện chuẩn mực nhận diện thương hiệu ngoài đời thực. Giá trị HEX của các source colors là cố định bất biến.

### 4.2 Digital Derived Tokens (Dẫn xuất cho giao diện số)

Để phục vụ các trạng thái tương tác trên phần mềm (đường viền, nền hover, lớp phủ active, nền tint tinh tế), các token dẫn xuất được định nghĩa rành mạch:

```css
:root {
  /* Navy derived */
  --sgp-navy-hover: #002B5B;
  --sgp-navy-active: #002247;
  --sgp-navy-subtle: #EDF3FA;

  /* Corporate blue derived */
  --sgp-blue-hover: #354D7D;
  --sgp-blue-subtle: #EEF2F8;

  /* Accents derived */
  --sgp-yellow-subtle: #FFF9EC;
  --sgp-yellow-border: #F8DA8E;
  --sgp-orange-subtle: #FFF4E5;
  --sgp-orange-border: #F7B566;
  --sgp-digital-blue-subtle: #EBF3FF;
  --sgp-digital-blue-hover: #0056D6;

  /* Neutral borders & dividers */
  --sgp-border-derived: #E4E8EC;
  --sgp-border-derived-strong: #CBD3DA;
  --sgp-gray-muted: #8E8B8B;
  --sgp-gray-light: #F0F2F4;
}
```

### 4.3 Functional Semantic Tier (Độc lập với dresscode)

Các trạng thái nghiệp vụ bắt buộc giữ thành một lớp riêng biệt, **tuyệt đối không** chuyển đổi thành công sang Digital Blue hay chuyển đổi cảnh báo sang Brand Orange:

```css
:root {
  --sgp-success: #167A5A;        /* Thành công: đã ghi nhận, đã xác nhận, đúng tiến độ */
  --sgp-success-bg: #EAF6F1;     /* Nền thông báo thành công */
  --sgp-warning: #A86200;        /* Cảnh báo: cần đối soát, chưa vào ca, công tơ sót */
  --sgp-warning-bg: #FFF4DF;     /* Nền cảnh báo */
  --sgp-danger: #B43A3A;         /* Nguy cơ / Lỗi: sai định dạng, mất kết nối, từ chối */
  --sgp-danger-bg: #FCECEC;      /* Nền lỗi */
}
```

### 4.4 Semantic UI Mappings

```css
:root {
  --sgp-color-header: var(--sgp-corporate-navy);
  --sgp-color-navigation: var(--sgp-corporate-navy);
  --sgp-color-primary-action: var(--sgp-corporate-navy);
  --sgp-color-canvas: var(--sgp-corporate-porcelain);
  --sgp-color-surface: var(--sgp-corporate-white);
  --sgp-color-text: var(--sgp-corporate-black);
  --sgp-color-text-secondary: var(--sgp-corporate-gray);
  --sgp-color-accent: var(--sgp-corporate-yellow);
}
```

---

## 5. Accessibility & Contrast Validation (WCAG 2.1 AA/AAA)

Mọi cặp màu sử dụng trên giao diện đều được kiểm định độ tương phản:

| Cặp màu (Text / Background) | Tỷ lệ tương phản | Đánh giá WCAG | Ứng dụng phê duyệt |
| :--- | :--- | :--- | :--- |
| `#FFFFFF` (White) trên `#003875` (Navy) | **11.69 : 1** | **AAA** (Vượt chuẩn 7:1) | Nút Primary CTA, Header app, Radial FAB |
| `#181818` (Black) trên `#FCFCFC` (Porcelain) | **17.38 : 1** | **AAA** | Tiêu đề chính H1/H2, Số đọc công tơ Hero |
| `#252525` (Charcoal) trên `#FFFFFF` (White) | **15.13 : 1** | **AAA** | Văn bản nội dung thân bài (Body) |
| `#5E5B5B` (Gray) trên `#FFFFFF` (White) | **6.77 : 1** | **AA** (Vượt chuẩn 4.5:1) | Nhãn phụ, siêu dữ liệu, timestamp |
| `#415C94` (Corporate Blue) trên `#FFFFFF` | **6.62 : 1** | **AA** | Tiêu đề khối, nhãn danh mục, tab active |
| `#0068FF` (Digital Blue) trên `#FFFFFF` | **4.74 : 1** | **AA** | Liên kết phụ, badge tương tác số |
| `#181818` (Black) trên `#FCC959` (Yellow) | **11.09 : 1** | **AAA** | Huy hiệu vàng thương hiệu, thẻ chú ý |
| `#181818` (Black) trên `#F39200` (Orange) | **7.12 : 1** | **AAA** | Huy hiệu cam điểm nhấn |
| **`#FFFFFF` (White) trên `#FCC959` (Yellow)** | **1.40 : 1** | **FAIL NẶNG** | **TUYỆT ĐỐI CẤM SỬ DỤNG** |
| **`#FFFFFF` (White) trên `#F39200` (Orange)** | **2.44 : 1** | **FAIL NẶNG** | **TUYỆT ĐỐI CẤM SỬ DỤNG** |

> [!CAUTION]
> **Quy tắc sinh tử về độ tương phản**: Màu vàng `--sgp-corporate-yellow` (`#FCC959`) và màu cam `--sgp-corporate-orange` (`#F39200`) có độ chói cao, do đó **tuyệt đối không bao giờ được đặt chữ trắng lên hai màu này**. Khi dùng nền vàng hoặc cam, chữ bắt buộc phải là Đen (`#181818`) hoặc Navy (`#003875`).

---

## 6. Product Scope & Information Architecture

Hệ thống phục vụ toàn diện cả hai vai trò: Nhân sự vận hành hiện trường (Employee) và Ban điều hành/Quản trị viên cảng (Admin).

```text
[ Xác thực hệ thống (Login) ]
             │
             ├──► Role: EMPLOYEE (Tác nghiệp thực địa)
             │      ├── 1. Trung tâm Tác nghiệp (Home Hub Redesign)
             │      │     ├── Vòng tiến độ lượt đọc toàn cảng (Progress Ring)
             │      │     ├── Dòng dữ liệu tác nghiệp thực tế (Actionable Insight Feed)
             │      │     └── Điều hướng đáy nan hoa (Bottom Radial Navigation)
             │      ├── 2. Đo đếm điện năng (Meter Reading & Logbook)
             │      │     └── Workflow: Chọn đợt -> Chụp -> Xem trước -> Nhận diện -> Xác nhận
             │      ├── 3. Chấm công ca làm (Photo Attendance)
             │      └── 4. Lịch làm việc & Phép (Schedule & Leave)
             │
             └──► Role: ADMIN (Không gian quản trị vận hành)
                    ├── Dashboard & Digital Twin Utility Network (Bản đồ số)
                    ├── Danh mục Thiết bị & Công tơ (Assets & Meters)
                    ├── Sắp ca & Điều độ nhân sự (Staff Roster)
                    ├── Hậu kiểm chỉ số & Bằng chứng (Reading Inspection & Verification)
                    ├── Sổ nhật ký & Đợt ghi (Schedules & Logbook)
                    └── Kiểm toán (Audit) & Báo cáo sản lượng (Reports)
```

---

## 7. User Home Hub Redesign: Component Specifications

### 7.1 Bottom Radial Navigation

- **Vị trí**: Cố định hoàn toàn ở đáy màn hình (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 80`).
- **Thanh nền (Bottom Bar)**: Nền Primary Navy (`#003875`), viền trên chỉ vàng Warm Yellow (`#FCC959`) độ dày 1px trang nhã. Chiều cao thanh đáy 64px, tích hợp vùng đệm an toàn ngón tay cái.
- **Nút trung tâm (Central Radial FAB)**: Hình tròn đường kính 56px, nền Primary Navy (`#003875`), tâm nút có icon thao tác nhanh, được ôm sát bởi Vòng tiến độ SVG (Progress Ring).
- **Cánh cung bung mở (Radial Arc Menu)**: Khi chạm vào nút trung tâm, 3 nút hành động bung xòe theo hình cánh cung lên phía trên trong khoảng 200ms (`cubic-bezier(0.16, 1, 0.3, 1)`):
  1. **Tác vụ Trái (150°)**: Chấm công ca làm (`Attendance`) — Icon Clock.
  2. **Tác vụ Giữa (90°)**: Đo đếm điện năng (`Meter Reading`) — Icon Zap.
  3. **Tác vụ Phải (30°)**: Lịch làm việc & Phép (`Schedule`) — Icon CalendarDays.
- **Nhãn hiển thị**: Nhãn chữ nền trắng ngà porcelain hoặc navy mờ, chữ sắc nét, độ tương phản cao.
- **Bảo vệ màn hình đo đếm**: Bottom Radial Navigation **chỉ xuất hiện trên Home Hub**. Khi người dùng chuyển sang màn hình Đo đếm / Chụp ảnh công tơ / Xem kết quả, thanh điều hướng được tháo gỡ hoàn toàn để không che khuất kính ngắm camera hay nút xác nhận.

### 7.2 Progress Ring (Vòng tiến độ lượt ghi toàn cảng)

- **Vị trí**: Cung tròn SVG bao bọc ngay sát nút radial trung tâm tại thanh điều hướng đáy.
- **Ý nghĩa nghiệp vụ**: Phản ánh tỷ lệ hoàn thành lượt ghi của **toàn bộ cảng** (`confirmed / total`), giúp nhân viên ca trực nắm bắt tổng thể nhịp độ vận hành chung của cảng.
- **Màu cung tiến độ**: Sử dụng Corporate Digital Blue (`#0068FF`) hoặc Warm Yellow (`#FCC959`) trên nền rãnh trung tính `--sgp-border-derived-strong`.
- **Trạng thái chưa mở lượt ghi**: Khi chưa tới giờ hoặc chưa mở lượt (`current_round === null`), Progress Ring hiển thị ở trạng thái **trung tính (Neutral Calm Track)**. Không hiển thị con số "0%" màu đỏ gây hoang mang hoặc hiểu sai là nhân viên bị trễ hạn.
- **Nguyên tắc tôn trọng nhân sự**: Không dùng màu vàng/cam để ám chỉ nhân viên chậm trễ nếu chưa có quy chuẩn nghiệp vụ định danh.

### 7.3 Actionable Insight Feed

- **Bề mặt & Cấu trúc**: Các thẻ insight xếp dọc theo luồng tự nhiên, bề mặt thẻ White (`#FFFFFF`), nền canvas Porcelain (`#FCFCFC`), đường viền mỏng 1px `--sgp-border-derived`, bo góc 14px.
- **Phân bổ màu sắc**:
  - Tiêu đề thẻ & Số lượng chính: Black (`#181818`).
  - Nội dung hướng dẫn & bối cảnh: Charcoal (`#252525`).
  - Nút hành động chính (Primary CTA): Nền Primary Navy (`#003875`), chữ trắng (`#FFFFFF`), chiều cao 44–48px.
  - Điểm nhấn trạng thái: Huy hiệu Warm Yellow (`#FCC959` với chữ `#181818`) hoặc Orange (`#F39200` với chữ `#181818`) khi có việc cần lưu ý.
  - Tương tác phụ trợ: Digital Blue (`#0068FF`) làm liên kết xem chi tiết hoặc icon bổ trợ.
- **Tính xác thực dữ liệu 100%**: Tất cả thẻ insight được tổng hợp trực tiếp từ các hàm API thực tế:
  - `getTodayOperations`: Lượt đọc hiện tại, số công tơ còn lại, các công tơ tồn đọng từ các lượt trước.
  - `getTodayAttendance`: Trạng thái vào ca, mốc giờ chấm công, số giờ đã làm việc.
  - `getUserMonthlySchedule`: Ca trực sắp tới, ngày làm việc tiếp theo.
  - Tuyệt đối không sinh dữ liệu giả định.

---

## 8. Screen Rules & OCR Invariants

### A. Capture Screen

- Vùng hiển thị camera chiếm vị trí thống soái.
- Khung ngắm hình chữ nhật viền trắng hoặc navy mờ, 4 góc viền gọn gàng.
- Nút chính: **Chụp công tơ** (Navy `#003875`).
- Nút phụ: **Chọn từ thư viện**.

### B. Preview Screen

- Ảnh công tơ được giữ nguyên vẹn độ sắc nét, hỗ trợ căn chỉnh kiểm tra sơ bộ.
- Nút chính: **Đọc chỉ số**. Nút phụ: **Chụp lại**.

### C. Processing State

- Đang chạy suy luận OCR, hiển thị vòng xoay tinh giản hoặc thanh nhịp điệu vận hành.
- Nhãn: `Đang đọc chỉ số...`. Không có số phần trăm giả mạo.

### D. Success Result Screen

- Số đọc công tơ là nhân vật chính (Hero number: 44–56px, `tabular-nums lining-nums`, màu `#181818`).
- Khối hình ảnh đối chiếu có tính năng tab chuyển đổi: **Vùng chỉ số (ROI cắt tự động)** và **Ảnh gốc**, hỗ trợ chạm để phóng to (Zoom Modal).
- Nút chính: **Xác nhận chỉ số** (Navy `#003875`). Nút phụ: **Chụp lại** hoặc **Sửa số**.

### E. Review Result Screen

- Thông báo nhã nhặn: `Không thể đọc chắc chắn chỉ số. Vui lòng chụp lại, giữ dãy số rõ nét và hạn chế phản sáng.`
- Hành động chính: **Chụp lại**. Có tùy chọn **Nhập thủ công** để hỗ trợ trong trường hợp mặt kính công tơ bị ố mờ cơ học.

---

## 9. Typography

- Phông chữ tiêu chuẩn:
  ```css
  font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  ```
- Định dạng chữ số công tơ:
  ```css
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  ```
- Thang kích thước di động chuẩn:
  - Tiêu đề màn hình: 22–26 px / font-weight 700.
  - Tiêu đề phân mục: 17–19 px / font-weight 650.
  - Thân bài (body): 15–16 px / font-weight 400–500.
  - Nút bấm chính: 15–16 px / font-weight 600.
  - Số đọc công tơ: 44–56 px / font-weight 700.
  - Siêu dữ liệu / Timestamp: 12–13 px / font-weight 500.

### 9.1 Spacing, shape and field control dimensions

Shared measurements for field controls and surfaces:

- Spacing rhythm: `4, 8, 12, 16, 20, 24, 32, 40` px; mobile horizontal padding normally `16–20` px.
- Corner radii: controls `8` px, standard surfaces `12` px, media/result surfaces `16` px, sheets and radial controls `20–28` px or circular where appropriate.
- Field touch targets: at least `48 × 48` px; primary field actions normally `52–56` px high. The Home Hub insight CTA remains specified separately in §7.3.
- Keep numeric reading displays tabular and their unit visually secondary; sizing is specified in §9.

---

## 10. Motion & Transitions

- Phản hồi nút bấm: 120–150ms.
- Bung mở Radial Menu: 180–240ms ease-out.
- Chuyển tab / Modal mở: 180–220ms.
- Hiệu ứng cung tròn Progress Ring: SVG stroke-dashoffset transition 400ms ease-out.

---

## 11. Acceptance Checklist before Production Handoff

- [ ] Toàn bộ mã HEX gốc của Source Palette khớp tuyệt đối với bảng dresscode.
- [ ] Không có chữ trắng nào xuất hiện trên nền Yellow (`#FCC959`) hoặc Orange (`#F39200`).
- [ ] Bottom Radial Navigation cố định đáy, mở 3 cánh cung mượt mà, không che khuất màn hình camera/kết quả.
- [ ] Progress Ring thể hiện tiến độ ghi toàn cảng; khi chưa có lượt hiển thị trạng thái trung tính, không hiện 0% sai lệch.
- [ ] Actionable Insight Feed sử dụng dữ liệu thật từ API, surface White/Porcelain, CTA Navy uy tín.
- [ ] Tất cả các bài kiểm thử tự động (unit/integration tests) trong frontend đều vượt qua (100% pass).
- [ ] Bản build Vite production thành công không có lỗi cú pháp hoặc TypeScript.
- [ ] Báo cáo kiểm định và hình ảnh nghiệm thu được lưu trữ đầy đủ.
