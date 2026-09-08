import React, { useEffect, useState } from 'react';
import {
  Zap,
  Clock,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { NextShiftInfo, TodayAttendance, TodayOperationsResponse, User, formatUserRole } from '../types';
import { getTodayAttendance, getTodayOperations, getUserMonthlySchedule } from '../services/api';

interface HomeHubProps {
  user: User;
  onOpenMeter: () => void;
  onOpenAttendance: () => void;
  onOpenSchedule: () => void;
}

export function getTimeBasedGreeting(fullName: string): string {
  let timeSalutation = 'Xin chào';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    if (hour >= 5 && hour < 11) {
      timeSalutation = 'Chào buổi sáng';
    } else if (hour >= 11 && hour < 14) {
      timeSalutation = 'Chào buổi trưa';
    } else if (hour >= 14 && hour < 18) {
      timeSalutation = 'Chào buổi chiều';
    } else {
      timeSalutation = 'Chào buổi tối';
    }
  } catch {
    timeSalutation = 'Xin chào';
  }

  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return timeSalutation;
  }
  // Extract display/first name naturally in Vietnamese context (last word of full name)
  const tokens = trimmed.split(/\s+/);
  const displayName = tokens.length > 0 ? tokens[tokens.length - 1] : trimmed;
  return `${timeSalutation}, ${displayName}`;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  user,
  onOpenMeter,
  onOpenAttendance,
  onOpenSchedule,
}) => {
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(true);

  const [operations, setOperations] = useState<TodayOperationsResponse | null>(null);
  const [loadingOperations, setLoadingOperations] = useState<boolean>(true);
  const [operationsError, setOperationsError] = useState<string | null>(null);

  const [nextShift, setNextShift] = useState<NextShiftInfo | null>(null);

  const fetchOperationsData = () => {
    setLoadingOperations(true);
    setOperationsError(null);
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    getTodayOperations(todayDateStr)
      .then((data) => {
        setOperations(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Không thể tải trạng thái lượt đọc.';
        setOperationsError(msg);
      })
      .finally(() => {
        setLoadingOperations(false);
      });
  };

  useEffect(() => {
    let mounted = true;

    getTodayAttendance()
      .then((data) => {
        if (mounted) setAttendance(data);
      })
      .catch(() => {
        // ignore background fetch error
      })
      .finally(() => {
        if (mounted) setLoadingAttendance(false);
      });

    fetchOperationsData();

    getUserMonthlySchedule()
      .then((data) => {
        if (mounted && data.next_shift) {
          setNextShift(data.next_shift);
        }
      })
      .catch(() => {
        // ignore background fetch error
      });

    return () => {
      mounted = false;
    };
  }, []);

  const renderUserContextAttendanceStatus = () => {
    if (loadingAttendance) {
      return <span className="workspace-status-badge status-neutral">Đang kiểm tra...</span>;
    }
    if (!attendance || (!attendance.check_in && !attendance.check_out)) {
      return (
        <span className="workspace-status-badge status-warning">
          <span className="status-dot dot-warning" /> Chưa vào ca
        </span>
      );
    }
    if (attendance.check_in && !attendance.check_out) {
      return (
        <span className="workspace-status-badge status-success">
          <span className="status-dot dot-success" /> Đang trong ca
        </span>
      );
    }
    return (
      <span className="workspace-status-badge status-completed">
        <CheckCircle2 size={13} strokeWidth={2.2} /> Đã hoàn tất ca
      </span>
    );
  };

  const renderAttendanceCardStatus = () => {
    if (loadingAttendance) {
      return <span className="card-status-pill status-neutral">Đang kiểm tra...</span>;
    }
    if (!attendance || (!attendance.check_in && !attendance.check_out)) {
      return (
        <span className="card-status-pill status-warning">
          <AlertCircle size={12} strokeWidth={2} /> Chưa vào ca
        </span>
      );
    }
    if (attendance.check_in && !attendance.check_out) {
      const checkInTime = attendance.check_in.formatted_time.split(' - ')[0];
      return (
        <span className="card-status-pill status-success">
          <CheckCircle2 size={12} strokeWidth={2} /> Đang trong ca ({checkInTime})
        </span>
      );
    }
    return (
      <span className="card-status-pill status-completed">
        <CheckCircle2 size={12} strokeWidth={2} /> Đã hoàn tất ca
      </span>
    );
  };

  const renderPrioritySection = () => {
    if (loadingOperations) {
      return (
        <section className="workspace-priority-section" aria-label="Việc cần làm">
          <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
          <div className="workspace-priority-skeleton" aria-busy="true">
            <div className="skeleton-line" style={{ width: '45%' }} />
            <div className="skeleton-line" style={{ width: '75%' }} />
          </div>
        </section>
      );
    }

    if (operationsError) {
      return (
        <section className="workspace-priority-section" aria-label="Việc cần làm">
          <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
          <div className="workspace-priority-card-error">
            <div className="workspace-priority-error-text">
              <AlertCircle size={15} />
              <span>Không thể tải trạng thái lượt đọc.</span>
            </div>
            <button
              type="button"
              className="workspace-priority-retry-btn"
              onClick={fetchOperationsData}
              aria-label="Thử lại tải trạng thái lượt đọc"
            >
              <RefreshCw size={13} />
              <span>Thử lại</span>
            </button>
          </div>
        </section>
      );
    }

    if (!operations) return null;

    const currentRound = operations.current_round;

    // Case 1: An active current round exists
    if (currentRound) {
      const pendingCount = currentRound.progress.pending;
      const reviewCount = currentRound.progress.review;
      const totalRemaining = pendingCount + reviewCount;

      if (totalRemaining > 0) {
        return (
          <section className="workspace-priority-section" aria-label="Việc cần làm">
            <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
            <button
              type="button"
              className="workspace-priority-card"
              onClick={onOpenMeter}
              aria-label={`Tiếp tục đọc công tơ lượt ${currentRound.scheduled_time_only}, còn ${totalRemaining} công tơ cần hoàn thành`}
            >
              <div className="workspace-priority-content">
                <div className="workspace-priority-header-row">
                  <Zap size={15} className="workspace-priority-icon" />
                  <span className="workspace-priority-title">
                    Lượt đọc công tơ {currentRound.scheduled_time_only}
                  </span>
                </div>
                <p className="workspace-priority-desc">
                  Còn {totalRemaining} công tơ cần hoàn thành
                </p>
              </div>
              <div className="workspace-priority-cta">
                <span>Tiếp tục</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </section>
        );
      } else {
        // Current round is 100% completed
        return (
          <section className="workspace-priority-section" aria-label="Việc cần làm">
            <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
            <div className="workspace-priority-card-completed">
              <CheckCircle2 size={18} className="workspace-priority-completed-icon" />
              <div className="workspace-priority-completed-text">
                <span className="priority-completed-title">
                  Lượt đọc {currentRound.scheduled_time_only} đã hoàn tất
                </span>
                <span className="priority-completed-sub">
                  {' '}({currentRound.progress.confirmed}/{currentRound.progress.total} công tơ)
                </span>
              </div>
            </div>
          </section>
        );
      }
    }

    // Case 2: No active round, check if any past slots are incomplete
    const pastIncompleteMeters = operations.meters.filter((m) =>
      m.today_slots.some((s) => s.timing_state === 'PAST' && s.status === 'PENDING')
    );

    if (pastIncompleteMeters.length > 0) {
      return (
        <section className="workspace-priority-section" aria-label="Việc cần làm">
          <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
          <button
            type="button"
            className="workspace-priority-card"
            onClick={onOpenMeter}
            aria-label={`Xử lý ${pastIncompleteMeters.length} công tơ chưa hoàn thành các lượt trước`}
          >
            <div className="workspace-priority-content">
              <div className="workspace-priority-header-row">
                <AlertCircle size={15} className="workspace-priority-icon text-warning" />
                <span className="workspace-priority-title">
                  Công tơ chưa hoàn thành
                </span>
              </div>
              <p className="workspace-priority-desc">
                Còn {pastIncompleteMeters.length} công tơ các lượt trước cần ghi
              </p>
            </div>
            <div className="workspace-priority-cta">
              <span>Xử lý</span>
              <ChevronRight size={16} />
            </div>
          </button>
        </section>
      );
    }

    // Case 3: No current round and no past incomplete work
    return (
      <section className="workspace-priority-section" aria-label="Việc cần làm">
        <h3 className="workspace-priority-eyebrow">VIỆC CẦN LÀM</h3>
        <div className="workspace-priority-card-completed">
          <CheckCircle2 size={18} className="workspace-priority-completed-icon" />
          <span className="workspace-priority-completed-text">
            Hiện không có lượt ghi công tơ cần xử lý
          </span>
        </div>
      </section>
    );
  };

  return (
    <div className="workspace-container">
      {/* 1. User & Shift Context */}
      <section className="workspace-user-context" aria-label="Thông tin nhân viên tác nghiệp">
        <h1 className="workspace-greeting">{getTimeBasedGreeting(user.full_name)}</h1>
        <div className="workspace-subcontext">
          <span className="workspace-employee-meta">
            {user.employee_code} · {formatUserRole(user.role)}
          </span>
          <div className="workspace-status-row">
            {renderUserContextAttendanceStatus()}
          </div>
        </div>
      </section>

      {/* 2. Operational Priority / Current Work */}
      {renderPrioritySection()}

      {/* 3. Business Modules */}
      <div className="workspace-modules-section">
        <h2 className="workspace-section-title">Nghiệp vụ</h2>

        {/* Module 1: Meter Reading */}
        <button
          type="button"
          className="workspace-module-card"
          onClick={onOpenMeter}
          aria-label="Mở chức năng Đo đếm điện năng: Đọc và xác nhận chỉ số công tơ"
        >
          <div className="module-icon-wrap icon-meter">
            <Zap size={22} strokeWidth={2.2} />
          </div>
          <div className="module-card-body">
            <span className="module-card-title">Đo đếm điện năng</span>
            <span className="module-card-desc">
              Đọc và xác nhận chỉ số công tơ
            </span>
          </div>
          <ChevronRight size={20} className="module-card-chevron" />
        </button>

        {/* Module 2: Photo Attendance */}
        <button
          type="button"
          className="workspace-module-card"
          onClick={onOpenAttendance}
          aria-label="Mở chức năng Chấm công ca làm: Vào ca / tan ca"
        >
          <div className="module-icon-wrap icon-attendance">
            <Clock size={22} strokeWidth={2.2} />
          </div>
          <div className="module-card-body">
            <span className="module-card-title">Chấm công ca làm</span>
            <span className="module-card-desc">
              Vào ca / tan ca
            </span>
            <div className="module-card-status">
              {renderAttendanceCardStatus()}
            </div>
          </div>
          <ChevronRight size={20} className="module-card-chevron" />
        </button>

        {/* Module 3: Lịch làm việc & Phép (Thay thế Báo cáo & thống kê) */}
        <button
          type="button"
          className="workspace-module-card"
          onClick={onOpenSchedule}
          aria-label="Mở chức năng Lịch làm việc & Phép: Thời khóa biểu tháng, xin off và đổi ca"
        >
          <div className="module-icon-wrap" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
            <CalendarDays size={22} strokeWidth={2.2} />
          </div>
          <div className="module-card-body">
            <span className="module-card-title">Lịch làm việc & Phép</span>
            <span className="module-card-desc">
              Thời khóa biểu tháng, xin off / đổi ca
            </span>
            <div className="module-card-status">
              {nextShift ? (
                <span className="card-status-pill status-neutral font-medium">
                  {nextShift.is_today ? 'Hôm nay' : nextShift.weekday_label}: {nextShift.shift_name}
                </span>
              ) : (
                <span className="card-status-pill status-neutral">
                  Xem thời khóa biểu
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={20} className="module-card-chevron" />
        </button>
      </div>
    </div>
  );
};
