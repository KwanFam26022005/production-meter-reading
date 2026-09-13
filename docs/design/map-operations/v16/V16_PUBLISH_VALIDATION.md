# V16 Geometry Validation & Pre-Publish Gates

## 1. Multi-Stage Validation Architecture

Prior to promoting any draft map configuration to `PUBLISHED`, the system enforces a deterministic, zero-tolerance validation gate.

```
Draft Geometry Changes
         │
         ▼
[Gate 1: Canonical Bounds & Dimensions] ──── Failure ───► HTTP 422 Rejection
         │
         ▼
[Gate 2: Polygon Simplicity (No Bowties)] ── Failure ───► HTTP 422 Rejection
         │
         ▼
[Gate 3: Anchor Containment] ────────────── Failure ───► HTTP 422 Rejection
         │
         ▼
[Gate 4: Meter Containment Check] ───────── Failure ───► HTTP 422 Rejection
         │
         ▼
[All Gates Passed: READY_TO_PUBLISH] ────── Success ──► Atomic Publish Permitted
```

---

## 2. Gate Specifications

### 2.1 Gate 1: Dimension and Coordinate Bounds
- **Canonical Canvas**: Dimensions must strictly match `1915` width by `821` height pixels.
- **Coordinate Space**: Coordinate system string must match `tan-thuan-canonical-image-pixel-space-v1`.
- **Bounding Box**: All polygon vertices, label anchors, and operator anchors must lie strictly within `[0, 1915]` along the X-axis and `[0, 821]` along the Y-axis.

### 2.2 Gate 2: Polygon Simplicity (Self-Intersection Detection)
- Polygons must be simple Jordan curves.
- Edge intersection algorithm computes segment-segment intersections for all pairwise non-adjacent edges:
  ```python
  def check_polygon_simplicity(vertices: list[dict]) -> tuple[bool, str | None]:
      # Segments (v_i, v_{i+1}) tested against (v_j, v_{j+1})
      # Returns False immediately if any non-adjacent segments intersect.
  ```
- Rejects "bowtie" or self-crossing polygons that corrupt SVG rendering and ray-casting algorithms.

### 2.3 Gate 3: Anchor Containment
- **Label Anchor**: Each zone's `label_anchor_canonical` must be located inside that zone's polygon (`point_in_polygon(anchor, polygon) == True`).
- **Operator Anchor**: Each zone's `operator_anchor_canonical` must be located inside that zone's polygon.
- **Clearance**: Ensures anchors are safely separated to prevent visual collision.

### 2.4 Gate 4: Meter Containment Check
- Validates that every active physical meter assigned to a presentation zone has its canonical coordinate `(map_x, map_y)` physically located inside the zone's boundary polygon.
- Prevents geometry shrinkage or shifting that would leave physical meters floating outside zone boundaries.
