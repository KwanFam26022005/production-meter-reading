/**
 * Presentation Zone Analytics (V13.1)
 *
 * Provides a canonical selector `derivePresentationZoneAnalytics` deriving strictly
 * from the 6 calibrated Presentation Zones:
 * 1. pres-berth
 * 2. pres-container-west
 * 3. pres-container-center
 * 4. pres-cfs-east
 * 5. pres-technical
 * 6. pres-gate
 *
 * Guarantees:
 * - Exactly 6 presentation rows (no duplicate business zone rows).
 * - SUM(zone.totalMeters) === totalMetersInScope (zero double counting).
 * - Zero-Denominator Rule: If totalMeters === 0, completionPercent = null and display "Không có công tơ".
 * - 12-meter reconciliation against CANONICAL_12_METERS_AUDIT.
 */

import {
  SPATIAL_ZONE_PRESENTATIONS,
  ZONE_VISUAL_THEMES,
  isPointInPolygon,
} from '../geometry/operationalGeometry';
import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';
import type { MapMeterItem } from '../types';

export const CANONICAL_PRESENTATION_ZONE_IDS = [
  'pres-berth',
  'pres-container-west',
  'pres-container-center',
  'pres-cfs-east',
  'pres-technical',
  'pres-gate',
] as const;

export type CanonicalPresentationZoneId = (typeof CANONICAL_PRESENTATION_ZONE_IDS)[number];

export interface PresentationZoneAnalyticsItem {
  id: CanonicalPresentationZoneId;
  displayIndex: number;
  name: string;
  fullName: string;
  shortName: string;
  businessZoneId: string;
  businessName: string;
  color: string;
  totalMeters: number;
  completedMeters: number;
  pendingMeters: number;
  issueMeters: number;
  overdueMeters: number;
  reviewMeters: number;
  completionPercent: number | null; // null when totalMeters === 0 (Zero-denominator rule)
  statusLabel: string; // "Không có công tơ" when 0, else "X/Y · Z%"
  meterCodes: string[];
}

export interface PresentationZoneAnalyticsReport {
  zones: PresentationZoneAnalyticsItem[];
  totalMeters: number;
  completedMeters: number;
  pendingMeters: number;
  issueMeters: number;
  overdueMeters: number;
  reviewMeters: number;
  completionPercent: number | null;
}

/**
 * Resolves a meter to its deterministic canonical PresentationZoneId.
 * Priority order:
 * 1. Direct presentation zone ID match.
 * 2. Canonical 12-meters audit lookup (authoritative fixture).
 * 3. Spatial point-in-polygon containment against presentation zones.
 * 4. Fallback from business zone ID if unambiguous.
 */
export function resolveMeterPresentationZoneId(meter: {
  meterCode?: string;
  id?: string;
  zoneId?: string;
  coordinates?: { x: number; y: number };
}): CanonicalPresentationZoneId {
  // 1. Direct match with a presentation zone ID
  if (
    meter.zoneId &&
    (CANONICAL_PRESENTATION_ZONE_IDS as readonly string[]).includes(meter.zoneId)
  ) {
    return meter.zoneId as CanonicalPresentationZoneId;
  }

  // 2. Canonical 12-meters fixture lookup by meter code or ID
  const code = meter.meterCode || meter.id;
  if (code) {
    const auditMatch = CANONICAL_12_METERS_AUDIT.find(
      (m) => m.code === code || m.code === meter.meterCode
    );
    if (
      auditMatch?.presentationRegionId &&
      (CANONICAL_PRESENTATION_ZONE_IDS as readonly string[]).includes(
        auditMatch.presentationRegionId
      )
    ) {
      return auditMatch.presentationRegionId as CanonicalPresentationZoneId;
    }
  }

  // 3. Spatial point-in-polygon containment
  if (meter.coordinates) {
    const isNormalized = meter.coordinates.x <= 1 && meter.coordinates.y <= 1;
    const pt = isNormalized
      ? {
          x: meter.coordinates.x * CANONICAL_SCENE_WIDTH,
          y: meter.coordinates.y * CANONICAL_SCENE_HEIGHT,
        }
      : meter.coordinates;

    for (const pres of SPATIAL_ZONE_PRESENTATIONS) {
      if (
        (CANONICAL_PRESENTATION_ZONE_IDS as readonly string[]).includes(pres.presentationId) &&
        isPointInPolygon(pt, pres.pointsSvg)
      ) {
        return pres.presentationId as CanonicalPresentationZoneId;
      }
    }
  }

  // 4. Business zone unambiguous fallbacks
  if (meter.zoneId === 'zone-berth') return 'pres-berth';
  if (meter.zoneId === 'zone-container') return 'pres-container-center';
  if (meter.zoneId === 'zone-warehouse') return 'pres-container-west';
  if (meter.zoneId === 'zone-technical') return 'pres-technical';

  // Default fallback to first presentation zone
  return 'pres-berth';
}

/**
 * Pure selector deriving strictly the 6 Presentation Zones analytics report.
 */
export function derivePresentationZoneAnalytics(
  meters: MapMeterItem[]
): PresentationZoneAnalyticsReport {
  // Map each meter to exactly ONE presentation zone (guaranteed single assignment)
  const zoneMeterMap = new Map<CanonicalPresentationZoneId, MapMeterItem[]>();
  for (const id of CANONICAL_PRESENTATION_ZONE_IDS) {
    zoneMeterMap.set(id, []);
  }

  for (const meter of meters) {
    const presId = resolveMeterPresentationZoneId(meter);
    const list = zoneMeterMap.get(presId) || [];
    list.push(meter);
    zoneMeterMap.set(presId, list);
  }

  // Build the 6 presentation zone analytics items
  const zones: PresentationZoneAnalyticsItem[] = CANONICAL_PRESENTATION_ZONE_IDS.map(
    (presId, index) => {
      const presMeta = SPATIAL_ZONE_PRESENTATIONS.find((p) => p.presentationId === presId);
      const theme = ZONE_VISUAL_THEMES[presId];
      const assignedMeters = zoneMeterMap.get(presId) || [];

      const totalMeters = assignedMeters.length;
      const completedMeters = assignedMeters.filter(
        (m) => m.semanticState === 'CONFIRMED'
      ).length;
      const overdueMeters = assignedMeters.filter(
        (m) => m.semanticState === 'OVERDUE'
      ).length;
      const reviewMeters = assignedMeters.filter(
        (m) => m.semanticState === 'REVIEW'
      ).length;
      const issueMeters = overdueMeters + reviewMeters;
      const pendingMeters = assignedMeters.filter(
        (m) =>
          m.semanticState === 'PENDING' ||
          m.semanticState === 'DUE' ||
          (!m.semanticState && m.semanticState !== 'CONFIRMED')
      ).length;

      // Section 4: Zero-Denominator Rule
      let completionPercent: number | null = null;
      let statusLabel = 'Không có công tơ';

      if (totalMeters > 0) {
        completionPercent = Math.round((completedMeters / totalMeters) * 100);
        statusLabel = `${completedMeters}/${totalMeters} · ${completionPercent}%`;
      }

      const rawName = presMeta?.name || theme?.name || presId;
      // Strip leading number if present for clean title: "1. Cầu cảng" -> "Cầu cảng"
      const cleanName = rawName.replace(/^\d+\.\s*/, '');

      return {
        id: presId,
        displayIndex: index + 1,
        name: cleanName,
        fullName: theme?.name || `${index + 1}. ${cleanName}`,
        shortName: theme?.shortName || presMeta?.shortName || cleanName,
        businessZoneId: presMeta?.businessZoneId || 'zone-berth',
        businessName: presMeta?.businessName || 'Cảng Tân Thuận',
        color: theme?.primaryColor || presMeta?.primaryColor || '#0284C7',
        totalMeters,
        completedMeters,
        pendingMeters,
        issueMeters,
        overdueMeters,
        reviewMeters,
        completionPercent,
        statusLabel,
        meterCodes: assignedMeters.map((m) => m.meterCode || m.id),
      };
    }
  );

  const totalMeters = zones.reduce((sum, z) => sum + z.totalMeters, 0);
  const completedMeters = zones.reduce((sum, z) => sum + z.completedMeters, 0);
  const issueMeters = zones.reduce((sum, z) => sum + z.issueMeters, 0);
  const overdueMeters = zones.reduce((sum, z) => sum + z.overdueMeters, 0);
  const reviewMeters = zones.reduce((sum, z) => sum + z.reviewMeters, 0);
  const pendingMeters = zones.reduce((sum, z) => sum + z.pendingMeters, 0);

  const completionPercent =
    totalMeters > 0 ? Math.round((completedMeters / totalMeters) * 100) : null;

  return {
    zones,
    totalMeters,
    completedMeters,
    pendingMeters,
    issueMeters,
    overdueMeters,
    reviewMeters,
    completionPercent,
  };
}
