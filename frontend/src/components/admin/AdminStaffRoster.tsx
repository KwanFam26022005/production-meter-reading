import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react';
import {
  AdminRosterResponse,
  AdminShiftAssignItem,
  LeaveRequestItem,
  User,
} from '../../types';
import {
  getAdminRoster,
  assignAdminShifts,
  autoPatternAdminRoster,
  getAdminLeaveRequests,
  reviewAdminLeaveRequest,
  getAdminRosterExportUrl,
} from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';

interface AdminStaffRosterProps {
  user: User;
}

export const AdminStaffRoster: React.FC<AdminStaffRosterProps> = ({ user: _currentUser }) => {
  const getTodayMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [currentMonth, setCurrentMonth] = useState<string>(getTodayMonthStr());
  const [rosterData, setRosterData] = useState<AdminRosterResponse | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'LEAVES'>('ROSTER');

  // Pending cell modifications in client RAM before saving
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingChanges, setSavingChanges] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveFilter, setLeaveFilter] = useState<string>('ALL');
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNoteModal, setReviewNoteModal] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Cell shift editor popover state
  const [activeCellPopover, setActiveCellPopover] = useState<{
    userId: string;
    userName: string;
    date: string;
    currentShift: string;
  } | null>(null);

  // Auto-pattern modal state
  const [autoPatternModalOpen, setAutoPatternModalOpen] = useState<boolean>(false);
  const [patternType, setPatternType] = useState<string>('THREE_SHIFT_FOUR_TEAM');
  const [applyingPattern, setApplyingPattern] = useState<boolean>(false);

  const fetchRoster = async (monthStr: string) => {
    setLoadingRoster(true);
    setRosterError(null);
    try {
      const data = await getAdminRoster(monthStr);
      setRosterData(data);
      setPendingChanges({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải ma trận phân ca.';
      setRosterError(msg);
    } finally {
      setLoadingRoster(false);
    }
  };

  const fetchLeaves = async (filter: string) => {
    setLoadingLeaves(true);
    try {
      const data = await getAdminLeaveRequests(filter);
      setLeaveRequests(data);
    } catch {
      // ignore
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchRoster(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    fetchLeaves(leaveFilter);
  }, [leaveFilter]);

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

  const handleCellClick = (userId: string, userName: string, dateStr: string, currShift: string) => {
    const key = `${userId}_${dateStr}`;
    const effectiveShift = pendingChanges[key] || currShift;
    setActiveCellPopover({
      userId,
      userName,
      date: dateStr,
      currentShift: effectiveShift,
    });
  };

  const handleSelectShiftForCell = (shiftCode: string) => {
    if (!activeCellPopover) return;
    const key = `${activeCellPopover.userId}_${activeCellPopover.date}`;
    setPendingChanges((prev) => ({
      ...prev,
      [key]: shiftCode,
    }));
    setActiveCellPopover(null);
  };

  const handleSaveRoster = async () => {
    const changeKeys = Object.keys(pendingChanges);
    if (changeKeys.length === 0) return;

    setSavingChanges(true);
    setSaveSuccessMsg(null);

    const assignments: AdminShiftAssignItem[] = changeKeys.map((k) => {
      const [userId, workDate] = k.split('_');
      return {
        user_id: userId,
        work_date: workDate,
        shift_code: pendingChanges[k],
      };
    });

    try {
      const res = await assignAdminShifts(assignments);
      setSaveSuccessMsg(res.message);
      await fetchRoster(currentMonth);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu bảng phân ca.');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleApplyAutoPattern = async () => {
    setApplyingPattern(true);
    try {
      const res = await autoPatternAdminRoster(currentMonth, [], patternType);
      alert(res.message);
      setAutoPatternModalOpen(false);
      await fetchRoster(currentMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể áp dụng chu kỳ ca.');
    } finally {
      setApplyingPattern(false);
    }
  };

  const handleReviewLeave = async (requestId: string, action: 'APPROVED' | 'REJECTED', note?: string) => {
    setReviewingId(requestId);
    try {
      await reviewAdminLeaveRequest(requestId, action, note);
      await fetchLeaves(leaveFilter);
      await fetchRoster(currentMonth);
      setReviewNoteModal(null);
      setRejectReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xử lý đơn.');
    } finally {
      setReviewingId(null);
    }
  };

  const pendingChangesCount = Object.keys(pendingChanges).length;
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="admin-page-container">
      {/* 1. HEADER SECTION */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--sgp-brand-600)' }} />
            <span>Quản lý Lịch phân ca & Phê duyệt Phép</span>
          </h1>
          <p className="admin-page-subtitle">
            Lập lịch kíp trực 3 ca 4 kíp cảng biển, quản lý thời khóa biểu nhân viên và phê duyệt đơn xin nghỉ phép
          </p>
        </div>

        {/* Action Controls */}
        <div className="admin-roster-actions">
          {/* Month Stepper */}
          <div className="admin-roster-stepper">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="admin-btn-secondary"
              style={{ height: '30px', padding: '0 8px', border: 'none' }}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Tháng {currentMonth}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="admin-btn-secondary"
              style={{ height: '30px', padding: '0 8px', border: 'none' }}
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoPatternModalOpen(true)}
            className="admin-btn-secondary"
            title="Áp dụng chu kỳ 3 ca 4 kíp cảng biển tự động"
          >
            <Sparkles size={15} style={{ color: '#4F46E5' }} />
            <span>Phân ca kíp tự động</span>
          </button>

          <a
            href={getAdminRosterExportUrl(currentMonth)}
            download
            className="admin-btn-secondary"
            title="Tải bảng phân ca Excel / CSV"
          >
            <Download size={15} />
            <span>Xuất Excel / CSV</span>
          </a>

          {pendingChangesCount > 0 && (
            <button
              type="button"
              onClick={handleSaveRoster}
              disabled={savingChanges}
              className="admin-btn-primary"
              style={{ backgroundColor: '#16A34A' }}
            >
              <Save size={15} />
              <span>{savingChanges ? 'Đang lưu...' : `Lưu ${pendingChangesCount} thay đổi`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchRoster(currentMonth);
              fetchLeaves(leaveFilter);
            }}
            className="admin-btn-refresh"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={15} className={loadingRoster ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="admin-alert-banner alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SUB-TABS: ROSTER MATRIX vs LEAVE REQUESTS */}
      <div className="admin-subtabs-bar">
        <button
          type="button"
          onClick={() => setActiveSubTab('ROSTER')}
          className={`admin-subtab-btn ${activeSubTab === 'ROSTER' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={16} />
          <span>Ma trận Phân ca Tháng</span>
          {pendingChangesCount > 0 && (
            <span className="admin-subtab-count">
              {pendingChangesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('LEAVES')}
          className={`admin-subtab-btn ${activeSubTab === 'LEAVES' ? 'active' : ''}`}
        >
          <Clock size={16} />
          <span>Đơn xin nghỉ phép cần duyệt</span>
          {pendingLeavesCount > 0 && (
            <span className="admin-subtab-badge">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: MONTHLY ROSTER MATRIX                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'ROSTER' && (
        <div className="admin-surface-card" style={{ padding: 0, overflow: 'hidden', background: '#ffffff', border: '1px solid var(--sgp-border)', borderRadius: 'var(--radius-md)' }}>
          {/* Shift legend bar */}
          <div className="admin-roster-legend-bar">
            <div className="admin-roster-legend-items">
              <span style={{ color: 'var(--sgp-ink-muted)', fontWeight: 600 }}>Ký hiệu ca:</span>
              <span className="admin-legend-pill shift-tag-ca1">C1: 06:00 - 14:00</span>
              <span className="admin-legend-pill shift-tag-ca2">C2: 14:00 - 22:00</span>
              <span className="admin-legend-pill shift-tag-ca3">C3: 22:00 - 06:00</span>
              <span className="admin-legend-pill shift-tag-hc">HC: 07:30 - 16:30</span>
              <span className="admin-legend-pill shift-tag-off">OFF: Nghỉ tuần</span>
              <span className="admin-legend-pill shift-tag-leave">PHÉP: Nghỉ phép</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)', fontStyle: 'italic' }}>
              💡 Bấm trực tiếp vào từng ô để đổi ca trực cho nhân viên
            </div>
          </div>

          {loadingRoster ? (
            <LoadingState message="Đang tải ma trận phân ca tháng..." />
          ) : rosterError ? (
            <ErrorState message={rosterError} onRetry={() => fetchRoster(currentMonth)} />
          ) : rosterData ? (
            <div className="admin-roster-table-wrap">
              <table className="admin-roster-table">
                <thead>
                  <tr>
                    <th className="col-employee">Nhân sự</th>
                    {rosterData.days_header.map((d) => (
                      <th
                        key={d.date}
                        className={d.is_today ? 'day-today' : d.is_weekend ? 'day-weekend' : ''}
                      >
                        <div style={{ fontSize: '10px', lineHeight: 1.1 }}>{d.weekday_label}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{d.day}</div>
                      </th>
                    ))}
                    <th style={{ width: '70px' }}>Tổng ca</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.users.map((u) => (
                    <tr key={u.user_id}>
                      {/* Sticky Employee Name Column */}
                      <td className="col-employee">
                        <div style={{ fontWeight: 700, color: 'var(--sgp-ink)' }}>{u.full_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)' }}>{u.employee_code} · {u.role}</div>
                      </td>

                      {/* Day Shift Cells */}
                      {rosterData.days_header.map((d) => {
                        const key = `${u.user_id}_${d.date}`;
                        const isModified = pendingChanges[key] !== undefined;
                        const shiftVal = isModified ? pendingChanges[key] : u.shifts[d.date] || 'OFF';

                        let tagClass = 'shift-tag-off';
                        if (shiftVal === 'CA1') tagClass = 'shift-tag-ca1';
                        else if (shiftVal === 'CA2') tagClass = 'shift-tag-ca2';
                        else if (shiftVal === 'CA3') tagClass = 'shift-tag-ca3';
                        else if (shiftVal === 'HC') tagClass = 'shift-tag-hc';
                        else if (shiftVal === 'LEAVE') tagClass = 'shift-tag-leave';

                        return (
                          <td
                            key={d.date}
                            onClick={() => handleCellClick(u.user_id, u.full_name, d.date, shiftVal)}
                            className={`admin-roster-cell ${isModified ? 'is-modified' : ''}`}
                            title={`${u.full_name} - ${d.date}: ${shiftVal} (Click để đổi)`}
                          >
                            <span className={`admin-roster-cell-pill ${tagClass}`}>
                              {shiftVal}
                            </span>
                          </td>
                        );
                      })}

                      {/* Total Shifts Count */}
                      <td style={{ fontWeight: 700, color: 'var(--sgp-ink)' }}>
                        {u.total_shifts} ca
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="admin-roster-footer-row">
                    <td className="col-employee">
                      Tổng NV trực / ngày
                    </td>
                    {rosterData.days_header.map((d) => {
                      const dayStaff = rosterData.daily_staff_count[d.date];
                      const totalWorking = dayStaff?.total_working || 0;
                      const isLow = totalWorking < 2;

                      return (
                        <td
                          key={`total-${d.date}`}
                          style={{
                            backgroundColor: isLow ? '#FEF3C7' : undefined,
                            color: isLow ? '#B45309' : undefined,
                            fontWeight: isLow ? 800 : 700,
                            fontSize: '10px',
                          }}
                        >
                          {totalWorking} NV
                        </td>
                      );
                    })}
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: LEAVE REQUESTS APPROVAL TABLE                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'LEAVES' && (
        <div className="admin-leaves-card">
          {/* Filters Bar */}
          <div className="admin-leaves-filter-bar">
            <div className="admin-filter-chips">
              <Filter size={15} style={{ color: 'var(--sgp-ink-muted)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sgp-ink-secondary)' }}>Lọc theo trạng thái:</span>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLeaveFilter(st)}
                  className={`admin-filter-chip ${leaveFilter === st ? 'active' : ''}`}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loadingLeaves ? (
            <LoadingState message="Đang tải danh sách đơn xin nghỉ phép..." />
          ) : leaveRequests.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sgp-ink-muted)', fontSize: '13px' }}>
              Không tìm thấy đơn xin nghỉ phép nào theo tiêu chí lọc.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--sgp-border)' }}>
              <table className="admin-leaves-table">
                <thead>
                  <tr>
                    <th>Nhân viên gửi</th>
                    <th>Thời gian xin nghỉ</th>
                    <th>Ca làm việc</th>
                    <th>Loại phép & Lý do</th>
                    <th>Người trực thay</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center', width: '160px' }}>Thao tác duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((req) => {
                    let statusBadge = (
                      <span className="status-badge status-badge-pending">
                        Chờ Admin duyệt
                      </span>
                    );
                    if (req.status === 'APPROVED') {
                      statusBadge = (
                        <span className="status-badge status-badge-approved">
                          <Check size={12} /> Đã duyệt
                        </span>
                      );
                    } else if (req.status === 'REJECTED') {
                      statusBadge = (
                        <span className="status-badge status-badge-rejected">
                          <X size={12} /> Từ chối
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
                      <tr key={req.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--sgp-ink)' }}>
                            {req.user?.full_name || 'Nhân viên'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)' }}>
                            {req.user?.employee_code} · {req.user?.role}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--sgp-ink)' }}>
                          {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                        </td>
                        <td>
                          <span className="admin-roster-cell-pill shift-tag-hc">
                            {req.shift_code === 'ALL' ? 'Cả ngày' : req.shift_code}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <span className="admin-legend-pill shift-tag-ca1" style={{ marginBottom: '4px' }}>
                            {req.leave_type_label}
                          </span>
                          <p style={{ color: 'var(--sgp-ink-secondary)', margin: '4px 0 0', fontSize: '12px' }}>{req.reason}</p>
                        </td>
                        <td>
                          {req.substitute_user ? (
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--sgp-ink)' }}>
                                {req.substitute_user.full_name}
                              </span>
                              <div style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)' }}>
                                {req.substitute_user.employee_code}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--sgp-ink-muted)', fontStyle: 'italic' }}>Không chỉ định</span>
                          )}
                        </td>
                        <td>{statusBadge}</td>
                        <td style={{ textAlign: 'center' }}>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleReviewLeave(req.id, 'APPROVED')}
                                disabled={reviewingId === req.id}
                                className="btn-approve-sm"
                              >
                                <Check size={14} /> Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewNoteModal({ id: req.id, action: 'REJECTED' })}
                                disabled={reviewingId === req.id}
                                className="btn-reject-sm"
                              >
                                <X size={14} /> Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--sgp-ink-muted)', fontSize: '11px', fontStyle: 'italic' }}>Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: QUICK CELL SHIFT EDITOR */}
      {activeCellPopover && (
        <div className="roster-modal-backdrop">
          <div className="roster-modal-content" style={{ maxWidth: '380px' }}>
            <div className="roster-modal-header">
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  Đổi ca: {activeCellPopover.userName}
                </h4>
                <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>Ngày: {activeCellPopover.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellPopover(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roster-modal-body">
              <div className="shift-quick-grid">
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('CA1')}
                  className="shift-quick-btn shift-tag-ca1"
                >
                  Ca 1 (06:00 - 14:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('CA2')}
                  className="shift-quick-btn shift-tag-ca2"
                >
                  Ca 2 (14:00 - 22:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('CA3')}
                  className="shift-quick-btn shift-tag-ca3"
                >
                  Ca 3 (22:00 - 06:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('HC')}
                  className="shift-quick-btn shift-tag-hc"
                >
                  Ca Hành chính
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('OFF')}
                  className="shift-quick-btn shift-tag-off"
                >
                  Nghỉ tuần (OFF)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectShiftForCell('LEAVE')}
                  className="shift-quick-btn shift-tag-leave"
                >
                  Nghỉ phép (PHÉP)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTO PATTERN MODAL (3 ca 4 kíp) */}
      {autoPatternModalOpen && (
        <div className="roster-modal-backdrop">
          <div className="roster-modal-content" style={{ maxWidth: '440px' }}>
            <div className="roster-modal-header">
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} />
                <span>Phân ca tự động theo chu kỳ kíp</span>
              </h4>
              <button
                type="button"
                onClick={() => setAutoPatternModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="roster-modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--sgp-ink-secondary)' }}>
                Chọn chu kỳ kíp trực chuẩn để tự động phân lịch cho toàn bộ nhân sự trong tháng <strong>{currentMonth}</strong>:
              </p>

              <div
                className={`roster-pattern-choice ${patternType === 'THREE_SHIFT_FOUR_TEAM' ? 'selected' : ''}`}
                onClick={() => setPatternType('THREE_SHIFT_FOUR_TEAM')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="pattern"
                    value="THREE_SHIFT_FOUR_TEAM"
                    checked={patternType === 'THREE_SHIFT_FOUR_TEAM'}
                    onChange={() => setPatternType('THREE_SHIFT_FOUR_TEAM')}
                  />
                  <strong style={{ color: 'var(--sgp-brand-800)', fontSize: '13px' }}>Chu kỳ Cảng biển: 3 ca 4 kíp</strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--sgp-ink-secondary)', margin: '6px 0 0 24px' }}>
                  Luân phiên: Ca 1 → Ca 2 → Ca 3 → Nghỉ OFF (lệch kíp giữa các nhân sự đảm bảo trạm luôn có người trực 24/7).
                </p>
              </div>

              <div
                className={`roster-pattern-choice ${patternType === 'STANDARD_WEEKDAY' ? 'selected' : ''}`}
                onClick={() => setPatternType('STANDARD_WEEKDAY')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="pattern"
                    value="STANDARD_WEEKDAY"
                    checked={patternType === 'STANDARD_WEEKDAY'}
                    onChange={() => setPatternType('STANDARD_WEEKDAY')}
                  />
                  <strong style={{ color: 'var(--sgp-brand-800)', fontSize: '13px' }}>Chu kỳ Hành chính: Thứ 2 – Thứ 6</strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--sgp-ink-secondary)', margin: '6px 0 0 24px' }}>
                  Làm ca Hành chính (07:30 - 16:30) từ Thứ 2 đến Thứ 6; Thứ 7 & CN nghỉ OFF.
                </p>
              </div>
            </div>

            <div className="roster-modal-footer">
              <button
                type="button"
                onClick={() => setAutoPatternModalOpen(false)}
                className="admin-btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyAutoPattern}
                disabled={applyingPattern}
                className="admin-btn-primary"
              >
                {applyingPattern ? 'Đang áp dụng...' : 'Áp dụng cho cả tháng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REASON POPUP */}
      {reviewNoteModal && (
        <div className="roster-modal-backdrop">
          <div className="roster-modal-content" style={{ maxWidth: '400px' }}>
            <div className="roster-modal-header" style={{ backgroundColor: 'var(--sgp-danger)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Từ chối đơn xin nghỉ phép</h4>
              <button
                type="button"
                onClick={() => setReviewNoteModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="roster-modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--sgp-ink-secondary)' }}>
                Vui lòng nhập lý do từ chối để phản hồi lại cho nhân viên:
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Ca trực thiếu nhân sự đối soát chỉ số công tơ..."
                className="admin-form-input"
                style={{ height: 'auto', minHeight: '80px', padding: '8px' }}
              />
            </div>
            <div className="roster-modal-footer">
              <button
                type="button"
                onClick={() => setReviewNoteModal(null)}
                className="admin-btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleReviewLeave(reviewNoteModal.id, 'REJECTED', rejectReason)}
                className="admin-btn-primary"
                style={{ backgroundColor: 'var(--sgp-danger)' }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
