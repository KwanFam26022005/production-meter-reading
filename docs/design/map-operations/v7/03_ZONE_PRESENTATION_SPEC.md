# 03. ZONE PRESENTATION SPECIFICATION
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Presentation Model vs Domain Business Model

Per Product Direction (Section 2 & 10), domain business zones remain strictly defined as 4 authoritative entities (`zone-berth`, `zone-container`, `zone-warehouse`, `zone-technical`). The 6 approved visual operational regions are modeled through an explicit presentation layer:

```typescript
export interface SpatialZonePresentation {
  presentationId: string;       // e.g. 'pres-berth'
  businessZoneId: string;       // Foreign key to authoritative business zone
  label: string;                // e.g. 'Cầu cảng'
  subLabel?: string;            // e.g. 'BERTH / QUAY'
  regionIndex: number;          // 1 to 6
  polygonSvg: string;           // SVG Path data
  pointsSvg: { x: number; y: number }[];
  normalizedPolygon: { x: number; y: number }[];
  labelAnchorSvg: { x: number; y: number };
  operatorAnchorSvg: { x: number; y: number };
  visualTheme: {
    primaryColor: string;       // Theme border & accent
    fillColor: string;          // Default translucent fill
    hoverFillColor: string;     // Hover fill
    selectedFillColor: string;  // Selected fill
  };
}
```

---

### 2. Explicit Mapping Table

| Region Index | Presentation ID | Vietnamese Label | English Operational Tag | Authoritative Business Zone ID | Visual Theme / Hex |
|---|---|---|---|---|---|
| **1** | `pres-berth` | Cầu cảng | BERTH / QUAY | `zone-berth` | **Maritime Blue** (`#0284C7`) |
| **2** | `pres-container-west` | Bãi container phía Tây | WEST CONTAINER YARD | `zone-container` | **Warm Orange/Yellow** (`#D97706`) |
| **3** | `pres-container-center` | Bãi container trung tâm | CENTRAL CONTAINER YARD | `zone-container` | **Red / Orange** (`#DC2626`) |
| **4** | `pres-cfs-east` | Kho / CFS phía Đông | EAST WAREHOUSE / CFS | `zone-warehouse` | **Yellow / Golden-Green** (`#65A30D`) |
| **5** | `pres-technical` | Khu kỹ thuật / Dịch vụ | TECHNICAL / SERVICE AREA | `zone-technical` | **Green / Teal** (`#0D9488`) |
| **6** | `pres-gate` | Cổng chính | MAIN GATE | `zone-technical` | **Purple / Violet** (`#7C3AED`) |

---

### 3. Visual System & State Hierarchy

1. **Default State**:
   - Fill opacity: Restrained **8% to 12%** (`rgba(..., 0.08)` to `rgba(..., 0.12)`).
   - Boundary stroke: 1.2px solid color with subtle opacity.
   - Text tags: Compact labels placed at visual centroids.
   - Outdoor legibility: Preserves aerial photographic details underneath without visual noise.

2. **Hover State**:
   - Fill opacity elevates smoothly to **18% to 22%**.
   - Boundary stroke sharpens to 2.0px with 0.90 opacity.
   - Related operator marker slightly scales and strengthens.
   - Cursor changes to `pointer`.

3. **Selected State (2D Focus)**:
   - Selected zone region: **100% visual emphasis**, 2.5px strong accent border, soft glow.
   - Non-selected zones: **25% to 30% dimmed** with quiet outlines.
   - Selected zone's operator and meters become primary.
   - Non-associated meters dim to 20% opacity.
   - Contextual `ZoneContextPanel` appears.

4. **2D Focus Camera Motion**:
   - Smooth top-down 2D camera framing transition (~280ms to 360ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`).
   - No 3D tilting, no perspective rotation.
   - Clamped within stage boundaries using `clampPanForZoom` to prevent black void exposure.
   - Strictly respects `prefers-reduced-motion`.
