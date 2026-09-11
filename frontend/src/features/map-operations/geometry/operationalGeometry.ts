/**
 * Operational Geometry — Tan Thuan Port (Figma Authoritative Alignment)
 *
 * Direct match with Figma frames:
 * - 2:2 (Default)
 * - 2:104 (Critical Exceptions)
 * - 2:363 (Zone Selected)
 *
 * Contains:
 * - 4 Canonical Operational Zones with exact polygons and exception badge positions
 * - Exact meter coordinates matching sub-blocks (CT-001 through CT-012)
 * - Operator marker anchors
 */

import type { NormalizedPoint } from '../types';

export const MAP_DIMENSIONS = {
  width: 1300,
  height: 520,
};

export interface OperationalZoneGeometry {
  id: string;
  code: string;
  name: string;
  shortName: string;
  polygonSvg: string;
  pointsSvg: { x: number; y: number }[];
  normalizedPolygon: NormalizedPoint[];
  centroidSvg: { x: number; y: number };
  centroidNormalized: NormalizedPoint;
  labelPositionSvg: { x: number; y: number };
  exceptionBadgeSvg: { x: number; y: number };
  operatorAnchorSvg?: { x: number; y: number };
  operatorAnchorNormalized?: NormalizedPoint;
  accentColor: string;
}

export function normalizedToSvg(point: NormalizedPoint): { x: number; y: number } {
  return {
    x: Math.round(point.x * MAP_DIMENSIONS.width),
    y: Math.round(point.y * MAP_DIMENSIONS.height),
  };
}

export function svgToNormalized(svgX: number, svgY: number): NormalizedPoint {
  return {
    x: Number((svgX / MAP_DIMENSIONS.width).toFixed(4)),
    y: Number((svgY / MAP_DIMENSIONS.height).toFixed(4)),
  };
}

/**
 * 4 Canonical Operational Zones in Tan Thuan Port:
 * 1. zone-berth: Quayside & handling apron (Cầu 1, 2, 3)
 * 2. zone-warehouse: CFS & General Cargo Warehouses (Kho B, C, D)
 * 3. zone-container: Container staging blocks (Bãi A, A2, B1, B2)
 * 4. zone-technical: General cargo & technical structures (Hàng Tổng Hợp, Trạm Điện, Xưởng)
 */
export const OPERATIONAL_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  {
    id: 'zone-berth',
    code: 'ZONE-BERTH',
    name: 'Khu vực Cầu cảng (Cầu 1–3)',
    shortName: 'Cầu Cảng',
    accentColor: '#0E7490',
    pointsSvg: [
      { x: 115, y: 115 },
      { x: 1155, y: 115 },
      { x: 1155, y: 165 },
      { x: 115, y: 165 },
    ],
    polygonSvg: 'M 115,115 L 1155,115 L 1155,165 L 115,165 Z',
    normalizedPolygon: [
      { x: 0.0885, y: 0.2212 },
      { x: 0.8885, y: 0.2212 },
      { x: 0.8885, y: 0.3173 },
      { x: 0.0885, y: 0.3173 },
    ],
    centroidSvg: { x: 650, y: 140 },
    centroidNormalized: { x: 0.5000, y: 0.2692 },
    labelPositionSvg: { x: 650, y: 140 },
    exceptionBadgeSvg: { x: 468, y: 180 },
    operatorAnchorSvg: { x: 860, y: 140 },
    operatorAnchorNormalized: { x: 0.6615, y: 0.2692 },
  },
  {
    id: 'zone-warehouse',
    code: 'ZONE-WH',
    name: 'Khu vực Kho CFS & Hàng tổng hợp',
    shortName: 'Kho Bãi',
    accentColor: '#B45309',
    pointsSvg: [
      { x: 125, y: 185 },
      { x: 515, y: 185 },
      { x: 515, y: 335 },
      { x: 125, y: 335 },
    ],
    polygonSvg: 'M 125,185 L 515,185 L 515,335 L 125,335 Z',
    normalizedPolygon: [
      { x: 0.0962, y: 0.3558 },
      { x: 0.3962, y: 0.3558 },
      { x: 0.3962, y: 0.6442 },
      { x: 0.0962, y: 0.6442 },
    ],
    centroidSvg: { x: 320, y: 260 },
    centroidNormalized: { x: 0.2462, y: 0.5000 },
    labelPositionSvg: { x: 320, y: 260 },
    exceptionBadgeSvg: { x: 250, y: 332 },
    operatorAnchorSvg: { x: 345, y: 340 },
    operatorAnchorNormalized: { x: 0.2654, y: 0.6538 },
  },
  {
    id: 'zone-container',
    code: 'ZONE-CONT',
    name: 'Khu vực Bãi Container',
    shortName: 'Bãi Container',
    accentColor: '#1D4ED8',
    pointsSvg: [
      { x: 555, y: 185 },
      { x: 1025, y: 185 },
      { x: 1060, y: 220 },
      { x: 1060, y: 372 },
      { x: 555, y: 372 },
    ],
    polygonSvg: 'M 555,185 L 1025,185 L 1060,220 L 1060,372 L 555,372 Z',
    normalizedPolygon: [
      { x: 0.4269, y: 0.3558 },
      { x: 0.7885, y: 0.3558 },
      { x: 0.8154, y: 0.4231 },
      { x: 0.8154, y: 0.7154 },
      { x: 0.4269, y: 0.7154 },
    ],
    centroidSvg: { x: 810, y: 278 },
    centroidNormalized: { x: 0.6231, y: 0.5346 },
    labelPositionSvg: { x: 810, y: 278 },
    exceptionBadgeSvg: { x: 680, y: 332 },
    operatorAnchorSvg: { x: 960, y: 345 },
    operatorAnchorNormalized: { x: 0.7385, y: 0.6635 },
  },
  {
    id: 'zone-technical',
    code: 'ZONE-TECH',
    name: 'Khu vực Kỹ thuật, Trạm điện & Cổng',
    shortName: 'Kỹ Thuật & Cổng',
    accentColor: '#475569',
    pointsSvg: [
      { x: 125, y: 365 },
      { x: 515, y: 365 },
      { x: 515, y: 485 },
      { x: 125, y: 485 },
    ],
    polygonSvg: 'M 125,365 L 515,365 L 515,485 L 125,485 Z',
    normalizedPolygon: [
      { x: 0.0962, y: 0.7019 },
      { x: 0.3962, y: 0.7019 },
      { x: 0.3962, y: 0.9327 },
      { x: 0.0962, y: 0.9327 },
    ],
    centroidSvg: { x: 320, y: 425 },
    centroidNormalized: { x: 0.2462, y: 0.8173 },
    labelPositionSvg: { x: 320, y: 425 },
    exceptionBadgeSvg: { x: 250, y: 472 },
    operatorAnchorSvg: { x: 540, y: 445 },
    operatorAnchorNormalized: { x: 0.4154, y: 0.8558 },
  },
];

/**
 * Returns deterministic SVG coordinates for placing an operator marker in a zone.
 */
export function getZoneOperatorAnchor(zoneId: string): { x: number; y: number } {
  const geo = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zoneId);
  if (geo?.operatorAnchorSvg) return geo.operatorAnchorSvg;
  if (geo?.centroidSvg) return { x: geo.centroidSvg.x, y: geo.centroidSvg.y + 30 };
  return { x: 650, y: 260 };
}

/**
 * Meter SVG Coordinate Mapping (Figma Frames 2:2 & 2:104 Exact Match)
 */
export const OPERATIONAL_METER_COORDINATES: Record<string, NormalizedPoint> = {
  'CT-001': { x: 0.2269, y: 0.2923 }, // Cầu 1 (Quayside Berth 1)   -> SVG (295, 152)
  'CT-002': { x: 0.4692, y: 0.2923 }, // Cầu 2 (Quayside Berth 2)   -> SVG (610, 152)
  'CT-003': { x: 0.7154, y: 0.2923 }, // Cầu 3 (Quayside Berth 3)   -> SVG (930, 152)
  'CT-004': { x: 0.1708, y: 0.4712 }, // Kho B - Cửa xuất hàng CFS  -> SVG (222, 245)
  'CT-005': { x: 0.3062, y: 0.4712 }, // Kho C - Bách hóa tổng hợp  -> SVG (398, 245)
  'CT-008': { x: 0.1708, y: 0.5808 }, // Kho D - Hệ thống giàn lạnh -> SVG (222, 302)
  'CT-006': { x: 0.5285, y: 0.5000 }, // Bãi Container A            -> SVG (687, 260)
  'CT-007': { x: 0.7015, y: 0.5000 }, // Bãi Container A2           -> SVG (912, 260)
  'CT-009': { x: 0.5285, y: 0.6615 }, // Bãi Container B1           -> SVG (687, 344)
  'CT-010': { x: 0.7015, y: 0.6615 }, // Bãi Container B2           -> SVG (912, 344)
  'CT-011': { x: 0.2038, y: 0.8308 }, // Hàng Tổng Hợp              -> SVG (265, 432)
  'CT-012': { x: 0.5115, y: 0.8173 }, // Trạm điện                   -> SVG (665, 425)
};
