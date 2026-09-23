# 06 — Pan vs Node Click Ambiguity Resolution

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: RESOLVED & HARDENED

---

## 1. Problem Definition: The Pan vs Click Dilemma

In interactive map viewports supporting both freeform panning (drag gestures) and clickable map entities (source diamonds, meter nodes, zone hotspots, gate icons), an inherent interaction ambiguity exists:

```text
Pointer Mousedown on Node (x0, y0)
  │
  ├── User releases without moving -> EXPECTATION: Trigger Node Activation (Expand/Trace)
  │
  ├── User drags pointer (dx, dy > threshold) -> EXPECTATION: Pan Map Canvas
  │
  └── Antipattern (Previous Bug):
        Mousedown immediately set `isDragging = true` -> SVG received `pointer-events: none` ->
        Native `click` was dropped entirely before mouseup could fire.
```

---

## 2. Threshold-Based Decoupling Architecture

To guarantee that small hand tremors or micro-movements on trackpads/touch devices do not trigger unwanted panning, and that clicks reliably fire on nodes without starting a map pan, `MapV2Canvas.tsx` implements a **4px Manhattan Distance Drag Gate**:

```tsx
// MapV2Canvas.tsx:
const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
const hasMovedRef = useRef<boolean>(false);
const mouseIsDownRef = useRef<boolean>(false); // Zero re-renders on mousedown

const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  mouseIsDownRef.current = true;
  hasMovedRef.current = false;
  dragStartRef.current = { x: e.clientX, y: e.clientY };
  // Crucial: do NOT call setIsDragging(true) here
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!mouseIsDownRef.current) return;
  const dx = e.clientX - dragStartRef.current.x;
  const dy = e.clientY - dragStartRef.current.y;
  
  // 4px movement threshold gate:
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    if (!isDragging) setIsDragging(true); // Only now transition to dragging state
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

---

## 3. Behavioral Invariant Matrix

| User Action | Movement `(dx, dy)` | `isDragging` State | SVG `pointer-events` | Resulting Action |
|---|---|---|---|---|
| Single Click on Source | `<= 4 px` | `false` | `auto` | Network Expands / Retracts |
| Single Click on Meter | `<= 4 px` | `false` | `auto` | Traces Source -> Meter |
| Intentional Drag from Node | `> 4 px` | `true` | `none` (while dragging) | Map pans smoothly; node does NOT toggle |
| Intentional Drag from Background | `> 4 px` | `true` | `none` (while dragging) | Map pans smoothly; no accidental selections |
| Empty Canvas Click | `<= 4 px` | `false` | `auto` | Deselects currently selected zone/meter |

---

## 4. Verification

- Automated test `Test 15` verifies `mouseIsDownRef` exists and defers drag state.
- Automated test `Test 16` verifies `handleMouseDown` does NOT call `setIsDragging(true)`.
- Stress test video (`phase2-1-utility-real-interaction-stress.webm`) explicitly demonstrates rapid node clicks interspersed with canvas panning without accidental node activation or visual artifacts.
