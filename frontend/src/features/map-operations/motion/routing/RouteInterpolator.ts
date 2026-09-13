/**
 * RouteInterpolator — Continuous Path Interpolator & SVG Generator (V15B)
 *
 * Provides smooth, physically conservative trajectory sampling and SVG path formatting.
 * Guaranteed to follow physical corridors without overshoot or distortion.
 */

import { CanonicalPoint } from './RouteTypes';
import { calculateEuclideanDistance } from './ZoneRouteGraph';

export interface RouteSegment {
  p0: CanonicalPoint;
  p1: CanonicalPoint;
  segmentLength: number;
  startDistance: number;
}

export class RouteInterpolator {
  public readonly points: CanonicalPoint[];
  public readonly totalLength: number;
  private readonly segments: RouteSegment[];

  constructor(points: CanonicalPoint[]) {
    if (!points || points.length === 0) {
      this.points = [];
      this.totalLength = 0;
      this.segments = [];
      return;
    }

    this.points = points.map((p) => ({ x: p.x, y: p.y }));
    this.segments = [];
    let currentDistance = 0;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[i];
      const p1 = this.points[i + 1];
      const segmentLength = calculateEuclideanDistance(p0, p1);
      this.segments.push({
        p0,
        p1,
        segmentLength,
        startDistance: currentDistance,
      });
      currentDistance += segmentLength;
    }

    this.totalLength = currentDistance;
  }

  /**
   * Samples a point along the path at a specific distance [0, totalLength].
   */
  public getPointAtDistance(distance: number): CanonicalPoint {
    if (this.points.length === 0) {
      return { x: 0, y: 0 };
    }
    if (this.points.length === 1 || this.totalLength === 0) {
      return { ...this.points[0] };
    }

    const clampedDist = Math.max(0, Math.min(this.totalLength, distance));

    // Find segment
    for (const segment of this.segments) {
      const endDist = segment.startDistance + segment.segmentLength;
      if (clampedDist <= endDist || segment === this.segments[this.segments.length - 1]) {
        if (segment.segmentLength === 0) {
          return { ...segment.p0 };
        }
        const segRatio = (clampedDist - segment.startDistance) / segment.segmentLength;
        const clampedRatio = Math.max(0, Math.min(1, segRatio));
        return {
          x: segment.p0.x + (segment.p1.x - segment.p0.x) * clampedRatio,
          y: segment.p0.y + (segment.p1.y - segment.p0.y) * clampedRatio,
        };
      }
    }

    return { ...this.points[this.points.length - 1] };
  }

  /**
   * Samples a point along the path at a normalized progress t in [0, 1].
   */
  public getPointAtProgress(t: number): CanonicalPoint {
    const clampedT = Math.max(0, Math.min(1, t));
    return this.getPointAtDistance(clampedT * this.totalLength);
  }

  /**
   * Generates a clean SVG path string for the route.
   * Supports 'linear' or conservative 'quadratic' fillet to prevent sharp 90° corners
   * without ever overshooting the corridor.
   */
  public toSvgPath(smoothing: 'linear' | 'quadratic' = 'linear'): string {
    if (this.points.length === 0) return '';
    if (this.points.length === 1) return `M ${this.points[0].x} ${this.points[0].y}`;

    if (smoothing === 'linear' || this.points.length <= 2) {
      const start = this.points[0];
      const rest = this.points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
      return `M ${start.x} ${start.y} ${rest}`;
    }

    // Conservative quadratic fillet at intermediate vertices
    // Corner rounding radius is clamped to 15px or 35% of neighboring segment length
    let path = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length - 1; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const next = this.points[i + 1];

      const lenPrev = calculateEuclideanDistance(prev, curr);
      const lenNext = calculateEuclideanDistance(curr, next);

      const maxCornerRadius = Math.min(15, lenPrev * 0.35, lenNext * 0.35);

      if (maxCornerRadius < 2) {
        // Degenerate or short corner, use sharp line
        path += ` L ${curr.x} ${curr.y}`;
      } else {
        // Point before corner
        const ratioPrev = 1 - maxCornerRadius / lenPrev;
        const bX = prev.x + (curr.x - prev.x) * ratioPrev;
        const bY = prev.y + (curr.y - prev.y) * ratioPrev;

        // Point after corner
        const ratioNext = maxCornerRadius / lenNext;
        const aX = curr.x + (next.x - curr.x) * ratioNext;
        const aY = curr.y + (next.y - curr.y) * ratioNext;

        path += ` L ${bX} ${bY} Q ${curr.x} ${curr.y} ${aX} ${aY}`;
      }
    }

    const last = this.points[this.points.length - 1];
    path += ` L ${last.x} ${last.y}`;

    return path;
  }
}
