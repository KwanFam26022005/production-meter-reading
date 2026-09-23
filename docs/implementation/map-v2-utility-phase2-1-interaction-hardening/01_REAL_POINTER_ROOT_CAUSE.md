# 01 — Real Pointer Interaction Root Cause Analysis

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Target Node**: `#node-SIM-EXT-GRID` / `#node-SIM-CITY-WATER` / Meter Nodes  
**Status**: RESOLVED & HARDENED

---

## 1. Executive Summary

During Phase 2, test automation scripts encountered an issue where Playwright's native `page.locator('#node-SIM-EXT-GRID').click()` did not reliably trigger network expansion, prompting the temporary introduction of a synthetic DOM event workaround:
```javascript
// Temporary workaround introduced in Phase 2:
await page.$eval(`#node-${nodeId}`, el => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
```

This Phase 2.1 hardening pass conducted a rigorous diagnostic (`scripts/diagnose_real_click_failure.mjs`) analyzing `document.elementFromPoint`, computed pointer-events, SVG DOM hierarchy, and event propagation.

The diagnostic revealed two distinct, compounding root causes:
1. **Canvas Container Mousedown Drag Ambiguity**: The outer canvas container (`MapV2Canvas.tsx`) immediately set state `isDragging = true` on `mousedown`. This caused the child SVG element to immediately receive `style={{ pointerEvents: isDragging ? 'none' : 'auto' }}`, setting `pointer-events: none` on the entire SVG tree *during* the mouse press, thereby dropping the subsequent native browser `click` event.
2. **SVG Child Hit-Target Fragmenting**: Inside the node's `<g>` container, visible decorative `<polygon>`, `<rect>`, and `<g>` tags did not have `pointer-events: none`. Although mouse clicks bubbled through them to the `<g>` listener, hover transitions and sub-pixel edge clicks caused hit fragmentation and focus ring disruption.

---

## 2. Detailed Technical Breakdown

### A. The Primary Culprit: Premature `isDragging = true` in `MapV2Canvas.tsx`

In `MapV2Canvas.tsx`:
```tsx
// Before Hardening:
const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  setIsDragging(true); // <--- ROOT CAUSE 1: React re-render triggered on mousedown
  hasMovedRef.current = false;
  dragStartRef.current = { x: e.clientX, y: e.clientY };
};

// SVG Root Element:
<svg
  width="100%"
  height="100%"
  style={{ display: 'block', pointerEvents: isDragging ? 'none' : 'auto' }} // <--- Becomes 'none' immediately!
>
```

#### Why `dispatchEvent` Bypassed the Problem
`dispatchEvent` directly dispatches an artificial DOM event directly to the target DOM node without firing a `mousedown` sequence through the browser's hit-testing pipeline. As a result:
- No `mousedown` was received by `MapV2Canvas.tsx`.
- `isDragging` remained `false`.
- The SVG remained `pointer-events: auto`.
- The synthetic `click` was processed immediately by React.

When Playwright's native `locator.click()` was called:
1. Playwright moves the mouse cursor to the calculated center of the target element.
2. Playwright sends a real OS-level `mousedown` event.
3. The event bubbles up to the container `<div>`, executing `handleMouseDown`.
4. `setIsDragging(true)` queues an immediate React state update.
5. In the next frame, the SVG receives `pointer-events: none`.
6. Playwright sends the OS-level `mouseup` and `click` events.
7. Because the SVG now has `pointer-events: none`, the browser hit-tests the background `<div>` instead of the SVG node!
8. The SVG node never receives the `click` event!

---

### B. The Secondary Culprit: Decorative Child Shapes with `pointer-events: auto`

In `MapV2UtilityLayer.tsx`:
```tsx
// Before Hardening:
<g id="node-SIM-EXT-GRID" onClick={...}>
  <circle r={24} fill="transparent" /> {/* Hit circle */}
  <g>
    <polygon points="..." fill={...} /> {/* Center core with pointer-events: auto */}
    <g transform="...">
      <rect ... />
      <text ...>{node.id}</text>
    </g>
  </g>
</g>
```
When `elementFromPoint` was inspected at the exact center (666, 608):
- Topmost hit element: `<polygon>` (tag: polygon, pointerEvents: auto)
- Subtree hierarchy: `polygon > g > g#node-SIM-EXT-GRID`

Because the polygon intercepted pointer events, browser focus and hover states flickered if the cursor moved across the polygon boundary.

---

## 3. Resolution Architecture

### 1. Deferred Drag State via `mouseIsDownRef`
In `MapV2Canvas.tsx`, `isDragging` is now strictly decoupled from `mousedown`:
```tsx
const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
const hasMovedRef = useRef<boolean>(false);
const mouseIsDownRef = useRef<boolean>(false); // Track mousedown without triggering re-render

const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  mouseIsDownRef.current = true;
  hasMovedRef.current = false;
  dragStartRef.current = { x: e.clientX, y: e.clientY };
  // Notice: do NOT call setIsDragging(true) here!
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!mouseIsDownRef.current) return;
  const dx = e.clientX - dragStartRef.current.x;
  const dy = e.clientY - dragStartRef.current.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    if (!isDragging) setIsDragging(true); // Only transition to dragging after 4px movement!
    hasMovedRef.current = true;
    setCameraState('MANUAL_VIEW');
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }
};

const handleMouseUp = () => {
  mouseIsDownRef.current = false;
  setIsDragging(false);
};
```
**Outcome**: A standard mouse click never exceeds the 4px threshold, `isDragging` remains `false`, the SVG maintains `pointer-events: auto` throughout the entire interaction, and the native `click` event fires reliably.

### 2. Single Explicit Hit Target with `pointerEvents="all"`
In `MapV2UtilityLayer.tsx`:
- Dedicated transparent hit circle: `<circle r={24} fill="transparent" pointerEvents="all" />`
- All visible decorative groups (Sections A, B, C, D): `<g pointerEvents="none">`
- Tooltip group: `<g style={{ pointerEvents: 'none' }}>`

**Outcome**: All pointer interactions land squarely on the 48px hit target, providing reliable, deterministic native click handling.
