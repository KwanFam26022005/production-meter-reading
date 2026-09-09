/**
 * Operational Geometry — Tan Thuan Port
 *
 * Contains ONLY operational layout specifications:
 * - 4 Canonical Operational Zones (boundaries, polygon points, visual centroids)
 * - Meter coordinate mapping for the elongated 2.5:1 canvas (1300 x 520)
 * - Label positioning anchors
 *
 * NOTE: Separated from physical scene features (physicalScene.ts).
 */

import { NormalizedPoint } from '../types';
import { PHYSICAL_VIEWBOX } from './physicalScene';

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
 * 1. zone-berth: Quayside & handling apron (Cầu 1, 2, 3)
 * 2. zone-warehouse: CFS & General Cargo Warehouses (West)
 * 3. zone-container: Container staging blocks A1, A2, B1, B2 (East)
 * 4. zone-technical: Electrical substation 110kV, workshops, and gate (South)
 */
export const OPERATIONAL_ZONES_GEOMETRY: OperationalZoneGeometry[] = [
  {
    id: 'zone-berth',
    code: 'ZONE-BERTH',
    name: 'Khu vực Cầu cảng (Cầu 1–3)',
    shortName: 'Cầu Cảng',
    accentColor: '#0E7490',
    pointsSvg: [
      { x: 150, y: 105 },
      { x: 1210, y: 105 },
      { x: 1210, y: 155 },
      { x: 150, y: 155 },
    ],
    polygonSvg: 'M 150,105 L 1210,105 L 1210,155 L 150,155 Z',
    normalizedPolygon: [
      { x: 0.115, y: 0.202 },
      { x: 0.931, y: 0.202 },
      { x: 0.931, y: 0.298 },
      { x: 0.115, y: 0.298 },
    ],
    centroidSvg: { x: 680, y: 130 },
    centroidNormalized: { x: 0.523, y: 0.25 },
    labelPositionSvg: { x: 680, y: 130 },
  },
  {
    id: 'zone-warehouse',
    code: 'ZONE-WH',
    name: 'Khu vực Kho CFS & Hàng tổng hợp',
    shortName: 'Kho Bãi',
    accentColor: '#B45309',
    pointsSvg: [
      { x: 60, y: 160 },
      { x: 630, y: 160 },
      { x: 630, y: 430 },
      { x: 60, y: 430 },
    ],
    polygonSvg: 'M 60,160 L 630,160 L 630,430 L 60,430 Z',
    normalizedPolygon: [
      { x: 0.046, y: 0.308 },
      { x: 0.485, y: 0.308 },
      { x: 0.485, y: 0.827 },
      { x: 0.046, y: 0.827 },
    ],
    centroidSvg: { x: 345, y: 275 },
    centroidNormalized: { x: 0.265, y: 0.529 },
    labelPositionSvg: { x: 345, y: 275 },
  },
  {
    id: 'zone-container',
    code: 'ZONE-CONT',
    name: 'Khu vực Bãi Container',
    shortName: 'Bãi Container',
    accentColor: '#1D4ED8',
    pointsSvg: [
      { x: 670, y: 160 },
      { x: 1250, y: 160 },
      { x: 1250, y: 430 },
      { x: 670, y: 430 },
    ],
    polygonSvg: 'M 670,160 L 1250,160 L 1250,430 L 670,430 Z',
    normalizedPolygon: [
      { x: 0.515, y: 0.308 },
      { x: 0.962, y: 0.308 },
      { x: 0.962, y: 0.827 },
      { x: 0.515, y: 0.827 },
    ],
    centroidSvg: { x: 960, y: 275 },
    centroidNormalized: { x: 0.738, y: 0.529 },
    labelPositionSvg: { x: 960, y: 275 },
  },
  {
    id: 'zone-technical',
    code: 'ZONE-TECH',
    name: 'Khu vực Kỹ thuật, Trạm điện & Cổng',
    shortName: 'Kỹ Thuật & Cổng',
    accentColor: '#475569',
    pointsSvg: [
      { x: 340, y: 320 },
      { x: 740, y: 320 },
      { x: 740, y: 505 },
      { x: 340, y: 505 },
    ],
    polygonSvg: 'M 340,320 L 740,320 L 740,505 L 340,505 Z',
    normalizedPolygon: [
      { x: 0.262, y: 0.615 },
      { x: 0.569, y: 0.615 },
      { x: 0.569, y: 0.971 },
      { x: 0.262, y: 0.971 },
    ],
    centroidSvg: { x: 540, y: 420 },
    centroidNormalized: { x: 0.415, y: 0.808 },
    labelPositionSvg: { x: 540, y: 420 },
  },
];

/**
 * Coordinate mapping adapter for existing meters into the elongated 2.5:1 port space.
 * Matches real operational locations in Tan Thuan Port.
 */
export const OPERATIONAL_METER_COORDINATES: Record<string, NormalizedPoint> = {
  'CT-001': { x: 0.238, y: 0.25 },  // Cầu 1 (Quayside Berth 1)
  'CT-002': { x: 0.515, y: 0.25 },  // Cầu 2 (Quayside Berth 2)
  'CT-003': { x: 0.792, y: 0.25 },  // Cầu 3 (Quayside Berth 3)
  'CT-004': { x: 0.146, y: 0.404 }, // Kho B - Cửa xuất hàng CFS
  'CT-005': { x: 0.362, y: 0.404 }, // Kho C - Bách hóa tổng hợp
  'CT-006': { x: 0.146, y: 0.692 }, // Kho D - Hệ thống giàn lạnh
  'CT-007': { x: 0.608, y: 0.404 }, // Bãi Container A1
  'CT-008': { x: 0.846, y: 0.404 }, // Bãi Container A2
  'CT-009': { x: 0.608, y: 0.692 }, // Bãi Container B1
  'CT-010': { x: 0.846, y: 0.692 }, // Bãi Container B2
  'CT-011': { x: 0.369, y: 0.731 }, // Trạm biến áp 110kV Cảng
  'CT-012': { x: 0.477, y: 0.923 }, // Cổng chính & Trạm cân
};
