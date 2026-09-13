# V15 — Accessibility & Reduced-Motion Specification

## 1. Reduced Motion Contract (`prefers-reduced-motion: reduce`)
When the user or operating system has enabled reduced motion:

1. **CSS Overrides (`mapMotion.css`)**:
   - Disables all keyframe animations: `sgpTargetWaveScale`, `sgpActivityArcRotate`, `sgpOverdueHeartbeat`, `sgpCompletedSweep`, `sgpReviewDoubleRing`.
   - Transitions on `transform`, `stroke-dashoffset`, and `opacity` are collapsed to `none` or `0.001ms`.

2. **React Logic (`usePrefersReducedMotion()`)**:
   - `MeterActivityEffect` disables rendering of animated wave rings and spinning arcs; displays static crisp indicator rings.
   - `OperatorActivityEffect` renders static focus cues without rotating elements.
   - `RouteLayer` removes the animated dash-offset effect along the selected route corridor.
   - Operator progress updates immediately to new values without intermediate animation.

---

## 2. Multi-Modal State Indication (WCAG 2.1 AA)
Visual state is NEVER communicated by color or animation alone:

- **Pending**: Slate core (`#64748B`), hexagon silhouette, standard touch target.
- **Reading**: Brighter cyan core (`#00E5FF`), rotating arc, distinct ARIA label: *"Công tơ [mã], [khu vực], đang ghi"*.
- **Completed**: Emerald core (`#10B981`), white check glyph icon, ARIA label: *"Công tơ [mã], [khu vực], đã hoàn tất"*.
- **Overdue**: Critical red core (`#EF4444`), triangle alert badge with exclamation icon, ARIA label: *"Công tơ [mã], [khu vực], quá hạn lượt ghi"*.
- **Review**: Amber warning core (`#F59E0B`), double ring and warning glyph, ARIA label: *"Công tơ [mã], [khu vực], cần rà soát chỉ số"*.

---

## 3. Keyboard Navigation & Hit Targets
- Keyboard focus (`Tab`, `Enter`, `Space`) operates strictly on canonical entity identity, independent of animation coordinates.
- Screen touch targets maintain $\ge 44\text{px}$ diameter (`r = 22 / lodScale`) across all zoom levels and LOD scales.
