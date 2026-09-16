# V16E — VISUAL DESIGN SYSTEM & TOKENS FREEZE

## 1. Maritime Operational Minimalism Philosophy

The visual design system for V16E strictly abides by the **Maritime Operational Minimalism** dress code established across Tan Thuan Port operational tools:
- **Calm, High-Contrast Palette**: Off-white/slate backgrounds (`#F6F8F9`, `#FFFFFF`), deep maritime navies (`#073B5C`, `#0B4F75`, `#12658F`), slate text (`#1E293B`, `#475569`, `#64748B`), and crisp borders (`#D7E0E5`, `#CBD5E1`).
- **Strict Color Semantics**:
  - **Red (`#DC2626`, `#EF4444`) is strictly reserved for DANGER/CRITICAL ERRORS**. It is **NEVER** used for `UNVERIFIED` items, warnings, or secondary statuses.
  - **Amber / Ochre (`#D97706`, `#B45309`)** is used for unverified items, review-required flags, and calibration warnings.
  - **Emerald (`#059669`)** is used for verified assets, normal operating states, and successful validations.
- **Motion Restraint**: Zero continuous spinning, zero looping electric particle streams, zero fake 3D glows. Transitions are bounded to `150ms–220ms ease-out`.

---

## 2. Token Palette Definition

### A. Surfaces & Canvases
| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `surface-canvas-bg` | `#F6F8F9` | Default background for the network topology canvas and page backdrop |
| `surface-panel-bg` | `#FFFFFF` | Background for context surfaces, floating toolbars, and inspection cards |
| `surface-muted` | `#F1F5F9` | Neutral sub-containers, table headers, and inactive badge pills |
| `border-subtle` | `#D7E0E5` | Default card borders, divider lines, and subtle SVG grid markers |
| `border-contrast` | `#CBD5E1` | Interactive borders, button strokes, and selection halos |

### B. Utility Network Semantic Colors
| Utility Type | Line Stroke | Node Fill | Node Stroke | Icon Color | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ELECTRICITY** | `#073B5C` | `#F8FAFC` | `#073B5C` | `#073B5C` | Electrical distribution (Substation, Transformer, Switchboard, Feeder) |
| **WATER** | `#12658F` | `#F0F9FF` | `#12658F` | `#12658F` | Industrial & domestic water supply (Pump, Valve, Water Point) |
| **UNVERIFIED (Preview)** | `#D97706` (dashed) | `#FEF3C7` | `#D97706` | `#B45309` | Unverified candidates pending admin review |

### C. Typography & Hierarchy
| Hierarchy Level | Font Family | Size / Line Height | Weight | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Title / Heading** | Inter, system-ui | 16px / 22px | 700 (Semi-bold) | `#0F172A` |
| **Subheading / Section** | Inter, system-ui | 13px / 18px | 600 (Medium) | `#1E293B` |
| **Body / Labels** | Inter, system-ui | 12px / 16px | 500 (Regular) | `#334155` |
| **Monospace / Codes** | 'JetBrains Mono', Consolas | 12px / 16px | 600 (Medium) | `#073B5C` |
| **Micro / Metadata** | Inter, system-ui | 11px / 14px | 400 (Light) | `#64748B` |

---

## 3. Component Glyphs & SVG Symbols

All asset glyphs are 2D geometric vector primitives adhering to maritime operational standards:

```svg
<!-- Substation / Transformer: Concentric Hexagon / Coils -->
<polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="#F8FAFC" stroke="#073B5C" stroke-width="2"/>
<path d="M13 3 L7 12 L11 12 L9 20 L17 10 L13 10 Z" fill="#073B5C"/>

<!-- Switchboard / Distribution Board: Shield with Breakers -->
<rect x="3" y="3" width="18" height="18" rx="2" fill="#F8FAFC" stroke="#073B5C" stroke-width="2"/>
<line x1="8" y1="7" x2="8" y2="17" stroke="#073B5C" stroke-width="1.5"/>
<line x1="16" y1="7" x2="16" y2="17" stroke="#073B5C" stroke-width="1.5"/>

<!-- Water Pump / Valve: Fluid Circle with Impeller / Droplet -->
<circle cx="12" cy="12" r="9" fill="#F0F9FF" stroke="#12658F" stroke-width="2"/>
<path d="M12 4 C10 8 7 11 7 14 C7 17 9.2 19 12 19 C14.8 19 17 17 17 14 C17 11 14 8 12 4 Z" fill="#12658F"/>
```

---

## 4. Visual Design Freeze Invariants

1. **No Neon / Glowing CSS Filters**: `box-shadow` is limited to subtle maritime elevations (e.g., `0 2px 8px rgba(7,59,92,0.08)`). Glow filters (`drop-shadow(0 0 10px ...)`) are strictly prohibited.
2. **Deterministic Stroke Widths**:
   - Standard verified feeder line: `2.0px`.
   - Selected / highlighted trace line: `3.0px`.
   - Dimmed inactive line: `1.0px` at `0.22` opacity.
   - Unverified line: `2.0px` with `stroke-dasharray: 4,3`.
3. **Canonical Boundary Preservation**: All spatial visual rendering operates within the canonical coordinate boundary `(1915 × 821)`.
