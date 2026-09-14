/**
 * Map Configuration Adapter (V16A)
 *
 * Single, authoritative adapter responsible for transforming backend ActiveMapConfiguration
 * (normalized / persisted representation) into the presentation representation consumed
 * by the spatial operations runtime (ZoneLayer, MeterLayer, OperatorLayer, etc.).
 *
 * Owns:
 * - Polygon canonical -> SVG points & path conversion
 * - Normalization using active canonicalWidth / canonicalHeight
 * - Centroid calculation
 * - Label & operator anchor projection
 * - Visual theme association (colors, icons, styles)
 * - Safe degraded fallback conversion
 */

import type {
  ActiveMapConfiguration,
  ActiveMapZoneGeometry,
  ActiveMapLandmark,
} from '../types/activeMapConfiguration';
import type { NormalizedPoint } from '../types';
import {
  ZONE_VISUAL_THEMES,
  SPATIAL_ZONE_PRESENTATIONS,
  type SpatialZonePresentation,
} from '../geometry/operationalGeometry';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';

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
 * Robust polygon centroid calculation
 */
export function computePolygonCentroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }
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

export function pointsToSvgPath(points: Array<{ x: number; y: number }>): string {
  if (!points || points.length === 0) return '';
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

/**
 * Transforms a single ActiveMapZoneGeometry into a presentation-ready SpatialZonePresentation.
 */
export function adaptZoneToPresentation(
  zone: ActiveMapZoneGeometry,
  canonicalWidth: number = CANONICAL_SCENE_WIDTH,
  canonicalHeight: number = CANONICAL_SCENE_HEIGHT
): SpatialZonePresentation {
  const zoneKey = zone.zoneId || zone.presentationId;
  const theme = ZONE_VISUAL_THEMES[zoneKey] || ZONE_VISUAL_THEMES[zone.presentationId] || {
    name: zone.displayLabel,
    shortName: zone.displayLabel,
    number: String(zone.displayIndex),
    primaryColor: zone.presentationColor || '#0284C7',
    boundaryColor: zone.presentationColor || '#0284C7',
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
    icon: (zone.icon as any) || 'container',
  };

  const pointsSvg = zone.polygonCanonical.map((p) => ({ x: p.x, y: p.y }));
  const polygonSvg = pointsToSvgPath(pointsSvg);
  const normalizedPolygon: NormalizedPoint[] = pointsSvg.map((p) => ({
    x: Number((p.x / canonicalWidth).toFixed(4)),
    y: Number((p.y / canonicalHeight).toFixed(4)),
  }));

  const centroidCanonical = computePolygonCentroid(pointsSvg);
  const centroidNormalized: NormalizedPoint = {
    x: Number((centroidCanonical.x / canonicalWidth).toFixed(4)),
    y: Number((centroidCanonical.y / canonicalHeight).toFixed(4)),
  };

  const labelPositionSvg = {
    x: zone.labelAnchorCanonical.x,
    y: zone.labelAnchorCanonical.y,
  };

  const operatorAnchorSvg = {
    x: zone.operatorAnchorCanonical.x,
    y: zone.operatorAnchorCanonical.y,
  };

  const operatorAnchorNormalized: NormalizedPoint = {
    x: Number((operatorAnchorSvg.x / canonicalWidth).toFixed(4)),
    y: Number((operatorAnchorSvg.y / canonicalHeight).toFixed(4)),
  };

  const presentationId = zone.zoneId || zone.presentationId;
  const businessZoneId = zone.businessZoneId || presentationId;
  const businessZoneIds = [businessZoneId];

  return {
    ...theme,
    id: presentationId,
    presentationId,
    businessZoneId,
    businessZoneIds,
    code: ZONE_CODES[presentationId] || presentationId.toUpperCase(),
    displayIndex: zone.displayIndex,
    displayLabel: zone.displayLabel,
    shortLabel: zone.displayLabel,
    businessName: zone.businessName,
    name: theme.shortName || zone.displayLabel,
    subLabel: ZONE_SUB_LABELS[presentationId] || '',
    shortName: theme.shortName || zone.displayLabel,
    regionIndex: zone.displayIndex,
    presentationColor: zone.presentationColor,
    boundaryColor: theme.boundaryColor || zone.presentationColor,
    glowColor: theme.glowColor || '#38BDF8',
    icon: (zone.icon as any) || theme.icon || 'container',
    pointsSvg,
    polygonCanonical: pointsSvg,
    polygonSvg,
    normalizedPolygon,
    centroidSvg: centroidCanonical,
    centroidNormalized,
    labelAnchorCanonical: labelPositionSvg,
    labelPositionSvg,
    exceptionBadgeSvg: { x: labelPositionSvg.x, y: labelPositionSvg.y + 28 },
    operatorAnchorCanonical: operatorAnchorSvg,
    operatorAnchorSvg,
    operatorAnchorNormalized,
  };
}

export interface AdaptedMapConfiguration {
  config: ActiveMapConfiguration;
  presentationZones: SpatialZonePresentation[];
  operatorAnchors: Record<string, { x: number; y: number }>;
  landmarks: ActiveMapLandmark[];
  authoritative: boolean;
  source: 'db' | 'fallback';
}

/**
 * Transforms an ActiveMapConfiguration into presentation components.
 */
export function adaptMapConfiguration(config: ActiveMapConfiguration): AdaptedMapConfiguration {
  const width = config.canonicalWidth || CANONICAL_SCENE_WIDTH;
  const height = config.canonicalHeight || CANONICAL_SCENE_HEIGHT;

  const presentationZones = (config.zones || [])
    .slice()
    .sort((a, b) => a.displayIndex - b.displayIndex)
    .map((z) => adaptZoneToPresentation(z, width, height));

  const operatorAnchors: Record<string, { x: number; y: number }> = {};
  for (const z of config.zones || []) {
    const key = z.zoneId || z.presentationId;
    if (key && z.operatorAnchorCanonical) {
      operatorAnchors[key] = {
        x: z.operatorAnchorCanonical.x,
        y: z.operatorAnchorCanonical.y,
      };
    }
    if (z.businessZoneId && z.operatorAnchorCanonical) {
      operatorAnchors[z.businessZoneId] = {
        x: z.operatorAnchorCanonical.x,
        y: z.operatorAnchorCanonical.y,
      };
    }
  }

  return {
    config,
    presentationZones,
    operatorAnchors,
    landmarks: config.landmarks || [],
    authoritative: config.authoritative,
    source: config.source,
  };
}

/**
 * Builds a degraded fallback configuration from bundled static geometry.
 * Emits DEGRADED_MAP_CONFIGURATION warning.
 */
export function createDegradedFallbackConfiguration(): ActiveMapConfiguration {
  console.warn(
    '[DEGRADED_MAP_CONFIGURATION] Failed to fetch authoritative map configuration from server. Falling back to bundled static geometry with non-authoritative status.'
  );

  const zones: ActiveMapZoneGeometry[] = SPATIAL_ZONE_PRESENTATIONS.map((p) => ({
    id: p.presentationId,
    zoneId: p.presentationId,
    presentationId: p.presentationId,
    businessZoneId: p.businessZoneId,
    displayIndex: p.displayIndex,
    displayLabel: p.displayLabel,
    businessName: p.businessName,
    presentationColor: p.presentationColor,
    icon: p.icon,
    polygonCanonical: p.polygonCanonical,
    labelAnchorCanonical: p.labelAnchorCanonical,
    operatorAnchorCanonical: p.operatorAnchorCanonical,
    landmarks: [],
    revision: 1,
  }));

  return {
    mapId: 'tan-thuan',
    versionId: 'static-fallback-v10',
    versionNumber: 'tan-thuan-v10-fallback',
    coordinateSystem: 'tan-thuan-canonical-image-pixel-space-v1',
    canonicalWidth: CANONICAL_SCENE_WIDTH,
    canonicalHeight: CANONICAL_SCENE_HEIGHT,
    sourceAsset: 'tan-thuan-canonical-base.png',
    sourceChecksum: null,
    geometrySchemaVersion: '1.0',
    status: 'PUBLISHED',
    revision: 1,
    publishedAt: null,
    zones,
    landmarks: [],
    source: 'fallback',
    authoritative: false,
  };
}
