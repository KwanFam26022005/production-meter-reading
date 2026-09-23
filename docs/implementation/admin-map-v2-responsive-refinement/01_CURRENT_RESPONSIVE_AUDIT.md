# 01 — Báo cáo Đo lường & Kiểm toán Hiện trạng Responsive (Baseline Audit)

> **Phân hệ**: Bản đồ Kỹ thuật V2 (Operations Admin Portal)  
> **Thời điểm kiểm toán**: 22/09/2026  
> **Dữ liệu đo đạc thực tế**: Playwright Browser Automation trên Microsoft Edge engine

---

## 1. Bảng Đo đạc Hiện trạng trên 5 Khung nhìn (Viewports)

Kiểm toán được thực hiện bằng đo đạc trực tiếp các phần tử DOM (`offsetWidth`, `clientWidth`, `scrollWidth`, `offsetHeight`, `clientHeight`) và tính toán tỷ lệ zoom trên 5 độ phân giải chuẩn:

| Viewport | Sidebar | Header Height | Toolbar Width | Canvas (Operational) | Fit Scale | Canvas (Inspector Mở) | Inspector Width | Inspector Scale | Hiện tượng / Lỗi Quan sát được |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1280 × 720** | 80px | **101px** | 977px | 1200 × 619 px | 60% | 840 × 596 px | 360px | 55% | **Header bị gãy thành 2 dòng** (cao 101px thay vì 62px); Inspector chiếm 360px ép canvas thu nhỏ 30%, zoom tụt xuống 55%. |
| **1366 × 768** | 80px | **101px** | 1050px | 1286 × 667 px | 65% | 926 × 667 px | 360px | 60% | **Header tiếp tục gãy dòng** do Toolbar dài hơn không gian khả dụng bên phải tiêu đề; Inspector ép co cụm bản đồ. |
| **1536 × 864** | 80px | 62px | 1142px | 1456 × 802 px | 78% | 1096 × 763 px | 360px | 71% | Header 1 dòng vừa vặn, nhưng mở inspector vẫn làm co giật canvas 360px. |
| **1920 × 1080**| 80px | 62px | 1142px | 1840 × 1018 px| 99% | 1480 × 1018 px| 360px | 96% | Hoạt động bình thường, không gian rộng rãi cho docked panel. |
| **2560 × 1440**| 80px | 62px | 1142px | 2480 × 1378 px| 135%| 2120 × 1378 px| 360px | 135%| Không gian thừa lớn, bản đồ phóng to 135%. |

---

## 2. Phân tích 10 Nguyên nhân Gốc rễ (Root Causes)

### 2.1. Thanh công cụ quá dài gây gãy dòng Header (Toolbar Density & Wrapping)
- **Hiện tượng**: `.map-v2-toolbar` chứa cùng lúc 6 khối điều khiển (Pill metadata, 2 segmented controls, nút Layer popover, nút Deselect). Khi container < 1380px, flexbox của `.map-v2-header` tự động đẩy toolbar xuống dòng thứ hai, làm tăng chiều cao header từ 62px lên 101px.
- **Hệ quả**: Mất 39px chiều cao hiển thị bản đồ trên các laptop 720p/768p vốn đã hạn chế về chiều dọc.

### 2.2. Panel Kiểm tra Hình học cứng 360px (Hardcoded Docked Inspector Squeeze)
- **Hiện tượng**: `.map-v2-inspector-panel` có thuộc tính cứng `width: 360px; flex-shrink: 0;`.
- **Hệ quả**: Trên màn hình hẹp (< 1400px), việc mở inspector chiếm mất 30–40% bề ngang, kích hoạt `ResizeObserver` làm bản đồ bị thu nhỏ (scale tụt từ 60% xuống 55%), gây gián đoạn thị giác và co giật khung nhìn.

### 2.3. Thiếu cơ chế Phân định Trạng thái Camera (AUTO_FIT vs MANUAL_VIEW)
- **Hiện tượng**: `MapV2Canvas` hiện dùng cờ nhị phân `isCustomTransformRef.current`. Khi cờ này bật (người dùng đã zoom/pan thủ công), sự kiện resize không tính toán lại vị trí tiêu điểm (focal point), khiến đối tượng đang quan sát bị trôi lệch khỏi tầm mắt khi thay đổi kích thước cửa sổ hoặc mở/đóng inspector.

### 2.4. Thẻ Thông tin Vận hành cố định góc dưới bên trái (Detached Operational Card)
- **Hiện tượng**: `.map-v2-operational-card` luôn cố định ở `bottom: 24px; left: 24px;`.
- **Hệ quả**: Khi người dùng chọn phân khu ở phía đông cảng (như Bãi Container tại [1232, 393]), thẻ thông tin nằm tách biệt hoàn toàn ở góc đối diện, thiếu tính liên kết không gian (spatial proximity). Trên màn hình nhỏ, thẻ có thể che mất các điểm neo phía tây.

### 2.5. Trùng lặp nhãn phân khu ở tỷ lệ nhỏ (Hotspot Label Crowding)
- **Hiện tượng**: Tất cả 7 phân khu đều hiển thị nhãn chữ đầy đủ với pill nền cố định.
- **Hệ quả**: Ở mức zoom nhỏ (< 70%) trên màn hình 1280x720, nhãn của Kho 1, Kho 2 và Bãi tổng hợp có xu hướng áp sát và che lấp một phần hình học lân cận.

### 2.6. Độ tương phản chữ trong chế độ Neon (Neon Contrast Degradation)
- **Hiện tượng**: Trong `MapV2InspectionPanel.tsx` và `MapV2Layers.tsx`, một số thuộc tính màu chữ đang bị hardcode trực tiếp style inline: `color: '#181818'`, `color: '#5E5B5B'`.
- **Hệ quả**: Khi chuyển sang Neon mode (`tone-neon` với nền `#07152b`), các đoạn chữ này bị chìm vào nền tối, không đạt tiêu chuẩn tương phản WCAG AA/AAA.

### 2.7. Sóng Reveal lan ra ngoài ranh giới đa giác (Unclipped Wavefront Ripple)
- **Hiện tượng**: Vòng tròn sóng lan tỏa `<circle className="map-v2-reveal-wave">` hiện đang nằm ngoài nhóm `<g clipPath="...">`, dẫn đến một vòng sóng mờ hiển thị tràn ra ngoài biên ranh phân khu.
- **Giải pháp**: Đưa sóng năng lượng vào bên trong `clipPath` đa giác của phân khu được chọn để hiệu ứng lan tỏa hoàn toàn nằm trong khuôn viên phân khu.

### 2.8. Chưa có hỗ trợ Chuyển động Tối giản (Reduced Motion Support)
- **Hiện tượng**: Người dùng có cấu hình hệ điều hành `prefers-reduced-motion: reduce` vẫn phải trải qua animation 450ms. Cần hỗ trợ chuyển đổi tức thời khi phát hiện tùy chọn này.

### 2.9. Tương tác Bàn phím & Focus Accessibility
- **Hiện tượng**: Các anchor hotspot và nút điều khiển cần hỗ trợ đầy đủ `aria-expanded`, phím `Escape` để đóng panel, và chỉ báo focus rõ ràng trên cả hai theme Sáng và Neon.

### 2.10. An toàn Đóng gói & Cách ly Mã nguồn
- Toàn bộ cải tiến phải nằm trọn trong module `map-v2`, không gây rò rỉ mã sang User Portal và bảo toàn 100% Bản đồ V1.
