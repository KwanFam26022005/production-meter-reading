# Map V2 Final Architecture Reconciliation — 09. Final Toolbar Architecture & Evaluation

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Objective:** Resolve toolbar overload by transitioning from an undifferentiated 31-control surface to a refined **Three-Axis Architectural Model**.

---

## 1. The Three-Axis Operational Architecture

A fundamental flaw of the current Map V2 header is that Work Mode, Visual Theme, and Utility Overlays are forced onto a single horizontal row.

These concerns represent **three strictly orthogonal axes**:

```text
               AXIS 1: WORK MODE (Tác vụ công việc)
                      ┌──────────────────┐
                      │  Vận hành (Ops)  │
                      └────────┬─────────┘
                               │
                      ┌────────┴─────────┐
                      │ Kiểm tra (Tech)  │
                      └──────────────────┘
                               ▲
                               │
AXIS 2: OVERLAYS (Lớp hiển thị) ┼ AXIS 3: PRESENTATION (Bảng màu)
- Phân khu cảng (Zones)        │  - Chuẩn kỹ thuật (Light Navy)
- Nhân sự phân khu (Staff)     │  - Neon số (Dark Twin)
- Điểm đo công tơ (Meters)     │
- Tín hiệu ngoại lệ (Alerts)   │
- Mạng điện mô phỏng (Power)   │
- Mạng nước mô phỏng (Water)   │
```

### Why These Must Remain Independent
1. **Work Mode ≠ Visual Theme**: An operator in "Vận hành" mode may need High-Contrast Light mode under sunlight or Neon Dark mode at night. Theme is an ergonomic preference, not a workflow state.
2. **Utility Overlay ≠ Work Mode**: Electrical and water trunklines are spatial layers. Treating utility toggles as independent mode switches conflates data filtering with system state.
3. **Information Hierarchy over Button Count**: Grouping secondary tools into structured contextual popovers frees 60%+ of the header width for critical operational signals (Date, Round, Search, Exceptions).

---

## 2. Target Operational Toolbar Specification

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚓ Bản đồ Tân Thuận 1 │ 📅 23/09/2026 · Lượt 10:00 (Đang mở) ▼ │ 🔍 Tìm kiếm... │ ⚠️ 3 Ngoại lệ │ ≡ Lớp │ ⋯ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Primary Operational Bar (Left to Right)
1. **Workspace Title**: `Bản đồ Tân Thuận 1` (Maritime Navy, 18px font-weight 700).
2. **Date & Round Context Trigger**:
   - Displays: `📅 23/09/2026 · Lượt 10:00 (Đang mở) ▼`.
   - Wired directly to `useOperationalWorkspace().selectedDate` and `selectedRoundId`.
   - Clicking opens an inline dropdown to switch date or reading round without leaving the map.
3. **Quick Search**:
   - Compact input with search icon (`🔍 Tìm khu vực, công tơ, mã NV...`).
   - Autocompletes across loaded zone anchors, meters, and assignees.
   - Selecting a result centers the camera and opens the entity inspector.
4. **Exception Filter Chip**:
   - Visible badge: `⚠️ 3 Ngoại lệ` (Amber/Coral accent).
   - Clicking toggles the exception filter: highlights meters needing review or overdue, dimming normal meters.
5. **Layer Manager Trigger (`≡ Lớp`)**:
   - Opens the unified overlay popover containing all 6 functional layers.
6. **More Options Menu (`⋯`)**:
   - Opens settings popover for secondary technical and presentation tools.

---

## 3. Control Reallocation Inventory (All 31 Controls Evaluated)

| # | Existing Control | Current Location | Final Disposition | Justification |
| :-: | :--- | :--- | :--- | :--- |
| 1 | Map Title + Subtitle | Header Left | **`KEEP_PRIMARY`** | Core workspace orientation. |
| 2 | CANONICAL Badge | Header Left | **`MOVE_TO_MORE_MENU`** | Technical metadata; irrelevant to field dispatchers. |
| 3 | Metadata Pill (`1536×1024, 7 phân khu...`) | Header Left | **`MOVE_TO_MORE_MENU`** | Clutters operational header. Relocate to "Thông tin bản đồ". |
| 4 | Fit Mode: Fit toàn bộ | Header Center | **`MOVE_TO_MORE_MENU`** | Canvas framing preference; belongs in More menu. |
| 5 | Fit Mode: Tràn chiều rộng | Header Center | **`MOVE_TO_MORE_MENU`** | Canvas framing preference; belongs in More menu. |
| 6 | Work Mode: Vận hành | Header Center | **`KEEP_PRIMARY`** | Primary operational work mode. |
| 7 | Work Mode: Kiểm tra | Header Center | **`ROLE_GATE` / `MOVE_TO_MORE_MENU`** | Restrict to ADMIN role; accessible via More menu. |
| 8 | Tone Mode: Chuẩn kỹ thuật | Header Center | **`MOVE_TO_MORE_MENU`** | Ergonomic theme toggle belongs in Settings. |
| 9 | Tone Mode: Neon số | Header Center | **`MOVE_TO_MORE_MENU`** | Ergonomic theme toggle belongs in Settings. |
| 10 | Utility: Tắt lưới | Header Center | **`REMOVE_DUPLICATE`** | Replaced by direct layer checkboxes in Layer Manager. |
| 11 | Utility: Điện | Header Center | **`MOVE_TO_LAYERS`** | Electric network is an overlay layer, not a primary button. |
| 12 | Utility: Nước | Header Center | **`MOVE_TO_LAYERS`** | Water network is an overlay layer, not a primary button. |
| 13 | Utility: Cả hai | Header Center | **`REMOVE_DUPLICATE`** | Redundant when independent layer checkboxes exist. |
| 14 | Simulation Disclosure Badge | Header Center | **`KEEP_CONTEXTUAL`** | Appears in header only when simulated layers are active. |
| 15 | Employee Motion Disclosure Badge | Header Center | **`KEEP_CONTEXTUAL`** | Appears only when demo animation layer is active. |
| 16 | Layers Toggle (`Lớp hiển thị`) | Header Right | **`KEEP_PRIMARY`** | Primary tool to control map visual density. |
| 17 | Compact Options Menu (`Tùy chọn`) | Header Right (Compact) | **`KEEP_PRIMARY`** | Unified as `⋯` menu across all viewport widths. |
| 18 | Deselect Button (`Bỏ chọn`) | Header Right | **`KEEP_CONTEXTUAL`** | Only visible when an entity is selected. |
| 19 | Base Map Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 20 | Zones Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 21 | Buildings Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 22 | Roads Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 23 | Gates Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 24 | Anchors Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 25 | Employees Layer Toggle | Layer Popover | **`MOVE_TO_LAYERS`** | Standard layer management. |
| 26 | HUD: Zoom In (`+`) | Bottom Right | **`KEEP_HUD`** | Essential canvas navigation. |
| 27 | HUD: Zoom Out (`-`) | Bottom Right | **`KEEP_HUD`** | Essential canvas navigation. |
| 28 | HUD: Reset View (`↺`) | Bottom Right | **`KEEP_HUD`** | Essential canvas navigation. |
| 29 | HUD: Play / Pause Motion | Bottom Right | **`KEEP_HUD`** | Mandatory for accessibility when motion is active. |
| 30 | HUD: Zoom Percentage Display | Bottom Right | **`REMOVE_DUPLICATE`** | Remove static button; show zoom % as transient tooltip. |
| 31 | Inspector: Close & Copy | Side Panel | **`KEEP_CONTEXTUAL`** | Standard contextual panel controls. |

---

## 4. Responsive Adaptation Matrix

| Viewport Width | Header Layout | Overflow Strategy |
| :--- | :--- | :--- |
| **Wide (1600px–1920px)** | Full primary bar: Title + Date/Round Pill + Search Input + Exception Chip + Layers Button + More Menu. | Zero truncation. All primary tools accessible in 1 click. |
| **Standard (1366px–1599px)** | Title + Date/Round Pill + Collapsed Search Icon + Exception Chip + Layers Button + More Menu. | Search collapses to an expandable icon. |
| **Compact (1280px–1365px)** | Title + Date/Round Pill + Exception Badge + More Menu (`⋯`). | Search and Layers accessible via More menu or compact icons. |
