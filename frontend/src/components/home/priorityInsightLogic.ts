import { NextShiftInfo, TodayAttendance, TodayOperationsResponse } from '../../types';

export type InsightCategory = 'METER' | 'ATTENDANCE' | 'SCHEDULE';

export interface HomeInsight {
  id: string;
  category: InsightCategory;
  title: string;
  context: string;
  badge?: {
    text: string;
    variant?: 'neutral' | 'warning' | 'success' | 'info';
  };
  ctaLabel?: string;
  onAction?: () => void;
  isUrgentAction?: boolean;
}

export interface PrioritySelectionInput {
  operations: TodayOperationsResponse | null;
  attendance: TodayAttendance | null;
  nextShift: NextShiftInfo | null;
  loadingAttendance?: boolean;
  attendanceError?: string | null;
  onOpenMeter: () => void;
  onOpenAttendance: () => void;
  onOpenSchedule: () => void;
  onRetryAttendance?: () => void;
}

export interface PrioritySelectionResult {
  priority: HomeInsight | null;
  updates: HomeInsight[];
}

/**
 * Pure, deterministic business logic to normalize operational feed data
 * and select exactly ONE dynamic priority action, formatting the remaining
 * as compact operational updates.
 */
export function selectPriorityInsight(input: PrioritySelectionInput): PrioritySelectionResult {
  const {
    operations,
    attendance,
    nextShift,
    loadingAttendance,
    attendanceError,
    onOpenMeter,
    onOpenAttendance,
    onOpenSchedule,
    onRetryAttendance,
  } = input;

  const currentRound = operations?.current_round;
  const pastIncompleteMeters = operations?.meters?.filter((m) =>
    m.today_slots?.some((s) => s.timing_state === 'PAST' && s.status === 'PENDING')
  ) ?? [];

  // --- 1. Evaluate Attendance Candidate (distinguishing LOADING, ERROR, NOT_CHECKED_IN, IN_SHIFT, COMPLETED) ---
  let attendanceCandidate: HomeInsight | null = null;
  if (attendance) {
    const hasCheckIn = Boolean(attendance.check_in);
    const hasCheckOut = Boolean(attendance.check_out);

    if (!hasCheckIn && !hasCheckOut) {
      // Need check-in
      const shiftDesc = nextShift
        ? `${nextShift.shift_name}${nextShift.start_time ? ` (${nextShift.start_time}–${nextShift.end_time})` : ''}`
        : 'Chụp ảnh tại điểm kiểm soát để ghi nhận vào ca.';

      attendanceCandidate = {
        id: 'attendance-need-checkin',
        category: 'ATTENDANCE',
        title: 'Chấm công vào ca',
        context: shiftDesc,
        badge: { text: 'Chưa vào ca', variant: 'warning' },
        ctaLabel: 'Chấm công vào ca',
        onAction: onOpenAttendance,
        isUrgentAction: true,
      };
    } else if (hasCheckIn && !hasCheckOut) {
      // In shift
      const timeStr = attendance.check_in?.formatted_time?.split(' - ')[0] || '';
      attendanceCandidate = {
        id: 'attendance-in-shift',
        category: 'ATTENDANCE',
        title: 'Chấm công ca làm',
        context: timeStr ? `Đang trong ca · Vào ca lúc ${timeStr}` : 'Đang trong ca làm việc',
        badge: { text: 'Trong ca', variant: 'success' },
        onAction: onOpenAttendance,
        isUrgentAction: false,
      };
    } else {
      // Completed shift
      attendanceCandidate = {
        id: 'attendance-completed',
        category: 'ATTENDANCE',
        title: 'Chấm công ca làm',
        context: 'Đã hoàn tất ca làm việc hôm nay.',
        badge: { text: 'Đã tan ca', variant: 'neutral' },
        onAction: onOpenAttendance,
        isUrgentAction: false,
      };
    }
  } else if (attendanceError) {
    // Error state - never conflate with "Chưa vào ca"
    attendanceCandidate = {
      id: 'attendance-error',
      category: 'ATTENDANCE',
      title: 'Trạng thái ca làm',
      context: 'Không thể tải dữ liệu chấm công. Vui lòng thử lại.',
      badge: { text: 'Lỗi tải', variant: 'warning' },
      ctaLabel: 'Thử lại',
      onAction: onRetryAttendance || onOpenAttendance,
      isUrgentAction: false,
    };
  } else if (loadingAttendance) {
    // Loading state - distinct from "Chưa vào ca"
    attendanceCandidate = {
      id: 'attendance-loading',
      category: 'ATTENDANCE',
      title: 'Chấm công ca làm',
      context: 'Đang kiểm tra trạng thái chấm công...',
      badge: { text: 'Đang kiểm tra...', variant: 'neutral' },
      onAction: onOpenAttendance,
      isUrgentAction: false,
    };
  }

  // --- 2. Evaluate Meter Reading Candidate ---
  let meterCandidate: HomeInsight | null = null;
  if (currentRound) {
    const confirmed = currentRound.progress.confirmed;
    const total = currentRound.progress.total;
    const pending = currentRound.progress.pending;
    const review = currentRound.progress.review;
    const remaining = pending + review;

    if (remaining > 0) {
      meterCandidate = {
        id: 'meter-active-round',
        category: 'METER',
        title: `Còn ${remaining} công tơ cần ghi`,
        context: `Lượt ${currentRound.scheduled_time_only} · Toàn cảng đã ghi ${confirmed}/${total}`,
        badge: { text: `Lượt ${currentRound.scheduled_time_only}`, variant: 'info' },
        ctaLabel: 'Tiếp tục đo đếm',
        onAction: onOpenMeter,
        isUrgentAction: true,
      };
    } else {
      // Active round is 100% completed
      meterCandidate = {
        id: 'meter-round-completed',
        category: 'METER',
        title: 'Đo đếm điện năng',
        context: `Lượt ${currentRound.scheduled_time_only} đã hoàn thành (${confirmed}/${total})`,
        badge: { text: 'Hoàn tất', variant: 'success' },
        onAction: onOpenMeter,
        isUrgentAction: false,
      };
    }
  } else if (pastIncompleteMeters.length > 0) {
    // Past incomplete backlog exists
    meterCandidate = {
      id: 'meter-past-backlog',
      category: 'METER',
      title: `Tồn đọng ${pastIncompleteMeters.length} công tơ cần ghi`,
      context: 'Chưa hoàn tất trong các lượt đọc trước',
      badge: { text: `${pastIncompleteMeters.length} tồn`, variant: 'warning' },
      ctaLabel: 'Xử lý tồn đọng',
      onAction: onOpenMeter,
      isUrgentAction: true,
    };
  } else if (operations) {
    // Normal idle state with valid operations data
    meterCandidate = {
      id: 'meter-idle',
      category: 'METER',
      title: 'Đo đếm điện năng',
      context: 'Chưa có lượt ghi mới.',
      badge: { text: 'Sẵn sàng', variant: 'neutral' },
      onAction: onOpenMeter,
      isUrgentAction: false,
    };
  }

  // --- 3. Evaluate Schedule Candidate ---
  let scheduleCandidate: HomeInsight | null = null;
  if (nextShift) {
    const shiftTime = nextShift.start_time && nextShift.end_time
      ? `, ${nextShift.start_time}–${nextShift.end_time}`
      : '';
    scheduleCandidate = {
      id: 'schedule-shift-info',
      category: 'SCHEDULE',
      title: 'Lịch trực & Phép',
      context: `${nextShift.is_today ? 'Hôm nay' : nextShift.weekday_label} · ${nextShift.shift_name}${shiftTime}`,
      onAction: onOpenSchedule,
      isUrgentAction: false,
    };
  } else {
    scheduleCandidate = {
      id: 'schedule-default',
      category: 'SCHEDULE',
      title: 'Lịch làm việc & Phép',
      context: 'Xem thời khóa biểu tháng và đăng ký nghỉ phép.',
      onAction: onOpenSchedule,
      isUrgentAction: false,
    };
  }

  // --- 4. Resolve Single Priority Hero Action ---
  let priority: HomeInsight | null = null;
  const updates: HomeInsight[] = [];

  // Priority Decision Matrix:
  // Rule A: If attendance check-in is urgent (!hasCheckIn), employee must check in before field operations.
  //         Priority = Attendance, and active meter round (if any) is placed at top of updates.
  // Rule B: If already in shift (or attendance unknown), and meter reading is urgent (active round or backlog),
  //         Priority = Meter Reading.
  // Rule C: If no urgent actions exist, priority is null (clean, compact Home Hub layout).
  if (attendanceCandidate?.isUrgentAction) {
    priority = attendanceCandidate;
    if (meterCandidate) updates.push(meterCandidate);
    if (scheduleCandidate) updates.push(scheduleCandidate);
  } else if (meterCandidate?.isUrgentAction) {
    priority = meterCandidate;
    if (attendanceCandidate) updates.push(attendanceCandidate);
    if (scheduleCandidate) updates.push(scheduleCandidate);
  } else {
    // No urgent operational actions: all candidates go to compact updates
    priority = null;
    if (meterCandidate) updates.push(meterCandidate);
    if (attendanceCandidate) updates.push(attendanceCandidate);
    if (scheduleCandidate) updates.push(scheduleCandidate);
  }

  return { priority, updates };
}
