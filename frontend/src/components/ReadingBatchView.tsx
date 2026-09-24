import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  History,
  Check,
} from 'lucide-react';
import {
  Meter,
  MeterDetailResponse,
  ReadingBatch,
  ReadingRound,
  TodayHourlySlot,
  User,
  UserRoundTaskItem,
  UserTasksResponse,
} from '../types';
import {
  getBatchRounds,
  getMeterDetail,
  getMyMeterTasks,
} from '../services/api';
import { AuthenticatedShell } from './AuthenticatedShell';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { EmptyState } from './ui/EmptyState';

interface ReadingBatchViewProps {
  user: User;
  onBackToHome: () => void;
  onSelectMeter: (meter: Meter, batch: ReadingBatch | null, round: ReadingRound | null) => void;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED';

const getMeterUnit = (meter: Meter): string => {
  const utility = meter.utility_type?.toUpperCase();
  if (utility === 'WATER') return 'm³';
  if (utility === 'ELECTRICITY') return 'kWh';
  return 'đơn vị';
};

const getDialogFocusableElements = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null && !element.closest('[aria-hidden="true"]'));
};

export const ReadingBatchView: React.FC<ReadingBatchViewProps> = ({
  user: _user,
  onBackToHome,
  onSelectMeter,
}) => {
  const [operations, setOperations] = useState<UserTasksResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Detail / History Modal State
  const [selectedDetailMeter, setSelectedDetailMeter] = useState<UserRoundTaskItem | null>(null);
  const [meterDetailData, setMeterDetailData] = useState<MeterDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [expandedTodayHistory, setExpandedTodayHistory] = useState<boolean>(false);
  const detailDialogRef = useRef<HTMLDivElement>(null);
  const restoreDetailFocusRef = useRef<HTMLElement | null>(null);

  // Secondary Schedule Inspection Modal
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleRounds, setScheduleRounds] = useState<ReadingRound[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const scheduleDialogRef = useRef<HTMLDivElement>(null);
  const restoreScheduleFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedDetailMeter || !detailDialogRef.current) return;
    restoreDetailFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detailDialogRef.current.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    return () => restoreDetailFocusRef.current?.focus();
  }, [Boolean(selectedDetailMeter)]);

  useEffect(() => {
    if (!showScheduleModal || !scheduleDialogRef.current) return;
    restoreScheduleFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scheduleDialogRef.current.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    return () => restoreScheduleFocusRef.current?.focus();
  }, [showScheduleModal]);

  const handleDialogKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    dialogRef: React.RefObject<HTMLDivElement>,
    closeDialog: () => void
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = getDialogFocusableElements(dialogRef.current);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      const data = await getMyMeterTasks(todayDateStr);
      setOperations(data);

      if (selectedDetailMeter) {
        const updatedItem = data.meters.find((m) => m.meter.id === selectedDetailMeter.meter.id);
        if (updatedItem) {
          setSelectedDetailMeter(updatedItem);
        } else {
          setSelectedDetailMeter(null);
          setMeterDetailData(null);
          setStaleNotice('Phân công của bạn đã thay đổi. Công tơ vừa chọn không còn thuộc phân công hiện tại.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách công việc của bạn.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenScheduleModal = async () => {
    if (!operations?.batch) return;
    setShowScheduleModal(true);
    setLoadingSchedule(true);
    try {
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      const roundsRes = await getBatchRounds(operations.batch.id, todayDateStr);
      setScheduleRounds(roundsRes.rounds);
    } catch {
      // ignore
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleOpenDetail = async (item: UserRoundTaskItem) => {
    setSelectedDetailMeter(item);
    setExpandedTodayHistory(false);
    setLoadingDetail(true);
    setMeterDetailData(null);
    try {
      const detail = await getMeterDetail(item.meter.id);
      setMeterDetailData(detail);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedDetailMeter(null);
    setMeterDetailData(null);
    setExpandedTodayHistory(false);
  };

  // Compute pending + review actionable count
  const pendingAndReviewCount = useMemo(() => {
    if (!operations) return 0;
    return operations.summary.pending + (operations.summary.review || 0);
  }, [operations]);

  // Filter physical meters based on search and current slot status
  const filteredMeters = useMemo(() => {
    if (!operations?.meters) return [];
    return operations.meters.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.meter.meter_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.meter.location && item.meter.location.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'PENDING') {
        matchStatus = item.current_status === 'PENDING' || item.current_status === 'REVIEW';
      } else if (statusFilter === 'CONFIRMED') {
        matchStatus = item.current_status === 'CONFIRMED';
      }

      return matchSearch && matchStatus;
    });
  }, [operations?.meters, searchQuery, statusFilter]);

  // Primary capture handler for current round
  const handleCaptureCurrentSlot = (meter: Meter) => {
    if (!operations?.current_round) return;
    onSelectMeter(meter, operations.batch, operations.current_round);
  };

  // Supplementary / Specific slot capture handler
  const handleCaptureSlot = (meter: Meter, slot: TodayHourlySlot) => {
    if (slot.timing_state === 'UPCOMING') return;
    const roundObj: ReadingRound = {
      id: slot.round_id,
      batch_id: operations?.batch?.id || '',
      scheduled_at: slot.scheduled_at,
      scheduled_local: slot.scheduled_local,
      scheduled_time_only: slot.scheduled_time_only,
      status: 'OPEN',
      scope_mode: operations?.current_round?.scope_mode,
      timing_state: slot.timing_state,
      progress: { total: 0, confirmed: 0, pending: 0, review: 0 },
    };
    onSelectMeter(meter, operations?.batch || null, roundObj);
  };

  return (
    <AuthenticatedShell
      screenTitle="Đo đếm điện năng"
      backLabel="Trang chủ"
      onBack={onBackToHome}
      rightAction={
        <button
          type="button"
          className="btn-header-refresh"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          aria-label="Làm mới dữ liệu"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* LOADING STATE */}
      {loading && !refreshing && (
        <LoadingState message="Đang tải danh sách công tơ và lượt ghi..." />
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <ErrorState
          title="Không thể tải dữ liệu"
          message={error}
          onRetry={() => loadData(true)}
        />
      )}

      {/* MAIN OPERATIONAL WORKLIST CONTENT */}
      {!loading && operations && (
        <div className="meter-operations-container">
          {/* LEVEL 1: CURRENT ROUND SUMMARY */}
          <section className="worklist-summary-card" aria-label="Tổng quan lượt ghi hiện tại">
            <div className="worklist-summary-header">
              <div className="worklist-round-col">
                <span className="worklist-summary-eyebrow">LƯỢT HIỆN TẠI</span>
                <div className="worklist-round-time-row">
                  <span className="worklist-round-time">
                    {operations.current_round ? operations.current_round.scheduled_time_only : '---'}
                  </span>
                  {operations.current_round ? (
                    <span className="worklist-round-status status-open">Đang mở</span>
                  ) : (
                    <span className="worklist-round-status status-closed">Chưa có lượt</span>
                  )}
                  {operations.global_round_total !== null && operations.global_round_total !== undefined && (
                    <span className="worklist-global-scope-pill">Lượt này có {operations.global_round_total} công tơ</span>
                  )}
                </div>
              </div>

              <div className="worklist-date-col">
                <span className="worklist-date-text">{operations.date_formatted}</span>
              </div>
            </div>

            {/* Assignment Context: Assigned Zones and Roles */}
            {operations.assignment_context?.assigned_zones?.length > 0 && (
              <div className="worklist-assignment-bar" aria-label="Khu vực được phân công">
                <span className="assignment-bar-label">Khu vực:</span>
                {operations.assignment_context.assigned_zones.map((z) => (
                  <span key={z.zone_id} className="assignment-zone-chip">
                    <strong>{z.zone_name}</strong>
                    <span className={`task-role-badge role-${z.assignment_role.toLowerCase()}`}>
                      {z.assignment_role === 'PRIMARY' ? 'Chính' : 'Hỗ trợ'}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Personal Progress Bar & Personal Count */}
            <div className="worklist-progress-section">
              <div className="worklist-progress-label-row">
                <span className="worklist-progress-completed-text">
                  <strong>{operations.summary.confirmed_current ?? operations.summary.confirmed}</strong>/{operations.summary.assigned_total} công tơ được giao đã ghi
                  <span className="sr-only"> ({operations.summary.confirmed_current ?? operations.summary.confirmed} công tơ trong lượt đã ghi)</span>
                </span>
                {operations.summary.percent_complete > 0 && (
                  <span className="worklist-progress-percent">{operations.summary.percent_complete}%</span>
                )}
              </div>
              <div className="worklist-progress-track" role="progressbar" aria-label="Tiến độ lượt ghi" aria-valuenow={operations.summary.percent_complete} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="worklist-progress-fill"
                  style={{ width: `${operations.summary.percent_complete}%` }}
                />
              </div>
              <div className="worklist-progress-breakdown" aria-label="Trạng thái công việc của bạn">
                <span><strong>{operations.summary.confirmed_current ?? operations.summary.confirmed}</strong> đã ghi</span>
                <span><strong>{operations.summary.review_current ?? operations.summary.review}</strong> cần kiểm tra</span>
                <span><strong>{operations.summary.pending_current ?? operations.summary.pending}</strong> chưa ghi</span>
              </div>
            </div>

            {/* Bottom Info: Remaining count & Hourly schedule link */}
            <div className="worklist-summary-footer">
              <span className="worklist-remaining-text">
                <strong>{pendingAndReviewCount}</strong> cần xử lý
              </span>
              <button
                type="button"
                className="worklist-schedule-link"
                onClick={handleOpenScheduleModal}
                aria-label="Xem lịch ghi theo khung giờ"
              >
                <span>Lịch theo giờ</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </section>

          {/* LEVEL 2A: SEARCH (NORMAL DOCUMENT FLOW - SCROLLS AWAY) */}
          <div className="worklist-search-wrap">
            <Search size={17} className="worklist-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="worklist-search-input"
              placeholder="Tìm công tơ, trạm hoặc vị trí"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm công tơ"
            />
            {searchQuery && (
              <button
                type="button"
                className="worklist-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* LEVEL 2B: SEGMENTED FILTER (STICKY BENEATH HEADER) */}
          <div className="worklist-filter-sticky-bar">
            <div className="worklist-segmented-control" role="tablist" aria-label="Bộ lọc trạng thái công tơ">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'ALL'}
                className={`worklist-segment-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                <span>Tất cả</span>
                <span className="segment-count">{operations.summary.assigned_total}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'PENDING'}
                className={`worklist-segment-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                <span>Cần xử lý</span>
                <span className="segment-count">{pendingAndReviewCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'CONFIRMED'}
                className={`worklist-segment-btn ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                <span>Đã ghi</span>
                <span className="segment-count">{operations.summary.confirmed}</span>
              </button>
            </div>
          </div>

          {/* Stale Assignment Notice */}
          {staleNotice && (
            <div className="stale-notice-banner" role="alert">
              <span>{staleNotice}</span>
              <button
                type="button"
                onClick={() => setStaleNotice(null)}
                aria-label="Đóng thông báo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* LEVEL 3: METER WORKLIST */}
          <div className="worklist-meters-stack">
            {filteredMeters.length === 0 ? (
              operations.meters.length === 0 ? (
                operations.empty_reason === 'NO_ROUND' ? (
                  <EmptyState
                    title="Hiện chưa có lượt ghi."
                    message="Hệ thống chưa có lượt ghi chỉ số đang mở trong ngày hôm nay."
                  />
                ) : operations.empty_reason === 'NO_ASSIGNMENT' ? (
                  <EmptyState
                    title="Bạn chưa được phân khu tác nghiệp cho lượt này."
                    message="Vui lòng liên hệ điều độ hoặc quản lý ca để được phân công khu vực."
                  />
                ) : operations.empty_reason === 'NO_METERS_IN_ZONE' ? (
                  <EmptyState
                    title="Khu vực được phân công không có công tơ trong lượt này."
                    message="Các khu vực bạn phụ trách không có công tơ nào trong lịch ghi của lượt hiện tại."
                  />
                ) : operations.empty_reason === 'ALL_TASKS_COMPLETE' ? (
                  <EmptyState
                    title="Bạn đã hoàn thành các công tơ được giao trong lượt này."
                    message="Tất cả công tơ trong khu vực phân công đã được ghi nhận thành công."
                  />
                ) : (
                  <EmptyState
                    title="Không có công việc nào"
                    message="Không tìm thấy công tơ nào được giao cho bạn trong lượt này."
                  />
                )
              ) : (
                <EmptyState
                  title={searchQuery ? 'Không tìm thấy công tơ phù hợp' : (statusFilter === 'PENDING' ? 'Bạn đã hoàn thành các công tơ được giao trong lượt này.' : 'Không có công tơ nào trong mục này')}
                  message={searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Tất cả công tơ trong danh sách đã được hoàn tất hoặc không khớp bộ lọc.'}
                />
              )
            ) : (
              filteredMeters.map((item) => {
                const isCurrentPending = item.current_status === 'PENDING';
                const isCurrentReview = item.current_status === 'REVIEW';
                const isCurrentConfirmed = item.current_status === 'CONFIRMED';
                const hasCurrentRound = Boolean(operations.current_round);
                const currRoundTime = operations.current_round?.scheduled_time_only || '---';
                const meterUnit = getMeterUnit(item.meter);
                const meterAvailable = !item.meter_availability || item.meter_availability === 'AVAILABLE';

                return (
                  <article
                    key={item.meter.id}
                    className={`worklist-meter-card ${
                      isCurrentConfirmed
                        ? 'card-state-confirmed'
                        : isCurrentReview
                        ? 'card-state-review'
                        : 'card-state-pending'
                    }`}
                  >
                    {/* Card Clickable Body -> opens Detail */}
                    <div
                      className="worklist-card-body-clickable"
                      onClick={() => handleOpenDetail(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenDetail(item);
                        }
                      }}
                      aria-label={`Xem chi tiết công tơ ${item.meter.meter_code} - ${item.meter.name}`}
                    >
                      {/* 1. Identity Row: Code, Type, Role Badge, Zone Tag, Chevron */}
                      <div className="meter-card-identity-row">
                        <div className="meter-identity-left">
                          <span className="meter-code-text">{item.meter.meter_code}</span>
                          <span className="meter-identity-divider">&bull;</span>
                          <span className="meter-type-text">
                            {item.meter.meter_type?.toUpperCase() === 'LCD' ? 'LCD' : 'Cơ'}
                          </span>
                          <span className={`task-card-role-badge role-${item.assignment_role.toLowerCase()}`}>
                            {item.assignment_role === 'PRIMARY' ? 'Chính' : 'Hỗ trợ'}
                          </span>
                          {item.zone_name_snapshot && (
                            <span className="meter-card-zone-tag">{item.zone_name_snapshot}</span>
                          )}
                        </div>
                        <ChevronRight size={18} className="meter-detail-chevron" aria-hidden="true" />
                      </div>

                      {/* 2. Name & Location */}
                      <div className="meter-name-location-group">
                        <h3 className="meter-card-name">{item.meter.name}</h3>
                        {item.meter.location && (
                          <div className="meter-card-location">
                            <MapPin size={12} className="meter-loc-icon" aria-hidden="true" />
                            <span>{item.meter.location}</span>
                          </div>
                        )}
                      </div>

                      {/* 3. Status-First Line */}
                      <div className="meter-card-status-line">
                        {hasCurrentRound ? (
                          isCurrentConfirmed ? (
                            <div className="status-indicator-confirmed">
                              <CheckCircle2 size={15} strokeWidth={2.2} />
                              <span>Đã ghi &bull; {currRoundTime}</span>
                            </div>
                          ) : isCurrentReview ? (
                            <div className="status-indicator-review">
                              <AlertTriangle size={15} strokeWidth={2.2} />
                              <span>Cần kiểm tra &bull; {currRoundTime}</span>
                            </div>
                          ) : (
                            <div className="status-indicator-pending">
                              <Clock size={15} strokeWidth={2.2} />
                              <span>Chưa ghi &bull; {currRoundTime}</span>
                            </div>
                          )
                        ) : (
                          <div className="status-indicator-neutral">
                            <span>Chưa có lượt mở</span>
                          </div>
                        )}
                      </div>

                      {/* 4. Confirmed Value (if confirmed in current round) or Latest Value (if pending/review) */}
                      {isCurrentConfirmed ? (
                        <div className="meter-confirmed-value-row">
                          <span className="meter-reading-val tabular-nums">{item.current_reading}</span>
                          <span className="meter-reading-unit">{meterUnit}</span>
                        </div>
                      ) : (
                        item.latest_confirmed && (
                          <div className="meter-latest-reading-row">
                            <span className="meter-latest-label">Gần nhất:</span>
                            <span className="meter-latest-val tabular-nums">
                              <strong>{item.latest_confirmed.reading} {meterUnit}</strong> &bull; Lượt {item.latest_confirmed.round_time}
                            </span>
                          </div>
                        )
                      )}

                      {/* Recorded By Provenance */}
                      {isCurrentConfirmed && item.recorded_by && (
                        <div className="meter-card-recorded-by">
                          Người ghi: <strong>{item.recorded_by.full_name}</strong> ({item.recorded_by.employee_code})
                        </div>
                      )}

                      {/* 5. Missed Alert Badge (Compact Pill, only if missed_count > 0) */}
                      {item.missed_count > 0 && (
                        <div className="meter-missed-pill" role="status">
                          <AlertTriangle size={11} strokeWidth={2.2} />
                          <span>{item.missed_count} lượt trước chưa ghi</span>
                        </div>
                      )}
                    </div>

                    {/* 6. Primary Action (Separate explicit button, outside clickable body) */}
                    {hasCurrentRound && (isCurrentPending || isCurrentReview) && (
                      <div className="meter-card-action-wrap">
                        {meterAvailable ? <button
                          type="button"
                          className="btn-worklist-capture"
                          onClick={() => handleCaptureCurrentSlot(item.meter)}
                          aria-label={`Ghi chỉ số cho công tơ ${item.meter.meter_code}`}
                        >
                          <Camera size={18} strokeWidth={2.2} />
                          <span>{isCurrentReview ? 'Ghi lại' : 'Ghi chỉ số'}</span>
                        </button> : <span className="worklist-meter-unavailable" role="status">
                          Công tơ {item.meter_availability === 'RETIRED' ? 'đã ngừng sử dụng' : item.meter_availability === 'MISSING' ? 'không còn trong danh mục' : 'đang tạm ngưng'}; vẫn giữ trong lượt đã lập
                        </span>}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          5. SIMPLIFIED METER DETAIL MODAL
          ============================================================ */}
      {selectedDetailMeter && (
        <div className="modal-overlay" onClick={handleCloseDetail} onKeyDown={(event) => handleDialogKeyDown(event, detailDialogRef, handleCloseDetail)} role="dialog" aria-modal="true" aria-labelledby="reading-meter-detail-title">
          <div className="meter-detail-modal-card" ref={detailDialogRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-code-row">
                  <span className="modal-code-badge">{selectedDetailMeter.meter.meter_code}</span>
                  {selectedDetailMeter.meter.meter_type && (
                    <span className="smc-type-tag">
                      {selectedDetailMeter.meter.meter_type.toUpperCase() === 'LCD' ? 'Điện tử (LCD)' : 'Cơ (Mechanical)'}
                    </span>
                  )}
                  <span className={`task-card-role-badge role-${selectedDetailMeter.assignment_role.toLowerCase()}`}>
                    {selectedDetailMeter.assignment_role === 'PRIMARY' ? 'Chính' : 'Hỗ trợ'}
                  </span>
                  {selectedDetailMeter.zone_name_snapshot && (
                    <span className="meter-card-zone-tag">{selectedDetailMeter.zone_name_snapshot}</span>
                  )}
                </div>
                <h3 id="reading-meter-detail-title" className="modal-name">{selectedDetailMeter.meter.name}</h3>
                {selectedDetailMeter.meter.location && (
                  <div className="modal-loc-row">
                    <MapPin size={13} />
                    <span>{selectedDetailMeter.meter.location}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseDetail}
                aria-label="Đóng chi tiết"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable">
              {/* 1. CURRENT SLOT CARD */}
              {operations?.current_round && (
                <div className="detail-current-slot-card">
                  <div className="dc-header">
                    <span className="dc-label">LƯỢT HIỆN TẠI</span>
                    <span className="dc-time">{operations.current_round.scheduled_time_only}</span>
                  </div>
                  <div className="dc-content">
                    {selectedDetailMeter.current_status === 'CONFIRMED' ? (
                      <div className="dc-confirmed-box">
                        <CheckCircle2 size={20} className="dc-check-icon" />
                        <div className="dc-text-wrap">
                          <span className="dc-reading-num">{selectedDetailMeter.current_reading} {getMeterUnit(selectedDetailMeter.meter)}</span>
                          <span className="dc-sub">
                            Đã ghi nhận thành công
                            {selectedDetailMeter.current_recorded_local && ` (${selectedDetailMeter.current_recorded_local})`}
                          </span>
                          {selectedDetailMeter.recorded_by && (
                            <span className="dc-sub" style={{ display: 'block', marginTop: 3 }}>
                              Người ghi: <strong>{selectedDetailMeter.recorded_by.full_name}</strong> ({selectedDetailMeter.recorded_by.employee_code})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : selectedDetailMeter.current_status === 'REVIEW' ? (
                      <div className="dc-review-box">
                        <AlertTriangle size={20} className="dc-alert-icon" />
                        <div className="dc-text-wrap">
                          <span className="dc-reading-num">Cần kiểm tra lại</span>
                          <span className="dc-sub">Hình ảnh mờ hoặc chỉ số bất thường</span>
                        </div>
                        {(!selectedDetailMeter.meter_availability || selectedDetailMeter.meter_availability === 'AVAILABLE') ? <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            handleCloseDetail();
                            handleCaptureCurrentSlot(selectedDetailMeter.meter);
                          }}
                        >
                          <Camera size={14} />
                          <span>Chụp lại</span>
                        </button> : <span className="worklist-meter-unavailable">Công tơ không còn khả dụng; kết quả lịch sử vẫn được giữ.</span>}
                      </div>
                    ) : (
                      <div className="dc-pending-box">
                        <div className="dc-text-wrap">
                          <span className="dc-pending-title">Chưa ghi chỉ số cho lượt này</span>
                          <span className="dc-sub">Vui lòng chụp ảnh mặt số công tơ</span>
                        </div>
                        {(!selectedDetailMeter.meter_availability || selectedDetailMeter.meter_availability === 'AVAILABLE') ? <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            handleCloseDetail();
                            handleCaptureCurrentSlot(selectedDetailMeter.meter);
                          }}
                        >
                          <Camera size={16} />
                          <span>Ghi chỉ số ngay</span>
                        </button> : <span className="worklist-meter-unavailable">Công tơ không còn khả dụng; kết quả lịch sử vẫn được giữ.</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. TODAY'S HOURLY HISTORY (Collapsed by default, showing 2-3 recent slots) */}
              <div className="detail-section">
                <div className="detail-section-header">
                  <Calendar size={15} />
                  <h4>
                    {expandedTodayHistory
                      ? `LỊCH SỬ HÔM NAY (${operations?.date_formatted})`
                      : 'GẦN ĐÂY'}
                  </h4>
                </div>

                <div className="today-slots-history-stack">
                  {selectedDetailMeter.today_slots && selectedDetailMeter.today_slots.length > 0 ? (
                    (() => {
                      const allTodayReversed = [...selectedDetailMeter.today_slots].reverse();
                      const slotsToDisplay = expandedTodayHistory
                        ? allTodayReversed
                        : allTodayReversed.slice(0, 3);

                      return (
                        <>
                          {slotsToDisplay.map((slot) => {
                            const isConfirmed = slot.status === 'CONFIRMED';
                            const isReview = slot.status === 'REVIEW';
                            const isPast = slot.timing_state === 'PAST';
                            const isUpcoming = slot.timing_state === 'UPCOMING';
                            const isCurrent = slot.timing_state === 'CURRENT';

                            return (
                              <div
                                key={slot.round_id}
                                className={`today-slot-item ${isConfirmed ? 'item-confirmed' : isReview ? 'item-review' : isCurrent ? 'item-current' : ''}`}
                              >
                                <div className="ts-time-col">
                                  <span className="ts-time-text">{slot.scheduled_time_only}</span>
                                  {isCurrent && <span className="ts-current-badge">Hiện tại</span>}
                                </div>

                                <div className="ts-details-col">
                                  {isConfirmed ? (
                                    <div className="ts-reading-wrap">
                                      <span className="ts-reading-val">{slot.reading} {getMeterUnit(selectedDetailMeter.meter)}</span>
                                      <div className="ts-meta-line">
                                        <span>{slot.formatted_recorded_at}</span>
                                        {slot.confirmation_source === 'USER_CORRECTED' && (
                                          <span className="ts-corrected-badge">Đã sửa tay</span>
                                        )}
                                        {slot.confirmation_source === 'MANUAL_ENTRY' && (
                                          <span className="ts-corrected-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>Nhập thủ công</span>
                                        )}
                                        {slot.recorded_by && (
                                          <span>&bull; {slot.recorded_by.full_name}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : isReview ? (
                                    <div className="ts-reading-wrap">
                                      <span className="ts-review-tag">CẦN KIỂM TRA</span>
                                      <span className="ts-meta-line">Ghi nhận cần đối chiếu</span>
                                    </div>
                                  ) : isUpcoming ? (
                                    <span className="ts-upcoming-text">Chưa đến giờ ghi</span>
                                  ) : (
                                    <span className="ts-missed-text">Chưa ghi nhận</span>
                                  )}
                                </div>

                                <div className="ts-action-col">
                                  {isConfirmed ? (
                                    <span className="ts-badge-done">
                                      <Check size={14} />
                                    </span>
                                  ) : (isPast || isCurrent) && (!selectedDetailMeter.meter_availability || selectedDetailMeter.meter_availability === 'AVAILABLE') ? (
                                    <button
                                      type="button"
                                      className="btn-supplementary-capture"
                                      onClick={() => {
                                        handleCloseDetail();
                                        handleCaptureSlot(selectedDetailMeter.meter, slot);
                                      }}
                                      aria-label={`Ghi bổ sung cho lượt ${slot.scheduled_time_only}`}
                                    >
                                      <Camera size={13} />
                                      <span>{isPast ? 'Ghi bổ sung' : 'Ghi chỉ số'}</span>
                                    </button>
                                  ) : (
                                    <span className="ts-badge-upcoming">Sắp tới</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Expand / Collapse Button */}
                          {selectedDetailMeter.today_slots.length > 3 && (
                            <button
                              type="button"
                              className="btn-expand-history"
                              onClick={() => setExpandedTodayHistory(!expandedTodayHistory)}
                            >
                              {expandedTodayHistory ? (
                                <>
                                  <ChevronUp size={15} />
                                  <span>Thu gọn</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={15} />
                                  <span>Xem toàn bộ lịch hôm nay ({selectedDetailMeter.today_slots.length} lượt)</span>
                                </>
                              )}
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <p className="detail-empty-text">Chưa có khung giờ nào được lập cho hôm nay.</p>
                  )}
                </div>
              </div>

              {/* 3. OVERALL AUDIT HISTORY */}
              <div className="detail-section">
                <div className="detail-section-header">
                  <History size={15} />
                  <h4>LỊCH SỬ CÁC ĐỢT TRƯỚC</h4>
                </div>

                {loadingDetail ? (
                  <div className="loading-container" style={{ padding: '20px' }}>
                    <div className="maritime-spinner-sm" />
                    <p className="loading-text" style={{ fontSize: '12px' }}>Đang tải lịch sử...</p>
                  </div>
                ) : meterDetailData && meterDetailData.history.length > 0 ? (
                  <div className="all-history-stack">
                    {meterDetailData.history.map((h) => (
                      <div key={h.id} className="history-audit-card">
                        <div className="ha-top-row">
                          <span className="ha-reading">{h.reading ? `${h.reading} kWh` : 'Cần kiểm tra'}</span>
                          <span className={`ha-status-badge ${h.status === 'CONFIRMED' ? 'ha-confirmed' : 'ha-review'}`}>
                            {h.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : 'CẦN KT'}
                          </span>
                        </div>
                        <div className="ha-meta-row">
                          <span>{h.batch_name}</span>
                          <span>&bull; {h.formatted_time}</span>
                          <span>&bull; {h.recorded_by?.full_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="detail-empty-text">Chưa có lịch sử các đợt trước.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          6. SCHEDULE INSPECTION MODAL (SECONDARY)
          ============================================================ */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)} onKeyDown={(event) => handleDialogKeyDown(event, scheduleDialogRef, () => setShowScheduleModal(false))} role="dialog" aria-modal="true" aria-labelledby="reading-schedule-title">
          <div className="schedule-inspection-modal-card" ref={scheduleDialogRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 id="reading-schedule-title" className="modal-name">Lịch ghi theo giờ ({operations?.date_formatted})</h3>
                <p className="modal-subtitle">Đợt: {operations?.batch?.name || '---'}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowScheduleModal(false)}
                aria-label="Đóng lịch ghi theo giờ"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable">
              {loadingSchedule ? (
                <div className="loading-container" style={{ padding: '30px' }}>
                  <div className="maritime-spinner" />
                </div>
              ) : scheduleRounds.length === 0 ? (
                <p className="detail-empty-text">Không có lượt ghi nào.</p>
              ) : (
                <div className="rounds-list-stack">
                  {scheduleRounds.map((r, idx) => (
                    <div
                      key={r.id}
                      className={`round-schedule-card ${r.timing_state === 'CURRENT' ? 'is-current' : ''}`}
                    >
                      <div className="round-time-col">
                        <span className="round-time-text">{r.scheduled_time_only}</span>
                        <span className="round-order-text">Lượt {idx + 1}</span>
                      </div>
                      <div className="round-center-col">
                        <div className="round-badge-row">
                          <span className={`round-status-pill pill-${r.timing_state.toLowerCase()}`}>
                            {r.timing_state === 'CURRENT'
                              ? 'Lượt hiện tại'
                              : r.timing_state === 'PAST'
                              ? 'Đã qua'
                              : 'Sắp tới'}
                          </span>
                        </div>
                        <div className="round-progress-summary">
                          <span>
                            {r.progress.confirmed}/{r.progress.total} công tơ ({r.progress.total > 0 ? Math.round((r.progress.confirmed / r.progress.total) * 100) : 0}%)
                          </span>
                          {r.progress.review > 0 && (
                            <span className="review-count-pill">
                              <AlertTriangle size={10} />
                              {r.progress.review} KT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthenticatedShell>
  );
};
