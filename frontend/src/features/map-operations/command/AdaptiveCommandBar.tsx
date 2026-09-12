import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Map as MapIcon,
  List as ListIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  MoreVertical,
  RefreshCw,
  Download,
  Layers,
  Maximize,
  Minimize,
  Compass,
  X,
  MapPin,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';
import type {
  AdminDashboardRoundProgress,
  User,
  MapWorkspaceView,
} from '../../../types';
import { formatUserRole, canAdministerMapConfiguration } from '../../../types';
import type { MapMeterItem, MapOperationalZone, MapFilterOptions } from '../types';
import { deriveCommandBarModel } from './commandBarModel';

export interface AdaptiveCommandBarProps {
  user?: User;
  viewMode: MapWorkspaceView;
  onViewModeChange: (mode: MapWorkspaceView) => void;

  // Temporal
  selectedDate: string;
  onDateChange: (date: string) => void;
  rounds: AdminDashboardRoundProgress[];
  selectedRoundId?: string;
  onSelectRound: (roundId: string) => void;
  currentRoundTime?: string | null;

  // KPIs / Telemetry
  overallKpis: {
    total: number;
    confirmed: number;
    overdue: number;
    review: number;
    pending: number;
    percent: number;
    currentRoundTime?: string | null;
    currentRoundStatus?: string | null;
  };

  // Filters & Search
  filters: MapFilterOptions;
  onApplyFilters: (filters: MapFilterOptions) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;

  // Search suggestions in Map mode
  mapMeters?: MapMeterItem[];
  mapZones?: MapOperationalZone[];
  availableOperators?: User[];
  onSelectMeter?: (meterId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  onSelectOperator?: (operatorId: string) => void;

  // Actions
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv: () => void;
  onOpenAnalytics: () => void;
  onOpenCalibration?: () => void;
  onToggleLegend?: () => void;
  isLegendOpen?: boolean;

  // Back context if in placement / workflow
  onBack?: () => void;
  backLabel?: string;
}

export const AdaptiveCommandBar: React.FC<AdaptiveCommandBarProps> = ({
  user,
  viewMode,
  onViewModeChange,
  selectedDate,
  onDateChange,
  rounds = [],
  selectedRoundId,
  onSelectRound,
  currentRoundTime,
  overallKpis,
  filters,
  onApplyFilters,
  searchQuery,
  onSearchQueryChange,
  mapMeters = [],
  mapZones = [],
  availableOperators = [],
  onSelectMeter,
  onSelectZone,
  onSelectOperator,
  onRefresh,
  isLoading,
  onExportCsv,
  onOpenAnalytics,
  onOpenCalibration,
  onToggleLegend,
  isLegendOpen: _isLegendOpen = false,
  onBack,
  backLabel,
}) => {
  // 1. Viewport width & manual compact mode
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [isCompactManual, setIsCompactManual] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cmd_bar_compact') === '1';
    } catch {
      return false;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleCompact = () => {
    setIsCompactManual((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem('cmd_bar_compact', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 2. Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.zoneId && filters.zoneId !== 'ALL') count++;
    if (filters.status && filters.status !== 'ALL') count++;
    if (filters.operatorId && filters.operatorId !== 'ALL') count++;
    return count;
  }, [filters]);

  const isAdmin = canAdministerMapConfiguration(user);

  // 3. Derived Command Bar Model
  const model = useMemo(() => {
    return deriveCommandBarModel({
      viewMode,
      viewportWidth,
      isCompact: isCompactManual,
      activeFilterCount,
      isAdmin,
    });
  }, [viewMode, viewportWidth, isCompactManual, activeFilterCount, isAdmin]);

  // 4. Dropdown states & click-outside handling
  const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);
  const roundDropdownRef = useRef<HTMLDivElement>(null);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (roundDropdownRef.current && !roundDropdownRef.current.contains(target)) {
        setIsRoundDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        !searchQuery
      ) {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // Auto-focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchExpanded]);

  // Active round label
  const activeIdx =
    rounds && rounds.length > 0
      ? selectedRoundId
        ? rounds.findIndex((r) => r.round_id === selectedRoundId)
        : rounds.findIndex((r) => r.timing_state === 'CURRENT')
      : -1;

  const currentRound = activeIdx >= 0 ? rounds[activeIdx] : null;
  const shiftDisplayLabel = currentRound
    ? `Ca 1 (${currentRound.scheduled_time})`
    : currentRoundTime
    ? `Ca 1 (${currentRoundTime})`
    : 'Ca 1 (06:00 - 14:00)';

  const userInitial = user?.full_name?.charAt(0)?.toUpperCase() || 'P';
  const userRole = user ? formatUserRole(user.role) : 'Quản trị viên';
  const issueCount = overallKpis.overdue + overallKpis.review;

  // Search matching results in Map Mode
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || viewMode !== 'map') return { meters: [], zones: [], operators: [] };

    const matchedMeters = mapMeters
      .filter((m) => (m.meterCode || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q))
      .slice(0, 5);

    const matchedZones = mapZones
      .filter((z) => (z.name || '').toLowerCase().includes(q) || (z.code || '').toLowerCase().includes(q))
      .slice(0, 3);

    const matchedOps = availableOperators
      .filter((o) => o.full_name?.toLowerCase().includes(q) || o.employee_code?.toLowerCase().includes(q))
      .slice(0, 3);

    return { meters: matchedMeters, zones: matchedZones, operators: matchedOps };
  }, [searchQuery, viewMode, mapMeters, mapZones, availableOperators]);

  const hasSearchResults =
    searchResults.meters.length > 0 ||
    searchResults.zones.length > 0 ||
    searchResults.operators.length > 0;

  return (
    <header
      className="sgp-hud-top-bar sgp-adaptive-command-bar"
      role="toolbar"
      aria-label="Thanh điều hành tác nghiệp cảng"
    >
      {/* ============================================================ */}
      {/* 1. LEFT GROUP: IDENTITY + CONTEXTUAL BACK                    */}
      {/* ============================================================ */}
      <div className="sgp-cmd-left-group">
        {onBack ? (
          <button
            type="button"
            className="sgp-cmd-back-btn"
            onClick={onBack}
            title={backLabel || 'Quay lại'}
            aria-label={backLabel || 'Quay lại'}
          >
            ← <span className="sgp-cmd-back-label">{backLabel || 'Quay lại'}</span>
          </button>
        ) : (
          <div className="sgp-cmd-identity" title="Cảng Sài Gòn — Cảng Tân Thuận">
            <img src="/icon-192.png" alt="Cảng Sài Gòn" className="sgp-cmd-logo" />
            {!model.compactIdentity && (
              <div className="sgp-cmd-title-wrap">
                <span className="sgp-cmd-brand-title">CẢNG TÂN THUẬN</span>
                <span className="sgp-cmd-sub-title">
                  {viewMode === 'map' ? 'Bản đồ công tơ' : 'Danh sách công tơ'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. CENTER GROUP: TEMPORAL + VIEW SWITCH                      */}
      {/* ============================================================ */}
      <div className="sgp-cmd-center-group">
        {/* Date Picker */}
        <div className="sgp-cmd-date-wrap">
          <VnDatePicker
            value={selectedDate}
            onChange={onDateChange}
            disabled={isLoading}
            size="sm"
            title="Chọn ngày tác nghiệp"
            ariaLabel="Chọn ngày tác nghiệp"
          />
        </div>

        <span className="sgp-cmd-divider" aria-hidden="true">·</span>

        {/* Round / Shift Dropdown Trigger & Compact Popover (replaces bottom timeline) */}
        <div className="sgp-cmd-round-picker" ref={roundDropdownRef}>
          <button
            type="button"
            className={`sgp-cmd-round-trigger ${isRoundDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsRoundDropdownOpen((prev) => !prev)}
            disabled={isLoading || rounds.length === 0}
            aria-haspopup="listbox"
            aria-expanded={isRoundDropdownOpen}
            title="Chọn ca và lượt tác nghiệp"
          >
            <Clock size={13} className="text-cyan-400" aria-hidden="true" />
            <span className="font-tabular font-medium">{shiftDisplayLabel}</span>
            <ChevronDown
              size={12}
              className={`sgp-cmd-chevron ${isRoundDropdownOpen ? 'rotate' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* Compact Rounds Popover (Section 12: Unified Temporal Navigation) */}
          {isRoundDropdownOpen && (
            <div
              className="sgp-cmd-round-popover"
              role="listbox"
              aria-label="Danh sách lượt ghi trong ca"
            >
              <div className="sgp-cmd-popover-header">
                <span>Lượt ghi ngày {selectedDate}</span>
                <span className="sgp-cmd-popover-progress font-tabular">
                  {overallKpis.percent}% hoàn tất
                </span>
              </div>
              <div className="sgp-cmd-round-list">
                {rounds.map((r) => {
                  const isSelected = r.round_id === selectedRoundId;
                  const isCurrent = r.timing_state === 'CURRENT';
                  const percent = Math.round(r.completion_percent);
                  return (
                    <button
                      key={r.round_id}
                      type="button"
                      className={`sgp-cmd-round-row ${isSelected ? 'active' : ''} ${
                        isCurrent ? 'current' : ''
                      }`}
                      onClick={() => {
                        onSelectRound(r.round_id);
                        setIsRoundDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={12} className={isCurrent ? 'text-amber-400' : 'text-slate-400'} />
                        <span className="font-tabular font-semibold">{r.scheduled_time}</span>
                        {isCurrent && <span className="sgp-cmd-current-badge">Đang ghi</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-tabular text-xs text-slate-300">
                          {percent}%
                        </span>
                        <div className="sgp-cmd-mini-bar">
                          <div
                            className="sgp-cmd-mini-fill"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: percent === 100 ? '#10B981' : '#0284C7',
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <span className="sgp-cmd-divider" aria-hidden="true">·</span>

        {/* View Switch: [Bản đồ] | [Danh sách] */}
        <div
          className="sgp-cmd-view-switch"
          role="radiogroup"
          aria-label="Chế độ hiển thị tác nghiệp"
        >
          <div
            className={`sgp-cmd-switch-pill ${viewMode === 'list' ? 'right' : 'left'}`}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`sgp-cmd-switch-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
            role="radio"
            aria-checked={viewMode === 'map'}
            title="Chuyển sang chế độ Bản đồ không gian"
          >
            <MapIcon size={14} aria-hidden="true" />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-cmd-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            role="radio"
            aria-checked={viewMode === 'list'}
            title="Chuyển sang chế độ Danh sách công tơ"
          >
            <ListIcon size={14} aria-hidden="true" />
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. RIGHT GROUP: CONTEXT-AWARE TOOLS                          */}
      {/* ============================================================ */}
      <div className="sgp-cmd-right-group">
        {/* INLINE EXPANDING SEARCH (Section 13) */}
        {model.showSearch && (
          <div
            className={`sgp-cmd-search-wrap ${isSearchExpanded || searchQuery ? 'expanded' : ''}`}
            ref={searchContainerRef}
          >
            {!isSearchExpanded && !searchQuery ? (
              <button
                type="button"
                className="sgp-cmd-tool-btn"
                onClick={() => setIsSearchExpanded(true)}
                title={viewMode === 'map' ? 'Tìm công tơ, khu vực, nhân sự (Ctrl+F)' : 'Tìm trong danh sách'}
                aria-label="Tìm kiếm"
              >
                <Search size={15} />
              </button>
            ) : (
              <div className="sgp-cmd-search-input-box">
                <Search size={14} className="sgp-cmd-search-prefix" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="sgp-cmd-search-input"
                  placeholder={
                    viewMode === 'map'
                      ? 'Tìm công tơ, khu vực, nhân sự...'
                      : 'Tìm theo mã hoặc tên công tơ...'
                  }
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      onSearchQueryChange('');
                      setIsSearchExpanded(false);
                    }
                  }}
                  aria-label="Nhập từ khóa tìm kiếm"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="sgp-cmd-search-clear"
                    onClick={() => {
                      onSearchQueryChange('');
                      searchInputRef.current?.focus();
                    }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sgp-cmd-search-close"
                    onClick={() => setIsSearchExpanded(false)}
                    title="Đóng tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Map Search Suggestions Dropdown */}
            {isSearchExpanded && searchQuery && viewMode === 'map' && hasSearchResults && (
              <div className="sgp-cmd-search-dropdown" role="listbox">
                {searchResults.zones.length > 0 && (
                  <div className="sgp-cmd-search-group">
                    <span className="sgp-cmd-search-header">Khu vực</span>
                    {searchResults.zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        className="sgp-cmd-search-item"
                        onClick={() => {
                          onSelectZone?.(z.id);
                          setIsSearchExpanded(false);
                        }}
                      >
                        <MapPin size={13} className="text-cyan-400" />
                        <span className="truncate">{z.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.meters.length > 0 && (
                  <div className="sgp-cmd-search-group">
                    <span className="sgp-cmd-search-header">Công tơ</span>
                    {searchResults.meters.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="sgp-cmd-search-item"
                        onClick={() => {
                          onSelectMeter?.(m.id);
                          setIsSearchExpanded(false);
                        }}
                      >
                        <Zap size={13} className="text-amber-400" />
                        <span className="font-tabular font-medium">{m.meterCode}</span>
                        <span className="truncate text-slate-400 text-xs">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.operators.length > 0 && (
                  <div className="sgp-cmd-search-group">
                    <span className="sgp-cmd-search-header">Nhân sự</span>
                    {searchResults.operators.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="sgp-cmd-search-item"
                        onClick={() => {
                          onSelectOperator?.(o.id);
                          setIsSearchExpanded(false);
                        }}
                      >
                        <UserIcon size={13} className="text-emerald-400" />
                        <span className="truncate">{o.full_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ANCHORED FILTER (Section 14) */}
        {model.showFilter && (
          <div className="sgp-cmd-filter-wrap" ref={filterDropdownRef}>
            <button
              type="button"
              className={`sgp-cmd-tool-btn ${activeFilterCount > 0 ? 'active' : ''}`}
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              title={`Bộ lọc tác nghiệp ${activeFilterCount > 0 ? `(${activeFilterCount} đang bật)` : ''}`}
              aria-label="Bộ lọc"
              aria-expanded={isFilterDropdownOpen}
            >
              <Filter size={15} />
              {activeFilterCount > 0 && (
                <span className="sgp-cmd-filter-badge font-tabular">{activeFilterCount}</span>
              )}
            </button>

            {/* Anchored Filter Popover */}
            {isFilterDropdownOpen && (
              <div className="sgp-cmd-filter-popover" role="dialog" aria-label="Bộ lọc tác nghiệp">
                <div className="sgp-cmd-popover-header">
                  <span className="font-medium">Bộ lọc tác nghiệp</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      className="sgp-cmd-filter-reset-btn"
                      onClick={() => {
                        onApplyFilters({ ...filters, zoneId: 'ALL', status: 'ALL', operatorId: 'ALL' });
                      }}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
                <div className="sgp-cmd-filter-body">
                  {/* Status filter */}
                  <div className="sgp-cmd-filter-field">
                    <label className="sgp-cmd-filter-label">Trạng thái:</label>
                    <select
                      className="sgp-cmd-filter-select"
                      value={filters.status || 'ALL'}
                      onChange={(e) => onApplyFilters({ ...filters, status: e.target.value as any })}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="CONFIRMED">Đã ghi hoàn tất</option>
                      <option value="OVERDUE">Quá hạn</option>
                      <option value="REVIEW">Cần kiểm tra</option>
                      <option value="PENDING">Chờ ghi</option>
                    </select>
                  </div>

                  {/* Zone filter */}
                  <div className="sgp-cmd-filter-field">
                    <label className="sgp-cmd-filter-label">Khu vực:</label>
                    <select
                      className="sgp-cmd-filter-select"
                      value={filters.zoneId || 'ALL'}
                      onChange={(e) => onApplyFilters({ ...filters, zoneId: e.target.value })}
                    >
                      <option value="ALL">Toàn bộ 6 phân khu</option>
                      {mapZones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator filter */}
                  <div className="sgp-cmd-filter-field">
                    <label className="sgp-cmd-filter-label">Nhân sự:</label>
                    <select
                      className="sgp-cmd-filter-select"
                      value={filters.operatorId || 'ALL'}
                      onChange={(e) => onApplyFilters({ ...filters, operatorId: e.target.value })}
                    >
                      <option value="ALL">Tất cả nhân sự</option>
                      {availableOperators.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name} ({o.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INLINE TELEMETRY (Section 10, 19: Interactive Progress Status -> Analytics) */}
        {model.showTelemetry && (
          <button
            type="button"
            className="sgp-cmd-telemetry-pill"
            onClick={onOpenAnalytics}
            title="Nhấp để mở Phân tích chất lượng vận hành"
            aria-label="Chỉ số vận hành: nhấp để mở phân tích"
          >
            {issueCount > 0 ? (
              <>
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                <span className="font-tabular font-semibold text-amber-300">
                  {model.compactTelemetry
                    ? `⚠ ${issueCount} · ${overallKpis.confirmed}/${overallKpis.total}`
                    : `⚠ ${issueCount} · ${overallKpis.confirmed}/${overallKpis.total}`}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="font-tabular font-medium text-emerald-300">
                  {model.compactTelemetry
                    ? `✓ ${overallKpis.confirmed}/${overallKpis.total}`
                    : `✓ ${overallKpis.confirmed}/${overallKpis.total} hoàn tất`}
                </span>
              </>
            )}
          </button>
        )}

        {/* OVERFLOW MENU (Section 11, 12: Absolute Deduplication) */}
        {model.showOverflowMenu && (
          <div className="sgp-cmd-overflow-wrap" ref={menuRef}>
            <button
              type="button"
              className="sgp-cmd-tool-btn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="Tùy chọn khác"
              aria-label="Tùy chọn khác"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div className="sgp-cmd-overflow-menu" role="menu">
                {model.overflowItems.map((item) => {
                  let icon: React.ReactNode = null;
                  let onClick = () => {};

                  switch (item.id) {
                    case 'refresh':
                      icon = <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />;
                      onClick = () => onRefresh();
                      break;
                    case 'export-csv':
                      icon = <Download size={14} />;
                      onClick = () => onExportCsv();
                      break;
                    case 'analytics':
                      icon = <BarChart3 size={14} />;
                      onClick = () => onOpenAnalytics();
                      break;
                    case 'legend':
                      icon = <Layers size={14} />;
                      onClick = () => onToggleLegend?.();
                      break;
                    case 'fullscreen':
                      icon = isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />;
                      onClick = () => handleToggleFullscreen();
                      break;
                    case 'calibration':
                      icon = <Compass size={14} className="text-amber-400" />;
                      onClick = () => onOpenCalibration?.();
                      break;
                  }

                  const isAdminItem = item.category === 'admin';

                  return (
                    <React.Fragment key={item.id}>
                      {isAdminItem && <div className="sgp-cmd-menu-divider" role="separator" />}
                      <button
                        type="button"
                        className={`sgp-cmd-menu-item ${isAdminItem ? 'admin-item' : ''}`}
                        onClick={() => {
                          onClick();
                          setIsMenuOpen(false);
                        }}
                        role="menuitem"
                      >
                        {icon}
                        <span className={isAdminItem ? 'font-medium text-amber-200' : ''}>
                          {item.label}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* USER PROFILE CHIP */}
        {model.showProfileChip && (
          <div
            className="sgp-user-chip"
            title={`${user?.full_name || 'Người dùng'} (${userRole})`}
            role="status"
          >
            <div className="sgp-user-avatar" aria-hidden="true">
              {userInitial}
            </div>
          </div>
        )}

        {/* COMPACT / EXPAND TOGGLE (Section 16) */}
        {model.showCompactToggle && (
          <button
            type="button"
            className="sgp-cmd-compact-toggle"
            onClick={handleToggleCompact}
            title={isCompactManual ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
            aria-label={isCompactManual ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCompactManual ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>
    </header>
  );
};
