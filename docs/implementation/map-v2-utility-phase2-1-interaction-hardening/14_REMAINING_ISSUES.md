# 14 — Remaining Issues & Future Evolution

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: ZERO BLOCKING DEFECTS

---

## 1. Resolved Issues in Phase 2.1

1. **Synthetic Click Workaround**:
   - *Previous State*: Acceptance tests relied on `$eval` + `dispatchEvent(new MouseEvent('click'))`.
   - *Current State*: Completely removed from acceptance pipeline. 100% real browser clicks via `page.locator().click()` and `page.getByRole().click()`.
2. **Premature Canvas Drag**:
   - *Previous State*: Canvas `mousedown` immediately set `isDragging = true`, triggering SVG `pointer-events: none` and dropping real clicks.
   - *Current State*: Decoupled via `mouseIsDownRef`; drag state only engages after exceeding a 4px Manhattan movement threshold.
3. **SVG Child Hit-Target Fragmenting**:
   - *Previous State*: Visible `<polygon>` and `<rect>` elements had `pointer-events: auto`, intercepting hit tests.
   - *Current State*: Explicit `<circle r={24} pointerEvents="all">` receives all clicks; decorative children have `pointerEvents="none"`.
4. **Tooltip Occlusion**:
   - *Previous State*: Risk of hover tooltips blocking subsequent clicks on node centers.
   - *Current State*: Tooltips enforce `style={{ pointerEvents: 'none' }}`.

---

## 2. Low-Priority Considerations for Phase 3 (Production Telemetry Integration)

1. **Live WebSocket Telemetry**:
   - Currently, network flow animations reflect simulated static topology. When live smart meter feeds are connected in Phase 3, edge pulse speeds could dynamically correlate with real-time amperage / water flow rate.
2. **Pinch-to-Zoom Gesture Smoothing on Trackpads**:
   - Map wheel zoom currently operates smoothly via delta steps. Native two-finger pinch-to-zoom on iOS/macOS trackpads could be enhanced with gesture momentum smoothing.
3. **Accessibility Announcement Live Region**:
   - When a user traces a meter, an `aria-live="polite"` region could verbally announce: `"Tuyến cấp nguồn từ Trạm biến áp TR-01 đến Đồng hồ SIM-EM-004 đã được kích hoạt"`.

---

## 3. Residual Risk Assessment

- **Database Integrity**: Risk = 0% (Strict read-only posture maintained throughout; zero SQLite writes, zero schema migrations).
- **Presentation Geometry**: Risk = 0% (Layout B2 hash strictly verified at `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`).
- **Map V1 / User Portal**: Risk = 0% (Complete architectural isolation preserved).
