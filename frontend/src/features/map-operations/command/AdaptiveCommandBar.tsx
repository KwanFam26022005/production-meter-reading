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
  MoreVertical,
  RefreshCw,
  Download,
  BarChart3,
  Compass,
  X,
  MapPin,
  User as UserIcon,
  Zap,
  Check,
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
import { CommandPopoverSurface } from './CommandPopoverSurface';

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

  // Controlled collapse state (V13.3)
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export type ActiveCommandSurfaceType = 'shift' | 'search' | 'filter' | 'overflow' | null;

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
  onBack,
  backLabel,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  // 1. Full Collapse State (Section 4: EXPANDED vs COLLAPSED)
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cmd_bar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(true);
    } else {
      setInternalCollapsed(true);
    }
    try {
      sessionStorage.setItem('cmd_bar_collapsed', '1');
    } catch {}
  };

  const handleExpand = () => {
    if (onToggleCollapse) {
      onToggleCollapse(false);
    } else {
      setInternalCollapsed(false);
    }
    try {
      sessionStorage.setItem('cmd_bar_collapsed', '0');
    } catch {}
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
      isCollapsed,
      activeFilterCount,
      isAdmin,
    });
  }, [viewMode, viewportWidth, isCollapsed, activeFilterCount, isAdmin]);

  // 4. Single Open Popover Surface (Section 16 & 17: Mutual Exclusivity)
  const [activeSurface, setActiveSurface] = useState<ActiveCommandSurfaceType>(null);

  const toggleSurface = (surface: 'shift' | 'search' | 'filter' | 'overflow') => {
    setActiveSurface((prev) => (prev === surface ? null : surface));
  };

  const closeSurface = () => setActiveSurface(null);

  // Anchor Refs for portal popover positioning
  const shiftAnchorRef = useRef<HTMLButtonElement>(null);
  const searchAnchorRef = useRef<HTMLButtonElement>(null);
  const filterAnchorRef = useRef<HTMLButtonElement>(null);
  const overflowAnchorRef = useRef<HTMLButtonElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when search popover opens
  useEffect(() => {
    if (activeSurface === 'search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [activeSurface]);

  // 5. Draft Filter State for custom popover
  const [draftFilters, setDraftFilters] = useState<MapFilterOptions>(filters);

  // Synchronize draft filter on popover open
  useEffect(() => {
    if (activeSurface === 'filter') {
      setDraftFilters(filters);
    }
  }, [activeSurface, filters]);

  // Active round derivation
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

  // Effective rounds list for dropdown (ensures at least 1 selectable item)
  const displayRounds: AdminDashboardRoundProgress[] = useMemo(() => {
    if (rounds && rounds.length > 0) return rounds;
    return [
      {
        round_id: 'default-round-1',
        scheduled_time: currentRoundTime || '06:00 - 14:00',
        timing_state: 'CURRENT',
        completion_percent: overallKpis.percent || 0,
        completed_meters: overallKpis.confirmed,
        total_meters: overallKpis.total,
      } as unknown as AdminDashboardRoundProgress,
    ];
  }, [rounds, currentRoundTime, overallKpis]);

  // =========================================================================
  // RENDER: COLLAPSED STATE (V13.3 Section 1: Right-Anchored Avatar Shell)
  // Exactly one avatar button [P] at the same right-edge location (right: 16px)
  // occupied by profile in expanded mode. Contracts inward; no teleporting.
  // =========================================================================
  if (isCollapsed) {
    return (
      <header
        className="sgp-hud-top-bar sgp-adaptive-command-bar collapsed"
        role="toolbar"
        aria-label="Thanh điều hành tác nghiệp (Đã thu gọn)"
        style={{
          position: 'absolute',
          top: '14px',
          right: '16px',
          left: 'auto',
          transformOrigin: 'right center',
          width: '44px',
          height: '44px',
          padding: 0,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          className="sgp-cmd-avatar-trigger"
          onClick={handleExpand}
          title="Mở thanh công cụ"
          aria-label="Mở thanh công cụ"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: 'rgba(6, 29, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45)',
            color: '#38BDF8',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 180ms ease',
          }}
        >
          <span className="sgp-cmd-avatar-initial">{userInitial}</span>
        </button>
      </header>
    );
  }

  // =========================================================================
  // RENDER: EXPANDED COMMAND BAR (Right-Anchored, Section 1-10)
  // =========================================================================
  return (
    <>
      <header
        className="sgp-hud-top-bar sgp-adaptive-command-bar expanded"
        role="toolbar"
        aria-label="Thanh điều hành tác nghiệp cảng"
        style={{
          position: 'absolute',
          top: '14px',
          right: '16px',
          left: 'auto',
          transformOrigin: 'right center',
          width: 'auto',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 40,
        }}
      >
        {/* ============================================================ */}
        {/* 1. LEFT GROUP: BACK BUTTON ONLY (Branding removed in V13.2)  */}
        {/* ============================================================ */}
        {onBack && (
          <div className="sgp-cmd-left-group">
            <button
              type="button"
              className="sgp-cmd-back-btn"
              onClick={onBack}
              title={backLabel || 'Quay lại'}
              aria-label={backLabel || 'Quay lại'}
            >
              ← <span className="sgp-cmd-back-label">{backLabel || 'Quay lại'}</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. CENTER GROUP: COHERENT TEMPORAL GROUP + VIEW SWITCH       */}
        {/* ============================================================ */}
        <div className="sgp-cmd-center-group">
          {/* Combined Temporal Context Group (Section 6) */}
          <div className="sgp-cmd-temporal-group">
            {/* Date Picker Trigger */}
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

            {/* Shift Trigger Button */}
            <button
              ref={shiftAnchorRef}
              type="button"
              className={`sgp-cmd-round-trigger ${activeSurface === 'shift' ? 'open' : ''}`}
              onClick={() => toggleSurface('shift')}
              disabled={isLoading}
              aria-haspopup="listbox"
              aria-expanded={activeSurface === 'shift'}
              title="Chọn ca và lượt tác nghiệp"
            >
              <Clock size={13} className="text-cyan-400 shrink-0" aria-hidden="true" />
              <span className="font-tabular font-medium">{shiftDisplayLabel}</span>
              <ChevronDown
                size={12}
                className={`sgp-cmd-chevron ${activeSurface === 'shift' ? 'rotate' : ''}`}
                aria-hidden="true"
              />
            </button>
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
        {/* 3. RIGHT GROUP: CONTEXT-AWARE TOOLS (Section 7)              */}
        {/* ============================================================ */}
        <div className="sgp-cmd-right-group">
          {/* SEARCH TRIGGER BUTTON (Section 2: Icon only, no layout growth) */}
          {model.showSearch && (
            <button
              ref={searchAnchorRef}
              type="button"
              className={`sgp-cmd-tool-btn ${activeSurface === 'search' || searchQuery ? 'active' : ''}`}
              onClick={() => toggleSurface('search')}
              title={viewMode === 'map' ? 'Tìm công tơ, khu vực, nhân sự (Ctrl+F)' : 'Tìm trong danh sách'}
              aria-label="Tìm kiếm"
              aria-expanded={activeSurface === 'search'}
            >
              <Search size={15} />
            </button>
          )}

          {/* FILTER TRIGGER BUTTON (Section 3) */}
          {model.showFilter && (
            <button
              ref={filterAnchorRef}
              type="button"
              className={`sgp-cmd-tool-btn ${activeFilterCount > 0 || activeSurface === 'filter' ? 'active' : ''}`}
              onClick={() => toggleSurface('filter')}
              title={`Bộ lọc tác nghiệp ${activeFilterCount > 0 ? `(${activeFilterCount} đang bật)` : ''}`}
              aria-label="Bộ lọc"
              aria-expanded={activeSurface === 'filter'}
            >
              <Filter size={15} />
              {activeFilterCount > 0 && (
                <span className="sgp-cmd-filter-badge font-tabular">{activeFilterCount}</span>
              )}
            </button>
          )}

          {/* TELEMETRY STATUS PILL (Section 11: Sole primary trigger to open Analytics) */}
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
                      ? `${issueCount} · ${overallKpis.confirmed}/${overallKpis.total}`
                      : `${issueCount} vấn đề · ${overallKpis.confirmed}/${overallKpis.total}`}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span className="font-tabular font-medium text-emerald-300">
                    {model.compactTelemetry
                      ? `${overallKpis.confirmed}/${overallKpis.total}`
                      : `${overallKpis.confirmed}/${overallKpis.total} hoàn tất`}
                  </span>
                </>
              )}
            </button>
          )}

          {/* OVERFLOW MENU TRIGGER BUTTON (Section 10) */}
          {model.showOverflowMenu && (
            <button
              ref={overflowAnchorRef}
              type="button"
              className={`sgp-cmd-tool-btn ${activeSurface === 'overflow' ? 'active' : ''}`}
              onClick={() => toggleSurface('overflow')}
              title="Tùy chọn khác"
              aria-label="Tùy chọn khác"
              aria-expanded={activeSurface === 'overflow'}
            >
              <MoreVertical size={16} />
            </button>
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

          {/* COLLAPSE TRIGGER (Section 4: ChevronUp collapses entire bar to avatar) */}
          {model.showCollapseToggle && (
            <button
              type="button"
              className="sgp-cmd-collapse-btn"
              onClick={handleCollapse}
              title="Thu gọn thanh công cụ"
              aria-label="Thu gọn thanh công cụ"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ================================================================= */}
      {/* 4. ANCHORED POPUP SURFACES (Shared CommandPopoverSurface Layer)   */}
      {/* ================================================================= */}

      {/* A. SHIFT SELECTOR POPOVER (Section 1) */}
      <CommandPopoverSurface
        isOpen={activeSurface === 'shift'}
        anchorRef={shiftAnchorRef}
        onClose={closeSurface}
        width={300}
        role="listbox"
        ariaLabel="Danh sách lượt ghi trong ca"
      >
        <div className="sgp-cmd-popover-header">
          <span>Lượt ghi ngày {selectedDate}</span>
          <span className="sgp-cmd-popover-progress font-tabular">
            {overallKpis.percent}% hoàn tất
          </span>
        </div>
        <div className="sgp-cmd-round-list" role="listbox">
          {displayRounds.map((r) => {
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
                  closeSurface();
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
      </CommandPopoverSurface>

      {/* B. FLOATING SEARCH POPOVER (Section 2: 340px width, does not resize toolbar) */}
      <CommandPopoverSurface
        isOpen={activeSurface === 'search'}
        anchorRef={searchAnchorRef}
        onClose={closeSurface}
        width={340}
        role="search"
        ariaLabel="Hộp tìm kiếm"
      >
        <div className="sgp-cmd-search-box-popover">
          <div className="sgp-cmd-search-input-row">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              className="sgp-cmd-search-field"
              placeholder={
                viewMode === 'map'
                  ? 'Tìm công tơ, khu vực, nhân sự...'
                  : 'Tìm theo mã hoặc tên công tơ...'
              }
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              aria-label="Nhập từ khóa tìm kiếm"
            />
            {searchQuery && (
              <button
                type="button"
                className="sgp-cmd-search-btn-icon"
                onClick={() => {
                  onSearchQueryChange('');
                  searchInputRef.current?.focus();
                }}
                title="Xóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              className="sgp-cmd-search-btn-icon"
              onClick={closeSurface}
              title="Đóng tìm kiếm (Esc)"
            >
              <X size={13} />
            </button>
          </div>

          {/* Search suggestions beneath */}
          {searchQuery && viewMode === 'map' && hasSearchResults && (
            <div className="sgp-cmd-search-results-list" role="listbox">
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
                        closeSurface();
                      }}
                    >
                      <MapPin size={13} className="text-cyan-400 shrink-0" />
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
                        closeSurface();
                      }}
                    >
                      <Zap size={13} className="text-amber-400 shrink-0" />
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
                        closeSurface();
                      }}
                    >
                      <UserIcon size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate">{o.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchQuery && viewMode === 'map' && !hasSearchResults && (
            <div className="py-4 text-center text-xs text-slate-400">
              Không tìm thấy công tơ hoặc khu vực phù hợp
            </div>
          )}
        </div>
      </CommandPopoverSurface>

      {/* C. CUSTOM FILTER LISTBOX POPOVER (Section 3: No native select elements) */}
      <CommandPopoverSurface
        isOpen={activeSurface === 'filter'}
        anchorRef={filterAnchorRef}
        onClose={closeSurface}
        width={340}
        role="dialog"
        ariaLabel="Bộ lọc tác nghiệp"
      >
        <div className="sgp-cmd-filter-box-popover">
          <div className="sgp-cmd-popover-header">
            <span className="font-medium text-slate-200">Bộ lọc tác nghiệp</span>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={closeSurface}
              title="Đóng (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          <div className="sgp-cmd-filter-scroll-body">
            {/* Status Option Group (Custom Listbox) */}
            <div className="sgp-cmd-filter-section">
              <label className="sgp-cmd-filter-heading">Trạng thái:</label>
              <div className="sgp-cmd-filter-options-grid" role="radiogroup" aria-label="Trạng thái">
                {[
                  { value: 'ALL', label: 'Tất cả' },
                  { value: 'CONFIRMED', label: 'Hoàn tất' },
                  { value: 'PENDING', label: 'Chờ ghi' },
                  { value: 'OVERDUE', label: 'Quá hạn' },
                  { value: 'REVIEW', label: 'Cần kiểm tra' },
                ].map((opt) => {
                  const isChecked = (draftFilters.status || 'ALL') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`sgp-cmd-filter-chip ${isChecked ? 'active' : ''}`}
                      onClick={() => setDraftFilters({ ...draftFilters, status: opt.value as any })}
                      role="radio"
                      aria-checked={isChecked}
                    >
                      {isChecked && <Check size={11} className="shrink-0" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presentation Zone Option Group */}
            <div className="sgp-cmd-filter-section">
              <label className="sgp-cmd-filter-heading">Khu vực phân khu:</label>
              <div className="sgp-cmd-filter-list" role="radiogroup" aria-label="Khu vực">
                <button
                  type="button"
                  className={`sgp-cmd-filter-list-item ${(draftFilters.zoneId || 'ALL') === 'ALL' ? 'active' : ''}`}
                  onClick={() => setDraftFilters({ ...draftFilters, zoneId: 'ALL' })}
                  role="radio"
                  aria-checked={(draftFilters.zoneId || 'ALL') === 'ALL'}
                >
                  <span>Toàn bộ 6 phân khu</span>
                  {(draftFilters.zoneId || 'ALL') === 'ALL' && <Check size={13} className="text-cyan-400" />}
                </button>
                {mapZones.map((z) => {
                  const isChecked = draftFilters.zoneId === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      className={`sgp-cmd-filter-list-item ${isChecked ? 'active' : ''}`}
                      onClick={() => setDraftFilters({ ...draftFilters, zoneId: z.id })}
                      role="radio"
                      aria-checked={isChecked}
                    >
                      <span className="truncate">{z.name}</span>
                      {isChecked && <Check size={13} className="text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operator Option Group (where available) */}
            {availableOperators.length > 0 && (
              <div className="sgp-cmd-filter-section">
                <label className="sgp-cmd-filter-heading">Nhân sự phụ trách:</label>
                <div className="sgp-cmd-filter-list" role="radiogroup" aria-label="Nhân sự">
                  <button
                    type="button"
                    className={`sgp-cmd-filter-list-item ${(draftFilters.operatorId || 'ALL') === 'ALL' ? 'active' : ''}`}
                    onClick={() => setDraftFilters({ ...draftFilters, operatorId: 'ALL' })}
                    role="radio"
                    aria-checked={(draftFilters.operatorId || 'ALL') === 'ALL'}
                  >
                    <span>Tất cả nhân sự</span>
                    {(draftFilters.operatorId || 'ALL') === 'ALL' && <Check size={13} className="text-cyan-400" />}
                  </button>
                  {availableOperators.map((o) => {
                    const isChecked = draftFilters.operatorId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`sgp-cmd-filter-list-item ${isChecked ? 'active' : ''}`}
                        onClick={() => setDraftFilters({ ...draftFilters, operatorId: o.id })}
                        role="radio"
                        aria-checked={isChecked}
                      >
                        <span className="truncate">{o.full_name} ({o.employee_code})</span>
                        {isChecked && <Check size={13} className="text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions: [Xóa lọc] [Áp dụng] */}
          <div className="sgp-cmd-filter-footer">
            <button
              type="button"
              className="sgp-cmd-filter-clear-btn"
              onClick={() => {
                const cleared: MapFilterOptions = { ...draftFilters, zoneId: 'ALL', status: 'ALL', operatorId: 'ALL' };
                setDraftFilters(cleared);
                onApplyFilters(cleared);
                closeSurface();
              }}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className="sgp-cmd-filter-apply-btn"
              onClick={() => {
                onApplyFilters(draftFilters);
                closeSurface();
              }}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </CommandPopoverSurface>

      {/* D. OVERFLOW MENU POPOVER (Section 10 & 12: Absolute Deduplication) */}
      <CommandPopoverSurface
        isOpen={activeSurface === 'overflow'}
        anchorRef={overflowAnchorRef}
        onClose={closeSurface}
        width={220}
        align="right"
        role="menu"
        ariaLabel="Tùy chọn khác"
      >
        <div className="sgp-cmd-overflow-menu-popover">
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
                    closeSurface();
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
      </CommandPopoverSurface>
    </>
  );
};
