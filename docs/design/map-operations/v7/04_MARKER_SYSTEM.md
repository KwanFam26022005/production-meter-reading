# 04. MARKER SYSTEM & VISUAL LANGUAGE
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Shape Language Distinction (Section 16)

To eliminate the visual ambiguity between users and assets, strict shape discipline is enforced:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     OPERATOR    │       │      METER      │       │     EXCEPTION   │
│     (CIRCLE)    │       │(ROUNDED HEXAGON)│       │   (TRIANGLE)    │
│                 │       │                 │       │                 │
│      ◜███◝      │       │      /───\      │       │       ▲         │
│     │  NA │     │       │     | ⏱️  |     │       │      /!\        │
│      ◟███◞      │       │      \___/      │       │     ─────       │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

| Entity Type | Geometric Primitive | Visual Composition | Primary Glyph |
|---|---|---|---|
| **Responsible Operator** | **Circle** (`r=18px`) | Circular avatar disc + outer shift progress ring + top-right exception badge | Person initials / avatar |
| **Operational Meter** | **Rounded Hexagon** / Industrial Square (`24x24px`) | White outer separation halo + navy structural bezel + semantic core | **Industrial Gauge Icon** (analog dial & needle) |
| **Operational Exception** | **Rounded Triangle / Capsule** | Amber/Red high-visibility badge | Alert Triangle (`!`) |

---

### 2. Operator Marker System

- **Center Disc**: Dark navy background (`#073B5C`) with bold white employee initials (e.g. `NA`, `PK`, `PA`).
- **Outer Progress Ring**: Represents **Current-Shift Completion (0–100%)** using an SVG circular dash-offset track.
  - Ring stroke: Active Teal (`#0E7490`) or Selected Blue (`#0284C7`).
  - Track stroke: Neutral slate (`#E2E8F0`).
- **Progress Pill**: Compact badge below marker rendering percentage (e.g. `67%`).
- **Issue Badge**: Floating circle at top-right indicating unresolved exceptions in the operator's jurisdiction (`Red` for overdue, `Amber` for review).
- **Recalibrated Anchors**:
  - `zone-berth`: `{ x: 800, y: 445 }` (Quayside apron whitespace).
  - `zone-warehouse`: `{ x: 495, y: 535 }` (Open asphalt corridor between sheds).
  - `zone-container`: `{ x: 1140, y: 525 }` (Staging apron corridor south of container block 2).
  - `zone-technical`: `{ x: 990, y: 775 }` (Recalibrated courtyard lawn, **clearing the Cổng chính gate entrance label by >45px**).

---

### 3. Meter Marker Visual States (Section 17)

All meters render a dedicated SVG rounded hexagon with a white separation halo, ensuring clear separation against complex container/crane backgrounds:

| Semantic State | Core Fill Hex | Halo / Border | Glyph / Accent | Pulse Behavior |
|---|---|---|---|---|
| **CONFIRMED** | `#10B981` (Emerald Green) | 1.5px White halo | Clean Gauge Dial | Static calm |
| **DUE** | `#0284C7` (Operational Blue) | 1.5px White halo | Gauge Dial + clock tick | Subtle glow |
| **REVIEW** | `#F59E0B` (Amber Warning) | 1.8px White halo | Gauge Dial + Caution accent | Pulsing Amber Ring |
| **OVERDUE** | `#EF4444` (Critical Red) | 2.0px White halo | Gauge Dial + Alert accent | Pulsing Red Ring |
| **PENDING** | `#64748B` (Neutral Slate) | 1.5px White halo | Muted Gauge Dial | Static calm |
| **INACTIVE** | `#94A3B8` (Muted Gray) | 1.0px Gray halo | Muted slash | Static dim |

---

### 4. Selection & Hover Dynamics

- **Default State**: Code plates are hidden to prevent visual clutter across the port.
- **Hover State**: Small tooltip / pill appears displaying `CT-XXX` and semantic label.
- **Selected State**: Larger white halo ring (`r=22px`), prominent CT-code badge plate anchored directly above the marker, and `MeterQuickPopup` anchored with arrow pointer.
