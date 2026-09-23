# 06 — Three-Level Interaction Hierarchy & Contextual Inspector Specification

**Document Reference:** `docs/research/employee-map-ux-design/06_HOVER_AND_INSPECTOR_SPEC.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies the three-tier progressive disclosure interaction model for Map V2 in the Operations Portal. By strictly dividing information access into **Level 1 (At-a-Glance)**, **Level 2 (Hover/Focus Preview)**, and **Level 3 (Persistent Contextual Inspector)**, the interface prevents visual overload while ensuring all critical data is accessible within one click or keyboard shortcut.

---

## 2. The Three-Level Interaction Model

```
+----------------------------------------------------------------------------------------------------+
|                                    INTERACTION PROGRESSION HIERARCHY                               |
+----------------------------------------------------------------------------------------------------+
| LEVEL 1: AT A GLANCE (Zero Interaction)                                                            |
| - Zone boundaries with subtle brand tint (20% opacity)                                             |
| - Compact Zone Progress Pill: e.g. "34/42" (Green border if 100%, Slate if in progress)             |
| - Employee Status Marker (Variant B): Avatar with verified On-Duty / Pending dot                   |
| - Exception Alerts: Small amber warning icon only if unassigned or overdue                         |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 | (Hover or Keyboard Focus: Tab / Arrows)
                                                 v
+----------------------------------------------------------------------------------------------------+
| LEVEL 2: HOVER & FOCUS PREVIEW CARD (Compact Tooltip — Non-Interactive)                            |
| +---------------------------------------------------------------+                                  |
| | NV001 — Nguyễn Văn Hải                                        | (Header)                         |
| | Trực ca: Ca 1 (06:00 - 14:00) | Đã vào ca (05:58)             | (Shift & Attendance)             |
| | Phụ trách: Khu cảng sà lan (Zone Quay)                        | (Zone)                           |
| | Tiến độ khu vực: 34/42 công tơ (81%)                          | (Truthful Zone Progress)         |
| | Nhấn Enter hoặc nhấp chuột để mở chi tiết                     | (Keyboard Cue)                   |
| +---------------------------------------------------------------+                                  |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 | (Click or Keyboard Activation: Enter / Space)
                                                 v
+----------------------------------------------------------------------------------------------------+
| LEVEL 3: PERSISTENT CONTEXTUAL INSPECTOR (Right-Side Docked Split Panel — 400px)                   |
| - Never obscures the selected zone or marker (auto-pans map slightly if needed)                    |
| - Section 1: Overview & Zone Identity                                                              |
| - Section 2: Shift Duty & Personnel Profile (Verified Status, Contact, Reassign CTA)               |
| - Section 3: Meter Reading Telemetry (Live list of completed, pending, and flagged meters)         |
| - Section 4: Operational Audit Log & Action Buttons                                                |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Level 2 Hover & Focus Preview Card Specification

### 3.1 Design Invariants
- **Non-Interactive**: Never place buttons, form inputs, or clickable links inside the hover card. Placing forms in hover cards creates severe motor accessibility failures.
- **Bi-Directional Trigger**: Must open identically on mouse `mouseenter` and keyboard `focusin`.
- **Dismissal**: Dismisses on mouse `mouseleave`, keyboard `focusout`, or pressing `Escape`.
- **Positioning**: Anchors directly above the target marker with collision detection (flips downward if near top viewport boundary).

### 3.2 Content Layout
```text
┌────────────────────────────────────────────────────────┐
│  🟢 NV001 — Nguyễn Văn Hải             KỸ THUẬT VIÊN   │
├────────────────────────────────────────────────────────┤
│  Ca trực:    Ca 1 (06:00 - 14:00)                      │
│  Điểm danh:  Đã xác thực (05:58 qua ảnh selfie)        │
│  Khu vực:    Khu cảng sà lan (ZONE_QUAY)               │
│  Tiến độ:    34/42 công tơ hoàn thành (81%)            │
│  Bất thường: 1 công tơ kẹt chỉ số                      │
└────────────────────────────────────────────────────────┘
```

---

## 4. Level 3 Persistent Contextual Inspector Specification

When an administrator clicks an operational zone or employee marker, the **Contextual Inspector** slides smoothly from the right edge.

### 4.1 Layout Dimensions & Viewport Adaptation
- **Width**: 400px on 1440×900 and 1920×1080; 360px on 1280×800.
- **Surface**: High-contrast white (`#FFFFFF`) card resting on porcelain background (`#FCFCFC`), separated by a subtle 1px border (`#E2E8F0`).
- **Map Preservation**: The map canvas adjusts its padding or smoothly pans by 200px to ensure the selected entity remains unobstructed in the center of the active viewing area.

### 4.2 Detailed Section Breakdown

#### Section 1: Entity Header & Spatial Context
- Title: Zone Name (e.g., `Khu cảng sà lan`) or Employee Name (`Nguyễn Văn Hải - NV001`).
- Subtitle: Facility Identifier (`Tân Thuận 1 — Cầu bến số 1-3`).
- Close Button: Accessible 32×32px button (`Esc` key shortcut).

#### Section 2: Shift Duty & Workforce Profile
- **Current Shift Chip**: `Ca 1 (06:00 - 14:00)`.
- **Attendance Verification Badge**:
  - `Đã vào ca lúc 05:58 (Ảnh khuôn mặt hợp lệ)` [Green].
  - Shows small 48×48px thumbnail of check-in selfie upon click.
- **Contact & Action**: Direct telephone/internal radio extension + Button: `Điều phối ca (Reassign)`.

#### Section 3: Meter Reading Telemetry
- **Progress Metric**: Large tabular display: `34 / 42` with 8px horizontal progress bar.
- **Meter Tabs**:
  - `Đã đọc (34)`: Shows timestamp, reading value, and OCR confidence.
  - `Chưa đọc (7)`: Listed by physical walking sequence.
  - `Sự cố (1)`: Meter M-04 flagged as "Kẹt hàng hóa bãi".

#### Section 4: Operational Actions
- **Primary CTA**: `Hối thúc tiến độ` (Send reminder ping).
- **Secondary CTA**: `Xem sổ nhật ký đầy đủ` (Open full Logbook modal).
- **Emergency CTA**: `Báo cáo sự cố lưới điện` (Report infrastructure fault).
