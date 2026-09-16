import React from 'react';
import {
  Map,
  Boxes,
  ClipboardCheck,
  Zap,
  Droplets,
  Activity,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';

interface OperationalWorkspaceHeaderProps {
  currentTab: 'dashboard' | 'assets' | 'verification';
}

export const OperationalWorkspaceHeader: React.FC<OperationalWorkspaceHeaderProps> = ({
  currentTab,
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

      {/* 2. CENTER: 3 Core Operational Modes (Unified Tabs) */}
      <div className="sgp-uwh-col-center">
        <nav className="sgp-uwh-mode-nav" aria-label="Chế độ làm việc">
          <button
            type="button"
            data-tab="dashboard"
            className={`sgp-uwh-mode-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title="Bản đồ không gian GIS & Mạng lưới"
          >
            <Map size={14} />
            <span className="sgp-uwh-tab-full">Bản đồ & Mạng lưới</span>
            <span className="sgp-uwh-tab-compact">Bản đồ</span>
            <span className="sgp-uwh-mode-count">GIS</span>
          </button>

          <button
            type="button"
            data-tab="assets"
            className={`sgp-uwh-mode-btn ${currentTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
            title="Kho danh mục thiết bị và điểm đấu nối hạ tầng"
          >
            <Boxes size={14} />
            <span className="sgp-uwh-tab-full">Kho Thiết bị & Hạ tầng</span>
            <span className="sgp-uwh-tab-compact">Thiết bị</span>
            <span className="sgp-uwh-mode-count">32</span>
          </button>

          <button
            type="button"
            data-tab="verification"
            className={`sgp-uwh-mode-btn ${currentTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
            title="Trung tâm thẩm định hồ sơ hạ tầng và đối soát ca ghi"
          >
            <ClipboardCheck size={14} />
            <span className="sgp-uwh-tab-full">Trung tâm Đối soát</span>
            <span className="sgp-uwh-tab-compact">Đối soát</span>
            <span className="sgp-uwh-mode-count sgp-count-highlight">2</span>
          </button>
        </nav>
      </div>

      {/* 3. RIGHT: Adaptive Real-time Telemetry Dashboard */}
      <div className="sgp-uwh-col-right">
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
      </div>
    </header>
  );
};
