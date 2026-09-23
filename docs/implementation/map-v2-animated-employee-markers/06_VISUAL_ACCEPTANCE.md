# Map V2 Animated Employee Markers — 06. Visual Acceptance

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Capture Script:** `scripts/capture_animated_employee_markers.mjs`  
**Capture Engine:** Headless Microsoft Edge via Playwright Core  

---

## 1. Visual Acceptance Gallery

### 1.1 Default Operational Overview (1920×1080)
- **File:** `screenshots/01_map_v2_overview_default.png`
- **Features Verified:**
  - Ambient employee markers visible in assigned zones (`ZONE_QUAY`, `ZONE_GENERAL`, `ZONE_CONTAINER`, `BLDG_KHO_1`).
  - Top bar displays calm `Chuyển động minh họa (Demo)` badge.
  - Bottom-right HUD displays Play/Pause control button.

### 1.2 Close-Up on Quay Zone Marker
- **File:** `screenshots/02_map_v2_employee_marker_closeup.png`
- **Features Verified:**
  - Zoomed framing showing marker `DEMO_NV001` (Nguyễn Văn Hải) navigating within the boundary-safe corridor of `ZONE_QUAY`.
  - Zero boundary clipping against the waterfront quay edge.

### 1.3 Marker Hover State with Level 2 Contextual Preview Card
- **File:** `screenshots/03_map_v2_employee_marker_hover_preview.png`
- **Features Verified:**
  - Marker pauses instantly upon hover.
  - Clean vector preview card displays employee code, full name, zone label, illustrative motion disclosure, and click guidance.

### 1.4 Selected Marker with Docked Contextual Inspector
- **File:** `screenshots/04_map_v2_employee_marker_selected_inspector.png`
- **Features Verified:**
  - Selected marker locks and freezes with bold active ring.
  - Associated zone polygon lights up in blue operational reveal overlay.
  - Docked `MapV2InspectionPanel` renders employee identity, duty details, zone reading progress, and prominent illustrative disclosure card.
  - Top bar offers `Bỏ chọn` action to clear selection.

### 1.5 HUD Play/Pause Manual Control
- **File:** `screenshots/05_map_v2_hud_motion_pause.png`
- **Features Verified:**
  - Clicking HUD toggle halts motion across all markers; HUD button flips from Pause to Play icon.
  - Markers remain cleanly stationed in their current positions.

### 1.6 Layer Management Popover (Layer 7 Active)
- **File:** `screenshots/06_map_v2_layer_manager.png`
- **Features Verified:**
  - Layer popover lists `7. Nhân sự phân khu (Mô phỏng)` with checkbox checked.
  - Allows operators to toggle employee markers on or off without affecting map geometry.

### 1.7 Technical Network Simulation Mode (Suppressed Markers)
- **File:** `screenshots/07_map_v2_technical_network_mode.png`
- **Features Verified:**
  - Switching to Technical Mode (`utilityMode = 'electricity'`) automatically hides all employee markers.
  - Technical network graph remains clean and uncluttered.

### 1.8 Viewport Responsiveness: 1440×900
- **File:** `screenshots/08_map_v2_viewport_1440x900.png`
- **Features Verified:**
  - Balanced layout on standard corporate desktop screens.
  - Floating controls and HUD remain well-cleared.

### 1.9 Viewport Responsiveness: 1280×800
- **File:** `screenshots/09_map_v2_viewport_1280x800.png`
- **Features Verified:**
  - Compact laptop presentation.
  - Inspector transitions to drawer mode on narrow viewports without clipping map canvas.
