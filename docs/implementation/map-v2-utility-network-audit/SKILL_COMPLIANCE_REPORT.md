# Báo cáo Tuân thủ Kỹ năng (Skill Compliance Report)

## 1. Khám phá Kỹ năng (Skills Discovered)

Kiểm toán đã rà soát độc lập cả hai thư mục kỹ năng theo đúng chỉ thị bắt buộc:

### A. Thư mục `.agent/` (Nguồn Quy chuẩn Chuyên biệt Dự án Cảng Sài Gòn)
- **`saigon-port-ui`** (`.agent/skills/saigon-port-ui/SKILL.md`):
  - Hướng dẫn thiết kế giao diện tác nghiệp hiện trường cảng biển tối giản: *Maritime Operational Minimalism*.
  - Bộ token màu thương hiệu gốc chuẩn dresscode: `--sgp-corporate-navy` (`#003875`), `--sgp-corporate-yellow` (`#FCC959`), `--sgp-corporate-porcelain` (`#FCFCFC`), v.v.
  - Phân cấp thẩm quyền: 1. Hành vi Product/API hiện hữu $\rightarrow$ 2. Skill này $\rightarrow$ 3. `DESIGN_DNA.md` $\rightarrow$ 4. Accessibility/Mobile $\rightarrow$ 5. Generic Skills.
  - Quy tắc bất biến về luồng nghiệp vụ ghi chỉ số công tơ, không dùng giao diện viễn tưởng sci-fi.

### B. Thư mục `.agents/` (Nguồn Quy chuẩn Thiết kế & Hệ thống Mở rộng)
- **`ui-ux-pro-max`** (`.agents/skills/ui-ux-pro-max/SKILL.md`): Phân tích thiết kế, dữ liệu màu sắc, biểu đồ, tính tương thích responsive.
- **`design-system`** (`.agents/skills/design-system/SKILL.md`): Kiến trúc token 3 tầng, chuẩn quy cách thành phần.
- **`ui-styling`** (`.agents/skills/ui-styling/SKILL.md`): Triển khai giao diện Tailwind CSS và token.
- **`brand`** (`.agents/skills/brand/SKILL.md`): Tiếng nói thương hiệu và tính nhất quán visual.
- **`banner-design`**, **`design`**, **`slides`**: Các kỹ năng thiết kế đồ họa và trình diễn tài liệu.

---

## 2. Kỹ năng đã Áp dụng trong Đợt Kiểm toán (Skills Applied)

1. **`saigon-port-ui`**:
   - Áp dụng nguyên tắc tôn trọng dữ liệu thực tế và thuật ngữ vận hành cảng biển tiếng Việt: *Công tơ điện*, *Đồng hồ nước*, *Trạm biến áp*, *Tủ phân phối MDB/MSB*, *Cầu cảng*, *Kho CFS*, *Bãi Container (CY)*.
   - Tuân thủ quy định không đưa các yếu tố giả lập, giả tưởng (sci-fi / AI hud) vào báo cáo.
2. **`design-system` & `ui-ux-pro-max`**:
   - Áp dụng quy chuẩn cấu trúc tài liệu kiểm toán dữ liệu logic: phân tách rành mạch Primitive State, Derived Classifications (INFERRED) và Verification State.
   - Trình bày trực quan bằng biểu đồ Mermaid (Flowchart, DAG) không phụ thuộc vào framework giao diện.
3. **Kỹ năng Kỹ thuật Backend / SQLite / GIS**:
   - Mở cơ sở dữ liệu với URI Read-Only `file:...mode=ro`.
   - Phân tích đồ thị mạng lưới toán học (Weakly connected components, in/out degrees, cycle detection).
   - Đánh giá hình học không gian (Coordinate system aspect ratio distortion 2.332 vs 1.500).

---

## 3. Xung đột và Độ lệch (Conflicts & Deviations)

- **Xung đột phát hiện**: Không có xung đột giữa `.agent` và `.agents`. Nguyên tắc thẩm quyền của `saigon-port-ui` được giữ vị trí ưu tiên cao nhất cho toàn bộ quy ước dữ liệu và nhãn tác nghiệp.
- **Độ lệch thực thi**: Không có bất kỳ độ lệch nào so với chỉ thị an toàn.
- **Bảo toàn thư mục**: Cả hai thư mục `.agent` và `.agents` được giữ nguyên vẹn 100%, không bị sửa đổi hay ghi đè bất kỳ file nào.
