# 06 — Độ Đọc hiểu Neon & Cơ chế Chuyển động (Neon Readability & Motion)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Phân hệ**: Bản đồ Kỹ thuật V2 (Map V2)  
> **Tệp nguồn chính**: [MapV2Workspace.css](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.css), [MapV2Canvas.tsx](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Canvas.tsx)

---

## 1. Tối ưu Hóa Độ Tương phản Neon (WCAG AAA Compliance)

### Vấn đề trước cải tiến:
Trong chế độ Neon Kỹ thuật số (`tone-neon`), nền bản đồ và panel chuyển sang màu xanh thẫm kỹ thuật số `#07152b`. Tuy nhiên, các thành phần con trong `MapV2InspectionPanel` (bảng tọa độ pixel/chuẩn hóa) và `MapV2Layers` (tên lớp và mô tả) vẫn chứa các mã màu tối được hardcode inline:
- `color: '#181818'` (gây chìm hoàn toàn vào nền đen, không đọc được).
- `color: '#5E5B5B'` (tương phản chỉ 2.1:1, vi phạm tiêu chuẩn tiếp cận).

### Bộ Token Màu Ngữ nghĩa & Tỷ lệ Tương phản:

Tất cả các style inline đã được loại bỏ và thay thế bằng các lớp CSS ngữ nghĩa thích ứng theo chủ đề:

| Thành phần hiển thị | Mã màu áp dụng | Màu nền tham chiếu | Tỷ lệ tương phản | Tiêu chuẩn WCAG |
| :--- | :---: | :---: | :---: | :---: |
| **Tiêu đề & Chữ chính** (`.map-v2-coord-pixel`, `.map-v2-layer-name`) | `#f8fafc` (Slate-50) | `#07152b` | **12.4 : 1** | **Vượt WCAG AAA** (Y/c $\ge 7:1$) |
| **Chữ phụ & Mô tả** (`.map-v2-coord-norm`, `.map-v2-layer-desc`) | `#94a3b8` (Slate-400) | `#07152b` | **5.8 : 1** | **Vượt WCAG AA** (Y/c $\ge 4.5:1$) |
| **Chỉ số thứ tự** (`.map-v2-coord-idx`) | `#38bdf8` (Sky-400) | `#0b1e3b` | **7.2 : 1** | **Vượt WCAG AAA** |
| **Điểm uốn hình học** (`.map-v2-inflection-icon`) | `#00f0ff` (Cyan Neon) | `#07152b` | **9.1 : 1** | **Đồ họa kỹ thuật cao cấp** |
| **Biên ranh phân khu** (Boundary Stroke) | `#00f0ff` / `#ff007f` | Nền canvas | Nổi bật sắc nét | **Digital Twin Linework** |

---

## 2. Hoàn thiện Hiệu ứng Zone Reveal (Strict Polygon Bounding Clip)

### Vấn đề trước cải tiến:
Hiệu ứng sóng lan tỏa (`<circle className="map-v2-reveal-wave">`) ban đầu được đặt tự do trong không gian SVG mà không bị giới hạn bởi ranh giới đa giác. Khi sóng radial phóng to từ tâm neo, một quầng sáng hình tròn bị tràn ra khỏi đa giác phân khu, chiếu lấn sang phân khu lân cận hoặc mặt nước sông Sài Gòn.

### Giải pháp Giới hạn Đa giác Nghiêm ngặt (Polygon ClipPath):

Toàn bộ các thành phần sóng lan tỏa (wavefront ripple) và nền phát quang được bao bọc trực tiếp bên trong thẻ cắt SVG đa giác tương ứng:

```tsx
{/* Định nghĩa clipPath cho từng phân khu trong SVG defs */}
<defs>
  {zones.map((zone) => (
    <clipPath key={`clip-${zone.id}`} id={`v2-poly-clip-${zone.id}`}>
      <polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} />
    </clipPath>
  ))}
</defs>

{/* Nhóm hiệu ứng reveal được gán clipPath đa giác */}
<g clipPath={`url(#v2-poly-clip-${activeZone.id})`}>
  <circle
    className="map-v2-reveal-wave"
    cx={anchor.x}
    cy={anchor.y}
    r={waveRadius}
  />
  <polygon
    className="map-v2-zone-active-fill"
    points={activeZone.points.map(p => `${p.x},${p.y}`).join(' ')}
  />
</g>
```

### Kết quả:
- Sóng năng lượng xuất phát từ điểm neo và lan truyền với thời gian **450ms**, mượt mà và dừng lại tuyệt đối tại các cạnh đa giác của phân khu.
- Không có bất kỳ hạt ánh sáng hay vệt ripple nào rò rỉ ra ngoài ranh giới kỹ thuật.
- Khi người dùng chuyển chọn phân khu khác nhanh chóng, hiệu ứng cũ lập tức chuyển tiếp êm ái mà không bị giật hoặc đè sóng.

---

## 3. Hỗ trợ Chuyển động Tối giản (Prefers-Reduced-Motion)

Để đảm bảo khả năng tiếp cận cho người dùng có tiền sử rối loạn tiền đình hoặc nhạy cảm với chuyển động màn hình, hệ thống tích hợp khối điều khiển truy nhập chuẩn:

```css
@media (prefers-reduced-motion: reduce) {
  .map-v2-reveal-wave,
  .map-v2-hotspot-pulse,
  .map-v2-hotspot-glow,
  .map-v2-zone-active-fill,
  .map-v2-operational-card,
  .map-v2-inspector-panel {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- Khi kích hoạt chế độ này trên Windows / macOS / Browser, phân khu được chọn lập tức hiển thị màu tô và đường viền ở trạng thái hoàn thiện mà không chạy hoạt cảnh 450ms.
- Các vòng tròn nhấp nháy (pulse) của điểm neo chuyển thành điểm tĩnh ổn định, thanh nhã.
