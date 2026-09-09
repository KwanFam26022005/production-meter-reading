import { NormalizedPoint } from '../types';
import { PORT_MAP_DIMENSIONS } from '../config/portMapConfig';

/**
 * Projects normalized [0, 1] coordinates into SVG canvas pixel coordinates
 */
export function normalizeToSvg(
  point: NormalizedPoint,
  width: number = PORT_MAP_DIMENSIONS.viewBoxWidth,
  height: number = PORT_MAP_DIMENSIONS.viewBoxHeight
): { x: number; y: number } {
  return {
    x: Math.round(point.x * width),
    y: Math.round(point.y * height),
  };
}

/**
 * Converts array of normalized points into an SVG polygon points string ("x1,y1 x2,y2 ...")
 */
export function polygonToSvgPoints(
  polygon: NormalizedPoint[],
  width: number = PORT_MAP_DIMENSIONS.viewBoxWidth,
  height: number = PORT_MAP_DIMENSIONS.viewBoxHeight
): string {
  return polygon
    .map((p) => {
      const projected = normalizeToSvg(p, width, height);
      return `${projected.x},${projected.y}`;
    })
    .join(' ');
}

/**
 * Computes polygon centroid for placing labels or center-focusing
 */
export function calculatePolygonCentroid(polygon: NormalizedPoint[]): NormalizedPoint {
  if (!polygon.length) return { x: 0.5, y: 0.5 };
  let sumX = 0;
  let sumY = 0;
  for (const pt of polygon) {
    sumX += pt.x;
    sumY += pt.y;
  }
  return {
    x: Number((sumX / polygon.length).toFixed(4)),
    y: Number((sumY / polygon.length).toFixed(4)),
  };
}

/**
 * Computes polygon bounding box in normalized coordinates
 */
export function calculatePolygonBoundingBox(polygon: NormalizedPoint[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (!polygon.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const pt of polygon) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  return { minX, minY, maxX, maxY };
}
