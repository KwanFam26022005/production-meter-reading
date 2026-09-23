# Remaining Issues & Future Considerations

## 1. Current Defect Status

All three primary user-reported issues have been completely resolved and verified:
- **Issue A (Incorrect initial camera framing)**: **RESOLVED**. Full-canvas operational framing elevates port facilities into view with proportional river context across all laptop and desktop viewports.
- **Issue B (Growing rectangular frame on zone selection)**: **RESOLVED**. Default browser outline on SVG anchor group suppressed; transform origin centered; zero dimensional expansion over time.
- **Issue C (Floating circles across river and yards)**: **RESOLVED**. Perpetual unselected radar pulse animations removed; radar circle strictly scoped to selected zone with `transform-box: fill-box`.

---

## 2. Technical Observations & Edge Cases

### 2.1 Ultra-Narrow / Mobile Viewports ($W < 640\text{px}$)
- **Current Behavior**: Map V2 is specifically designed for the Port Operations Desk (laptops and multi-monitor desktop workstations, minimum width $1280\text{px}$). On ultra-narrow screens ($<640\text{px}$), the scale factor produces a compact map that requires horizontal panning to inspect peripheral gates.
- **Recommendation**: For field meter readers using mobile phones, the dedicated User Portal (`UserApp.tsx`) and Map V1 mobile cards remain the optimal interface.

### 2.2 Operator Custom View Presets (Future Enhancement)
- Currently, Map V2 provides two standard framing presets: "Tràn chiều rộng" (Fit Width) and "Fit toàn bộ" (Contain All), plus "Đặt lại góc nhìn" (Reset View).
- If operations personnel require saving custom camera bookmarks (e.g., "Crane Berth 3 Focus" or "Substation 2 Cluster"), a persistent `localStorage` camera preset feature could be added in a future milestone without altering the core framing math.

---

## 3. Residual Risk Assessment

| Risk Area | Probability | Severity | Mitigation / Safeguard |
|:---|:---|:---|:---|
| **Cross-browser focus outline variance** | Low | Low | Fully neutralized via `.map-v2-anchor-group:focus { outline: none; }` and `.map-v2-anchor-group:focus-visible { outline: none; }` with explicit accessible badge ring. |
| **SVG transform matrix overflow** | Negligible | Low | Confined via `transform-box: fill-box; transform-origin: center;` in CSS standard. |
| **User Portal regression** | None | High | Zero modifications made to User Portal codebase; verified via automated bundle separation script. |
