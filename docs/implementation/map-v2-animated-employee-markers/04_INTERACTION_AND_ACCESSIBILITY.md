# Map V2 Animated Employee Markers — 04. Interaction & Accessibility

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Components:** `MapV2EmployeeMarker.tsx`, `MapV2InspectionPanel.tsx`, `MapV2Canvas.tsx`  

---

## 1. Approved Three-State Interaction Lifecycle

The implementation strictly delivers the approved interaction model:

```text
Default (Ambient Slow Movement)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
 Hover / Focus (Paused)           Selected (Frozen)
   - Movement halts                 - Marker completely frozen
   - Level 2 preview card           - Zone polygon highlighted
   - Hit area stable                - Contextual inspector open
       │                                 │
       ▼                                 ▼
 Resume (on mouse leave / blur)    Resume (on deselect / close)
   - Continues from current progress t
```

### 1.1 State 1: Default (Ambient Motion)
- Cycle duration: 8 to 12 seconds per full orbit.
- Velocity: Extremely slow and calm (~2 to 3 px/sec), avoiding distracting flicker or visual noise.
- Design: Dark maritime navy background (`#003875`), crisp white border (`#E2E8F0`), bold avatar initials (`HẢI`, `NAM`, `TUẤN`, `BẢO`), and an accent status dot (`#0284C7`).

### 1.2 State 2: Hover / Keyboard Focus
- Instantly halts animation for that marker.
- Renders Level 2 contextual vector preview card:
  - Header: `NV001 — Nguyễn Văn Hải`
  - Subtitle: `Phân khu: Khu cảng sà lan`
  - Disclaimer: `Chuyển động minh họa khu vực phân công — không phải vị trí GPS.`
  - Call-to-action: `Nhấp hoặc nhấn Enter để chọn`

### 1.3 State 3: Selected
- Marker locks and freezes in position with active selection ring (`#0068FF`).
- Associated zone polygon lights up in the operational reveal layer.
- Contextual `MapV2InspectionPanel` opens docked on the right side:
  - Staff code, full name, zone assignment, duty status, aggregate zone reading progress, and prominent illustrative disclosure callout.
  - Top bar displays `Bỏ chọn` button to cleanly reset selection.

---

## 2. Accessibility & Ergonomics

### 2.1 Keyboard Navigation
- Every employee marker includes `tabIndex={0}` and `role="button"`.
- Keyboard users can Tab through active markers in deterministic order.
- Tabbing to a marker triggers focus pause, keeping it stable.
- Pressing `Enter` or `Space` selects the marker and opens the inspector panel.
- Pressing `Escape` closes the inspector panel and returns focus smoothly.

### 2.2 Touch and Click Bounds
- Minimum visual avatar diameter: 28px ($R = 14\text{px}$).
- Transparent hit target circle: 48px diameter ($R = 24\text{px}$), exceeding WCAG 2.1 AAA touch target standards.

### 2.3 `prefers-reduced-motion` Compliance
- Natively queries `(prefers-reduced-motion: reduce)`.
- When active, all parametric movement loops are suppressed; markers remain statically placed at their zone anchor with zero continuous motion.

### 2.4 HUD Play/Pause Manual Control
- Dedicated bottom-right HUD button (`.map-v2-motion-toggle`) allows operators to pause/resume motion across all markers with a single click.
- Button dynamically switches between Pause icon and Play icon with full ARIA labels.
