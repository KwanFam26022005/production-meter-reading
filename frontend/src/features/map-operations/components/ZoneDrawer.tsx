import React from 'react';
import {
  X,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { MapOperationalZone } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface ZoneDrawerProps {
  zone: MapOperationalZone;
  onClose: () => void;
  onSelectMeter: (meterId: string) => void;
  onRequestReassign?: () => void;
}

export const ZoneDrawer: React.FC<ZoneDrawerProps> = ({
  zone,
  onClose,
  onSelectMeter,
  onRequestReassign,
}) => {
  return (
    <aside className="sgp-side-drawer sgp-zone-drawer" aria-label="Chi tiết khu vực tác nghiệp">
      {/* Header */}
      <div className="sgp-drawer-header">
        <div className="sgp-drawer-title-group">
          <span className="sgp-drawer-tag">{zone.code}</span>
          <h2 className="sgp-drawer-title">{zone.name}</h2>
        </div>
        <button
          type="button"
          className="sgp-drawer-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng thông tin"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Body */}
      <div className="sgp-drawer-body">
        {/* Description */}
        <p className="sgp-zone-desc">{zone.description}</p>

        {/* Responsible Person Card */}
        <div className="sgp-zone-operator-card">
          <div className="sgp-operator-header">
            <div className="sgp-operator-label">
              <UserCheck size={16} color="#0B4F75" />
              <span>Nhân sự phụ trách ca</span>
            </div>
            {onRequestReassign && (
              <button
                type="button"
                className="sgp-reassign-link"
                onClick={onRequestReassign}
              >
                Thay đổi
              </button>
            )}
          </div>
          {zone.assignedUser ? (
            <div className="sgp-operator-details">
              <div className="sgp-operator-avatar">
                {zone.assignedUser.fullName.charAt(0)}
              </div>
              <div className="sgp-operator-info">
                <span className="sgp-operator-name">{zone.assignedUser.fullName}</span>
                <span className="sgp-operator-sub font-tabular">
                  Mã NV: {zone.assignedUser.employeeCode} · {zone.assignedUser.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="sgp-unassigned-notice">Chưa phân công nhân sự</div>
          )}
        </div>

        {/* Operational Progress Metrics */}
        <div className="sgp-zone-metrics-block">
          <div className="sgp-metrics-head">
            <span className="sgp-metrics-title">Tiến độ hoàn thành</span>
            <span className="sgp-metrics-pct font-tabular">
              {zone.metrics.completionPercent}%
            </span>
          </div>
          <div className="sgp-zone-prog-bar">
            <div
              className="sgp-zone-prog-fill"
              style={{ width: `${Math.min(zone.metrics.completionPercent, 100)}%` }}
            />
          </div>

          <div className="sgp-zone-stat-grid">
            <div className="sgp-stat-item confirmed">
              <span className="sgp-stat-val font-tabular">{zone.metrics.confirmedCount}</span>
              <span className="sgp-stat-lbl">Đã ghi</span>
            </div>
            <div className="sgp-stat-item review">
              <span className="sgp-stat-val font-tabular">{zone.metrics.reviewCount}</span>
              <span className="sgp-stat-lbl">Cần duyệt</span>
            </div>
            <div className="sgp-stat-item overdue">
              <span className="sgp-stat-val font-tabular">{zone.metrics.overdueCount}</span>
              <span className="sgp-stat-lbl">Quá hạn</span>
            </div>
            <div className="sgp-stat-item pending">
              <span className="sgp-stat-val font-tabular">{zone.metrics.pendingCount + zone.metrics.dueCount}</span>
              <span className="sgp-stat-lbl">Chờ ghi</span>
            </div>
          </div>
        </div>

        {/* Meters In Zone List */}
        <div className="sgp-zone-meters-section">
          <h3 className="sgp-section-heading">
            Danh sách công tơ ({zone.meters.length})
          </h3>
          <div className="sgp-zone-meter-list">
            {zone.meters.map((m) => {
              const stConfig = SEMANTIC_STATE_CONFIG[m.semanticState];
              return (
                <div
                  key={m.id}
                  className="sgp-zone-meter-row"
                  onClick={() => onSelectMeter(m.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sgp-meter-row-left">
                    <span
                      className="sgp-meter-row-dot"
                      style={{ backgroundColor: stConfig.style.fill }}
                    />
                    <div className="sgp-meter-row-meta">
                      <span className="sgp-meter-row-code">{m.meterCode}</span>
                      <span className="sgp-meter-row-name">{m.name}</span>
                    </div>
                  </div>
                  <div className="sgp-meter-row-right">
                    <span className={`sgp-badge-tag ${stConfig.style.badgeClass}`}>
                      {stConfig.shortLabel}
                    </span>
                    <ChevronRight size={14} color="#94A3B8" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
