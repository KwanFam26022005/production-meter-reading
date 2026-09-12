# V10 Progressive-Disclosure Minimal HUD — Cảng Tân Thuận
## Thiết kế Giao diện Điều hành Hàng hải Tối giản & Tiết lộ Thông tin Lũy tiến

Phiên bản: `tan-thuan-v10`  
Mã nguồn phong cách: `frontend/src/features/map-operations/motion/mapMotion.css`  
Mã nguồn token: `frontend/src/features/map-operations/tokens/mapDesignTokens.ts`

---

### 1. Triết lý Thiết kế: Bản đồ là Mặt phẳng Chính (Map-First Plane)

Trong các hệ thống giám sát cảng biển hiện đại, bản đồ không phải là hình nền trang trí mờ nhạt nằm dưới một đống panel bảng biểu dashboard màu trắng. **Bản đồ không gian là trung tâm điều hành chính.**

V10 áp dụng triệt để nguyên lý **Tiết lộ Thông tin Lũy tiến (Progressive Disclosure)**:
1. **Trạng thái Mặc định (Overview)**: Chỉ hiển thị những thông số sống tối quan trọng; toàn bộ công cụ truy vấn phức tạp được thu gọn vào các biểu tượng tinh gọn $\ge 44\text{px}$.
2. **Kích hoạt Theo Nhu cầu (On-Demand)**: Khi người dùng cần tìm kiếm, lọc hoặc kiểm tra chuyên sâu, bề mặt tương tác sẽ mở rộng mượt mà ngay tại chỗ và tự động thu gọn lại khi tác vụ hoàn thành.

---

### 2. Chi tiết Cấu trúc Tối giản Hóa từng Thành phần

#### 2.1. Thanh Lệnh Đỉnh Gộp (Unified Top Command Rail)
- **Chiều cao**: Tối ưu từ `58px` xuống `48–52px`.
- **Cụm hiển thị Thời gian & Ca trực Hợp nhất (`.sgp-top-temporal-group`)**:
  - Gộp ngày tháng và ca trực vào một viên thuốc duy nhất:
    `05/08/2026 · Ca 1 — 17:00`
  - Loại bỏ các dropdown cồng kềnh thường trực, chỉ hiển thị thông tin ca trực hiện hành.
- **Nút Chuyển Chế độ [Bản đồ | Danh sách] (`.sgp-scene-segmented-switch`)**:
  - Dạng viên thuốc trượt bán trong suốt (`smoked maritime surface`), độ phản hồi cao.
- **Chip Tài khoản Tối giản (`.sgp-user-chip`)**:
  - Vòng tròn `32px` với chữ cái đầu `[ P ]`, loại bỏ họ tên dài dòng chiếm diện tích ngang.

#### 2.2. Công cụ Truy vấn Dạng Icon (Icon-First Query Tools)
- **Ô Tìm kiếm Tự co giãn (`.sgp-search-wrap`)**:
  - Trạng thái đóng: Nút tròn icon kính lúp `40px` (vùng cảm ứng $\ge 44\text{px}$).
  - Trạng thái mở: Click vào icon sẽ bung mở thanh tìm kiếm ngang tại chỗ `240–320px` với hiệu ứng `cubic-bezier(0.4, 0, 0.2, 1)`, tích hợp nút xóa nhanh `X`. Bấm phím `ESC` hoặc click ra ngoài sẽ tự động thu gọn.
- **Nút Bộ lọc Kèm Huy hiệu (`.sgp-map-icon-action`)**:
  - Nút icon phễu tròn `40px` kèm số đếm điều kiện lọc đang kích hoạt (`sgp-filter-count-badge`).

#### 2.3. Dải Thông số Vận hành Mức Thấp (Low-Surface Telemetry Rail)
- Nằm gọn gàng ở góc trên bên phải:
  ```
  [ ✓ Bình thường ]   11/12 hoàn tất   1 quá hạn   [ 📊 ]
  ```
- **Màu sắc ngữ nghĩa**:
  - Số lượng hoàn tất: Màu trung tính dịu mắt.
  - Ngoại lệ/Quá hạn: Nhấn màu vàng hổ phách hoặc đỏ cam nhẹ.
  - Nút Phân tích: Biểu tượng biểu đồ tròn `28px` với tooltip `"Phân tích vận hành"`.

#### 2.4. Tiện ích Tiến độ Ca trực Thu gọn (Collapsed Timeline Utility)
- Thay thế toàn bộ cụm chọn giờ cồng kềnh ở góc dưới bằng một viên thuốc thanh lịch:
  `17:00 · 92%`
- **Hành vi tương tác**:
  - Trạng thái bình thường: Chiếm diện tích cực nhỏ.
  - Hover hoặc Click: Bung mở danh sách các mốc giờ trong ca trực và thanh tiến độ chi tiết.

#### 2.5. Nhãn Phân khu Bản đồ Học (Cartographic Zone Labels)
- Thay thế các nút bấm hình chữ nhật nổi bằng nhãn tọa độ bản đồ học:
  `● 1  CẦU CẢNG`
- **Quy cách**:
  - Chấm tròn màu phân khu đường kính 3px.
  - Số thứ tự phân khu (1–6).
  - Tên phân khu in hoa thanh lịch, font sans-serif hệ thống.
  - Nền chip bán trong suốt tối màu (`15–25% opacity`), đổ bóng nhẹ `text-shadow` để dễ đọc trên mọi vùng ảnh vệ tinh.
  - Không có viền nổi giả nút bấm.

---

### 3. Hệ thống Cấp độ Chi tiết Thực thể (LOD - Level of Detail)

Để tránh hiện tượng bản đồ bị che kín bởi hàng chục marker khi ở chế độ xem toàn cảnh:

| Cấp độ | Kích thước Marker Công tơ | Chi tiết Hiển thị | Vùng Cảm ứng (Touch Target) |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | `10–12px` (Chấm tròn nhỏ) | Màu trạng thái (Xanh / Vàng / Đỏ) | Đảm bảo padding vô hình $\ge 44\text{px}$ |
| **ZONE_FOCUS** | `16–18px` (Hình lục giác gọn) | Mã số rút gọn (ví dụ: `03`, `08`) | $\ge 44\text{px}$ |
| **ENTITY_FOCUS** | `20–24px` (Lục giác đầy đủ) | Mã công tơ đầy đủ (`CT-003`), viền kép phát quang, hiệu ứng xung nhịp | $\ge 44\text{px}$ |

#### Phân biệt Hình dáng Hình học (Silhouette Invariants):
- **Công tơ (Meter)**: Hình lục giác (Hexagon).
- **Người vận hành (Operator)**: Hình tròn kèm chữ cái viết tắt tên nhân viên và vòng tiến độ.
- **Cảnh báo (Alert/Exception)**: Hình tam giác cảnh báo màu cam.
- **Phân khu (Zone)**: Đa giác bao quanh có viền đôi mềm.
