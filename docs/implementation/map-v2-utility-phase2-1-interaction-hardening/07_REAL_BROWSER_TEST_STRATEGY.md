# 07 — Real Browser Test Strategy & Removal of Test Workarounds

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: ZERO SYNTHETIC DOM DISPATCH WORKAROUNDS

---

## 1. Deprecation and Removal of Synthetic Event Workarounds

In Phase 2, a temporary workaround was employed in `scripts/capture_phase2_evidence_and_video.mjs`:
```javascript
// LEGACY WORKAROUND (Phase 2):
async function clickNode(page, nodeId) {
  await page.$eval(`#node-${nodeId}`, el => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}
```

### Why this Workaround was Unacceptable for Phase 2.1
- **Fails to test real browser hit-testing**: `dispatchEvent` bypasses CSS `pointer-events`, z-order occlusions, stacking contexts, and transform calculations.
- **Fails to test drag vs click coexistence**: `dispatchEvent` does not fire the native `mousedown` / `mouseup` sequence, hiding race conditions with canvas drag handlers.
- **Fragile automation**: Acceptance tests relying on synthetic event dispatch provide false confidence that a user with a real mouse/touchscreen can interact with the product.

### The New Standard in Phase 2.1
In `scripts/capture_phase2_1_real_click_evidence.mjs` and all future Map V2 acceptance suites:
```javascript
// HARDENED NATIVE CLICK (Phase 2.1):
await page.locator('#node-SIM-EXT-GRID').click();
await page.locator('#node-SIM-FDR-CENTER').click(); // SIM-EM-004
```
**Strict Invariant**: Zero instances of `.dispatchEvent` or `.$eval` are permitted in the Phase 2.1 acceptance pipeline (`Test 27 PASS`).

---

## 2. Accessibility-First Playwright Locators

Rather than depending solely on internal DOM structure, tests now prioritize accessibility-oriented selectors reflecting real user intent:

```javascript
// Targeting via role and accessible name:
await page.getByRole('button', { name: /SIM-EM-004/ }).click();
await page.getByRole('button', { name: /Mở mạng điện mô phỏng/ }).click();
```

Benefits:
1. **Validates Semantic Tree**: Proves that screen readers and browser accessibility engines perceive the node as an interactive button.
2. **Robust Against Internal Refactors**: Changing internal SVG markup (e.g. from `<polygon>` to `<path>`) does not break automated tests.

---

## 3. ElementFromPoint Hit-Test Diagnostic Grid

To prove that the browser's graphics rendering engine accurately routes pointer coordinates to the intended node, `capture_phase2_1_real_click_evidence.mjs` computes `document.elementFromPoint(cx, cy)` for critical nodes across both Technical Light and Neon modes:

```javascript
const box = await page.locator(`#node-${actualId}`).boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
const info = await page.evaluate(({ cx, cy }) => {
  const el = document.elementFromPoint(cx, cy);
  return {
    tagName: el.tagName,
    pointerEvents: window.getComputedStyle(el).pointerEvents,
    nearestButtonId: el.closest('[role="button"]')?.id || null,
  };
}, { cx, cy });

assert.equal(info.nearestButtonId, `node-${actualId}`);
```

All audited nodes (`SIM-EXT-GRID`, `SIM-CITY-WATER`, `SIM-EM-004`, `SIM-WM-003`, `SIM-EM-001`) pass this assertion with 100% precision.
