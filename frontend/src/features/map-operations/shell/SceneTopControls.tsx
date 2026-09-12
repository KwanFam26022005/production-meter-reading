import React, { useState, useRef, useEffect } from 'react';
import {
  Map,
  List,
  Clock,
  ChevronDown,
  Check,
  MoreVertical,
  RefreshCw,
  Download,
  BarChart2,
  Compass,
} from 'lucide-react';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';
import type { AdminDashboardRoundProgress, User, MapWorkspaceView } from '../../../types';
import { formatUserRole, canAdministerMapConfiguration } from '../../../types';

interface SceneTopControlsProps {
  user?: User;
  selectedDate: string;
  onDateChange: (date: string) => void;
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  selectedRoundId?: string;
  onSelectRound: (roundId: string) => void;
  viewMode: MapWorkspaceView;
  onViewModeChange: (mode: MapWorkspaceView) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv: () => void;
  onOpenAnalytics?: () => void;
  onOpenCalibration?: () => void;
}

/**
 * SceneTopControls — Top Command Rail (V10 Minimal HUD)
 *
 * Conceptual target:
 * 05/08/2026 · Ca 1 — 17:00       [ Bản đồ | Danh sách ]       P
 *
 * - Unified temporal group (Date + Shift)
 * - Animated segmented control: [Bản đồ] [Danh sách]
 * - Minimal user profile avatar chip
 * - Overflow menu icon
 */
export const SceneTopControls: React.FC<SceneTopControlsProps> = ({
  user,
  selectedDate,
  onDateChange,
  rounds = [],
  currentRoundTime,
  currentRoundStatus: _currentRoundStatus,
  selectedRoundId,
  onSelectRound,
  viewMode,
  onViewModeChange,
  onRefresh,
  isLoading,
  onExportCsv,
  onOpenAnalytics,
  onOpenCalibration,
}) => {
  const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);
  const roundDropdownRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roundDropdownRef.current &&
        !roundDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoundDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active round resolution
  const activeIdx =
    rounds && rounds.length > 0
      ? selectedRoundId
        ? rounds.findIndex((r) => r.round_id === selectedRoundId)
        : rounds.findIndex((r) => r.timing_state === 'CURRENT')
      : -1;

  const currentRound = activeIdx >= 0 ? rounds[activeIdx] : null;
  const shiftDisplayLabel = currentRound
    ? `Ca 1 (${currentRound.scheduled_time})`
    : (currentRoundTime ? `Ca 1 (${currentRoundTime})` : 'Ca 1 (06:00 - 14:00)');

  const userInitial = user?.full_name?.charAt(0)?.toUpperCase() || 'P';
  const userRole = user ? formatUserRole(user.role) : 'Quản trị viên';
  const userFull = user?.full_name || 'Pham Hong Dang Khoa';

  return (
    <div className="sgp-scene-top-controls" role="toolbar" aria-label="Điều khiển thời gian và góc nhìn">
      {/* 1. UNIFIED TEMPORAL GROUP: DATE + SHIFT */}
      <div className="sgp-top-temporal-group" role="group" aria-label="Thời gian tác nghiệp">
        <div className="sgp-top-date-wrap">
          <VnDatePicker
            value={selectedDate}
            onChange={onDateChange}
            disabled={isLoading}
            size="sm"
            title="Chọn ngày tác nghiệp"
            ariaLabel="Chọn ngày tác nghiệp"
          />
        </div>

        <span className="sgp-temporal-divider" aria-hidden="true">·</span>

        {/* ROUND / SHIFT SELECTOR */}
        <div className="sgp-mh-round-picker" ref={roundDropdownRef}>
          <button
            type="button"
            className={`sgp-mh-round-trigger ${isRoundDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsRoundDropdownOpen((prev) => !prev)}
            disabled={isLoading || rounds.length === 0}
            aria-haspopup="listbox"
            aria-expanded={isRoundDropdownOpen}
            title="Chọn ca tác nghiệp"
          >
            <Clock size={12} className="sgp-mh-clock-icon text-cyan-400" aria-hidden="true" />
            <span className="sgp-mh-round-label font-tabular">{shiftDisplayLabel}</span>
            <ChevronDown
              size={11}
              className={`sgp-mh-chevron ${isRoundDropdownOpen ? 'rotate' : ''}`}
              aria-hidden="true"
            />
          </button>

          {isRoundDropdownOpen && rounds.length > 0 && (
            <div className="sgp-mh-round-dropdown" role="listbox" aria-label="Danh sách lượt đọc">
              <div className="sgp-mh-dropdown-header">LƯỢT ĐỌC TRONG NGÀY</div>
              <div className="sgp-mh-dropdown-list">
                {rounds.map((round) => {
                  const isSelected = selectedRoundId
                    ? round.round_id === selectedRoundId
                    : round.timing_state === 'CURRENT';

                  return (
                    <button
                      key={round.round_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`sgp-mh-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectRound(round.round_id);
                        setIsRoundDropdownOpen(false);
                      }}
                    >
                      <div className="sgp-mh-item-left">
                        <span className="sgp-mh-item-time font-tabular">{round.scheduled_time}</span>
                        <span className="sgp-mh-item-desc">{round.scheduled_local || 'Định kỳ'}</span>
                      </div>
                      <div className="sgp-mh-item-right">
                        <span className="sgp-mh-item-pct font-tabular">
                          {Math.round(round.completion_percent)}%
                        </span>
                        {isSelected && <Check size={13} className="sgp-mh-item-check" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEGMENTED CONTROL: [Bản đồ] [Danh sách] */}
      <div className="sgp-scene-segmented-switch" role="group" aria-label="Chế độ hiển thị">
        <div
          className={`sgp-segmented-active-pill ${viewMode === 'list' ? 'pos-list' : 'pos-map'}`}
          aria-hidden="true"
        />
        <button
          type="button"
          className={`sgp-segmented-btn ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => onViewModeChange('map')}
          aria-pressed={viewMode === 'map'}
        >
          <Map size={13} strokeWidth={2.2} />
          <span>Bản đồ</span>
        </button>
        <button
          type="button"
          className={`sgp-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => onViewModeChange('list')}
          aria-pressed={viewMode === 'list'}
        >
          <List size={13} strokeWidth={2.2} />
          <span>Danh sách</span>
        </button>
      </div>

      {/* 3. COMPACT USER AVATAR CHIP */}
      <div
        className="sgp-header-user-profile"
        title={`${userFull} (${userRole})`}
        aria-label={`${userFull} (${userRole})`}
      >
        <div className="sgp-header-avatar" aria-hidden="true">
          {userInitial}
        </div>
      </div>

      {/* 4. OVERFLOW MENU */}
      <div className="sgp-top-overflow-wrap" ref={menuRef}>
        <button
          type="button"
          className={`sgp-hud-icon-btn ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="Tùy chọn khác"
          title="Tùy chọn khác"
        >
          <MoreVertical size={15} />
        </button>

        {isMenuOpen && (
          <div className="sgp-hud-menu-dropdown" role="menu">
            <button
              type="button"
              className="sgp-hud-menu-item"
              onClick={() => {
                onRefresh();
                setIsMenuOpen(false);
              }}
              role="menuitem"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Làm mới dữ liệu</span>
            </button>
            <button
              type="button"
              className="sgp-hud-menu-item"
              onClick={() => {
                onExportCsv();
                setIsMenuOpen(false);
              }}
              role="menuitem"
            >
              <Download size={13} />
              <span>Xuất dữ liệu CSV</span>
            </button>
            {onOpenAnalytics && (
              <button
                type="button"
                className="sgp-hud-menu-item"
                onClick={() => {
                  onOpenAnalytics();
                  setIsMenuOpen(false);
                }}
                role="menuitem"
              >
                <BarChart2 size={13} />
                <span>Phân tích chất lượng</span>
              </button>
            )}
            {canAdministerMapConfiguration(user) && onOpenCalibration && (
              <>
                <div
                  style={{
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    margin: '4px 0',
                  }}
                  role="separator"
                />
                <button
                  type="button"
                  className="sgp-hud-menu-item text-amber-400"
                  onClick={() => {
                    onOpenCalibration();
                    setIsMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Compass size={13} className="text-amber-400" />
                  <span>Hiệu chỉnh bản đồ</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
