import React from 'react';
import {
  Map,
  Boxes,
  ClipboardCheck,
  Zap,
  Droplets,
  Search,
  Activity,
  Layers,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';

interface OperationalWorkspaceHeaderProps {
  currentTab: 'dashboard' | 'assets' | 'verification';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  extraActions?: React.ReactNode;
}

export const OperationalWorkspaceHeader: React.FC<OperationalWorkspaceHeaderProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  extraActions,
}) => {
  const { setActiveTab, utilityFilter, setUtilityFilter } = useOperationalWorkspace();

  return (
    <header className="sgp-unified-workspace-header" role="region" aria-label="Thanh điều hành hạ tầng & không gian hợp nhất">
      <div className="sgp-uwh-top-row">
        {/* Workspace Brand & Identification */}
        <div className="sgp-uwh-identity">
          <div className="sgp-uwh-badge">
            <span className="sgp-uwh-dot" />
            <span className="sgp-uwh-badge-text">KHÔNG GIAN VẬN HÀNH HỢP NHẤT</span>
          </div>
          <h1 className="sgp-uwh-title">
            Điều Hành Không Gian & Hạ Tầng Cảng
            <span className="sgp-uwh-scenario-tag">tan-thuan-demo-v1</span>
          </h1>
        </div>

        {/* Live Telemetry Chips */}
        <div className="sgp-uwh-telemetry">
          <div className="sgp-uwh-chip" title="24 thiết bị và 8 tuyến cáp điện đang vận hành">
            <Zap size={14} className="sgp-text-amber" />
            <span>24 Thiết bị Điện</span>
          </div>
          <div className="sgp-uwh-chip" title="8 điểm đấu nối và van mạng nước sạch cảng">
            <Droplets size={14} className="sgp-text-cyan" />
            <span>8 Thiết bị Nước</span>
          </div>
          <div className="sgp-uwh-chip" title="12 công tơ đo đếm điện năng & lưu lượng nước">
            <Activity size={14} className="sgp-text-emerald" />
            <span>12 Công tơ</span>
          </div>
          <div className="sgp-uwh-chip sgp-uwh-chip-alert" title="Hồ sơ hạ tầng đề xuất & ca ghi cần đối soát">
            <ClipboardCheck size={14} className="sgp-text-blue" />
            <span>2 Mục chờ đối soát</span>
          </div>
        </div>
      </div>

      {/* Navigation & Action Bar */}
      <div className="sgp-uwh-controls-row">
        {/* 3 Core Operational Modes */}
        <nav className="sgp-uwh-mode-nav" aria-label="Chế độ làm việc">
          <button
            type="button"
            className={`sgp-uwh-mode-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Map size={16} />
            <span>Bản đồ & Mạng lưới</span>
            <span className="sgp-uwh-mode-count">GIS / Topology</span>
          </button>

          <button
            type="button"
            className={`sgp-uwh-mode-btn ${currentTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            <Boxes size={16} />
            <span>Kho Thiết bị & Hạ tầng</span>
            <span className="sgp-uwh-mode-count">32 Tài sản</span>
          </button>

          <button
            type="button"
            className={`sgp-uwh-mode-btn ${currentTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <ClipboardCheck size={16} />
            <span>Trung tâm Đối soát</span>
            <span className="sgp-uwh-mode-count sgp-count-highlight">2 Cần xử lý</span>
          </button>
        </nav>

        {/* Global Search & Utility Filter */}
        <div className="sgp-uwh-actions-group">
          {onSearchChange !== undefined && (
            <div className="sgp-uwh-search-wrap">
              <Search size={14} className="sgp-uwh-search-icon" />
              <input
                type="text"
                placeholder="Tìm mã, tên tài sản hoặc công tơ..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="sgp-uwh-search-input"
              />
            </div>
          )}

          {/* Quick Utility Switcher */}
          <div className="sgp-uwh-utility-pills" role="group" aria-label="Bộ lọc loại hạ tầng">
            <button
              type="button"
              className={`sgp-uwh-utility-pill ${utilityFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setUtilityFilter('ALL')}
            >
              <Layers size={13} />
              <span>Tất cả</span>
            </button>
            <button
              type="button"
              className={`sgp-uwh-utility-pill ${utilityFilter === 'ELECTRICITY' ? 'active' : ''}`}
              onClick={() => setUtilityFilter('ELECTRICITY')}
            >
              <Zap size={13} />
              <span>Điện</span>
            </button>
            <button
              type="button"
              className={`sgp-uwh-utility-pill ${utilityFilter === 'WATER' ? 'active' : ''}`}
              onClick={() => setUtilityFilter('WATER')}
            >
              <Droplets size={13} />
              <span>Nước</span>
            </button>
          </div>

          {extraActions}
        </div>
      </div>
    </header>
  );
};
