# V8 Coordinate System Specification — Cảng Tân Thuận

## Architecture Overview

All spatial entities (background raster image, zone boundaries, meter markers, operator anchors, placement grids) share exactly **one unified 2D coordinate plane**:
`tan-thuan-canonical-image-pixel-space-v1`

```
┌────────────────────────────────────────────────────────┐
│ Master SVG Scene (viewBox="0 0 1915 821")             │
│   preserveAspectRatio="xMidYMid meet"                   │
│   <g transform="translate(panX, panY) scale(zoom)">    │
│     <image href="tan-thuan-port-v8.webp" .../>        │
│     <ZoneLayer .../>                                   │
│     <LabelsLayer .../>                                 │
│     <MeterLayer .../>                                  │
│     <OperatorLayer .../>                               │
│     <AlertLayer .../>                                  │
│     <PlacementLayer .../>                              │
│   </g>                                                 │
└────────────────────────────────────────────────────────┘
```

## Coordinate Spaces & Conversion API

The centralized coordinate service in `frontend/src/features/map-operations/geometry/canonicalScene.ts` exposes four functions:

### 1. `normalizedToCanonical(point: NormalizedPoint): CanonicalPoint`
- Converts database storage coordinates `[0.0, 1.0]` into canonical pixel space `[0, 1915] × [0, 821]`:
  $$x_{	ext{px}} = x_{	ext{norm}} 	imes 1915$$
  $$y_{	ext{px}} = y_{	ext{norm}} 	imes 821$$

### 2. `canonicalToNormalized(xPx: number, yPx: number): NormalizedPoint`
- Converts canonical pixels back to storage coordinates with 4-decimal precision:
  $$x_{	ext{norm}} = 	ext{round}\left(rac{x_{	ext{px}}}{1915}, 4ight)$$
  $$y_{	ext{norm}} = 	ext{round}\left(rac{y_{	ext{px}}}{821}, 4ight)$$

### 3. `screenToCanonical(clientX, clientY, svgEl, camera): CanonicalPoint`
- Uses hardware-accelerated SVG Current Transformation Matrix (CTM) inversion:
  $$P_{	ext{svg}} = 	ext{CTM}^{-1} 	imes P_{	ext{client}}$$
  $$P_{	ext{world}} = rac{P_{	ext{svg}} - 	ext{pan}}{	ext{zoom}}$$

### 4. `canonicalToScreen(xPx, yPx, svgEl, camera): ScreenPoint`
- Forward projection from canonical scene coordinates to screen pixels:
  $$P_{	ext{svg}} = P_{	ext{world}} 	imes 	ext{zoom} + 	ext{pan}$$
  $$P_{	ext{client}} = 	ext{CTM} 	imes P_{	ext{svg}}$$

## Invariants
- Zero viewport-dependent cropping (`preserveAspectRatio="xMidYMid meet"`).
- Prohibited: `background-size: cover` and `object-fit: cover` on map scenes.
- Prohibited: Deriving spatial entity coordinates from `window.innerWidth` or `window.innerHeight`.
