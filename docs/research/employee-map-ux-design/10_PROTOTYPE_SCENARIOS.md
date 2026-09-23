# 10 — Prototype Demonstration Scenarios

**Document Reference:** `docs/research/employee-map-ux-design/10_PROTOTYPE_SCENARIOS.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies the eight core operational scenarios demonstrated in the standalone interactive prototype (`docs/research/employee-map-ux-design/prototype/index.html`). Each scenario illustrates how the interface handles real-world edge cases, missing data, and high spatial density while maintaining total visual clarity and data truthfulness.

---

## 2. Specification of the 8 Prototype Scenarios

```
+----------------------------------------------------------------------------------------------------+
|                                    PROTOTYPE SCENARIOS MATRIX                                      |
+----+----------------------------+------------------------------------+-----------------------------+
| #  | Scenario                   | Operational State                  | Key UX Behavior Verified    |
+----+----------------------------+------------------------------------+-----------------------------+
| 1  | Normal Overview            | All zones staffed, reading on track| Calm, clutter-free map scan |
| 2  | Inspect an Employee        | Worker on duty in Wharf Area       | L2 Hover -> L3 Inspector    |
| 3  | Incomplete Zone            | Lagging readings in Container Yard | Unread meters listed clearly|
| 4  | Missing Assignment         | General Cargo has no operator      | Amber alert, 1-click assign |
| 5  | Leave / Shift Substitution | Worker on leave, sub covering      | Transparent coverage trail  |
| 6  | No Personal Task Data      | Reading pool without individual IDs| Suppresses false progress   |
| 7  | Dense Map / Clustered Nodes| 3 operators & 12 meters in 1 bldg  | Collision avoidance & offset|
| 8  | Keyboard Accessibility     | Full mouse-free operation          | Focus rings, Tab/Enter flow |
+----+----------------------------+------------------------------------+-----------------------------+
```

---

### Scenario 1: Normal Overview (Quang cảnh Vận hành Chuẩn)
- **Context**: 08:30 during Ca 1 on a weekday. All 3 primary zones have verified operators on duty. Reading progress is at 78%.
- **Screen State**:
  - Global Header shows: `Ngày 23/09/2026 | Ca 1 (06:00 - 14:00) | Lượt 08:00`.
  - Map V2 displays clean zone outlines with subtle blue/slate tints.
  - Three Variant B employee markers display green status dots (`🟢 Đã vào ca`).
  - No sidebars are open; 100% of the map is visible.

---

### Scenario 2: Inspect an Employee (Kiểm tra Nhân sự Tác nghiệp)
- **Action**: Administrator hovers over Employee Marker `NV001` in `ZONE_QUAY` (Khu cảng sà lan).
- **Result**:
  - Level 2 Hover Card appears above marker: `"NV001 - Nguyễn Văn Hải | Ca 1 (05:58) | Tiến độ: 34/42"`.
  - Administrator clicks the marker (or presses Enter).
  - Level 3 Contextual Inspector slides in from the right.
  - Panel displays selfie photo, contact button, and list of 8 pending meters.
  - The map smoothly re-centers so the marker is not hidden by the panel.

---

### Scenario 3: Incomplete Zone (Khu vực Chậm Tiến độ)
- **Context**: Round 08:00 closes in 30 minutes, but `ZONE_CONTAINER` (Bãi Container) is only at 45% completion (18/40 meters).
- **Screen State**:
  - The progress pill on the container yard turns amber: `18/40 (45%)`.
  - Clicking the zone opens the Inspector with a filtered view: `Chưa ghi (22)`.
  - Administrator can click `[Hối thúc tiến độ]` or examine if the operator encountered physical obstructions.

---

### Scenario 4: Missing Assignment (Khu vực Chưa Có Nhân sự Phụ trách)
- **Context**: `ZONE_GENERAL` (Bãi tổng hợp) has no scheduled operator for Ca 1 (e.g., sudden sickness).
- **Screen State**:
  - The zone border flashes a gentle amber highlight (2px dashed).
  - The operator anchor displays a red alert chip: `[⚠️ Chưa phân công]`.
  - Header displays alert notification: `[1 Khu vực chưa có nhân sự]`.
  - Clicking the alert opens the Reassignment Modal, suggesting available reserve staff from the admin office.

---

### Scenario 5: Leave or Shift Substitution (Nhân viên Nghỉ phép & Hoán đổi Ca)
- **Context**: Employee `NV002` (Trần Minh Tuấn) is on approved annual leave. Substitute `NV004` (Võ Quốc Bảo) is covering.
- **Screen State**:
  - Inspector shows: `"Người trực ca: NV004 - Võ Quốc Bảo (Thay thế NV002 - Phép năm)"`.
  - Proves that the substitution did not overwrite NV004’s permanent records, displaying a clear transparent coverage trail.

---

### Scenario 6: No Personal Task Data (Bảo toàn Tính Trung thực Dữ liệu)
- **Context**: A zone has 10 meters read by 3 different workers who happened to be walking past, but no individual task dispatch was executed.
- **Screen State**:
  - The interface **refuses to invent a personal progress fraction** like `NV001: 10/10 (100%)`.
  - The Inspector truthfully reports:
    - `Tiến độ khu vực: 10/10 hoàn thành`.
    - `Nhật ký ghi nhận: NV001 (5 số đọc), NV003 (3 số đọc), NV005 (2 số đọc)`.

---

### Scenario 7: Dense Map / Clustered Nodes (Mật độ Cao & Tránh Chồng lấn)
- **Context**: Warehouse 1 (`BLDG_KHO_1`) contains 8 closely spaced sub-meters and 2 roaming technicians within a 60px visual radius.
- **Screen State**:
  - The prototype implements **Micro-Offset Radial Layout** or **Cluster Badge** (`[+8 công tơ]`).
  - Hovering the cluster expands the nodes in a clean spider-leg popout, preventing click-target overlap.

---

### Scenario 8: Full Keyboard Navigation (Tác vụ Hoàn toàn bằng Bàn phím)
- **Context**: Dispatcher operating with keyboard only (no mouse).
- **Interaction Flow**:
  - Pressing `Tab` moves focus sequentially through Header -> Zone Anchors -> Employee Markers.
  - Focused marker displays high-contrast blue focus ring (`#0068FF`, 2px offset).
  - Level 2 Hover Card appears automatically on focus.
  - Pressing `Enter` opens the Level 3 Inspector.
  - Pressing `Escape` closes the Inspector and restores focus to the map marker.
