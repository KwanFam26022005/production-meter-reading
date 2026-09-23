# 05 — Focus Management & Visual Focus Ring Verification

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: WCAG 2.1 AA / AAA COMPLIANT

---

## 1. Visual Focus Indicators

In accordance with WCAG 2.1 Success Criterion 2.4.7 (Focus Visible) and `saigon-port-ui` maritime aesthetics:

### Technical Light Mode
- **Focus Ring**: High-contrast double outline (`2.4px` outer ring, `#002B5B` Maritime Navy with `1.5px` offset buffer).
- **Luminance Contrast**: Exceeds `7:1` against Porcelain `#F4F6F9` background.
- **Evidence**: `03-electric-source-focused.png`, `04-water-source-focused.png`, `05-meter-focused-light.png`.

### Digital Twin / Neon Mode
- **Focus Ring**: Electric Cyan `#00F0FF` with high-intensity outer glow (`#00F0FF 0 0 10px`).
- **Luminance Contrast**: Exceeds `12:1` against Dark Cyber `#06132B` background.
- **Evidence**: `06-meter-focused-neon.png`.

---

## 2. Focus Lifecycle Invariants

| State Transition | Focus Behavior | Invariant Enforced |
|---|---|---|
| Initial Load (Off) | Focus remains in document header. | No hidden utility nodes in tab order. |
| Utility Selected (Collapsed) | Source node receives focus or participates in standard tab order. | Source node has `tabIndex={0}`. |
| Expand in Progress | Focused source maintains focus without loss. | Active focus is never stolen by rAF scheduler. |
| Fully Expanded | Meters enter tab order sequentially by graph depth and ID. | Predictable, intuitive navigation flow. |
| Trace Active | Focused meter retains focus; visual halo confirms active trace. | Single focused entity rule preserved. |
| Retract in Progress | If a collapsing meter was focused, focus safely returns to the surviving source node (`SIM-EXT-GRID` or `SIM-CITY-WATER`). | **No focus dropping to document body (`document.body`)**. |
| Mode Switched (Điện -> Nước) | Old network cleanly cancels and unmounts; focus transfers cleanly to new source. | Zero dangling or stale SVG focus rings. |
| Utility Off | Focus safely restores to the Utility Mode toolbar segmented control. | Accessible roundtrip navigation. |

---

## 3. Keyboard Activation Flow

1. User presses `Tab` to navigate to `#node-SIM-EXT-GRID`.
2. Focused diamond displays prominent focus ring.
3. User presses `Enter` or `Space` -> network triggers `handleSourceClick()`.
4. Network expands depth-first.
5. User presses `Tab` -> moves sequentially across visible distribution cabinets and meters.
6. User presses `Enter` on `#node-SIM-FDR-CENTER` (`SIM-EM-004`) -> trace path lights up from source to meter.
7. User presses `Tab` to navigate back to source and presses `Space` -> network cleanly retracts. Focus is retained on the source node.
