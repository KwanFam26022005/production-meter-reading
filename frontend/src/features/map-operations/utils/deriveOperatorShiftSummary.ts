import type { MapMeterItem, MapOperationalZone } from '../types';

export interface OperatorShiftZoneItem {
  zoneId: string;
  zoneName: string;
  completed: number;
  total: number;
  overdue: number;
  review: number;
}

export interface OperatorShiftSummary {
  operatorId: string;
  fullName: string;
  employeeCode?: string;
  role?: string;

  shiftCode?: string;
  shiftLabel?: string;

  activeZoneIds: string[];

  totalAssignedMeters: number;
  completedMeters: number;

  overdueMeters: number;
  reviewMeters: number;
  dueMeters: number;
  pendingMeters: number;

  progressPct: number;

  currentRoundLabel?: string;
  zoneBreakdown: OperatorShiftZoneItem[];
}

/**
 * Deterministically derives the shift code and label from the current reading round time.
 * Standard Saigon Port shifts:
 * - CA1 (Sáng):  06:00 - 14:00
 * - CA2 (Chiều): 14:00 - 22:00
 * - CA3 (Đêm):   22:00 - 06:00
 */
export function deriveShiftFromRoundTime(roundTime?: string): { shiftCode: string; shiftLabel: string } {
  if (!roundTime) {
    return { shiftCode: 'CA1', shiftLabel: 'Ca 1 · 06:00–14:00' };
  }

  const parts = roundTime.split(':');
  const hour = parseInt(parts[0], 10);

  if (isNaN(hour)) {
    return { shiftCode: 'CA1', shiftLabel: 'Ca 1 · 06:00–14:00' };
  }

  if (hour >= 6 && hour < 14) {
    return { shiftCode: 'CA1', shiftLabel: 'Ca 1 · 06:00–14:00' };
  } else if (hour >= 14 && hour < 22) {
    return { shiftCode: 'CA2', shiftLabel: 'Ca 2 · 14:00–22:00' };
  } else {
    return { shiftCode: 'CA3', shiftLabel: 'Ca 3 · 22:00–06:00' };
  }
}

/**
 * Pure function: deriveOperatorShiftSummary
 *
 * Aggregates all meters assigned across all zones owned by the operator during
 * their current active shift.
 *
 * Scope rule:
 * - If one operator owns multiple active zones, aggregates meters across all those zones.
 * - progressPct = totalAssignedMeters > 0 ? Math.round((completedMeters / totalAssignedMeters) * 100) : 0
 * - Safe against division-by-zero, unassigned operators, and empty meter lists.
 */
export function deriveOperatorShiftSummary(
  operator: {
    id: string;
    fullName: string;
    employeeCode?: string;
    role?: string;
  } | null | undefined,
  allZones: MapOperationalZone[],
  allMeters: MapMeterItem[],
  currentRoundTime?: string,
  explicitShift?: { shiftCode: string; shiftLabel: string }
): OperatorShiftSummary | null {
  if (!operator || !operator.id) {
    return null;
  }

  // Find all active zones assigned to this operator
  const assignedZones = allZones.filter((z) => z.assignedUser?.id === operator.id);
  if (assignedZones.length === 0) {
    return null;
  }

  const shiftInfo = explicitShift || deriveShiftFromRoundTime(currentRoundTime);
  const activeZoneIds = assignedZones.map((z) => z.id);

  let totalAssignedMeters = 0;
  let completedMeters = 0;
  let overdueMeters = 0;
  let reviewMeters = 0;
  let dueMeters = 0;
  let pendingMeters = 0;

  const zoneBreakdown: OperatorShiftZoneItem[] = [];

  for (const zone of assignedZones) {
    const zoneMeters = allMeters.filter((m) => m.zoneId === zone.id && m.isActive !== false);
    let zoneCompleted = 0;
    let zoneOverdue = 0;
    let zoneReview = 0;
    let zoneDue = 0;
    let zonePending = 0;

    for (const meter of zoneMeters) {
      switch (meter.semanticState) {
        case 'CONFIRMED':
          zoneCompleted++;
          break;
        case 'OVERDUE':
          zoneOverdue++;
          break;
        case 'REVIEW':
          zoneReview++;
          break;
        case 'DUE':
          zoneDue++;
          break;
        case 'PENDING':
        default:
          zonePending++;
          break;
      }
    }

    const zoneTotal = zoneMeters.length;
    totalAssignedMeters += zoneTotal;
    completedMeters += zoneCompleted;
    overdueMeters += zoneOverdue;
    reviewMeters += zoneReview;
    dueMeters += zoneDue;
    pendingMeters += zonePending;

    zoneBreakdown.push({
      zoneId: zone.id,
      zoneName: zone.name,
      completed: zoneCompleted,
      total: zoneTotal,
      overdue: zoneOverdue,
      review: zoneReview,
    });
  }

  const progressPct =
    totalAssignedMeters > 0
      ? Math.round((completedMeters / totalAssignedMeters) * 100)
      : 0;

  return {
    operatorId: operator.id,
    fullName: operator.fullName,
    employeeCode: operator.employeeCode,
    role: operator.role || 'Nhân viên phụ trách',
    shiftCode: shiftInfo.shiftCode,
    shiftLabel: shiftInfo.shiftLabel,
    activeZoneIds,
    totalAssignedMeters,
    completedMeters,
    overdueMeters,
    reviewMeters,
    dueMeters,
    pendingMeters,
    progressPct,
    currentRoundLabel: currentRoundTime ? `Lượt hiện tại · ${currentRoundTime}` : undefined,
    zoneBreakdown,
  };
}
