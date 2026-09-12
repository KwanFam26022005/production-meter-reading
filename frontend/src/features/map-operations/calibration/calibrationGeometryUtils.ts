/**
 * Calibration Geometry Utilities
 * High-precision computational geometry helpers for developer calibration mode.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Orientation test for three points:
 * 0 -> collinear
 * 1 -> clockwise
 * 2 -> counterclockwise
 */
function orientation(p: Point2D, q: Point2D, r: Point2D): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Checks if point q lies on segment pr (collinear points)
 */
function onSegment(p: Point2D, q: Point2D, r: Point2D): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-9 &&
    q.x >= Math.min(p.x, r.x) - 1e-9 &&
    q.y <= Math.max(p.y, r.y) + 1e-9 &&
    q.y >= Math.min(p.y, r.y) - 1e-9
  );
}

/**
 * Check if segment p1-q1 intersects segment p2-q2
 */
function doSegmentsIntersect(p1: Point2D, q1: Point2D, p2: Point2D, q2: Point2D): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special collinear cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Tests if a polygon is simple (no non-adjacent edges intersect)
 */
export function checkPolygonSimplicity(vertices: Point2D[]): {
  isSimple: boolean;
  intersection?: { edge1: number; edge2: number };
} {
  const n = vertices.length;
  if (n < 3) return { isSimple: false };

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const q1 = vertices[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Ignore adjacent edges
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p2 = vertices[j];
      const q2 = vertices[(j + 1) % n];

      if (doSegmentsIntersect(p1, q1, p2, q2)) {
        return { isSimple: false, intersection: { edge1: i, edge2: j } };
      }
    }
  }

  return { isSimple: true };
}

/**
 * Shoelace formula for polygon area
 */
export function calculatePolygonArea(vertices: Point2D[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Check if all vertices reside within canonical bounds
 */
export function checkVerticesBounds(
  vertices: Point2D[],
  width = 1915,
  height = 821
): boolean {
  return vertices.every(
    (v) => v.x >= 0 && v.x <= width && v.y >= 0 && v.y <= height
  );
}

/**
 * Robust Point In Polygon test (Ray Casting)
 */
export function isPointInPolygon2D(point: Point2D, polygon: Point2D[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance from point p to line segment v-w
 */
export function distanceToSegment(p: Point2D, v: Point2D, w: Point2D): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y))
  );
}
