# 01. CURRENT-STATE AUDIT & RUNTIME GRAPH
## Cảng Tân Thuận — Spatial Operations Redesign V7

**Date**: 2026-09-11  
**Baseline SHA**: `e8c378ef311b8e2b5ec2b65f965a4dcf0af47d3f`  
**Authoritative Starting Branch**: `feature/u6-global-ui-consistency`  
**Working Feature Branch**: `feature/v7-tan-thuan-spatial-operations`  
**Safety Backup Branch**: `backup/pre-v7-tan-thuan-spatial-operations`  

---

### 1. Architectural Runtime Graph

The live application runtime has been traced from the root React application down to individual SVG layers and backend data endpoints:

```
App.tsx
 ├── LoginView (Session Auth via HTTP-only cookie + Argon2id)
 └── AdminShell (Role = 'ADMIN')
      ├── Persistent Navy Navigation Rail (W=64px, Saigon Port Brand Logo)
      ├── Isolated Tab Mounting
      │    ├── 'dashboard' / MapOperationsPage (Primary Spatial Operations Console)
      │    │    ├── ImmersiveSceneShell (Full-bleed stage with integrated HUD)
      │    │    │    ├── MapHeader (Temporal cluster, date picker, shift selector, view mode segmented toggle)
      │    │    │    ├── Telemetry HUD (Operational status chip, progress pill, exception chip)
      │    │    │    ├── SceneSearch / FilterPopover (Anchored top-left)
      │    │    │    ├── OperationalScene (SVG ViewBox 0 0 1664 932)
      │    │    │    │    ├── CanonicalBaseMap (tan-thuan-canonical.webp, 1664x932)
      │    │    │    │    ├── ZoneLayer (Vector polygon overlays)
      │    │    │    │    ├── OperatorLayer (Responsible operator avatars with shift progress rings)
      │    │    │    │    ├── MeterLayer (Operational meter markers)
      │    │    │    │    └── LabelsLayer (Compact geographic & landmark tags)
      │    │    │    ├── Contextual Overlays (Mutually exclusive)
      │    │    │    │    ├── MeterQuickPopup (Anchored speech-bubble card)
      │    │    │    │    ├── OperatorShiftPopover (Shift progress & assigned zones)
      │    │    │    │    └── ZoneDrawer (Side panel with zone statistics and meter list)
      │    │    │    └── OperationalListView (Alternate table presentation in same state)
      │    ├── 'schedules' (AdminSchedules — Reading rounds)
      │    ├── 'staff_roster' (AdminStaffRoster — 24/7 Shift schedule & leave)
      │    ├── 'meters' (AdminMeters — Meter catalog)
      │    ├── 'reports' (AdminReports — Operational analytics & CSV export)
      │    └── 'audit' (AdminAudit — Security and administrative action trail)
```

---

### 2. Component Lifecycle Audit

| Component | Role | Runtime Status | Notes / Observations |
|---|---|---|---|
| `CanonicalBaseMap` | Renders authoritative port aerial image | **ACTIVE** | Asset `tan-thuan-canonical.webp` (1664x932) preserved 100%. No Google Maps imagery. |
| `OperationalScene` | Unified SVG stage and pan/zoom viewport | **ACTIVE** | Fixed-camera decision preserved. No manual +/- or zoom slider controls. Programmatic 2D framing only. |
| `ZoneLayer` | Renders operational zone boundaries | **ACTIVE (UPDATE)** | Currently renders 4 business zones. Needs presentation model update to support the 6 approved visual regions while preserving 4 business zones. |
| `OperatorLayer` | Renders responsible operator markers | **ACTIVE (UPDATE)** | Currently overlaps the "CỔNG CHÍNH" text label in `zone-technical`. Anchor needs whitespace recalibration. |
| `MeterLayer` | Renders meter status points | **ACTIVE (UPDATE)** | Currently renders circular dots with thin rings, confusing meters with user avatar circles. Needs industrial rounded hexagon / badge with gauge glyph. |
| `MeterQuickPopup` | Anchored quick detail card for clicked meter | **ACTIVE (UPDATE)** | Displays code, name, zone, latest reading. Needs "Chỉnh vị trí" (relocation) action. |
| `OperatorShiftPopover`| Displays operator's shift progress and zones | **ACTIVE** | Functioning correctly with assigned zones and progress breakdown. |
| `ZoneDrawer` | Contextual slide-out panel for selected zone | **ACTIVE (UPDATE)** | Displays stats and meter list. Needs "Thêm công tơ" action to trigger spatial placement mode. |
| `PlacementMode` | Spatial coordinate placement grid & cursor | **NEW (V7)** | Admin spatial editing mode with 1664x932 grid overlay, candidate cursor, point-in-polygon check, and confirmation card. |

---

### 3. As-Is Defect Catalog

1. **Shape Collision between User and Meter**:
   - Both user markers and meter markers currently use circular shape language. At default zoom, operators and meters appear visually similar, violating domain clarity.
2. **Operator Marker Overlap in Technical Area**:
   - The operator anchor for `zone-technical` ({x: 1000, y: 775} / {x: 1010, y: 830}) collides directly with the physical gate entrance ("CỔNG CHÍNH") and vehicle queue area.
3. **Absence of Visual Zoning Granularity**:
   - The port currently displays 4 monolithic zones, whereas the approved operational zoning concept divides the port into 6 functional regions (Cầu cảng, Bãi container Tây, Bãi container Trung tâm, Kho/CFS Đông, Kỹ thuật/Dịch vụ, Cổng chính).
4. **Lack of Map-First Meter Creation / Relocation**:
   - Meter positions can only be edited via coordinate scripts or text inputs; there is no spatial drag-and-drop or click-to-place flow with visual zone boundary enforcement.
