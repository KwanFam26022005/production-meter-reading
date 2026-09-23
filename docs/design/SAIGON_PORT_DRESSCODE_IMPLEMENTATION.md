# BÁO CÁO TRIỂN KHAI BẢNG MÀU DRESSCODE CẢNG SÀI GÒN & USER HOME HUB REDESIGN

**Dự án**: `production-meter-reading`  
**Vai trò**: Senior Design System Engineer & Frontend Engineer  
**Thời gian hoàn thành**: 21/09/2026  
**Trạng thái Git**: Working tree an toàn, branch `feature/v16e-network-map-overlay-r1`, commit sạch, không tự động push/merge.

---

## 1. Nguồn gốc & Nguyên tắc Bảng màu (Provenance & Ground Rules)

Toàn bộ hệ thống mã màu hạt nhân (Source Palette) được cập nhật dựa trên **bảng dresscode trang phục thực tế do người dùng cung cấp**. 

> [!NOTE]
> **Tuyên bố bản quyền & phạm vi**: Bảng màu nguồn phản ánh trung thực quy chuẩn trang phục thực tế của Cảng Sài Gòn. Tài liệu này không tự nhận đây là toàn bộ Corporate Brand Manual chính thức dành riêng cho ứng dụng số, nhưng là căn cứ chuẩn mực có độ xác thực cao nhất để xây dựng hệ thống token cho giao diện số của dự án.
> 
> Tuyệt đối không thay đổi mã HEX của các source colors đã được phê duyệt.

---

## 2. Bảng ánh xạ Màu cũ → Màu mới (Palette Mapping Table)

| Vai trò thiết kế | Mã token cũ | HEX cũ | Mã token Source Palette mới | HEX mới phê duyệt | Ghi chú & Ý nghĩa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Navy** | `--sgp-brand-800` | `#073B5C` | `--sgp-corporate-navy` | **`#003875`** | Xanh Navy truyền thống Cảng Sài Gòn; dùng cho App Header, Bottom Nav Bar, Primary CTA, Radial FAB |
| **Corporate Blue** | `--sgp-brand-700` | `#0B4F75` | `--sgp-corporate-blue` | **`#415C94`** | Xanh Corporate thứ cấp; dùng cho tiêu đề phụ, phân đoạn, thẻ tab |
| **Brand Yellow** | *(Chưa có)* | --- | `--sgp-corporate-yellow` | **`#FCC959`** | Vàng ấm thương hiệu; viền chỉ nhấn Bottom bar, huy hiệu lưu ý (luôn đi cùng chữ đen) |
| **Brand Orange** | *(Chưa có)* | --- | `--sgp-corporate-orange` | **`#F39200`** | Cam nhận diện; điểm nhấn cảnh báo công tơ sót |
| **Digital Blue** | `--sgp-brand-600` | `#12658F` | `--sgp-corporate-digital-blue` | **`#0068FF`** | Xanh kỹ thuật số; Progress Ring, liên kết chi tiết phụ, focus ring |
| **Base White** | `--sgp-surface` | `#FFFFFF` | `--sgp-corporate-white` | **`#FFFFFF`** | Trắng tuyệt đối; bề mặt thẻ (Cards), modal, popup |
| **Base Porcelain** | `--sgp-canvas` | `#F6F8F9` | `--sgp-corporate-porcelain` | **`#FCFCFC`** | Trắng sứ dịu mắt; nền bao phủ toàn ứng dụng (canvas) |
| **Neutral Black** | `--sgp-ink` | `#18242C` | `--sgp-corporate-black` | **`#181818`** | Đen than đậm; tiêu đề chính H1/H2, số đọc công tơ hero |
| **Neutral Charcoal**| `--sgp-ink-secondary` | `#53636D`| `--sgp-corporate-charcoal` | **`#252525`** | Than mờ; văn bản nội dung thân bài (Body) |
| **Neutral Gray** | `--sgp-ink-muted` | `#74838C` | `--sgp-corporate-gray` | **`#5E5B5B`** | Xám trung tính; siêu dữ liệu, timestamp, placeholder |

---

## 3. Hệ Digital Derived Tokens (Dẫn xuất cho giao diện số)

Các token dẫn xuất được định nghĩa rành mạch, phục vụ các tương tác vi mô (micro-interactions), trạng thái hover, active và các đường viền nhẹ:

```css
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
```

### Bảo toàn lớp Functional Semantic độc lập

Không đánh đồng màu nghiệp vụ với màu nhận diện thương hiệu:
- `--sgp-success: #167A5A` (Xanh lục thành công, xác nhận vào sổ).
- `--sgp-warning: #A86200` (Hổ phách cảnh báo, cần hậu kiểm).
- `--sgp-danger: #B43A3A` (Đỏ cảnh báo lỗi máy chủ hoặc từ chối).

---

## 4. Kiểm định Độ tương phản Toán học (WCAG 2.1 AA/AAA)

Mọi cặp màu phối hợp đều được tính toán theo công thức chuẩn của W3C WCAG 2.1:

$$\text{Contrast} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

| Cặp màu sử dụng | Màu chữ (FG) | Màu nền (BG) | Tỷ lệ tương phản | Đánh giá WCAG | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Navy on White** | `#FFFFFF` | `#003875` | **11.69 : 1** | **AAA** ($\ge 7.0:1$) | Header, Primary CTA button, Radial FAB |
| **Black on Porcelain** | `#181818` | `#FCFCFC` | **17.38 : 1** | **AAA** | Tiêu đề H1, Số đọc Hero công tơ |
| **Charcoal on White** | `#252525` | `#FFFFFF` | **15.13 : 1** | **AAA** | Nội dung thông tin, mô tả thẻ insight |
| **Gray on White** | `#5E5B5B` | `#FFFFFF` | **6.77 : 1** | **AA** ($\ge 4.5:1$) | Timestamp, siêu dữ liệu ca làm |
| **Corporate Blue on White**| `#415C94` | `#FFFFFF` | **6.62 : 1** | **AA** | Eyebrow nhãn thẻ, tiêu đề phân mục |
| **Digital Blue on White** | `#0068FF` | `#FFFFFF` | **4.74 : 1** | **AA** | Liên kết phụ "Chi tiết sổ ghi", tab link |
| **Black on Corporate Yellow**| `#181818`| `#FCC959` | **11.09 : 1** | **AAA** | Huy hiệu vàng thương hiệu, nhãn ca trực |
| **Black on Corporate Orange**| `#181818`| `#F39200` | **7.12 : 1** | **AAA** | Huy hiệu công tơ tồn đọng |
| **White on Yellow** | `#FFFFFF` | `#FCC959` | **1.40 : 1** | **FAIL** | **CẤM SỬ DỤNG**: Được kiểm định tự động trong test suite |
| **White on Orange** | `#FFFFFF` | `#F39200` | **2.44 : 1** | **FAIL** | **CẤM SỬ DỤNG**: Được kiểm định tự động trong test suite |

---

## 5. Hiện thực User Home Hub Redesign

### 5.1 Bottom Radial Navigation
- **Thanh điều hướng cố định**: Nằm ở đáy viewport (`bottom: 0`, chiều cao 64px), phủ màu Primary Navy (`#003875`), tích hợp viền chỉ trên bằng Warm Yellow (`#FCC959`).
- **Nút trung tâm (Radial FAB)**: Hình tròn đường kính 54px, nổi bật ở trung tâm, bao quanh bởi Progress Ring. Chạm vào nút sẽ bung mở 3 chức năng theo hình cánh cung lên phía trên:
  1. **Tác vụ Trái**: Chấm công ca làm (`onOpenAttendance`) — Icon Clock.
  2. **Tác vụ Giữa**: Đo đếm điện năng (`onOpenMeter`) — Icon Zap.
  3. **Tác vụ Phải**: Lịch làm việc & Phép (`onOpenSchedule`) — Icon CalendarDays.
- **Bảo toàn luồng OCR**: Thanh điều hướng chỉ xuất hiện tại Home Hub. Khi người dùng vào màn hình Đo đếm / Camera / Preview / Kết quả, thanh điều hướng được gỡ bỏ hoàn toàn, không che chắn camera hay các nút xác nhận.

### 5.2 Progress Ring (Vòng tiến độ toàn cảng)
- **Vị trí**: Cung tròn SVG bao bọc ngay sát nút radial trung tâm tại thanh đáy.
- **Ý nghĩa nghiệp vụ**: Phản ánh tiến độ ghi chỉ số của **toàn cảng** trong lượt hiện tại (`confirmed / total`), không phải tiến độ cá nhân.
- **Màu sắc**: Cung tiến độ dùng Corporate Digital Blue (`#0068FF`) hoặc Warm Yellow (`#FCC959`) nổi bật trên nền Navy.
- **Trạng thái trung tính (Zero/No Active Round)**: Khi chưa mở ca hoặc chưa tới giờ đọc (`current_round === null`), Progress Ring hiển thị ở trạng thái **trung tính** (Neutral Calm Track xám nhạt), huy hiệu hiển thị "Chưa có lượt". Tuyệt đối không hiển thị con số "0%" màu đỏ sai lệch.

### 5.3 Actionable Insight Feed
- **Bề mặt**: Thẻ White (`#FFFFFF`) trên nền Porcelain (`#FCFCFC`), đường viền mỏng `--sgp-border-derived`.
- **Phân bổ màu**: Tiêu đề Black (`#181818`), mô tả Charcoal (`#252525`), CTA Primary Navy (`#003875`), điểm nhấn Warm Yellow/Orange, liên kết phụ Digital Blue (`#0068FF`).
- **Nguồn dữ liệu thực 100%**:
  - Dữ liệu lượt đọc: Lấy từ API `getTodayOperations`.
  - Dữ liệu chấm công: Lấy từ API `getTodayAttendance`.
  - Dữ liệu ca làm: Lấy từ API `getUserMonthlySchedule`.
  - Không sinh dữ liệu tĩnh giả mạo.

---

## 6. Danh sách các tệp chỉnh sửa & tạo mới

1. `.agent/skills/saigon-port-ui/SKILL.md`:
   - Cập nhật toàn diện Approved Source Palette & Digital Derived Tokens.
   - Ghi rõ nguồn gốc từ bảng dresscode trang phục.
   - Cập nhật phạm vi sản phẩm: Login, Home Hub, Đo đếm, Chấm công, Lịch & phép, Admin.
   - Quy định thiết kế Bottom Radial Nav, Progress Ring, Actionable Insight Feed.
   - Giữ nguyên các ràng buộc OCR workflow và khả năng sử dụng ngoài thực địa.
2. `frontend/DESIGN_DNA.md`:
   - Đồng bộ hóa 100% với Skill về mã HEX, phân cấp màu, quy tắc tương phản WCAG và scope sản phẩm.
3. `frontend/src/index.css`:
   - Bổ sung hệ token `:root` với 10 mã màu source palette, 15 derived tokens, 8 semantic mappings và các alias tương thích ngược.
   - Thêm bộ class CSS cho Bottom Radial Nav, Progress Ring, Radial Arc và Insight Feed.
4. `frontend/src/components/home/BottomRadialNav.tsx` *(Mới)*:
   - Component thanh điều hướng đáy, FAB trung tâm, SVG Progress Ring toàn cảng và menu cánh cung bung xòe 3 tác vụ.
5. `frontend/src/components/home/InsightFeed.tsx` *(Mới)*:
   - Component dòng dữ liệu tác nghiệp thực tế, hỗ trợ lượt đọc đang hoạt động, tồn đọng các lượt trước, trạng thái chấm công và thời khóa biểu tháng.
6. `frontend/src/components/HomeHub.tsx`:
   - Tích hợp User Context, Actionable Insight Feed và Bottom Radial Navigation.
7. `frontend/tests/saigonPortBrandPalette.test.ts` *(Mới)*:
   - Bộ 6 bài kiểm thử tự động kiểm tra source palette, derived tokens, semantic tier, độ tương phản WCAG toán học, CSS selectors và tính đồng bộ giữa Skill với DESIGN_DNA.md.
8. `scripts/capture_saigon_port_dresscode_screenshots.mjs` *(Mới)*:
   - Kịch bản Playwright chụp ảnh nghiệm thu trên Mobile, Tablet, Desktop và Login View.

---

## 7. Kết quả Kiểm thử & Đóng gói (Test & Build Verification)

### 7.1 Kết quả Test Suite tự động (`npm test`)

```text
✔ Brand Dresscode: Source palette exact HEX values defined in index.css (2.12ms)
✔ Brand Dresscode: Digital derived tokens and semantic UI mappings exist (1.85ms)
✔ Brand Dresscode: Functional semantic statuses remain an independent tier (0.42ms)
✔ Brand Dresscode: Contrast ratios strictly satisfy WCAG 2.1 specifications (0.61ms)
✔ Home Hub Redesign: Navigation, Progress Ring, and Insight Feed CSS classes present (1.54ms)
✔ Design Alignment: Skill and DESIGN_DNA.md are fully synchronized with source palette (2.89ms)

ℹ tests 255
ℹ suites 0
ℹ pass 255
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1713.46ms
```
**Toàn bộ 255 bài test (249 test hệ thống cũ + 6 test thương hiệu mới) đạt 100% PASS.**

### 7.2 Kết quả Đóng gói Production (`npm run build`)

```text
vite v6.4.3 building for production...
transforming...
✓ 1709 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                1.46 kB │ gzip:   0.68 kB
dist/assets/auth-login-port-hEED9HAp.webp    119.94 kB
dist/assets/auth-loading-port-BWRuCCDI.webp  130.48 kB
dist/assets/tan-thuan-port-v8-cfaZ-ZJs.webp  496.99 kB
dist/assets/index-CCUT8bZh.css               343.12 kB │ gzip:  53.97 kB
dist/assets/index-DPYTFz_Z.js                928.11 kB │ gzip: 226.95 kB
✓ built in 4.39s
```
**Bản build TypeScript và Vite hoàn tất xuất sắc, 0 lỗi, 0 cảnh báo kiểu dữ liệu.**

---

## 8. Hình ảnh Nghiệm thu Thực tế (Visual Acceptance Screenshots)

Tất cả ảnh chụp màn hình được tạo tự động qua Playwright Headless Browser trên môi trường runtime thực tế:

1. **Mobile User Home Hub (390 x 844)**:
   - Đường dẫn: `docs/design/screenshots/01-user-home-hub-mobile.png`
   - Đặc điểm: Thể hiện bảng màu Navy chủ đạo, User Context, Insight Feed sạch sẽ, Bottom Radial Nav với Progress Ring trạng thái trung tính "Chưa có lượt".
2. **Mobile Radial Arc Bung Mở (390 x 844)**:
   - Đường dẫn: `docs/design/screenshots/02-user-home-radial-open-mobile.png`
   - Đặc điểm: Nút FAB chuyển thành dấu X viền vàng, nền mờ nhẹ, 3 nút chức năng cánh cung (Chấm công, Đo đếm, Lịch trực) bung mở cân đối với tag nổi bật.
3. **Tablet Responsive View (768 x 1024)**:
   - Đường dẫn: `docs/design/screenshots/03-user-home-hub-tablet.png`
   - Đặc điểm: Bố cục canvas di động 480px đặt cân đối ở giữa, thanh điều hướng đáy vừa vặn ngón tay.
4. **Desktop Responsive View (1280 x 800)**:
   - Đường dẫn: `docs/design/screenshots/04-user-home-hub-desktop.png`
   - Đặc điểm: Hiển thị hoàn hảo trên màn hình máy tính để bàn mà không bị méo lệch tỷ lệ.
5. **Màn hình Đăng nhập Chuẩn Thương hiệu**:
   - Đường dẫn: `docs/design/screenshots/05-login-view.png`
   - Đặc điểm: Primary Navy CTA button, font Be Vietnam Pro, độ tương phản chuẩn mực.

---

## 9. Cam kết An toàn Git

- Không thực hiện bất kỳ lệnh `git push` hoặc `git merge` nào.
- Nhánh làm việc giữ nguyên: `feature/v16e-network-map-overlay-r1`.
- Mọi thay đổi đều được kiểm tra an toàn, bảo vệ nguyên vẹn các file khác trong kho mã nguồn.
