import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Cpu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AdminTechnicalOverviewResponse,
  AdminTechnicalMeterListResponse,
  AdminTechnicalDetailsResponse,
  User,
} from '../../types';
import {
  getAdminTechnicalOverview,
  getAdminTechnicalMeters,
  getAdminTechnicalDetails,
  getAdminTechnicalExportUrl,
} from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { VnDatePicker, addDaysToIso } from '../ui/VnDatePicker';
import { AdminAudit } from './AdminAudit';

export type HistorySortField = 'datetime' | 'status' | 'reading' | 'recorded_at';
export type SortOrder = 'asc' | 'desc';

export const parseVnDateTime = (dateStr: string, timeStr?: string): number => {
  try {
    if (!dateStr) return 0;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const time = timeStr ? timeStr.trim() : '00:00';
      return new Date(`${iso}T${time}:00`).getTime() || 0;
    }
  } catch {}
  return 0;
};

interface AdminReportsProps {
  user?: User;
  onBackToDashboard?: () => void;
  onInspectReading?: (readingId: string) => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ onInspectReading }) => {
  const getTodayLocal = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const getFirstDayOfMonth = () => {
    const today = getTodayLocal();
    const parts = today.split('-');
    return `${parts[0]}-${parts[1]}-01`;
  };

  const [startDate, setStartDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_reports_startDate') || getFirstDayOfMonth();
    } catch {
      return getFirstDayOfMonth();
    }
  });
  const [endDate, setEndDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_reports_endDate') || getTodayLocal();
    } catch {
      return getTodayLocal();
    }
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'meters' | 'data' | 'audit'>(() => {
    try {
      const saved = sessionStorage.getItem('admin_reports_subTab');
      if (saved && ['overview', 'quality', 'meters', 'data', 'audit'].includes(saved)) {
        return saved as 'overview' | 'quality' | 'meters' | 'data' | 'audit';
      }
    } catch {}
    return 'overview';
  });

  // Overview Tab Data
  const [overviewData, setOverviewData] = useState<AdminTechnicalOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Disclosures state in Overview tab
  const [pipelineExpanded, setPipelineExpanded] = useState<boolean>(false);
  const [integrityExpanded, setIntegrityExpanded] = useState<boolean>(false);

  // Meter Tab Data
  const [meterListData, setMeterListData] = useState<AdminTechnicalMeterListResponse | null>(null);
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const [meterLoading, setMeterLoading] = useState<boolean>(false);
  const [meterError, setMeterError] = useState<string | null>(null);

  // Per-Meter History Pagination State (V1.2.1)
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(20);

  // Time Mode: 'single' (1 ngày cố định) | 'range' (Khoảng thời gian)
  const [reportMode, setReportMode] = useState<'single' | 'range'>(() => {
    try {
      const saved = sessionStorage.getItem('admin_reports_mode');
      if (saved === 'single' || saved === 'range') return saved;
    } catch {}
    return 'range';
  });

  // Automatically persist date filters and tab mode in session
  useEffect(() => {
    try {
      sessionStorage.setItem('admin_reports_startDate', startDate);
      sessionStorage.setItem('admin_reports_endDate', endDate);
      sessionStorage.setItem('admin_reports_mode', reportMode);
      sessionStorage.setItem('admin_reports_subTab', activeTab);
    } catch {}
  }, [startDate, endDate, reportMode, activeTab]);

  // Per-Meter History Sorting State (V1.2.2)
  const [sortField, setSortField] = useState<HistorySortField>('datetime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSortClick = (field: HistorySortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setHistoryPage(1);
  };

  const handleResetSort = () => {
    setSortField('datetime');
    setSortOrder('desc');
    setHistoryPage(1);
  };

  const getSortLabel = (field: HistorySortField, order: SortOrder) => {
    switch (field) {
      case 'datetime':
        return `Thời gian (${order === 'desc' ? 'Mới nhất' : 'Cũ nhất'})`;
      case 'reading':
        return `Chỉ số (${order === 'desc' ? 'Cao → Thấp' : 'Thấp → Cao'})`;
      case 'status':
        return `Trạng thái (${order === 'desc' ? 'Cần KT trước' : 'Đã xác nhận trước'})`;
      case 'recorded_at':
        return `Thời gian ghi (${order === 'desc' ? 'Mới nhất' : 'Cũ nhất'})`;
      default:
        return '';
    }
  };

  const sortedHistory = useMemo(() => {
    if (!meterListData?.history) return [];
    const list = [...meterListData.history];

    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'datetime') {
        const timeA = parseVnDateTime(a.date, a.scheduled_time);
        const timeB = parseVnDateTime(b.date, b.scheduled_time);
        diff = timeA - timeB;
      } else if (sortField === 'reading') {
        const valA = a.reading ? parseFloat(a.reading) : -1;
        const valB = b.reading ? parseFloat(b.reading) : -1;
        diff = (isNaN(valA) ? -1 : valA) - (isNaN(valB) ? -1 : valB);
      } else if (sortField === 'status') {
        diff = a.status.localeCompare(b.status);
      } else if (sortField === 'recorded_at') {
        const recA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
        const recB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
        diff = recA - recB;
      }

      // Secondary tie-breaker: reverse chronological
      if (diff === 0 && sortField !== 'datetime') {
        const timeA = parseVnDateTime(a.date, a.scheduled_time);
        const timeB = parseVnDateTime(b.date, b.scheduled_time);
        return timeB - timeA;
      }

      return sortOrder === 'asc' ? diff : -diff;
    });

    return list;
  }, [meterListData?.history, sortField, sortOrder]);

  // Data Tab Data
  const [detailsData, setDetailsData] = useState<AdminTechnicalDetailsResponse | null>(null);
  const [detailsStatusFilter, setDetailsStatusFilter] = useState<string>('ALL');
  const [detailsPage, setDetailsPage] = useState<number>(1);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Load Overview Data
  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await getAdminTechnicalOverview({
        startDate,
        endDate,
        location: selectedLocation,
        meterType: selectedType,
        confirmationSource: selectedSource,
      });
      setOverviewData(res);
      // If violations exist, automatically expand integrity panel
      if (res.data_integrity.total_violations > 0) {
        setIntegrityExpanded(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo kỹ thuật tổng quan.';
      setOverviewError(msg);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load Meter Analysis Data
  const loadMetersData = async (targetMeterId?: string) => {
    setMeterLoading(true);
    setMeterError(null);
    try {
      const res = await getAdminTechnicalMeters({
        startDate,
        endDate,
        location: selectedLocation,
        meterType: selectedType,
        confirmationSource: selectedSource,
        meterId: targetMeterId || selectedMeterId || undefined,
      });
      setMeterListData(res);
      if (res.selected_meter_id) {
        setSelectedMeterId(res.selected_meter_id);
      }
      // Reset history page when loading new meter dataset
      setHistoryPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo theo công tơ.';
      setMeterError(msg);
    } finally {
      setMeterLoading(false);
    }
  };

  // Load Technical Details / Exceptions Data
  const loadDetailsData = async (page = 1) => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await getAdminTechnicalDetails({
        startDate,
        endDate,
        location: selectedLocation,
        meterType: selectedType,
        confirmationSource: selectedSource,
        statusFilter: detailsStatusFilter,
        page,
        limit: 50,
      });
      setDetailsData(res);
      setDetailsPage(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu chi tiết.';
      setDetailsError(msg);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [startDate, endDate, selectedLocation, selectedType, selectedSource]);

  useEffect(() => {
    if (activeTab === 'meters') {
      loadMetersData();
    } else if (activeTab === 'data') {
      loadDetailsData(1);
    }
  }, [activeTab, startDate, endDate, selectedLocation, selectedType, selectedSource, detailsStatusFilter]);

  // Quick preset helper
  const handlePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth') => {
    const today = getTodayLocal();
    const [y, m, d] = today.split('-').map(Number);

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const yesterday = addDaysToIso(today, -1);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === '7days') {
      const pastDate = new Date(y, m - 1, d);
      pastDate.setDate(pastDate.getDate() - 6);
      const py = pastDate.getFullYear();
      const pm = String(pastDate.getMonth() + 1).padStart(2, '0');
      const pd = String(pastDate.getDate()).padStart(2, '0');
      setStartDate(`${py}-${pm}-${pd}`);
      setEndDate(today);
    } else if (preset === '30days') {
      const pastDate = new Date(y, m - 1, d);
      pastDate.setDate(pastDate.getDate() - 29);
      const py = pastDate.getFullYear();
      const pm = String(pastDate.getMonth() + 1).padStart(2, '0');
      const pd = String(pastDate.getDate()).padStart(2, '0');
      setStartDate(`${py}-${pm}-${pd}`);
      setEndDate(today);
    } else if (preset === 'thisMonth') {
      setStartDate(getFirstDayOfMonth());
      setEndDate(today);
    }
  };

  const handleExportCsv = () => {
    const url = getAdminTechnicalExportUrl({
      startDate,
      endDate,
      location: selectedLocation,
      meterType: selectedType,
      confirmationSource: selectedSource,
    });
    window.location.href = url;
  };

  const handleSelectWatchlistMeter = (meterId: string) => {
    setSelectedMeterId(meterId);
    setActiveTab('meters');
    loadMetersData(meterId);
  };

  const getDayOnly = (dateVn: string) => {
    if (!dateVn) return '';
    const parts = dateVn.split('/');
    return parts[0] || dateVn;
  };

  return (
    <div className="admin-page-container">
      {/* 1. PAGE HEADER */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Báo cáo kỹ thuật</h1>
          <p className="admin-page-subtitle">
            Phân tích vận hành, chất lượng nhận dạng và dữ liệu ghi nhận
          </p>
        </div>

        {activeTab !== 'audit' && (
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleExportCsv}
            title="Xuất dữ liệu chi tiết dạng CSV (UTF-8 BOM)"
            aria-label="Xuất dữ liệu CSV"
          >
            <Download size={14} aria-hidden="true" />
            <span>Xuất dữ liệu CSV</span>
          </button>
        )}
      </div>

      {/* 2. TECHNICAL WORKSPACE TABS */}
      <div className="admin-tech-tabs" role="tablist" aria-label="Chuyển đổi góc nhìn phân tích">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`admin-tech-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            try {
              sessionStorage.setItem('admin_reports_subTab', 'overview');
            } catch {}
          }}
        >
          <Activity size={14} aria-hidden="true" />
          <span>Tổng quan kỹ thuật</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quality'}
          className={`admin-tech-tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quality');
            try {
              sessionStorage.setItem('admin_reports_subTab', 'quality');
            } catch {}
          }}
        >
          <BarChart3 size={14} aria-hidden="true" />
          <span>Chất lượng nhận dạng</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'meters'}
          className={`admin-tech-tab ${activeTab === 'meters' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('meters');
            try {
              sessionStorage.setItem('admin_reports_subTab', 'meters');
            } catch {}
          }}
        >
          <Layers size={14} aria-hidden="true" />
          <span>Theo công tơ</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'data'}
          className={`admin-tech-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('data');
            try {
              sessionStorage.setItem('admin_reports_subTab', 'data');
            } catch {}
          }}
        >
          <FileText size={14} aria-hidden="true" />
          <span>Ngoại lệ & dữ liệu</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`admin-tech-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('audit');
            try {
              sessionStorage.setItem('admin_reports_subTab', 'audit');
            } catch {}
          }}
        >
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Nhật ký kiểm toán</span>
        </button>
      </div>

      {/* 3. COMPACT GLOBAL TECHNICAL FILTER TOOLBAR */}
      {activeTab !== 'audit' && (
        <div className="admin-toolbar-card admin-tech-toolbar-compact" role="search" aria-label="Bộ lọc báo cáo kỹ thuật">
          {/* Mode Toggle: Theo ngày vs Khoảng ngày */}
          <div className="admin-report-mode-toggle" role="radiogroup" aria-label="Chế độ thời gian báo cáo">
            <button
              type="button"
              className={`admin-mode-pill ${reportMode === 'single' ? 'active' : ''}`}
              onClick={() => {
                setReportMode('single');
                setStartDate(endDate);
              }}
            >
              Theo ngày
            </button>
            <button
              type="button"
              className={`admin-mode-pill ${reportMode === 'range' ? 'active' : ''}`}
              onClick={() => {
                setReportMode('range');
                if (startDate === endDate) {
                  setStartDate(getFirstDayOfMonth());
                }
              }}
            >
              Khoảng ngày
            </button>
          </div>

          {/* Dynamic Controls based on reportMode */}
          {reportMode === 'single' ? (
            <>
              <div className="admin-date-presets" role="group" aria-label="Chọn ngày nhanh">
                <button
                  type="button"
                  className={`admin-preset-btn ${endDate === getTodayLocal() ? 'active' : ''}`}
                  onClick={() => handlePreset('today')}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`admin-preset-btn ${endDate === addDaysToIso(getTodayLocal(), -1) ? 'active' : ''}`}
                  onClick={() => handlePreset('yesterday')}
                >
                  Hôm qua
                </button>
              </div>

              <VnDatePicker
                size="sm"
                value={endDate}
                onChange={(newDate) => {
                  setStartDate(newDate);
                  setEndDate(newDate);
                }}
                showSteppers={true}
                ariaLabel="Chọn ngày xem báo cáo"
                title="Chọn ngày xem báo cáo (DD/MM/YYYY)"
              />
            </>
          ) : (
            <>
              {/* Presets Segmented Control */}
              <div className="admin-date-presets" role="group" aria-label="Chọn khoảng thời gian nhanh">
                <button
                  type="button"
                  className="admin-preset-btn"
                  onClick={() => handlePreset('7days')}
                >
                  7 ngày
                </button>
                <button
                  type="button"
                  className="admin-preset-btn"
                  onClick={() => handlePreset('30days')}
                >
                  30 ngày
                </button>
                <button
                  type="button"
                  className={`admin-preset-btn ${startDate === getFirstDayOfMonth() && endDate === getTodayLocal() ? 'active' : ''}`}
                  onClick={() => handlePreset('thisMonth')}
                >
                  Tháng này
                </button>
              </div>

              {/* Vietnamese Formatted Date Range Picker */}
              <div className="admin-tech-date-range-badge" title="Khoảng thời gian phân tích (DD/MM/YYYY)">
                <VnDatePicker
                  size="sm"
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                  ariaLabel="Từ ngày"
                  title="Từ ngày (DD/MM/YYYY)"
                />
                <span className="text-muted text-xs">&rarr;</span>
                <VnDatePicker
                  size="sm"
                  value={endDate}
                  onChange={(d) => setEndDate(d)}
                  ariaLabel="Đến ngày"
                  title="Đến ngày (DD/MM/YYYY)"
                />
              </div>
            </>
          )}

          {/* Dimension Filters */}
          <div className="admin-tech-select-group">
            <select
              className="admin-select admin-select-sm"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              aria-label="Lọc theo khu vực"
            >
              <option value="ALL">Tất cả khu vực</option>
              {overviewData?.available_locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              className="admin-select admin-select-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Lọc theo loại công tơ"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="LCD">LCD</option>
              <option value="MECHANICAL">Cơ</option>
            </select>

            <select
              className="admin-select admin-select-sm"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              aria-label="Lọc theo nguồn xác nhận"
            >
              <option value="ALL">Tất cả nguồn</option>
              <option value="OCR_CONFIRMED">Xác nhận từ OCR</option>
              <option value="USER_CORRECTED">Đã hiệu chỉnh</option>
              <option value="MANUAL_ENTRY">Nhập thủ công</option>
            </select>

            <button
              type="button"
              className="admin-btn-refresh btn-sm"
              onClick={() => {
                loadOverview();
                if (activeTab === 'meters') loadMetersData();
                if (activeTab === 'data') loadDetailsData(1);
              }}
              disabled={overviewLoading}
              title="Làm mới dữ liệu"
              aria-label="Làm mới báo cáo"
            >
              <RefreshCw size={13} className={overviewLoading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 4. TECHNICAL TAB CONTENT */}
      {activeTab !== 'audit' && (
        overviewLoading && !overviewData ? (
          <LoadingState message="Đang tải dữ liệu phân tích kỹ thuật..." />
        ) : overviewError ? (
          <ErrorState
            title="Không thể tải báo cáo kỹ thuật"
            message={overviewError}
            onRetry={loadOverview}
          />
        ) : overviewData && (
          <>
          {/* ======================================================== */}
          {/* TAB 1: TỔNG QUAN KỸ THUẬT (4-CARD DENSITY)               */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="admin-tech-content">
              {/* 4-Metric Compact Grid */}
              <div className="admin-tech-metric-strip-4">
                {/* A. Lượt đo đến hạn */}
                <div className="admin-tech-kpi-card">
                  <span className="tech-kpi-label">Lượt đo đến hạn</span>
                  <span className="tech-kpi-val font-tabular">{overviewData.summary.total_due_slots.toLocaleString()}</span>
                  <span className="tech-kpi-sub font-tabular">{overviewData.summary.total_scheduled_rounds} khung giờ theo lịch</span>
                </div>

                {/* B. Tỷ lệ hoàn tất */}
                <div className="admin-tech-kpi-card">
                  <span className="tech-kpi-label">Tỷ lệ hoàn tất</span>
                  <span className="tech-kpi-val text-brand font-tabular">{overviewData.summary.completion_rate}%</span>
                  <span className="tech-kpi-sub font-tabular">
                    {overviewData.summary.total_confirmed.toLocaleString()} / {overviewData.summary.total_due_slots.toLocaleString()} đã xác nhận
                  </span>
                </div>

                {/* C. Cần kiểm tra */}
                <div className="admin-tech-kpi-card">
                  <span className="tech-kpi-label">Cần kiểm tra</span>
                  <span className={`tech-kpi-val font-tabular ${overviewData.summary.total_review > 0 ? 'text-amber font-bold' : ''}`}>
                    {overviewData.summary.total_review}
                  </span>
                  <span className="tech-kpi-sub font-tabular">REVIEW</span>
                </div>

                {/* D. Can thiệp người dùng */}
                <div className="admin-tech-kpi-card">
                  <span className="tech-kpi-label">Can thiệp người dùng</span>
                  <span className="tech-kpi-val text-warning font-tabular">{overviewData.summary.human_intervention_rate}%</span>
                  <span className="tech-kpi-sub font-tabular">
                    {overviewData.summary.human_intervention_count.toLocaleString()} lượt &bull; Hiệu chỉnh {overviewData.summary.user_corrected_rate}% &bull; Thủ công {overviewData.summary.manual_entry_rate}%
                  </span>
                </div>
              </div>

              {/* 2-Column Section: Completion Trend (No Scroll) & Latency */}
              <div className="admin-tech-grid-2">
                {/* Left: Completion Trend Bar Chart (Fits 31 days without horizontal scroll) */}
                <div className="admin-surface-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Hoàn thành theo ngày</h2>
                    <span className="text-muted text-xs font-tabular">
                      {overviewData.date_range.start_date_vn} &rarr; {overviewData.date_range.end_date_vn}
                    </span>
                  </div>
                  <div className="admin-card-body">
                    <div className="tech-chart-container-fit">
                      <div className="tech-trend-bar-grid-fit" role="img" aria-label="Biểu đồ tỷ lệ hoàn thành theo ngày">
                        {overviewData.daily_completion_trend.map((item) => (
                          <div
                            key={item.date}
                            className="tech-trend-col-fit"
                            title={`${item.date_vn}: ${item.confirmed_slots} / ${item.due_slots} (${item.completion_rate}%)`}
                          >
                            <div className="tech-trend-bar-track-fit">
                              <div
                                className="tech-trend-bar-fill"
                                style={{ height: `${Math.min(item.completion_rate, 100)}%` }}
                              />
                            </div>
                            <span className="tech-trend-label-fit font-tabular">{getDayOnly(item.date_vn)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Latency Stats Card with Denominator Context */}
                <div className="admin-surface-card">
                  <div className="admin-card-header">
                    <div className="admin-card-title-group">
                      <Clock size={15} className="text-brand" aria-hidden="true" />
                      <h2 className="admin-card-title">Độ trễ ghi nhận</h2>
                    </div>
                    <span className="text-muted text-xs">Thời gian thực hiện so với lịch</span>
                  </div>
                  <div className="admin-card-body">
                    <div className="tech-latency-grid">
                      <div className="tech-latency-item">
                        <span className="latency-label">Trung vị (p50)</span>
                        <span className="latency-val font-tabular">
                          {overviewData.summary.recording_latency_p50_minutes !== null
                            ? `${overviewData.summary.recording_latency_p50_minutes} phút`
                            : '—'}
                        </span>
                      </div>
                      <div className="tech-latency-item">
                        <span className="latency-label">Phân vị 95 (p95)</span>
                        <span className="latency-val font-tabular">
                          {overviewData.summary.recording_latency_p95_minutes !== null
                            ? `${overviewData.summary.recording_latency_p95_minutes} phút`
                            : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted text-xs mt-3 font-tabular">
                      Tính trên {overviewData.summary.total_confirmed.toLocaleString()} lượt đã xác nhận hợp lệ trong kỳ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Watchlist Table */}
              <div className="admin-surface-card table-card">
                <div className="admin-card-header">
                  <div className="admin-card-title-group">
                    <AlertTriangle size={15} className="text-warning" aria-hidden="true" />
                    <h2 className="admin-card-title">Công tơ cần theo dõi</h2>
                  </div>
                  <span className="text-muted text-xs">Sắp xếp theo tỷ lệ can thiệp giảm dần (&ge; 5 lượt)</span>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table admin-tech-table" aria-label="Bảng công tơ cần theo dõi">
                    <thead>
                      <tr>
                        <th scope="col">Mã công tơ</th>
                        <th scope="col">Tên công tơ</th>
                        <th scope="col">Khu vực</th>
                        <th scope="col">Loại</th>
                        <th scope="col" className="text-right">Đã xác nhận</th>
                        <th scope="col" className="text-right">Hiệu chỉnh</th>
                        <th scope="col" className="text-right">Nhập thủ công</th>
                        <th scope="col" className="text-right">Cần KT</th>
                        <th scope="col" className="text-right">Tỷ lệ can thiệp</th>
                        <th scope="col" style={{ width: '36px' }}><span className="sr-only">Chi tiết</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewData.watchlist_meters.map((wm) => (
                        <tr key={wm.meter_id} className="tech-watchlist-row">
                          <td>
                            <button
                              type="button"
                              className="admin-meter-code-link font-mono font-bold font-tabular"
                              onClick={() => handleSelectWatchlistMeter(wm.meter_id)}
                              title={`Xem phân tích công tơ ${wm.meter_code}`}
                            >
                              {wm.meter_code}
                            </button>
                          </td>
                          <td className="font-medium">{wm.name}</td>
                          <td className="text-muted">{wm.location}</td>
                          <td><span className="admin-meter-type-text">{wm.meter_type}</span></td>
                          <td className="text-right font-tabular">{wm.confirmed_count}</td>
                          <td className="text-right font-tabular text-warning">{wm.user_corrected_count}</td>
                          <td className="text-right font-tabular text-muted">{wm.manual_entry_count}</td>
                          <td className="text-right font-tabular">{wm.review_count > 0 ? <span className="text-amber font-bold">{wm.review_count}</span> : '—'}</td>
                          <td className="text-right font-tabular font-bold text-warning">
                            {wm.human_intervention_rate}%
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="admin-btn-icon-tiny"
                              onClick={() => handleSelectWatchlistMeter(wm.meter_id)}
                              aria-label={`Xem chi tiết ${wm.meter_code}`}
                            >
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Integrity Collapsible Panel */}
              <div className="admin-surface-card admin-disclosure-card">
                <div
                  className="admin-card-header admin-disclosure-trigger"
                  onClick={() => setIntegrityExpanded((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={integrityExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIntegrityExpanded((prev) => !prev);
                    }
                  }}
                >
                  <div className="admin-card-title-group">
                    <ShieldCheck
                      size={16}
                      className={overviewData.data_integrity.total_violations === 0 ? 'text-success' : 'text-danger'}
                      aria-hidden="true"
                    />
                    <h2 className="admin-card-title">Toàn vẹn dữ liệu</h2>
                    <span className={`admin-badge ${overviewData.data_integrity.total_violations === 0 ? 'badge-active' : 'badge-danger'} font-tabular`}>
                      {overviewData.data_integrity.total_violations === 0
                        ? `Không phát hiện vi phạm contract dữ liệu trong ${overviewData.summary.total_due_slots.toLocaleString()} lượt kiểm tra`
                        : `⚠ Phát hiện ${overviewData.data_integrity.total_violations} vi phạm dữ liệu`}
                    </span>
                  </div>
                  <button type="button" className="admin-btn-disclosure" aria-label="Đóng mở kiểm tra toàn vẹn">
                    {integrityExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {integrityExpanded && (
                  <div className="admin-card-body border-t border-sgp">
                    <div className="tech-integrity-grid font-tabular">
                      <div className="integrity-item">
                        <span className="integ-label">Trùng lặp công tơ + lượt</span>
                        <span className="integ-val">{overviewData.data_integrity.duplicate_meter_rounds}</span>
                      </div>
                      <div className="integrity-item">
                        <span className="integ-label">Sai lệch OCR confirmed</span>
                        <span className="integ-val">{overviewData.data_integrity.invalid_provenance_ocr_mismatch}</span>
                      </div>
                      <div className="integrity-item">
                        <span className="integ-label">Nhập tay có OCR thừa</span>
                        <span className="integ-val">{overviewData.data_integrity.invalid_provenance_manual_with_ocr}</span>
                      </div>
                      <div className="integrity-item">
                        <span className="integ-label">Hiệu chỉnh thiếu OCR</span>
                        <span className="integ-val">{overviewData.data_integrity.invalid_provenance_corrected_null_ocr}</span>
                      </div>
                      <div className="integrity-item">
                        <span className="integ-label">Ghi nhận lượt tương lai</span>
                        <span className="integ-val">{overviewData.data_integrity.confirmed_reading_on_future_round}</span>
                      </div>
                      <div className="integrity-item">
                        <span className="integ-label">Độ trễ âm (&lt; 0 phút)</span>
                        <span className="integ-val">{overviewData.data_integrity.negative_latency_count}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Demoted / Collapsible Pipeline Configuration Panel */}
              <div className="admin-surface-card admin-disclosure-card">
                <div
                  className="admin-card-header admin-disclosure-trigger"
                  onClick={() => setPipelineExpanded((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={pipelineExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPipelineExpanded((prev) => !prev);
                    }
                  }}
                >
                  <div className="admin-card-title-group">
                    <Cpu size={15} className="text-brand" aria-hidden="true" />
                    <h2 className="admin-card-title">Cấu hình nhận dạng hiện hành</h2>
                    <span className="admin-badge badge-active font-mono text-xs">
                      {overviewData.pipeline_config.pipeline_version}
                    </span>
                  </div>
                  <button type="button" className="admin-btn-disclosure" aria-label="Đóng mở cấu hình nhận dạng">
                    {pipelineExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {pipelineExpanded && (
                  <div className="admin-card-body border-t border-sgp">
                    <p className="text-muted text-xs mb-3">
                      Lưu ý: Đây là thông số cấu hình đang kích hoạt trên hệ thống máy chủ, không nhất thiết đại diện cho toàn bộ dữ liệu lịch sử đã qua.
                    </p>
                    <div className="tech-config-grid font-tabular">
                      <div className="config-row">
                        <span className="config-k">Pipeline</span>
                        <span className="config-v font-mono">{overviewData.pipeline_config.pipeline_version}</span>
                      </div>
                      <div className="config-row">
                        <span className="config-k">Định vị E2</span>
                        <span className="config-v">
                          {overviewData.pipeline_config.localization_imgsz}px (retry {overviewData.pipeline_config.adaptive_retry_imgsz}px)
                        </span>
                      </div>
                      <div className="config-row">
                        <span className="config-k">Ngưỡng tin cậy / IoU</span>
                        <span className="config-v">
                          {overviewData.pipeline_config.confidence_threshold} / {overviewData.pipeline_config.iou_threshold}
                        </span>
                      </div>
                      <div className="config-row">
                        <span className="config-k">Nhận dạng số</span>
                        <span className="config-v">{overviewData.pipeline_config.recognizer}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CHẤT LƯỢNG NHẬN DẠNG                              */}
          {/* ======================================================== */}
          {activeTab === 'quality' && (
            <div className="admin-tech-content">
              {/* Overall Provenance Distribution Stack Card */}
              <div className="admin-surface-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Phân bố nguồn xác nhận toàn hệ thống</h2>
                  <span className="text-muted text-xs font-tabular">
                    {overviewData.summary.total_confirmed.toLocaleString()} lượt đã xác nhận
                  </span>
                </div>
                <div className="admin-card-body">
                  <div className="tech-provenance-stacked-bar">
                    <div
                      className="prov-segment seg-ocr"
                      style={{ width: `${overviewData.summary.ocr_confirmed_rate}%` }}
                      title={`Xác nhận từ OCR: ${overviewData.summary.ocr_confirmed_count.toLocaleString()} (${overviewData.summary.ocr_confirmed_rate}%)`}
                    />
                    <div
                      className="prov-segment seg-corr"
                      style={{ width: `${overviewData.summary.user_corrected_rate}%` }}
                      title={`Đã hiệu chỉnh: ${overviewData.summary.user_corrected_count.toLocaleString()} (${overviewData.summary.user_corrected_rate}%)`}
                    />
                    <div
                      className="prov-segment seg-man"
                      style={{ width: `${overviewData.summary.manual_entry_rate}%` }}
                      title={`Nhập thủ công: ${overviewData.summary.manual_entry_count.toLocaleString()} (${overviewData.summary.manual_entry_rate}%)`}
                    />
                  </div>

                  <div className="tech-provenance-legend">
                    <div className="legend-item">
                      <span className="leg-dot dot-ocr" />
                      <span className="leg-label">Xác nhận trực tiếp từ OCR:</span>
                      <strong className="font-tabular">{overviewData.summary.ocr_confirmed_count.toLocaleString()} ({overviewData.summary.ocr_confirmed_rate}%)</strong>
                    </div>
                    <div className="legend-item">
                      <span className="leg-dot dot-corr" />
                      <span className="leg-label">Đã hiệu chỉnh:</span>
                      <strong className="font-tabular">{overviewData.summary.user_corrected_count.toLocaleString()} ({overviewData.summary.user_corrected_rate}%)</strong>
                    </div>
                    <div className="legend-item">
                      <span className="leg-dot dot-man" />
                      <span className="leg-label">Nhập thủ công:</span>
                      <strong className="font-tabular">{overviewData.summary.manual_entry_count.toLocaleString()} ({overviewData.summary.manual_entry_rate}%)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provenance Trend By Day (Fits without scroll) */}
              <div className="admin-surface-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Nguồn xác nhận theo thời gian</h2>
                  <span className="text-muted text-xs font-tabular">Tỷ lệ thành phần theo từng ngày (100% Stacked)</span>
                </div>
                <div className="admin-card-body">
                  <div className="tech-chart-container-fit">
                    <div className="tech-trend-bar-grid-fit" role="img" aria-label="Biểu đồ nguồn xác nhận theo ngày">
                      {overviewData.daily_provenance_trend.map((item) => (
                        <div
                          key={item.date}
                          className="tech-trend-col-fit"
                          title={`${item.date_vn}: OCR ${item.ocr_rate}%, Hiệu chỉnh ${item.corrected_rate}%, Thủ công ${item.manual_rate}%`}
                        >
                          <div className="tech-trend-bar-track-fit">
                            {item.confirmed_count > 0 ? (
                              <div className="tech-stacked-col-inner" style={{ height: '100%' }}>
                                <div className="tech-stack-part seg-ocr" style={{ height: `${item.ocr_rate}%` }} />
                                <div className="tech-stack-part seg-corr" style={{ height: `${item.corrected_rate}%` }} />
                                <div className="tech-stack-part seg-man" style={{ height: `${item.manual_rate}%` }} />
                              </div>
                            ) : (
                              <div className="tech-stack-empty" />
                            )}
                          </div>
                          <span className="tech-trend-label-fit font-tabular">{getDayOnly(item.date_vn)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column: By Type & By Location with Updated Terminology */}
              <div className="admin-tech-grid-2">
                {/* Quality By Meter Type */}
                <div className="admin-surface-card table-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Chất lượng theo loại công tơ</h2>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table admin-tech-table" aria-label="Bảng chất lượng theo loại công tơ">
                      <thead>
                        <tr>
                          <th scope="col">LOẠI</th>
                          <th scope="col" className="text-right">ĐÃ XÁC NHẬN</th>
                          <th scope="col" className="text-right">OCR TRỰC TIẾP</th>
                          <th scope="col" className="text-right">HIỆU CHỈNH</th>
                          <th scope="col" className="text-right">THỦ CÔNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewData.quality_by_type.map((qt) => (
                          <tr key={qt.meter_type}>
                            <td className="font-bold">{qt.meter_type}</td>
                            <td className="text-right font-tabular">{qt.confirmed_count.toLocaleString()}</td>
                            <td className="text-right font-tabular text-success font-semibold">{qt.ocr_rate}%</td>
                            <td className="text-right font-tabular text-warning">{qt.corrected_rate}%</td>
                            <td className="text-right font-tabular text-muted">{qt.manual_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quality By Location */}
                <div className="admin-surface-card table-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Chất lượng theo khu vực</h2>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table admin-tech-table" aria-label="Bảng chất lượng theo khu vực">
                      <thead>
                        <tr>
                          <th scope="col">KHU VỰC</th>
                          <th scope="col" className="text-right">ĐÃ XÁC NHẬN</th>
                          <th scope="col" className="text-right">OCR TRỰC TIẾP</th>
                          <th scope="col" className="text-right">HIỆU CHỈNH</th>
                          <th scope="col" className="text-right">THỦ CÔNG</th>
                          <th scope="col" className="text-right">CẦN KT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewData.quality_by_location.map((ql) => (
                          <tr key={ql.location}>
                            <td className="font-medium">{ql.location}</td>
                            <td className="text-right font-tabular">{ql.confirmed_count.toLocaleString()}</td>
                            <td className="text-right font-tabular text-success font-semibold">{ql.ocr_rate}%</td>
                            <td className="text-right font-tabular text-warning">{ql.corrected_rate}%</td>
                            <td className="text-right font-tabular text-muted">{ql.manual_rate}%</td>
                            <td className="text-right font-tabular">{ql.review_count > 0 ? <span className="text-amber font-bold">{ql.review_count}</span> : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: THEO CÔNG TƠ (PAGINATED HISTORY V1.2.1)           */}
          {/* ======================================================== */}
          {activeTab === 'meters' && (
            <div className="admin-tech-content">
              {meterLoading && !meterListData ? (
                <LoadingState message="Đang tải phân tích công tơ..." />
              ) : meterError ? (
                <ErrorState title="Lỗi tải dữ liệu công tơ" message={meterError} onRetry={() => loadMetersData()} />
              ) : meterListData && (
                <>
                  {/* Meter Selector Toolbar */}
                  <div className="admin-meter-selector-bar">
                    <div className="selector-group">
                      <label htmlFor="report_meter_select" className="selector-label font-bold">
                        Chọn công tơ phân tích:
                      </label>
                      <select
                        id="report_meter_select"
                        className="admin-select"
                        style={{ minWidth: '280px' }}
                        value={selectedMeterId || ''}
                        onChange={(e) => {
                          setSelectedMeterId(e.target.value);
                          loadMetersData(e.target.value);
                        }}
                      >
                        {meterListData.meters.map((m) => (
                          <option key={m.meter_id} value={m.meter_id}>
                            {m.meter_code} &bull; {m.name} ({m.location})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedMeterId && (
                      <div className="selected-meter-meta-tags font-tabular">
                        {(() => {
                          const curr = meterListData.meters.find((m) => m.meter_id === selectedMeterId);
                          if (!curr) return null;
                          return (
                            <>
                              <span className="admin-badge badge-active">{curr.location}</span>
                              <span className="admin-badge badge-past">{curr.meter_type}</span>
                              <span className={`admin-badge ${curr.is_active ? 'badge-active' : 'badge-closed'}`}>
                                {curr.is_active ? 'Đang dùng' : 'Ngừng dùng'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Selected Meter Metric Cards */}
                  {selectedMeterId && (() => {
                    const curr = meterListData.meters.find((m) => m.meter_id === selectedMeterId);
                    if (!curr) return null;
                    return (
                      <div className="admin-tech-metric-strip-4">
                        <div className="admin-tech-kpi-card">
                          <span className="tech-kpi-label">Lượt theo lịch</span>
                          <span className="tech-kpi-val font-tabular">{curr.scheduled_rounds_count}</span>
                          <span className="tech-kpi-sub font-tabular">{curr.confirmed_count} đã xác nhận</span>
                        </div>
                        <div className="admin-tech-kpi-card">
                          <span className="tech-kpi-label">Xác nhận từ OCR</span>
                          <span className="tech-kpi-val text-success font-tabular">{curr.ocr_confirmed_count}</span>
                          <span className="tech-kpi-sub font-tabular">
                            {curr.confirmed_count > 0 ? `${roundVal((curr.ocr_confirmed_count / curr.confirmed_count) * 100)}%` : '—'}
                          </span>
                        </div>
                        <div className="admin-tech-kpi-card">
                          <span className="tech-kpi-label">Cần kiểm tra / Can thiệp</span>
                          <span className="tech-kpi-val text-warning font-tabular">{curr.human_intervention_rate}%</span>
                          <span className="tech-kpi-sub font-tabular">
                            Hiệu chỉnh {curr.user_corrected_count} &bull; Thủ công {curr.manual_entry_count} &bull; Cần KT {curr.review_count}
                          </span>
                        </div>
                        <div className="admin-tech-kpi-card">
                          <span className="tech-kpi-label">Độ trễ ghi nhận</span>
                          <span className="tech-kpi-val font-tabular">
                            {curr.latency_p50 !== null ? `${curr.latency_p50}m` : '—'}
                          </span>
                          <span className="tech-kpi-sub font-tabular">
                            Phân vị 95 (p95): {curr.latency_p95 !== null ? `${curr.latency_p95}m` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cumulative Reading Visualization with Scale Context (Full range, unpaginated) */}
                  {meterListData.cumulative_trend.length > 0 && (() => {
                    const points = meterListData.cumulative_trend;
                    const vals = points.map((p) => p.value);
                    const minV = Math.min(...vals);
                    const maxV = Math.max(...vals);
                    const range = maxV - minV || 1;
                    const firstPt = points[0];
                    const lastPt = points[points.length - 1];

                    return (
                      <div className="admin-surface-card">
                        <div className="admin-card-header">
                          <div className="admin-card-title-group">
                            <Activity size={15} className="text-brand" aria-hidden="true" />
                            <h2 className="admin-card-title">Chỉ số tích lũy theo thời gian</h2>
                          </div>
                          <span className="text-muted text-xs font-tabular">
                            {points.length} điểm ghi nhận &bull; Đơn vị: kWh
                          </span>
                        </div>
                        <div className="admin-card-body">
                          {/* Scale min/max badges */}
                          <div className="tech-scale-indicators font-tabular text-xs">
                            <div className="scale-pill">
                              <span className="text-muted">Chỉ số thấp nhất:</span>
                              <strong>{firstPt ? `${firstPt.canonical_reading} kWh` : '—'}</strong>
                            </div>
                            <div className="scale-pill">
                              <span className="text-muted">Chỉ số cao nhất:</span>
                              <strong>{lastPt ? `${lastPt.canonical_reading} kWh` : '—'}</strong>
                            </div>
                          </div>

                          <div className="tech-cumulative-plot-wrap">
                            <svg className="tech-cumulative-svg" viewBox="0 0 800 150" preserveAspectRatio="none">
                              {/* Background grid lines */}
                              <line x1="20" y1="20" x2="780" y2="20" stroke="var(--sgp-border)" strokeDasharray="3 3" />
                              <line x1="20" y1="75" x2="780" y2="75" stroke="var(--sgp-border)" strokeDasharray="3 3" />
                              <line x1="20" y1="130" x2="780" y2="130" stroke="var(--sgp-border)" strokeDasharray="3 3" />

                              {/* Trend polyline */}
                              {(() => {
                                const svgPoints = points
                                  .map((p, idx) => {
                                    const x = (idx / (points.length - 1 || 1)) * 760 + 20;
                                    const y = 130 - ((p.value - minV) / range) * 110;
                                    return `${x},${y}`;
                                  })
                                  .join(' ');

                                return (
                                  <>
                                    <polyline
                                      fill="none"
                                      stroke="var(--sgp-brand-600)"
                                      strokeWidth="2.5"
                                      points={svgPoints}
                                    />
                                    {points.map((p, idx) => {
                                      if (idx % Math.max(1, Math.floor(points.length / 8)) !== 0 && idx !== points.length - 1) return null;
                                      const x = (idx / (points.length - 1 || 1)) * 760 + 20;
                                      const y = 130 - ((p.value - minV) / range) * 110;
                                      return (
                                        <circle
                                          key={idx}
                                          cx={x}
                                          cy={y}
                                          r="3.5"
                                          fill="var(--sgp-brand-800)"
                                          stroke="#ffffff"
                                          strokeWidth="1.5"
                                        >
                                          <title>{p.tooltip_label}</title>
                                        </circle>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </svg>
                            <div className="tech-cumulative-x-axis font-tabular">
                              <span>{points[0]?.scheduled_time}</span>
                              <span>{points[points.length - 1]?.scheduled_time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Technical Meter History Table with Pagination & Interactive Sorting (V1.2.2) */}
                  {(() => {
                    const totalHistory = sortedHistory.length;
                    const totalHistoryPages = Math.max(1, Math.ceil(totalHistory / historyPageSize));
                    const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
                    const startIdx = (safeHistoryPage - 1) * historyPageSize;
                    const endIdx = Math.min(startIdx + historyPageSize, totalHistory);
                    const currentHistoryRows = sortedHistory.slice(startIdx, endIdx);

                    return (
                      <div className="admin-surface-card table-card">
                        <div className="admin-card-header">
                          <div className="admin-card-title-group">
                            <h2 className="admin-card-title">Lịch sử ghi nhận kỹ thuật</h2>
                            <span className="text-muted text-xs font-tabular">
                              {totalHistory.toLocaleString()} bản ghi
                            </span>
                            {totalHistory > 0 && (
                              <div className="admin-sort-indicator">
                                <span>
                                  Sắp xếp: <strong>{getSortLabel(sortField, sortOrder)}</strong>
                                </span>
                                {(sortField !== 'datetime' || sortOrder !== 'desc') && (
                                  <button
                                    type="button"
                                    className="admin-sort-reset-btn"
                                    onClick={handleResetSort}
                                    title="Đặt lại sắp xếp mặc định"
                                  >
                                    Đặt lại
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {totalHistory > 0 && (
                            <div className="admin-page-size-control">
                              <label htmlFor="history_page_size" className="text-muted text-xs">
                                Hiển thị
                              </label>
                              <select
                                id="history_page_size"
                                className="admin-select admin-select-xs font-tabular"
                                value={historyPageSize}
                                onChange={(e) => {
                                  setHistoryPageSize(Number(e.target.value));
                                  setHistoryPage(1);
                                }}
                                aria-label="Chọn số lượng bản ghi mỗi trang"
                              >
                                <option value={20}>20 / trang</option>
                                <option value={50}>50 / trang</option>
                                <option value={100}>100 / trang</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {totalHistory > 0 ? (
                          <>
                            <div className="admin-table-container">
                              <table className="admin-table admin-tech-table admin-sticky-header-table" aria-label="Lịch sử ghi nhận công tơ">
                                <thead>
                                  <tr>
                                    <th
                                      scope="col"
                                      className={`sortable-th ${sortField === 'datetime' ? 'active-sort' : ''}`}
                                      onClick={() => handleSortClick('datetime')}
                                      title="Bấm để sắp xếp theo Ngày & Lượt"
                                      role="columnheader"
                                      aria-sort={sortField === 'datetime' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                                    >
                                      <span className="sortable-th-content">
                                        <span>Ngày</span>
                                        <span className="sort-icon">
                                          {sortField === 'datetime' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                          ) : (
                                            <ArrowUpDown size={13} />
                                          )}
                                        </span>
                                      </span>
                                    </th>
                                    <th scope="col">Lượt</th>
                                    <th
                                      scope="col"
                                      className={`sortable-th ${sortField === 'status' ? 'active-sort' : ''}`}
                                      onClick={() => handleSortClick('status')}
                                      title="Bấm để sắp xếp theo Trạng thái"
                                      role="columnheader"
                                      aria-sort={sortField === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                                    >
                                      <span className="sortable-th-content">
                                        <span>Trạng thái</span>
                                        <span className="sort-icon">
                                          {sortField === 'status' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                          ) : (
                                            <ArrowUpDown size={13} />
                                          )}
                                        </span>
                                      </span>
                                    </th>
                                    <th
                                      scope="col"
                                      className={`sortable-th ${sortField === 'reading' ? 'active-sort' : ''}`}
                                      onClick={() => handleSortClick('reading')}
                                      title="Bấm để sắp xếp theo Chỉ số chính thức"
                                      role="columnheader"
                                      aria-sort={sortField === 'reading' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                                    >
                                      <span className="sortable-th-content">
                                        <span>Chỉ số chính thức</span>
                                        <span className="sort-icon">
                                          {sortField === 'reading' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                          ) : (
                                            <ArrowUpDown size={13} />
                                          )}
                                        </span>
                                      </span>
                                    </th>
                                    <th scope="col">OCR ban đầu</th>
                                    <th scope="col">Nguồn xác nhận</th>
                                    <th
                                      scope="col"
                                      className={`sortable-th ${sortField === 'recorded_at' ? 'active-sort' : ''}`}
                                      onClick={() => handleSortClick('recorded_at')}
                                      title="Bấm để sắp xếp theo Thời gian ghi nhận"
                                      role="columnheader"
                                      aria-sort={sortField === 'recorded_at' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                                    >
                                      <span className="sortable-th-content">
                                        <span>Ghi nhận lúc</span>
                                        <span className="sort-icon">
                                          {sortField === 'recorded_at' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                          ) : (
                                            <ArrowUpDown size={13} />
                                          )}
                                        </span>
                                      </span>
                                    </th>
                                    <th scope="col">Người ghi</th>
                                    <th scope="col" className="text-center">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentHistoryRows.map((h) => {
                                    let srcLabel = '—';
                                    let srcClass = '';
                                    if (h.confirmation_source === 'OCR_CONFIRMED') {
                                      srcLabel = 'Xác nhận từ OCR';
                                      srcClass = 'text-success';
                                    } else if (h.confirmation_source === 'USER_CORRECTED') {
                                      srcLabel = 'Đã hiệu chỉnh';
                                      srcClass = 'text-warning font-semibold';
                                    } else if (h.confirmation_source === 'MANUAL_ENTRY') {
                                      srcLabel = 'Nhập thủ công';
                                      srcClass = 'text-muted';
                                    }

                                    return (
                                      <tr key={h.id}>
                                        <td className="font-tabular text-xs">{h.date}</td>
                                        <td className="font-tabular font-bold text-brand">{h.scheduled_time}</td>
                                        <td>
                                          <span className={`admin-badge ${h.status === 'CONFIRMED' ? 'badge-active' : 'badge-past'} font-tabular`}>
                                            {h.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Cần kiểm tra'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="font-mono font-bold font-tabular">
                                            {h.reading ? `${h.reading} kWh` : '—'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="font-mono text-muted font-tabular text-xs">
                                            {h.ocr_reading || (h.confirmation_source === 'MANUAL_ENTRY' ? 'Không có' : '—')}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={`font-tabular text-xs ${srcClass}`}>
                                            {srcLabel}
                                          </span>
                                        </td>
                                        <td className="text-muted font-tabular text-xs">{h.recorded_at}</td>
                                        <td className="text-muted text-xs">{h.operator_name}</td>
                                        <td className="text-center">
                                          {onInspectReading ? (
                                            <button
                                              type="button"
                                              className="admin-btn-table-action"
                                              onClick={() => onInspectReading(h.id)}
                                              title="Kiểm tra bản ghi chi tiết"
                                            >
                                              Xem
                                            </button>
                                          ) : (
                                            <span className="text-muted text-xs">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="admin-pagination-bar">
                              <span className="font-tabular text-xs text-muted">
                                Hiển thị {startIdx + 1}–{endIdx} trong {totalHistory.toLocaleString()} bản ghi
                              </span>

                              {totalHistoryPages > 1 && (
                                <div className="admin-pagination-stepper" role="navigation" aria-label="Phân trang lịch sử công tơ">
                                  <button
                                    type="button"
                                    className="admin-pagination-btn"
                                    disabled={safeHistoryPage <= 1}
                                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                    aria-label="Trang trước"
                                    title="Trang trước"
                                  >
                                    ‹
                                  </button>

                                  {getPageNumbers(safeHistoryPage, totalHistoryPages).map((p, idx) => {
                                    if (p === '...') {
                                      return (
                                        <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis" aria-hidden="true">
                                          …
                                        </span>
                                      );
                                    }
                                    const pageNum = Number(p);
                                    const isCurrent = pageNum === safeHistoryPage;
                                    return (
                                      <button
                                        key={pageNum}
                                        type="button"
                                        className={`admin-pagination-btn ${isCurrent ? 'active' : ''}`}
                                        onClick={() => setHistoryPage(pageNum)}
                                        aria-label={`Trang ${pageNum}`}
                                        aria-current={isCurrent ? 'page' : undefined}
                                      >
                                        {pageNum}
                                      </button>
                                    );
                                  })}

                                  <button
                                    type="button"
                                    className="admin-pagination-btn"
                                    disabled={safeHistoryPage >= totalHistoryPages}
                                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                                    aria-label="Trang sau"
                                    title="Trang sau"
                                  >
                                    ›
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="admin-empty-state-card" style={{ padding: '24px', textAlign: 'center' }}>
                            <p className="text-muted text-sm m-0">Chưa có dữ liệu ghi nhận trong khoảng thời gian đã chọn.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: NGOẠI LỆ & DỮ LIỆU (DISTINCT COUNTS & DENSE TABLE)  */}
          {/* ======================================================== */}
          {activeTab === 'data' && (
            <div className="admin-tech-content">
              {/* Filter Pills with Distinct Totals from Overview Summary */}
              <div className="admin-data-filter-bar" role="toolbar" aria-label="Bộ lọc kiểm toán bản ghi">
                <button
                  type="button"
                  className={`admin-data-pill ${detailsStatusFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setDetailsStatusFilter('ALL')}
                >
                  Tất cả ({overviewData.summary.total_due_slots.toLocaleString()})
                </button>
                <button
                  type="button"
                  className={`admin-data-pill ${detailsStatusFilter === 'REVIEW' ? 'active' : ''}`}
                  onClick={() => setDetailsStatusFilter('REVIEW')}
                >
                  Cần kiểm tra ({overviewData.summary.total_review})
                </button>
                <button
                  type="button"
                  className={`admin-data-pill ${detailsStatusFilter === 'MISSING' ? 'active' : ''}`}
                  onClick={() => setDetailsStatusFilter('MISSING')}
                >
                  Chưa ghi ({overviewData.summary.total_missing})
                </button>
                <button
                  type="button"
                  className={`admin-data-pill ${detailsStatusFilter === 'USER_CORRECTED' ? 'active' : ''}`}
                  onClick={() => setDetailsStatusFilter('USER_CORRECTED')}
                >
                  Đã hiệu chỉnh ({overviewData.summary.user_corrected_count})
                </button>
                <button
                  type="button"
                  className={`admin-data-pill ${detailsStatusFilter === 'MANUAL_ENTRY' ? 'active' : ''}`}
                  onClick={() => setDetailsStatusFilter('MANUAL_ENTRY')}
                >
                  Nhập thủ công ({overviewData.summary.manual_entry_count})
                </button>
              </div>

              {/* Technical Details Dense Table */}
              {detailsLoading && !detailsData ? (
                <LoadingState message="Đang tải dữ liệu chi tiết..." />
              ) : detailsError ? (
                <ErrorState title="Lỗi tải dữ liệu" message={detailsError} onRetry={() => loadDetailsData(detailsPage)} />
              ) : detailsData && (
                <div className="admin-surface-card table-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Kiểm toán bản ghi kỹ thuật</h2>
                    <span className="text-muted text-xs font-tabular">
                      Hiển thị {detailsData.total.toLocaleString()} bản ghi (Trang {detailsPage} / {Math.max(1, Math.ceil(detailsData.total / 50))})
                    </span>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table admin-tech-table admin-sticky-header-table" aria-label="Bảng kiểm toán bản ghi chi tiết">
                      <thead>
                        <tr>
                          <th scope="col">NGÀY</th>
                          <th scope="col">LƯỢT</th>
                          <th scope="col">MÃ CÔNG TƠ</th>
                          <th scope="col">TÊN / VỊ TRÍ</th>
                          <th scope="col">TRẠNG THÁI</th>
                          <th scope="col">CHỈ SỐ CHÍNH THỨC</th>
                          <th scope="col">OCR BAN ĐẦU</th>
                          <th scope="col">NGUỒN</th>
                          <th scope="col">GHI NHẬN LÚC</th>
                          <th scope="col">NGƯỜI GHI</th>
                          <th scope="col" className="text-center">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsData.items.map((row) => {
                          let stBadge = <span className="admin-badge badge-active">Đã xác nhận</span>;
                          if (row.status === 'REVIEW') {
                            stBadge = <span className="admin-badge badge-past">Cần KT</span>;
                          } else if (row.status === 'MISSING') {
                            stBadge = <span className="admin-badge badge-closed">Chưa ghi</span>;
                          }

                          let srcText = '—';
                          if (row.confirmation_source === 'OCR_CONFIRMED') srcText = 'OCR';
                          else if (row.confirmation_source === 'USER_CORRECTED') srcText = 'Hiệu chỉnh';
                          else if (row.confirmation_source === 'MANUAL_ENTRY') srcText = 'Thủ công';

                          return (
                            <tr key={row.id}>
                              <td className="font-tabular text-xs">{row.date}</td>
                              <td className="font-tabular font-bold text-brand">{row.scheduled_time}</td>
                              <td className="font-mono font-bold font-tabular">{row.meter_code}</td>
                              <td>
                                <div className="admin-cell-two-line">
                                  <span className="font-medium text-xs text-ink">{row.meter_name}</span>
                                  <span className="text-muted text-xs">{row.location}</span>
                                </div>
                              </td>
                              <td>{stBadge}</td>
                              <td>
                                <span className="font-mono font-bold font-tabular">
                                  {row.reading ? `${row.reading} kWh` : '—'}
                                </span>
                              </td>
                              <td>
                                <span className="font-mono text-muted font-tabular text-xs">
                                  {row.ocr_reading || '—'}
                                </span>
                              </td>
                              <td className="font-tabular text-xs">{srcText}</td>
                              <td className="text-muted font-tabular text-xs">{row.recorded_at || '—'}</td>
                              <td className="text-muted text-xs">{row.operator_name || '—'}</td>
                              <td className="text-center">
                                {row.status !== 'MISSING' && onInspectReading ? (
                                  <button
                                    type="button"
                                    className="admin-btn-table-action"
                                    onClick={() => onInspectReading(row.id)}
                                    title="Kiểm tra chi tiết bản ghi"
                                  >
                                    Kiểm tra
                                  </button>
                                ) : (
                                  <span className="text-muted text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  {detailsData.total > 50 && (
                    <div className="admin-pagination-bar">
                      <button
                        type="button"
                        className="admin-btn-secondary btn-sm"
                        disabled={detailsPage <= 1 || detailsLoading}
                        onClick={() => loadDetailsData(detailsPage - 1)}
                      >
                        Trang trước
                      </button>
                      <span className="font-tabular text-xs text-muted">
                        Trang {detailsPage} / {Math.ceil(detailsData.total / 50)}
                      </span>
                      <button
                        type="button"
                        className="admin-btn-secondary btn-sm"
                        disabled={detailsPage >= Math.ceil(detailsData.total / 50) || detailsLoading}
                        onClick={() => loadDetailsData(detailsPage + 1)}
                      >
                        Trang sau
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
        )
      )}

      {/* 5. AUDIT LOG TAB CONTENT */}
      {activeTab === 'audit' && (
        <div className="admin-tech-content" style={{ marginTop: '12px' }}>
          <AdminAudit />
        </div>
      )}
    </div>
  );
};

function roundVal(val: number): number {
  return Math.round(val * 10) / 10;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}
