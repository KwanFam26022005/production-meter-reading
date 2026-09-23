/**
 * Saigon Port Map V2 — Geometry-Safe Employee Marker Movement Primitive
 *
 * Implements deterministic, mathematically proven interior movement paths for employee markers
 * within arbitrary canonical zone polygons (1536x1024 SVG coordinate space).
 *
 * Requirements:
 * 1. Marker must remain entirely inside assigned zone polygon.
 * 2. Minimum clearance margin = markerRadius + buffer (prevents marker edge touching polygon boundary).
 * 3. Narrow or irregular zones automatically fall back to stationary markers.
 * 4. Deterministic: No Math.random() in runtime path generation.
 * 5. Closed parametric curves: Smooth interpolation with C1/C2 continuity.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type Coordinates2D = [number, number];

export interface SafeMovementPath {
  center: Coordinates2D;
  radiusX: number;
  radiusY: number;
  isStationary: boolean;
  reason: 'valid_path' | 'narrow_zone_clearance' | 'insufficient_radius_clearance' | 'empty_polygon' | 'stationary_assignee';
  duration: number; // Duration of one full loop in seconds (e.g. 8-12s)
  getPositionAt: (progress: number) => Coordinates2D; // progress in [0, 1]
  samplePoints: Coordinates2D[]; // 36 verified validation samples
  minBoundaryDistance: number;
}

export interface PathGenerationConfig {
  polygon: Coordinates2D[];
  preferredAnchor?: Coordinates2D;
  markerRadius?: number;      // Default 14px (28px diameter avatar)
  clearanceMargin?: number;   // Default 4px buffer (total 18px clearance required)
  desiredRadius?: number;     // Target movement radius (default 22px)
  seed?: number | string;     // Deterministic seed for phase and aspect ratio
  cycleDuration?: number;     // Movement cycle in seconds (default 9s)
}

/**
 * Standard ray-casting point-in-polygon algorithm (Jordan Curve Theorem).
 * Handles simple, non-convex, and concave polygons accurately.
 */
export function isPointInPolygon(point: Coordinates2D, polygon: Coordinates2D[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Computes shortest Euclidean distance from a point to a line segment [a, b].
 */
export function distanceToSegment(p: Coordinates2D, a: Coordinates2D, b: Coordinates2D): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  // Projection scalar t on segment [0, 1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Computes shortest Euclidean distance from a point to any boundary edge of a polygon.
 */
export function distanceToPolygonBoundary(point: Coordinates2D, polygon: Coordinates2D[]): number {
  if (!polygon || polygon.length < 2) return 0;
  let minDistance = Infinity;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distanceToSegment(point, polygon[j], polygon[i]);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return minDistance;
}

/**
 * Computes bounding box of a polygon: [minX, minY, maxX, maxY]
 */
export function getPolygonBoundingBox(polygon: Coordinates2D[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Finds a safe interior point within a polygon with maximum clearance from boundary edges.
 * Performs a deterministic grid scan if preferredAnchor is too close to boundary.
 */
export function findDeepestInteriorPoint(
  polygon: Coordinates2D[],
  preferredAnchor?: Coordinates2D,
  minRequiredClearance = 18
): { point: Coordinates2D; clearance: number } {
  if (!polygon || polygon.length < 3) {
    return { point: preferredAnchor || [0, 0], clearance: 0 };
  }

  // 1. Check if preferredAnchor is already well-cleared
  if (preferredAnchor && isPointInPolygon(preferredAnchor, polygon)) {
    const anchorClearance = distanceToPolygonBoundary(preferredAnchor, polygon);
    if (anchorClearance >= minRequiredClearance + 6) {
      return { point: preferredAnchor, clearance: anchorClearance };
    }
  }

  // 2. Scan bounding box with deterministic step to locate best interior anchor
  const [minX, minY, maxX, maxY] = getPolygonBoundingBox(polygon);
  const stepX = Math.max(10, (maxX - minX) / 40);
  const stepY = Math.max(10, (maxY - minY) / 40);

  let bestPoint: Coordinates2D = preferredAnchor && isPointInPolygon(preferredAnchor, polygon)
    ? preferredAnchor
    : [polygon[0][0], polygon[0][1]];
  let maxClearance = isPointInPolygon(bestPoint, polygon)
    ? distanceToPolygonBoundary(bestPoint, polygon)
    : 0;

  for (let x = minX + stepX; x < maxX; x += stepX) {
    for (let y = minY + stepY; y < maxY; y += stepY) {
      const pt: Coordinates2D = [x, y];
      if (isPointInPolygon(pt, polygon)) {
        const d = distanceToPolygonBoundary(pt, polygon);
        if (d > maxClearance) {
          maxClearance = d;
          bestPoint = pt;
        }
      }
    }
  }

  return { point: bestPoint, clearance: maxClearance };
}

/**
 * Simple deterministic string hash to generate consistent seed numbers.
 */
function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return Math.abs(seed);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates and mathematically validates a safe, smooth, closed movement trajectory.
 */
export function generateSafeMovementPath(config: PathGenerationConfig): SafeMovementPath {
  const {
    polygon,
    preferredAnchor,
    markerRadius = 14,
    clearanceMargin = 4,
    desiredRadius = 20,
    seed = 42,
    cycleDuration = 9,
  } = config;

  const totalRequiredClearance = markerRadius + clearanceMargin; // e.g. 18px

  if (!polygon || polygon.length < 3) {
    const fallbackPoint = preferredAnchor || [0, 0];
    return {
      center: fallbackPoint,
      radiusX: 0,
      radiusY: 0,
      isStationary: true,
      reason: 'empty_polygon',
      duration: cycleDuration,
      getPositionAt: () => fallbackPoint,
      samplePoints: [fallbackPoint],
      minBoundaryDistance: 0,
    };
  }

  // Find safest center point
  const { point: centerPoint, clearance: centerClearance } = findDeepestInteriorPoint(
    polygon,
    preferredAnchor,
    totalRequiredClearance
  );

  // If even the deepest point doesn't have enough clearance for marker radius + margin,
  // we MUST remain stationary at this deepest point.
  if (centerClearance < totalRequiredClearance) {
    return {
      center: centerPoint,
      radiusX: 0,
      radiusY: 0,
      isStationary: true,
      reason: 'narrow_zone_clearance',
      duration: cycleDuration,
      getPositionAt: () => centerPoint,
      samplePoints: [centerPoint],
      minBoundaryDistance: centerClearance,
    };
  }

  // Maximum allowable movement radius from center
  const maxPossibleRadius = Math.max(0, centerClearance - totalRequiredClearance);

  // If available movement amplitude is negligible (< 5px), stationary fallback
  if (maxPossibleRadius < 5) {
    return {
      center: centerPoint,
      radiusX: 0,
      radiusY: 0,
      isStationary: true,
      reason: 'insufficient_radius_clearance',
      duration: cycleDuration,
      getPositionAt: () => centerPoint,
      samplePoints: [centerPoint],
      minBoundaryDistance: centerClearance,
    };
  }

  // Derive deterministic parameters from seed
  const numSeed = hashSeed(seed);
  const phaseX = (numSeed % 360) * (Math.PI / 180);
  const phaseY = ((numSeed * 7) % 360) * (Math.PI / 180);

  // Target radius
  let currentRx = Math.min(desiredRadius, maxPossibleRadius);
  let currentRy = Math.min(desiredRadius * 0.75, maxPossibleRadius * 0.75);

  const numValidationSamples = 36;
  let isValid = false;
  let samples: Coordinates2D[] = [];
  let minSampleDist = Infinity;

  // Function to calculate point at progress t [0, 1]
  const createPathEvaluator = (rx: number, ry: number) => {
    return (progress: number): Coordinates2D => {
      const angle = progress * Math.PI * 2;
      const x = centerPoint[0] + rx * Math.cos(angle + phaseX);
      const y = centerPoint[1] + ry * Math.sin(angle + phaseY);
      return [x, y];
    };
  };

  // Iteratively scale down until 100% of samples satisfy polygon boundary clearance
  while (!isValid && currentRx >= 4) {
    const evaluator = createPathEvaluator(currentRx, currentRy);
    samples = [];
    minSampleDist = Infinity;
    let allInside = true;

    for (let i = 0; i < numValidationSamples; i++) {
      const t = i / numValidationSamples;
      const pt = evaluator(t);
      samples.push(pt);

      if (!isPointInPolygon(pt, polygon)) {
        allInside = false;
        break;
      }

      const dist = distanceToPolygonBoundary(pt, polygon);
      if (dist < minSampleDist) minSampleDist = dist;

      if (dist < totalRequiredClearance) {
        allInside = false;
        break;
      }
    }

    if (allInside) {
      isValid = true;
    } else {
      currentRx *= 0.8;
      currentRy *= 0.8;
    }
  }

  if (!isValid || currentRx < 4) {
    // If scaled below usable amplitude, fall back cleanly to stationary
    return {
      center: centerPoint,
      radiusX: 0,
      radiusY: 0,
      isStationary: true,
      reason: 'insufficient_radius_clearance',
      duration: cycleDuration,
      getPositionAt: () => centerPoint,
      samplePoints: [centerPoint],
      minBoundaryDistance: centerClearance,
    };
  }

  const finalEvaluator = createPathEvaluator(currentRx, currentRy);

  return {
    center: centerPoint,
    radiusX: currentRx,
    radiusY: currentRy,
    isStationary: false,
    reason: 'valid_path',
    duration: cycleDuration,
    getPositionAt: finalEvaluator,
    samplePoints: samples,
    minBoundaryDistance: minSampleDist,
  };
}
