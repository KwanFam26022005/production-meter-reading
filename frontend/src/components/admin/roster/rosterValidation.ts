import { AdminRosterResponse, LeaveRequestItem } from '../../../types';
import {
  DayCoverageSummary,
  RosterConflict,
  RosterValidationResult,
  ShiftCoverageStat,
} from './types';
import { getEffectiveShift } from './rosterUtils';
import { getCoverageHealthState, REQUIRED_SHIFT_COVERAGE } from './rosterConfig';

/**
 * Validates the roster in real-time, considering effective client RAM edits.
 */
export function validateRosterState(
  rosterData: AdminRosterResponse | null,
  pendingChanges: Record<string, string>,
  leaveRequests: LeaveRequestItem[]
): RosterValidationResult {
  const conflictsByCell: Record<string, RosterConflict[]> = {};
  const conflictsByDate: Record<string, RosterConflict[]> = {};
  const allConflicts: RosterConflict[] = [];
  const dayCoverage: Record<string, DayCoverageSummary> = {};

  const approvedLeavesLookup: Record<string, LeaveRequestItem> = {};
  const pendingLeavesLookup: Record<string, LeaveRequestItem> = {};

  if (!rosterData || !rosterData.days_header || rosterData.days_header.length === 0) {
    return {
      coveragePercent: 100,
      totalConflicts: 0,
      conflictsByCell,
      conflictsByDate,
      allConflicts,
      dayCoverage,
      pendingLeavesCount: 0,
      approvedLeavesLookup,
      pendingLeavesLookup,
    };
  }

  // 1. Build Leave Lookups for quick cell cross-referencing
  let pendingLeavesCount = 0;
  for (const lr of leaveRequests) {
    if (lr.status === 'PENDING') {
      pendingLeavesCount += 1;
    }

    const userId = lr.user?.id;
    if (!userId) continue;

    const sDate = lr.start_date;
    const eDate = lr.end_date || lr.start_date;

    for (const d of rosterData.days_header) {
      if (d.date >= sDate && d.date <= eDate) {
        const key = `${userId}_${d.date}`;
        if (lr.status === 'APPROVED') {
          approvedLeavesLookup[key] = lr;
        } else if (lr.status === 'PENDING') {
          pendingLeavesLookup[key] = lr;
        }
      }
    }
  }

  const registerConflict = (conflict: RosterConflict) => {
    allConflicts.push(conflict);

    // By Cell
    if (conflict.userId) {
      const cellKey = conflict.cellKey || `${conflict.userId}_${conflict.date}`;
      if (!conflictsByCell[cellKey]) conflictsByCell[cellKey] = [];
      conflictsByCell[cellKey].push(conflict);
    }

    // By Date
    if (!conflictsByDate[conflict.date]) conflictsByDate[conflict.date] = [];
    conflictsByDate[conflict.date].push(conflict);
  };

  // 2. Validate Leave Conflicts & Insufficient Rest
  const workingShiftCodes = new Set(['CA1', 'CA2', 'CA3', 'HC']);

  for (const user of rosterData.users) {
    const userDays = rosterData.days_header;

    for (let i = 0; i < userDays.length; i++) {
      const currentDay = userDays[i];
      const dStr = currentDay.date;
      const cellKey = `${user.user_id}_${dStr}`;

      const effShift = getEffectiveShift(user.user_id, dStr, pendingChanges, user.shifts);

      // Check APPROVED_LEAVE_CONFLICT
      const approvedLeave = approvedLeavesLookup[cellKey];
      if (approvedLeave && workingShiftCodes.has(effShift)) {
        registerConflict({
          id: `leave-conflict-${cellKey}`,
          type: 'APPROVED_LEAVE_CONFLICT',
          severity: 'error',
          userId: user.user_id,
          userName: user.full_name,
          date: dStr,
          shiftCode: effShift,
          cellKey,
          title: user.full_name,
          description: `${dStr} · Đã được duyệt nghỉ (${approvedLeave.leave_type_label}) nhưng vẫn xếp ca ${effShift}.`,
        });
      }

      // Check INSUFFICIENT_REST (CA3 on day i -> CA1 on day i+1)
      if (effShift === 'CA3' && i + 1 < userDays.length) {
        const nextDay = userDays[i + 1];
        const nextShift = getEffectiveShift(user.user_id, nextDay.date, pendingChanges, user.shifts);

        if (nextShift === 'CA1') {
          const nextCellKey = `${user.user_id}_${nextDay.date}`;
          registerConflict({
            id: `rest-conflict-${user.user_id}_${dStr}_${nextDay.date}`,
            type: 'INSUFFICIENT_REST',
            severity: 'warning',
            userId: user.user_id,
            userName: user.full_name,
            date: nextDay.date,
            shiftCode: nextShift,
            cellKey: nextCellKey,
            title: user.full_name,
            description: `C3 ${dStr} → C1 ${nextDay.date}: Thời gian nghỉ giữa hai ca quá ngắn (không có thời gian nghỉ chuyển ca).`,
          });
        }
      }
    }
  }

  // 3. Calculate Shift Coverage Per Day with 3 Health Tiers (HEALTHY, AT_MINIMUM, UNDERSTAFFED)
  let totalRequiredSlots = 0;
  let fulfilledSlots = 0;

  for (const d of rosterData.days_header) {
    const dStr = d.date;
    const counts: Record<string, number> = {
      CA1: 0,
      CA2: 0,
      CA3: 0,
      HC: 0,
      OFF: 0,
      LEAVE: 0,
    };

    for (const u of rosterData.users) {
      const shift = getEffectiveShift(u.user_id, dStr, pendingChanges, u.shifts);
      counts[shift] = (counts[shift] || 0) + 1;
    }

    const buildStat = (code: 'CA1' | 'CA2' | 'CA3' | 'HC'): ShiftCoverageStat => {
      const req = REQUIRED_SHIFT_COVERAGE[code] || 0;
      const assigned = counts[code] || 0;
      const healthState = getCoverageHealthState(assigned, req);

      if (req > 0) {
        totalRequiredSlots += 1;
        if (healthState !== 'UNDERSTAFFED') fulfilledSlots += 1;
      }

      return {
        assigned,
        required: req,
        healthState,
      };
    };

    const ca1Stat = buildStat('CA1');
    const ca2Stat = buildStat('CA2');
    const ca3Stat = buildStat('CA3');
    const hcStat = buildStat('HC');

    const hasUnder =
      ca1Stat.healthState === 'UNDERSTAFFED' ||
      ca2Stat.healthState === 'UNDERSTAFFED' ||
      ca3Stat.healthState === 'UNDERSTAFFED';

    // Register understaffed conflicts
    if (ca1Stat.healthState === 'UNDERSTAFFED') {
      registerConflict({
        id: `understaffed-ca1-${dStr}`,
        type: 'UNDERSTAFFED_SHIFT',
        severity: 'warning',
        date: dStr,
        shiftCode: 'CA1',
        title: `Ca 1 · ${dStr}`,
        description: `Thiếu ${ca1Stat.required - ca1Stat.assigned} nhân sự (${ca1Stat.assigned} / ≥${ca1Stat.required} nhân sự).`,
      });
    }
    if (ca2Stat.healthState === 'UNDERSTAFFED') {
      registerConflict({
        id: `understaffed-ca2-${dStr}`,
        type: 'UNDERSTAFFED_SHIFT',
        severity: 'warning',
        date: dStr,
        shiftCode: 'CA2',
        title: `Ca 2 · ${dStr}`,
        description: `Thiếu ${ca2Stat.required - ca2Stat.assigned} nhân sự (${ca2Stat.assigned} / ≥${ca2Stat.required} nhân sự).`,
      });
    }
    if (ca3Stat.healthState === 'UNDERSTAFFED') {
      registerConflict({
        id: `understaffed-ca3-${dStr}`,
        type: 'UNDERSTAFFED_SHIFT',
        severity: 'warning',
        date: dStr,
        shiftCode: 'CA3',
        title: `Ca 3 · ${dStr}`,
        description: `Thiếu ${ca3Stat.required - ca3Stat.assigned} nhân sự (${ca3Stat.assigned} / ≥${ca3Stat.required} nhân sự trực đêm).`,
      });
    }

    dayCoverage[dStr] = {
      date: dStr,
      dayHeader: d,
      shifts: {
        CA1: ca1Stat,
        CA2: ca2Stat,
        CA3: ca3Stat,
        HC: hcStat,
      },
      totalWorking: counts['CA1'] + counts['CA2'] + counts['CA3'] + counts['HC'],
      hasUnderstaffed: hasUnder,
    };
  }

  const coveragePercent =
    totalRequiredSlots > 0 ? Math.round((fulfilledSlots / totalRequiredSlots) * 100) : 100;

  return {
    coveragePercent,
    totalConflicts: allConflicts.length,
    conflictsByCell,
    conflictsByDate,
    allConflicts,
    dayCoverage,
    pendingLeavesCount,
    approvedLeavesLookup,
    pendingLeavesLookup,
  };
}
