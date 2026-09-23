# 10 — Accessibility & Ergonomics Audit (WCAG 2.1 AA)

**Scope:** Keyboard accessibility, focus management, ARIA contracts, and touch ergonomics.

---

## 1. Keyboard Navigation

- **Escape Key Handling:**
  - Registered on `MapV2InspectionPanel.tsx`, `MapV2Layers.tsx`, and `MapV2Workspace.tsx`.
  - Pressing `Escape` closes whichever overlay is currently focused:
    1. Quick Search dropdown
    2. Context Picker popover
    3. Layer Manager popover
    4. Options popover
    5. Docked / Drawer Inspector panel
- **Quick Search Shortcut:**
  - `Ctrl+K` or `/` focuses the search bar from anywhere on the screen.
- **Layer Toggles:**
  - Layer items support `tabIndex={0}` and trigger on `Enter` or `Space`.

---

## 2. ARIA Roles & Screen Reader Attributes

- `MapV2InspectionPanel`:
  - `role="complementary"` in docked mode; `role="dialog"` and `aria-modal="true"` in compact drawer mode.
  - `aria-label="Thông tin chi tiết điểm đo"` / `"Thông tin vận hành phân khu"`.
- `MapV2Layers`:
  - Layer checkboxes carry `role="checkbox"` and `aria-checked={true|false}`.
- Non-blocking degraded banner:
  - Carries `role="alert"` for immediate assistive technology announcement.
- Toast notifications:
  - Carry `role="status"`.

---

## 3. Contrast & Typography

- In accordance with `saigon-port-ui` and `frontend/DESIGN_DNA.md`:
  - Text on Yellow (`#FCC959`) or Orange (`#F39200`) strictly uses dark Navy (`#003875`) or Charcoal (`#181818`), never white.
  - Interactive focus indicators use `--sgp-corporate-digital-blue` (`#0068FF`) with visible outline.
  - Tabular numeric values use `font-variant-numeric: tabular-nums lining-nums`.
