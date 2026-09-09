import { AdminRosterDayHeader } from '../../../types';
import { RosterViewMode } from './types';
import {
  REQUIRED_SHIFT_COVERAGE,
  SHIFT_WORK_HOURS,
  WEEKLY_WORKLOAD_WARNING_HOURS,
} from './rosterConfig';

export { REQUIRED_SHIFT_COVERAGE, SHIFT_WORK_HOURS, WEEKLY_WORKLOAD_WARNING_HOURS };

export interface ShiftInfo {
  code: string;
  shortLabel: string;
  name: string;
  timeRange: string;
  tagClass: string;
  isWork: boolean;
  standardHours: number;
}

export const SHIFT_METADATA: Record<string, ShiftInfo> = {
  CA1: {
    code: 'CA1',
    shortLabel: 'C1',
    name: 'Ca 1 (Sáng)',
    timeRange: '06:00 – 14:00',
    tagClass: 'shift-tag-ca1',
    isWork: true,
    standardHours: 8,
  },
  CA2: {
    code: 'CA2',
    shortLabel: 'C2',
    name: 'Ca 2 (Chiều)',
    timeRange: '14:00 – 22:00',
    tagClass: 'shift-tag-ca2',
    isWork: true,
    standardHours: 8,
  },
  CA3: {
    code: 'CA3',
    shortLabel: 'C3',
    name: 'Ca 3 (Đêm)',
    timeRange: '22:00 – 06:00',
    tagClass: 'shift-tag-ca3',
    isWork: true,
    standardHours: 8,
  },
  HC: {
    code: 'HC',
    shortLabel: 'HC',
    name: 'Ca Hành chính',
    timeRange: '07:30 – 16:30',
    tagClass: 'shift-tag-hc',
    isWork: true,
    standardHours: 9,
  },
  OFF: {
    code: 'OFF',
    shortLabel: 'OFF',
    name: 'Nghỉ tuần',
    timeRange: 'Nghỉ 24h',
    tagClass: 'shift-tag-off',
    isWork: false,
    standardHours: 0,
  },
  LEAVE: {
    code: 'LEAVE',
    shortLabel: 'PHÉP',
    name: 'Nghỉ phép',
    timeRange: 'Đã phê duyệt',
    tagClass: 'shift-tag-leave',
    isWork: false,
    standardHours: 0,
  },
};

/**
 * Returns the effective shift taking pending client RAM edits into account.
 */
export function getEffectiveShift(
  userId: string,
  dateStr: string,
  pendingChanges: Record<string, string>,
  persistedShifts?: Record<string, string>
): string {
  const key = `${userId}_${dateStr}`;
  if (pendingChanges[key] !== undefined) {
    return pendingChanges[key];
  }
  return persistedShifts?.[dateStr] || 'OFF';
}

/**
 * Computes workload statistics (total shifts, approximate scheduled hours, and heavy workload alert).
 */
export function calculateUserWorkload(
  userId: string,
  visibleDays: AdminRosterDayHeader[],
  pendingChanges: Record<string, string>,
  persistedShifts?: Record<string, string>
): { totalShifts: number; totalHours: number; isWorkloadHeavy: boolean } {
  let totalShifts = 0;
  let totalHours = 0;

  for (const d of visibleDays) {
    const shift = getEffectiveShift(userId, d.date, pendingChanges, persistedShifts);
    if (['CA1', 'CA2', 'CA3', 'HC'].includes(shift)) {
      totalShifts += 1;
      totalHours += SHIFT_WORK_HOURS[shift] || 0;
    }
  }

  // Workload warning threshold (scaled for 7 days or more)
  const isWorkloadHeavy = visibleDays.length <= 7 && totalHours > WEEKLY_WORKLOAD_WARNING_HOURS;

  return { totalShifts, totalHours, isWorkloadHeavy };
}

/**
 * Formats YYYY-MM into Vietnamese: "Tháng 09 / 2026"
 */
export function formatVietnameseMonth(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [y, m] = monthStr.split('-');
  return `Tháng ${m} / ${y}`;
}

/**
 * Formats a date range into "01–07/09/2026"
 */
export function formatDateRangeLabel(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';
  const [, sm, sd] = startDateStr.split('-');
  const [ey, em, ed] = endDateStr.split('-');

  if (sm === em && startDateStr.slice(0, 4) === ey) {
    return `${sd}–${ed}/${em}/${ey}`;
  }
  return `${sd}/${sm} – ${ed}/${em}/${ey}`;
}

/**
 * Slices the month days according to the active view mode (WEEK, TWO_WEEK, MONTH, COVERAGE).
 */
export function sliceDaysForViewMode(
  days: AdminRosterDayHeader[],
  viewMode: RosterViewMode,
  focusDayIndex: number
): { visibleDays: AdminRosterDayHeader[]; startIndex: number; endIndex: number } {
  if (!days || days.length === 0) {
    return { visibleDays: [], startIndex: 0, endIndex: 0 };
  }

  if (viewMode === 'MONTH' || viewMode === 'COVERAGE') {
    return {
      visibleDays: days,
      startIndex: 0,
      endIndex: days.length - 1,
    };
  }

  const windowSize = viewMode === 'WEEK' ? 7 : 14;
  const clampedFocus = Math.max(0, Math.min(focusDayIndex, days.length - 1));

  // Determine starting index aligned with week window
  const startIndex = Math.min(
    clampedFocus,
    Math.max(0, days.length - windowSize)
  );
  const endIndex = Math.min(days.length - 1, startIndex + windowSize - 1);

  return {
    visibleDays: days.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
  };
}

/**
 * Calculates next/previous date navigation depending on view mode.
 */
export function stepRosterView(
  currentMonthStr: string,
  viewMode: RosterViewMode,
  currentFocusIndex: number,
  direction: 'prev' | 'next',
  totalDaysInMonth: number
): { nextMonth: string; nextFocusIndex: number } {
  if (viewMode === 'MONTH' || viewMode === 'COVERAGE') {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const date = new Date(y, direction === 'next' ? m : m - 2, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { nextMonth, nextFocusIndex: 0 };
  }

  const step = viewMode === 'WEEK' ? 7 : 14;
  let targetIndex = direction === 'next' ? currentFocusIndex + step : currentFocusIndex - step;

  if (targetIndex < 0) {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const prevMonthDate = new Date(y, m - 2, 1);
    const nextMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    return { nextMonth, nextFocusIndex: 21 };
  }

  if (targetIndex >= totalDaysInMonth) {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const nextMonthDate = new Date(y, m, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
    return { nextMonth, nextFocusIndex: 0 };
  }

  return {
    nextMonth: currentMonthStr,
    nextFocusIndex: targetIndex,
  };
}
