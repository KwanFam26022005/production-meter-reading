# 03 — Pointer Event Propagation & Layer Audit

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: AUDITED & COMPLIANT

---

## 1. Event Propagation Flow

In Map V2, user interactions travel across multiple hierarchical SVG and HTML layers:

```text
User Pointer Event (mousedown, mouseup, click)
  │
  ▼
Browser Hit-Testing (topmost layer at pointer coordinates)
  │
  ├──► [Layer 5] Context Surface / Tooltips (HTML/SVG Overlay)
  │      └── Must have `pointer-events: none` unless containing interactive inputs.
  │
  ├──► [Layer 4.5] Utility Network Layer (`#layer-utility-demo`)
  │      ├── Explicit Hit Circle (`<circle r={24} pointerEvents="all">`)
  │      │     └── Traps pointer event -> fires native `onClick` on parent `<g>`
  │      └── Decorative Sub-nodes (`<g pointerEvents="none">`)
  │            └── Transparent to pointer testing -> delegates down to hit circle
  │
  ├──► [Layer 4] Operational Anchors & Hotspots (`map-v2-anchor-*`)
  │      └── Accessible click targets for zone inspect and camera focusing
  │
  ├──► [Layer 3] Port Boundary & Roads
  │      └── Non-interactive presentation vectors (`pointer-events: none`)
  │
  ├──► [Layer 2] Zone Polygons (`map-v2-zone-polygon`)
  │      └── Zone hover & click inspection handlers
  │
  └──► [Layer 1] Base Technical Map Image
         └── Canvas background container (`MapV2Canvas.tsx`)
```

---

## 2. Event Handler Audit

A comprehensive audit of event handlers was conducted across `MapV2Canvas.tsx` and `MapV2UtilityLayer.tsx`:

| Component | Target Element | Handler | Purpose | Propagation Policy |
|---|---|---|---|---|
| `MapV2Canvas` | Canvas Wrapper `<div>` | `onMouseDown` | Records `dragStartRef` and sets `mouseIsDownRef.current = true`. | Does NOT stop propagation. Does NOT set `isDragging = true` until > 4px movement. |
| `MapV2Canvas` | Canvas Wrapper `<div>` | `onMouseMove` | Updates pan coordinates when dragging. | Triggers `setIsDragging(true)` only after exceeding 4px threshold. |
| `MapV2Canvas` | Canvas Wrapper `<div>` | `onMouseUp` | Resets `mouseIsDownRef` and `isDragging`. | Clean drag state reset. |
| `MapV2Canvas` | Canvas Wrapper `<div>` | `onClick` | Deselects entity when clicking empty canvas. | Checks `hasMovedRef.current` — ignores click if canvas was dragged. |
| `MapV2Canvas` | Zone Polygon `<polygon>` | `onClick` | Selects zone entity. | Calls `e.stopPropagation()` to prevent triggering empty canvas click. |
| `MapV2Canvas` | Zone Anchor `<g>` | `onClick` | Toggles zone focus. | Calls `e.stopPropagation()` to isolate anchor selection. |
| `MapV2UtilityLayer` | Node `<g id="node-...">` | `onClick` | Executes FSM transition (`handleSourceClick`, `handleMeterClick`). | Fires deterministically; does not invoke drag. |
| `MapV2UtilityLayer` | Node `<g id="node-...">` | `onKeyDown` | Handles `Enter` and `Space`. | Calls `e.preventDefault()` on Space to prevent browser viewport scrolling. |
| `MapV2UtilityLayer` | Tooltip `<g id="utility-tooltip">` | none | Visual data label. | Enforces `style={{ pointerEvents: 'none' }}` to never swallow underlying clicks. |

---

## 3. Tooltip Non-Interference Verification

A common map regression occurs when hovering a node reveals a tooltip, and subsequent clicks hit the tooltip `<rect>` or `<text>` rather than the node itself.

In `MapV2UtilityLayer.tsx`:
```xml
{activeTooltipNode && (
  <g
    id="utility-tooltip"
    transform={`translate(${activeTooltipNode.displayX}, ${activeTooltipNode.displayY - 32})`}
    style={{ pointerEvents: 'none' }}
  >
    <rect ... />
    <text ... />
  </g>
)}
```
Because the entire `<g id="utility-tooltip">` subtree inherits `pointer-events: none`, mouse clicks pass completely unhindered directly to the underlying node hit target. Verified in automated test `Test 17` and visual evidence `10-tooltip-nonblocking-click.png`.

---

## 4. Neon Filter Hit-Testing Safety

When Tone Layer V2 / Neon mode is active:
- SVG filters (`feGaussianBlur`, `feMerge`) are applied to visible strokes via `filter="url(#utility-glow-...)"`.
- **Finding**: SVG filter bounding boxes (`filterUnits="userSpaceOnUse"` or percentage regions `x="-30%" width="160%"`) affect only visual rasterization in the graphics pipeline; they do not expand geometric hit-test bounds.
- Furthermore, because all visual shapes reside inside `<g pointerEvents="none">`, the visual glow region is mathematically incapable of intercepting pointer events.
- Clicks continue to target the geometry of the concentric `<circle r={24} pointerEvents="all">`.
