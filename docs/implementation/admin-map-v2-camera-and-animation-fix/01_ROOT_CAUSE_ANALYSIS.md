# 01 — Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Phân hệ**: Bản đồ Kỹ thuật V2 (Map V2) — Sửa lỗi Camera Framing & Animation  
> **Ngày thực hiện**: 22/09/2026  
> **Chuyên gia thực hiện**: Senior React/TypeScript, SVG Rendering & QA Engineer  
> **Minh chứng gốc (Baseline Evidence)**: [evidence/baseline/](evidence/baseline/)

---

## 1. Hiện tượng & Tóm tắt Nguyên nhân

| Hiện tượng lỗi người dùng báo cáo | Phần tử DOM/SVG & CSS chịu trách nhiệm | Cơ chế gây lỗi thực tế (Verified Root Cause) | Mức độ |
| :--- | :--- | :--- | :---: |
| **Sự cố A: Góc nhìn camera mặc định chưa tối ưu** (Operational area sát đáy/ngoài tầm nhìn, tốn nhiều diện tích cho mặt nước phía trên cảng). | `MapV2Canvas.tsx` → `calculateFit()` (`pan.y = 0` trong chế độ tràn chiều rộng; `viewMode = 'contain'` mặc định làm bản đồ bị thu nhỏ). | Khi bản đồ mở trên laptop, chế độ `width` đặt `targetPanY = 0`, gán tọa độ Y=0 (mặt nước sông Sài Gòn, ~200px) lên đỉnh canvas. Khu vực tác nghiệp (Quay, Bãi, Kho, Cổng A/B, VP Hành chính) bị đẩy xuống sát mép dưới hoặc tràn ra ngoài. Chưa có công thức tính `INITIAL_OPERATIONAL_FRAME` dựa trên trọng tâm hình học tác nghiệp. | **Nghiêm trọng (UX Framing)** |
| **Sự cố B: Khung chữ nhật tối màu phình to theo thời gian** (Khi click chọn phân khu, đặc biệt là Văn phòng Hành chính). | `MapV2Canvas.tsx` → `<g id="v2-anchor-ZONE_ADMIN" tabIndex={0} className="map-v2-anchor-group">` + `MapV2Workspace.css` → default browser `:focus` outline + con `.map-v2-anchor-radar`. | Khi người dùng click vào anchor hotspot, phần tử `<g>` có thuộc tính `tabIndex={0}` nhận trạng thái `:focus`. Do CSS không có `outline: none;` trên `:focus`, trình duyệt (Edge/Chromium) vẽ đường viền focus mặc định (`outline: rgb(16, 16, 16) auto 5px`). Bounding box của `<g>` bao gồm cả phần tử con `.map-v2-anchor-radar` đang chạy animation `@keyframes mapV2RadarPulse` (`scale(0.85)` → `scale(1.4)` vô hạn). Trình duyệt liên tục cập nhật khung viền chữ nhật theo kích thước phình to của animation con, tạo ra khung chữ nhật đen khổng lồ phình to dần qua các khu vực khác. | **Nghiêm trọng (Visual Artifact)** |
| **Sự cố C: Các vòng tròn mờ trôi nổi không liên quan** (Xuất hiện ở vùng nước, bãi hàng và khu vực xung quanh). | `MapV2Canvas.tsx` → `<circle className="map-v2-anchor-radar" />` trên toàn bộ 7 anchor + `MapV2Workspace.css` → `mapV2RadarPulse`. | Toàn bộ 7 anchor phân khu đều render một `<circle className="map-v2-anchor-radar">` phát xung vô hạn (`animation: mapV2RadarPulse 2.4s infinite`). Trong SVG, quy tắc CSS `transform-origin: center;` khi không có `transform-box: fill-box` sẽ lấy gốc tọa độ trung tâm của toàn bộ SVG thay vì tâm của hình tròn. Phép biến đổi `transform: scale()` bị lệch tâm hàng trăm pixel, làm các vòng tròn bị văng ra xa khỏi anchor, trôi nổi lơ lửng trên mặt nước sông (`ZONE_QUAY`), giữa bãi hàng (`ZONE_CONTAINER`, `ZONE_GENERAL`) và các khu nhà kho. | **Trung bình (Clutter & Drift)** |

---

## 2. Chi tiết Sự cố A — Lỗi Camera Framing ban đầu

### 2.1. Phân tích Tọa độ Hình học Tác nghiệp Cảng
Theo tập tin hình học chuẩn [tan_thuan_1_zones_edited.json](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json) với kích thước bản đồ $1536 \times 1024$ px:
- **Vùng mặt nước sông Sài Gòn**: Từ $Y = 0$ đến $Y \approx 200$ (khoảng 200 px chiều cao hoàn toàn là mặt sông và tàu thuyền, không chứa thiết bị hạ tầng đo đếm).
- **Vùng tác nghiệp cảng (Operational Focus Area)**:
  - `ZONE_QUAY` (Khu cảng sà lan): Đỉnh cao nhất tại $Y = 211$, neo tại $[792, 303]$.
  - `ZONE_GENERAL` (Bãi tổng hợp): $Y \in [318, 516]$, neo tại $[650, 470]$.
  - `ZONE_CONTAINER` (Bãi container): $Y \in [211, 522]$, neo tại $[1232, 393]$.
  - `BLDG_KHO_1`, `BLDG_KHO_2`: $Y \in [434, 518]$, neo tại $[244, 476]$ và $[382, 479]$.
  - `BLDG_KHO_4`: $Y \in [554, 647]$, neo tại $[1004, 600]$.
  - `ZONE_ADMIN` (VP Hành chính): $Y \in [660, 721]$, neo tại $[936, 688]$.
  - `GATE_A`: Tọa độ $[1450, 569]$.
  - `GATE_B`: Tọa độ $[874, 725]$, nhãn phụ kiện kéo dài tới $Y \approx 758$.
  - Tuyến đường vành đai `ROAD_BACKLAND`: Điểm uốn quan sát $[900, 770]$.

**Phạm vi tác nghiệp trọng yếu theo trục Y**:
$$Y_{top} = 200, \quad Y_{bottom} = 770 \implies \Delta Y = 570 \text{ px}$$
Tâm trọng tâm tác nghiệp: $Y_{focus} \approx 485$ px.

### 2.2. Lỗi trong cài đặt cũ
Trong `MapV2Canvas.tsx`:
```typescript
if (mode === 'width') {
  const targetZoom = width / CANVAS_WIDTH;
  const scaledHeight = CANVAS_HEIGHT * targetZoom;
  const targetPanX = 0;
  const targetPanY = scaledHeight < height ? (height - scaledHeight) / 2 : 0;
  return { zoom: targetZoom, pan: { x: targetPanX, y: targetPanY } };
}
```
Trên màn hình laptop doanh nghiệp thông dụng $1366 \times 768$ (vùng vẽ canvas khả dụng $1286 \times 712$ px):
- `targetZoom` $= 1286 / 1536 \approx 0.8372$.
- `scaledHeight` $= 1024 \times 0.8372 = 857.3 \text{ px} > 712 \text{ px}$.
- Kết quả: `targetPanY = 0`.
- Tọa độ hiển thị đỉnh màn hình: $Y = 0$.
- Tọa độ hiển thị đáy màn hình: $712 / 0.8372 = 850.4$ px.
- Hậu quả:
  1. $200 \times 0.8372 \approx 167$ px trên cùng bị lãng phí cho mặt nước trống.
  2. Cổng B ($Y = 725$) và nhãn phụ kiện ($Y = 758$) bị ép sát đáy màn hình ở tọa độ pixel $758 \times 0.8372 = 634.6$ px (ngay sát cụm HUD zoom tại bottom-right).
  3. Trên các viewport có chiều cao nhỏ hơn ($720$p hoặc trình duyệt có toolbar/bookmark bar), Cổng B và khu VP Hành chính bị cắt khuất hoàn toàn ra ngoài khung nhìn.

---

## 3. Chi tiết Sự cố B — Khung chữ nhật tối màu phình to (Growing Rectangle)

### 3.1. Dữ liệu thực nghiệm Bounding Box theo thời gian
Thông qua kịch bản kiểm thử tự động [reproduce_map_v2_issues.mjs](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/reproduce_map_v2_issues.mjs) và [test_focus.mjs](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/test_focus.mjs), nhóm kỹ thuật đã trích xuất số liệu thực nghiệm đo trực tiếp trên DOM của Chromium:

| Mốc thời gian | Kích thước phần tử thẻ thông tin (`.map-v2-operational-card`) | Kích thước đa giác VP HC (`#v2-poly-ZONE_ADMIN`) | Kích thước Bounding Box của Nhóm Anchor (`#v2-anchor-ZONE_ADMIN`) | Thuộc tính Outline được trình duyệt áp dụng | Trạng thái hiển thị trên màn hình |
| :-: | :-: | :-: | :-: | :-: | :--- |
| **0 ms** | $340 \times 129.1$ px | $68.1 \times 42.4$ px | **$201.8 \times 110.8$ px** | `rgb(16, 16, 16) auto 5px` | Khung viền focus đen xuất hiện bao quanh anchor và vòng radar lệch |
| **300 ms** | $340 \times 129.1$ px | $68.1 \times 42.4$ px | **$224.5 \times 122.3$ px** | `rgb(16, 16, 16) auto 5px` | Vòng radar mở rộng, khung viền đen phình to theo |
| **600 ms** | $340 \times 129.1$ px | $68.1 \times 42.4$ px | **$248.2 \times 135.0$ px** | `rgb(16, 16, 16) auto 5px` | Khung viền đen lan rộng sang khu vực Kho 4 |
| **1500 ms** | $340 \times 129.1$ px | $68.1 \times 42.4$ px | **$254.7 \times 138.9$ px** | `rgb(16, 16, 16) auto 5px` | Đạt đỉnh chu kỳ 1.6s của `mapV2RadarPulse` |
| **5000 ms** | $340 \times 129.1$ px | $68.1 \times 42.4$ px | **Dao động $201.8 \rightarrow 254.7$ px** | `rgb(16, 16, 16) auto 5px` | Khung viền đen liên tục co giãn / phình to tuần hoàn |
| **10000 ms**| $340 \times 129.1$ px | $68.1 \times 42.4$ px | **Dao động $201.8 \rightarrow 254.7$ px** | `rgb(16, 16, 16) auto 5px` | Khung viền đen tồn tại vĩnh viễn cho đến khi mất focus |

### 3.2. Truy vết mã nguồn gây lỗi
1. **Phần tử nhận focus**:
   Trong `MapV2Canvas.tsx`:
   ```tsx
   <g
     key={anchor.zoneId}
     id={`v2-anchor-${anchor.zoneId}`}
     transform={`translate(${ax}, ${ay})`}
     className={`map-v2-anchor-group ${isZoneSelected ? 'active' : ''} ...`}
     onClick={(e) => handleAnchorClick(anchor.zoneId, e)}
     tabIndex={0}
     role="button"
   >
   ```
   Do có `tabIndex={0}`, khi người dùng nhấp chuột vào anchor, trình duyệt cấp focus cho phần tử `<g>`.
2. **Thiếu thiết lập `outline: none;`**:
   Trong `MapV2Workspace.css`:
   ```css
   .map-v2-anchor-group:focus-visible {
     outline: 2px solid var(--sgp-corporate-digital-blue, #0068FF);
     outline-offset: 4px;
   }
   ```
   CSS chỉ khai báo `:focus-visible` nhưng không thiết lập `.map-v2-anchor-group:focus { outline: none; }`. Trình duyệt áp dụng quy tắc mặc định `outline: auto 5px` (màu đen `rgb(16, 16, 16)`).
3. **Phần tử con làm biến dạng Bounding Box**:
   Bên trong `<g id="v2-anchor-ZONE_ADMIN">` có:
   ```tsx
   <circle
     r={isZoneSelected ? 24 : 19}
     className={`map-v2-anchor-radar ${isZoneSelected ? 'active' : ''}`}
   />
   ```
   Vì vòng tròn này bị dịch chuyển tọa độ do lỗi `transform-origin` (xem Sự cố C), phạm vi bounding box của `<g>` bị kéo giãn từ $X=642$ đến $X=897$ (chiều rộng $254.7$ px).
   Đồng thời, animation `mapV2RadarPulse` liên tục thay đổi scale, làm Bounding Box co giãn không ngừng, khiến khung viền đen trông như một hình chữ nhật ma quái phình to dần trên bản đồ!

---

## 4. Chi tiết Sự cố C — Các vòng tròn mờ trôi nổi (Floating Circles)

### 4.1. Truy vết mã nguồn
Trong `MapV2Canvas.tsx`:
```tsx
{ZONE_ANCHORS.map((anchor) => {
  ...
  return (
    <g key={anchor.zoneId} id={`v2-anchor-${anchor.zoneId}`} transform={`translate(${ax}, ${ay})`}>
      ...
      {/* Radar pulse wave */}
      <circle
        r={isZoneSelected ? 24 : 19}
        fill="none"
        stroke={...}
        strokeWidth={1.5}
        className={`map-v2-anchor-radar ${isZoneSelected ? 'active' : ''}`}
      />
      ...
    </g>
  );
})}
```
Và trong `MapV2Workspace.css`:
```css
@keyframes mapV2RadarPulse {
  0% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.35);
    opacity: 0;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

.map-v2-anchor-radar {
  animation: mapV2RadarPulse 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
  transform-origin: center;
}
```

### 4.2. Bản chất kỹ thuật của lỗi trôi nổi
1. **Lỗi SVG Transform Origin**:
   Thuộc tính `transform-origin: center;` trong CSS SVG yêu cầu trình duyệt phải xác định hộp tham chiếu (`transform-box`). Nếu không có `transform-box: fill-box;`, các trình duyệt Chromium/WebKit mặc định coi `transform-origin` là điểm trung tâm của viewport hoặc view-box của toàn bộ SVG (`[768, 512]`), chứ không phải tâm của hình tròn.
2. **Hệ quả độ lệch**:
   Phép scale áp dụng từ tâm `[768, 512]` thay vì tâm hình tròn tại `[0, 0]` làm hình tròn bị tịnh tiến một khoảng:
   $$\Delta \vec{d} = (\text{scale} - 1) \times (\vec{p}_{\text{anchor}} - \vec{p}_{\text{origin}})$$
   Với các anchor ở xa tâm (như `ZONE_QUAY` ở sông, `ZONE_CONTAINER` ở rìa phải, `BLDG_KHO_1` ở rìa trái), độ lệch này lên tới $150–200$ px!
3. **Phát xung vô hạn trên 7 phân khu**:
   Ngay cả khi người dùng không chọn phân khu nào, cả 7 hình tròn này vẫn chạy animation vô hạn `infinite`, tạo ra 7 đốm mờ trôi nổi nhấp nháy khắp mặt nước và bãi hàng.

---

## 5. Danh mục Minh chứng Cơ sở (Baseline Evidence)

1. **Ảnh chụp ban đầu**:
   - [01-baseline-initial-framing-1366x768.png](evidence/baseline/01-baseline-initial-framing-1366x768.png): Góc nhìn mặc định chứa quá nhiều mặt sông, Cổng B sát đáy.
   - [02-baseline-admin-selected-1500ms.png](evidence/baseline/02-baseline-admin-selected-1500ms.png): Chọn VP HC, lộ vòng tròn lệch ở rặng cây bên trên.
   - [03-baseline-admin-selected-10000ms.png](evidence/baseline/03-baseline-admin-selected-10000ms.png): Trạng thái sau 10 giây.
   - [focus_test.png](evidence/baseline/focus_test.png): Khung chữ nhật đen focus khổng lồ bao trùm cảng do Bounding Box của anchor bị phình to.
2. **Video tái hiện lỗi thực tế**:
   - [reproduction_walkthrough.webm](evidence/baseline/reproduction_walkthrough.webm): Ghi lại toàn bộ quá trình mở bản đồ, các vòng tròn trôi nổi và khung chữ nhật phình to khi click VP HC.
3. **Dữ liệu đo đạc chi tiết**:
   - [initial_circles.json](evidence/baseline/initial_circles.json): Danh sách 32 circles ban đầu.
   - [selected_circles.json](evidence/baseline/selected_circles.json): Danh sách 34 circles sau khi chọn VP HC.
   - [admin_selection_samples.json](evidence/baseline/admin_selection_samples.json): Mẫu kích thước bounding box qua các mốc thời gian 0ms, 300ms, 600ms, 1500ms, 5000ms, 10000ms.

---

## 6. Chiến lược Khắc phục Tận gốc

1. **Sự cố A (Camera Framing)**:
   - Tách bạch cấu trúc:
     - `INITIAL_OPERATIONAL_FRAME`: Tính toán vị trí camera tối ưu dựa trên hình học thực tế của 7 phân khu và 2 cổng ($Y \in [200, 770]$). Thiết lập chế độ mặc định `viewMode = 'width'`, tự động căn khoảng đệm sông hợp lý phía trên ($\approx 60–80$ px) và dành không gian thoáng đãng cho Cổng A, Cổng B, VP Hành chính phía dưới.
     - `MANUAL_VIEW`: Khi người dùng pan/zoom tự do, bảo toàn 100% điểm hội tụ bản đồ (`focal point`) khi resize, không tự động reset.
     - `Reset View`: Khôi phục chuẩn xác `INITIAL_OPERATIONAL_FRAME` một cách tất định, không tích lũy sai số.
2. **Sự cố B (Khung chữ nhật phình to)**:
   - Loại bỏ hoàn toàn vòng radar phình to `.map-v2-anchor-radar`.
   - Thêm `outline: none;` cho `.map-v2-anchor-group:focus` và `.map-v2-anchor-group:focus-visible`.
   - Đối với khả năng tiếp cận bàn phím (`focus-visible`), áp dụng viền chỉ định chuẩn SVG trên chính badge hình tròn tâm $[0, 0]$ của anchor (`.map-v2-anchor-badge`).
   - Giữ nguyên đường biên đa giác chuẩn của phân khu, chuyển hiệu ứng hiển thị biên phân khu sang chuyển tiếp `opacity` / `stroke-opacity` mượt mà, loại bỏ mọi khung chữ nhật bao ngoài không cần thiết.
3. **Sự cố C (Vòng tròn trôi nổi)**:
   - Loại bỏ các vòng tròn trang trí vô nghĩa không cần thiết trên 7 hotspot.
   - Hotspot duy trì thiết kế tối giản: Badge hình tròn chuẩn hàng hải, icon danh mục vector sắc nét và nhãn tên phân khu.
   - Giữ lại hiệu ứng sóng bung mở vùng tác nghiệp (`map-v2-reveal-wave`) có thời lượng hữu hạn (520ms) và được giới hạn tuyệt đối bên trong đường bao đa giác bằng `clipPath`.
