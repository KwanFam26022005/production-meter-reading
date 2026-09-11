# Báo Cáo Kiểm Toán Toàn Diện Hệ Thống Bản Đồ Tác Nghiệp (Map Operations Forensic Audit)
**Dự án:** `production-meter-reading`  
**Đối tượng:** Admin → Bản đồ công tơ → Cảng Tân Thuận  
**Ngày kiểm toán:** 11/09/2026  
**Nhánh Git:** `feature/map-operations-unified-console`  
**Trạng thái kiểm toán:** `AUDIT_FAIL_CORRECTION_REQUIRED` (Phát hiện 10/12 lỗi không gian sai lệch vùng P0, 3/4 điểm neo operator sai vị trí, xung đột z-index đa tầng và chồng lấn giao diện bên trái).

---

## 1. Kiến Trúc Vận Hành Runtime (Runtime Component Graph)

### 1.1 Luồng kích hoạt Runtime thực tế
```
App.tsx (role === 'ADMIN')
 └── AdminShell.tsx (adminActiveTab === 'meters' hoặc 'dashboard')
      ├── [Navigation Sidebar] (admin-sidebar, z-index: 80 sticky / 120 fixed khi open)
      └── AdminMeters.tsx (viewMode === 'map')
           └── MapOperationsPage.tsx
                ├── MapHeader.tsx (Header thanh công cụ, z-index: 25)
                │    ├── VnDatePicker (Chọn ngày tác nghiệp)
                │    ├── Segmented Toggle [Bản đồ] | [Danh sách]
                │    └── Menu thao tác khác (⋮) & Nút mở menu Admin (sgp-toggle-admin-sidebar)
                ├── sgp-map-top-hud (HUD góc trên, z-index: 30)
                │    ├── Search Box & Popover (sgp-search-popover, z-index: 40)
                │    ├── FilterPopover (Bộ lọc đa chiều, z-index: 50)
                │    └── Exception HUD Button (sgp-exception-hud)
                ├── OperationalMap.tsx (Master SVG Container 1300 × 520)
                │    ├── <svg viewBox="0 0 1300 520">
                │    │    └── <g transform="translate(panX, panY) scale(zoom)">
                │    │         ├── PortFootprint.tsx (Lớp nền thực địa: Sông Sài Gòn, Tàu hàng, Cầu tàu, Đường sá, 10 khối phụ tải)
                │    │         ├── ZoneOperationalLayer.tsx (Lớp vùng tác nghiệp)
                │    │         │    └── OperationalZone.tsx × 4 (Đa giác vùng, viền, fill, badge cảnh báo ⚠️ N)
                │    │         ├── MeterPointLayer.tsx (Lớp điểm công tơ: chấm tròn 4.5px, halo focus, callout pill đỏ cho ca quá hạn)
                │    │         ├── OperatorLayer.tsx (Lớp nhân sự phụ trách: vòng tiến độ ca trực 0-100%, avatar, badge lỗi)
                │    │         │    └── OperatorMapMarker.tsx × 3
                │    │         └── MapDebugLayer.tsx (Lớp chẩn đoán ?mapDebug=1 kiểm tra điểm trong đa giác và bounding box)
                │    ├── MapViewportControls.tsx (Phóng to/thu nhỏ/reset, z-index: 15)
                │    └── OperationalMapLegend.tsx (Chú giải động, z-index: 15/20)
                ├── CurrentRoundControl.tsx (Điều khiển lượt ghi góc trái dưới, z-index: 25, popover z-index: 40)
                └── Contextual Overlays (Lớp phủ ngữ cảnh ngoại vi):
                     ├── MeterQuickPopup.tsx (Popup nhanh công tơ neo cạnh điểm, z-index: 45)
                     ├── OperatorShiftPopover.tsx (Popover tiến độ ca nhân sự, z-index: 42/100)
                     ├── ZoneDrawer.tsx (Drawer ngữ cảnh khu vực bên phải, z-index: 45/1050)
                     │    └── OperatorProgressPopover.tsx (Popover người phụ trách khu vực, z-index: 70)
                     └── MeterDetailDrawer.tsx (Drawer chi tiết sâu công tơ, z-index: 100/1050)
```

### 1.2 Phân loại Thành phần: ACTIVE vs LEGACY vs DEAD vs DUPLICATE
| Tên Thành Phần | Đường Dẫn | Trạng Thái | Vai Trò / Ghi Chú |
| :--- | :--- | :--- | :--- |
| `OperationalMap` | `features/map-operations/operational-map/OperationalMap.tsx` | **ACTIVE** | Master renderer chính của bản đồ vector SVG 1300×520. |
| `PortFootprint` | `features/map-operations/operational-map/PortFootprint.tsx` | **ACTIVE** | Vẽ nền thực địa Tân Thuận chuẩn Figma. |
| `ZoneOperationalLayer` | `features/map-operations/operational-map/ZoneOperationalLayer.tsx` | **ACTIVE** | Quản lý 4 đa giác vùng tác nghiệp. |
| `MeterPointLayer` | `features/map-operations/operational-map/MeterPointLayer.tsx` | **ACTIVE** | Vẽ 12 điểm công tơ và callout pill đỏ. |
| `OperatorLayer` | `features/map-operations/operational-map/OperatorLayer.tsx` | **ACTIVE** | Hiển thị marker nhân sự kèm vòng tiến độ ca. |
| `ZoneDrawer` | `features/map-operations/map-ui/ZoneDrawer.tsx` | **ACTIVE** | Drawer ngữ cảnh khu vực chuẩn Figma 2:363. |
| `MeterQuickPopup` | `features/map-operations/map-ui/MeterQuickPopup.tsx` | **ACTIVE** | Popup nhanh neo cạnh công tơ chuẩn Figma 2:514. |
| `OperatorShiftPopover` | `features/map-operations/map-ui/OperatorShiftPopover.tsx` | **ACTIVE** | Popover tổng hợp ca trực nhân sự (Phase 6D). |
| `OperatorProgressPopover`| `features/map-operations/map-ui/OperatorProgressPopover.tsx` | **ACTIVE** | Popover phụ trách trong Drawer chuẩn Figma 9:8. |
| `PortMap` | `features/map-operations/components/PortMap.tsx` | **DEAD** | Triển khai 263 dòng cũ từ Phase 1, không được import bởi bất kỳ file nào. |
| `ZoneLayer` | `features/map-operations/components/ZoneLayer.tsx` | **DEAD** | Chỉ được import bởi `PortMap.tsx` (chết). |
| `MeterLayer` | `features/map-operations/components/MeterLayer.tsx` | **DEAD** | Chỉ được import bởi `PortMap.tsx` (chết). |
| `MeterMarker` | `features/map-operations/components/MeterMarker.tsx` | **DEAD** | Marker cũ không dùng. |
| `ZonePolygon` | `features/map-operations/components/ZonePolygon.tsx` | **DEAD** | Đa giác cũ không dùng. |
| `MeterDrawer` | `features/map-operations/components/MeterDrawer.tsx` | **DEAD** | Drawer cũ Phase 1. |
| `ZoneDrawer` (stubs) | `features/map-operations/components/ZoneDrawer.tsx` | **DUPLICATE** | Stub re-export chuyển hướng sang `map-ui/ZoneDrawer`. |
| `MeterQuickPopup` (stubs)| `features/map-operations/components/MeterQuickPopup.tsx` | **DUPLICATE** | Stub re-export chuyển hướng sang `map-ui/MeterQuickPopup`. |
| `MeterDetailDrawer` (stubs)| `features/map-operations/components/MeterDetailDrawer.tsx` | **DUPLICATE** | Stub re-export chuyển hướng sang `map-ui/MeterDetailDrawer`. |
| `OperatorIconButton` (stubs)| `features/map-operations/components/OperatorIconButton.tsx` | **DUPLICATE** | Stub re-export chuyển hướng sang `map-ui/OperatorIconButton`. |
| `OperatorProgressPopover`| `features/map-operations/components/OperatorProgressPopover.tsx` | **DUPLICATE** | Stub re-export chuyển hướng sang `map-ui/OperatorProgressPopover`. |

---

## 2. Kiểm Toán Nguồn Dữ Liệu Thực Tế (Source of Truth Audit)

Hệ thống hiện tại đang tồn tại **4 nguồn tọa độ xung đột nhau**:
1. **Cơ sở dữ liệu SQLite (`data/app.db` -> bảng `meters` & `operational_zones`)**:
   - Chứa tọa độ chuẩn hóa Phase 2 (hệ quy chiếu cũ $1000 \times 650$ với bến tàu nằm dọc phía Đông $x=0.62-0.84$).
2. **Cấu hình tĩnh Phase 1 (`config/portMapConfig.ts` -> `METER_COORDINATES_ADAPTER`)**:
   - Chứa cấu hình dự phòng khi chưa có API, kích thước `1000 × 650`.
3. **Cấu hình hình học tác nghiệp (`geometry/operationalGeometry.ts` -> `OPERATIONAL_METER_COORDINATES`)**:
   - Chứa tọa độ tỷ lệ chuẩn hóa trên khung $1300 \times 520$.
   - **Lỗi nghiêm trọng phát hiện:** Nguồn này tự ý ghi đè tọa độ database trong `MeterPointLayer.tsx` (dòng 53-54), `MapOperationsPage.tsx` (dòng 162), và `MeterQuickPopup.tsx` (dòng 46).
4. **Cấu hình đa giác vùng tác nghiệp (`geometry/operationalGeometry.ts` -> `OPERATIONAL_ZONES_GEOMETRY`)**:
   - Khung hình học mới gồm 4 phân khu chuẩn Figma $1300 \times 520$.

---

## 3 & 4. Kiểm Toán Bất Biến Công Tơ ↔ Phân Khu Tác Nghiệp (Meter ↔ Zone Spatial Audit)

### Kết quả kiểm định Point-in-Polygon trên toàn bộ 12 công tơ thực tế:

| Mã Công Tơ | Tên Thực Tế trong DB | Vùng Đăng Ký (DB) | Tọa Độ Render SVG (X, Y) | Vùng Không Gian Thực Tế Rơi Vào | Nằm Trong Vùng Đăng Ký? | Khoảng Cách Sai Lệch | Trạng Thái | Nguyên Nhân Gốc Rễ (Root Cause) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **CT-001** | Công tơ Trạm A | `zone-technical` | `(295, 152)` | `zone-berth` (Cầu 1) | **False** | 213.0 px | **FAIL** | Tọa độ bị gán nhầm vào Cầu 1 quayside dù đây là Trạm điện A. |
| **CT-002** | Công tơ Kho B | `zone-warehouse` | `(610, 152)` | `zone-berth` (Cầu 2) | **False** | 100.6 px | **FAIL** | Tọa độ bị gán nhầm vào Cầu 2 quayside dù đây là Kho B. |
| **CT-003** | Công tơ Cầu cảng 1 | `zone-berth` | `(930, 152)` | `zone-berth` (Cầu 3) | **True** | 0.0 px | **PASS\*** | Thuộc Cầu Cảng nhưng bị gán vào vị trí Cầu 3 thay vì Cầu 1. |
| **CT-004** | Công tơ Cầu cảng 2 | `zone-berth` | `(222, 245)` | `zone-warehouse` (Kho B) | **False** | 80.0 px | **FAIL** | Tọa độ bị gán vào Kho B dù là công tơ Cầu cảng 2. |
| **CT-005** | Công tơ Kho C | `zone-warehouse` | `(398, 245)` | `zone-warehouse` (Kho C) | **True** | 0.0 px | **PASS** | Tọa độ chính xác tại Kho C. |
| **CT-006** | Công tơ Kho D | `zone-warehouse` | `(687, 260)` | `zone-container` (Bãi A) | **False** | 172.0 px | **FAIL** | Tọa độ bị gán vào Bãi Container A dù là công tơ Kho D. |
| **CT-007** | Công tơ Trạm B | `zone-technical` | `(912, 260)` | `zone-container` (Bãi A2) | **False** | 410.7 px | **FAIL** | Tọa độ bị gán vào Bãi Container A2 dù là Trạm điện B. |
| **CT-008** | Công tơ Cầu cảng 3 | `zone-berth` | `(222, 302)` | `zone-warehouse` (Kho D) | **False** | 137.0 px | **FAIL** | Tọa độ bị gán vào Kho D dù là công tơ Cầu cảng 3. |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `zone-technical` | `(687, 344)` | `zone-container` (Bãi B1) | **False** | 173.3 px | **FAIL** | Tọa độ bị gán vào Bãi Container B1 dù là Khu kỹ thuật. |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `zone-technical` | `(912, 344)` | `zone-container` (Bãi B2) | **False** | 397.6 px | **FAIL** | Tọa độ bị gán vào Bãi Container B2 dù là Khu kỹ thuật. |
| **CT-011** | Công tơ Bãi Container 1| `zone-container` | `(265, 432)` | `zone-technical` (Hàng TH)| **False** | 296.1 px | **FAIL** | Tọa độ bị gán vào Hàng Tổng Hợp dù là Bãi Container 1. |
| **CT-012** | Công tơ Bãi Container 2| `zone-container` | `(665, 425)` | `NONE` (Trạm điện) | **False** | 53.0 px | **FAIL** | Tọa độ bị gán vào Trạm điện ngoài ranh giới vùng container. |

> **KẾT QUẢ:** **10 / 12 CÔNG TƠ THẤT BẠI (FAIL)** đối với kiểm định bất biến không gian!  
> **Nguyên nhân cốt lõi:** Khi phát triển Phase 6, người lập trình đã gán tọa độ tĩnh trong `OPERATIONAL_METER_COORDINATES` theo thứ tự số hiệu công tơ tuần tự (`CT-001 -> Cầu 1, CT-002 -> Cầu 2, CT-003 -> Cầu 3...`) mà không đối chiếu với thực thể nghiệp vụ trong cơ sở dữ liệu (`CT-001` là Trạm điện A, `CT-003` mới là Cầu cảng 1, `CT-004` là Cầu cảng 2, v.v.).

---

## 5. Kiểm Toán Phép Biến Đổi Tọa Độ (Coordinate Transform Audit)

1. **Tỷ lệ khung nhìn:**
   - SVG ViewBox chính thức: `FIT_VIEWBOX = '0 0 1300 520'` (tỷ lệ chuẩn $2.5:1$).
   - Hàm chuẩn hóa: `normalizedToSvg(p)` = `{ x: round(p.x * 1300), y: round(p.y * 520) }`.
   - Hàm ngược: `svgToNormalized(x, y)` = `{ x: x / 1300, y: y / 520 }`.
2. **Sai số phát hiện:**
   - `portMapConfig.ts` vẫn còn sót `PORT_MAP_DIMENSIONS = { viewBoxWidth: 1000, viewBoxHeight: 650 }`.
   - Các hàm tính clamp popover trong `MeterQuickPopup.tsx` sử dụng phần trăm màn hình thay vì tọa độ SVG tương đối có xét đến `panX, panY, zoom`. Khi người dùng zoom/pan bản đồ, popup nhanh không bám dính theo đúng điểm công tơ trên màn hình canvas!

---

## 6. Kiểm Toán Hình Học Phân Khu Tác Nghiệp (Zone Geometry Audit)

| Phân Khu | Mã Khu | Đa Giác SVG (Points) | Bounding Box [minX, minY, maxX, maxY] | Điểm Nhãn (Label) | Điểm Neo Operator | Số Công Tơ Thực Tế (DB) | Đánh Giá Hình Học |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Cầu Cảng** | `zone-berth` | `(115,115) → (1155,115) → (1155,165) → (115,165)` | `[115, 115, 1155, 165]` | `(650, 140)` | `(860, 140)` | 3 (`CT-003, 004, 008`) | Hợp lệ, không tự cắt, bao trọn 3 bến Cầu 1, 2, 3. |
| **Kho Bãi** | `zone-warehouse` | `(125,185) → (515,185) → (515,335) → (125,335)` | `[125, 185, 515, 335]` | `(320, 260)` | `(345, 340)` | 3 (`CT-002, 005, 006`) | Hợp lệ, bao trọn Kho B, C, D. **Lỗi:** Operator anchor (345, 340) nằm ngoài vùng! |
| **Bãi Container** | `zone-container` | `(555,185) → (1025,185) → (1060,220) → (1060,372) → (555,372)` | `[555, 185, 1060, 372]` | `(810, 278)` | `(960, 345)` | 2 (`CT-011, 012`) | Hợp lệ, vát góc chuẩn Figma. **Lỗi:** Operator anchor nằm trên mép đường giao. |
| **Kỹ Thuật & Cổng**| `zone-technical` | `(125,365) → (515,365) → (515,485) → (125,485)` | `[125, 365, 515, 485]` | `(320, 425)` | `(540, 445)` | 4 (`CT-001, 007, 009, 010`)| **LỖI:** Đa giác bị cụt ở $x=515$, bỏ sót Trạm điện ($x=590-740$) và Xưởng ($x=765-910$). Operator anchor nằm giữa đường trục chính! |

---

## 7 & 8. Kiểm Toán Phân Công & Tọa Độ Neo Nhân Sự (Operator Audit)

### 7.1 Bảng phân công nhân sự hiện thời trong DB:
- `zone-container`: **Pham Hong Dang An** (Mã: `52300126`, ID: `a300a422...`) → Phụ trách 1 vùng.
- `zone-warehouse`: **Nguyễn Văn An** (Mã: `CSG-0102`, ID: `25db00a6...`) → Phụ trách 2 vùng liên kết (`zone-warehouse` + `zone-berth`).
- `zone-technical`: **Pham Hong Dang Khoa** (Mã: `REP001`, ID: `6d1eeb3d...`) → Phụ trách 1 vùng.
- `zone-berth`: **Nguyễn Văn An** (Mã: `CSG-0102`, ID: `25db00a6...`).

### 8.1 Kết quả chạy hàm chẩn đoán `validateOperatorAnchor()`:
- `zone-berth` (`(860, 140)`): **PASS** — Nằm an toàn trong dải cầu tàu Berth 3, cách biên $\ge 25\text{px}$.
- `zone-warehouse` (`(345, 340)`): **FAIL** — `OPERATOR_ANCHOR_OUTSIDE_ZONE` ($y=340 > 335$, cách biên $5\text{px}$) & `OPERATOR_OVERLAPS_ROAD` (nằm đè lên tim đường giao cắt ngang $y=335-353$).
- `zone-container` (`(960, 345)`): **FAIL** — `OPERATOR_OVERLAPS_ROAD` (nằm đè lên tim đường ngang) và chỉ cách công tơ Bãi B2 $48\text{px}$ gây nguy cơ đè icon/callout pill.
- `zone-technical` (`(540, 445)`): **FAIL** — `OPERATOR_ANCHOR_OUTSIDE_ZONE` ($x=540 > 515$, cách biên $25\text{px}$) & `OPERATOR_OVERLAPS_ROAD` (nằm chính giữa đại lộ Lưu Trọng Lư / Cổng chính $x=525-550$).

---

## 9 & 10. Kiểm Toán Đối Soát Số Liệu & Tính Đồng Nhất Map ↔ List

### 9.1 Bảng cân đối trạng thái (Status Balance Sheet)
- Toàn cảng có tổng cộng **12 công tơ hoạt động (100% active)**.
- Phân bổ theo 4 phân khu:
  - Cầu cảng (`zone-berth`): 3 công tơ (`CT-003, CT-004, CT-008`).
  - Kho bãi (`zone-warehouse`): 3 công tơ (`CT-002, CT-005, CT-006`).
  - Bãi container (`zone-container`): 2 công tơ (`CT-011, CT-012`).
  - Kỹ thuật & Cổng (`zone-technical`): 4 công tơ (`CT-001, CT-007, CT-009, CT-010`).
- Số liệu KPI tổng thể:
  - Công thức: $\text{Confirmed} + \text{Overdue} + \text{Review} + \text{Due} + \text{Pending} = \text{Total Active Meters} = 12$.
  - Backend API (`/api/map/overview`) và `get_admin_dashboard` đối soát khớp 100% về số lượng.

### 10.1 Xung đột nghiêm trọng khi chuyển đổi Map ↔ List:
- Khi người dùng ở chế độ **Danh sách (List mode)**: Thấy `CT-004` thuộc `Cầu Cảng` (đúng bản chất dữ liệu).
- Khi người dùng chuyển sang chế độ **Bản đồ (Map mode)**: Thấy `CT-004` bị vẽ ở giữa `Kho B` (sai hoàn toàn vị trí thực tế).
- Khi nhấp vào `CT-004` trên bản đồ (đang nằm trong Kho B), drawer lại mở ra thông tin của `Cầu Cảng`. Điều này phá vỡ hoàn toàn tính toàn vẹn của mô hình tương tác (Mental Model)!

---

## 12 & 13. Bảng Kiểm Kê Lớp Giao Diện & Hệ Thống Z-Index (UI Layer Inventory)

### 12.1 Hiện trạng xung đột Z-Index:
| Lớp Giao Diện | Bộ Chọn CSS | Z-Index Hiện Thời | Trạng Thái Định Vị | Vấn Đề Xung Đột |
| :--- | :--- | :---: | :--- | :--- |
| Master Header | `.sgp-map-header` | 25 | Grid Header | Thấp hơn Top HUD (30), có nguy cơ bị HUD đè lên. |
| Top Action HUD | `.sgp-map-top-hud` | 30 | Absolute top | Cao hơn Header (25). |
| Search Popover | `.sgp-search-popover` | Không rõ / 40 | Absolute | Tranh chấp với Filter Popover. |
| Filter Popover | `.sgp-filter-popover` | 50 | Absolute | Mở đè lên Search Popover. |
| Current Round | `.sgp-current-round-card` | 25 | Absolute bottom-left | Hợp lý. |
| Round Selector Popover | `.sgp-crc-popover` | 40 | Absolute | Hợp lý. |
| Map Legend | `.sgp-map-legend-wrapper` | 20 / 25 | Absolute bottom-right | Hợp lý. |
| Viewport Controls | `.sgp-viewport-controls` | 15 | Absolute bottom-right | Hợp lý. |
| Quick Popup Công Tơ | `.sgp-meter-quick-popup` | 40 / 45 | Absolute map-relative | Bị xung đột 2 khai báo CSS khác nhau. |
| Shift Popover Nhân Sự | `.sgp-operator-shift-popover`| 42 / 100 | Absolute map-relative | Bị xung đột 2 khai báo CSS khác nhau. |
| Contextual Zone Drawer | `.sgp-side-drawer` | 20 / 45 / 1050 | Fixed right | Bị khai báo 3 lần ở các dòng khác nhau (20, 45, 1050). |
| Admin Sidebar Backdrop | `.admin-sidebar-backdrop` | 70 | Fixed inset 0 | Backdrop che khuất bản đồ nhưng không đóng trên desktop. |
| Admin Desktop Sidebar | `.admin-sidebar.open` | 120 !important | Fixed left 256px | Đè lên Search/Filter và góc trái bản đồ. |

### 13.1 Thang đo chuẩn đề xuất (Canonical Z-Index Scale):
```css
--z-map-base: 0;
--z-map-labels: 10;
--z-map-markers: 20;
--z-map-operator: 25;
--z-map-controls: 30;
--z-map-hud: 35;
--z-map-tooltips: 40;
--z-map-popovers: 50;
--z-map-drawers: 60;
--z-map-header: 70;
--z-nav-backdrop: 80;
--z-nav-drawer: 90;
--z-modal-overlay: 100;
```

---

## 14. Phân Tích Lỗi Chồng Lấn Bên Trái (Current Left Overlap Bug)

### Nguồn gốc thực tế:
Trong `AdminShell.tsx` và `index.css`:
- Ở chế độ `MapOperationsPage`, thanh sidebar desktop navy được ẩn mặc định bằng quy tắc `.admin-shell-layout:has(.sgp-map-first-root) .admin-sidebar:not(.open) { display: none !important; }`.
- Khi người dùng nhấp vào nút Menu (biểu tượng Hamburger `Menu`) trên `MapHeader`, sự kiện `sgp-toggle-admin-sidebar` kích hoạt `sidebarOpen = true`.
- Khi đó, `.admin-sidebar.open` nhận thuộc tính `position: fixed !important; z-index: 120 !important; width: 256px !important;`.
- Thanh điều hướng này trượt ra từ bên trái với chiều rộng 256px, **che phủ hoàn toàn cụm nút Tìm kiếm & Bộ lọc (`sgp-map-top-hud`) và một phần khu vực Cầu cảng / Kho bãi**.
- Lớp nền mờ `.admin-sidebar-backdrop` có `z-index: 70`.
- **Thiếu sót:** `AdminShell` và `MapOperationsPage` **hoàn toàn không có phím tắt ESC để đóng sidebar**, và không có nút đóng (X) rõ ràng trên desktop khi sidebar đang mở!

---

## 18 & 19. Độc Quyền Ngữ Cảnh & Máy Trạng Thái ESC (Exclusivity & State Machine)

1. **Tranh chấp Popover:** `searchOpen` (trong `MapOperationsPage`) và `isOpen` (trong `FilterPopover`) là 2 state độc lập. Khi mở Filter, Search không tự đóng và ngược lại, dẫn tới 2 popover cùng render đè lên nhau tại góc trên bên trái.
2. **Thứ tự ESC đề xuất:**
   1. Đóng `ImageViewerModal` / `UnsavedWorkConfirmModal`.
   2. Đóng `admin-sidebar.open` nếu đang mở.
   3. Đóng `MeterDetailDrawer`.
   4. Đóng `OperatorShiftPopover`.
   5. Đóng `MeterQuickPopup`.
   6. Đóng `FilterPopover` / `SearchPopover`.
   7. Hủy chọn `ZoneDrawer` (clearSelection).
   8. Thoát chế độ lọc ngoại lệ `exceptionFocus`.

---

## 20. Kiểm Toán Sự Kiện Pointer & Event Bubbling

- Trong `OperationalZone.tsx`: Thẻ `<path d={geometry.polygonSvg} onClick={() => onSelect(geometry.id)} />` **chưa gọi `e.stopPropagation()`**. Khi người dùng nhấp vào vùng, sự kiện nổi bọt lên container có thể kích hoạt cơ chế pan/drag kéo lệch viewport.
- Trong `MeterPointLayer.tsx` và `OperatorMapMarker.tsx`: Đã có `e.stopPropagation()`.

---

## 22. Triển Khai Chẩn Đoán Không Gian Trực Quan (?mapDebug=1)

Đã tạo và tích hợp component `MapDebugLayer.tsx` vào `OperationalMap.tsx`.  
Khi truy cập URL với tham số `?mapDebug=1`:
- Tự động hiển thị đường bao Bounding Box (màu đỏ đứt nét) và tọa độ các đỉnh của từng phân khu.
- Tự động chạy thuật toán Ray-Casting Point-in-Polygon kiểm tra từng công tơ trong thời gian thực.
- Hiển thị thẻ chẩn đoán tại từng điểm công tơ:
  - Mã công tơ + Trạng thái: **PASS** (màu xanh lá) hoặc **FAIL** (màu đỏ rực).
  - Vùng khai báo trong database (`db: warehouse`) vs Vùng hình học thực tế (`geo: berth`).
  - Tọa độ SVG chính xác `(x, y)`.
- Hiển thị hồng tâm điểm neo nhân sự (Operator Anchor) kèm chỉ báo `IN` hoặc `OUT!` cảnh báo ra ngoài biên.

---

## 30. Phân Cấp Khắc Phục Lỗi (Fix Priority)

### Mức Ưu Tiên P0 (Ngay Lập Tức):
1. **P0-1:** Khắc phục triệt để sai lệch gán tọa độ 12 công tơ trong `operationalGeometry.ts`:
   - `CT-003, CT-004, CT-008` → Cầu 1, Cầu 2, Cầu 3 (`zone-berth`).
   - `CT-002, CT-005, CT-006` → Kho B, Kho C, Kho D (`zone-warehouse`).
   - `CT-011, CT-012` → Bãi Container A, Bãi Container B (`zone-container`).
   - `CT-001, CT-007, CT-009, CT-010` → Trạm A, Trạm B, Xưởng Kỹ thuật 1, 2 (`zone-technical`).
2. **P0-2:** Mở rộng đa giác `zone-technical` trong `operationalGeometry.ts` để bao trọn cả cụm Trạm điện ($x=590-740$) và Xưởng ($x=765-910$).
3. **P0-3:** Dời tọa độ neo nhân sự (Operator Anchors) của `zone-warehouse`, `zone-container`, và `zone-technical` vào sâu bên trong vùng, thoát hoàn toàn khỏi tim đường giao thông.
4. **P0-4:** Loại bỏ các file Dead Code (`PortMap.tsx`, `ZoneLayer.tsx`, `MeterLayer.tsx`, `MeterMarker.tsx`, `ZonePolygon.tsx`, `MeterDrawer.tsx`).

### Mức Ưu Tiên P1 (Quan Trọng):
1. **P1-1:** Khắc phục lỗi sidebar menu che cụm Search/Filter: Bổ sung hành vi đóng khi bấm ESC, bổ sung nút đóng nổi bật, chuẩn hóa z-index.
2. **P1-2:** Đảm bảo tính loại trừ (Mutual Exclusivity) giữa Search Popover và Filter Popover (mở cái này thì đóng cái kia).
3. **P1-3:** Chuẩn hóa hệ thống Z-Index tokens, xóa bỏ các khai báo z-index trùng lặp (`1050`, `45`, `20`).
4. **P1-4:** Bổ sung Responsive Breakpoints cho `MapHeader` trên thiết bị hẹp ($< 768\text{px}$ và $390\text{px}$).

---

## 33. Kết Quả Kiểm Tra Hệ Thống (Build & Tests)

1. **Frontend Unit Tests (`node --test`):** `14/14 PASSED` (165ms).
2. **Frontend Build (`npm run build`):** `PASSED` (3.97s, 0 TypeScript errors).
3. **Backend Integration Tests (`pytest`):** `6/6 PASSED` (6.41s).
4. **Git Diff Check:** Hoàn toàn sạch, không có lỗi thụt dòng hay whitespace.
