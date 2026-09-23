# Báo cáo Tuân thủ Bộ Kỹ năng — Giai đoạn 2 (Skill Compliance Report)

> **Dự án**: Số hóa Bản đồ Điều hành Cảng Sài Gòn — Lớp Hoạt họa Mạng lưới Kỹ thuật Map V2  
> **Các nguồn kỹ năng độc lập**:  
> 1. `D:\Projects\production-meter-reading\production-meter-reading\.agents`  
> 2. `D:\Projects\production-meter-reading\production-meter-reading\.agent`  
> **Nguyên tắc**: Giữ nguyên vẹn cả hai thư mục, không chỉnh sửa bất kỳ tệp kỹ năng nào.

---

## 1. Danh mục Kỹ năng Được Phát hiện (Skills Discovered)

### Nguồn Thư mục `.agent`:
- **`saigon-port-ui`** (`.agent/skills/saigon-port-ui/SKILL.md`): Bộ quy chuẩn thiết kế tối giản công nghiệp hàng hải Cảng Sài Gòn (Saigon Port Maritime Industrial Minimalism), bảng màu chuẩn Hải cảng (Cảng Xanh - Biển Sâu), quy tắc typography, ngữ nghĩa tiếng Việt chuẩn chuyên ngành vận hành cảng biển.

### Nguồn Thư mục `.agents`:
- **`ui-ux-pro-max`** (`.agents/skills/ui-ux-pro-max/SKILL.md`): Tiêu chuẩn trí tuệ UI/UX nâng cao, nguyên lý công thái học giao diện, kiểm soát chuyển động mượt mà, hỗ trợ WCAG 2.1 AA, quản lý trạng thái tương tác bàn phím.
- **`ui-styling`** (`.agents/skills/ui-styling/SKILL.md`): Thiết kế thành phần giao diện dễ tiếp cận, hệ thống token phân tầng, kỹ thuật styling SVG và lớp phủ bản đồ tương tác.
- **`design-system`** (`.agents/skills/design-system/SKILL.md`): Kiến trúc token 3 tầng (Primitive $\to$ Semantic $\to$ Component), thang đo khoảng cách và tỷ lệ thị giác.
- **`brand`** (`.agents/skills/brand/SKILL.md`): Giọng nói thương hiệu (Brand Voice), tính nhất quán nhận diện Cảng Sài Gòn.
- **`design`** (`.agents/skills/design/SKILL.md`): Nguyên tắc phân tầng Z-order, tương phản màu sắc và hiển thị đồ họa vector.
- **`slides`** & **`banner-design`**: Kỹ năng trình chiếu và biểu ngữ (không áp dụng trực tiếp cho module runtime map).

---

## 2. Kỹ năng Đã Áp dụng và Biện pháp Triển khai (Skills Applied)

| Kỹ năng Áp dụng | Nội dung Triển khai Cụ thể trong Giai đoạn 2 |
| :--- | :--- |
| **`saigon-port-ui`** | - Sử dụng bảng màu chuẩn Cảng Sài Gòn: Cáp điện dùng màu Hổ phách/Vàng cam (`#D97706` / `#F59E0B`), Nước dùng màu Xanh biển sâu/Lam ngọc (`#0284C7` / `#0EA5E9`), Nền bản đồ tối Neon (`#060d19`).<br/>- Toàn bộ nhãn ngữ nghĩa, thông báo trạng thái và tooltip sử dụng thuật ngữ tiếng Việt chuẩn vận hành cảng: *"Lưới 110kV EVN"*, *"Tủ phân phối tổng MDB-01"*, *"Điểm đấu nối nước WIN-01"*, *"Cụm van chia nước WJ-01"*, *"Trụ cấp nước ngọt tàu biển Berths 1-2"*, v.v. |
| **`ui-ux-pro-max`** | - Hoàn tất hỗ trợ chuẩn `prefers-reduced-motion: reduce`: lập tức chuyển đổi trong 0ms.<br/>- Đảm bảo tiêu chuẩn điều hướng bàn phím hoàn chỉnh: `tabIndex={0}`, `role="button"`, phím `Enter`/`Space`.<br/>- Loại trừ hoàn toàn hiện tượng Layout Thrashing trong hoạt họa rAF.<br/>- Ngừng toàn bộ chu trình xử lý ngầm khi mạng lưới ở trạng thái tĩnh (Zero Idle CPU/GPU). |
| **`ui-styling` & `design-system`** | - Thiết lập lớp vỏ viền trắng (white casing 4.8px/6.8px) bọc ngoài lõi màu để tách biệt trực giao rõ ràng các tuyến trên ảnh nền vệ tinh và các khối đa giác phân khu cảng.<br/>- Giữ vững thứ tự Z-order phân tầng: Nước ở dưới $\to$ Điện ở trên $\to$ Nút $\to$ Tooltip. |

---

## 3. Xung đột và Độ lệch (Conflicts & Deviations)

- **Xung đột giữa các chỉ dẫn**: **KHÔNG CÓ (NONE)**. Cả hai bộ hướng dẫn `.agent` và `.agents` đều thống nhất cao độ về việc ưu tiên độ rõ ràng kỹ thuật, tính dễ tiếp cận, giảm thiểu tải nhận thức và tối ưu hóa hiệu năng máy trạm.
- **Độ lệch so với yêu cầu**: **KHÔNG CÓ (NONE)**. Toàn bộ các bất biến tuyệt đối (Zero DB mutation, Zero geometry modification, Frozen B2 hash matching) được tuân thủ nghiêm ngặt 100%. Cả hai thư mục `.agent` và `.agents` không bị thay đổi bất kỳ ký tự nào.
