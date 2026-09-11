import React, { useEffect, useState } from 'react';
import {
  MapPin,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ChevronUp,
  Map,
  List,
} from 'lucide-react';
import { AdminDashboardResponse } from '../../types';
import { getAdminDashboard } from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { VnDatePicker } from '../ui/VnDatePicker';
import { MapOperationsPage } from '../../features/map-operations/MapOperationsPage';

export const formatDisplayDateVN = (isoDate: string): string => {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return isoDate;
};

export interface AdminDashboardProps {
  onInspectReading?: (readingId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onInspectReading }) => {
  const [viewMode, setViewMode] = useState<'map' | 'legacy'>(() => {
    try {
      // Clear any stale legacy setting so user lands directly on map-first
      localStorage.removeItem('csg_admin_dashboard_view_mode');
      const saved = sessionStorage.getItem('csg_admin_dashboard_view_mode');
      if (saved === 'legacy' || saved === 'map') return saved;
    } catch {}
    return 'map';
  });

  const handleSetViewMode = (mode: 'map' | 'legacy') => {
    setViewMode(mode);
    try {
      sessionStorage.setItem('csg_admin_dashboard_view_mode', mode);
    } catch {}
  };

  const getTodayLocal = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_dashboard_date') || todayStr;
    } catch {
      return todayStr;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('admin_dashboard_date', selectedDate);
    } catch {}
  }, [selectedDate]);

  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UX state: Progress segmented control & expansion toggles
  const [progressMode, setProgressMode] = useState<'round' | 'location'>('round');
  const [showAllExceptions, setShowAllExceptions] = useState<boolean>(false);
  const [showAllLocations, setShowAllLocations] = useState<boolean>(false);

  const loadData = async (dateStr: string, locFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboard(
        dateStr,
        locFilter === 'ALL' ? undefined : locFilter
      );
      setDashboardData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu điều hành.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate, selectedLocation);
  }, [selectedDate, selectedLocation]);

  const exceptions = dashboardData?.exceptions || [];
  const displayedExceptions = showAllExceptions ? exceptions : exceptions.slice(0, 6);

  const locationProgressList = dashboardData?.location_progress || [];
  const displayedLocations = showAllLocations ? locationProgressList : locationProgressList.slice(0, 5);

  const isFutureSchedule = dashboardData?.kpis.current_round_status === 'Lịch dự kiến';

  if (viewMode === 'map') {
    return (
      <MapOperationsPage
        onInspectReading={onInspectReading}
        onSwitchToLegacy={() => handleSetViewMode('legacy')}
      />
    );
  }

  return (
    <div className="admin-page-container">
      {/* 1. PAGE HEADER */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Tổng quan vận hành</h1>
          <p className="admin-page-subtitle">Theo dõi tiến độ và các ngoại lệ cần xử lý</p>
        </div>

        {/* TOP FILTER TOOLBAR */}
        <div className="admin-header-controls" role="toolbar" aria-label="Bộ lọc tổng quan">
          {/* VIEW MODE TOGGLE [Bản đồ] [Danh sách] */}
          <div className="sgp-view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className="sgp-mode-btn"
              onClick={() => handleSetViewMode('map')}
            >
              <Map size={15} />
              <span>Bản đồ</span>
            </button>
            <button
              type="button"
              className="sgp-mode-btn active"
              onClick={() => handleSetViewMode('legacy')}
            >
              <List size={15} />
              <span>Danh sách</span>
            </button>
          </div>

          <div className="admin-filter-group">
            {/* Date Filter Input */}
            <VnDatePicker
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              showToday={true}
              todayDateStr={todayStr}
              ariaLabel="Chọn ngày tác nghiệp"
            />

            {/* Location Select */}
            <div className="admin-select-wrap">
              <MapPin size={15} className="admin-filter-icon" aria-hidden="true" />
              <select
                className="admin-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                aria-label="Lọc theo khu vực"
              >
                <option value="ALL">Tất cả khu vực</option>
                {dashboardData?.available_locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tertiary Refresh Button */}
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={() => loadData(selectedDate, selectedLocation)}
            disabled={loading}
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Đang tổng hợp dữ liệu vận hành..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải bảng điều hành"
          message={error}
          onRetry={() => loadData(selectedDate, selectedLocation)}
        />
      ) : dashboardData ? (
        <div className="admin-dashboard-content">
          {/* 2. CURRENT OPERATIONAL STATUS: 4 COMPACT METRIC CARDS */}
          <section className="admin-kpi-grid" aria-label="Chỉ số vận hành chính">
            {/* Card 1: Current Round */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">LƯỢT HIỆN TẠI</span>
                <Clock size={15} className="admin-kpi-icon icon-brand" aria-hidden="true" />
              </div>
              <div className="admin-kpi-value-row">
                <span className="admin-kpi-value font-tabular">
                  {dashboardData.kpis.current_round_time || '—'}
                </span>
                {dashboardData.kpis.current_round_status && (
                  <span
                    className={`admin-kpi-badge ${
                      dashboardData.kpis.current_round_status === 'Đang mở'
                        ? 'badge-open'
                        : dashboardData.kpis.current_round_status === 'Lịch dự kiến'
                        ? 'badge-upcoming'
                        : 'badge-closed'
                    }`}
                  >
                    {dashboardData.kpis.current_round_status}
                  </span>
                )}
              </div>
              <span className="admin-kpi-sub">
                {dashboardData.batch ? dashboardData.batch.name : 'Chưa có đợt ghi'}
              </span>
            </div>

            {/* Card 2: Completion */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">HOÀN THÀNH</span>
                <CheckCircle2 size={15} className="admin-kpi-icon icon-success" aria-hidden="true" />
              </div>
              <div className="admin-kpi-value-row">
                <span className="admin-kpi-value font-tabular">
                  {dashboardData.kpis.confirmed_slots}{' '}
                  <span className="admin-kpi-denom">
                    / {isFutureSchedule ? dashboardData.kpis.total_expected_slots : dashboardData.kpis.due_slots}
                  </span>
                </span>
                <span className="admin-kpi-badge badge-pct font-tabular">
                  {dashboardData.kpis.completion_percent}%
                </span>
              </div>
              <span className="admin-kpi-sub">
                {isFutureSchedule
                  ? 'Lịch dự kiến'
                  : dashboardData.kpis.total_expected_slots > dashboardData.kpis.due_slots
                  ? `(${dashboardData.kpis.total_expected_slots} lượt cả ngày)`
                  : 'Đến khung giờ hiện tại'}
              </span>
            </div>

            {/* Card 3: Actionable / Chưa hoàn tất */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">CHƯA HOÀN TẤT</span>
                <AlertTriangle size={15} className="admin-kpi-icon icon-warning" aria-hidden="true" />
              </div>
              <div className="admin-kpi-value-row">
                <span
                  className={`admin-kpi-value font-tabular ${
                    dashboardData.kpis.actionable_count > 0 ? 'text-warning' : ''
                  }`}
                >
                  {dashboardData.kpis.actionable_count}
                </span>
                <span className="admin-kpi-unit">lượt</span>
              </div>
              <span className="admin-kpi-sub">
                {isFutureSchedule ? 'Chưa đến hạn tác nghiệp' : 'Chưa ghi hoặc cần kiểm tra'}
              </span>
            </div>

            {/* Card 4: Review Count / Cần kiểm tra */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">CẦN KIỂM TRA</span>
                <AlertTriangle size={15} className="admin-kpi-icon icon-amber" aria-hidden="true" />
              </div>
              <div className="admin-kpi-value-row">
                <span
                  className={`admin-kpi-value font-tabular ${
                    dashboardData.kpis.review_count > 0 ? 'text-amber' : ''
                  }`}
                >
                  {dashboardData.kpis.review_count}
                </span>
                <span className="admin-kpi-unit">công tơ</span>
              </div>
              <span className="admin-kpi-sub">Trạng thái REVIEW cần đối chiếu</span>
            </div>
          </section>

          {/* 3. PRIMARY OPERATIONAL GRID: EXCEPTIONS (~58%) + PROGRESS (~42%) */}
          <div className="admin-dashboard-two-col">
            {/* Column 1: Exception-First Content (Cần chú ý) */}
            <section className="admin-surface-card" aria-label="Danh sách cần chú ý">
              <div className="admin-card-header">
                <div className="admin-card-title-group">
                  <AlertTriangle size={16} className="text-amber" aria-hidden="true" />
                  <h2 className="admin-card-title">Cần chú ý</h2>
                </div>
                <span className="admin-card-badge badge-warning font-tabular">
                  {exceptions.length} ngoại lệ
                </span>
              </div>

              {exceptions.length === 0 ? (
                <div className="admin-empty-exceptions">
                  <CheckCircle2 size={24} className="text-success" aria-hidden="true" />
                  <p className="admin-empty-text">Không có ngoại lệ cần xử lý</p>
                  <span className="admin-empty-sub">
                    {isFutureSchedule
                      ? 'Các khung giờ trong ngày chưa đến hạn tác nghiệp.'
                      : 'Tất cả các lượt đến hạn đã được xác nhận đầy đủ hoặc đang trong ca làm việc.'}
                  </span>
                </div>
              ) : (
                <div className="admin-exceptions-wrapper">
                  <div className="admin-table-container">
                    <table className="admin-table admin-table-compact" aria-label="Bảng ngoại lệ cần xử lý">
                      <thead>
                        <tr>
                          <th scope="col">Mã công tơ</th>
                          <th scope="col">Tên / Vị trí</th>
                          <th scope="col">Khung giờ</th>
                          <th scope="col">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedExceptions.map((exc) => (
                          <tr key={`${exc.meter_id}-${exc.round_id}`}>
                            <td className="font-mono font-bold text-brand font-tabular">
                              {exc.meter_code}
                            </td>
                            <td>
                              <div className="admin-meter-loc-cell">
                                <span className="admin-meter-name-text">{exc.meter_name}</span>
                                <span className="admin-meter-loc-sub">{exc.location}</span>
                              </div>
                            </td>
                            <td>
                              <span className="font-mono font-tabular text-sm font-semibold">
                                {exc.scheduled_time}
                              </span>
                            </td>
                            <td>
                              <div className="admin-exception-action-cell">
                                {exc.exception_state === 'REVIEW' ? (
                                  <>
                                    <span className="admin-badge badge-review font-tabular">
                                      <AlertTriangle size={11} aria-hidden="true" /> Cần kiểm tra
                                    </span>
                                    {exc.reading_id && onInspectReading && (
                                      <button
                                        type="button"
                                        className="admin-table-inspect-btn"
                                        onClick={() => onInspectReading(exc.reading_id!)}
                                        title={`Kiểm tra bản ghi ${exc.meter_code} lúc ${exc.scheduled_time}`}
                                      >
                                        <span>Kiểm tra</span>
                                        <ChevronRight size={13} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="admin-badge badge-missing-subtle font-tabular">
                                    <Clock size={11} aria-hidden="true" /> Chưa ghi
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {exceptions.length > 6 && (
                    <div className="admin-card-expand-footer">
                      <button
                        type="button"
                        className="admin-expand-link"
                        onClick={() => setShowAllExceptions((prev) => !prev)}
                        aria-expanded={showAllExceptions}
                      >
                        {showAllExceptions ? (
                          <>
                            <span>Thu gọn danh sách</span>
                            <ChevronUp size={14} aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            <span>Xem tất cả {exceptions.length} ngoại lệ</span>
                            <ChevronRight size={14} aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Column 2: Progress (Tiến độ - Segmented Switch) */}
            <section className="admin-surface-card" aria-label="Tiến độ thực hiện">
              <div className="admin-card-header">
                <div className="admin-card-title-group">
                  <Clock size={16} aria-hidden="true" />
                  <h2 className="admin-card-title">Tiến độ</h2>
                </div>

                {/* Segmented Control */}
                <div className="admin-segmented-control" role="group" aria-label="Chế độ xem tiến độ">
                  <button
                    type="button"
                    className={`admin-segment-btn ${progressMode === 'round' ? 'active' : ''}`}
                    onClick={() => setProgressMode('round')}
                    aria-pressed={progressMode === 'round'}
                  >
                    Theo lượt
                  </button>
                  <button
                    type="button"
                    className={`admin-segment-btn ${progressMode === 'location' ? 'active' : ''}`}
                    onClick={() => setProgressMode('location')}
                    aria-pressed={progressMode === 'location'}
                  >
                    Theo khu vực
                  </button>
                </div>
              </div>

              {/* View 1: Progress by Round */}
              {progressMode === 'round' && (
                <div className="admin-progress-container">
                  {dashboardData.round_progress.length === 0 ? (
                    <p className="admin-empty-inline">Chưa có lịch ghi cho ngày này.</p>
                  ) : (
                    <div className="admin-round-progress-list">
                      {dashboardData.round_progress.map((rp) => {
                        const isCurrent = rp.timing_state === 'CURRENT';
                        const isUpcoming = rp.timing_state === 'UPCOMING';

                        return (
                          <div
                            key={rp.round_id}
                            className={`admin-round-row-v2 ${
                              isCurrent ? 'row-current' : isUpcoming ? 'row-upcoming' : ''
                            }`}
                          >
                            <div className="admin-rr-left">
                              <span className="rr-time-text font-tabular">{rp.scheduled_time}</span>
                              {isCurrent ? (
                                <span className="rr-badge tag-current">Hiện tại</span>
                              ) : isUpcoming ? (
                                <span className="rr-badge tag-upcoming">Sắp tới</span>
                              ) : null}
                            </div>

                            <div className="admin-rr-bar-wrap">
                              <div className="admin-progress-bg">
                                <div
                                  className="admin-progress-fill"
                                  style={{
                                    width: isUpcoming ? '0%' : `${Math.min(rp.completion_percent, 100)}%`,
                                    backgroundColor: isCurrent
                                      ? 'var(--sgp-brand-700)'
                                      : 'var(--sgp-brand-600)',
                                  }}
                                />
                              </div>
                            </div>

                            <div className="admin-rr-right">
                              {isUpcoming ? (
                                <span className="rr-ratio-upcoming font-tabular">
                                  {rp.total_meters} công tơ
                                </span>
                              ) : (
                                <span className="rr-ratio font-tabular">
                                  <strong>{rp.confirmed}</strong>/{rp.total_meters}
                                </span>
                              )}
                              {rp.review > 0 && (
                                <span className="rr-review-pill font-tabular" title={`${rp.review} công tơ cần kiểm tra`}>
                                  <AlertTriangle size={10} aria-hidden="true" /> {rp.review}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Progress by Location */}
              {progressMode === 'location' && (
                <div className="admin-progress-container">
                  {locationProgressList.length === 0 ? (
                    <p className="admin-empty-inline">Chưa có dữ liệu phân bổ khu vực.</p>
                  ) : (
                    <div className="admin-loc-progress-list">
                      {displayedLocations.map((lp) => (
                        <div key={lp.location} className="admin-loc-item-v2">
                          <div className="admin-loc-header-line">
                            <span className="admin-loc-name">{lp.location}</span>
                            <div className="admin-loc-metrics font-tabular">
                              <span className="admin-loc-ratio">
                                <strong>{lp.confirmed_slots}</strong>/{isFutureSchedule ? lp.meter_count * dashboardData.round_progress.length : lp.due_slots}
                              </span>
                              {lp.review_slots > 0 && (
                                <span className="admin-review-pill font-tabular" title={`${lp.review_slots} lượt cần kiểm tra`}>
                                  <AlertTriangle size={10} aria-hidden="true" /> {lp.review_slots}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="admin-progress-bg">
                            <div
                              className="admin-progress-fill"
                              style={{ width: `${Math.min(lp.completion_percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {locationProgressList.length > 5 && (
                        <div className="admin-card-expand-footer">
                          <button
                            type="button"
                            className="admin-expand-link"
                            onClick={() => setShowAllLocations((prev) => !prev)}
                            aria-expanded={showAllLocations}
                          >
                            {showAllLocations ? (
                              <>
                                <span>Thu gọn</span>
                                <ChevronUp size={14} aria-hidden="true" />
                              </>
                            ) : (
                              <>
                                <span>Xem tất cả {locationProgressList.length} khu vực</span>
                                <ChevronRight size={14} aria-hidden="true" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* 4. QUALITY SECTION: CHẤT LƯỢNG GHI NHẬN (COMPACT STACKED DISTRIBUTION BAR OR ZERO-STATE) */}
          <section className="admin-surface-card admin-quality-card" aria-label="Chất lượng ghi nhận">
            <div className="admin-card-header">
              <div className="admin-card-title-group">
                <Sparkles size={16} className="icon-brand" aria-hidden="true" />
                <h2 className="admin-card-title">Chất lượng ghi nhận</h2>
              </div>
              <span className="admin-card-badge font-tabular">
                {dashboardData.provenance.total_readings} lượt đã xác nhận
              </span>
            </div>

            <div className="admin-quality-body">
              {dashboardData.provenance.total_readings === 0 ? (
                <div className="admin-quality-zero-state">
                  <p className="admin-quality-empty-text">
                    Chưa có lượt nào được xác nhận trong ngày này.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stacked Distribution Bar */}
                  <div
                    className="admin-stacked-bar"
                    role="progressbar"
                    aria-label="Tỷ lệ nguồn xác nhận chỉ số"
                    aria-valuenow={100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {dashboardData.provenance.ocr_confirmed_percent > 0 && (
                      <div
                        className="admin-stacked-seg seg-ocr"
                        style={{ width: `${dashboardData.provenance.ocr_confirmed_percent}%` }}
                        title={`Xác nhận từ OCR: ${dashboardData.provenance.ocr_confirmed_count} lượt (${dashboardData.provenance.ocr_confirmed_percent}%)`}
                      />
                    )}
                    {dashboardData.provenance.user_corrected_percent > 0 && (
                      <div
                        className="admin-stacked-seg seg-corrected"
                        style={{ width: `${dashboardData.provenance.user_corrected_percent}%` }}
                        title={`Đã hiệu chỉnh: ${dashboardData.provenance.user_corrected_count} lượt (${dashboardData.provenance.user_corrected_percent}%)`}
                      />
                    )}
                    {dashboardData.provenance.manual_entry_percent > 0 && (
                      <div
                        className="admin-stacked-seg seg-manual"
                        style={{ width: `${dashboardData.provenance.manual_entry_percent}%` }}
                        title={`Nhập thủ công: ${dashboardData.provenance.manual_entry_count} lượt (${dashboardData.provenance.manual_entry_percent}%)`}
                      />
                    )}
                  </div>

                  {/* Concise 3-Column Legend */}
                  <div className="admin-quality-legend">
                    <div className="admin-legend-item">
                      <span className="admin-legend-dot dot-ocr" aria-hidden="true" />
                      <span className="admin-legend-label">Xác nhận từ OCR</span>
                      <span className="admin-legend-value font-tabular">
                        <strong>{dashboardData.provenance.ocr_confirmed_count}</strong> &bull; {dashboardData.provenance.ocr_confirmed_percent}%
                      </span>
                    </div>

                    <div className="admin-legend-item">
                      <span className="admin-legend-dot dot-corrected" aria-hidden="true" />
                      <span className="admin-legend-label">Đã hiệu chỉnh</span>
                      <span className="admin-legend-value font-tabular">
                        <strong>{dashboardData.provenance.user_corrected_count}</strong> &bull; {dashboardData.provenance.user_corrected_percent}%
                      </span>
                    </div>

                    <div className="admin-legend-item">
                      <span className="admin-legend-dot dot-manual" aria-hidden="true" />
                      <span className="admin-legend-label">Nhập thủ công</span>
                      <span className="admin-legend-value font-tabular">
                        <strong>{dashboardData.provenance.manual_entry_count}</strong> &bull; {dashboardData.provenance.manual_entry_percent}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="Chưa có dữ liệu"
          message="Không tìm thấy thông tin vận hành cho ngày đã chọn."
        />
      )}
    </div>
  );
};
