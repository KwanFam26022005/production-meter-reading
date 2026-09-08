import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  CheckCircle2,
  CalendarDays,
  XCircle,
  FileText,
} from 'lucide-react';
import {
  User,
  UserMonthlyScheduleResponse,
  WorkScheduleDay,
  LeaveRequestItem,
} from '../types';
import {
  getUserMonthlySchedule,
  getMyLeaveRequests,
  cancelLeaveRequest,
} from '../services/api';
import { LeaveRequestModal } from './LeaveRequestModal';
import { AuthenticatedShell } from './AuthenticatedShell';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';

interface UserScheduleViewProps {
  user: User;
  onBackToHome: () => void;
  onLogout: () => void;
}

export const UserScheduleView: React.FC<UserScheduleViewProps> = ({
  user,
  onBackToHome,
  onLogout,
}) => {
  const getTodayMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [currentMonth, setCurrentMonth] = useState<string>(getTodayMonthStr());
  const [scheduleData, setScheduleData] = useState<UserMonthlyScheduleResponse | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<WorkScheduleDay | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(false);

  const [leaveModalOpen, setLeaveModalOpen] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const fetchData = async (monthStr: string) => {
    setLoadingSchedule(true);
    setScheduleError(null);
    try {
      const data = await getUserMonthlySchedule(monthStr);
      setScheduleData(data);

      // Select today by default, or first day
      const todayDay = data.days.find((d) => d.is_today) || data.days[0] || null;
      setSelectedDay(todayDay);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch làm việc.';
      setScheduleError(msg);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const leaves = await getMyLeaveRequests();
      setLeaveRequests(leaves);
    } catch {
      // ignore
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchData(currentMonth);
    fetchLeaves();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const nextStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextStr);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextStr);
  };

  const handleCancelLeave = async (reqId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn xin nghỉ phép này?')) return;
    setSubmittingAction(true);
    try {
      await cancelLeaveRequest(reqId);
      await fetchLeaves();
      await fetchData(currentMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể hủy đơn.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatMonthTitle = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    return `Tháng ${m} / ${y}`;
  };

  const getShiftBadge = (shiftCode: string) => {
    switch (shiftCode) {
      case 'CA1':
        return <span className="shift-tag-ca1 admin-roster-cell-pill">C1 (06-14h)</span>;
      case 'CA2':
        return <span className="shift-tag-ca2 admin-roster-cell-pill">C2 (14-22h)</span>;
      case 'CA3':
        return <span className="shift-tag-ca3 admin-roster-cell-pill">C3 (22-06h)</span>;
      case 'HC':
        return <span className="shift-tag-hc admin-roster-cell-pill">HC (07:30-16:30)</span>;
      case 'LEAVE':
        return <span className="shift-tag-leave admin-roster-cell-pill">PHÉP</span>;
      default:
        return <span className="shift-tag-off admin-roster-cell-pill">OFF</span>;
    }
  };

  return (
    <AuthenticatedShell
      user={user}
      onLogout={onLogout}
      screenTitle="LỊCH LÀM VIỆC & PHÉP"
      onBack={onBackToHome}
    >
      <div className="user-sched-workspace">
        {/* TOP BAR: MONTH SWITCHER & ACTION BUTTON */}
        <section className="user-sched-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="admin-btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sgp-brand-800)', padding: '0 6px' }}>
              {formatMonthTitle(currentMonth)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="admin-btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                fetchData(currentMonth);
                fetchLeaves();
              }}
              className="admin-btn-refresh"
              title="Tải lại dữ liệu"
              aria-label="Tải lại"
            >
              <RefreshCw size={15} className={loadingSchedule ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setLeaveModalOpen(true)}
              className="admin-btn-primary"
              style={{ height: '36px', padding: '0 12px' }}
            >
              <Plus size={15} />
              <span>Xin nghỉ phép</span>
            </button>
          </div>
        </section>

        {loadingSchedule ? (
          <LoadingState message="Đang tải lịch làm việc tháng..." />
        ) : scheduleError ? (
          <ErrorState message={scheduleError} onRetry={() => fetchData(currentMonth)} />
        ) : scheduleData ? (
          <>
            {/* KPI STATS CARDS */}
            <div className="user-sched-kpi-grid">
              <div className="user-sched-kpi-card">
                <span className="user-sched-kpi-label">Tổng ca trong tháng</span>
                <strong className="user-sched-kpi-val">
                  {scheduleData.summary.total_shifts} ca
                </strong>
              </div>
              <div className="user-sched-kpi-card">
                <span className="user-sched-kpi-label">Đã hoàn tất</span>
                <strong className="user-sched-kpi-val" style={{ color: 'var(--sgp-success)' }}>
                  {scheduleData.summary.completed_shifts} ca
                </strong>
              </div>
              <div className="user-sched-kpi-card">
                <span className="user-sched-kpi-label">Ca sắp tới</span>
                <strong className="user-sched-kpi-val" style={{ color: 'var(--sgp-brand-600)' }}>
                  {scheduleData.summary.upcoming_shifts} ca
                </strong>
              </div>
              <div className="user-sched-kpi-card">
                <span className="user-sched-kpi-label">Phép năm còn lại</span>
                <strong className="user-sched-kpi-val" style={{ color: '#7C3AED' }}>
                  {scheduleData.summary.annual_leave_remaining} ngày
                </strong>
              </div>
            </div>

            {/* MONTHLY CALENDAR GRID */}
            <section className="user-sched-calendar-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sgp-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={16} style={{ color: 'var(--sgp-brand-600)' }} />
                  Lịch phân ca {currentMonth}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7' }}></span>C1</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }}></span>C2</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED' }}></span>C3</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DB2777' }}></span>Phép</span>
                </div>
              </div>

              {/* Day-of-week Headers */}
              <div className="user-sched-grid" style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--sgp-ink-muted)', paddingBottom: '4px', borderBottom: '1px solid var(--sgp-border)' }}>
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span style={{ color: 'var(--sgp-ink)' }}>T7</span>
                <span style={{ color: 'var(--sgp-danger)' }}>CN</span>
              </div>

              {/* Days Grid */}
              <div className="user-sched-grid">
                {/* Pad empty cells before the 1st of month */}
                {Array.from({ length: scheduleData.days[0]?.day_of_week || 0 }).map((_, idx) => (
                  <div key={`pad-${idx}`} style={{ minHeight: '52px' }} />
                ))}

                {scheduleData.days.map((d) => {
                  const isSelected = selectedDay?.date === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`user-sched-day-cell ${isSelected ? 'is-selected' : ''} ${d.is_today ? 'is-today' : ''}`}
                    >
                      <span
                        className="user-sched-day-num"
                        style={{
                          color: d.is_today ? '#1D4ED8' : d.day_of_week === 6 ? 'var(--sgp-danger)' : 'var(--sgp-ink)'
                        }}
                      >
                        {d.day}
                      </span>

                      {/* Shift Tag */}
                      <span
                        className="user-sched-day-tag"
                        style={{
                          backgroundColor: d.bg_color,
                          color: d.color,
                        }}
                      >
                        {d.shift_code === 'OFF' ? 'OFF' : d.shift_code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SELECTED DAY DETAIL PANEL */}
            {selectedDay && (
              <section className="user-sched-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--sgp-border)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} style={{ color: 'var(--sgp-brand-800)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sgp-ink)' }}>
                      Chi tiết: {selectedDay.weekday_label}, {selectedDay.date}
                    </span>
                  </div>
                  {getShiftBadge(selectedDay.shift_code)}
                </div>

                <div className="user-sched-detail-row">
                  <div className="user-sched-detail-field">
                    <span className="user-sched-field-label">Tên ca làm việc</span>
                    <span className="user-sched-field-value">{selectedDay.shift_name}</span>
                  </div>
                  <div className="user-sched-detail-field">
                    <span className="user-sched-field-label">Thời gian trực</span>
                    <span className="user-sched-field-value">
                      {selectedDay.start_time ? `${selectedDay.start_time} – ${selectedDay.end_time}` : 'Không có ca trực'}
                    </span>
                  </div>
                  <div className="user-sched-detail-field">
                    <span className="user-sched-field-label">Địa bàn tác nghiệp</span>
                    <span style={{ fontSize: '12px', color: 'var(--sgp-ink-secondary)', fontWeight: 500 }}>
                      Khu cảng Tân Thuận · Trạm biến áp & Bến bốc dỡ
                    </span>
                  </div>
                  <div className="user-sched-detail-field">
                    <span className="user-sched-field-label">Trạng thái chấm công</span>
                    <span style={{ fontSize: '12px', color: 'var(--sgp-ink)', fontWeight: 600 }}>
                      {selectedDay.is_past ? '✓ Đã qua ngày làm việc' : selectedDay.is_today ? 'Hôm nay' : 'Sắp tới'}
                    </span>
                  </div>
                </div>

                {selectedDay.notes && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--sgp-canvas)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', color: 'var(--sgp-ink-secondary)' }}>
                    <strong>Ghi chú:</strong> {selectedDay.notes}
                  </div>
                )}
              </section>
            )}

            {/* LEAVE REQUESTS & STATUS */}
            <section className="user-sched-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sgp-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} style={{ color: 'var(--sgp-brand-600)' }} />
                  Đơn xin nghỉ phép của bạn
                </h3>
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(true)}
                  style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sgp-brand-700)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Tạo đơn mới
                </button>
              </div>

              {loadingLeaves ? (
                <div style={{ fontSize: '12px', color: 'var(--sgp-ink-muted)', padding: '12px 0', textAlign: 'center' }}>
                  Đang tải đơn xin phép...
                </div>
              ) : leaveRequests.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--sgp-canvas)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '12px', color: 'var(--sgp-ink-muted)' }}>
                  Bạn chưa có đơn xin nghỉ phép nào trong tháng này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaveRequests.map((req) => {
                    let statusBadge = (
                      <span className="status-badge status-badge-pending">
                        Chờ duyệt
                      </span>
                    );
                    if (req.status === 'APPROVED') {
                      statusBadge = (
                        <span className="status-badge status-badge-approved">
                          <CheckCircle2 size={12} /> Đã duyệt
                        </span>
                      );
                    } else if (req.status === 'REJECTED') {
                      statusBadge = (
                        <span className="status-badge status-badge-rejected">
                          <XCircle size={12} /> Từ chối
                        </span>
                      );
                    } else if (req.status === 'CANCELLED') {
                      statusBadge = (
                        <span className="status-badge status-badge-cancelled">
                          Đã hủy
                        </span>
                      );
                    }

                    return (
                      <div key={req.id} className="user-sched-leave-item">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--sgp-ink)' }}>
                            {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                          </strong>
                          {statusBadge}
                        </div>
                        <div style={{ color: 'var(--sgp-ink-secondary)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--sgp-ink)' }}>{req.leave_type_label}:</span> {req.reason}
                        </div>
                        {req.substitute_user && (
                          <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)' }}>
                            Người trực thay: {req.substitute_user.full_name} ({req.substitute_user.employee_code})
                          </div>
                        )}
                        {req.review_note && (
                          <div style={{ fontSize: '11.5px', color: 'var(--sgp-danger)', background: 'var(--sgp-danger-bg)', padding: '6px 8px', borderRadius: '4px' }}>
                            <strong>Phản hồi từ Admin:</strong> {req.review_note}
                          </div>
                        )}
                        {req.status === 'PENDING' && (
                          <div style={{ paddingTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleCancelLeave(req.id)}
                              disabled={submittingAction}
                              style={{ fontSize: '11.5px', color: 'var(--sgp-danger)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Hủy đơn này
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}

        {/* MODAL XIN NGHỈ PHÉP */}
        <LeaveRequestModal
          isOpen={leaveModalOpen}
          onClose={() => setLeaveModalOpen(false)}
          onSuccess={() => {
            fetchLeaves();
            fetchData(currentMonth);
          }}
          initialDate={selectedDay?.date}
        />
      </div>
    </AuthenticatedShell>
  );
};
