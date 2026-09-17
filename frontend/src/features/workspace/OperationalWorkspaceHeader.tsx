import React from 'react';
import {
  Map,
  Share2,
  List,
  ClipboardCheck,
  Zap,
  Droplets,
  Activity,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import type { MapWorkspaceView } from '../../types';

export interface OperationalWorkspaceHeaderProps {
  currentTab: 'dashboard' | 'assets' | 'verification';
  viewMode?: MapWorkspaceView;
  onViewModeChange?: (mode: MapWorkspaceView) => void;
  rightControls?: React.ReactNode;
}

export const OperationalWorkspaceHeader: React.FC<OperationalWorkspaceHeaderProps> = ({
  currentTab: _currentTab,
  viewMode = 'map',
  onViewModeChange,
  rightControls,
}) => {
  const { setActiveTab } = useOperationalWorkspace();

  return (
    <header
      className="sgp-unified-workspace-header"
      role="region"
      aria-label="Thanh điều hành hạ tầng & không gian hợp nhất"
    >
      {/* 1. LEFT: Brand & Cockpit Identity */}
      <div className="sgp-uwh-col-left">
        <div className="sgp-uwh-identity">
          <div className="sgp-uwh-dot-badge" title="Không gian Vận hành Hợp nhất">
            <span className="sgp-uwh-dot" />
          </div>
          <div className="sgp-uwh-title-wrap">
            <h1 className="sgp-uwh-title">
              <span className="sgp-uwh-title-full">Điều Hành Không Gian & Hạ Tầng Cảng</span>
              <span className="sgp-uwh-title-compact">Điều Hành Hạ Tầng</span>
            </h1>
            <span className="sgp-uwh-scenario-tag" title="Mã kịch bản cảng">tan-thuan-demo-v1</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Map Internal View Modes */}
      <div className="sgp-uwh-col-center">
        <nav className="sgp-uwh-mode-nav" aria-label="Chế độ xem bản đồ">
          <button
            type="button"
            data-tab="dashboard-map"
            className={`sgp-uwh-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              onViewModeChange?.('map');
            }}
            title="Bản đồ không gian GIS & Vị trí 12 công tơ"
          >
            <Map size={14} />
            <span className="sgp-uwh-tab-full">Bản đồ</span>
            <span className="sgp-uwh-tab-compact">Bản đồ</span>
          </button>

          <button
            type="button"
            data-tab="dashboard-network"
            className={`sgp-uwh-mode-btn ${viewMode === 'network' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              onViewModeChange?.('network');
            }}
            title="Sơ đồ đơn tuyến mạng lưới điện & cấp nước"
          >
            <Share2 size={14} />
            <span className="sgp-uwh-tab-full">Mạng lưới</span>
            <span className="sgp-uwh-tab-compact">Mạng lưới</span>
          </button>

          <button
            type="button"
            data-tab="dashboard-list"
            className={`sgp-uwh-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              onViewModeChange?.('list');
            }}
            title="Sổ ca ghi: Danh sách 12 công tơ cần ghi nhận trong ca trực"
          >
            <List size={14} />
            <span className="sgp-uwh-tab-full">Sổ ca ghi</span>
            <span className="sgp-uwh-tab-compact">Sổ ca</span>
            <span className="sgp-uwh-mode-count">12</span>
          </button>
        </nav>
      </div>

      {/* 3. RIGHT: Docked Command Bar OR Telemetry Dashboard */}
      <div className="sgp-uwh-col-right">
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
            <div className="sgp-uwh-chip sgp-uwh-chip-alert" title="2 mục hồ sơ & chỉ số chờ đối soát">
              <ClipboardCheck size={13} className="sgp-text-blue" />
              <span className="sgp-uwh-chip-val">2</span>
              <span className="sgp-uwh-chip-txt">Chờ đối soát</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
