# 05 — Rendering Pipeline, Coordinate System & Fit Algorithms

## Executive Summary
This document explains the technical implementation of the single shared SVG coordinate space for **Map V2**, the layout chain within the Operations Portal shell, the root causes of the initial sizing issue, and the mathematical implementation of the two functional view modes: **Fit toàn bộ** and **Tràn chiều rộng**.

---

## 1. Canonical Coordinate Space & Invariants

- **Canonical Width ($W$)**: `1536` pixels
- **Canonical Height ($H$)**: `1024` pixels
- **Origin $(0, 0)$**: Top-left corner of the canvas.
- **Orientation**: $+X$ points rightward; $+Y$ points downward.
- **Aspect Ratio**: $1.500$ ($3:2$).

---

## 2. Shared Vector & Raster Transform Model

To prevent raster-vector drift, the SVG base image and vector overlays share a single SVG group transformation matrix:

```tsx
<svg width="100%" height="100%">
  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
    {/* Raster Base Image */}
    <image
      href={baseMapImage}
      x={0}
      y={0}
      width={1536}
      height={1024}
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}
    />
    
    {/* Vector Overlays */}
    <g id="layer-operational-zones"> ... </g>
    <g id="layer-buildings-admin"> ... </g>
    <g id="layer-boundary-roads"> ... </g>
    <g id="layer-gate-markers"> ... </g>
  </g>
</svg>
```

### Mathematical Lock Invariant
Let $(x, y)$ be any pixel coordinate on the base image or any polygon vertex. Under viewport transform $(\text{pan}_x, \text{pan}_y, s)$, the screen coordinate $(X_s, Y_s)$ is:

$$\begin{bmatrix} X_s \\ Y_s \end{bmatrix} = s \begin{bmatrix} x \\ y \end{bmatrix} + \begin{bmatrix} \text{pan}_x \\ \text{pan}_y \end{bmatrix}$$

Because both the raster image and vector geometries undergo this exact same affine transformation, **relative displacement between raster pixels and vector vertices is identically zero ($\Delta \vec{r} = \vec{0}$)** across all zoom levels and pan offsets.

---

## 3. Layout Chain & Root Cause Analysis

### Complete Layout Hierarchy:
```
Operations Shell (AdminShell.tsx)
   └── Main Desktop Viewport (.admin-main-viewport)
         └── Map V2 Container (.map-v2-container)
               ├── Workspace Header (.map-v2-header, 52px)
               └── Workspace Body (.map-v2-workspace-body, flex: 1)
                     └── Canvas Wrapper (.map-v2-canvas-wrapper, 100% W x 100% H)
                           └── SVG Viewport (<svg width="100%" height="100%">)
                                 └── Unified Group (<g transform="translate(panX, panY) scale(zoom)">)
```

### Root Causes of Initial Excessive Empty Space:
1. **Container Padding in Operations Shell**:
   `.admin-main-viewport` had default padding `24px 32px;` and `overflow-y: auto;`. Map V1 had dedicated full-bleed overrides (`padding: 0 !important; overflow: hidden !important; height: 100vh !important;`), but Map V2 lacked these overrides. This wasted 64px horizontally and 48px vertically.
2. **Hardcoded Height in Workspace Body**:
   `.map-v2-workspace-body` had `height: calc(100vh - 120px);`, and `.map-v2-container` had `min-height: calc(100vh - 64px);`. This artificially constrained container height.
3. **Arbitrary 1.0 Zoom Cap & 40px Outer Margin**:
   The initial fit calculation used `Math.min((width - 40)/1536, (height - 40)/1024, 1.0)`. The `1.0` clamp prevented expanding on wide desktop screens, and subtracting 40px further shrunk the scale factor. Due to vertical constraints, the scale factor collapsed to `0.74`, shrinking the 1536px map down to 1136px and leaving over 350px of empty black margins on each side.
4. **Window-Only Resize Listener**:
   Using `window.addEventListener('resize')` without `ResizeObserver` failed to detect element-level layout changes, such as sidebar collapses (256px $\to$ 68px) and inspector panel toggles.

---

## 4. Mathematical Fit Algorithms (Two Functional View Modes)

### Mode 1: Fit Toàn Bộ (`contain`)
**Objective**: Show the entire map image and all vector boundaries without any cropping.
- **Scale Factor**:
  $$s_{\text{contain}} = \min\left(\frac{W_{\text{viewport}}}{1536}, \frac{H_{\text{viewport}}}{1024}\right)$$
- **Pan Offsets**:
  $$\text{pan}_{x} = \frac{W_{\text{viewport}} - 1536 \cdot s_{\text{contain}}}{2}$$
  $$\text{pan}_{y} = \frac{H_{\text{viewport}} - 1024 \cdot s_{\text{contain}}}{2}$$
- **Behavior**:
  On 1920×1080 ($W = 1836, H = 1028$), $s_{\text{contain}} = 1.0039$ (99–100%). The map occupies 100% of the vertical height with zero cropping and minimal horizontal centering.

### Mode 2: Tràn Chiều Rộng (`width`)
**Objective**: Fill 100% of the available workspace width for wide desktop monitors, allowing smooth vertical panning.
- **Scale Factor**:
  $$s_{\text{width}} = \frac{W_{\text{viewport}}}{1536}$$
- **Pan Offsets**:
  $$\text{pan}_{x} = 0$$
  $$\text{pan}_{y} = \begin{cases} \frac{H_{\text{viewport}} - 1024 \cdot s_{\text{width}}}{2}, & \text{if } 1024 \cdot s_{\text{width}} < H_{\text{viewport}} \\ 0, & \text{otherwise (pins upper quay to top)} \end{cases}$$
- **Behavior**:
  On 1920×1080 ($W = 1836, H = 1028$), $s_{\text{width}} = 1.1953$ (120%). The map spans 100% of the width from sidebar edge to right bezel with zero horizontal gaps. The quay and berths are immediately visible, and operators can pan vertically.

---

## 5. Responsive Behavior & Interaction Preservation

1. **Element-Level `ResizeObserver`**:
   Attaches directly to `.map-v2-canvas-wrapper`. Automatically recalculates fit when:
   - Window resizes.
   - Sidebar collapses or expands (256px $\leftrightarrow$ 68px).
   - Inspection panel opens or closes (360px).
2. **Zoom & Pan Interaction Retention**:
   When an operator manually drags to pan or uses the wheel to zoom, `isCustomTransformRef.current` is set to `true`, preserving their focal viewpoint across minor window adjustments.
3. **Reset View via HUD**:
   Clicking the Reset View button (`RotateCcw`) in the floating HUD re-applies the currently selected view mode (`viewMode === 'width' ? 'Tràn chiều rộng' : 'Fit toàn bộ'`).
