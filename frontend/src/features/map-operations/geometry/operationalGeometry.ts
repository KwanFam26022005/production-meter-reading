/**
 * Operational Geometry — Cảng Tân Thuận
 * V7 Spatial Operations Console (Canonical V2 Alignment: 1915x821)
 *
 * Provides:
 * - Exactly 6 calibrated visual presentation zones matching tan-thuan-approved-zoning.png
 * - Explicit mapping from 6 presentation zones to 4 authoritative database business zones
 * - Zero-overlap irregular polygons calibrated against the 1915x821 canonical V2 scene
 * - Containment guarantees for all 12 canonical meters
 * - Single presentation transform normalizedToOperationalSvg() -> 1915x821
 * - Operator anchors in verified visual whitespace
 */

import type { NormalizedPoint } from '../types';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_VIEWBOX,
  CANONICAL_OPERATOR_ANCHORS,
  normalizedToCanonicalScene,
  canonicalSceneToNormalized,
} from './canonicalScene';

export const MAP_DIMENSIONS = {
  width: CANONICAL_SCENE_WIDTH,
  height: CANONICAL_SCENE_HEIGHT,
};

export const FIT_VIEWBOX = CANONICAL_VIEWBOX;

export interface ZoneVisualTheme {
  name: string;
  shortName: string;
  number: string;
  primaryColor: string;
  boundaryColor: string;
  glowColor: string;
  haloFillOpacityDefault: number;
  haloFillOpacityHover: number;
  haloFillOpacitySelected: number;
  haloFillOpacityDimmed: number;
  haloStrokeOpacityDefault: number;
  haloStrokeOpacityHover: number;
  haloStrokeOpacitySelected: number;
  haloStrokeOpacityDimmed: number;
  haloStrokeWidthDefault: number;
  structuralBorderOpacityDefault: number;
  structuralBorderOpacityHover: number;
  structuralBorderOpacitySelected: number;
  structuralBorderOpacityDimmed: number;
  structuralBorderWidthDefault: number;
  structuralBorderWidthHover: number;
  structuralBorderWidthSelected: number;
  defaultFill: string;     // 8–10%
  hoverFill: string;       // 15–18%
  selectedFill: string;    // 18–24%
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
}

export const ZONE_VISUAL_THEMES: Record<string, ZoneVisualTheme> = {
  'pres-berth': {
    name: '1. Cầu cảng',
    shortName: 'Cầu Cảng',
    number: '1',
    primaryColor: '#0284C7',
    boundaryColor: '#0284C7',
    glowColor: '#38BDF8',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(2, 132, 199, 0.09)',
    hoverFill: 'rgba(2, 132, 199, 0.16)',
    selectedFill: 'rgba(2, 132, 199, 0.22)',
    badgeBg: 'rgba(7, 30, 48, 0.90)',
    badgeBorder: '#0284C7',
    badgeText: '#E0F2FE',
    icon: 'ship',
  },
  'pres-container-west': {
    name: '2. Bãi container phía Tây',
    shortName: 'Bãi Tây',
    number: '2',
    primaryColor: '#EA580C',
    boundaryColor: '#EA580C',
    glowColor: '#FB923C',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(234, 88, 12, 0.09)',
    hoverFill: 'rgba(234, 88, 12, 0.16)',
    selectedFill: 'rgba(234, 88, 12, 0.22)',
    badgeBg: 'rgba(45, 20, 6, 0.90)',
    badgeBorder: '#EA580C',
    badgeText: '#FFEDD5',
    icon: 'container',
  },
  'pres-container-center': {
    name: '3. Bãi container trung tâm',
    shortName: 'Bãi Trung Tâm',
    number: '3',
    primaryColor: '#E11D48',
    boundaryColor: '#E11D48',
    glowColor: '#FB7185',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(225, 29, 72, 0.09)',
    hoverFill: 'rgba(225, 29, 72, 0.16)',
    selectedFill: 'rgba(225, 29, 72, 0.22)',
    badgeBg: 'rgba(44, 10, 20, 0.90)',
    badgeBorder: '#E11D48',
    badgeText: '#FFE4E6',
    icon: 'container',
  },
  'pres-cfs-east': {
    name: '4. Kho / CFS phía Đông',
    shortName: 'Kho Đông',
    number: '4',
    primaryColor: '#EAB308',
    boundaryColor: '#EAB308',
    glowColor: '#FDE047',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(234, 179, 8, 0.09)',
    hoverFill: 'rgba(234, 179, 8, 0.16)',
    selectedFill: 'rgba(234, 179, 8, 0.22)',
    badgeBg: 'rgba(40, 32, 5, 0.90)',
    badgeBorder: '#EAB308',
    badgeText: '#FEF9C3',
    icon: 'warehouse',
  },
  'pres-technical': {
    name: '5. Khu kỹ thuật / Dịch vụ',
    shortName: 'Kỹ Thuật',
    number: '5',
    primaryColor: '#0D9488',
    boundaryColor: '#0D9488',
    glowColor: '#2DD4BF',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(13, 148, 136, 0.09)',
    hoverFill: 'rgba(13, 148, 136, 0.16)',
    selectedFill: 'rgba(13, 148, 136, 0.22)',
    badgeBg: 'rgba(5, 35, 32, 0.90)',
    badgeBorder: '#0D9488',
    badgeText: '#CCFBF1',
    icon: 'gear',
  },
  'pres-gate': {
    name: '6. Cổng chính',
    shortName: 'Cổng Chính',
    number: '6',
    primaryColor: '#8B5CF6',
    boundaryColor: '#8B5CF6',
    glowColor: '#C084FC',
    haloFillOpacityDefault: 0.09,
    haloFillOpacityHover: 0.16,
    haloFillOpacitySelected: 0.22,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.16,
    haloStrokeOpacityHover: 0.22,
    haloStrokeOpacitySelected: 0.25,
    haloStrokeOpacityDimmed: 0.06,
    haloStrokeWidthDefault: 7.0,
    structuralBorderOpacityDefault: 0.82,
    structuralBorderOpacityHover: 0.88,
    structuralBorderOpacitySelected: 0.95,
    structuralBorderOpacityDimmed: 0.35,
    structuralBorderWidthDefault: 1.35,
    structuralBorderWidthHover: 1.75,
    structuralBorderWidthSelected: 2.15,
    defaultFill: 'rgba(139, 92, 246, 0.09)',
    hoverFill: 'rgba(139, 92, 246, 0.16)',
    selectedFill: 'rgba(139, 92, 246, 0.22)',
    badgeBg: 'rgba(30, 15, 55, 0.90)',
    badgeBorder: '#8B5CF6',
    badgeText: '#EDE9FE',
    icon: 'gate',
  },
};

export interface SpatialZonePresentation {
  presentationId: string;
  businessZoneId: string;
  code: string;
  // Section 12: Explicit Zone Naming Contract
  displayIndex: number;
  displayLabel: string;
  shortLabel: string;
  businessName: string;
  // Backward compatibility fields
  name: string;
  subLabel: string;
  shortName: string;
  regionIndex: number;
  primaryColor?: string;
  accentColor?: string;
  boundaryColor: string;
  glowColor: string;
  haloFillOpacityDefault?: number;
  haloFillOpacityHover?: number;
  haloFillOpacitySelected?: number;
  haloFillOpacityDimmed?: number;
  haloStrokeOpacityDefault?: number;
  haloStrokeOpacityHover?: number;
  haloStrokeOpacitySelected?: number;
  haloStrokeOpacityDimmed?: number;
  haloStrokeWidthDefault?: number;
  structuralBorderOpacityDefault?: number;
  structuralBorderOpacityHover?: number;
  structuralBorderOpacitySelected?: number;
  structuralBorderOpacityDimmed?: number;
  structuralBorderWidthDefault?: number;
  structuralBorderWidthHover?: number;
  structuralBorderWidthSelected?: number;
  defaultFill: string;
  hoverFill: string;
  selectedFill: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
  pointsSvg: { x: number; y: number }[];
  subPolygonsSvg?: { x: number; y: number }[][];
  polygonSvg: string;
  normalizedPolygon: NormalizedPoint[];
  centroidSvg: { x: number; y: number };
  centroidNormalized: NormalizedPoint;
  labelPositionSvg: { x: number; y: number };
  exceptionBadgeSvg: { x: number; y: number };
  operatorAnchorSvg: { x: number; y: number };
  operatorAnchorNormalized: NormalizedPoint;
}

export type OperationalZoneGeometry = SpatialZonePresentation & {
  id: string; // compatibility alias for presentationId / businessZoneId
};

/**
 * Robust Point In Polygon test supporting convex and concave polygons
 */
export function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean;
export function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean;
export function isPointInPolygon(
  first: number | { x: number; y: number },
  second: number | { x: number; y: number }[],
  third?: { x: number; y: number }[]
): boolean {
  let px: number;
  let py: number;
  let polygon: { x: number; y: number }[];

  if (typeof first === 'object') {
    px = first.x;
    py = first.y;
    polygon = second as { x: number; y: number }[];
  } else {
    px = first;
    py = second as number;
    polygon = third as { x: number; y: number }[];
  }

  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i - 1 + n) % n;
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInZone(px: number, py: number, zone: SpatialZonePresentation): boolean {
  if (isPointInPolygon(px, py, zone.pointsSvg)) {
    return true;
  }
  if (zone.subPolygonsSvg && zone.subPolygonsSvg.length > 0) {
    return zone.subPolygonsSvg.some((sub) => isPointInPolygon(px, py, sub));
  }
  return false;
}

/**
 * Single Presentation Transform Functions
 */
export const normalizedToOperationalSvg = normalizedToCanonicalScene;
export const operationalSvgToNormalized = canonicalSceneToNormalized;
export const normalizedToSvg = normalizedToCanonicalScene;
export const svgToNormalized = canonicalSceneToNormalized;

function pointsToSvgPath(points: { x: number; y: number }[]): string {
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

function pointsToNormalized(points: { x: number; y: number }[]): NormalizedPoint[] {
  return points.map((p) => canonicalSceneToNormalized(p.x, p.y));
}

/**
 * 6 Approved Visual Presentation Zones (V7 Redesign):
 * Aligned with tan-thuan-approved-zoning.png and mapped onto 4 authoritative business zones.
 * Traced and calibrated against tan-thuan-canonical-base.png (1915x821).
 */
export const SPATIAL_ZONE_PRESENTATIONS: SpatialZonePresentation[] = [
  {
    ...ZONE_VISUAL_THEMES['pres-berth'],
    presentationId: 'pres-berth',
    businessZoneId: 'zone-berth',
    code: 'ZONE-BERTH',
    displayIndex: 1,
    displayLabel: 'Cầu cảng',
    shortLabel: '1. Cầu cảng',
    businessName: 'Khu vực Cầu cảng (Berths 1–3)',
    name: '1. Cầu cảng',
    subLabel: 'BERTH / QUAY',
    shortName: 'Cầu Cảng',
    regionIndex: 1,
    accentColor: '#0284C7',
    pointsSvg: [
      { x: 211, y: 264 },
      { x: 442, y: 295 },
      { x: 786, y: 313 },
      { x: 1060, y: 290 },
      { x: 1265, y: 246 },
      { x: 1434, y: 202 },
      { x: 1670, y: 148 },
      { x: 1687, y: 211 },
      { x: 1580, y: 296 },
      { x: 1423, y: 329 },
      { x: 1094, y: 364 },
      { x: 809, y: 398 },
      { x: 464, y: 407 },
      { x: 210, y: 398 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 211, y: 264 },
      { x: 442, y: 295 },
      { x: 786, y: 313 },
      { x: 1060, y: 290 },
      { x: 1265, y: 246 },
      { x: 1434, y: 202 },
      { x: 1670, y: 148 },
      { x: 1687, y: 211 },
      { x: 1580, y: 296 },
      { x: 1423, y: 329 },
      { x: 1094, y: 364 },
      { x: 809, y: 398 },
      { x: 464, y: 407 },
      { x: 210, y: 398 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 211, y: 264 },
      { x: 442, y: 295 },
      { x: 786, y: 313 },
      { x: 1060, y: 290 },
      { x: 1265, y: 246 },
      { x: 1434, y: 202 },
      { x: 1670, y: 148 },
      { x: 1687, y: 211 },
      { x: 1580, y: 296 },
      { x: 1423, y: 329 },
      { x: 1094, y: 364 },
      { x: 809, y: 398 },
      { x: 464, y: 407 },
      { x: 210, y: 398 },
    ]),
    centroidSvg: { x: 920, y: 320 },
    centroidNormalized: canonicalSceneToNormalized(920, 320),
    labelPositionSvg: { x: 920, y: 280 },
    exceptionBadgeSvg: { x: 920, y: 308 },
    operatorAnchorSvg: { x: 1060, y: 335 },
    operatorAnchorNormalized: canonicalSceneToNormalized(1060, 335),
  },
  {
    ...ZONE_VISUAL_THEMES['pres-container-west'],
    presentationId: 'pres-container-west',
    businessZoneId: 'zone-warehouse',
    code: 'ZONE-CONT-WEST',
    displayIndex: 2,
    displayLabel: 'Bãi container phía Tây',
    shortLabel: '2. Bãi container phía Tây',
    businessName: 'Khu vực Kho & Bãi Container Phía Tây',
    name: '2. Bãi container phía Tây',
    subLabel: 'WEST CONTAINER YARD',
    shortName: 'Bãi Tây',
    regionIndex: 2,
    accentColor: '#EA580C',
    pointsSvg: [
      { x: 59, y: 319 },
      { x: 210, y: 398 },
      { x: 464, y: 407 },
      { x: 809, y: 398 },
      { x: 820, y: 526 },
      { x: 440, y: 551 },
      { x: 208, y: 570 },
      { x: 46, y: 534 },
      { x: 24, y: 384 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 59, y: 319 },
      { x: 210, y: 398 },
      { x: 464, y: 407 },
      { x: 809, y: 398 },
      { x: 820, y: 526 },
      { x: 440, y: 551 },
      { x: 208, y: 570 },
      { x: 46, y: 534 },
      { x: 24, y: 384 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 59, y: 319 },
      { x: 210, y: 398 },
      { x: 464, y: 407 },
      { x: 809, y: 398 },
      { x: 820, y: 526 },
      { x: 440, y: 551 },
      { x: 208, y: 570 },
      { x: 46, y: 534 },
      { x: 24, y: 384 },
    ]),
    centroidSvg: { x: 440, y: 470 },
    centroidNormalized: canonicalSceneToNormalized(440, 470),
    labelPositionSvg: { x: 320, y: 470 },
    exceptionBadgeSvg: { x: 320, y: 500 },
    operatorAnchorSvg: { x: 450, y: 520 },
    operatorAnchorNormalized: canonicalSceneToNormalized(450, 520),
  },
  {
    ...ZONE_VISUAL_THEMES['pres-container-center'],
    presentationId: 'pres-container-center',
    businessZoneId: 'zone-container',
    code: 'ZONE-CONT-CENTER',
    displayIndex: 3,
    displayLabel: 'Bãi container trung tâm',
    shortLabel: '3. Bãi container trung tâm',
    businessName: 'Khu vực Bãi Container Trung Tâm (CY)',
    name: '3. Bãi container trung tâm',
    subLabel: 'CENTRAL CONTAINER YARD',
    shortName: 'Bãi Trung Tâm',
    regionIndex: 3,
    accentColor: '#E11D48',
    pointsSvg: [
      { x: 809, y: 398 },
      { x: 1094, y: 364 },
      { x: 1423, y: 329 },
      { x: 1541, y: 307 },
      { x: 1546, y: 476 },
      { x: 1298, y: 505 },
      { x: 1071, y: 507 },
      { x: 820, y: 515 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 809, y: 398 },
      { x: 1094, y: 364 },
      { x: 1423, y: 329 },
      { x: 1541, y: 307 },
      { x: 1546, y: 476 },
      { x: 1298, y: 505 },
      { x: 1071, y: 507 },
      { x: 820, y: 515 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 809, y: 398 },
      { x: 1094, y: 364 },
      { x: 1423, y: 329 },
      { x: 1541, y: 307 },
      { x: 1546, y: 476 },
      { x: 1298, y: 505 },
      { x: 1071, y: 507 },
      { x: 820, y: 515 },
    ]),
    centroidSvg: { x: 1180, y: 430 },
    centroidNormalized: canonicalSceneToNormalized(1180, 430),
    labelPositionSvg: { x: 980, y: 435 },
    exceptionBadgeSvg: { x: 980, y: 465 },
    operatorAnchorSvg: { x: 1280, y: 445 },
    operatorAnchorNormalized: canonicalSceneToNormalized(1280, 445),
  },
  {
    ...ZONE_VISUAL_THEMES['pres-cfs-east'],
    presentationId: 'pres-cfs-east',
    businessZoneId: 'zone-warehouse',
    code: 'ZONE-CFS-EAST',
    displayIndex: 4,
    displayLabel: 'Kho / CFS phía Đông',
    shortLabel: '4. Kho / CFS phía Đông',
    businessName: 'Khu vực Kho Ngoại Quan & CFS Phía Đông',
    name: '4. Kho / CFS phía Đông',
    subLabel: 'EAST WAREHOUSE / CFS',
    shortName: 'Kho Đông',
    regionIndex: 4,
    accentColor: '#EAB308',
    pointsSvg: [
      { x: 1541, y: 307 },
      { x: 1580, y: 296 },
      { x: 1687, y: 211 },
      { x: 1871, y: 252 },
      { x: 1877, y: 367 },
      { x: 1804, y: 494 },
      { x: 1591, y: 528 },
      { x: 1546, y: 476 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 1541, y: 307 },
      { x: 1580, y: 296 },
      { x: 1687, y: 211 },
      { x: 1871, y: 252 },
      { x: 1877, y: 367 },
      { x: 1804, y: 494 },
      { x: 1591, y: 528 },
      { x: 1546, y: 476 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 1541, y: 307 },
      { x: 1580, y: 296 },
      { x: 1687, y: 211 },
      { x: 1871, y: 252 },
      { x: 1877, y: 367 },
      { x: 1804, y: 494 },
      { x: 1591, y: 528 },
      { x: 1546, y: 476 },
    ]),
    centroidSvg: { x: 1700, y: 390 },
    centroidNormalized: canonicalSceneToNormalized(1700, 390),
    labelPositionSvg: { x: 1730, y: 310 },
    exceptionBadgeSvg: { x: 1730, y: 338 },
    operatorAnchorSvg: { x: 1730, y: 450 },
    operatorAnchorNormalized: canonicalSceneToNormalized(1730, 450),
  },
  {
    ...ZONE_VISUAL_THEMES['pres-technical'],
    presentationId: 'pres-technical',
    businessZoneId: 'zone-technical',
    code: 'ZONE-TECH',
    displayIndex: 5,
    displayLabel: 'Khu kỹ thuật / Dịch vụ',
    shortLabel: '5. Khu kỹ thuật / Dịch vụ',
    businessName: 'Khu vực Kỹ Thuật, Trạm Cân & Phụ Trợ Nam',
    name: '5. Khu kỹ thuật / Dịch vụ',
    subLabel: 'TECHNICAL / SERVICE AREA',
    shortName: 'Kỹ Thuật',
    regionIndex: 5,
    accentColor: '#0D9488',
    pointsSvg: [
      { x: 820, y: 521 },
      { x: 1071, y: 510 },
      { x: 1298, y: 508 },
      { x: 1501, y: 482 },
      { x: 1501, y: 561 },
      { x: 1320, y: 616 },
      { x: 1286, y: 728 },
      { x: 1229, y: 820 },
      { x: 1035, y: 820 },
      { x: 1013, y: 753 },
      { x: 825, y: 601 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 820, y: 521 },
      { x: 1071, y: 510 },
      { x: 1298, y: 508 },
      { x: 1501, y: 482 },
      { x: 1501, y: 561 },
      { x: 1320, y: 616 },
      { x: 1286, y: 728 },
      { x: 1229, y: 820 },
      { x: 1035, y: 820 },
      { x: 1013, y: 753 },
      { x: 825, y: 601 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 820, y: 521 },
      { x: 1071, y: 510 },
      { x: 1298, y: 508 },
      { x: 1501, y: 482 },
      { x: 1501, y: 561 },
      { x: 1320, y: 616 },
      { x: 1286, y: 728 },
      { x: 1229, y: 820 },
      { x: 1035, y: 820 },
      { x: 1013, y: 753 },
      { x: 825, y: 601 },
    ]),
    centroidSvg: { x: 1150, y: 650 },
    centroidNormalized: canonicalSceneToNormalized(1150, 650),
    labelPositionSvg: { x: 1150, y: 575 },
    exceptionBadgeSvg: { x: 1150, y: 605 },
    operatorAnchorSvg: { x: 1100, y: 770 },
    operatorAnchorNormalized: canonicalSceneToNormalized(1100, 770),
  },
  {
    ...ZONE_VISUAL_THEMES['pres-gate'],
    presentationId: 'pres-gate',
    businessZoneId: 'zone-technical',
    code: 'ZONE-GATE',
    displayIndex: 6,
    displayLabel: 'Cổng chính',
    shortLabel: '6. Cổng chính',
    businessName: 'Khu vực Cổng Chính Cảng Tân Thuận',
    name: '6. Cổng chính',
    subLabel: 'MAIN GATE',
    shortName: 'Cổng Chính',
    regionIndex: 6,
    accentColor: '#8B5CF6',
    pointsSvg: [
      { x: 1501, y: 482 },
      { x: 1546, y: 476 },
      { x: 1591, y: 528 },
      { x: 1872, y: 525 },
      { x: 1872, y: 641 },
      { x: 1636, y: 644 },
      { x: 1580, y: 581 },
      { x: 1501, y: 582 },
    ],
    polygonSvg: pointsToSvgPath([
      { x: 1501, y: 482 },
      { x: 1546, y: 476 },
      { x: 1591, y: 528 },
      { x: 1872, y: 525 },
      { x: 1872, y: 641 },
      { x: 1636, y: 644 },
      { x: 1580, y: 581 },
      { x: 1501, y: 582 },
    ]),
    normalizedPolygon: pointsToNormalized([
      { x: 1501, y: 482 },
      { x: 1546, y: 476 },
      { x: 1591, y: 528 },
      { x: 1872, y: 525 },
      { x: 1872, y: 641 },
      { x: 1636, y: 644 },
      { x: 1580, y: 581 },
      { x: 1501, y: 582 },
    ]),
    centroidSvg: { x: 1660, y: 570 },
    centroidNormalized: canonicalSceneToNormalized(1660, 570),
    labelPositionSvg: { x: 1765, y: 545 },
    exceptionBadgeSvg: { x: 1765, y: 575 },
    operatorAnchorSvg: { x: 1765, y: 615 },
    operatorAnchorNormalized: canonicalSceneToNormalized(1765, 615),
  },
];

/**
 * 4 Business Zones Geometry with backward compatibility:
 * Supports querying by businessZoneId (e.g. 'zone-berth', 'zone-warehouse', 'zone-container', 'zone-technical')
 * with full point-in-zone coverage.
 */
const presBerth = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-berth')!;
const presContWest = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-container-west')!;
const presContCenter = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-container-center')!;
const presCfsEast = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-cfs-east')!;
const presTech = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-technical')!;
const presGate = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === 'pres-gate')!;

export const BUSINESS_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  {
    ...presBerth,
    id: 'zone-berth',
    name: 'Khu vực Cầu cảng (Berths 1 - 3)',
    shortName: 'Cầu Cảng',
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-berth'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-berth'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-berth'].y
    ),
  },
  {
    ...presContWest,
    id: 'zone-warehouse',
    name: 'Khu vực Kho hàng Tổng hợp (B, C, D)',
    shortName: 'Kho Hàng',
    subPolygonsSvg: [presCfsEast.pointsSvg],
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-warehouse'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-warehouse'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-warehouse'].y
    ),
  },
  {
    ...presContCenter,
    id: 'zone-container',
    name: 'Khu vực Bãi Container (CY)',
    shortName: 'Bãi Container',
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-container'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-container'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-container'].y
    ),
  },
  {
    ...presTech,
    id: 'zone-technical',
    name: 'Khu Kỹ thuật & Trạm Phụ trợ Điện',
    shortName: 'Kỹ Thuật',
    subPolygonsSvg: [presGate.pointsSvg],
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-technical'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-technical'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-technical'].y
    ),
  },
];

/**
 * Backward compatibility alias: OPERATIONAL_ZONES_GEOMETRY
 * Contains both the 4 business zone geometries and the 6 presentation geometries.
 */
export const OPERATIONAL_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  ...BUSINESS_ZONES_GEOMETRY,
  ...SPATIAL_ZONE_PRESENTATIONS.map((p) => ({ ...p, id: p.presentationId })),
];

/**
 * Presentation mapping helpers
 */
export function getPresentationById(presentationId: string): SpatialZonePresentation | undefined {
  return SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === presentationId);
}

export function getPresentationsForBusinessZone(businessZoneId: string): SpatialZonePresentation[] {
  return SPATIAL_ZONE_PRESENTATIONS.filter((p) => p.businessZoneId === businessZoneId);
}

export function resolveToBusinessZoneId(id: string | null | undefined): string | null {
  if (!id) return null;
  const match = SPATIAL_ZONE_PRESENTATIONS.find(
    (p) => p.presentationId === id || p.businessZoneId === id
  );
  return match ? match.businessZoneId : id;
}

export function isPresentationOrBusinessZoneSelected(
  zone: SpatialZonePresentation,
  selectedId: string | null | undefined
): boolean {
  if (!selectedId) return false;
  return zone.presentationId === selectedId || zone.businessZoneId === selectedId;
}

/**
 * Returns deterministic SVG coordinates for placing an operator marker in a zone.
 */
export function getZoneOperatorAnchor(zoneId: string): { x: number; y: number } {
  // Check exact match in CANONICAL_OPERATOR_ANCHORS first
  if (CANONICAL_OPERATOR_ANCHORS[zoneId]) {
    return CANONICAL_OPERATOR_ANCHORS[zoneId];
  }
  // Check presentation zones
  const pres = SPATIAL_ZONE_PRESENTATIONS.find(
    (p) => p.presentationId === zoneId || p.businessZoneId === zoneId
  );
  if (pres?.operatorAnchorSvg) return pres.operatorAnchorSvg;

  const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
  if (geo?.operatorAnchorSvg) return geo.operatorAnchorSvg;
  if (geo?.centroidSvg) return { x: geo.centroidSvg.x, y: geo.centroidSvg.y + 30 };

  // Canonical V2 center fallback (1915 / 2 = 958, 821 / 2 = 411)
  return { x: 958, y: 411 };
}

/**
 * Test if a point in canonical scene coordinates is inside a given presentation zone.
 */
export function isPointInPresentationZone(
  point: { x: number; y: number },
  presentationId: string
): boolean {
  const pres = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === presentationId);
  if (!pres) return false;
  return isPointInPolygon(point, pres.pointsSvg);
}

/**
 * Test if a point in canonical scene coordinates is inside a business zone (or presentation zone).
 */
export function isPointInBusinessZone(
  point: { x: number; y: number },
  zoneId: string
): boolean {
  // If it's a presentation ID:
  const directPres = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === zoneId);
  if (directPres) {
    return isPointInPolygon(point, directPres.pointsSvg);
  }

  // Check all presentations that map to this business zone:
  const presList = SPATIAL_ZONE_PRESENTATIONS.filter((p) => p.businessZoneId === zoneId);
  if (presList.length > 0) {
    return presList.some((pres) => isPointInPolygon(point, pres.pointsSvg));
  }

  // Fallback to legacy OPERATIONAL_ZONES_GEOMETRY
  const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
  if (!geo) return false;
  if (isPointInPolygon(point, geo.pointsSvg)) return true;
  if (geo.subPolygonsSvg) {
    return geo.subPolygonsSvg.some((poly) => isPointInPolygon(point, poly));
  }
  return false;
}

export interface ZoneBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Computes bounding box for any presentation or business zone in V2 coordinates.
 */
export function getZoneBoundingBox(zoneId: string): ZoneBoundingBox {
  const presList = SPATIAL_ZONE_PRESENTATIONS.filter(
    (p) => p.presentationId === zoneId || p.businessZoneId === zoneId
  );

  let points: { x: number; y: number }[] = [];
  if (presList.length > 0) {
    for (const pres of presList) {
      points.push(...pres.pointsSvg);
    }
  } else {
    const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
    if (geo) {
      points.push(...geo.pointsSvg);
      if (geo.subPolygonsSvg) {
        for (const sub of geo.subPolygonsSvg) {
          points.push(...sub);
        }
      }
    }
  }

  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: CANONICAL_SCENE_WIDTH,
      maxY: CANONICAL_SCENE_HEIGHT,
      width: CANONICAL_SCENE_WIDTH,
      height: CANONICAL_SCENE_HEIGHT,
      centerX: CANONICAL_SCENE_WIDTH / 2,
      centerY: CANONICAL_SCENE_HEIGHT / 2,
    };
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return { minX, minY, maxX, maxY, width, height, centerX, centerY };
}

/**
 * Calculates smooth 2D orthographic camera framing parameters (zoom, panX, panY)
 * to frame a zone comfortably inside the 1915x821 canvas with generous operational padding.
 */
export function calculateZoneCameraFraming(
  zoneId: string
): { zoom: number; panX: number; panY: number } {
  const bbox = getZoneBoundingBox(zoneId);

  // Target padding: 1.5x width and 1.5x height
  const zoomX = CANONICAL_SCENE_WIDTH / Math.max(bbox.width * 1.5, 300);
  const zoomY = CANONICAL_SCENE_HEIGHT / Math.max(bbox.height * 1.5, 200);
  const targetZoom = Number(Math.min(1.85, Math.max(1.15, Math.min(zoomX, zoomY))).toFixed(2));

  // Center the bounding box center in the 1915x821 viewBox:
  // sceneCenter_screen = pan + sceneCenter_world * zoom
  // -> pan = (viewBoxDimension / 2) - sceneCenter_world * zoom
  const panX = Math.round(CANONICAL_SCENE_WIDTH / 2 - bbox.centerX * targetZoom);
  const panY = Math.round(CANONICAL_SCENE_HEIGHT / 2 - bbox.centerY * targetZoom);

  return { zoom: targetZoom, panX, panY };
}
