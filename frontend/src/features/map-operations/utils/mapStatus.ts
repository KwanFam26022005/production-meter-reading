import { AdminDashboardExceptionItem, AdminMeterItem } from '../../../types';
import { MeterSemanticState } from '../types';

export interface SemanticStateStyle {
  fill: string;
  stroke: string;
  text: string;
  bg: string;
  ring: string;
  badgeClass: string;
}

export const SEMANTIC_STATE_CONFIG: Record<MeterSemanticState, {
  label: string;
  shortLabel: string;
  style: SemanticStateStyle;
}> = {
  CONFIRMED: {
    label: 'Đã hoàn thành',
    shortLabel: 'Đã ghi',
    style: {
      fill: '#167A5A',
      stroke: '#0E5C43',
      text: '#0E5C43',
      bg: '#EAF6F1',
      ring: 'rgba(22, 122, 90, 0.25)',
      badgeClass: 'sgp-badge-confirmed',
    },
  },
  PENDING: {
    label: 'Chờ đến giờ ghi',
    shortLabel: 'Chờ ghi',
    style: {
      fill: '#53636D',
      stroke: '#374751',
      text: '#374751',
      bg: '#F0F4F7',
      ring: 'rgba(83, 99, 109, 0.25)',
      badgeClass: 'sgp-badge-pending',
    },
  },
  DUE: {
    label: 'Đang trong ca cần ghi',
    shortLabel: 'Đến hạn',
    style: {
      fill: '#D97706',
      stroke: '#B45309',
      text: '#92400E',
      bg: '#FEF3C7',
      ring: 'rgba(217, 119, 6, 0.35)',
      badgeClass: 'sgp-badge-due',
    },
  },
  OVERDUE: {
    label: 'Quá hạn lượt ghi',
    shortLabel: 'Quá hạn',
    style: {
      fill: '#B43A3A',
      stroke: '#8E2828',
      text: '#8E2828',
      bg: '#FCECEC',
      ring: 'rgba(180, 58, 58, 0.35)',
      badgeClass: 'sgp-badge-overdue',
    },
  },
  REVIEW: {
    label: 'Cần kiểm tra lại',
    shortLabel: 'Cần duyệt',
    style: {
      fill: '#EA580C',
      stroke: '#C2410C',
      text: '#9A3412',
      bg: '#FFEDD5',
      ring: 'rgba(234, 88, 12, 0.35)',
      badgeClass: 'sgp-badge-review',
    },
  },
  INACTIVE: {
    label: 'Tạm ngưng hoạt động',
    shortLabel: 'Ngừng HĐ',
    style: {
      fill: '#94A3B8',
      stroke: '#64748B',
      text: '#475569',
      bg: '#F1F5F9',
      ring: 'rgba(148, 163, 184, 0.25)',
      badgeClass: 'sgp-badge-inactive',
    },
  },
};

export function getSemanticStateStyle(state: MeterSemanticState): SemanticStateStyle {
  return SEMANTIC_STATE_CONFIG[state]?.style || SEMANTIC_STATE_CONFIG.PENDING.style;
}

export function getSemanticStateLabel(state: MeterSemanticState): string {
  return SEMANTIC_STATE_CONFIG[state]?.label || state;
}

export function getSemanticStateShortLabel(state: MeterSemanticState): string {
  return SEMANTIC_STATE_CONFIG[state]?.shortLabel || state;
}

/**
 * Derives the exact semantic state of a meter strictly from live data:
 * - If inactive -> INACTIVE
 * - If in exceptions with REVIEW -> REVIEW
 * - If in exceptions with MISSING/OVERDUE -> OVERDUE
 * - If latest reading exists and not an exception -> CONFIRMED
 * - If round is active (current) and reading is missing -> DUE
 * - Otherwise -> PENDING
 */
export function deriveMeterSemanticState(
  meter: AdminMeterItem,
  exceptions: AdminDashboardExceptionItem[] = [],
  currentRoundTimingState?: string | null
): { state: MeterSemanticState; exception?: AdminDashboardExceptionItem } {
  if (!meter.is_active) {
    return { state: 'INACTIVE' };
  }

  // Check matching exception by meter_id or meter_code
  const exc = exceptions.find(
    (e) => e.meter_id === meter.id || e.meter_code === meter.meter_code
  );

  if (exc) {
    if (exc.exception_state === 'REVIEW') {
      return { state: 'REVIEW', exception: exc };
    }
    if (exc.exception_state === 'MISSING') {
      return { state: 'OVERDUE', exception: exc };
    }
  }

  // If latest reading exists
  if (meter.latest_reading !== null && meter.latest_reading !== undefined) {
    return { state: 'CONFIRMED' };
  }

  // If current round is active and no confirmed reading yet
  if (currentRoundTimingState === 'CURRENT' || currentRoundTimingState === 'Đang mở') {
    return { state: 'DUE' };
  }

  return { state: 'PENDING' };
}
