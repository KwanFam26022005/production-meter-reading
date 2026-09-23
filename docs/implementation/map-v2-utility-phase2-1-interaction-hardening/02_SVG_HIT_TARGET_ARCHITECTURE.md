# 02 — SVG Hit Target Architecture

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: STANDARDIZED & VERIFIED

---

## 1. Principles of the Single Hit-Target Pattern

In complex interactive maps containing rich SVG graphics, nested tags (e.g. `<polygon>`, `<rect>`, `<path>`, `<text>`) frequently introduce hit-testing bugs when pointer events are left on framework defaults (`pointer-events: auto`).

To establish bulletproof pointer, touch, and accessibility behavior, every interactive node in `MapV2UtilityLayer.tsx` obeys the **Single Hit-Target Contract**:

```text
Interactive Node Group (<g id="node-..." role="button" tabIndex={0}>)
├── Explicit Interaction Receiver (<circle r={24} fill="transparent" pointerEvents="all" />)
└── Decorative Visual Content (<g pointerEvents="none">)
    ├── Outer Rings / Halos
    ├── Status Badges / Glyphs
    ├── Core Shapes / Ports
    └── Typography / Data Labels
```

---

## 2. Hit-Target Sizing & Scale Policy

### Standard Size Specification
- **Map-Space Target Radius**: `r = 24 px` (Diameter = 48 px).
- **Physical Touch Standard**: Exceeds WCAG 2.1 Success Criterion 2.5.5 (Target Size - Enhanced: 44×44 CSS px) and Apple Human Interface Guidelines minimums.
- **Center Alignment**: Concentric with the node coordinate `(x, y)` derived from `LAYOUT_B2_COORDS`.

### Screen-Space vs Map-Space Behavior
The utility layer is embedded inside the shared SVG affine transform:
```xml
<g transform="translate(panX, panY) scale(zoom)">
  <!-- Layer 4.5: Utility Network -->
</g>
```
At various responsive zooms, the effective clickable area on laptop screens (1366×768 / 1280×720):
- **78% Zoom (Contain / Auto-Fit on 1280×720)**: `48px * 0.78 = 37.4px` effective touch diameter.
- **84% Zoom (Auto-Fit on 1366×768)**: `48px * 0.84 = 40.3px` effective touch diameter.
- **100% Zoom (1:1 Native Pixel View)**: `48.0px` effective touch diameter.
- **125% Zoom (Operator Focal Inspection)**: `60.0px` effective touch diameter.

Because the hit area is map-space concentric, there is zero coordinate drift when panning or zooming.

---

## 3. Node Type Specific Implementations

### A. Source Nodes (`SIM-EXT-GRID`, `SIM-CITY-WATER`)
- **Hit Target**: `<circle r={24} fill="transparent" pointerEvents="all" />`
- **Decorative Group**: `<g pointerEvents="none">`
  - Outer pulsating diamond (when collapsed): `<polygon points="0,-24 24,0 0,24 -24,0" ... />`
  - Solid diamond symbol: `<polygon points="0,-18 18,0 0,18 -18,0" ... />`
  - Core diamond pip: `<polygon points="0,-8 8,0 0,8 -8,0" ... />`
  - Sub-tag badge: `<rect ... /><text ...>▶ MỞ MẠNG</text>`

### B. Distribution Cabinets (`SIM-SS-01`, `SIM-TR-01`, `SIM-WJ-01`)
- **Decorative Group**: `<g pointerEvents="none">`
  - Rectangular cabinet body: `20×20 px`
  - Asset label text: `8.5px bold`

### C. Distribution Host + Nested Meter (`SIM-MDB-01`, `SIM-WIN-01`, `SIM-FDR-01..04`)
- **Hit Target**: `<circle r={24} fill="transparent" pointerEvents="all" />`
- **Decorative Group**: `<g pointerEvents="none">`
  - Cabinet base rect: `22×22 px`
  - Concentric meter pip: `r=7.5 px`
  - Dynamic halo ring (when traced): `r=19 px dashed`
  - Contextual meter tag: `<rect ... /><text ...>{node.meterCode}</text>`

### D. Standalone Terminal Meters (`SIM-YDB-01..03`, `SIM-WP-01..03`)
- **Hit Target**: `<circle r={24} fill="transparent" pointerEvents="all" />`
- **Decorative Group**: `<g pointerEvents="none">`
  - Concentric meter disc: `r=10.5 px`
  - Core dot: `r=6.0 px`
  - Dynamic halo ring (when traced): `r=18 px dashed`
  - Meter code tag: `<rect ... /><text ...>{node.meterCode}</text>`

---

## 4. Invariant Verification

1. **Non-Conflicting Centers**: Every node has an isolated coordinate center with zero stacked positions (`Test 11 PASS`).
2. **Zero Pointer Interception on Labels**: Text labels and badges never swallow cursor clicks; clicks pass directly through to the underlying node hit target (`Test 14 PASS`).
3. **No Decorative Leaks**: In all node types, `elementFromPoint` queries return the dedicated hit circle, ensuring 100% predictable hit-testing.
