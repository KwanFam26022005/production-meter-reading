# 04 — Keyboard Accessibility Contract

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: VERIFIED & ACCESSIBLE

---

## 1. Keyboard Navigation Model

In accordance with WCAG 2.1 Guideline 2.1 (Keyboard Accessible) and Saigon Port operational accessibility standards, the utility network layer supports complete keyboard navigation without requiring mouse interaction:

- **Sequential Focus (`Tab` / `Shift+Tab`)**:
  - In `collapsed` state, only the active utility source nodes (`SIM-EXT-GRID`, `SIM-CITY-WATER`) participate in the tab order. Collapsed/hidden meters have `tabIndex={-1}` or are unmounted, preventing keyboard clutter.
  - In `expanded` state, interactive meters and active distribution nodes enter the sequential tab order (`tabIndex={0}`).
- **Activation (`Enter` / `Space`)**:
  - Pressing `Enter` or `Space` activates the focused node with semantics identical to a native pointer click.
  - When `Space` is pressed, `e.preventDefault()` is explicitly invoked to prevent page scrolling.

---

## 2. ARIA Semantics & Vietnamese Operational Terminology

In adherence to `saigon-port-ui` domain requirements, all interactive SVG nodes export semantic roles and descriptive Vietnamese accessibility text:

```tsx
<g
  id={`node-${node.id}`}
  role="button"
  tabIndex={0}
  aria-label={
    node.isSource
      ? isSourceCollapsed
        ? `Nguồn ${node.label} (${node.id}) — Nhấp để mở mạng lưới ${isElec ? 'điện' : 'cấp nước'} mô phỏng`
        : `Nguồn ${node.label} (${node.id}) — Nhấp để thu hồi mạng lưới ${isElec ? 'điện' : 'cấp nước'}`
      : node.isMeter
      ? isTargetMeter
        ? `Đồng hồ ${node.meterCode} — Đang truy vết (Nhấp để xóa truy vết)`
        : `Đồng hồ ${node.meterCode || node.id} (${node.label}) — Nhấp để truy vết tuyến nguồn`
      : `${node.label} (${node.id})`
  }
  aria-expanded={node.isSource ? isSourceExpanded : undefined}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (node.isSource) handleSourceClick(node.utilityType);
      else if (node.isMeter) handleMeterClick(node.id, node.utilityType);
    }
  }}
>
```

### State Disclosure via ARIA
- **`role="button"`**: Communicates interactive capability to assistive screen readers.
- **`aria-expanded="true" | "false"`**: Used on source nodes to reflect collapsed vs expanded tree hierarchy.
- **Contextual Label Updates**:
  - Before expand: `Nguồn Điện lưới Ngoài Cảng (SIM-EXT-GRID) — Nhấp để mở mạng lưới điện mô phỏng`
  - After expand: `Nguồn Điện lưới Ngoài Cảng (SIM-EXT-GRID) — Nhấp để thu hồi mạng lưới điện`
  - Tracing meter: `Đồng hồ SIM-EM-004 — Đang truy vết (Nhấp để xóa truy vết)`

---

## 3. Test Verification

Automated tests in `frontend/tests/mapV2UtilityPhase2_1InteractionHardening.test.ts` verify:
- `Test 18`: Interactive nodes have `role="button"`.
- `Test 19`: Interactive nodes have `tabIndex={0}`.
- `Test 20`: `onKeyDown` handles `Enter` and `Space` with `preventDefault`.
- `Test 21`: Source nodes expose dynamic `aria-expanded`.
- `Test 22`: Source labels contain Vietnamese network terminology (`mạng lưới`).
- `Test 23`: Meter labels contain Vietnamese trace terminology (`truy vết`).
