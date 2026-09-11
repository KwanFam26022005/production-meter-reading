/**
 * Operational Geometry — Tan Thuan Port
 *
 * Contains ONLY operational layout specifications:
 * - 4 Canonical Operational Zones (boundaries, polygon points, visual centroids)
 * - Meter coordinate mapping for the elongated 2.5:1 canvas (1300 x 520)
 * - Label positioning anchors
 *
 * NOTE: Separated from physical scene features (physicalScene.ts).
 *
 * PHASE 6A: All zone y-coordinates shifted by -42px to match reduced river height
 * (river now ends ~y=68 instead of y=110).
 */

import type { NormalizedPoint } from '../types';
import { PHYSICAL_VIEWBOX } from './physicalScene.ts';

export interface OperationalZoneGeometry {
  id: string;
  code: string;
  name: string;
  shortName: string;
  polygonSvg: string; // SVG path string
  pointsSvg: { x: number; y: number }[];
  normalizedPolygon: NormalizedPoint[];
  centroidSvg: { x: number; y: number };
  centroidNormalized: NormalizedPoint;
  labelPositionSvg: { x: number; y: number };
  operatorAnchorSvg?: { x: number; y: number };
  operatorAnchorNormalized?: NormalizedPoint;
  accentColor: string;
}

// Coordinate conversions between normalized [0, 1] and SVG [1300, 520]
export function normalizedToSvg(point: NormalizedPoint): { x: number; y: number } {
  return {
    x: Math.round(point.x * PHYSICAL_VIEWBOX.width),
    y: Math.round(point.y * PHYSICAL_VIEWBOX.height),
  };
}

export function svgToNormalized(svgX: number, svgY: number): NormalizedPoint {
  return {
    x: Number((svgX / PHYSICAL_VIEWBOX.width).toFixed(4)),
    y: Number((svgY / PHYSICAL_VIEWBOX.height).toFixed(4)),
  };
}

/**
 * 4 Canonical Operational Zones in Tan Thuan Port:
 * 1. zone-berth: Quayside & handling apron (Cầu 1, 2, 3)     — y: 64–112
 * 2. zone-warehouse: CFS & General Cargo Warehouses (West)    — y: 114–436
 * 3. zone-container: Container staging blocks A1,A2,B1,B2     — y: 114–436
 * 4. zone-technical: Substation, workshops, and gate (South)  — y: 290–505
 *
 * All shifted -42px from original Phase-6 coordinates.
 */
export const OPERATIONAL_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  {
    id: 'zone-berth',
    code: 'ZONE-BERTH',
    name: 'Khu vực Cầu cảng (Cầu 1–3)',
    shortName: 'Cầu Cảng',
    accentColor: '#0E7490',
    pointsSvg: [
      { x: 145, y: 63 },
      { x: 1215, y: 63 },
      { x: 1215, y: 110 },
      { x: 145, y: 110 },
    ],
    polygonSvg: 'M 145,63 L 1215,63 L 1215,110 L 145,110 Z',
    normalizedPolygon: [
      { x: 0.112, y: 0.121 },
      { x: 0.935, y: 0.121 },
      { x: 0.935, y: 0.212 },
      { x: 0.112, y: 0.212 },
    ],
    centroidSvg: { x: 680, y: 88 },
    centroidNormalized: { x: 0.523, y: 0.169 },
    labelPositionSvg: { x: 680, y: 88 },
    operatorAnchorSvg: { x: 860, y: 88 },
    operatorAnchorNormalized: { x: 0.662, y: 0.169 },
  },
  {
    id: 'zone-warehouse',
    code: 'ZONE-WH',
    name: 'Khu vực Kho CFS & Hàng tổng hợp',
    shortName: 'Kho Bãi',
    accentColor: '#B45309',
    pointsSvg: [
      { x: 55, y: 114 },
      { x: 635, y: 114 },
      { x: 635, y: 436 },
      { x: 55, y: 436 },
    ],
    polygonSvg: 'M 55,114 L 635,114 L 635,436 L 55,436 Z',
    normalizedPolygon: [
      { x: 0.042, y: 0.219 },
      { x: 0.488, y: 0.219 },
      { x: 0.488, y: 0.838 },
      { x: 0.042, y: 0.838 },
    ],
    centroidSvg: { x: 345, y: 265 },
    centroidNormalized: { x: 0.265, y: 0.510 },
    labelPositionSvg: { x: 345, y: 265 },
    operatorAnchorSvg: { x: 345, y: 340 },
    operatorAnchorNormalized: { x: 0.265, y: 0.654 },
  },
  {
    id: 'zone-container',
    code: 'ZONE-CONT',
    name: 'Khu vực Bãi Container',
    shortName: 'Bãi Container',
    accentColor: '#1D4ED8',
    pointsSvg: [
      { x: 665, y: 114 },
      { x: 1255, y: 114 },
      { x: 1255, y: 436 },
      { x: 665, y: 436 },
    ],
    polygonSvg: 'M 665,114 L 1255,114 L 1255,436 L 665,436 Z',
    normalizedPolygon: [
      { x: 0.512, y: 0.219 },
      { x: 0.965, y: 0.219 },
      { x: 0.965, y: 0.838 },
      { x: 0.512, y: 0.838 },
    ],
    centroidSvg: { x: 960, y: 265 },
    centroidNormalized: { x: 0.738, y: 0.510 },
    labelPositionSvg: { x: 960, y: 265 },
    operatorAnchorSvg: { x: 960, y: 345 },
    operatorAnchorNormalized: { x: 0.738, y: 0.663 },
  },
  {
    id: 'zone-technical',
    code: 'ZONE-TECH',
    name: 'Khu vực Kỹ thuật, Trạm điện & Cổng',
    shortName: 'Kỹ Thuật & Cổng',
    accentColor: '#475569',
    pointsSvg: [
      { x: 340, y: 298 },
      { x: 740, y: 298 },
      { x: 740, y: 498 },
      { x: 340, y: 498 },
    ],
    polygonSvg: 'M 340,298 L 740,298 L 740,498 L 340,498 Z',
    normalizedPolygon: [
      { x: 0.262, y: 0.573 },
      { x: 0.569, y: 0.573 },
      { x: 0.569, y: 0.958 },
      { x: 0.262, y: 0.958 },
    ],
    centroidSvg: { x: 540, y: 398 },
    centroidNormalized: { x: 0.415, y: 0.765 },
    labelPositionSvg: { x: 540, y: 398 },
    operatorAnchorSvg: { x: 540, y: 445 },
    operatorAnchorNormalized: { x: 0.415, y: 0.856 },
  },
];

/**
 * Returns deterministic SVG coordinates for placing an operator marker in a zone.
 * Fallback to zone centroid + 40px Y offset, or map center.
 */
export function getZoneOperatorAnchor(zoneId: string): { x: number; y: number } {
  const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
  if (geo?.operatorAnchorSvg) return geo.operatorAnchorSvg;
  if (geo?.centroidSvg) return { x: geo.centroidSvg.x, y: geo.centroidSvg.y + 40 };
  return { x: 650, y: 260 };
}

/**
 * Coordinate mapping adapter for existing meters into the elongated 2.5:1 port space.
 * All meter Y-coordinates shifted proportionally for the adjusted scene.
 */
export const OPERATIONAL_METER_COORDINATES: Record<string, NormalizedPoint> = {
  'CT-001': { x: 0.238, y: 0.169 },  // Cầu 1 (Quayside Berth 1)
  'CT-002': { x: 0.515, y: 0.169 },  // Cầu 2 (Quayside Berth 2)
  'CT-003': { x: 0.792, y: 0.169 },  // Cầu 3 (Quayside Berth 3)
  'CT-004': { x: 0.146, y: 0.354 },  // Kho B - Cửa xuất hàng CFS
  'CT-005': { x: 0.362, y: 0.354 },  // Kho C - Bách hóa tổng hợp
  'CT-006': { x: 0.146, y: 0.646 },  // Kho D - Hệ thống giàn lạnh
  'CT-007': { x: 0.608, y: 0.354 },  // Bãi Container A1
  'CT-008': { x: 0.846, y: 0.354 },  // Bãi Container A2
  'CT-009': { x: 0.608, y: 0.646 },  // Bãi Container B1
  'CT-010': { x: 0.846, y: 0.646 },  // Bãi Container B2
  'CT-011': { x: 0.369, y: 0.700 },  // Trạm biến áp 110kV Cảng
  'CT-012': { x: 0.477, y: 0.920 },  // Cổng chính & Trạm cân
};
