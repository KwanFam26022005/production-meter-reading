# 05. SCREEN-BY-SCREEN UI/UX INVENTORY

> **Audit Scope**: Detailed Component Breakdown & Control Surface Inventory  
> **Source Files**: `frontend/src/components/ReadingBatchView.tsx`, `MeterCamera.tsx`, `ImageViewerModal.tsx`, `App.tsx`  
> **Verification Level**: `VERIFIED_STATIC` & `VERIFIED_RUNTIME`

---

## D1. Reading Worklist Screen (`ReadingBatchView.tsx`)

### Layout & Zones
1. **Header**: Standard `<AuthenticatedShell>` with title `"Đo đếm điện năng"`, back button `"Trang chủ"`, and refresh button with spin animation (`.btn-header-refresh`).
2. **Current Round Summary Card (`.worklist-summary-card`)**:
   - Eyebrow: `"LƯỢT HIỆN TẠI"`
   - Current round time: `scheduled_time_only` (e.g. `14:00`). Status badge: `"Đang mở"` (green tint) or `"Chưa có lượt"` (gray tint).
   - Date: Vietnamese formatted `DD/MM/YYYY`.
   - Progress bar: Clean single bar with text: `X/Y đã hoàn thành` and percentage (e.g. `33%`).
   - Footer row: Remaining actionable count (`Z cần xử lý`) and a prominent text link to `"Lịch theo giờ"` with `ChevronRight`.
3. **Search Input (`.worklist-search-wrap`)**:
   - Search icon, placeholder: `"Tìm công tơ, trạm hoặc vị trí"`.
   - Clear button `X` when text is present.
   - **Scroll Behavior**: Normal document flow (scrolls away with page to maximize card real estate).
4. **Segmented Filter Bar (`.worklist-filter-sticky-bar`)**:
   - Three tabs: `"Tất cả" (count)`, `"Cần xử lý" (pending + review count)`, `"Đã ghi" (confirmed count)`.
   - **Sticky Behavior**: Fixed directly beneath the top header (`top: 56px`, `z-index: 100`) as user scrolls through the long worklist.
5. **Meter Worklist Cards (`.worklist-meter-card`)**:
   - Card body is an accessible clickable button (`role="button"`, `tabIndex={0}`) that opens the **Meter Detail Modal**.
   - **Identity Row**: `meter_code` (e.g. `SIM-EM-001`), bullet separator, meter type (`LCD` or `Cơ`), and a right chevron.
   - **Name & Location**: Prominent bold name (15px), location pill with `MapPin` icon.
   - **Status Line**: Color-coded operational status:
     - Confirmed: Green badge (`CheckCircle2`, `"Đã ghi • 14:00"`) + big bold reading value (`04582.10 kWh`).
     - Pending: Blue/gray badge (`Clock`, `"Chưa ghi • 14:00"`) + latest previous confirmed reading (`"Gần nhất: 04580.00 kWh • Lượt 13:00"`).
     - Review: Amber badge (`AlertTriangle`, `"Cần kiểm tra • 14:00"`).
   - **Missed Alert Pill**: Displayed only if `missed_count > 0`: `"X lượt trước chưa ghi"`.
   - **Primary Action CTA (`.btn-worklist-capture`)**:
     - Separated outside the card body to prevent accidental detail modal clicks.
     - Visible only if an active round exists and meter is `PENDING` or `REVIEW`.
     - Label: `"Ghi chỉ số"` for pending; `"Ghi lại"` for review.

---

## D2. Simplified Meter Detail Modal (`ReadingBatchView.tsx`)

- **Trigger**: Tapping the clickable body of any meter card.
- **Header**: Meter code badge, meter type badge (`Điện tử (LCD)` / `Cơ (Mechanical)`), full meter name, physical location with `MapPin`, and a large `X` close button (`44x44px` touch target).
- **Current Slot Section (`.detail-current-slot-card`)**:
   - Displays current round time.
   - If confirmed: Large green box with confirmed value, timestamp, checkmark.
   - If review: Amber alert box with `"Cần kiểm tra lại"` and CTA button `"Chụp lại"`.
   - If pending: Pending message and CTA button `"Ghi chỉ số ngay"`.
- **Today's Hourly History (`.detail-section`)**:
   - Collapsed by default to 3 recent slots to prevent infinite scrolling.
   - Expand button: `"Xem toàn bộ lịch hôm nay (X lượt)"` with `ChevronDown`.
   - For past unrecorded rounds: provides supplementary capture button `"Ghi bổ sung"`.
- **Previous Batches Audit History**:
   - Fetches historical audit log via `GET /api/v1/meters/{id}/readings`.
   - Displays historical confirmed values, batch names, server timestamps, and full name of the recording employee.

---

## D3. Meter Camera Screen (`MeterCamera.tsx`)

- **Camera Feed**:
  - Targets rear camera (`facingMode: { ideal: 'environment' }`, ideal resolution `1920x1080`).
  - Graceful fallback sequence: Environment with fallback to general video stream if constraints fail.
  - Video element styles: `object-fit: cover`, hardware accelerated, non-mirrored rear view.
- **Visual Reticle Overlay (`.meter-alignment-overlay`)**:
  - Centered rectangular guide with 4 sharp corner marks (`.reticle-corner`).
  - High-contrast white borders with dark drop shadow to stay visible under outdoor sunlight.
  - Text label: `"ĐẶT DÃY SỐ TRONG KHUNG"`. Subtitle: `"Giữ máy song song với mặt công tơ"`.
  - **Pipeline Invariant**: Visual aid overlay is purely presentation layer (not burned or cropped onto the photo).
- **Capture Invariant**:
  - `ctx.drawImage(video, 0, 0, width, height)` captures the **full uncropped 1080p sensor resolution**.
  - Rationale: YOLOv8 E2 detector requires the full meter casing and bezel geometry to accurately localize the register row bbox.
- **Controls**:
  - Primary button: `"Chụp công tơ"` (Large Navy CTA, 52px height).
  - Secondary button: `"Chọn từ thư viện"` (Opens OS native photo picker).

---

## D4. Image Preview Screen (`App.tsx` State 2)

- **Layout**:
  - Header: `"Kiểm tra ảnh chụp"`. Instructions: `"Đảm bảo hàng số rõ nét và không bị phản sáng trước khi đọc."`
  - Centered image preview container (`.preview-container`, `max-height: 52vh`, `border-radius: 12px`).
- **Controls**:
  - Primary CTA: `"Đọc chỉ số"` (Triggers OCR processing).
  - Secondary CTA: `"Chụp lại"` (Revokes URL, returns to live camera).
- **Back Interaction**: Tapping the top-left back button triggers `UnsavedWorkConfirmModal`.

---

## D5. OCR Processing Screen (`App.tsx` State 3)

- **Layout**:
  - Processing card (`.processing-card`, `role="status"`, `aria-live="polite"`).
  - Maritime loading spinner (`.maritime-spinner` in Navy and Saigon Port Blue).
  - Text: `"Đang đọc chỉ số..."` Subtext: `"Giữ ứng dụng mở trong giây lát."`
- **Integrity**: Zero simulated progress percentages or fake AI countdowns. Real HTTP latency only (typically 400ms–1200ms).

---

## D6. Result Verification & Inspection (`App.tsx` State 4A)

- **Visual Hero Element**:
  - Confirmed reading value rendered in **52px bold tabular numbers** (`tabular-nums lining-nums`).
  - Unit badge: `kWh` in charcoal.
  - Eyebrow: `"Chỉ số xác nhận"`.
- **Inline Editing Mode**:
  - Tapping `"Sửa chỉ số"` expands an inline edit box (`.edit-reading-box`).
  - Input field: `inputMode="decimal"`, `maxLength={12}`, autofocus.
  - Quick decimal button `.`: Tap to immediately append a decimal dot without switching keyboard layouts.
  - Actions: `"Lưu chỉnh sửa"` (Primary) and `"Hủy"` (Secondary).
- **Inspection Section & Segmented Image Toggle**:
  - Provides segmented pills: `[ Vùng chỉ số (ROI) ]` vs `[ Ảnh gốc ]`.
  - ROI view renders the client-cropped high-resolution segment generated from the normalized `roi_bbox`.
  - Preview card has tap hint: `"Chạm để phóng to & kiểm tra"` (`Maximize2` icon).
  - Tapping opens `ImageViewerModal` for full-screen pinch-to-zoom and pan.

---

## D7. Confirmation & Review Actions (`App.tsx` State 4B & State 5)

### State 4B — Confirmation Success View
- Rendered upon receiving HTTP 200 from `/meter-readings/confirm`.
- Green success banner: `"ĐÃ GHI NHẬN CHỈ SỐ VÀO SỔ"`.
- Official value hero: `XXXXX.XX kWh`.
- Provenance note:
  - If corrected: `"Đã hiệu chỉnh bởi người đọc (AI: YYYYY.YY)"`.
  - If manual: `"Nhập thủ công từ ảnh thực tế"`.
  - If uncorrected: `"Xác nhận từ OCR"`.
- Metadata rows: Scheduled round time, confirmation source, server audit timestamp, batch name.
- Single primary CTA: `"Về danh sách công tơ"`.

### State 5 — Review Fallback View
- Rendered when OCR returns `status: "review"`.
- Amber alert banner: `"KHÔNG THỂ NHẬN DIỆN TỰ ĐỘNG"`.
- Image inspection with ROI toggle retained.
- Three clear action paths:
  1. Primary: `"Nhập chỉ số thủ công"` (Opens manual entry box with quick dot button).
  2. Secondary: `"Chụp lại"` (Discards image, restarts camera).
  3. Danger/Warning tint: `"Đánh dấu cần kiểm tra"` (Submits `POST .../review`).
