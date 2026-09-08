import React, { useEffect, useState, useMemo } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  Info,
} from 'lucide-react';
import {
  Meter,
  ReportMeterDetailResponse,
  ReportOverviewResponse,
  User,
} from '../types';
import {
  downloadReportCsv,
  getMeterReport,
  getReportOverview,
  getTodayOperations,
} from '../services/api';
import { MeterSparkline } from './MeterSparkline';
import { AuthenticatedShell } from './AuthenticatedShell';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { EmptyState } from './ui/EmptyState';
import { VnDatePicker } from './ui/VnDatePicker';

interface ReportsViewProps {
  user: User;
  onBackToHome: () => void;
}

type ReportTab = 'OVERVIEW' | 'BY_METER';

export const ReportsView: React.FC<ReportsViewProps> = ({
  user: _user,
  onBackToHome,
}) => {
  const getTodayVnDate = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('operator_reports_date') || getTodayVnDate();
    } catch {
      return getTodayVnDate();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('operator_reports_date', selectedDate);
    } catch {}
  }, [selectedDate]);

  const [activeTab, setActiveTab] = useState<ReportTab>('OVERVIEW');

  // Overview State
  const [overviewData, setOverviewData] = useState<ReportOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // By Meter State
  const [allMeters, setAllMeters] = useState<Meter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [meterReportData, setMeterReportData] = useState<ReportMeterDetailResponse | null>(null);
  const [loadingMeterReport, setLoadingMeterReport] = useState<boolean>(false);
  const [meterReportError, setMeterReportError] = useState<string | null>(null);
  const [meterSearchQuery, setMeterSearchQuery] = useState<string>('');

  // Export State
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  // 1. Load Overview Data
  const loadOverview = async (date: string) => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await getReportOverview(date);
      setOverviewData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo tổng quan.';
      setOverviewError(msg);
    } finally {
      setLoadingOverview(false);
    }
  };

  // 2. Load Meter List for selector
  const loadMetersList = async () => {
    try {
      const ops = await getTodayOperations(selectedDate);
      if (ops && ops.meters) {
        const metersList = ops.meters.map((item) => item.meter);
        setAllMeters(metersList);
        if (!selectedMeterId && metersList.length > 0) {
          setSelectedMeterId(metersList[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  // 3. Load Per-Meter Report
  const loadMeterReport = async (meterId: string, date: string) => {
    if (!meterId) return;
    setLoadingMeterReport(true);
    setMeterReportError(null);
    try {
      const data = await getMeterReport(meterId, date);
      setMeterReportData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo chi tiết công tơ.';
      setMeterReportError(msg);
    } finally {
      setLoadingMeterReport(false);
    }
  };

  useEffect(() => {
    loadOverview(selectedDate);
    loadMetersList();
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'BY_METER' && selectedMeterId) {
      loadMeterReport(selectedMeterId, selectedDate);
    }
  }, [activeTab, selectedMeterId, selectedDate]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await downloadReportCsv(selectedDate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất báo cáo CSV.';
      alert(msg);
    } finally {
      setExportingCsv(false);
    }
  };

  const filteredMetersForSelect = useMemo(() => {
    if (!meterSearchQuery.trim()) return allMeters;
    const q = meterSearchQuery.toLowerCase();
    return allMeters.filter(
      (m) =>
        m.meter_code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.location && m.location.toLowerCase().includes(q))
    );
  }, [allMeters, meterSearchQuery]);

  return (
    <AuthenticatedShell
      screenTitle="BÁO CÁO & THỐNG KÊ"
      screenSubtitle={overviewData?.date_formatted || 'Tổng hợp số liệu'}
      backLabel="Trang chủ"
      onBack={onBackToHome}
      rightAction={
        <button
          type="button"
          className="btn-header-refresh"
          onClick={() => {
            loadOverview(selectedDate);
            if (selectedMeterId) loadMeterReport(selectedMeterId, selectedDate);
          }}
          disabled={loadingOverview || loadingMeterReport}
          aria-label="Làm mới báo cáo"
        >
          <RefreshCw size={17} className={loadingOverview || loadingMeterReport ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* 2. CONTROL BAR: Date Selector + CSV Export */}
      <section className="reports-control-bar">
        <VnDatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          showToday={true}
          todayDateStr={getTodayVnDate()}
          ariaLabel="Chọn ngày xem báo cáo"
        />

        <button
          type="button"
          className="btn-export-csv"
          onClick={handleExportCsv}
          disabled={exportingCsv}
          aria-label="Xuất báo cáo CSV"
        >
          <Download size={15} strokeWidth={2.2} />
          <span>{exportingCsv ? 'Đang xuất...' : 'Xuất CSV'}</span>
        </button>
      </section>

      {/* 3. TABS NAVIGATION */}
      <nav className="reports-tabs-nav" role="tablist" aria-label="Các mục báo cáo">
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
          role="tab"
          aria-selected={activeTab === 'OVERVIEW'}
        >
          <Layers size={16} />
          <span>TỔNG QUAN</span>
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'BY_METER' ? 'active' : ''}`}
          onClick={() => setActiveTab('BY_METER')}
          role="tab"
          aria-selected={activeTab === 'BY_METER'}
        >
          <Zap size={16} />
          <span>THEO CÔNG TƠ</span>
        </button>
      </nav>

      {/* 4. TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="reports-tab-content">
          {loadingOverview ? (
            <LoadingState message="Đang tổng hợp số liệu báo cáo..." />
          ) : overviewError ? (
            <ErrorState
              title="Không thể tải báo cáo"
              message={overviewError}
              onRetry={() => loadOverview(selectedDate)}
            />
          ) : overviewData ? (
            <div className="overview-stack">
              {/* TOP KPIS (2x2 Grid) */}
              <div className="report-kpis-grid">
                <div className="report-kpi-card">
                  <span className="kpi-label">TỔNG CÔNG TƠ</span>
                  <span className="kpi-value">{overviewData.summary.total_meters}</span>
                  <span className="kpi-sub">Đang hoạt động</span>
                </div>

                <div className="report-kpi-card">
                  <span className="kpi-label">LƯỢT ĐÃ GHI</span>
                  <span className="kpi-value">
                    {overviewData.summary.confirmed_slots} <span className="kpi-value-denom">/ {overviewData.summary.due_slots}</span>
                  </span>
                  <span className="kpi-sub">
                    {overviewData.summary.expected_slots > overviewData.summary.due_slots
                      ? `(${overviewData.summary.expected_slots} lượt cả ngày)`
                      : 'Đến khung giờ hiện tại'}
                  </span>
                </div>

                <div className="report-kpi-card">
                  <span className="kpi-label">TỶ LỆ HOÀN TẤT</span>
                  <span className="kpi-value">{overviewData.summary.completion_percent}%</span>
                  <div className="kpi-progress-bg">
                    <div
                      className="kpi-progress-fill"
                      style={{ width: `${Math.min(overviewData.summary.completion_percent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="report-kpi-card">
                  <span className="kpi-label">CẦN KIỂM TRA</span>
                  <span className={`kpi-value ${overviewData.summary.review_slots > 0 ? 'kpi-warn' : ''}`}>
                    {overviewData.summary.review_slots}
                  </span>
                  <span className="kpi-sub">Lượt cần đối chiếu</span>
                </div>
              </div>

              {/* SECTION: HOURLY PROGRESS */}
              <section className="report-section-card">
                <div className="report-section-header">
                  <Clock size={16} />
                  <h3>TIẾN ĐỘ THEO GIỜ ({overviewData.date_formatted})</h3>
                </div>

                {overviewData.hourly.length === 0 ? (
                  <p className="detail-empty-text">Chưa có khung giờ nào được lên lịch cho ngày này.</p>
                ) : (
                  <div className="hourly-progress-stack">
                    {overviewData.hourly.map((h) => {
                      const isUpcoming = h.timing_state === 'UPCOMING';
                      const isCurrent = h.timing_state === 'CURRENT';

                      return (
                        <div
                          key={h.round_id}
                          className={`hourly-row-item ${isUpcoming ? 'row-upcoming' : isCurrent ? 'row-current' : ''}`}
                        >
                          <div className="hr-left">
                            <span className="hr-time">{h.scheduled_time}</span>
                            <span className={`hr-timing-tag tag-${h.timing_state.toLowerCase()}`}>
                              {h.timing_state === 'CURRENT'
                                ? 'Hiện tại'
                                : h.timing_state === 'PAST'
                                ? 'Đã qua'
                                : 'Sắp tới'}
                            </span>
                          </div>

                          <div className="hr-center">
                            <div className="hr-bar-bg">
                              <div
                                className="hr-bar-fill"
                                style={{
                                  width: `${Math.min(h.completion_percent, 100)}%`,
                                  background: isUpcoming ? '#cbd5e1' : 'var(--sgp-brand-600)',
                                }}
                              />
                            </div>
                          </div>

                          <div className="hr-right">
                            <span className="hr-count-text">
                              <strong>{h.confirmed}</strong>/{h.total} ({h.completion_percent}%)
                            </span>
                            {h.review > 0 && (
                              <span className="hr-review-badge">
                                <AlertTriangle size={10} /> {h.review} KT
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION: LOCATION / STATION BREAKDOWN */}
              <section className="report-section-card">
                <div className="report-section-header">
                  <MapPin size={16} />
                  <h3>THEO TRẠM / VỊ TRÍ</h3>
                </div>

                {overviewData.locations.length === 0 ? (
                  <p className="detail-empty-text">Chưa có dữ liệu trạm/vị trí.</p>
                ) : (
                  <div className="location-cards-grid">
                    {overviewData.locations.map((loc) => (
                      <div key={loc.location} className="location-report-card">
                        <div className="loc-top-row">
                          <span className="loc-name">{loc.location}</span>
                          <span className="loc-meter-count">{loc.meter_count} công tơ</span>
                        </div>

                        <div className="loc-progress-bar-bg">
                          <div
                            className="loc-progress-bar-fill"
                            style={{ width: `${Math.min(loc.completion_percent, 100)}%` }}
                          />
                        </div>

                        <div className="loc-stats-row">
                          <span className="loc-stat-text">
                            <strong>{loc.confirmed_slots}</strong> / {loc.due_slots} lượt ({loc.completion_percent}%)
                          </span>
                          {loc.review_slots > 0 && (
                            <span className="loc-review-tag">
                              <AlertTriangle size={11} /> {loc.review_slots} cần KT
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <EmptyState
              title="Chưa có dữ liệu báo cáo"
              message="Không có dữ liệu báo cáo cho ngày đã chọn."
            />
          )}
        </div>
      )}

      {/* 5. TAB 2: BY METER */}
      {activeTab === 'BY_METER' && (
        <div className="reports-tab-content">
          {/* Meter Selector */}
          <div className="meter-selector-card">
            <div className="meter-search-row">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm mã hoặc tên công tơ..."
                value={meterSearchQuery}
                onChange={(e) => setMeterSearchQuery(e.target.value)}
              />
            </div>

            <div className="meter-pills-scroll">
              {filteredMetersForSelect.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`meter-select-pill ${m.id === selectedMeterId ? 'active' : ''}`}
                  onClick={() => setSelectedMeterId(m.id)}
                >
                  <span className="pill-code">{m.meter_code}</span>
                  <span className="pill-name">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Meter Report Content */}
          {loadingMeterReport ? (
            <LoadingState message="Đang tải số liệu công tơ..." />
          ) : meterReportError ? (
            <ErrorState
              title="Lỗi tải dữ liệu công tơ"
              message={meterReportError}
              onRetry={() => selectedMeterId && loadMeterReport(selectedMeterId, selectedDate)}
            />
          ) : meterReportData ? (
            <div className="meter-report-stack">
              {/* Meter Master Info Header */}
              <div className="meter-profile-header-card">
                <div className="mph-title-row">
                  <div className="mph-code-wrap">
                    <span className="mph-code-badge">{meterReportData.meter.meter_code}</span>
                    <h3 className="mph-name">{meterReportData.meter.name}</h3>
                  </div>
                  {meterReportData.meter.meter_type && (
                    <span className="mph-type-tag">
                      {meterReportData.meter.meter_type.toUpperCase() === 'LCD' ? 'Điện tử (LCD)' : 'Cơ'}
                    </span>
                  )}
                </div>
                {meterReportData.meter.location && (
                  <div className="mph-loc-row">
                    <MapPin size={13} />
                    <span>{meterReportData.meter.location}</span>
                  </div>
                )}

                {/* Micro Stats */}
                <div className="mph-stats-grid">
                  <div className="mph-stat-item">
                    <span className="mph-stat-label">CHỈ SỐ GẦN NHẤT</span>
                    <span className="mph-stat-value">
                      {meterReportData.latest_confirmed
                        ? `${meterReportData.latest_confirmed.reading} kWh`
                        : 'Chưa có'}
                    </span>
                    {meterReportData.latest_confirmed && (
                      <span className="mph-stat-sub">
                        Lượt {meterReportData.latest_confirmed.round_time} &bull; {meterReportData.latest_confirmed.formatted_server_time.split(' - ')[0]}
                      </span>
                    )}
                  </div>

                  <div className="mph-stat-item">
                    <span className="mph-stat-label">TIẾN ĐỘ HÔM NAY</span>
                    <span className="mph-stat-value">
                      {meterReportData.completion.confirmed} / {meterReportData.completion.due_total} lượt
                    </span>
                    <span className="mph-stat-sub">
                      Hoàn tất {meterReportData.completion.completion_percent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Trend Chart */}
              <section className="report-section-card">
                <div className="report-section-header">
                  <TrendingUp size={16} />
                  <h3>CHỈ SỐ THEO GIỜ</h3>
                </div>

                {meterReportData.trend && meterReportData.trend.length >= 2 ? (
                  <div className="report-trend-chart-box">
                    <div className="trend-chart-header">
                      <span className="trend-range-text">
                        {meterReportData.trend[0].scheduled_time} ({meterReportData.trend[0].reading} kWh) &rarr;{' '}
                        {meterReportData.trend[meterReportData.trend.length - 1].scheduled_time} (
                        {meterReportData.trend[meterReportData.trend.length - 1].reading} kWh)
                      </span>
                    </div>
                    <MeterSparkline data={meterReportData.trend} width={280} height={48} className="report-sparkline-lg" />
                  </div>
                ) : (
                  <div className="trend-empty-box">
                    <Info size={16} />
                    <span>Chưa đủ dữ liệu để hiển thị xu hướng.</span>
                  </div>
                )}
              </section>

              {/* Hourly Table */}
              <section className="report-section-card">
                <div className="report-section-header">
                  <Activity size={16} />
                  <h3>LỊCH SỬ TRONG NGÀY ({meterReportData.date_formatted})</h3>
                </div>

                {meterReportData.hourly.length === 0 ? (
                  <p className="detail-empty-text">Không có khung giờ nào.</p>
                ) : (
                  <div className="meter-daily-hourly-stack">
                    {meterReportData.hourly.map((h) => {
                      const isConfirmed = h.status === 'CONFIRMED';
                      const isReview = h.status === 'REVIEW';
                      const isUpcoming = h.timing_state === 'UPCOMING';

                      return (
                        <div
                          key={h.round_id}
                          className={`meter-daily-row ${isConfirmed ? 'row-confirmed' : isReview ? 'row-review' : isUpcoming ? 'row-upcoming' : ''}`}
                        >
                          <div className="mdr-time-col">
                            <span className="mdr-time">{h.scheduled_time}</span>
                            {h.timing_state === 'CURRENT' && <span className="mdr-current-tag">Hiện tại</span>}
                          </div>

                          <div className="mdr-reading-col">
                            {isConfirmed ? (
                              <div className="mdr-reading-box">
                                <span className="mdr-reading-val">{h.reading} kWh</span>
                                <div className="mdr-meta-line">
                                  <span>{h.formatted_recorded_at?.split(' - ')[0]}</span>
                                  {h.confirmation_source === 'USER_CORRECTED' && (
                                    <span className="ts-corrected-badge">Đã sửa tay</span>
                                  )}
                                  {h.confirmation_source === 'MANUAL_ENTRY' && (
                                    <span className="ts-corrected-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>Nhập thủ công</span>
                                  )}
                                  {h.recorded_by && <span>&bull; {h.recorded_by.full_name}</span>}
                                </div>
                              </div>
                            ) : isReview ? (
                              <div className="mdr-review-box">
                                <span className="mdr-review-tag">CẦN KIỂM TRA</span>
                              </div>
                            ) : isUpcoming ? (
                              <span className="mdr-upcoming-text">Chưa đến giờ</span>
                            ) : (
                              <span className="mdr-missed-text">Chưa ghi nhận</span>
                            )}
                          </div>

                          <div className="mdr-status-col">
                            {isConfirmed ? (
                              <span className="mdr-badge-done">
                                <CheckCircle2 size={16} />
                              </span>
                            ) : isReview ? (
                              <span className="mdr-badge-warn">
                                <AlertTriangle size={16} />
                              </span>
                            ) : (
                              <span className="mdr-badge-dash">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <EmptyState
              title="Chưa chọn công tơ"
              message="Chọn một công tơ ở trên để xem chi tiết báo cáo."
            />
          )}
        </div>
      )}
    </AuthenticatedShell>
  );
};
