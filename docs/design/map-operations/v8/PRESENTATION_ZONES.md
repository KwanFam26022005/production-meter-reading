# V8 Presentation Zones Model — Cảng Tân Thuận

## Architecture & Separation of Concerns

To resolve the discrepancy between technical database schemas and human-centered control room interfaces, V8 enforces a two-tier zone model:
1. **Database Business Zones (4 zones)**: Technical grouping for reading routes and assignments (`zone-berth`, `zone-warehouse`, `zone-container`, `zone-technical`).
2. **UI Presentation Zones (6 zones)**: Human-observable operational areas matching physical port landmarks.

## The 6 Approved Presentation Zones

| Index | Presentation ID | Display Label | Business Zone ID | Color Token | Vertex Count |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | `pres-berth` | Cầu cảng | `zone-berth` | `#0284C7` | 14 |
| 2 | `pres-container-west` | Bãi container phía Tây | `zone-warehouse` | `#EA580C` | 9 |
| 3 | `pres-container-center` | Bãi container trung tâm | `zone-container` | `#E11D48` | 8 |
| 4 | `pres-cfs-east` | Kho / CFS phía Đông | `zone-warehouse` | `#EAB308` | 7 |
| 5 | `pres-technical` | Khu kỹ thuật / Dịch vụ | `zone-technical` | `#10B981` | 11 |
| 6 | `pres-gate` | Cổng chính | `zone-technical` | `#8B5CF6` | 7 |

## Model Interface Contract

```typescript
export interface PresentationZone {
  id: string;
  displayIndex: number;
  displayLabel: string;
  businessZoneIds: string[];
  polygonCanonical: Array<{ x: number; y: number }>;
  labelAnchorCanonical: { x: number; y: number };
  operatorAnchorCanonical: { x: number; y: number };
  presentationColor: string;
}
```

All polygon vertices satisfy $0 \le x \le 1915$ and $0 \le y \le 821$ with pairwise non-overlapping centroids.
