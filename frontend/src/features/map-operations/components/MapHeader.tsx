import React, { useState, useRef, useEffect } from 'react';
import {
  Map,
  List,
  MoreVertical,
  RefreshCw,
  Download,
  Menu,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';
import { AdminDashboardRoundProgress } from '../../../types';

export interface MapHeaderProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  rounds?: AdminDashboardRoundProgress[];
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  selectedRoundId?: string;
  onSelectRound?: (roundId: string) => void;
  viewMode: 'map' | 'legacy';
  onViewModeChange: (mode: 'map' | 'legacy') => void;
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv?: () => void;
  onToggleMenu?: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  selectedDate,
  onDateChange,
  rounds = [],
  currentRoundTime,
  currentRoundStatus,
  selectedRoundId,
  onSelectRound,
  viewMode,
  onViewModeChange,
  onRefresh,
  isLoading,
  onExportCsv,
  onToggleMenu,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);
  const roundDropdownRef = useRef<HTMLDivElement>(null);

  // Active round resolution
  const activeIdx = rounds && rounds.length > 0
    ? selectedRoundId
      ? rounds.findIndex((r) => r.round_id === selectedRoundId)
      : rounds.findIndex((r) => r.timing_state === 'CURRENT')
    : -1;
  const currentIdx = activeIdx >= 0 ? activeIdx : 0;
  const activeRound = rounds && rounds.length > 0 ? rounds[currentIdx] : null;
  const displayTime = activeRound?.scheduled_time || currentRoundTime || '08:00';

  const handlePrevRound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rounds && currentIdx > 0 && onSelectRound) {
      onSelectRound(rounds[currentIdx - 1].round_id);
    }
  };

  const handleNextRound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rounds && currentIdx < rounds.length - 1 && onSelectRound) {
      onSelectRound(rounds[currentIdx + 1].round_id);
    }
  };

  // Close round dropdown on outside click or ESC
  useEffect(() => {
    if (!isRoundDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsRoundDropdownOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (roundDropdownRef.current && !roundDropdownRef.current.contains(e.target as Node)) {
        setIsRoundDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isRoundDropdownOpen]);

  // Close overflow menu on outside click or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sgp-map-header" role="banner" aria-label="Đầu trang bản đồ công tơ">
      {/* LEFT: Menu button + Title + Port name */}
      <div className="sgp-mh-title-wrap">
        <button
          type="button"
          className="sgp-mh-menu-nav-btn"
          onClick={() => {
            if (onToggleMenu) {
              onToggleMenu();
            } else {
              window.dispatchEvent(new CustomEvent('sgp-toggle-admin-sidebar'));
            }
          }}
          title="Mở menu điều hướng quản trị"
          aria-label="Mở menu quản trị"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="sgp-mh-title">Bản đồ công tơ</h1>
          <span className="sgp-mh-subtitle">Cảng Tân Thuận</span>
        </div>
      </div>

      {/* CENTER: Unified Temporal Cluster (Date Picker + Round Stepper / Dropdown) */}
      <div className="sgp-mh-temporal-cluster">
        <VnDatePicker value={selectedDate} onChange={onDateChange} />

        {rounds && rounds.length > 0 && activeRound && (
          <div className="sgp-mh-round-picker" ref={roundDropdownRef}>
            <button
              type="button"
              className="sgp-mh-round-nav-btn"
              onClick={handlePrevRound}
              disabled={currentIdx <= 0}
              title="Lượt trước"
              aria-label="Lượt trước"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              className={`sgp-mh-round-trigger ${isRoundDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsRoundDropdownOpen((prev) => !prev)}
              title="Nhấp để xem và chọn lượt tác nghiệp trong ngày"
              aria-expanded={isRoundDropdownOpen}
            >
              <Clock size={13} className="sgp-mh-round-icon" />
              <span className="sgp-mh-round-time font-tabular">
                Ca {displayTime}
              </span>
              <span className="sgp-mh-round-divider">·</span>
              <span className="sgp-mh-round-pct font-tabular">
                {activeRound.completion_percent}%
              </span>
              <ChevronDown size={12} className={`sgp-mh-round-caret ${isRoundDropdownOpen ? 'open' : ''}`} />
            </button>

            <button
              type="button"
              className="sgp-mh-round-nav-btn"
              onClick={handleNextRound}
              disabled={currentIdx >= rounds.length - 1}
              title="Lượt tiếp theo"
              aria-label="Lượt tiếp theo"
            >
              <ChevronRight size={14} />
            </button>

            {isRoundDropdownOpen && (
              <div className="sgp-mh-round-dropdown" role="menu" aria-label="Danh sách ca tác nghiệp">
                <div className="sgp-mh-rdd-header">
                  <span className="sgp-mh-rdd-title">CÁC CA TÁC NGHIỆP TRONG NGÀY</span>
                  <span className="sgp-mh-rdd-count">{rounds.length} ca</span>
                </div>
                <div className="sgp-mh-rdd-list">
                  {rounds.map((r, idx) => {
                    const isSelected = idx === currentIdx;
                    return (
                      <button
                        key={r.round_id}
                        type="button"
                        className={`sgp-mh-rdd-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          onSelectRound?.(r.round_id);
                          setIsRoundDropdownOpen(false);
                        }}
                        role="menuitem"
                      >
                        <div className="sgp-mh-rdd-item-left">
                          <span className="sgp-mh-rdd-item-time font-tabular font-bold">
                            {r.scheduled_time}
                          </span>
                          <span
                            className={`sgp-mh-rdd-item-badge ${
                              r.timing_state === 'CURRENT'
                                ? 'badge-current'
                                : r.timing_state === 'PAST'
                                ? 'badge-past'
                                : 'badge-future'
                            }`}
                          >
                            {r.timing_state === 'CURRENT' ? (currentRoundStatus || 'Đang mở') : r.timing_state === 'PAST' ? 'Đã qua' : 'Dự kiến'}
                          </span>
                        </div>
                        <div className="sgp-mh-rdd-item-right font-tabular">
                          <span className="sgp-mh-rdd-item-stats">
                            {r.confirmed}/{r.total_meters}
                          </span>
                          <span className="sgp-mh-rdd-item-pct font-semibold">
                            {r.completion_percent}%
                          </span>
                          {isSelected && <Check size={13} className="text-sgp-teal ml-1" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: View toggle + overflow — auto width, never wraps */}
      <div className="sgp-mh-right-cluster">
        {/* [Bản đồ] [Danh sách] segmented toggle */}
        <div className="sgp-mh-view-toggle" role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`sgp-mh-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
            title="Chế độ bản đồ trực quan"
          >
            <Map size={13} />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-mh-view-btn ${viewMode === 'legacy' ? 'active' : ''}`}
            onClick={() => onViewModeChange('legacy')}
            title="Chế độ danh mục quản trị"
          >
            <List size={13} />
            <span>Danh sách</span>
          </button>
        </div>

        {/* ⋮ Overflow — inline with toggle */}
        <div className="sgp-mh-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sgp-mh-menu-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Thao tác khác"
            aria-label="Menu thao tác khác"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={15} />
          </button>

          {isMenuOpen && (
            <div className="sgp-mh-menu-dropdown" role="menu">
              <button
                type="button"
                className="sgp-mh-menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onRefresh();
                }}
                disabled={isLoading}
                role="menuitem"
              >
                <RefreshCw size={13} className={isLoading ? 'sgp-spin' : ''} />
                <span>Làm mới dữ liệu</span>
              </button>

              {onExportCsv && (
                <button
                  type="button"
                  className="sgp-mh-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportCsv();
                  }}
                  role="menuitem"
                >
                  <Download size={13} />
                  <span>Xuất báo cáo CSV</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
