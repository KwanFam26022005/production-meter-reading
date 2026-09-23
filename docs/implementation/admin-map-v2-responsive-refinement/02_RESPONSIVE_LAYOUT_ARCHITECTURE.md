# 02 — Kiến trúc Bố cục Thích ứng (Responsive Layout Architecture)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Phân hệ**: Bản đồ Kỹ thuật V2 (Map V2)  
> **Kiến trúc sư**: Senior Frontend Architect & Interactive Map Engineer  

---

## 1. Chuỗi Phân cấp Bố cục (Layout Hierarchy)

Bố cục phân hệ Bản đồ V2 được xây dựng theo kiến trúc phân tầng container-aware khép kín, tránh hoàn toàn các thuộc tính chiều cao cứng (`fixed px`) hoặc cuộn trang vô ý:

```text
AdminShell (admin-portal-root: 100vh / overflow: hidden)
└── .admin-shell-layout (flex: 1 / display: flex)
    ├── .admin-sidebar (rail-mode: 80px fixed width, flex-shrink: 0)
    └── .admin-main-viewport.admin-main-viewport-map-v2 (flex: 1, min-width: 0, overflow: hidden)
        └── .map-v2-container (flex: 1, display: flex, flex-direction: column, overflow: hidden)
            ├── .map-v2-header (flex-shrink: 0, min-height: 56px, single-row layout)
            └── .map-v2-workspace-body (flex: 1, position: relative, min-height: 0, overflow: hidden)
                ├── .map-v2-canvas-wrapper (flex: 1, min-width: 0, min-height: 0)
                │   └── svg.map-v2-viewport (width: 100%, height: 100%)
                │       └── g (transform="translate(pan.x, pan.y) scale(zoom)")
                ├── .map-v2-operational-card (contextual positioning near active anchor)
                ├── .map-v2-floating-hud (bottom-right: zoom controls, reset view)
                └── .map-v2-inspector-panel (adaptive: mode-drawer on < 1380px, mode-docked on >= 1380px)
```

---

## 2. Ngưỡng Kích thước & Chiến lược Bố cục (Breakpoint Strategy)

Hệ thống sử dụng kích thước thực tế của vùng làm việc (Container Width) thay vì kích thước vật lý màn hình:

- **Ngưỡng chuyển đổi**: `COMPACT_WORKSPACE_THRESHOLD = 1380px`.
- **Đo lường**: Thực hiện bởi `ResizeObserver` gắn trực tiếp vào `.map-v2-container`.

### Chế độ Rộng (`layout-wide`, container width $\ge 1380\text{px}$):
- Header hiển thị đầy đủ trực tiếp trên 1 hàng: Metadata pill, segmented View Mode (`Fit toàn bộ` / `Tràn chiều rộng`), segmented Interaction Mode (`Vận hành` / `Kiểm tra`), segmented Tone Mode (`Chuẩn kỹ thuật` / `Neon số`), nút `Lớp hiển thị`, và nút hủy chọn.
- Inspector hiển thị dạng **Docked Side Panel** (`.mode-docked`) với bề rộng chuẩn 360px nằm song song với canvas.

### Chế độ Tinh gọn (`layout-compact`, container width $< 1380\text{px}$):
- Header thu gọn tiêu đề phụ, giữ thanh tiêu đề chính và badge chuẩn `Canonical`.
- Các nút tương tác quan trọng nhất vẫn hiển thị trực tiếp: Interaction Mode (`Vận hành` / `Kiểm tra`), Tone Mode (`Chuẩn kỹ thuật` / `Neon số`).
- Các tính năng thứ cấp được gom vào menu popover **"Tùy chọn"** (`.map-v2-options-popover`):
  - Chuyển đổi khung nhìn (*Fit toàn bộ* / *Tràn chiều rộng*).
  - Quản lý 6 lớp hiển thị bản đồ.
  - Thông số chuẩn hóa metadata (`1536×1024 px · 7 phân khu · 6 tuyến · 2 cổng`).
- Header được bảo đảm **100% không bị gãy dòng** (duy trì chiều cao chuẩn 56px trên mọi laptop 1280x720 và 1366x768).
- Inspector hiển thị dạng **Overlay Drawer** (`.mode-drawer`) nổi lên trên bề mặt bản đồ với backdrop mờ, **không làm co cụm kích thước canvas**, giữ nguyên 100% tỷ lệ zoom của bản đồ.
