# 07. VISUAL QA & VERIFICATION MATRIX
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Viewport & Breakpoint Matrix

### 1. Viewport & Breakpoint Matrix

| Viewport Resolution | Target Device / Profile | Verification Items | Status | Screenshot Artifact |
|---|---|---|---|---|
| **1920 × 1080** | Full HD Desktop / Ops Wall | Canonical base map fills stage, HUD overlays sharp, no manual zoom UI | VERIFIED | `screenshots/10_v2_map_default.png` |
| **1440 × 900** | Standard Laptop / MacBook | HUD elements wrap cleanly, map maintains 1915:821 aspect ratio | VERIFIED | `screenshots/40_1440x900.png` |
| **1366 × 768** | Common Industrial Terminal | Top header controls compact, zone drawer readable without horizontal clipping | VERIFIED | `screenshots/43_1366x768.png` |
| **1024 × 768** | Tablet Landscape / iPad | Touch targets >= 48px, popover anchors clamp within viewport | VERIFIED | `screenshots/41_1024x768.png` |
| **768 × 1024** | Tablet Portrait | Map fits letterbox safely, bottom temporal dock accessible | VERIFIED | `screenshots/42_768x1024.png` |
| **390 × 844** | Mobile Device (iPhone 14/15) | Responsive navigation, list view toggle, full meter access | VERIFIED | `screenshots/44_390x844.png` |

---

### 2. Accessibility Checklist

- [x] All zones keyboard focusable via `tabIndex={0}` and activatable with `Enter` / `Space`.
- [x] Meter marker `aria-label` format: `"CT-005, Bãi Container Trung tâm, đã hoàn thành"`.
- [x] Operator marker `aria-label` includes name, shift progress, and exception counts.
- [x] Point-in-polygon validation feedback uses both text copy and icons (not color alone).
- [x] Selected state visible through halo ring geometry, line weight, and contrast changes.
- [x] `prefers-reduced-motion` suppresses transition animations.
- [x] Minimum 48×48px invisible hit targets for all interactive markers (`<rect x="-24" y="-24" width="48" height="48" fill="transparent" />`).

---

### 3. Screenshot Catalog (29 Automated Visual QA Artifacts)

| Category | Screenshot File | Description |
|---|---|---|
| **Core Map & Camera** | `10_v2_map_default.png` | Default V2 canonical satellite scene at 1440x900 |
| | `11_zone_focus_berth.png` | 2D camera focus on Berth zone + Zone Drawer |
| | `12_zone_focus_container.png` | 2D camera focus on Container zone |
| **Entity Markers** | `13_meter_quick_popup.png` | Meter click popup with reading info & "Chỉnh vị trí" action |
| | `14_operator_popover.png` | Operator progress popover with zone shift breakdown |
| | `15_operator_hover_route.png` | Operator hover route / assignment highlight |
| **States & Filters** | `16_filter_active.png` | Filter chip selection applied to map entities |
| | `17_exception_state.png` | Exception state filtering |
| **Spatial Placement** | `20_add_meter_entry.png` | Zone drawer showing "+ Thêm công tơ vào khu vực" entry point |
| | `21_placement_mode_grid.png` | 32×18 coordinate matrix grid overlay and placement card |
| | `22_candidate_hover.png` | Cursor hovering inside zone with coordinate readouts |
| | `23_candidate_outside_warning.png` | Targeting reticle outside zone with warning badge |
| | `24_candidate_valid_pinned.png` | Pinning candidate coordinate inside zone |
| | `25_placement_confirm_dialog.png` | Placement card with filled form data |
| | `26_placement_persisted.png` | Persisted scene state after placement workflow |
| | `27_existing_meter_relocation.png` | Relocation mode for existing meter |
| **Shell & Views** | `30_map_view.png` | Clean full-screen operational map |
| | `31_list_view.png` | High-density tabular list view toggle |
| | `32_admin_meters_list.png` | Admin meters management interface |
| | `33_analytics_drawer.png` | Operational analytics drawer |
| | `34_round_switcher.png` | Reading round selector dropdown |
| | `35_zone_drawer_full.png` | Full Zone Drawer content with operator & meter roster |
| | `36_empty_filter_state.png` | Graceful zero-match empty search state |
| | `37_sidebar_expanded.png` | Expanded administrative navigation rail |
| **Responsive Viewports** | `40_1440x900.png` | 1440 × 900 desktop viewport |
| | `41_1024x768.png` | 1024 × 768 tablet landscape viewport |
| | `42_768x1024.png` | 768 × 1024 tablet portrait viewport |
| | `43_1366x768.png` | 1366 × 768 industrial standard viewport |
| | `44_390x844.png` | 390 × 844 mobile phone viewport |
