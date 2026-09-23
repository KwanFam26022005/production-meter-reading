# Hỗ trợ Khả năng Tiếp cận và Chế độ Giảm Chuyển động — Giai đoạn 2 (Accessibility & Reduced Motion)

> **Phân hệ**: Tiêu chuẩn Tiếp cận Web (WCAG 2.1 AA) & Tôn trọng Tùy chọn Người dùng  
> **Tệp mã nguồn**: `frontend/src/components/map-v2/MapV2UtilityLayer.tsx`, `MapV2Workspace.css`  
> **Ảnh minh chứng**: `docs/implementation/map-v2-utility-animation-phase2/evidence/14-reduced-motion-expanded.png`

---

## 1. Tuân thủ Tùy chọn Giảm Chuyển động (`prefers-reduced-motion: reduce`)

Đối với người dùng có tiền sử rối loạn tiền đình (vestibular motion disorders) hoặc người dùng cấu hình hệ điều hành ưu tiên hiệu năng, hệ thống cung cấp giải pháp xử lý hai lớp:

### A. Tầng Điều khiển JavaScript (`UtilityNetworkController`):
```typescript
if (this.options.prefersReducedMotion) {
  // Bỏ qua toàn bộ vòng lặp rAF 1465ms; chuyển ngay sang trạng thái mở rộng hoàn toàn
  this.currentState = createFullyExpandedState(this.currentState.utilityType, this.graph, tokenGen);
  this.options.onUpdate(this.currentState);
  if (this.options.onPhaseChange) this.options.onPhaseChange('expanded');
  return;
}
```
- **Thời gian chuyển đổi**: Đúng **`0 ms` (tức thì)**.
- Khi người dùng nhấp vào nút nguồn, toàn bộ mạng lưới hiển thị 100% ngay lập tức mà không có bất kỳ chuyển động vẽ nét nào.
- Ảnh chụp kiểm chứng `14-reduced-motion-expanded.png` xác nhận mạng lưới mở rộng hoàn hảo ở chế độ này.

### B. Tầng Trình diễn CSS (`MapV2Workspace.css`):
```css
@media (prefers-reduced-motion: reduce) {
  .utility-edge,
  .utility-node,
  .utility-node * {
    transition: none !important;
    animation: none !important;
  }
}
```

---

## 2. Điều hướng Bàn phím Toàn diện (Keyboard Navigation)

Mọi phần tử tương tác trên lớp mạng lưới (nút nguồn và các nút đồng hồ đo) đều hỗ trợ phím bấm đầy đủ:

1. **Thuộc tính Bàn phím**:
   - `tabIndex={0}`: Cho phép người dùng duyệt tuần tự qua các nút mạng bằng phím `Tab` và `Shift+Tab`.
   - `role="button"`: Khai báo ngữ nghĩa nút bấm chính thức trong cây trợ năng (Accessibility Tree).
2. **Xử lý Sự kiện Phím**:
   - Nhấn phím `Enter` hoặc `Space` (Phím cách): Kích hoạt hành động tương đương nhấp chuột (Mở mạng, Thu hồi, hoặc Truy vết).
3. **Vòng Chỉ báo Tiêu điểm Tương phản Cao (Focus Ring Indicator)**:
   - Khi phần tử nhận tiêu điểm từ bàn phím, vòng bao ngoài hiển thị rõ nét:
     - Chế độ Chuẩn kỹ thuật: `outline: 2px solid #0068FF; outline-offset: 3px;`
     - Chế độ Neon: `outline: 2px solid #00F0FF; outline-offset: 3px; box-shadow: 0 0 8px #00F0FF;`
   - Đảm bảo tỷ lệ tương phản vượt mức $4.5:1$ theo khuyến nghị WCAG 2.1 AA.

---

## 3. Nhãn Ngữ nghĩa Trình đọc Màn hình (Screen Reader Attributes)

Các thuộc tính ARIA được cập nhật động tương ứng với từng giai đoạn của máy trạng thái:

| Loại Nút | Trạng thái Mạng | Thuộc tính `aria-label` tiếng Việt chính xác | Thuộc tính trạng thái |
| :--- | :--- | :--- | :---: |
| **Nút Nguồn** | `collapsed` | `"Nguồn Lưới 110kV EVN (SIM-EXT-GRID) — Nhấp để mở mạng lưới điện mô phỏng"` | `aria-expanded="false"` |
| **Nút Nguồn** | `expanded` / `tracing` | `"Nguồn Lưới 110kV EVN (SIM-EXT-GRID) — Nhấp để thu hồi mạng lưới điện"` | `aria-expanded="true"` |
| **Đồng hồ đo** | Đang bình thường | `"Đồng hồ SIM-EM-004 (Tủ Bãi Trung tâm FDR-CENTER) — Nhấp để truy vết tuyến nguồn"` | — |
| **Đồng hồ đo** | Đang truy vết | `"Đồng hồ SIM-EM-004 — Đang truy vết (Nhấp để xóa truy vết)"` | `aria-current="true"` |
| **Nút Trạm/Van**| Đã mở | `"Trạm biến áp SS-01 (SIM-SS-01)"` | — |

Tất cả các thông báo đều sử dụng tiếng Việt tiêu chuẩn ngành điện - nước hàng hải, giúp nhân viên khiếm thị hoặc người vận hành sử dụng công cụ hỗ trợ tiếp cận thông tin chính xác.
