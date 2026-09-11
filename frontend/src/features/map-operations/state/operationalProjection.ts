/**
 * Operational Projection & Health Calculation Logic
 *
 * Normalizes zone operational summary calculations into pure functions.
 * Strictly separates:
 * - PROGRESS (Percentage completed 0 - 100%)
 * - HEALTH (HEALTHY | ATTENTION | CRITICAL operational urgency)
 */

import { MapMeterItem, MapOperationalZone } from '../types';

export type ZoneHealth = 'HEALTHY' | 'ATTENTION' | 'CRITICAL';

export interface ZoneOperationalState {
  zoneId: string;
  code: string;
  name: string;
  shortName: string;
  totalMeters: number;
  completed: number;
  pending: number;
  due: number;
  overdue: number;
  review: number;
  inactive: number;
  progressPct: number;
  health: ZoneHealth;
  operator?: {
    id: string;
    fullName: string;
    employeeCode?: string;
  };
}

/**
 * Deterministic Zone Health Rule:
 * if overdue > 0 -> CRITICAL (Immediate operational escalation required)
 * else if review > 0 -> ATTENTION (Readings need inspection/approval)
 * else -> HEALTHY (Normal operational flow)
 */
export function deriveZoneHealth(metrics: {
  overdue: number;
  review: number;
}): ZoneHealth {
  if (metrics.overdue > 0) return 'CRITICAL';
  if (metrics.review > 0) return 'ATTENTION';
  return 'HEALTHY';
}

/**
 * Calculates normalized operational state for an individual zone from live meters.
 */
export function calculateZoneOperationalState(
  zone: MapOperationalZone,
  allMeters: MapMeterItem[]
): ZoneOperationalState {
  const zoneMeters = allMeters.filter((m) => m.zoneId === zone.id);

  let completed = 0;
  let pending = 0;
  let due = 0;
  let overdue = 0;
  let review = 0;
  let inactive = 0;

  for (const m of zoneMeters) {
    if (!m.isActive) {
      inactive++;
      continue;
    }
    switch (m.semanticState) {
      case 'CONFIRMED':
        completed++;
        break;
      case 'PENDING':
        pending++;
        break;
      case 'DUE':
        due++;
        break;
      case 'OVERDUE':
        overdue++;
        break;
      case 'REVIEW':
        review++;
        break;
    }
  }

  const activeTotal = zoneMeters.length - inactive;
  const progressPct =
    activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

  const health = deriveZoneHealth({ overdue, review });

  return {
    zoneId: zone.id,
    code: zone.code,
    name: zone.name,
    shortName: zone.shortName || zone.name,
    totalMeters: zoneMeters.length,
    completed,
    pending,
    due,
    overdue,
    review,
    inactive,
    progressPct,
    health,
    operator: zone.assignedUser
      ? {
          id: zone.assignedUser.id,
          fullName: zone.assignedUser.fullName,
          employeeCode: zone.assignedUser.employeeCode,
        }
      : undefined,
  };
}

import {
  SPATIAL_ZONE_PRESENTATIONS,
  isPointInPresentationZone,
} from '../geometry/operationalGeometry';
import { normalizedToCanonicalScene } from '../geometry/canonicalScene';

/**
 * Calculates operational states for all port zones in batch.
 * Computes states for:
 * 1. Business zones (e.g. 'zone-berth', 'zone-warehouse', 'zone-container', 'zone-technical')
 * 2. Approved presentation zones (e.g. 'pres-berth', 'pres-container-west', 'pres-container-center', 'pres-cfs-east', 'pres-technical', 'pres-gate')
 */
export function projectAllZonesOperationalState(
  zones: MapOperationalZone[],
  meters: MapMeterItem[]
): Record<string, ZoneOperationalState> {
  const result: Record<string, ZoneOperationalState> = {};

  // 1. Business zones operational state
  for (const z of zones) {
    result[z.id] = calculateZoneOperationalState(z, meters);
  }

  // 2. Presentation zones operational state
  for (const pres of SPATIAL_ZONE_PRESENTATIONS) {
    const bZone = zones.find((z) => z.id === pres.businessZoneId);

    // Filter meters belonging to this presentation zone:
    // First, meters whose physical coordinates fall within presentation zone polygon
    const presMeters = meters.filter((m) => {
      const sceneCoord = normalizedToCanonicalScene(m.coordinates);
      if (isPointInPresentationZone(sceneCoord, pres.presentationId)) {
        return true;
      }
      // If coordinates aren't inside any subzone of the same business zone,
      // and this presentation zone is the primary one, fallback to businessZoneId match
      if (m.zoneId === pres.businessZoneId) {
        // If business zone has only one presentation zone (e.g. Berth, Container center)
        if (pres.presentationId === 'pres-berth' || pres.presentationId === 'pres-container-center') {
          return true;
        }
      }
      return false;
    });

    let completed = 0;
    let pending = 0;
    let due = 0;
    let overdue = 0;
    let review = 0;
    let inactive = 0;

    for (const m of presMeters) {
      if (!m.isActive) {
        inactive++;
        continue;
      }
      switch (m.semanticState) {
        case 'CONFIRMED':
          completed++;
          break;
        case 'PENDING':
          pending++;
          break;
        case 'DUE':
          due++;
          break;
        case 'OVERDUE':
          overdue++;
          break;
        case 'REVIEW':
          review++;
          break;
      }
    }

    const activeTotal = presMeters.length - inactive;
    const progressPct =
      activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;
    const health = deriveZoneHealth({ overdue, review });

    result[pres.presentationId] = {
      zoneId: pres.presentationId,
      code: pres.code,
      name: pres.name,
      shortName: pres.shortName,
      totalMeters: presMeters.length,
      completed,
      pending,
      due,
      overdue,
      review,
      inactive,
      progressPct,
      health,
      operator: bZone?.assignedUser
        ? {
            id: bZone.assignedUser.id,
            fullName: bZone.assignedUser.fullName,
            employeeCode: bZone.assignedUser.employeeCode,
          }
        : undefined,
    };
  }

  return result;
}
