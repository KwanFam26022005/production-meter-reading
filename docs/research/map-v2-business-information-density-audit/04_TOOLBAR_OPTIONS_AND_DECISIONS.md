# Map V2 Business & Information Density Audit — 04. Toolbar Options & Decisions

## Current State Analysis

The toolbar currently shows ALL controls simultaneously on wide screens:
- 15 header controls + CANONICAL badge + metadata
- 7 layer toggles in popover
- 5 HUD controls
- 4 inspector controls
- Total: ~31 interactive controls

At 1280×800, controls collapse to a single row with 'Tùy chọn' condensed menu.

### Key Issues:
1. Work Mode and Visual Theme are conflated on the same toolbar row
2. Utility network toggles are always visible even when irrelevant to operational tasks
3. No date/round context — operator cannot see which reading round they're viewing
4. No search — cannot find a specific zone or meter by name
5. No progress/status summary visible at the toolbar level
6. CANONICAL badge and technical metadata (1536×1024, 7 phân khu) consume space without clear operator value

## OPTION A — COMPACT UNIFIED TOOLBAR

### Always Visible (Primary Bar):
- Title 'Bản đồ V2' (no CANONICAL badge — move to Settings/About)
- View mode: Fit/Width toggle (compact icon group)
- Work Mode: Vận hành / Kiểm tra (segmented control)
- Date/Round context badge (NEW — needs backend)
- Search (NEW — needs frontend)
- HUD: Zoom controls (remain floating)

### Grouped in 'Tùy chọn' Menu:
- Visual Theme: Chuẩn kỹ thuật / Neon số
- Utility Network: Tắt / Điện / Nước / Cả hai
- Layer Manager (all 7 layers)
- CANONICAL badge + metadata
- Employee motion Play/Pause

### Contextual (appear when relevant):
- Bỏ chọn — only when entity selected
- Inspector panel — only when entity selected
- Demo disclosure badge — only when employee layer active

### Classification:
| Control | Classification | Clicks to Access | Notes |
| :--- | :--- | :--- | :--- |
| View Mode | Primary | 1 | Always visible |
| Work Mode | Primary | 1 | Always visible |
| Search | Primary | 1 | New feature |
| Visual Theme | Secondary | 2 | Inside menu |
| Utility Network | Secondary | 2 | Inside menu |
| Layer Manager | Secondary | 2 | Inside menu |
| HUD Zoom | Primary | 1 | On canvas |

## OPTION B — CONTEXTUAL TOOLBAR

### Operational Mode Bar:
- Title + Date/Round
- Zone progress summary badge (NEW)
- Search
- Employee toggle
- Zoom

### Technical Network Mode Bar:
- Title + CANONICAL badge
- Utility: Điện / Nước / Cả hai
- Theme: Chuẩn kỹ thuật / Neon số
- Layer Manager
- Coordinate inspection tools

### Mode Switch:
- Persistent toggle: Vận hành ↔ Kiểm tra

### Geometry Inspection Mode (sub-mode of Technical):
- Copy coordinates
- Vertex table
- Topology view

## Comparison Table

| Criterion | Option A | Option B |
| :--- | :--- | :--- |
| Toolbar width at 1280 | Reduced by ~40% | Varies by mode |
| Click to access utility toggle | 2 (menu → toggle) | 0 in Technical, 2+ in Operational |
| Discoverability of technical tools | Lower (hidden in menu) | Higher (visible in Technical mode) |
| Complexity for operators | Lower | Medium (must understand modes) |
| Implementation effort | UI_ONLY_READY (mostly) | NEEDS_FRONTEND_INTEGRATION |

### Detailed Behavior Notes
- **Clicks to Access:** Option B minimizes clicks by prioritizing relevant tools based on mode. Option A relies on a grouped menu which adds a click for secondary features.
- **Responsiveness (1280×800 to 1920×1080):** Option A keeps a clean single line that easily scales down. Option B might require wrapping on 1280 screens depending on the number of mode-specific controls.
- **Keyboard Accessibility:** Option A is simpler to traverse. Option B requires mode-switching before traversing specific toolsets.
- **Risk if Hidden:** Option A hides technical tools in a menu; acceptable for general operators, annoying for map admins. Option B surfaces them when needed.

## Business Decisions Required
1. Should date/round context be visible on Map V2? (NEEDS_BACKEND_DATA)
2. Should search exist on Map V2? (NEEDS_FRONTEND_INTEGRATION)
3. Should technical metadata be visible to all users? (NEEDS_BUSINESS_CONFIRMATION)
4. Should utility network controls require Technical mode? (NEEDS_BUSINESS_CONFIRMATION)
