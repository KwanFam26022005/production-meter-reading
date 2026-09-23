# Map V2 Animated Employee Markers — 03. Geometry & Animation Design

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Geometry Engine:** `frontend/src/components/map-v2/employeeMovement.ts`  
**Animation Hook:** `frontend/src/components/map-v2/useEmployeeAnimation.ts`  

---

## 1. Mathematical Geometry Invariants

### 1.1 Polygon Containment Proof
The marker movement engine enforces mathematical containment within arbitrary SVG polygons via the **Ray-Casting Algorithm** (Jordan Curve Theorem):
```typescript
export function isPointInPolygon(point: Coordinates2D, polygon: Coordinates2D[]): boolean
```
This handles simple, non-convex, and concave polygons without cutting outside polygon boundaries.

### 1.2 Boundary Clearance Invariant
To ensure the circular marker (radius $R = 14\text{px}$) never visually touches or clips the boundary edges of the zone polygon:
$$\text{Required Clearance} = R_{\text{marker}} + \text{Margin}_{\text{buffer}} = 14\text{px} + 4\text{px} = 18\text{px}$$

Every generated trajectory waypoint $P(t)$ satisfies:
$$\text{dist}(P(t), \partial \text{Polygon}) \ge 18\text{px}$$

### 1.3 Deepest Interior Point Finding
In irregular or elongated zones (such as `ZONE_QUAY`, where the canonical anchor at `[792, 303]` is only 6.64px from the water boundary), `findDeepestInteriorPoint` performs a deterministic grid scan within the bounding box to locate an interior anchor with maximum clearance from all polygon edges (e.g. `[590, 350]` with clearance 29.0px).

### 1.4 Automatic Narrow-Zone Stationary Fallback
If the maximum clearance inside a polygon is less than $18\text{px}$, or if allowable movement radius is less than $5\text{px}$, the engine automatically switches to a safe **stationary fallback**:
- Movement amplitude: $R_x = 0$, $R_y = 0$.
- Status: `isStationary = true`, `reason = 'narrow_zone_clearance'`.
- Presentation: Marker safely parked at deepest interior point, displaying a subtle `CỐ ĐỊNH` badge.

---

## 2. Animation Architecture & Continuity

### 2.1 Closed Parametric Splines
Movement paths follow closed harmonic curves:
$$x(t) = C_x + R_x \cdot \cos(2\pi t + \phi_x)$$
$$y(t) = C_y + R_y \cdot \sin(2\pi t + \phi_y)$$
Where $t \in [0, 1]$, and phase shifts $\phi_x, \phi_y$ are derived deterministically from the employee and zone hash seeds (no random number generation).

### 2.2 Pause & Resume State Machine
The animation lifecycle hook (`useEmployeeAnimation.ts`) guarantees continuous progress tracking:
- Progress parameter $t$ is stored in a mutable ref (`progressRef.current`).
- When paused (by hover, focus, selection, HUD toggle, or mode change), `requestAnimationFrame` is cancelled cleanly.
- When all pause conditions clear, the animation loop resumes **smoothly from the exact progress $t$** where it stopped — never abruptly resetting to $0$ or jumping.

### 2.3 Frame Cleanup Guarantee
All `requestAnimationFrame` IDs and `window.matchMedia` listeners are stored in refs and guaranteed to be cancelled upon component unmount, preventing memory or animation frame leaks.
