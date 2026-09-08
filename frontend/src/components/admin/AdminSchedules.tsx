import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  AlertCircle,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  AdminSchedulePreviewResponse,
  ReadingRoundListResponse,
  ReadingRound,
} from '../../types';
import {
  createAdminSchedule,
  deleteAdminScheduleRound,
  deleteAdminSchedulesByDate,
  getAdminSchedules,
  previewAdminSchedule,
} from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { VnDatePicker } from '../ui/VnDatePicker';

export const formatDisplayDateVN = (isoDate: string): string => {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return isoDate;
};

export const addDays = (isoDate: string, days: number): string => {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return isoDate;
  }
};

interface RoundTimingDerived {
  state: 'CURRENT' | 'UPCOMING' | 'PAST_COMPLETE' | 'PAST_INCOMPLETE' | 'CLOSED';
  badgeLabel: string;
  badgeClass: string;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export const deriveRoundTimingState = (
  r: ReadingRound,
  selectedDate: string,
  todayStr: string,
  currentRoundId: string | null
): RoundTimingDerived => {
  if (r.status === 'CLOSED') {
    return {
      state: 'CLOSED',
      badgeLabel: 'Đã đóng',
      badgeClass: 'badge-closed',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  if (selectedDate < todayStr) {
    const isComplete = r.progress.confirmed === r.progress.total && r.progress.total > 0;
    return {
      state: isComplete ? 'PAST_COMPLETE' : 'PAST_INCOMPLETE',
      badgeLabel: isComplete ? 'Đã hoàn tất' : 'Đã qua',
      badgeClass: isComplete ? 'badge-completed' : 'badge-past',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  if (selectedDate > todayStr) {
    return {
      state: 'UPCOMING',
      badgeLabel: 'Sắp tới',
      badgeClass: 'badge-upcoming',
      isCurrent: false,
      isUpcoming: true,
    };
  }

  // Today
  if (currentRoundId && r.id === currentRoundId) {
    return {
      state: 'CURRENT',
      badgeLabel: 'Hiện tại',
      badgeClass: 'badge-current',
      isCurrent: true,
      isUpcoming: false,
    };
  }

  const rTime = new Date(r.scheduled_at).getTime();
  const nowUtcTime = new Date().getTime();

  if (rTime <= nowUtcTime) {
    const isComplete = r.progress.confirmed === r.progress.total && r.progress.total > 0;
    return {
      state: isComplete ? 'PAST_COMPLETE' : 'PAST_INCOMPLETE',
      badgeLabel: isComplete ? 'Đã hoàn tất' : 'Đã qua',
      badgeClass: isComplete ? 'badge-completed' : 'badge-past',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  return {
    state: 'UPCOMING',
    badgeLabel: 'Sắp tới',
    badgeClass: 'badge-upcoming',
    isCurrent: false,
    isUpcoming: true,
  };
};

export const AdminSchedules: React.FC = () => {
  const getTodayLocal = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_schedules_date') || todayStr;
    } catch {
      return todayStr;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('admin_schedules_date', selectedDate);
    } catch {}
  }, [selectedDate]);

  const [scheduleData, setScheduleData] = useState<ReadingRoundListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('17:00');
  const [intervalPreset, setIntervalPreset] = useState<number>(60);
  const [customInterval, setCustomInterval] = useState<string>('30');

  // Preview State
  const [previewData, setPreviewData] = useState<AdminSchedulePreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Creation Action State
  const [creating, setCreating] = useState<boolean>(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Delete State
  interface DeleteTarget {
    type: 'round' | 'day';
    round?: ReadingRound;
    date?: string;
    count?: number;
    confirmedCount?: number;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const loadSchedules = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminSchedules(dateStr);
      setScheduleData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch ghi chỉ số.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules(selectedDate);
  }, [selectedDate]);

  // Determine current round id for today
  let currentRoundId: string | null = null;
  if (scheduleData && selectedDate === todayStr && scheduleData.rounds.length > 0) {
    const nowUtc = new Date().getTime();
    const pastOrCurr = scheduleData.rounds.filter(
      (r) => new Date(r.scheduled_at).getTime() <= nowUtc
    );
    if (pastOrCurr.length > 0) {
      currentRoundId = pastOrCurr[pastOrCurr.length - 1].id;
    }
  }

  // Derive Daily Summary Text
  const getDailySummary = (): string => {
    if (!scheduleData || scheduleData.rounds.length === 0) {
      return '0 lượt';
    }
    const total = scheduleData.rounds.length;

    if (selectedDate > todayStr) {
      return `${total} lượt · Lịch dự kiến`;
    }

    if (selectedDate < todayStr) {
      const completedCount = scheduleData.rounds.filter(
        (r) => r.progress.confirmed === r.progress.total && r.progress.total > 0
      ).length;
      const incompleteCount = total - completedCount;
      if (incompleteCount === 0) {
        return `${total} lượt · ${completedCount} hoàn tất`;
      }
      return `${total} lượt · ${completedCount} hoàn tất · ${incompleteCount} chưa hoàn tất`;
    }

    // Today
    const currentCount = currentRoundId ? 1 : 0;
    const upcomingCount = scheduleData.rounds.filter((r) => {
      const t = deriveRoundTimingState(r, selectedDate, todayStr, currentRoundId);
      return t.isUpcoming;
    }).length;
    const pastCount = total - currentCount - upcomingCount;

    if (pastCount > 0) {
      return `${total} lượt · ${pastCount} đã qua · ${currentCount} hiện tại · ${upcomingCount} sắp tới`;
    }
    return `${total} lượt · ${currentCount} hiện tại · ${upcomingCount} sắp tới`;
  };

  const getEffectiveInterval = (): number => {
    return intervalPreset === -1 ? (Number(customInterval) || 60) : intervalPreset;
  };

  const handleOpenCreateModal = () => {
    setFormDate(selectedDate >= todayStr ? selectedDate : todayStr);
    setFormStart('08:00');
    setFormEnd('17:00');
    setIntervalPreset(60);
    setCustomInterval('30');
    setPreviewData(null);
    setPreviewError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!creating) {
      setIsModalOpen(false);
      setPreviewData(null);
      setPreviewError(null);
    }
  };

  const handleCheckPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const intervalToUse = getEffectiveInterval();
    if (!intervalToUse || intervalToUse < 5 || intervalToUse > 1440) {
      setPreviewError('Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.');
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    try {
      const res = await previewAdminSchedule({
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        interval_minutes: intervalToUse,
      });
      setPreviewData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra lịch đọc.';
      setPreviewError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!previewData || previewData.conflict_count > 0) return;
    const intervalToUse = getEffectiveInterval();
    if (!intervalToUse || intervalToUse < 5 || intervalToUse > 1440) {
      setPreviewError('Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.');
      return;
    }
    setCreating(true);
    setPreviewError(null);
    try {
      const res = await createAdminSchedule({
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        interval_minutes: intervalToUse,
      });
      setIsModalOpen(false);
      setCreateSuccessMsg(res.message);
      setSelectedDate(formDate);
      await loadSchedules(formDate);
      setTimeout(() => setCreateSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo lịch ghi.';
      setPreviewError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDeleteRound = (r: ReadingRound) => {
    setDeleteTarget({
      type: 'round',
      round: r,
    });
    setDeleteError(null);
  };

  const handleOpenDeleteDay = () => {
    if (!scheduleData || scheduleData.rounds.length === 0) return;
    const confirmedCount = scheduleData.rounds.reduce(
      (acc, r) => acc + (r.progress.confirmed || 0),
      0
    );
    setDeleteTarget({
      type: 'day',
      date: selectedDate,
      count: scheduleData.rounds.length,
      confirmedCount,
    });
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    if (!deleting) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === 'round' && deleteTarget.round) {
        const res = await deleteAdminScheduleRound(deleteTarget.round.id, true);
        setDeleteTarget(null);
        setDeleteSuccessMsg(res.message);
        await loadSchedules(selectedDate);
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      } else if (deleteTarget.type === 'day' && deleteTarget.date) {
        const res = await deleteAdminSchedulesByDate(deleteTarget.date, true);
        setDeleteTarget(null);
        setDeleteSuccessMsg(res.message);
        await loadSchedules(selectedDate);
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lịch đọc.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const isSelectedToday = selectedDate === todayStr;

  return (
    <div className="admin-page-container">
      {/* 1. PAGE HEADER */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Lịch ghi chỉ số</h1>
          <p className="admin-page-subtitle">Thiết lập và theo dõi lịch đọc công tơ</p>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          onClick={handleOpenCreateModal}
          aria-label="Tạo lịch đọc mới"
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>Tạo lịch đọc</span>
        </button>
      </div>

      {/* 2. BATCH CONTEXT & TIMELINE TOOLBAR BANNER */}
      {scheduleData && (
        <div className="admin-batch-banner">
          <div className="admin-bb-main">
            <Layers size={18} className="text-brand" aria-hidden="true" />
            <div className="admin-bb-info">
              <span className="admin-bb-kicker">ĐỢT HIỆN HÀNH</span>
              <span className="admin-bb-title">{scheduleData.batch_name}</span>
              <span className="admin-bb-meta">{scheduleData.period_key} &bull; Đang mở</span>
            </div>
          </div>

          {/* Daily Date Navigation Controls */}
          <div className="admin-bb-controls" role="toolbar" aria-label="Điều hướng ngày tác nghiệp">
            {/* Quick "Hôm nay" Button */}
            {!isSelectedToday && (
              <button
                type="button"
                className="admin-btn-today"
                onClick={() => setSelectedDate(todayStr)}
                aria-label="Về hôm nay"
              >
                Hôm nay
              </button>
            )}

            {/* Stepper Chevron Left */}
            <button
              type="button"
              className="admin-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              title="Ngày trước"
              aria-label="Ngày trước"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>

            {/* Localized Vietnamese Date Picker */}
            <VnDatePicker
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              ariaLabel="Chọn ngày tác nghiệp"
            />

            {/* Stepper Chevron Right */}
            <button
              type="button"
              className="admin-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              title="Ngày sau"
              aria-label="Ngày sau"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {/* Tertiary Refresh Button */}
            <button
              type="button"
              className="admin-btn-refresh"
              onClick={() => loadSchedules(selectedDate)}
              disabled={loading}
              title="Làm mới dữ liệu"
              aria-label="Làm mới lịch đọc"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {(createSuccessMsg || deleteSuccessMsg) && (
        <div className="admin-alert-banner alert-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{createSuccessMsg || deleteSuccessMsg}</span>
        </div>
      )}

      {/* 3. DAILY OPERATIONAL TIMELINE TABLE */}
      {loading ? (
        <LoadingState message="Đang tải lịch ghi chỉ số..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải lịch ghi"
          message={error}
          onRetry={() => loadSchedules(selectedDate)}
        />
      ) : !scheduleData || scheduleData.rounds.length === 0 ? (
        <div className="admin-surface-card admin-sched-empty-card">
          <Calendar size={32} className="text-muted" aria-hidden="true" />
          <h3 className="admin-sched-empty-title">
            Chưa có lịch ghi cho ngày {formatDisplayDateVN(selectedDate)}
          </h3>
          <p className="admin-sched-empty-text">
            Không có khung giờ nào được lên lịch cho ngày này. Bạn có thể bấm "Tạo lịch đọc" để thiết lập ca ghi mới.
          </p>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Tạo lịch đọc</span>
          </button>
        </div>
      ) : (
        <div className="admin-surface-card table-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <Clock size={16} className="text-brand" aria-hidden="true" />
              <h2 className="admin-card-title">
                Lịch trình ngày {formatDisplayDateVN(selectedDate)}
              </h2>
            </div>
            <div className="admin-card-header-actions">
              <span className="admin-daily-summary-tag font-tabular">
                {getDailySummary()}
              </span>
              <button
                type="button"
                className="admin-btn-delete-all"
                onClick={handleOpenDeleteDay}
                title={`Xóa tất cả các lượt ghi ngày ${formatDisplayDateVN(selectedDate)}`}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>Xóa toàn bộ lịch ngày</span>
              </button>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table admin-sched-table" aria-label="Bảng các lượt ghi chỉ số theo ngày">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '110px' }}>Lượt</th>
                  <th scope="col" style={{ width: '140px' }}>Trạng thái</th>
                  <th scope="col">Tiến độ</th>
                  <th scope="col" style={{ width: '180px' }}>Ngoại lệ</th>
                  <th scope="col" style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.rounds.map((r) => {
                  const timing = deriveRoundTimingState(
                    r,
                    selectedDate,
                    todayStr,
                    currentRoundId
                  );
                  const pct =
                    r.progress.total > 0
                      ? (r.progress.confirmed / r.progress.total) * 100
                      : 0;

                  return (
                    <tr
                      key={r.id}
                      className={`admin-sched-row ${
                        timing.isCurrent ? 'row-current' : timing.isUpcoming ? 'row-upcoming' : ''
                      }`}
                    >
                      {/* Column 1: Lượt */}
                      <td>
                        <span className="sched-time font-tabular font-bold">
                          {r.scheduled_time_only}
                        </span>
                      </td>

                      {/* Column 2: Trạng thái (Derived Temporal Badge) */}
                      <td>
                        <span className={`admin-badge ${timing.badgeClass} font-tabular`}>
                          {timing.badgeLabel}
                        </span>
                      </td>

                      {/* Column 3: Tiến độ */}
                      <td>
                        {timing.isUpcoming ? (
                          <span className="sched-progress-upcoming font-tabular">
                            {r.progress.total} công tơ
                          </span>
                        ) : (
                          <div className="sched-progress-wrap">
                            <span className="sched-progress-ratio font-tabular">
                              <strong>{r.progress.confirmed}</strong> / {r.progress.total} công tơ
                            </span>
                            <div className="admin-progress-bg sched-progress-bar">
                              <div
                                className="admin-progress-fill"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: timing.isCurrent
                                    ? 'var(--sgp-brand-700)'
                                    : 'var(--sgp-brand-600)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 4: Ngoại lệ */}
                      <td>
                        {r.progress.review > 0 ? (
                          <span className="admin-review-pill font-tabular" title={`${r.progress.review} lượt cần kiểm tra`}>
                            <AlertTriangle size={11} aria-hidden="true" /> {r.progress.review} cần kiểm tra
                          </span>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>

                      {/* Column 5: Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="admin-sched-delete-btn"
                          onClick={() => handleOpenDeleteRound(r)}
                          title={`Xóa lượt ghi lúc ${r.scheduled_time_only}`}
                          aria-label={`Xóa lượt ghi lúc ${r.scheduled_time_only}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CREATE SCHEDULE MODAL WITH CONFLICT DETECTION */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-sched-title">
          <div className="admin-modal-box modal-wide">
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <Clock size={20} className="text-brand" aria-hidden="true" />
                <h2 id="create-sched-title" className="admin-modal-title">
                  Tạo lịch ghi chỉ số định kỳ
                </h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={handleCloseModal}
                disabled={creating}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal-body">
              <form onSubmit={handleCheckPreview} className="admin-schedule-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="sched_date_input" className="admin-form-label">
                      Ngày tác nghiệp <span className="required-star">*</span>
                    </label>
                    <VnDatePicker
                      id="sched_date_input"
                      value={formDate}
                      onChange={(d) => {
                        setFormDate(d);
                        setPreviewData(null);
                      }}
                      min={todayStr}
                      disabled={previewing || creating}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="sched_interval_input" className="admin-form-label">
                      Chu kỳ đọc
                    </label>
                    <select
                      id="sched_interval_input"
                      className="admin-form-select"
                      value={intervalPreset}
                      onChange={(e) => {
                        setIntervalPreset(Number(e.target.value));
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                    >
                      <option value={15}>Mỗi 15 phút</option>
                      <option value={30}>Mỗi 30 phút</option>
                      <option value={45}>Mỗi 45 phút</option>
                      <option value={60}>Mỗi 60 phút (Hàng giờ - Mặc định)</option>
                      <option value={90}>Mỗi 90 phút (1.5 giờ)</option>
                      <option value={120}>Mỗi 120 phút (2 giờ)</option>
                      <option value={180}>Mỗi 180 phút (3 giờ)</option>
                      <option value={240}>Mỗi 240 phút (4 giờ)</option>
                      <option value={360}>Mỗi 360 phút (6 giờ)</option>
                      <option value={480}>Mỗi 480 phút (8 giờ)</option>
                      <option value={720}>Mỗi 720 phút (12 giờ)</option>
                      <option value={-1}>Tùy chỉnh số phút...</option>
                    </select>
                    {intervalPreset === -1 && (
                      <div style={{ marginTop: '6px' }}>
                        <input
                          id="sched_custom_interval_input"
                          type="number"
                          min={5}
                          max={1440}
                          className="admin-form-input font-tabular"
                          value={customInterval}
                          onChange={(e) => {
                            setCustomInterval(e.target.value);
                            setPreviewData(null);
                          }}
                          disabled={previewing || creating}
                          placeholder="Nhập số phút (5 - 1440)..."
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="sched_start_input" className="admin-form-label">
                      Giờ bắt đầu (HH:MM) <span className="required-star">*</span>
                    </label>
                    <input
                      id="sched_start_input"
                      type="time"
                      className="admin-form-input font-tabular"
                      value={formStart}
                      onChange={(e) => {
                        setFormStart(e.target.value);
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="sched_end_input" className="admin-form-label">
                      Giờ kết thúc (HH:MM) <span className="required-star">*</span>
                    </label>
                    <input
                      id="sched_end_input"
                      type="time"
                      className="admin-form-input font-tabular"
                      value={formEnd}
                      onChange={(e) => {
                        setFormEnd(e.target.value);
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-actions-inline">
                  <button
                    type="submit"
                    className="admin-btn-secondary"
                    disabled={previewing || creating}
                  >
                    <RefreshCw size={15} className={previewing ? 'animate-spin' : ''} aria-hidden="true" />
                    <span>{previewing ? 'Đang kiểm tra...' : 'Kiểm tra trước lịch tạo'}</span>
                  </button>
                </div>
              </form>

              {/* PREVIEW RESULTS */}
              {previewError && (
                <div className="admin-form-error-box" role="alert" style={{ marginTop: '14px' }}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>{previewError}</span>
                </div>
              )}

              {previewData && (
                <div className="admin-schedule-preview-box">
                  <div className="preview-summary-header">
                    <span className="preview-sum-title">
                      Dự kiến tạo <strong>{previewData.total_proposed}</strong> lượt đọc ngày {formatDisplayDateVN(formDate)}
                    </span>
                    {previewData.conflict_count > 0 ? (
                      <span className="preview-conflict-badge text-danger">
                        <AlertCircle size={14} aria-hidden="true" /> Có {previewData.conflict_count} lượt bị trùng
                      </span>
                    ) : (
                      <span className="preview-conflict-badge text-success">
                        <CheckCircle2 size={14} aria-hidden="true" /> Không có trùng lặp
                      </span>
                    )}
                  </div>

                  {previewData.conflict_count > 0 && (
                    <div className="admin-conflict-alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>
                        Một số lượt đọc đã tồn tại trong ngày này. Vui lòng điều chỉnh lại khung giờ bắt đầu/kết thúc để tránh trùng lặp.
                      </span>
                    </div>
                  )}

                  <div className="preview-rounds-grid">
                    {previewData.rounds.map((pr, idx) => (
                      <div
                        key={idx}
                        className={`preview-round-chip ${pr.is_conflict ? 'chip-conflict' : ''}`}
                      >
                        <span className="chip-time font-tabular">{pr.scheduled_time_only}</span>
                        {pr.is_conflict && <span className="chip-conflict-tag">Đã có</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-primary"
                onClick={handleConfirmCreate}
                disabled={!previewData || previewData.conflict_count > 0 || creating}
              >
                <Check size={16} aria-hidden="true" />
                <span>
                  {creating
                    ? 'Đang tạo...'
                    : previewData
                    ? `Tạo ${previewData.total_proposed} lượt đọc`
                    : 'Tạo lịch đọc'}
                </span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleCloseModal}
                disabled={creating}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-sched-title">
          <div className="admin-modal-box modal-danger">
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <AlertTriangle size={20} className="text-danger" aria-hidden="true" />
                <h2 id="delete-sched-title" className="admin-modal-title">
                  {deleteTarget.type === 'round'
                    ? 'Xác nhận xóa lượt ghi'
                    : 'Xác nhận xóa toàn bộ lịch ngày'}
                </h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal-body">
              {deleteTarget.type === 'round' && deleteTarget.round && (
                <div>
                  <p className="admin-modal-confirm-text">
                    Bạn có chắc chắn muốn xóa lượt ghi lúc{' '}
                    <strong>{deleteTarget.round.scheduled_time_only}</strong> ngày{' '}
                    <strong>{formatDisplayDateVN(selectedDate)}</strong>?
                  </p>

                  {deleteTarget.round.progress.confirmed > 0 && (
                    <div className="admin-danger-warning-box">
                      <AlertCircle size={18} className="text-danger" aria-hidden="true" />
                      <div>
                        <strong>Cảnh báo mất dữ liệu:</strong>
                        <p>
                          Lượt ghi này đã có{' '}
                          <strong>{deleteTarget.round.progress.confirmed}</strong> chỉ số công tơ được ghi nhận. Việc xóa lượt ghi sẽ xóa vĩnh viễn toàn bộ các dữ liệu chỉ số này!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deleteTarget.type === 'day' && (
                <div>
                  <p className="admin-modal-confirm-text">
                    Bạn có chắc chắn muốn xóa toàn bộ{' '}
                    <strong>{deleteTarget.count}</strong> lượt ghi trong ngày{' '}
                    <strong>{formatDisplayDateVN(selectedDate)}</strong>?
                  </p>

                  {(deleteTarget.confirmedCount || 0) > 0 && (
                    <div className="admin-danger-warning-box">
                      <AlertCircle size={18} className="text-danger" aria-hidden="true" />
                      <div>
                        <strong>Cảnh báo mất dữ liệu nghiêm trọng:</strong>
                        <p>
                          Đã có tổng cộng{' '}
                          <strong>{deleteTarget.confirmedCount}</strong> chỉ số công tơ được ghi nhận trong ngày này. Thao tác này sẽ xóa toàn bộ các ca và dữ liệu đọc liên quan!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deleteError && (
                <div className="admin-form-error-box" role="alert" style={{ marginTop: '14px' }}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>{deleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
