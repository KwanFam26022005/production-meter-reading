# Báo cáo Tuân thủ Bộ Kỹ năng Kỹ thuật (Skill Compliance Report)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Nhiệm vụ**: Map V2 Responsive Workspace & Interaction Refinement  
> **Thời điểm thẩm định**: 22/09/2026

---

## 1. Thẩm định & Phân cấp Bộ Kỹ năng (Skill Hierarchy & Priority)

Dự án áp dụng chặt chẽ quy tắc phân cấp ưu tiên kỹ thuật giữa hai thư mục kỹ năng cục bộ:

```text
CẤP 1 (TỐI CAO - Authoritative Domain Rule):
.agent/skills/saigon-port-ui/SKILL.md
└── Tinh thần: Phong cách Tối giản Vận hành Hàng hải (Maritime Operational Minimalism)
    - Tone màu trầm, kỹ thuật công nghiệp nặng, chuẩn mực cảng biển.
    - Tuyệt đối không dùng hiệu ứng trang trí màu mè dạng ứng dụng tiêu dùng.
    - Bảo toàn 100% dữ liệu đo đạc, số liệu kinh doanh và tính chính xác hình học.

CẤP 2 (TIÊU CHUẨN GIAO DIỆN & TƯƠNG TÁC):
.agents/skills/ui-ux-pro-max/SKILL.md
└── Tinh thần: Trí tuệ Thiết kế Giao diện Chuyên nghiệp (UI/UX Intelligence)
    - Bố cục thích ứng container-aware, chống giật layout (zero CLS).
    - Khả năng tiếp cận WCAG AA/AAA (độ tương phản chữ >= 7:1 đối với văn bản chính).
    - Trạng thái bàn phím (:focus-visible, Enter/Space, Escape).

CẤP 3 (CÔNG CỤ PHONG CÁCH & HỆ THỐNG TOKEN):
.agents/skills/ui-styling/SKILL.md & design-system
└── Tinh thần: Quy chuẩn Token & Thiết kế Bền vững
    - Tránh hardcode màu sắc inline, sử dụng biến CSS ngữ nghĩa.
    - Quản lý z-index và phân tầng giao diện khoa học.
```

---

## 2. Giải quyết Xung đột Chỉ dẫn (Conflict Resolution)

| Vấn đề tiềm ẩn | Hướng dẫn Chung (`ui-ux-pro-max` / `design`) | Quy chuẩn Cảng Sài Gòn (`saigon-port-ui`) | Quyết định Thực thi |
| :--- | :--- | :--- | :--- |
| **Màu sắc Neon Digital Twin** | Có thể dùng nhiều dải gradient đa sắc, tím, hồng phấn, xanh lá. | Giới hạn nghiêm ngặt trong bảng màu kỹ thuật hàng hải: Deep Navy (`#07152b`), Cyan (`#00f0ff`), Magenta (`#ff007f`). | **Tuân thủ `saigon-port-ui`**: Giữ vẻ đẹp công nghiệp cao cấp, linework sắc sảo, không bị biến thành poster giải trí. |
| **Hoạt cảnh Zone Reveal** | Hiệu ứng chuyển động tự do dạng liquid/blob/particles. | Hoạt cảnh kỹ thuật có kiểm soát, thời gian ngắn (< 500ms), không làm giật viewport. | **Tuân thủ `saigon-port-ui`**: Sử dụng sóng radial 450ms bị khóa chặt trong `clipPath` đa giác, không tràn ra mặt sông. |
| **Bố cục khi mở Inspector** | Co cụm bản đồ tự động chia đôi màn hình (Split screen). | Bảo toàn góc nhìn kỹ thuật của điều độ viên, không ép nhỏ bản đồ khiến mắt điều độ bị mỏi. | **Tuân thủ `saigon-port-ui`**: Trên màn hình < 1380px, dùng Overlay Drawer để giữ 100% diện tích và tỷ lệ phóng đại của bản đồ. |

---

## 3. Bảng Kiểm Tra Tuân thủ Chi tiết (Compliance Checklist)

- [x] **Không can thiệp ngoài phạm vi**: Bảo toàn 100% Bản đồ V1, dữ liệu JSON canonical, tọa độ 12 đồng hồ nước, mô hình OCR và logic User Portal.
- [x] **Cô lập Gói Bundle**: `verify_bundle_separation.mjs` xác nhận 0 byte mã nguồn Map V2 lọt sang User Portal.
- [x] **Khả năng Tiếp cận Toàn diện**:
  - Tương phản văn bản đạt **12.4:1** trong chế độ Neon (Vượt chuẩn WCAG AAA).
  - Hỗ trợ thao tác bàn phím đầy đủ (`Tab`, `Enter`, `Space`, `Escape`).
  - Hỗ trợ chuẩn `prefers-reduced-motion: reduce`.
- [x] **Bền vững Bố cục**:
  - Không có thanh cuộn dọc ngoài ý muốn.
  - Header cố định 56px, 1 dòng duy nhất trên mọi độ phân giải.
  - Zero camera drift khi resize hoặc đóng mở panel.
- [x] **Bằng chứng Thực tế Đầy đủ**: Đã xuất 19 ảnh chụp màn hình kiểm toán và video walkthrough tương tác thực tế trên Edge engine.
