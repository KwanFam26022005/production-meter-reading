# Saigon Port Design System — MASTER Specification
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Document Version:** 2.0.0 (Operations V2 Foundation)  
**Authoritative References:** `frontend/DESIGN_DNA.md`, `.agent/skills/saigon-port-ui/SKILL.md`, `.agent/skills/saigon-port-admin-responsive/SKILL.md`, `.agents/skills/ui-ux-pro-max/SKILL.md`

---

## 1. Authority & Governance Hierarchy

All user interface decisions in the Saigon Port production application must adhere to this strict 5-level precedence hierarchy:

```
┌───────────────────────────────────────────────────────────┐
│ LEVEL 1: PRODUCT & DOMAIN CONTRACTS                      │
│ (docs/contracts/ - 9A, 9B, 9C, 9D, Map V2)                │
│ -> OWNS BUSINESS TRUTH & DATA INTEGRITY                   │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│ LEVEL 2: SAIGON PORT CORPORATE IDENTITY                  │
│ (frontend/DESIGN_DNA.md)                                  │
│ -> OWNS CORPORATE DRESSCODE & SOURCE BRAND PALETTE        │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│ LEVEL 3: DOMAIN UI SKILLS                                │
│ (saigon-port-ui, saigon-port-admin-responsive, map-v2)     │
│ -> OWNS PORT-SPECIFIC ERGONOMICS & WORKSPACE BEHAVIOR     │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│ LEVEL 4: UI UX PRO MAX REASONING LAYER                    │
│ (.agents/skills/ui-ux-pro-max/)                           │
│ -> ADVANCED DESIGN SYSTEM REASONING, COMPOSITION, DENSITY │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│ LEVEL 5: PAGE-SPECIFIC WORKSPACE OVERRIDES               │
│ (design-system/saigon-port/pages/*.md)                    │
│ -> WORKSPACE-LOCAL TUNING & WORKFLOW-SPECIFIC HEURISTICS  │
└───────────────────────────────────────────────────────────┘
```

> **Rule of Precedence:** Lower levels may refine or enrich, but may NEVER override higher-level business truth, brand dresscode, or domain invariants.

---

## 2. Immutable Brand Dresscode & Source Palette

The corporate palette defined in [`frontend/DESIGN_DNA.md`](file:///frontend/DESIGN_DNA.md) is legally binding and immutable. UI UX Pro Max must design **inside** this palette.

### 2.1 Corporate Primitives
- **Corporate Navy:** `#003875` — Header banner, primary actions, high-emphasis text, brand anchors.
- **Corporate Blue:** `#415C94` — Secondary interactive elements, active rail states, supporting chrome.
- **Corporate Yellow:** `#FCC959` — Accent alerts, pending drafts, warning badges.  
  *Strict Brand Law:* **White text on Corporate Yellow is strictly forbidden.** Must use `#181818` or `#003875`.
- **Corporate Orange:** `#F39200` — High-priority notifications, shift indicators.  
  *Strict Brand Law:* **White text on Corporate Orange is strictly forbidden.** Must use `#181818`.
- **Corporate Digital Blue:** `#0068FF` — Focus indicators, active navigation tabs, interactive links.
- **Corporate White:** `#FFFFFF` — Primary container cards, dialog bodies, elevated surfaces.
- **Corporate Porcelain:** `#FCFCFC` / `#F8F9FA` — Workspace canvas backgrounds.

### 2.2 Functional Semantic Status Tokens
Decoupled from brand identity to guarantee unambiguous status communication:
- **Success:** Solid `#167A5A`, Background `#EAF6F1`, Border `#A3D9C9` (Confirmed readings, healthy shifts).
- **Warning:** Solid `#A86200`, Background `#FFF4DF`, Border `#FCD89C` (Exceptions, pending review, draft changes).
- **Danger:** Solid `#B43A3A`, Background `#FCECEC`, Border `#F8B4B4` (Conflicts, overdue tasks, invalid inputs).
- **Neutral / Idle:** Solid `#5E5B5B`, Background `#F1F3F5`, Border `#E5E7EB` (Unscheduled, past rounds, inactive).

---

## 3. Neutral Interface System & Surface Hierarchy

To prevent visual fatigue in high-density operational workspaces, 80% of interface surfaces remain neutral:

```
┌────────────────────────────────────────────────────────┐
│ Level 0: App Canvas (#F8F9FA)                          │
│   ┌──────────────────────────────────────────────────┐ │
│   │ Level 1: Workspace Panel / Card (#FFFFFF)        │ │
│   │   ┌────────────────────────────────────────────┐ │ │
│   │   │ Level 2: Sub-toolbar / Table Head (#F1F3F5)│ │ │
│   │   │   ┌──────────────────────────────────────┐ │ │ │
│   │   │   │ Level 3: Interactive Cell / Pill     │ │ │ │
│   │   │   └──────────────────────────────────────┘ │ │ │
│   │   └────────────────────────────────────────────┘ │ │
│   └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **Canvas (Level 0):** `#F8F9FA` or `#FCFCFC` — Root app background.
- **Surface (Level 1):** `#FFFFFF` with 1px border `#E5E7EB` and subtle shadow `0 1px 3px rgba(0,0,0,0.05)`.
- **Muted Surface (Level 2):** `#F1F3F5` — Table headers, filter bars, segmented control tracks.
- **Elevated Overlay (Level 4):** `#FFFFFF` with shadow `0 10px 25px -5px rgba(0, 56, 117, 0.15)` — Popovers, modals, flyout drawers.

---

## 4. Spacing Rhythm & Density Levels

Adheres to a 4px/8px modular rhythm optimized for industrial data density:

| Token | Value | Operational Application |
| :--- | :--- | :--- |
| `--space-2xs` | 2px | Micro-pill padding, inline status dots |
| `--space-xs` | 4px | Dense cell padding, icon-text gap |
| `--space-sm` | 8px | Control inner padding, filter chip gaps, grid gutters |
| `--space-md` | 12px | Card padding, toolbar horizontal spacing, table row gap |
| `--space-lg` | 16px | Container padding, modal header/footer gutters |
| `--space-xl` | 24px | Section separation, dashboard widget spacing |
| `--space-2xl` | 32px | Page header bottom margin |

### 4.1 Density Standards
- **High-Density (Operations Portal Grid / Matrix):** Table row height 36px–40px, cell padding 6px 10px, typography 12px–13px.
- **Comfortable (Admin Asset Registry, Reports Overview):** Table row height 44px–48px, cell padding 10px 14px, typography 13px–14px.
- **Mobile Touch (User Portal):** Minimum target size 48px × 48px, list item height 56px–64px.

---

## 5. Typography Hierarchy

Primary font stack: `Be Vietnam Pro`, `Segoe UI`, `-apple-system`, `sans-serif`.  
Tabular numbers stack: `font-variant-numeric: tabular-nums`.

| Hierarchy Level | Size / Line Height | Weight | Color | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Metric** | 36px–44px / 1.1 | 700 (Bold) | `#003875` (Brand Navy) | Dashboard KPI counts, total consumption |
| **Page Title (H1)** | 20px–22px / 1.25 | 700 (Bold) | `#181818` (High Contrast) | Workspace headers, primary modal titles |
| **Section Header (H2)**| 15px–16px / 1.3 | 600 (Semibold)| `#252525` | Panel titles, table section heads |
| **Body (Default)** | 13px–14px / 1.4 | 400 (Regular) | `#252525` | Table cells, form values, prose |
| **Label / Subtext** | 11px–12px / 1.3 | 500 (Medium) | `#5E5B5B` (Muted) | Field labels, timestamp metadata, badges |
| **Mono / Code** | 12px / 1.4 | 600 (Semibold)| `#003875` | Meter codes (`CT-001`), UUID prefixes |

---

## 6. Component Composition Guidelines

### 6.1 Admin Page Header
- **Layout:** Flex row with `justify-content: space-between`, `align-items: center`.
- **Left Cluster:** Title (H1), Breadcrumb / Date Range Stepper, Contextual Scope Tag.
- **Right Cluster:** Secondary actions (Export, Refresh), separated by 8px from Primary Action CTA (`.btn-primary`).

### 6.2 Filter & Toolbar Composition
- **Rule of Grouping:** Always group controls by function:
  1. *Temporal Group:* Date stepper + Vietnamese date picker.
  2. *Categorical Group:* Shift segmented control (Tất cả, Ca 1, Ca 2, Ca 3).
  3. *Search/Filter Group:* Search input with instant clear + utility toggle.
- **Secondary Filters:** Collapsed behind a progressive disclosure button (`Bộ lọc nâng cao`) to prevent toolbar visual noise.

### 6.3 Data Tables & Matrices
- **Sticky Headers:** Always persistent during vertical scrolling (`position: sticky; top: 0; z-index: 10`).
- **Sticky Freeze Columns:** Employee identity or meter code remains pinned left during horizontal scrolling.
- **Hover States:** Subtle background shift `#F8F9FA` with 150ms ease transition. Never use intense saturated colors on hover.
- **Column Alignment:**
  - Text / Name / Description: Left aligned.
  - Codes / Status / Badges: Center aligned.
  - Numbers / Readings / Deltas: Right aligned with `tabular-nums`.

### 6.4 Forms & Input Controls
- **Input Borders:** 1px solid `#D1D5DB`, hover `#9CA3AF`, focus `#0068FF` with 2px shadow ring `rgba(0, 104, 255, 0.2)`.
- **Validation:** Inline feedback directly below inputs. No floating unpredictable toasts for static form errors.

### 6.5 Dialogs & Modals
- **Viewport Containment:** Dialog max-height bounded to `calc(100vh - 64px)`.
- **Persistent Actions:** Dialog header and footer buttons remain permanently visible; only the dialog body absorbs vertical scrolling.
- **Destructive Actions:** Destructive operations (`Xóa lịch`, `Từ chối`) styled in `.btn-destructive` with secondary confirmation step.

### 6.6 Badges & Status Indicators
- **Shape:** Rounded pill (`border-radius: 9999px`) with padding `2px 8px`.
- **Semantic Pairing:** Always combine an icon (or distinct text label) with color. Never rely on color as the sole conveyor of information.

### 6.7 Empty States
- **Structure:** Single unified card containing:
  1. Minimal monochromatic icon (e.g. calendar, meter, or clipboard).
  2. Clear heading explaining the exact state (e.g., `"Chưa có lượt ghi nào trong ngày"`).
  3. Actionable remediation button (e.g., `"Tạo lượt ghi"`).
- **Prohibition:** Never render a matrix of empty cards or repetitive "—" placeholder rows.

---

## 7. Data Visualization & Chart Standards

UI UX Pro Max data-visualization intelligence governs chart encoding:

### 7.1 Palette for Multi-Series Analytics
Corporate Navy and Yellow alone cannot represent 6 different operational series. The approved data-viz token layer:
- **Series 1 (Primary Baseline):** `#003875` (Corporate Navy)
- **Series 2 (Active Operational):** `#0068FF` (Digital Blue)
- **Series 3 (Auxiliary / Secondary):** `#10B981` (Emerald Green)
- **Series 4 (Highlight / Peak):** `#F39200` (Corporate Orange)
- **Series 5 (Historical Median):** `#64748B` (Slate Gray)
- **Series 6 (Accent Deviation):** `#8B5CF6` (Violet)

### 7.2 Strict Domain Invariants for Charts
- **Never sum electricity (kWh) and water (m³) into a single aggregate series.**
- **Average interval power (kW) must never be labeled as instantaneous demand.**
- **Missing intervals must be rendered as gaps or explicit indicators, never fabricated as zero consumption.**

---

## 8. Responsive & Ergonomic Principles

### 8.1 Desktop Operations Viewport Tiering
- **Compact Desktop (1024×768):** Navigation rail collapses to 80px icon mode; sub-headers stack vertically; table scroll wrappers activate `overflow-x: auto`.
- **Standard Laptop (1366×768):** Full rail navigation (240px); 3-column dashboard; tables show primary + secondary metadata.
- **Full HD (1920×1080):** High-density expanded view; side-by-side inspection panels; split roster matrix.

### 8.2 Ergonomic Invariants
- Zero horizontal page-level scrollbars at any supported resolution.
- Touch targets on mobile User Portal ≥ 48px × 48px.
- Focus rings visible on all interactive elements (`focus-visible: outline 2px solid #0068FF`).
