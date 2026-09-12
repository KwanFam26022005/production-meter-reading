/**
 * Tan Thuan Presentation Geometry V9
 * Authoritative single runtime consumer for the canonical geometry JSON artifact.
 *
 * Canonical Dimensions: 1915 x 821
 * Coordinate System: tan-thuan-canonical-image-pixel-space-v1
 * Artifact Source: frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v9.json
 */

import rawGeometry from './tanThuanPresentationGeometry.v9.json';

export interface CanonicalPoint {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface V9RawZone {
  id: string;
  displayIndex: number;
  displayLabel: string;
  businessName: string;
  businessZoneIds: string[];
  presentationColor: string;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
  polygonCanonical: CanonicalPoint[];
  labelAnchorCanonical: CanonicalPoint;
  operatorAnchorCanonical: CanonicalPoint;
}

export interface V9GeometryManifest {
  schemaVersion: string;
  mapVersion: string;
  coordinateSystem: string;
  canonicalWidth: number;
  canonicalHeight: number;
  zones: V9RawZone[];
}

export interface PresentationZoneV9 {
  id: string;
  presentationId: string;
  displayIndex: number;
  displayLabel: string;
  shortLabel: string;
  businessName: string;
  businessZoneId: string;
  businessZoneIds: string[];
  presentationColor: string;
  accentColor: string;
  polygonCanonical: CanonicalPoint[];
  normalizedPolygon: NormalizedPoint[];
  polygonSvg: string;
  labelAnchorCanonical: CanonicalPoint;
  labelPositionSvg: CanonicalPoint;
  operatorAnchorCanonical: CanonicalPoint;
  operatorAnchorSvg: CanonicalPoint;
  centroidCanonical: CanonicalPoint;
  centroidSvg: CanonicalPoint;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
}

export const CANONICAL_GEOMETRY_V9: V9GeometryManifest = rawGeometry as V9GeometryManifest;

export const CANONICAL_WIDTH = CANONICAL_GEOMETRY_V9.canonicalWidth || 1915;
export const CANONICAL_HEIGHT = CANONICAL_GEOMETRY_V9.canonicalHeight || 821;

export function canonicalPointToNormalized(p: CanonicalPoint): NormalizedPoint {
  return {
    x: Number((p.x / CANONICAL_WIDTH).toFixed(4)),
    y: Number((p.y / CANONICAL_HEIGHT).toFixed(4)),
  };
}

export function pointsToSvgPath(points: CanonicalPoint[]): string {
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

export function computeCentroid(points: CanonicalPoint[]): CanonicalPoint {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    area += factor;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) {
    const meanX = points.reduce((s, p) => s + p.x, 0) / n;
    const meanY = points.reduce((s, p) => s + p.y, 0) / n;
    return { x: Math.round(meanX), y: Math.round(meanY) };
  }
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: Math.round(cx), y: Math.round(cy) };
}

/**
 * Derives runtime PresentationZone objects from canonical geometry manifest
 */
export function derivePresentationZones(manifest: V9GeometryManifest = CANONICAL_GEOMETRY_V9): PresentationZoneV9[] {
  return manifest.zones.map((z) => {
    const centroid = computeCentroid(z.polygonCanonical);
    return {
      ...z,
      presentationId: z.id,
      shortLabel: `${z.displayIndex}. ${z.displayLabel}`,
      businessZoneId: z.businessZoneIds[0],
      accentColor: z.presentationColor,
      normalizedPolygon: z.polygonCanonical.map(canonicalPointToNormalized),
      polygonSvg: pointsToSvgPath(z.polygonCanonical),
      labelPositionSvg: z.labelAnchorCanonical,
      operatorAnchorSvg: z.operatorAnchorCanonical,
      centroidCanonical: centroid,
      centroidSvg: centroid,
    };
  });
}

export const V9_PRESENTATION_ZONES: PresentationZoneV9[] = derivePresentationZones(CANONICAL_GEOMETRY_V9);

// Backwards compatibility alias ensuring zero array duplication
export const V81_PRESENTATION_ZONES = V9_PRESENTATION_ZONES;
export type PresentationZoneV81 = PresentationZoneV9;
