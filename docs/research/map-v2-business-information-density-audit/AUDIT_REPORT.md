# Map V2 Business & Information Density Audit — AUDIT REPORT

**Thread:** 5 — Map V2 Business & Information Density Audit  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Branch:** `feature/v16e-network-map-overlay-r1` @ `5d37047`  
**Audit Date:** 2026-09-23  
**Mode:** READ-ONLY — Zero source modifications  

---

## Skill Compliance

| Skill | Status | File / Section Cited | Concrete Application & Evidence |
| :--- | :---: | :--- | :--- |
| `saigon-port-ui` | `READ` / `APPLIED` | Scoped Operating Profiles — Operations & Map V2 | Applied Map V2 mode guidelines, toolbar structure analysis, Maritime Operational Minimalism principles |
| `banner-design` | `NOT_APPLICABLE` | — | Non-engineering marketing skill intentionally skipped |
| `brand` | `NOT_APPLICABLE` | — | Non-engineering marketing skill intentionally skipped |
| `design` | `NOT_APPLICABLE` | — | Creative agency skill intentionally skipped |
| `slides` | `NOT_APPLICABLE` | — | Presentation skill intentionally skipped |

---

## FINAL REPORT — 16 Direct Answers

### 1. Map V2 hiện đang phục vụ tác vụ nghiệp vụ nào?

Map V2 hiện tại phục vụ **ba tác vụ chính**, tất cả đều dựa trên dữ liệu tĩnh/demo:

| Tác vụ | Trạng thái dữ liệu | Evidence |
| :--- | :--- | :--- |
| **Xem tổng quan phân khu cảng** — 7 khu vực với icon, nhãn và đường biên | STATIC_JSON | `zoneAnchors.ts`, `tan_thuan_1_zones_edited.json` |
| **Trình diễn nhân viên phân khu** — 4 marker demo di chuyển trong polygon | DEMO_ONLY | `employeeDataAdapter.ts#L36` |
| **Mô phỏng mạng kỹ thuật điện/nước** — Topology demo với đường dẫn và node | SIMULATED | `utilityDemoLayout.ts` |

**Không có dữ liệu vận hành thực** nào từ backend API được hiển thị trên Map V2. Tiến độ ghi chỉ số, trạng thái công tơ, phân công thực tế, chấm công — tất cả đều vắng mặt.

---

### 2. Toolbar đang có những control nào và chúng hoạt động ra sao?

**Tổng: ~32 control tương tác** được phân bổ ở 4 vùng:

| Vùng | Số control | Chi tiết |
| :--- | :--- | :--- |
| **Header toolbar** | 15 | View mode (2), Work mode (2), Theme (2), Utility (4), Demo badge (1), Layers (1), Options/Deselect (2), CANONICAL badge + metadata |
| **Layer popover** | 7 | 7 layer toggles (Nền, Phân khu, Kho, Đường, Cổng, Hotspot, Nhân viên) |
| **HUD overlay** | 5 | Zoom in/out, Reset, Play/Pause, Zoom % |
| **Inspector** | 4 | Close card, Inspect technical, Close panel, Copy |

**Tất cả đều READ-ONLY** — Map V2 không có khả năng ghi/sửa dữ liệu backend.

> Chi tiết đầy đủ: [`03_CURRENT_TOOLBAR_INVENTORY.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/03_CURRENT_TOOLBAR_INVENTORY.md)

---

### 3. Control nào nên giữ thường trực?

| Control | Lý do giữ |
| :--- | :--- |
| **Vận hành / Kiểm tra** | Phân tách chế độ làm việc cốt lõi |
| **Lớp hiển thị** | Điều khiển trực quan chính |
| **Zoom controls (HUD)** | Tương tác bản đồ thiết yếu |
| **Play/Pause** (khi employee layer ON) | Yêu cầu tiếp cận (accessibility) |
| **Demo disclosure badge** | Bắt buộc về tính trung thực dữ liệu |
| **Bỏ chọn** (khi có entity selected) | Cần thiết cho workflow deselection |

---

### 4. Control nào nên hiện theo mode hoặc gom menu?

| Hành động | Controls |
| :--- | :--- |
| **Gom vào Tùy chọn / Settings** | Chuẩn kỹ thuật / Neon số, CANONICAL badge, Metadata (1536×1024, 7 phân khu...) |
| **Gom vào Tùy chọn hoặc chỉ hiện ở Technical mode** | Tắt lưới / Điện / Nước / Cả hai |
| **Giữ trong Layer manager** | 7 layer toggles |
| **Chỉ hiện khi entity selected** | Bỏ chọn, Inspector close/copy, Xem chi tiết kỹ thuật |
| **Cần phân quyền Technical/Admin** | Kiểm tra mode, Coordinate inspection, Copy geometry |

> Chi tiết hai phương án: [`04_TOOLBAR_OPTIONS_AND_DECISIONS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/04_TOOLBAR_OPTIONS_AND_DECISIONS.md)

---

### 5. Thông tin nghiệp vụ nào đang thiếu trên overview?

| Thiếu | Mức ưu tiên | Readiness |
| :--- | :--- | :--- |
| **Ngữ cảnh ngày/lượt ghi** — Người dùng không biết đang xem kỳ nào | Critical | NEEDS_BACKEND_DATA |
| **Tiến độ theo khu vực** — Không có badge hoàn thành trên zone | Critical | NEEDS_BACKEND_DATA |
| **Tín hiệu ngoại lệ** — Khu/công tơ có vấn đề không được đánh dấu | High | NEEDS_BACKEND_DATA |
| **Tìm kiếm** — Không tìm được khu vực hoặc công tơ cụ thể | Medium | NEEDS_FRONTEND_INTEGRATION |
| **Thời điểm cập nhật** — Không rõ dữ liệu cũ bao lâu | Medium | NEEDS_BACKEND_DATA |
| **Tổng quan toàn cảng** — Số liệu tóm tắt toàn port | Medium | NEEDS_BACKEND_DATA |

---

### 6. Hover nhân viên nên hiển thị chính xác các trường nào?

**Hiện tại (DEMO):**
- Mã + Tên (NV001 — Nguyễn Văn Hải)
- Phân khu (Khu cảng sà lan)
- Cảnh báo GPS disclosure
- Hướng dẫn click

**Đề xuất (khi có dữ liệu thực):**

| Trường | Nguồn | Điều kiện |
| :--- | :--- | :--- |
| Mã + Tên nhân viên | ZoneAssignment → User | Luôn hiện |
| Khu phụ trách | ZoneAssignment → Zone | Luôn hiện |
| Loại phân công | ZoneAssignment.assignment_role | Luôn hiện |
| Ca đã xác minh | WorkSchedule (nếu có) | Chỉ khi xác minh được |
| Chấm công | AttendanceEvent (nếu có) | Chỉ khi xác minh được |
| Disclosure text | Giữ cho đến khi dùng GPS thực | Luôn hiện khi demo |

**KHÔNG hiển thị ở hover:** Tiến độ cá nhân, lịch sử ghi, hành động.

---

### 7. Inspector nhân viên nên hiển thị gì?

| Phần | Nội dung | Nguồn |
| :--- | :--- | :--- |
| **Nhận diện** | Mã nhân viên, Họ tên, Avatar | User model |
| **Phân công** | Khu vực phụ trách, Loại phân công, Thời gian hiệu lực | ZoneAssignment |
| **Ca trực** (khi xác minh) | Mã ca, Thời gian | WorkSchedule |
| **Chấm công** (khi xác minh) | Trạng thái check-in/out, Thời gian | AttendanceEvent |
| **Tiến độ khu vực** | Tỷ lệ hoàn thành **khu vực**, không cá nhân | Zone aggregate |
| **Hành động** | Xem trong Phân ca, Xem trong Báo cáo | Deep links |
| **Cảnh báo** | Disclosure nếu demo, Disclaimer nếu animation | Constant |

**KHÔNG hiển thị:** Tiến độ cá nhân (chưa có mẫu số), GPS (không có), Zone ID kỹ thuật (ẩn khỏi operator).

---

### 8. Hover/inspector phân khu nên hiển thị gì?

**Hover (L2):**

| Trường | Nguồn | Readiness |
| :--- | :--- | :--- |
| Tên khu vực | zoneAnchors.ts | UI_ONLY_READY |
| Phạm vi tính (cha/con) | JSON parent_id | UI_ONLY_READY |
| Số công tơ | Meter count API | NEEDS_BACKEND_DATA |
| Đã ghi / Tổng | Reading progress API | NEEDS_BACKEND_DATA |
| Cần kiểm tra | Exception count | NEEDS_BACKEND_DATA |

**Inspector (L3):**

| Phần | Nội dung |
| :--- | :--- |
| Tổng quan | Tên, mã, mô tả, loại khu |
| Công tơ | Số lượng, danh sách, trạng thái |
| Ngoại lệ | Công tơ cần kiểm tra |
| Nhân sự | Người phụ trách đã xác minh |
| Tiến độ | Tỷ lệ hoàn thành với mẫu số rõ |
| Liên kết | Báo cáo khu vực, Lịch ghi |

---

### 9. Hover/inspector công tơ điện và nước nên hiển thị gì?

**Hover (L2):**
- Mã công tơ + Tên
- Loại: ⚡ Điện / 💧 Nước (dùng icon, KHÔNG dùng text ELECTRICITY)
- Khu vực
- Chỉ số gần nhất + đơn vị (kWh hoặc m³)
- Trạng thái lượt ghi (Đã xác nhận / Cần kiểm tra / Chưa ghi)

**Inspector (L3):**
- Thông tin điểm đo: mã, tên, vị trí, loại tiện ích, loại công tơ (LCD/Cơ)
- Chỉ số: Giá trị, đơn vị, người ghi, thời điểm
- Xác nhận: Trạng thái, nguồn xác nhận
- Lịch sử: 3-5 lượt ghi gần nhất
- Bằng chứng: Ảnh nếu được phân quyền
- Hành động: Mở Báo cáo, Mở Lịch ghi

> **Lưu ý**: Hiện tại Map V2 KHÔNG có meter inspector. Chỉ có SVG tooltip simulated.

---

### 10. Có nguy cơ đếm trùng khu cha–con không?

**CÓ, nhưng chỉ ảnh hưởng khi tích hợp dữ liệu thực.**

| Phát hiện | Evidence |
| :--- | :--- |
| Frontend JSON: Kho 1 (`parent_id: ZONE_GENERAL`), Kho 2 (`parent_id: ZONE_GENERAL`) | `tan_thuan_1_zones_edited.json` |
| Backend `OperationalZone`: **Không có parent_id** — cấu trúc phẳng | `models.py#L89` |
| `Meter.zone_id`: Một công tơ thuộc **đúng một** zone | `models.py#L181` |

**Kịch bản rủi ro:**
1. Công tơ gán cho `BLDG_KHO_1` → không tự động xuất hiện trong tổng `ZONE_GENERAL`
2. Nếu hiển thị cả hai, người dùng có thể cộng thủ công → đếm trùng
3. Nếu aggregation logic tự động cộng con vào cha → đếm đúng nhưng cần business rules rõ ràng

**Cần xác nhận nghiệp vụ (BD-04):** Bãi tổng hợp có bao gồm Kho 1 + Kho 2 hay là vùng riêng biệt?

---

### 11. Animation ảnh hưởng ra sao tới khả năng đọc/click?

| Tình huống | Ảnh hưởng | Evidence |
| :--- | :--- | :--- |
| Zoom toàn cảng (< 1.0) | Chuyển động gần như không nhận thấy (~2px/giây trên viewport lớn) | `useEmployeeAnimation.ts` |
| Zoom cấp khu vực (1.0-2.5) | Chuyển động nhẹ, có thể click nhưng cần ngắm | VISUALLY_OBSERVED |
| Hover/Focus | Animation dừng ngay → click dễ dàng | SOURCE_VERIFIED |
| Selected | Marker đóng băng + vòng chọn xanh → hoàn toàn ổn định | SOURCE_VERIFIED |
| Nhiều marker cùng khu | Offset stagger (+28px X, +12px Y) tránh chồng nhau | SOURCE_VERIFIED |
| prefers-reduced-motion | Animation tắt hoàn toàn | SOURCE_VERIFIED |
| Manual Pause (HUD) | Tất cả marker dừng tại chỗ | SOURCE_VERIFIED |

**Kết luận:** Animation không gây cản trở nghiêm trọng. Hệ thống pause/freeze được triển khai đầy đủ. Không cần thay đổi animation behavior.

---

### 12. Inspector hiện tại có che khu hoặc làm mờ bản đồ quá mức không?

| Viewport | Inspector mode | Map coverage | Blur/Dim | Assessment |
| :--- | :--- | :--- | :--- | :--- |
| 1920×1080 | Docked right | ~85% map visible | **Không** blur/dim | ✅ Tốt |
| 1440×900 | Docked right | ~80% map visible | **Không** blur/dim | ✅ Chấp nhận được |
| 1280×800 | Drawer overlay | Map bị che phần dưới | Có backdrop | ⚠️ Cần kiểm tra |

**Phát hiện quan trọng:**
- Operational card (zone click): Floating, nhỏ (~340px max-width), KHÔNG che bản đồ → ✅ Tốt
- Employee inspector: Docked ~280px, bản đồ thu hẹp nhưng vẫn đọc được → ✅ Chấp nhận
- Geometry inspector: Cùng kích thước với employee inspector. Bảng tọa độ có thể chật → ⚠️ Xem xét

**Đề xuất:** Operational inspector giữ nguyên. Geometry inspector có thể cần rộng hơn (400px) nhưng chỉ trong Technical mode. KHÔNG áp dụng blur cho operational inspector.

---

### 13. Map liên kết với Báo cáo, Lịch ghi và Phân ca đến đâu?

| Luồng | Trạng thái | Evidence |
| :--- | :--- | :--- |
| Map → Báo cáo khu vực | **MISSING** — Không có link | `MapV2Workspace.tsx` |
| Map → Lịch sử công tơ | **MISSING** — Utility demo, không phải công tơ thực | `MapV2UtilityLayer.tsx` |
| Map → Ngoại lệ | **MISSING** — Không có dữ liệu ngoại lệ | NOT_IMPLEMENTED |
| Map → Phân ca nhân viên | **MISSING** — Không có link từ inspector | `MapV2InspectionPanel.tsx` |
| Báo cáo → Map | **MISSING** — Không có deep link ngược | `AdminShell.tsx` |
| Lịch ghi → Map đúng kỳ | **MISSING** — Map V2 không nhận ngữ cảnh ngày/lượt | `App.tsx` |
| Sidebar tab switching | **IMPLEMENTED** — Chuyển tab hoạt động bình thường | `AdminShell.tsx` |

**Rào cản chính:**
1. Map V2 zone IDs (ZONE_QUAY) ≠ Backend OperationalZone IDs → cần bảng mapping
2. Demo employee codes (DEMO_NV001) ≠ Real user IDs → cần thay demo bằng API
3. Map V2 không consume `selectedRound`/`selectedBatch` từ App.tsx → cần integration

> Chi tiết: [`12_MAP_REPORTS_SCHEDULES_NAVIGATION.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/12_MAP_REPORTS_SCHEDULES_NAVIGATION.md)

---

### 14. Những cải thiện nào chỉ cần frontend?

| Cải thiện | Effort | Risk |
| :--- | :--- | :--- |
| Di chuyển CANONICAL badge vào Settings/About | Low | Low |
| Gom utility toggles vào Tùy chọn menu | Low | Low |
| Gom theme toggles vào Tùy chọn menu | Low | Low |
| Custom hover tooltip cho zone (thay SVG title) | Medium | Low |
| Thêm link trong inspector → sidebar tabs | Medium | Low |
| Permission-gate Technical mode tools | Medium | Low |
| Search zone theo tên | Medium | Medium |

---

### 15. Những cải thiện nào cần backend hoặc xác nhận nghiệp vụ?

| Cải thiện | Loại | Mức độ |
| :--- | :--- | :--- |
| API zone progress cho Map V2 | NEEDS_BACKEND_DATA | Critical |
| API employee zone assignment | NEEDS_BACKEND_DATA | High |
| Mapping zone ID (presentation ↔ operational) | NEEDS_BACKEND_DATA + BD | Critical |
| Date/round context trên Map V2 | NEEDS_FRONTEND_INTEGRATION + BD | High |
| Real meter markers (coordinate reconciliation) | NEEDS_BACKEND_DATA + BD | Critical |
| Exception indicators | NEEDS_BACKEND_DATA | High |
| Parent-child aggregation rules | NEEDS_BUSINESS_CONFIRMATION | High |
| Personal progress denominator | NEEDS_BUSINESS_CONFIRMATION | Medium |

> 17 quyết định nghiệp vụ cần xác nhận: [`14_BUSINESS_DECISIONS_REQUIRED.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/14_BUSINESS_DECISIONS_REQUIRED.md)

---

### 16. Những tuyên bố nào của Implementation Summary đã được xác minh độc lập?

| Tuyên bố | Phương pháp xác minh | Kết quả |
| :--- | :--- | :--- |
| "Geometry Safety: Zero marker clipping" | Đọc source `employeeMovement.ts` + test assertions | SOURCE_VERIFIED + TEST_VERIFIED |
| "Motion halts on hover/focus" | Đọc `useEmployeeAnimation.ts` isHovered/isFocused logic | SOURCE_VERIFIED |
| "DEMO_MAP_V2_EMPLOYEES isolation" | Đọc `employeeDataAdapter.ts#L36` | SOURCE_VERIFIED |
| "Disclosure text mandatory" | Đọc `MAP_V2_EMPLOYEE_DISCLOSURE_TEXT` constant | SOURCE_VERIFIED |
| "prefers-reduced-motion detection" | Đọc `useEmployeeAnimation.ts` matchMedia query | SOURCE_VERIFIED |
| "Technical mode hides employees" | Đọc `MapV2EmployeeLayer.tsx` null return | SOURCE_VERIFIED |
| "18/18 unit tests pass" | Test file exists with 18 test blocks — NOT EXECUTED in audit | REPORTED_ONLY |
| "342/342 operations tests pass" | Test count claimed — NOT EXECUTED in audit (prohibited by scope) | REPORTED_ONLY |
| "Frozen B2 hash verified intact" | Hash script exists — NOT EXECUTED in audit | REPORTED_ONLY |
| "FULLY IMPLEMENTED, ZERO REGRESSIONS" | Source code verified; test execution not independently performed | PARTIALLY_VERIFIED |
| "9 screenshots visually accepted" | Screenshots viewed — content matches descriptions | VISUALLY_OBSERVED |

---

## Phương Án UI Cấu Trúc Đề Xuất

### Khuyến Nghị: OPTION B — CONTEXTUAL TOOLBAR (với cải tiến)

Dựa trên phân tích, **Option B (Contextual Toolbar)** phù hợp hơn vì:

1. **Tách bạch rõ ràng** giữa tác vụ vận hành (80% thời gian) và kiểm tra kỹ thuật (20%)
2. **Giải phóng không gian** toolbar cho thông tin nghiệp vụ (ngày/lượt ghi, tiến độ)
3. **Phân quyền tự nhiên** — Technical tools chỉ hiện cho người dùng kỹ thuật

#### Operational Mode (Mặc định):
```
┌──────────────────────────────────────────────────────────────────────┐
│ Bản đồ V2  │ [Vận hành ✓] [Kiểm tra]  │ 📅 Lượt 3/5 │ 🔍 Tìm.. │ ≡ │
└──────────────────────────────────────────────────────────────────────┘
│  Chú thích: ⚡ Điện  💧 Nước  ✅ Hoàn thành  ⚠️ Ngoại lệ          │
```

#### Technical Mode:
```
┌──────────────────────────────────────────────────────────────────────┐
│ Bản đồ V2 CANONICAL │ [Vận hành] [Kiểm tra ✓] │ Điện/Nước/Cả hai │
│ 1536×1024  │  Chuẩn KT / Neon  │  Lớp hiển thị                    │
└──────────────────────────────────────────────────────────────────────┘
```

#### Trade-offs:

| Tiêu chí | Option A (Compact Unified) | Option B (Contextual) ★ |
| :--- | :--- | :--- |
| Đơn giản cho operator | ✅ Một toolbar duy nhất | ⚠️ Cần hiểu mode |
| Không gian cho nghiệp vụ | ⚠️ Vẫn chật | ✅ Rộng rãi |
| Discoverability kỹ thuật | ⚠️ Ẩn trong menu | ✅ Hiện đúng lúc |
| Implementation effort | ✅ Đơn giản | ⚠️ Phức tạp hơn |
| Phân quyền | ⚠️ Cần logic riêng | ✅ Tự nhiên theo mode |
| 1280×800 behavior | ✅ Tùy chọn menu | ✅ Toolbar theo mode |

**Phương án thay thế (Option A)** vẫn khả thi nếu Cảng muốn giữ toolbar đơn giản hơn cho tất cả người dùng.

### Bước tiếp theo cần từ Người dùng:
1. ✅ Duyệt Option A hay B
2. ✅ Xác nhận 17 quyết định nghiệp vụ trong [`14_BUSINESS_DECISIONS_REQUIRED.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/14_BUSINESS_DECISIONS_REQUIRED.md)
3. ✅ Ưu tiên Phase 1 (UI-only) hay Phase 3 (backend integration)

---

## Deliverables Index

### Audit Documents

| # | File | Content |
| :--- | :--- | :--- |
| 01 | [`01_BASELINE_AND_EVIDENCE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/01_BASELINE_AND_EVIDENCE.md) | Git baseline, prior threads, visual evidence |
| 02 | [`02_USER_ROLES_AND_TASKS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/02_USER_ROLES_AND_TASKS.md) | Role × Task matrix, feature allocation |
| 03 | [`03_CURRENT_TOOLBAR_INVENTORY.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/03_CURRENT_TOOLBAR_INVENTORY.md) | 32 controls inventoried with full metadata |
| 04 | [`04_TOOLBAR_OPTIONS_AND_DECISIONS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/04_TOOLBAR_OPTIONS_AND_DECISIONS.md) | Option A (compact) vs Option B (contextual) |
| 05 | [`05_ENTITY_INFORMATION_CONTRACT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/05_ENTITY_INFORMATION_CONTRACT.md) | 4-level info contract for all entities |
| 06 | [`06_EMPLOYEE_MARKER_AND_INSPECTOR_AUDIT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/06_EMPLOYEE_MARKER_AND_INSPECTOR_AUDIT.md) | Marker verification, demo vs real analysis |
| 07 | [`07_ZONE_HIERARCHY_AND_PROGRESS_AUDIT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/07_ZONE_HIERARCHY_AND_PROGRESS_AUDIT.md) | Parent-child zones, double-counting risk |
| 08 | [`08_ELECTRICITY_WATER_METER_AUDIT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/08_ELECTRICITY_WATER_METER_AUDIT.md) | Meter model, utility type vs meter type |
| 09 | [`09_TECHNICAL_NETWORK_BOUNDARIES.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/09_TECHNICAL_NETWORK_BOUNDARIES.md) | Simulated network provenance |
| 10 | [`10_DENSITY_ZOOM_AND_VIEWPORT_AUDIT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/10_DENSITY_ZOOM_AND_VIEWPORT_AUDIT.md) | Space allocation, density, zoom policy |
| 11 | [`11_INSPECTOR_AND_INTERACTION_AUDIT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/11_INSPECTOR_AND_INTERACTION_AUDIT.md) | Interaction model, accessibility, occlusion |
| 12 | [`12_MAP_REPORTS_SCHEDULES_NAVIGATION.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/12_MAP_REPORTS_SCHEDULES_NAVIGATION.md) | Cross-screen navigation (6 flows MISSING) |
| 13 | [`13_DATA_PROVENANCE_AND_PERMISSIONS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/13_DATA_PROVENANCE_AND_PERMISSIONS.md) | Data source classification, permissions |
| 14 | [`14_BUSINESS_DECISIONS_REQUIRED.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/14_BUSINESS_DECISIONS_REQUIRED.md) | 17 questions for port management |
| 15 | [`15_IMPLEMENTATION_READINESS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/15_IMPLEMENTATION_READINESS.md) | Readiness classification per improvement |
| — | [`AUDIT_REPORT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/AUDIT_REPORT.md) | This report |
| — | [`THREAD_HANDOFF.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/THREAD_HANDOFF.md) | Handoff for next thread |

### Machine-Readable Matrices

| File | Content |
| :--- | :--- |
| [`toolbar_decision_matrix.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/toolbar_decision_matrix.csv) | 32 controls with Option A/B classification |
| [`entity_information_contract.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/entity_information_contract.csv) | All entity fields at L0-L3 |
| [`cross_screen_navigation_matrix.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/cross_screen_navigation_matrix.csv) | 10 navigation flows with status |
| [`data_readiness_matrix.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/data_readiness_matrix.csv) | Feature readiness classification |
| [`visual_acceptance_matrix.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/map-v2-business-information-density-audit/visual_acceptance_matrix.csv) | 9 screenshots verification status |

---

**AUDIT COMPLETE. No source code was modified. No geometry, FSM, or data was altered.**
