/**
 * Tan Thuan Presentation Geometry V8.1
 * Authoritative single source of truth for the 6 visual presentation zones.
 *
 * Canonical Dimensions: 1915 x 821
 * Coordinate System: tan-thuan-canonical-image-pixel-space-v1
 * Visual Reference: docs/design/map-operations/reference/tan-thuan-approved-zoning.png
 */

export interface CanonicalPoint {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PresentationZoneV81 {
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

export const CANONICAL_WIDTH = 1915;
export const CANONICAL_HEIGHT = 821;

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
    // Fallback to arithmetic mean
    const meanX = points.reduce((s, p) => s + p.x, 0) / n;
    const meanY = points.reduce((s, p) => s + p.y, 0) / n;
    return { x: Math.round(meanX), y: Math.round(meanY) };
  }
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: Math.round(cx), y: Math.round(cy) };
}

// ---------------------------------------------------------------------------
// V8.1 APPROVED PRESENTATION ZONES
// ---------------------------------------------------------------------------

const RAW_ZONES: Array<{
  id: string;
  displayIndex: number;
  displayLabel: string;
  businessName: string;
  businessZoneIds: string[];
  presentationColor: string;
  polygonCanonical: CanonicalPoint[];
  labelAnchorCanonical: CanonicalPoint;
  operatorAnchorCanonical: CanonicalPoint;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate';
}> = [
  // -------------------------------------------------------------------------
  // ZONE 1 — CẦU CẢNG
  // -------------------------------------------------------------------------
  {
    id: 'pres-berth',
    displayIndex: 1,
    displayLabel: 'Cầu cảng',
    businessName: 'Khu vực Cầu cảng (Berths 1–3)',
    businessZoneIds: ['zone-berth'],
    presentationColor: '#0284C7',
    polygonCanonical: [
      { x: 192,  y: 296 },
      { x: 260,  y: 297 },
      { x: 440,  y: 305 },
      { x: 615,  y: 310 },
      { x: 695,  y: 284 },
      { x: 930,  y: 268 },
      { x: 1180, y: 246 },
      { x: 1480, y: 220 },
      { x: 1630, y: 178 },
      { x: 1750, y: 138 },
      { x: 1915, y: 56  },
      { x: 1765, y: 195 },
      { x: 1505, y: 245 },
      { x: 1190, y: 280 },
      { x: 825,  y: 328 },
      { x: 671,  y: 344 },
      { x: 430,  y: 342 },
      { x: 192,  y: 338 },
    ],
    labelAnchorCanonical: { x: 930, y: 302 },
    operatorAnchorCanonical: { x: 1030, y: 285 },
    icon: 'ship',
  },

  // -------------------------------------------------------------------------
  // ZONE 2 — BÃI CONTAINER PHÍA TÂY
  // -------------------------------------------------------------------------
  {
    id: 'pres-container-west',
    displayIndex: 2,
    displayLabel: 'Bãi container phía Tây',
    businessName: 'Khu vực Kho & Bãi Container Phía Tây',
    businessZoneIds: ['zone-warehouse'],
    presentationColor: '#EA580C',
    polygonCanonical: [
      { x: 27,  y: 315 },
      { x: 192, y: 338 },
      { x: 430, y: 342 },
      { x: 671, y: 344 },
      { x: 820, y: 328 },
      { x: 820, y: 548 },
      { x: 660, y: 564 },
      { x: 450, y: 555 },
      { x: 280, y: 545 },
      { x: 134, y: 537 },
      { x: 45,  y: 510 },
      { x: 9,   y: 467 },
      { x: 15,  y: 380 },
    ],
    labelAnchorCanonical: { x: 410, y: 480 },
    operatorAnchorCanonical: { x: 525, y: 515 },
    icon: 'container',
  },

  // -------------------------------------------------------------------------
  // ZONE 3 — BÃI CONTAINER TRUNG TÂM
  // -------------------------------------------------------------------------
  {
    id: 'pres-container-center',
    displayIndex: 3,
    displayLabel: 'Bãi container trung tâm',
    businessName: 'Khu vực Bãi Container Trung Tâm (CY)',
    businessZoneIds: ['zone-container'],
    presentationColor: '#E11D48',
    polygonCanonical: [
      { x: 820,  y: 328 },
      { x: 1190, y: 280 },
      { x: 1505, y: 245 },
      { x: 1535, y: 340 },
      { x: 1555, y: 428 },
      { x: 1546, y: 515 },
      { x: 1200, y: 525 },
      { x: 836,  y: 525 },
    ],
    labelAnchorCanonical: { x: 1090, y: 438 },
    operatorAnchorCanonical: { x: 1278, y: 455 },
    icon: 'container',
  },

  // -------------------------------------------------------------------------
  // ZONE 4 — KHO / CFS PHÍA ĐÔNG
  // -------------------------------------------------------------------------
  {
    id: 'pres-cfs-east',
    displayIndex: 4,
    displayLabel: 'Kho / CFS phía Đông',
    businessName: 'Khu vực Kho & CFS Phía Đông',
    businessZoneIds: ['zone-warehouse'],
    presentationColor: '#EAB308',
    polygonCanonical: [
      { x: 1505, y: 245 },
      { x: 1765, y: 195 },
      { x: 1840, y: 185 },
      { x: 1905, y: 215 },
      { x: 1915, y: 350 },
      { x: 1915, y: 420 },
      { x: 1850, y: 465 },
      { x: 1790, y: 488 },
      { x: 1690, y: 485 },
      { x: 1595, y: 485 },
      { x: 1555, y: 428 },
      { x: 1535, y: 340 },
    ],
    labelAnchorCanonical: { x: 1750, y: 335 },
    operatorAnchorCanonical: { x: 1838, y: 445 },
    icon: 'warehouse',
  },

  // -------------------------------------------------------------------------
  // ZONE 5 — KHU KỸ THUẬT / DỊCH VỤ
  // -------------------------------------------------------------------------
  {
    id: 'pres-technical',
    displayIndex: 5,
    displayLabel: 'Khu kỹ thuật / Dịch vụ',
    businessName: 'Khu vực Kỹ thuật, Trạm điện & Dịch vụ',
    businessZoneIds: ['zone-technical'],
    presentationColor: '#10B981',
    polygonCanonical: [
      { x: 836,  y: 525 },
      { x: 1200, y: 525 },
      { x: 1500, y: 515 },
      { x: 1525, y: 560 },
      { x: 1474, y: 625 },
      { x: 1380, y: 710 },
      { x: 1320, y: 765 },
      { x: 1100, y: 768 },
      { x: 950,  y: 768 },
      { x: 939,  y: 656 },
      { x: 812,  y: 586 },
    ],
    labelAnchorCanonical: { x: 1145, y: 575 },
    operatorAnchorCanonical: { x: 1100, y: 740 },
    icon: 'gear',
  },

  // -------------------------------------------------------------------------
  // ZONE 6 — CỔNG CHÍNH
  // -------------------------------------------------------------------------
  {
    id: 'pres-gate',
    displayIndex: 6,
    displayLabel: 'Cổng chính',
    businessName: 'Khu vực Cổng chính & Trạm cân',
    businessZoneIds: ['zone-technical'],
    presentationColor: '#8B5CF6',
    polygonCanonical: [
      { x: 1500, y: 515 },
      { x: 1595, y: 485 },
      { x: 1690, y: 485 },
      { x: 1790, y: 488 },
      { x: 1900, y: 606 },
      { x: 1678, y: 617 },
      { x: 1664, y: 562 },
      { x: 1564, y: 564 },
      { x: 1525, y: 560 },
    ],
    labelAnchorCanonical: { x: 1742, y: 550 },
    operatorAnchorCanonical: { x: 1790, y: 580 },
    icon: 'gate',
  },
];

export const V81_PRESENTATION_ZONES: PresentationZoneV81[] = RAW_ZONES.map((z) => {
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
