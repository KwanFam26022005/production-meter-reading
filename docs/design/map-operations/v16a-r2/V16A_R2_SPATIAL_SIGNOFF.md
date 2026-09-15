# V16A-R2: Spatial Human Sign-Off & Published Geometry Freeze

## 1. Executive Summary & Sign-off Classification

| Attribute | Specification Value |
|:---|:---|
| **Phase / Milestone** | V16A-R2 — Spatial Human Sign-Off & Geometry Freeze |
| **Port Facility** | Tan Thuan Port (`tan-thuan`) |
| **Coordinate System** | `tan-thuan-canonical-image-pixel-space-v1` |
| **Canonical Dimensions** | 1915 × 821 px |
| **Active MapVersion ID** | `7176b67f-37b8-4a62-98c1-02943dd98e7d` |
| **Active MapVersion Name** | `tan-thuan-v16a-r2-frozen` |
| **Previous Version ID** | `b1449568-706e-4c6a-b8e1-cec3930d11ff` (`tan-thuan-v10`) |
| **Geometry SHA-256** | `ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3` |
| **Sign-off Classification** | **`HUMAN_GEOMETRY_APPROVED`** |
| **Human Review Status** | `USER_CONFIRMED` |
| **Meter Reconciliation** | **`REVIEW_REQUIRED`** (5/12 meters outside boundary; not blocker) |
| **Asset Semantics Status** | **`UNVERIFIED`** (candidates preserved in docs only) |
| **Route Status** | **`ROUTE_REVIEW_DEFERRED_TO_V16H`** |

---

## 2. Human Sign-Off Invariant & Boundary Freeze

The user manually calibrated all port areas to their intended physical and operational layout. This phase freezes that approved spatial geometry as the definitive baseline.

### Explicit Scope Restrictions Enforced:
1. **Zero Meter Relocation**: No meter canonical or normalized coordinates were shifted.
2. **Zero Meter Reassignment**: No business zone or presentation zone relationships were altered.
3. **No Asset Table Creations**: Zero database migrations or schema alterations touching Assets.
4. **Preserved Candidate Registries**: `ASSET_CANDIDATE_REGISTRY.v0.json` and `METERING_DISCOVERY.v0.json` remain documentation-only artifacts.
5. **No Route Mutation**: V15 operator routes and waypoints remain deferred (`ROUTE_REVIEW_DEFERRED_TO_V16H`).
6. **No Base-Map Distortion**: Canonical raster aspect ratio (1915:821) and coordinate origin remain strictly invariant.
7. **No Auto-snapping or Expansion**: Polygons were not expanded to capture meters, and anchors/landmarks were not forcibly shifted.

---

## 3. Structural Geometry Validation Results

Every zone underwent strict server-side topological and bounding validation (`validate_map_version_geometry`). All 6 zones passed with **0 blocking errors**:

| Presentation Zone ID | Display Label | Vertices | Area (px²) | Simplicity | Canonical Bounds | Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| `pres-berth` | Cầu cảng | 19 | 80,524.0 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |
| `pres-container-west` | Bãi container phía Tây | 13 | 151,483.5 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |
| `pres-container-center` | Bãi container trung tâm | 8 | 148,083.0 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |
| `pres-cfs-east` | Kho / CFS phía Đông | 12 | 77,778.5 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |
| `pres-technical` | Khu kỹ thuật / Dịch vụ | 13 | 91,872.5 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |
| `pres-gate` | Cổng chính | 4 | 978.0 | Simple (No self-intersect) | Strictly [0,1915]×[0,821] | **VALID** |

---

## 4. Reconciliation Warnings & Disclaimers

### Meter Spatial Containment (7 Inside / 5 Outside)
- **Contained (VALID)**: `CT-002`, `CT-003`, `CT-004`, `CT-005`, `CT-006`, `CT-011`, `CT-012`
- **Outside (REVIEW_REQUIRED)**:
  - `CT-001` (pres-technical): (1148.0, 686.0)
  - `CT-007` (pres-technical): (1068.0, 720.0)
  - `CT-008` (pres-berth): (1400.1, 248.0)
  - `CT-009` (pres-technical): (1229.0, 681.0)
  - `CT-010` (pres-gate): (1640.0, 560.0)

> [!WARNING]
> **Domain Semantics Disclaimer**:
> In accordance with domain rules:
> `presentationZone assignment != physical meter position != future measured Asset != future installedAt Asset`.
> An out-of-polygon meter is **NOT misconfigured**; it indicates physical placement outside the operational zone polygon, requiring domain alignment in later asset-modeling milestones.

### Anchor Containment (6 Valid / 6 Warnings)
- 6 anchors reside inside their respective zone polygons.
- 6 anchors are situated outside their contracted zone polygons (`pres-berth` label & operator, `pres-cfs-east` operator, `pres-technical` operator, `pres-gate` label & operator).
- These are recorded as `REVIEW_REQUIRED` warnings without automatic displacement.

### Landmark Audit (49 Total / 49 Unique & Finite)
- 49 spatial landmarks verified.
- 0 ID collisions, 0 out-of-bounds coordinates.
- Perimeter and road landmarks outside shrunk polygons remain semantic warnings without moving geometry.

---

## 5. Rollback Reference & Authority Verification

- **Previous Version**: `b1449568-706e-4c6a-b8e1-cec3930d11ff` (archived in single transaction).
- **Authoritative Version**: `7176b67f-37b8-4a62-98c1-02943dd98e7d` (served by `GET /api/v1/map-config/active`).
- **Rollback Endpoint**: `POST /api/v1/admin/map-versions/{previousPublishedVersionId}/rollback` is capable of reverting atomically if ever demanded.
