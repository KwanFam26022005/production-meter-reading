/**
 * Operator Operational Summary Calculation
 *
 * Derives operator progress and operational status purely from
 * effective zone and meter data.
 *
 * Rules:
 * - progressPct = completed / total * 100 (rounded)
 * - Zero assigned meters must not divide by zero (returns 0%)
 * - Uses current date / round meter states (CONFIRMED, OVERDUE, REVIEW)
 * - Purely operational: "Tiến độ phụ trách", never performance/rating
 */

import type { MapMeterItem, MapOperationalZone } from '../types';

export interface OperatorOperationalSummary {
  operatorId: string;
  fullName: string;
  employeeCode?: string;
  role?: string;
  zoneId: string;
  zoneName: string;
  totalAssignedMeters: number;
  completedMeters: number;
  overdueMeters: number;
  reviewMeters: number;
  progressPct: number;
  currentRoundLabel?: string;
}

export interface DeriveOperatorSummaryOptions {
  zone: MapOperationalZone;
  meters?: MapMeterItem[];
  currentRoundTime?: string;
}

/**
 * Pure function to derive an operator's operational summary from zone and meter data.
 * Returns null if the zone has no assigned user.
 */
export function deriveOperatorOperationalSummary(
  optionsOrZone: DeriveOperatorSummaryOptions | MapOperationalZone,
  explicitMeters?: MapMeterItem[],
  explicitRoundTime?: string
): OperatorOperationalSummary | null {
  let zone: MapOperationalZone;
  let meters: MapMeterItem[] | undefined;
  let currentRoundTime: string | undefined;

  if ('zone' in optionsOrZone) {
    zone = optionsOrZone.zone;
    meters = optionsOrZone.meters;
    currentRoundTime = optionsOrZone.currentRoundTime;
  } else {
    zone = optionsOrZone;
    meters = explicitMeters;
    currentRoundTime = explicitRoundTime;
  }

  if (!zone.assignedUser) {
    return null;
  }

  // Use provided meters if available, otherwise fallback to zone.meters
  const candidateMeters = meters && meters.length > 0
    ? meters.filter((m) => m.zoneId === zone.id)
    : zone.meters || [];

  // Consider active meters for operational progress calculation
  const activeMeters = candidateMeters.filter((m) => m.isActive);
  // Fall back to candidate meters if all are inactive or none marked
  const targetMeters = candidateMeters.length > 0 && activeMeters.length === 0
    ? candidateMeters
    : activeMeters;

  const totalAssignedMeters = targetMeters.length;
  let completedMeters = 0;
  let overdueMeters = 0;
  let reviewMeters = 0;

  for (const m of targetMeters) {
    switch (m.semanticState) {
      case 'CONFIRMED':
        completedMeters++;
        break;
      case 'OVERDUE':
        overdueMeters++;
        break;
      case 'REVIEW':
        reviewMeters++;
        break;
      default:
        break;
    }
  }

  // Guard against division by zero
  const progressPct =
    totalAssignedMeters > 0
      ? Math.round((completedMeters / totalAssignedMeters) * 100)
      : 0;

  const currentRoundLabel = currentRoundTime
    ? `Lượt hiện tại · ${currentRoundTime}`
    : 'Lượt hiện tại';

  return {
    operatorId: zone.assignedUser.id,
    fullName: zone.assignedUser.fullName,
    employeeCode: zone.assignedUser.employeeCode,
    role: zone.assignedUser.role || 'Nhân viên phụ trách',
    zoneId: zone.id,
    zoneName: zone.name,
    totalAssignedMeters,
    completedMeters,
    overdueMeters,
    reviewMeters,
    progressPct,
    currentRoundLabel,
  };
}
