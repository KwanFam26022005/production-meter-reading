/**
 * Operational Geometry — Cảng Tân Thuận (Phase H1 Canonical Alignment)
 *
 * Provides:
 * - 4 Canonical Operational Zones with irregular polygons matching the approved physical map
 * - Single presentation transform normalizedToOperationalSvg() -> 1664x932
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

export interface OperationalZoneGeometry {
  id: string;
  code: string;
  name: string;
  shortName: string;
  polygonSvg: string;
  pointsSvg: { x: number; y: number }[];
  subPolygonsSvg?: { x: number; y: number }[][];
  normalizedPolygon: NormalizedPoint[];
  centroidSvg: { x: number; y: number };
  centroidNormalized: NormalizedPoint;
  labelPositionSvg: { x: number; y: number };
  exceptionBadgeSvg: { x: number; y: number };
  operatorAnchorSvg: { x: number; y: number };
  operatorAnchorNormalized: NormalizedPoint;
  accentColor: string;
}

/**
 * Robust Point In Polygon test supporting convex, concave, and multi-subpolygon zones
 */
export function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
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

export function isPointInZone(px: number, py: number, zone: OperationalZoneGeometry): boolean {
  if (zone.subPolygonsSvg && zone.subPolygonsSvg.length > 0) {
    return zone.subPolygonsSvg.some((sub) => isPointInPolygon(px, py, sub));
  }
  return isPointInPolygon(px, py, zone.pointsSvg);
}

/**
 * Single Presentation Transform Functions
 */
export const normalizedToOperationalSvg = normalizedToCanonicalScene;
export const operationalSvgToNormalized = canonicalSceneToNormalized;
export const normalizedToSvg = normalizedToCanonicalScene;
export const svgToNormalized = canonicalSceneToNormalized;

/**
 * 4 Canonical Operational Zones aligned to physical landmarks on approved port map:
 * 1. zone-berth: Quayside apron along river water (Berths B.15, B.17, B.19, B.21A, B.21B, B.25A)
 * 2. zone-warehouse: CFS & General Cargo Warehouses (Kho B, Kho C, and Kho D / KHO)
 * 3. zone-container: Main container yard blocks (CY 1 & CY 2)
 * 4. zone-technical: Electrical substation (TRẠM ĐIỆN), weighbridge (CÂN XE), gate (CỔNG CHÍNH), workshops
 */
export const OPERATIONAL_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  {
    id: 'zone-berth',
    code: 'ZONE-BERTH',
    name: 'Khu vực Cầu cảng (Cầu 1–3)',
    shortName: 'Cầu Cảng',
    accentColor: '#0E7490',
    pointsSvg: [
      { x: 80, y: 360 },
      { x: 380, y: 400 },
      { x: 680, y: 415 },
      { x: 920, y: 390 },
      { x: 1220, y: 335 },
      { x: 1370, y: 265 },
      { x: 1460, y: 310 },
      { x: 1380, y: 370 },
      { x: 1220, y: 405 },
      { x: 920, y: 445 },
      { x: 680, y: 470 },
      { x: 380, y: 455 },
      { x: 75, y: 415 },
    ],
    polygonSvg:
      'M 80,360 L 380,400 L 680,415 L 920,390 L 1220,335 L 1370,265 L 1460,310 L 1380,370 L 1220,405 L 920,445 L 680,470 L 380,455 L 75,415 Z',
    normalizedPolygon: [
      { x: 0.0481, y: 0.3863 },
      { x: 0.2284, y: 0.4292 },
      { x: 0.4087, y: 0.4453 },
      { x: 0.5529, y: 0.4185 },
      { x: 0.7332, y: 0.3594 },
      { x: 0.8233, y: 0.2843 },
      { x: 0.8774, y: 0.3326 },
      { x: 0.8293, y: 0.3970 },
      { x: 0.7332, y: 0.4345 },
      { x: 0.5529, y: 0.4775 },
      { x: 0.4087, y: 0.5043 },
      { x: 0.2284, y: 0.4882 },
      { x: 0.0451, y: 0.4453 },
    ],
    centroidSvg: { x: 760, y: 410 },
    centroidNormalized: { x: 0.4567, y: 0.4399 },
    labelPositionSvg: { x: 760, y: 410 },
    exceptionBadgeSvg: { x: 700, y: 410 },
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-berth'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-berth'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-berth'].y
    ),
  },
  {
    id: 'zone-warehouse',
    code: 'ZONE-WH',
    name: 'Khu vực Kho CFS & Hàng tổng hợp',
    shortName: 'Kho Bãi',
    accentColor: '#B45309',
    pointsSvg: [
      { x: 380, y: 445 },
      { x: 615, y: 445 },
      { x: 615, y: 530 },
      { x: 930, y: 530 },
      { x: 930, y: 545 },
      { x: 1115, y: 545 },
      { x: 1115, y: 645 },
      { x: 930, y: 645 },
      { x: 860, y: 580 },
      { x: 615, y: 580 },
      { x: 380, y: 580 },
    ],
    subPolygonsSvg: [
      [
        { x: 380, y: 445 },
        { x: 615, y: 445 },
        { x: 615, y: 580 },
        { x: 380, y: 580 },
      ],
      [
        { x: 930, y: 545 },
        { x: 1115, y: 545 },
        { x: 1115, y: 645 },
        { x: 930, y: 645 },
      ],
    ],
    polygonSvg:
      'M 380,445 L 615,445 L 615,580 L 380,580 Z M 930,545 L 1115,545 L 1115,645 L 930,645 Z',
    normalizedPolygon: [
      { x: 0.2284, y: 0.4775 },
      { x: 0.3696, y: 0.4775 },
      { x: 0.3696, y: 0.6223 },
      { x: 0.2284, y: 0.6223 },
      { x: 0.5589, y: 0.5848 },
      { x: 0.6701, y: 0.5848 },
      { x: 0.6701, y: 0.6921 },
      { x: 0.5589, y: 0.6921 },
    ],
    centroidSvg: { x: 500, y: 512 },
    centroidNormalized: { x: 0.3005, y: 0.5494 },
    labelPositionSvg: { x: 500, y: 465 },
    exceptionBadgeSvg: { x: 500, y: 565 },
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-warehouse'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-warehouse'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-warehouse'].y
    ),
  },
  {
    id: 'zone-container',
    code: 'ZONE-CONT',
    name: 'Khu vực Bãi Container',
    shortName: 'Bãi Container',
    accentColor: '#1D4ED8',
    pointsSvg: [
      { x: 915, y: 405 },
      { x: 1330, y: 395 },
      { x: 1350, y: 545 },
      { x: 1125, y: 555 },
      { x: 915, y: 535 },
    ],
    polygonSvg:
      'M 915,405 L 1330,395 L 1350,545 L 1125,555 L 915,535 Z',
    normalizedPolygon: [
      { x: 0.5499, y: 0.4345 },
      { x: 0.7993, y: 0.4238 },
      { x: 0.8113, y: 0.5848 },
      { x: 0.6761, y: 0.5955 },
      { x: 0.5499, y: 0.5740 },
    ],
    centroidSvg: { x: 1130, y: 475 },
    centroidNormalized: { x: 0.6791, y: 0.5097 },
    labelPositionSvg: { x: 1130, y: 420 },
    exceptionBadgeSvg: { x: 1130, y: 455 },
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-container'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-container'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-container'].y
    ),
  },
  {
    id: 'zone-technical',
    code: 'ZONE-TECH',
    name: 'Khu vực Kỹ thuật, Trạm điện & Cổng',
    shortName: 'Kỹ Thuật & Cổng',
    accentColor: '#475569',
    pointsSvg: [
      { x: 890, y: 670 },
      { x: 1105, y: 670 },
      { x: 1105, y: 755 },
      { x: 1060, y: 755 },
      { x: 1060, y: 890 },
      { x: 910, y: 890 },
      { x: 910, y: 775 },
      { x: 890, y: 775 },
    ],
    polygonSvg:
      'M 890,670 L 1105,670 L 1105,755 L 1060,755 L 1060,890 L 910,890 L 910,775 L 890,775 Z',
    normalizedPolygon: [
      { x: 0.5349, y: 0.7189 },
      { x: 0.6641, y: 0.7189 },
      { x: 0.6641, y: 0.8101 },
      { x: 0.6370, y: 0.8101 },
      { x: 0.6370, y: 0.9549 },
      { x: 0.5469, y: 0.9549 },
      { x: 0.5469, y: 0.8315 },
      { x: 0.5349, y: 0.8315 },
    ],
    centroidSvg: { x: 995, y: 765 },
    centroidNormalized: { x: 0.5980, y: 0.8208 },
    labelPositionSvg: { x: 1000, y: 690 },
    exceptionBadgeSvg: { x: 1000, y: 815 },
    operatorAnchorSvg: CANONICAL_OPERATOR_ANCHORS['zone-technical'],
    operatorAnchorNormalized: canonicalSceneToNormalized(
      CANONICAL_OPERATOR_ANCHORS['zone-technical'].x,
      CANONICAL_OPERATOR_ANCHORS['zone-technical'].y
    ),
  },
];

/**
 * Returns deterministic SVG coordinates for placing an operator marker in a zone.
 */
export function getZoneOperatorAnchor(zoneId: string): { x: number; y: number } {
  if (CANONICAL_OPERATOR_ANCHORS[zoneId]) {
    return CANONICAL_OPERATOR_ANCHORS[zoneId];
  }
  const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
  if (geo?.operatorAnchorSvg) return geo.operatorAnchorSvg;
  if (geo?.centroidSvg) return { x: geo.centroidSvg.x, y: geo.centroidSvg.y + 30 };
  return { x: 832, y: 466 };
}
