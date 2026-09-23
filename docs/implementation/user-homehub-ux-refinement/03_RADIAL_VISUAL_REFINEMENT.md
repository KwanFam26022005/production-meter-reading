# Tinh chỉnh Thiết kế Thị giác & Hình học Radial Navigation
## User Home Hub UX Refinement

---

## 1. Vấn đề của Radial Menu trước đây

1. **Nút con và nhãn thiếu gắn kết:** Các nút chức năng bung lên theo hình quạt nhưng nhãn mô tả hiển thị dạng bong bóng tooltip trôi nổi, dễ bị lệch tâm hoặc che mất các phần tử khác trên màn hình nhỏ.
2. **Kích thước và nét viền thiếu đồng nhất:** Biểu tượng và kích thước nút con chưa đạt độ chuẩn xác đồng đều.
3. **Lớp phủ làm mờ (Backdrop Blur) quá nặng:** Sử dụng lớp phủ tối mờ sâu (backdrop blur 4px) khiến toàn bộ màn hình phía sau biến mất, làm mất ngữ cảnh vận hành của nhân viên hiện trường.
4. **Nguy cơ tràn viền ngang (Horizontal Overflow):** Trên các thiết bị di động có màn hình hẹp (dưới 360px), các nút bung ra hai bên có nguy cơ chạm hoặc tràn mép màn hình.

---

## 2. Các cải tiến hình học và thị giác đã thực hiện

Tệp thành phần [`frontend/src/components/home/BottomRadialNav.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/home/BottomRadialNav.tsx) và [`frontend/src/index.css`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/index.css) đã được tinh chỉnh toàn diện:

### A. Cấu trúc Phần tử Gắn kết Thống nhất (`.sgp-radial-arc-item`)
Mỗi nhánh trong cung bán nguyệt được cấu trúc thành một khối đồng bộ gồm:
```html
<div className="sgp-radial-arc-item arc-item-left">
  <button className="sgp-radial-arc-btn" role="menuitem">
    <Clock size={20} strokeWidth={2.2} />
  </button>
  <span className="sgp-radial-arc-label">Chấm công</span>
</div>
```
- **Kích thước nút con:** Cố định chính xác `46px × 46px`, bo tròn hoàn toàn `50%`.
- **Màu sắc nút con:** Mặt phẳng màu trắng sứ `var(--sgp-corporate-white)`, viền màu xanh nhận diện Cảng Sài Gòn `2px solid var(--sgp-corporate-navy)`.
- **Biểu tượng:** `20px` với độ dày nét `strokeWidth={2.2}`, màu sắc `var(--sgp-corporate-navy)`.
- **Nhãn tích hợp bên dưới (`.sgp-radial-arc-label`):**
  - Đặt cố định ngay bên dưới vòng tròn nút con (cách `4px`).
  - Dạng viên thuốc thu gọn màu trắng viền siêu mảnh, chữ màu than đậm `var(--sgp-corporate-charcoal)`, kích cỡ chữ `11px`, font trọng số `600`.
  - Nhãn di chuyển đồng bộ 100% cùng nút con trong chuyển động bung mở.

### B. Tọa độ Bung Hình Cung An toàn (Arc Offsets)
Để đảm bảo không bị tràn viền màn hình trên bất kỳ dòng điện thoại nào (kể cả iPhone SE 375px hay Galaxy Fold hẹp):
- **Nút Trái (Chấm công):** Tọa độ dịch chuyển `transform: translate(-68px, -64px)`.
- **Nút Giữa (Đo đếm):** Tọa độ dịch chuyển `transform: translate(0px, -96px)`.
- **Nút Phải (Lịch trực):** Tọa độ dịch chuyển `transform: translate(68px, -64px)`.
- Khoảng cách bán kính bung `~95px`, góc mở phân bố đối xứng `45° - 90° - 135°` quanh tâm nút FAB.

### C. Lớp Phủ Tối Nhẹ Tinh Tế (Refined Light Dim Backdrop)
Thay vì lớp làm mờ dày đặc, lớp phủ mới sử dụng:
```css
.sgp-radial-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 24, 24, 0.22);
  backdrop-filter: blur(1.5px);
  -webkit-backdrop-filter: blur(1.5px);
  z-index: 80;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```
Lớp phủ này giúp làm nổi bật menu bán nguyệt nhưng vẫn giữ cho nhân viên nhìn thấy rõ ràng các thông tin phía sau.

---

## 3. Bảo toàn Vòng Tiến độ Toàn Cảng (Whole-Port Progress Ring)

Công thức chu vi đường tròn bán kính `r = 30` trên `viewBox="0 0 68 68"` được bảo toàn nghiêm ngặt:
$$\text{Circumference} = 2 \times \pi \times 30 \approx 188.5$$
$$\text{Dashoffset} = \text{Circumference} - \left(\frac{\text{Percent}}{100}\right) \times \text{Circumference}$$

- Khi có lượt đọc mở: Vòng tiến độ hiển thị màu xanh công nghệ Cảng Sài Gòn (`#0068FF`), huy hiệu hiển thị `N% cảng`.
- Khi chưa có lượt đọc hoặc đã hoàn tất: Vòng hiển thị trạng thái trung hòa thanh lịch, huy hiệu hiển thị `Chưa có lượt`.

---

## 4. Khả năng Tiếp cận & Trải nghiệm Bàn phím (Accessibility & Motion)

- **ARIA Semantics:**
  - Nút kích hoạt trung tâm: `aria-expanded={isOpen}`, `aria-haspopup="menu"`, nhãn `aria-label="Mở menu thao tác tác nghiệp"`.
  - Khung cung bán nguyệt: `role="menu"`, nhãn `aria-label="Các tác vụ mở rộng"`.
  - Từng nút chức năng: `role="menuitem"`, `tabIndex={isOpen ? 0 : -1}`.
- **Phím Escape & Click Outside:** Tự động lắng nghe sự kiện phím `Escape` hoặc nhấp chuột ra ngoài vùng menu để đóng menu ngay lập tức.
- **Hỗ trợ Giảm chuyển động:** Thiết lập `@media (prefers-reduced-motion: reduce)` triệt tiêu thời gian chuyển động (`transition-duration: 0.01ms`) để tránh gây chóng mặt cho người dùng nhạy cảm với chuyển động.
