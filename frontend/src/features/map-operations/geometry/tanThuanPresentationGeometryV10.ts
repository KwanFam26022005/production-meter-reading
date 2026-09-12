/**
 * Tan Thuan Presentation Geometry V10
 * Authoritative single runtime consumer for the canonical geometry JSON artifact.
 *
 * Canonical Dimensions: 1915 x 821
 * Coordinate System: tan-thuan-canonical-image-pixel-space-v1
 * Artifact Source: frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json
 */

import rawGeometry from './tanThuanPresentationGeometry.v10.json';
import { CalibrationLandmark, ZONE_BOUNDARY_CONTRACTS, ZoneBoundaryContract } from './canonicalLandmarks';

export interface CanonicalPoint {
  x: number;
  y: number;
  landmarkId?: string;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface V10RawZone {
  id: string;
  displayIndex: number;
  displayLabel: string;
  businessName: string;
  businessZoneIds: string[];
  presentationColor: string;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
  polygonCanonical: CanonicalPoint[];
  labelAnchorCanonical: { x: number; y: number };
  operatorAnchorCanonical: { x: number; y: number };
}

export interface V10GeometryManifest {
  schemaVersion: string;
  mapVersion: string;
  coordinateSystem: string;
  canonicalWidth: number;
  canonicalHeight: number;
  zones: V10RawZone[];
  landmarks: CalibrationLandmark[];
}

export interface PresentationZoneV10 {
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
  labelAnchorCanonical: { x: number; y: number };
  labelPositionSvg: { x: number; y: number };
  operatorAnchorCanonical: { x: number; y: number };
  operatorAnchorSvg: { x: number; y: number };
  centroidCanonical: { x: number; y: number };
  centroidSvg: { x: number; y: number };
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
  boundaryContract?: ZoneBoundaryContract;
}

export const CANONICAL_GEOMETRY_V10: V10GeometryManifest = rawGeometry as V10GeometryManifest;

export const CANONICAL_WIDTH = CANONICAL_GEOMETRY_V10.canonicalWidth || 1915;
export const CANONICAL_HEIGHT = CANONICAL_GEOMETRY_V10.canonicalHeight || 821;
export const CANONICAL_LANDMARKS = CANONICAL_GEOMETRY_V10.landmarks || [];

export function canonicalPointToNormalized(p: { x: number; y: number }): NormalizedPoint {
  return {
    x: Number((p.x / CANONICAL_WIDTH).toFixed(4)),
    y: Number((p.y / CANONICAL_HEIGHT).toFixed(4)),
  };
}

export function pointsToSvgPath(points: { x: number; y: number }[]): string {
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

export function computeCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
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
  cx /= 6 * area;
  cy /= 6 * area;
  return { x: Math.round(cx), y: Math.round(cy) };
}

/**
 * Derived V10 presentation zones ready for SVG runtime rendering
 */
export const V10_PRESENTATION_ZONES: PresentationZoneV10[] = CANONICAL_GEOMETRY_V10.zones.map((raw) => {
  const normalizedPolygon = raw.polygonCanonical.map(canonicalPointToNormalized);
  const polygonSvg = pointsToSvgPath(raw.polygonCanonical);
  const centroidCanonical = computeCentroid(raw.polygonCanonical);

  return {
    id: raw.id,
    presentationId: raw.id,
    displayIndex: raw.displayIndex,
    displayLabel: raw.displayLabel,
    shortLabel: raw.displayLabel,
    businessName: raw.businessName,
    businessZoneId: raw.businessZoneIds[0] || raw.id,
    businessZoneIds: raw.businessZoneIds,
    presentationColor: raw.presentationColor,
    accentColor: raw.presentationColor,
    polygonCanonical: raw.polygonCanonical,
    normalizedPolygon,
    polygonSvg,
    labelAnchorCanonical: raw.labelAnchorCanonical,
    labelPositionSvg: raw.labelAnchorCanonical,
    operatorAnchorCanonical: raw.operatorAnchorCanonical,
    operatorAnchorSvg: raw.operatorAnchorCanonical,
    centroidCanonical,
    centroidSvg: centroidCanonical,
    icon: raw.icon,
    boundaryContract: ZONE_BOUNDARY_CONTRACTS[raw.id],
  };
});

export function getV10PresentationZoneById(id: string): PresentationZoneV10 | undefined {
  return V10_PRESENTATION_ZONES.find((z) => z.id === id || z.presentationId === id);
}

// Backward compatibility aliases
export const V9_PRESENTATION_ZONES = V10_PRESENTATION_ZONES;
export const V81_PRESENTATION_ZONES = V10_PRESENTATION_ZONES;
export const CANONICAL_GEOMETRY_V9 = CANONICAL_GEOMETRY_V10;
export const getV9PresentationZoneById = getV10PresentationZoneById;
export const derivePresentationZones = () => V10_PRESENTATION_ZONES;

export type V9RawZone = V10RawZone;
export type V9GeometryManifest = V10GeometryManifest;
export type PresentationZoneV9 = PresentationZoneV10;
export type PresentationZoneV81 = PresentationZoneV10;
