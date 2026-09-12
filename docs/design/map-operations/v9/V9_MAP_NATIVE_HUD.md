# V9 Map-Native HUD Architecture — Tan Thuan Port

## 1. Executive Summary & Design Ethos
The V9 Map-Native HUD completely eliminates the perception of "dashboard UI pasted over a map". Instead, all interaction surfaces are treated as maritime instrumentation physically projected onto the port control surface. 

The satellite and drone orthophoto base map (`tan-thuan-canonical-base.png`) is established as the **visual hero** of the screen. Interface controls are styled using a **smoked maritime calm contrast** palette that delivers high operational legibility while remaining visually quiet and integrated into the darker waterways and quay aprons of the port.

```
+-----------------------------------------------------------------------------------------+
|                                    V9 HUD HIERARCHY                                     |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  [LEVEL 0: PORT CANVAS]                                                                 |
|  Base Map Orthophoto (1915x821) + Dual-Stroke Presentation Zones + 12 Production Meters |
|  - Zone Layer A: Soft Quayside Glow (4.0px, 15% opacity, non-scaling stroke)            |
|  - Zone Layer B: Structural Edge (1.6px, 82% opacity) + State Fill (3.5% - 18% opacity)   |
|                                                                                         |
|  [LEVEL 1: MAP-NATIVE HUD CONTROLS] (Smoked Maritime Dark Surface)                      |
|  --sgp-hud-surface: rgba(6, 29, 42, 0.78), border: rgba(255, 255, 255, 0.12)          |
|  - Top Bar: Port Identity + Shift Telemetry + Live Clock                                |
|  - Action HUD: Quick Search Pill + Filter Pill (Auto-width, 44px touch target)          |
|  - Telemetry Cluster: Active Alarms, Pending Readings, Zone Counter                     |
|  - Round Control Dock: Calibration Toggle, Reset View, Zoom In/Out, Layer Filter        |
|  - Legend & Compass: Maritime coordinate reference & status indicators                 |
|                                                                                         |
|  [LEVEL 2: INTERACTIVE WORK SURFACES] (Crisp Operational Cards)                        |
|  - Zone Detail Drawer, Filter Popover, Meter Placement Modal                            |
|  - High-contrast card surfaces for dense tabular records and operational forms          |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Design Tokens & Smoked Maritime Palette

The V9 HUD uses a dedicated set of CSS variables and TypeScript token constants in `mapDesignTokens.ts`:

### 2.1 Color & Material Tokens
| Token Variable | Hex / RGBA Value | Purpose |
| :--- | :--- | :--- |
| `--sgp-hud-surface` | `rgba(6, 29, 42, 0.78)` | Deep harbor navy translucent base for all HUD controls |
| `--sgp-hud-surface-hover` | `rgba(10, 39, 56, 0.88)` | Subtle brightening on hover |
| `--sgp-hud-surface-active` | `rgba(14, 48, 69, 0.94)` | Active/pressed state |
| `--sgp-hud-border` | `rgba(255, 255, 255, 0.12)` | Crisp hairline demarcation between HUD and map |
| `--sgp-hud-border-hover` | `rgba(56, 189, 248, 0.35)` | Maritime cyan accent glow on interactive hover |
| `--sgp-hud-text-primary` | `#F8FAFC` (Slate 50) | High-contrast primary reading text and icons |
| `--sgp-hud-text-secondary`| `#94A3B8` (Slate 400) | Secondary metadata and unit labels |
| `--sgp-hud-text-muted` | `#64748B` (Slate 500) | Timestamp counters and disabled states |
| `--sgp-hud-accent` | `#38BDF8` (Sky 400) | Maritime cyan operational accent |
| `--sgp-hud-accent-glow` | `rgba(56, 189, 248, 0.25)` | Soft focus ring and active zone glow |
| `--sgp-hud-backdrop` | `blur(16px)` | Optical glass blur separating HUD from map textures |

---

## 3. Surface Hierarchy & Light Work Surface Policy

The interface adheres to a strict two-tier visual model:
1. **Level 1 HUD Controls (Always on Map)**:
   - Must use `--sgp-hud-surface` with `backdrop-filter: blur(16px)`.
   - Never use solid opaque white backgrounds (`#FFFFFF`) for floating map controls.
   - Text is crisp white `#F8FAFC` or cyan `#38BDF8`.
2. **Level 2 Work Surfaces (Inspection & Forms)**:
   - Modals and drawers (such as the Zone Detail Drawer and Meter Placement Inspector) require reading dense tabular meter data, timestamps, and form inputs.
   - These surfaces utilize clean, high-contrast operational card styling with sharp borders and distinct elevation, preventing optical fatigue during extended shift operations.

---

## 4. Resolution of Button Clipping & Layout Collisions

### Root Cause of Legacy Defect
In earlier versions, generic `.sgp-map-icon-btn` classes imposed fixed square dimensions (`width: 36px; height: 36px;` or `width: 44px; height: 44px;`) across all button controls. When this class was applied to compound pill buttons containing text labels (such as `Search meters...` or `Filters`), the fixed width forced text truncation, icon overlap, and awkward horizontal clipping.

### V9 Clean Architecture Solution
1. **Decoupled Icon Controls from Compound Pills**:
   - Icon-only buttons (round dock, calibration exit, zoom buttons) use `.sgp-map-icon-control` (`width: 44px; height: 44px; border-radius: 50%`).
   - Compound buttons (search pill, filter trigger) use `.sgp-map-action-control` and `.sgp-scene-action-pill`:
     ```css
     .sgp-map-action-control {
       min-width: 44px;
       min-height: 44px;
       width: auto;
       padding: 0 14px;
       border-radius: 9999px;
       display: inline-flex;
       align-items: center;
       gap: 8px;
     }
     ```
2. **No Fragile CSS Hacks**:
   - Zero usage of `:has()` or brittle child selectors.
   - Preserves standard 44px touch ergonomics compliant with maritime tablet requirements.

---

## 5. Dual-Stroke Soft Zone Rendering

Zones in V8 appeared either too faint or as hard-edged vector lines that cut arbitrarily across quays. V9 introduces a calibrated **dual-stroke rendering engine** (`OperationalZone.tsx`):

### 5.1 Layer A: Atmospheric Quayside Halo
- `fill`: `"none"`
- `stroke`: Zone status theme color (Blue `#0284C7`, Green `#16A34A`, Amber `#D97706`, Rose `#E11D48`)
- `strokeWidth`: `4.0px`
- `strokeOpacity`: `0.15`
- `vectorEffect`: `"non-scaling-stroke"`
- **Purpose**: Creates an atmospheric optical boundary that blends gently into the dark river water and concrete yard surfaces without a razor-sharp edge.

### 5.2 Layer B: Structural Inner Edge & State Fill
- `strokeWidth`: `1.6px`
- `strokeOpacity`: `0.82`
- `vectorEffect`: `"non-scaling-stroke"`
- **State Fill Opacities**:
  - `default`: `0.055` (very calm, reveals underlying satellite yard layout)
  - `hovered`: `0.100` (tactile feedback when scrubbing zones)
  - `selected`: `0.180` (clear operational focus)
  - `dimmed`: `0.035` (unselected zones step into background when a zone is active)

This dual-layer structure ensures zone perimeters are immediately legible in full daylight or dark maritime control rooms without obscuring berth infrastructure.
