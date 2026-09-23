# 09 — Các Vấn đề Tồn đọng & Định hướng Nâng cấp (Remaining Issues & Roadmap)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Phân hệ**: Bản đồ Kỹ thuật V2 (Map V2)

---

## 1. Đánh giá Khối lượng & Trạng thái Tồn đọng

Hiện tại, **toàn bộ 10 mục tiêu cốt lõi** của giai đoạn hoàn thiện Responsive & Tương tác Bản đồ V2 đã được giải quyết triệt để:
- Không còn hiện tượng gãy dòng thanh công cụ (Header Wrapping).
- Không còn co giật khung nhìn hoặc tụt tỷ lệ zoom khi mở Inspector trên màn hình hẹp.
- Không còn hiện tượng trôi lệch tâm điểm quan sát (Focal Point Drift).
- Thẻ thông tin vận hành đã được gắn kết không gian và tự động né tránh HUD.
- Độ tương phản chế độ Neon đạt chuẩn WCAG AAA.
- Sóng Reveal được giới hạn hoàn toàn trong đa giác.
- Hỗ trợ đầy đủ tương tác phím, focus-visible và prefers-reduced-motion.

---

## 2. Các Đánh đổi Thiết kế Có chủ đích (Deliberate Design Trade-offs)

1. **Overlay Drawer thay vì Docked Panel trên Màn hình < 1380px**:
   - *Đánh đổi*: Drawer sẽ che khuất một phần bản đồ phía bên phải khi người dùng đang kiểm tra thuộc tính.
   - *Lý do*: Trên màn hình từ 1280px đến 1366px, nếu tiếp tục ép docked panel 360px thì diện tích bản đồ chỉ còn ~840px (mất 30%), khiến tỷ lệ zoom giảm sâu và chi tiết linework bị co cụm khó quan sát. Việc dùng Drawer kèm backdrop mờ giúp giữ nguyên 100% kích thước và độ phóng đại của bản đồ, ưu tiên tính trung thực của hình học kỹ thuật.
2. **Ngưỡng Thu gọn Nhãn ở Zoom < 0.72**:
   - *Đánh đổi*: Nhãn tên phân khu thu ngắn thành mã định danh (ví dụ: "BÃI CONT" thay vì "Bãi tập kết Container cảng").
   - *Lý do*: Tránh hiện tượng chữ đè chữ và che lấp các tuyến đường kết nối khi bản đồ đang ở góc nhìn toàn cảnh xa. Người dùng có thể rê chuột hoặc chọn để xem tên đầy đủ tức thì.

---

## 3. Khuyến nghị Nâng cấp cho Giai đoạn Tiếp theo (Future Roadmap)

1. **Cử chỉ Chạm Đa điểm (Multi-touch Pinch-to-Zoom)**:
   - Hiện tại tương tác zoom/pan được tối ưu cho chuột (Mouse Wheel, Drag, HUD Buttons). Khi triển khai thêm trên các máy tính bảng công nghiệp (iPad / Toughbook) của giám sát viên ngoài bãi, có thể bổ sung touch gesture engine.
2. **Lưu trữ Cấu hình Góc nhìn Ưa thích (User Preset Framing)**:
   - Cho phép điều độ viên lưu lại các góc nhìn thường dùng (ví dụ: "Khu vực Cầu tàu trực ca 1", "Kho 1 & 2") để chuyển đổi nhanh chỉ với 1 click.
3. **Bộ Lọc Phân khu Nâng cao (Dynamic Category Filtering)**:
   - Cho phép lọc hiển thị riêng nhóm kho hàng (Kho 1, 2, 4) hoặc nhóm bãi (Bãi tổng hợp, Bãi container) ngay từ menu popover.
