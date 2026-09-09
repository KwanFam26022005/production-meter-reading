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

/**
 * Calculates operational states for all port zones in batch.
 */
export function projectAllZonesOperationalState(
  zones: MapOperationalZone[],
  meters: MapMeterItem[]
): Record<string, ZoneOperationalState> {
  const result: Record<string, ZoneOperationalState> = {};
  for (const z of zones) {
    result[z.id] = calculateZoneOperationalState(z, meters);
  }
  return result;
}
