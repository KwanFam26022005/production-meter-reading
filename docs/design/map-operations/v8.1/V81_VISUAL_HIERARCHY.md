# V8.1 Low-Chrome Operational UI & Calm Contrast Hierarchy

**Design System**: Sài Gòn Port Calm Maritime Operational UI  
**Phase**: V8.1 UI Hierarchy Refactor  
**Status**: Implemented & Validated

---

## 1. Hierarchy Philosophy: Map-First Dominance

In previous revisions, dense opaque white panels (`#FFFFFF`) created visual noise and competed aggressively with the high-resolution aerial base map.

V8.1 establishes **Calm Contrast**:
1. **The aerial base map is the primary hero layer** at all times.
2. **Overlay chrome is translucent mist or dark maritime**: controls float quietly above the imagery using backdrop blur (`12px` to `16px`).
3. **Emergency alerts alone command strong chroma**: normal status is subdued (`#0F172A` / `#475569`), while overdue/issues earn targeted amber (`#D97706`) and rose (`#E11D48`) alerts.

---

## 2. Calm Contrast Design Tokens

| Token Name | CSS Custom Property | Value | Role |
|---|---|---|---|
| `chromeMist` | `--map-chrome-mist` | `rgba(255, 255, 255, 0.72)` | Secondary light floating panels |
| `chromeMistStrong` | `--map-chrome-mist-strong` | `rgba(255, 255, 255, 0.88)` | Primary top bar & telemetry strip |
| `hudDark` | `--map-hud-dark` | `rgba(15, 23, 42, 0.78)` | Timeline HUD & Legend HUD controls |
| `hudDarkHover` | `--map-hud-dark-hover` | `rgba(15, 23, 42, 0.90)` | Hover state for dark maritime controls |
| `borderSoft` | `--map-border-soft` | `rgba(15, 23, 42, 0.10)` | Delicate perimeter border on light mist |
| `borderSoftDark` | `--map-border-soft-dark` | `rgba(255, 255, 255, 0.20)` | Subtle border on dark maritime surfaces |
| `textPrimary` | `--map-text-primary` | `#0F172A` | Primary typography on mist surfaces |
| `textSecondary` | `--map-text-secondary` | `#475569` | Secondary tabular labels and counters |
| `shadowSoft` | `--map-shadow-soft` | `0 4px 16px rgba(0, 0, 0, 0.08)` | Soft, diffused elevation shadow |

---

## 3. Surface Architecture

### A. Top Application Bar (56–64px)
- **Class**: `.sgp-hud-top-bar`, `.sgp-map-header`
- **Height**: `58px` (strict 56–64px compliance)
- **Surface**: `var(--map-chrome-mist-strong)` with `backdrop-filter: blur(12px)`
- **Border**: `1px solid var(--map-border-soft)`
- **Layout**: CSS Grid `1fr auto auto`
  - Left: Navigation trigger + Port branding
  - Center: Unified temporal cluster (VnDatePicker + Round Selector)
  - Right: View switch (`Map` / `List`), Refresh, Overflow actions

### B. Unified Telemetry Strip
- **Class**: `.sgp-telemetry-cluster`
- **Surface**: Single unified capsule container (`var(--map-chrome-mist-strong)`, `border-radius: 9999px`)
- **Structure**:
  `● Bình thường | 0/12 hoàn tất | 12 chưa ghi | Phân tích →`
- **Separators**: Discrete 1px vertical dividers (`var(--map-border-soft)`)
- **Noise Elimination**: Replaced 5 individual white floating pills with one calm operational bar.

### C. Search & Filter Action Group
- **Class**: `.sgp-scene-action-hud`
- **Buttons**: `.sgp-map-icon-btn`, `.sgp-filter-trigger-btn`
- **Hit Target**: $\ge 44\text{px}$ (`min-width: 44px; min-height: 44px`)
- **State Behavior**: Collapsed floating action buttons by default; expands inline on click without clipping or layout shifts.

### D. Timeline & Legend HUD
- **Classes**: `.sgp-round-hud-pill`, `.sgp-legend-toggle`
- **Surface**: `var(--map-hud-dark)` with `color: #F8FAFC`
- **Visual Feel**: Deep nautical translucent HUD matching shipboard bridge consoles.

### E. Softer Zone Presentation Boundaries
- **Stroke Width**: `2.0px` (default), `2.5px` (hover/selected)
- **Fill Opacity**:
  - Default: `0.08` (8% tint)
  - Hover: `0.14` (14% tint)
  - Selected: `0.20` (20% tint)
  - Dimmed: `0.04` (4% tint)
- **Stroke Opacity**:
  - Default: `0.70`
  - Hover: `0.90`
  - Selected: `1.00`
  - Dimmed: `0.30`
- **Stroke Caps / Joins**: `round` for smooth perimeter rendering over satellite tiles.
