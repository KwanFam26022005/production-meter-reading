# 07 — Operations Overview Layout & Responsive Viewport Specifications

**Document Reference:** `docs/research/employee-map-ux-design/07_OPERATIONS_OVERVIEW_LAYOUT.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies the screen architecture, spatial layout, and responsive breakpoints for the **Map-First Operations Overview**. In contrast to legacy enterprise software that burdens dispatchers with permanent empty sidebars, this layout dedicates **92% to 100% of horizontal screen estate to the Map V2 digital twin**, surfacing contextual panels only on demand.

---

## 2. Desktop Layout Blueprint (Map-First Architecture)

```
+----------------------------------------------------------------------------------------------------+
| 1. GLOBAL OPERATIONAL STRIP (Height: 52px)                                                         |
| [LOGO: Cảng Sài Gòn]  Ngày: 2026-09-23 ▾ | Ca: CA1 (06:00-14:00) ▾ | Lượt: 08:00 ▾                 |
| [Tiến độ: 142/180 (78%)] [Cảnh báo: 2 chưa gán] | Chế độ: [◉ Tác nghiệp | ○ Kỹ thuật]  [🔔] [👤 Admin]|
+----------------------------------------------------------------------------------------------------+
| 2. SPATIAL WORKSPACE (Map V2 Canvas: 1536 x 1024 viewBox)                                          |
|                                                                                                    |
|  [🔍 Tìm khu vực, NV...]                                                    [+  Zoom  -]           |
|                                                                             [  Fit 100% ]          |
|                                                                             [  Layers ▾ ]          |
|                                                                                                    |
|        +-------------------------------------------------------------+                             |
|        |                                                             |                             |
|        |                   MAP V2 SPATIAL CANVAS                     |                             |
|        |                (Wharf, Yards, Warehouses)                   |                             |
|        |                                                             |                             |
|        |                                                             |                             |
|        +-------------------------------------------------------------+                             |
|                                                                                                    |
|  [⚡ BẢN QUYỀN MÔ PHỎNG: Dữ liệu mạng lưới điện/nước là mô phỏng (Demo)]   (Watermark / Disclaimer)|
+----------------------------------------------------------------------------------------------------+
| (Inspector Dock slides in from right when an entity is selected — 380px to 440px wide)             |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Responsive Viewport Adaptations

### 3.1 Viewport: 1920 × 1080 (Central Control Room / Full HD)
- **Map Usable Area**: ~1480px wide when inspector is open; 1920px when closed.
- **Inspector Behavior**: Docked side panel (440px width), permanently visible once an entity is clicked, pushes map canvas with smooth transition.
- **Header**: All operational pills and progress telemetry render inline without truncation.

### 3.2 Viewport: 1440 × 900 (Standard Operations Desktop)
- **Map Usable Area**: ~1040px wide when inspector is open; 1440px when closed.
- **Inspector Behavior**: Docked side panel (400px width). Map viewBox centers on selected zone automatically.
- **Header**: Secondary metrics collapse into compact dropdowns.

### 3.3 Viewport: 1280 × 800 (Field Toughbook / Portable Laptop)
- **Map Usable Area**: 100% of viewport (1280px).
- **Inspector Behavior**: Overlay slide-over drawer (360px width) with semi-transparent backdrop, ensuring maximum map legibility when closed.
- **Header**: Condensed to logo, active shift chip, progress fraction, and hamburger menu.

---

## 4. Separation of Modes: Operational vs. Technical Network

Map V2 serves two distinct administrative purposes and must never conflate them:

```
+----------------------------------------------------------------------------------------------------+
|                                    OPERATIONAL vs TECHNICAL MODES                                  |
+------------------------------------+---------------------------------------------------------------+
| Feature / Layer                    | Chế độ Tác nghiệp (Operational) | Chế độ Kỹ thuật (Network)   |
+------------------------------------+---------------------------------+-----------------------------+
| Default Active Mode                | **YES (Default on load)**       | No (Manual toggle)          |
| Operational Zones & Anchors        | High visibility, branded tint   | Dimmed 50% opacity          |
| Zone Meter-Reading Progress        | Visible on each zone anchor     | Hidden                      |
| Employee Status Markers (Var B)    | Visible at zone anchors         | Hidden                      |
| Unstaffed Zone Alerts              | Highlighted in amber/red        | Hidden                      |
| 22kV Electrical Feeder Trunks      | Hidden                          | **Active (B2 Layout)**      |
| Water Distribution Mains           | Hidden                          | **Active (Cyan Trunks)**    |
| Transformers & Substation Nodes    | Hidden                          | **Active with Load Data**   |
| Simulation Watermark               | Hidden                          | **Prominent Warning Badge** |
+------------------------------------+---------------------------------+-----------------------------+
```

### 4.1 Strict Mode Invariants
1. **Never Show Utility Trunks by Default**: Electrical cables and water pipes must not clutter the dispatcher’s view during shift meter reading.
2. **Explicit Simulation Watermark**: When Technical Network Mode is activated, a persistent pill in the bottom-left corner states:  
   `⚠️ MÔ PHỎNG DẠNG BẢN THẢO B2: Chưa đo đạc định vị GIS thực tế` (Demo simulation only).
3. **Preserve Frozen B2 Coordinates**: The busbars, feeder paths, and transformer coordinates defined in `utilityDemoLayout.ts` remain unaltered.
