import React from 'react';
import {
  Map,
  Share2,
  Clock,
  Zap,
  Droplets,
  Activity,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import type { MapWorkspaceView } from '../../types';

export interface OperationalWorkspaceHeaderProps {
  currentTab?: 'dashboard' | 'assets' | 'verification';
  viewMode?: MapWorkspaceView;
  onViewModeChange?: (mode: MapWorkspaceView) => void;
  shiftSummaryText?: string;
  rightControls?: React.ReactNode;
}

export const OperationalWorkspaceHeader: React.FC<OperationalWorkspaceHeaderProps> = ({
  currentTab: _currentTab = 'dashboard',
  viewMode = 'map',
  onViewModeChange,
  shiftSummaryText,
  rightControls,
}) => {
  const { isShiftPanelOpen, setIsShiftPanelOpen } = useOperationalWorkspace();

  return (
    <header
      className="sgp-unified-workspace-header"
      role="region"
      aria-label="Thanh điều hành không gian cảng"
    >
      {/* 1. LEFT: Brand & Port Spatial Identity */}
      <div className="sgp-uwh-col-left">
        <div className="sgp-uwh-identity">
          <div className="sgp-uwh-dot-badge" title="Không gian Vận hành Cảng Tân Thuận">
            <span className="sgp-uwh-dot" />
          </div>
          <div className="sgp-uwh-title-wrap">
            <h1 className="sgp-uwh-title">
              <span className="sgp-uwh-title-full">Điều Hành Không Gian Cảng</span>
              <span className="sgp-uwh-title-compact">Điều Hành Cảng</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="sgp-uwh-scenario-tag" title="Mã kịch bản cảng">tan-thuan-demo-v1</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Kịch bản vận hành mô phỏng chuẩn">
                Dữ liệu mô phỏng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Spatial Mode Toggle (Không gian / Mạng lưới) */}
      <div className="sgp-uwh-col-center">
        <nav className="sgp-uwh-mode-nav" aria-label="Chế độ hiển thị không gian">
          <button
            type="button"
            data-tab="dashboard-map"
            className={`sgp-uwh-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('map')}
            title="Bản đồ không gian GIS & Vị trí 12 công tơ"
          >
            <Map size={14} />
            <span className="sgp-uwh-tab-full">Không gian</span>
            <span className="sgp-uwh-tab-compact">Không gian</span>
          </button>

          <button
            type="button"
            data-tab="dashboard-network"
            className={`sgp-uwh-mode-btn ${viewMode === 'network' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('network')}
            title="Sơ đồ đơn tuyến mạng lưới điện & cấp nước"
          >
            <Share2 size={14} />
            <span className="sgp-uwh-tab-full">Mạng lưới</span>
            <span className="sgp-uwh-tab-compact">Mạng lưới</span>
          </button>
        </nav>
      </div>

      {/* 3. RIGHT: Shift Summary Badge & Command Bar */}
      <div className="sgp-uwh-col-right flex items-center gap-2">
        <button
          type="button"
          data-testid="shift-summary-btn"
          className={`sgp-uwh-shift-btn ${isShiftPanelOpen ? 'active' : ''}`}
          onClick={() => setIsShiftPanelOpen((prev) => !prev)}
          title="Sổ ca ghi: Danh sách 12 công tơ cần ghi nhận trong ca trực"
          aria-label="Sổ ca ghi tác nghiệp"
          aria-expanded={isShiftPanelOpen}
        >
          <Clock size={13} className="text-cyan-500 shrink-0" />
          <span className="sgp-uwh-shift-label font-tabular font-semibold text-xs">
            {shiftSummaryText || 'Ca 1 · 06:00 · 0/12'}
          </span>
        </button>

        {rightControls ? (
          rightControls
        ) : (
          <div className="sgp-uwh-telemetry" aria-label="Chỉ số hạ tầng thời gian thực">
            <div className="sgp-uwh-chip" title="24 thiết bị và 8 tuyến cáp điện đang vận hành">
              <Zap size={13} className="sgp-text-amber" />
              <span className="sgp-uwh-chip-val">24</span>
              <span className="sgp-uwh-chip-txt">Điện</span>
            </div>
            <div className="sgp-uwh-chip" title="8 điểm đấu nối và van mạng nước sạch cảng">
              <Droplets size={13} className="sgp-text-cyan" />
              <span className="sgp-uwh-chip-val">8</span>
              <span className="sgp-uwh-chip-txt">Nước</span>
            </div>
            <div className="sgp-uwh-chip" title="12 công tơ đo đếm điện năng & lưu lượng nước">
              <Activity size={13} className="sgp-text-emerald" />
              <span className="sgp-uwh-chip-val">12</span>
              <span className="sgp-uwh-chip-txt">Công tơ</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

