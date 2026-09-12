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
import { V81_PRESENTATION_ZONES } from './tanThuanPresentationGeometryV81';

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
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(2, 132, 199, 0.08)',
    hoverFill: 'rgba(2, 132, 199, 0.14)',
    selectedFill: 'rgba(2, 132, 199, 0.20)',
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
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(234, 88, 12, 0.08)',
    hoverFill: 'rgba(234, 88, 12, 0.14)',
    selectedFill: 'rgba(234, 88, 12, 0.20)',
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
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(225, 29, 72, 0.08)',
    hoverFill: 'rgba(225, 29, 72, 0.14)',
    selectedFill: 'rgba(225, 29, 72, 0.20)',
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
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(234, 179, 8, 0.08)',
    hoverFill: 'rgba(234, 179, 8, 0.14)',
    selectedFill: 'rgba(234, 179, 8, 0.20)',
    badgeBg: 'rgba(40, 32, 5, 0.90)',
    badgeBorder: '#EAB308',
    badgeText: '#FEF9C3',
    icon: 'warehouse',
  },
  'pres-technical': {
    name: '5. Khu kỹ thuật / Dịch vụ',
    shortName: 'Kỹ Thuật',
    number: '5',
    primaryColor: '#10B981',
    boundaryColor: '#10B981',
    glowColor: '#34D399',
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(16, 185, 129, 0.08)',
    hoverFill: 'rgba(16, 185, 129, 0.14)',
    selectedFill: 'rgba(16, 185, 129, 0.20)',
    badgeBg: 'rgba(5, 35, 32, 0.90)',
    badgeBorder: '#10B981',
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
    haloFillOpacityDefault: 0.08,
    haloFillOpacityHover: 0.14,
    haloFillOpacitySelected: 0.20,
    haloFillOpacityDimmed: 0.04,
    haloStrokeOpacityDefault: 0.12,
    haloStrokeOpacityHover: 0.18,
    haloStrokeOpacitySelected: 0.22,
    haloStrokeOpacityDimmed: 0.05,
    haloStrokeWidthDefault: 6.0,
    structuralBorderOpacityDefault: 0.70,
    structuralBorderOpacityHover: 0.90,
    structuralBorderOpacitySelected: 1.00,
    structuralBorderOpacityDimmed: 0.30,
    structuralBorderWidthDefault: 2.0,
    structuralBorderWidthHover: 2.5,
    structuralBorderWidthSelected: 2.5,
    defaultFill: 'rgba(139, 92, 246, 0.08)',
    hoverFill: 'rgba(139, 92, 246, 0.14)',
    selectedFill: 'rgba(139, 92, 246, 0.20)',
    badgeBg: 'rgba(30, 15, 55, 0.90)',
    badgeBorder: '#8B5CF6',
    badgeText: '#EDE9FE',
    icon: 'gate',
  },
};

/**
 * Gate 7: Presentation Zone Model Specification
 */
export interface PresentationZone {
  id: string;
  displayIndex: number;
  displayLabel: string;
  businessZoneIds: string[];
  polygonCanonical: Array<{ x: number; y: number }>;
  labelAnchorCanonical: { x: number; y: number };
  operatorAnchorCanonical: { x: number; y: number };
  presentationColor: string;
}

export interface SpatialZonePresentation extends PresentationZone {
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

export function pointsToSvgPath(points: { x: number; y: number }[]): string {
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

export function pointsToNormalized(points: { x: number; y: number }[]): NormalizedPoint[] {
  return points.map((p) => canonicalSceneToNormalized(p.x, p.y));
}

/**
 * Sub-labels and codes for visual presentation zones
 */
const ZONE_SUB_LABELS: Record<string, string> = {
  'pres-berth': 'BERTH / QUAY',
  'pres-container-west': 'WEST CONTAINER YARD',
  'pres-container-center': 'CENTRAL CONTAINER YARD',
  'pres-cfs-east': 'EAST CFS / WAREHOUSE',
  'pres-technical': 'TECHNICAL / SERVICE AREA',
  'pres-gate': 'MAIN GATE & WEIGH STATION',
};

const ZONE_CODES: Record<string, string> = {
  'pres-berth': 'ZONE-BERTH',
  'pres-container-west': 'ZONE-CONT-WEST',
  'pres-container-center': 'ZONE-CONT-CENTER',
  'pres-cfs-east': 'ZONE-CFS-EAST',
  'pres-technical': 'ZONE-TECH',
  'pres-gate': 'ZONE-GATE',
};

/**
 * 6 Approved Visual Presentation Zones (V8.1 Spatial Correction):
 * Built from authoritative V81_PRESENTATION_ZONES in tanThuanPresentationGeometryV81.ts
 * Traced and calibrated against tan-thuan-canonical-base.png (1915x821).
 */
export const SPATIAL_ZONE_PRESENTATIONS: SpatialZonePresentation[] = V81_PRESENTATION_ZONES.map((z) => {
  const theme = ZONE_VISUAL_THEMES[z.id];
  return {
    ...theme,
    ...z,
    id: z.id,
    presentationId: z.id,
    businessZoneIds: z.businessZoneIds,
    presentationColor: z.presentationColor,
    labelAnchorCanonical: z.labelAnchorCanonical,
    operatorAnchorCanonical: z.operatorAnchorCanonical,
    businessZoneId: z.businessZoneId,
    code: ZONE_CODES[z.id] || z.id.toUpperCase(),
    displayIndex: z.displayIndex,
    displayLabel: z.displayLabel,
    shortLabel: z.shortLabel,
    businessName: z.businessName,
    name: z.shortLabel,
    subLabel: ZONE_SUB_LABELS[z.id] || '',
    shortName: theme ? theme.shortName : z.displayLabel,
    regionIndex: z.displayIndex,
    accentColor: z.accentColor,
    pointsSvg: z.polygonCanonical,
    polygonCanonical: z.polygonCanonical,
    polygonSvg: z.polygonSvg,
    normalizedPolygon: z.normalizedPolygon,
    centroidSvg: z.centroidCanonical,
    centroidNormalized: canonicalSceneToNormalized(z.centroidCanonical.x, z.centroidCanonical.y),
    labelPositionSvg: z.labelAnchorCanonical,
    exceptionBadgeSvg: { x: z.labelAnchorCanonical.x, y: z.labelAnchorCanonical.y + 28 },
    operatorAnchorSvg: z.operatorAnchorCanonical,
    operatorAnchorNormalized: canonicalSceneToNormalized(z.operatorAnchorCanonical.x, z.operatorAnchorCanonical.y),
  };
});

export const PRESENTATION_ZONES: PresentationZone[] = SPATIAL_ZONE_PRESENTATIONS;
export { V81_PRESENTATION_ZONES } from './tanThuanPresentationGeometryV81';


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

