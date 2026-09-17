import React, { useState, useRef, useEffect } from 'react';
import {
  Map,
  Share2,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Download,
  BarChart3,
  X,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import type { MapWorkspaceView } from '../../types';

export interface OperationalWorkspaceHeaderProps {
  currentTab?: 'dashboard' | 'assets' | 'verification';
  viewMode?: MapWorkspaceView;
  onViewModeChange?: (mode: MapWorkspaceView) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  shiftName?: string;
  shiftTime?: string;
  completedCount?: number;
  totalCount?: number;
  shiftSummaryText?: string;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onOpenAnalytics?: () => void;
  onOpenFilter?: () => void;
  rightControls?: React.ReactNode;
}

export const OperationalWorkspaceHeader: React.FC<OperationalWorkspaceHeaderProps> = ({
  currentTab: _currentTab = 'dashboard',
  viewMode = 'map',
  onViewModeChange,
  selectedDate = '17/09/2026',
  onDateChange: _onDateChange,
  shiftName = 'Ca 1',
  shiftTime = '06:00–14:00',
  completedCount = 0,
  totalCount = 12,
  shiftSummaryText,
  searchQuery = '',
  onSearchQueryChange,
  onRefresh,
  onExportCsv,
  onOpenAnalytics,
  onOpenFilter,
  rightControls,
}) => {
  const { isShiftPanelOpen, setIsShiftPanelOpen } = useOperationalWorkspace();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOverflowOpen]);

  // Format date display (e.g. 17/09/2026)
  const displayDate = selectedDate.includes('-')
    ? selectedDate.split('-').reverse().join('/')
    : selectedDate;

  // Authoritative progress string (e.g. "0/12 hoàn tất")
  const progressText = shiftSummaryText
    ? (shiftSummaryText.includes('/') ? shiftSummaryText.split('·').pop()?.trim() + ' hoàn tất' : shiftSummaryText)
    : `${completedCount}/${totalCount} hoàn tất`;

  return (
    <header
      className="sgp-unified-workspace-header sgp-map-cockpit-header"
      role="region"
      aria-label="Thanh điều hành không gian cảng"
    >
      {/* 1. LEFT: Brand Title & Quiet Simulation Badge */}
      <div className="sgp-map-cockpit-left">
        <h1 className="sgp-map-cockpit-title">
          <span>Điều hành Cảng</span>
        </h1>
        <span
          className="sgp-map-cockpit-sim-badge"
          title="Kịch bản vận hành chuẩn tan-thuan-demo-v1"
        >
          Dữ liệu mô phỏng
        </span>
      </div>

      {/* 2. CENTER: Segmented View Mode Toggle */}
      <div className="sgp-map-cockpit-center">
        <nav
          className="sgp-map-cockpit-mode-toggle"
          aria-label="Chế độ hiển thị không gian"
        >
          <button
            type="button"
            data-tab="dashboard-map"
            className={`sgp-map-cockpit-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('map')}
            title="Bản đồ không gian GIS & Vị trí công tơ"
          >
            <Map size={14} />
            <span>Không gian</span>
          </button>

          <button
            type="button"
            data-tab="dashboard-network"
            className={`sgp-map-cockpit-mode-btn ${viewMode === 'network' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('network')}
            title="Sơ đồ đơn tuyến mạng lưới điện & nước"
          >
            <Share2 size={14} />
            <span>Mạng lưới</span>
          </button>
        </nav>
      </div>

      {/* 3. RIGHT: ONE Authoritative Time/Shift/Progress Group + Quick Tools */}
      <div className="sgp-map-cockpit-right">
        {rightControls ? (
          rightControls
        ) : (
          <div className="sgp-map-cockpit-shift-group">
            {/* Authoritative Single Temporal Context */}
            <div className="sgp-map-cockpit-time-info">
              <span className="sgp-map-cockpit-shift-text font-tabular">
                {displayDate} · {shiftName} {shiftTime}
              </span>
            </div>

            {/* Authoritative Shift Progress Pill (Toggles Shift Meter Panel) */}
            <button
              type="button"
              data-testid="shift-summary-btn"
              className={`sgp-map-cockpit-progress-btn ${isShiftPanelOpen ? 'active' : ''}`}
              onClick={() => setIsShiftPanelOpen((prev) => !prev)}
              title="Mở Sổ ca ghi nhận công tơ"
              aria-label="Sổ ca ghi tác nghiệp"
              aria-expanded={isShiftPanelOpen}
            >
              <Clock size={13} className="text-sky-400 shrink-0" />
              <span className="sgp-map-cockpit-progress-val">
                {progressText}
              </span>
            </button>

            {/* Quick Tools */}
            <div className="flex items-center gap-1.5 ml-1">
              {/* Search Toggle */}
              {isSearchOpen ? (
                <div className="relative flex items-center">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange?.(e.target.value)}
                    placeholder="Tìm kiếm công tơ..."
                    className="h-8 px-3 pr-7 text-xs rounded-md bg-slate-800 border border-slate-700 text-white placeholder-slate-400 outline-none focus:border-sky-500 w-44 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      onSearchQueryChange?.('');
                    }}
                    className="absolute right-1.5 text-slate-400 hover:text-white p-0.5"
                    title="Đóng tìm kiếm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  onClick={() => setIsSearchOpen(true)}
                  title="Tìm kiếm mã, tên công tơ"
                >
                  <Search size={14} />
                </button>
              )}

              {/* Filter Button */}
              {onOpenFilter && (
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  onClick={onOpenFilter}
                  title="Lọc dữ liệu"
                >
                  <Filter size={14} />
                </button>
              )}

              {/* Overflow Menu */}
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  onClick={() => setIsOverflowOpen((prev) => !prev)}
                  title="Thao tác khác"
                >
                  <MoreHorizontal size={14} />
                </button>

                {isOverflowOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs text-slate-200">
                    {onRefresh && (
                      <button
                        type="button"
                        onClick={() => {
                          onRefresh();
                          setIsOverflowOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <RefreshCw size={13} className="text-slate-400" />
                        <span>Làm mới dữ liệu</span>
                      </button>
                    )}
                    {onExportCsv && (
                      <button
                        type="button"
                        onClick={() => {
                          onExportCsv();
                          setIsOverflowOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Download size={13} className="text-slate-400" />
                        <span>Xuất báo cáo CSV</span>
                      </button>
                    )}
                    {onOpenAnalytics && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAnalytics();
                          setIsOverflowOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <BarChart3 size={13} className="text-slate-400" />
                        <span>Thống kê phân tích</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
