# V15B — Canonical Zone Operational Route Graph Specification

## 1. Executive Summary & Route Semantics
The V15B Operational Route Graph introduces deterministic spatial routing corridors across the 6 presentation zones of Cảng Tân Thuận:
- `pres-berth`
- `pres-container-west`
- `pres-container-center`
- `pres-cfs-east`
- `pres-technical`
- `pres-gate`

Routes represent **presentation and operational workflow corridors only**. They strictly follow internal service roads, quay-side operational corridors, warehouse logistics pathways, and gate circulation lanes. Routes are guaranteed to avoid water bodies, container stack interiors, workshop building footprints, and physical obstacles.

> **Absolute Spatial Freeze Invariant**:
> Canonical entity coordinates (`CANONICAL_12_METERS_AUDIT`, `CANONICAL_OPERATOR_ANCHORS`), presentation zone polygons (`tanThuanPresentationGeometry.v10.json`), and scene dimensions (`1915 x 821`) remain 100% frozen. Routes NEVER mutate canonical entity positions.

---

## 2. Graph Schema & Typing
All route graphs conform to the `ZoneRouteGraph` interface defined in `RouteTypes.ts`:

```typescript
export interface CanonicalPoint {
  x: number;
  y: number;
}

export type RouteNodeType =
  | 'operator-start'
  | 'road'
  | 'junction'
  | 'meter-access'
  | 'gate'
  | 'service-point';

export interface RouteNode {
  id: string;
  zoneId: string;
  canonical: CanonicalPoint;
  type: RouteNodeType;
  label?: string;
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  bidirectional: boolean;
  weight?: number;
}

export interface ZoneRouteGraph {
  schemaVersion: string; // "1.0.0"
  mapVersion: string; // "tan-thuan-v10"
  coordinateSystem: string; // "tan-thuan-canonical-image-pixel-space-v1"
  zoneId: string;
  nodes: RouteNode[];
  edges: RouteEdge[];
  operatorStartNodeId: string;
  meterAccess: Record<string, string>; // meterId -> routeNodeId
}
```

---

## 3. Meter Access Node Mapping & Clearance
Each canonical meter maps to exactly ONE reachable access node positioned on a physical corridor. The access node is offset from the meter's canonical coordinate by **22–40px** to guarantee marker clearance and prevent avatar/hexagonal marker visual collision:

| Meter Code | Name | Presentation Zone | Access Node ID | Access Node (X, Y) | Canonical (X, Y) | Separation Clearance |
|---|---|---|---|---|---|---|
| **CT-001** | Công tơ Trạm A | `pres-technical` | `tech-acc-ct001` | (1148, 712) | (1148, 686) | 26.0 px |
| **CT-002** | Công tơ Kho B | `pres-container-west` | `cwest-acc-ct002` | (480, 465) | (507, 465) | 27.0 px |
| **CT-003** | Công tơ Cầu cảng 1 | `pres-berth` | `berth-acc-ct003` | (365, 322) | (337, 316) | 28.6 px |
| **CT-004** | Công tơ Cầu cảng 2 | `pres-berth` | `berth-acc-ct004` | (694, 338) | (694, 315) | 23.0 px |
| **CT-005** | Công tơ Kho C | `pres-container-west` | `cwest-acc-ct005` | (639, 502) | (639, 475) | 27.0 px |
| **CT-006** | Công tơ Kho D | `pres-cfs-east` | `cfseast-acc-ct006` | (1706, 380) | (1680, 380) | 26.0 px |
| **CT-007** | Công tơ Trạm B | `pres-technical` | `tech-acc-ct007` | (1068, 745) | (1068, 720) | 25.0 px |
| **CT-008** | Công tơ Cầu cảng 3 | `pres-berth` | `berth-acc-ct008` | (1375, 256) | (1400, 248) | 26.2 px |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `pres-technical` | `tech-acc-ct009` | (1229, 707) | (1229, 681) | 26.0 px |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `pres-gate` | `gate-acc-ct010` | (1666, 560) | (1640, 560) | 26.0 px |
| **CT-011** | Công tơ Bãi Container 1 | `pres-container-center` | `ccenter-acc-ct011` | (1171, 465) | (1171, 437) | 28.0 px |
| **CT-012** | Công tơ Bãi Container 2 | `pres-container-center` | `ccenter-acc-ct012` | (1402, 452) | (1402, 424) | 28.0 px |

---

## 4. Deterministic Route Planning & Interpolation
- **RoutePlanner**: Employs Dijkstra's algorithm with Euclidean edge weights and deterministic tie-breaking (lexicographical sorting of node IDs) to ensure identical route generation across renders.
- **RouteInterpolator**: Evaluates position continuously along the polyline using cumulative segment distance sampling. Provides `getPointAtProgress(t)` where \(t \in [0, 1]\), `getPointAtDistance(d)`, and conservative quadratic corner smoothing `toSvgPath('quadratic')` that rounds intermediate vertices without overshooting the corridor boundary.
