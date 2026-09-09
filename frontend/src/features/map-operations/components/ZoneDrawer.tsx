import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  UserCheck,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { MapOperationalZone } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import { User } from '../../../types';

interface ZoneDrawerProps {
  zone: MapOperationalZone;
  availableOperators?: User[];
  onClose: () => void;
  onSelectMeter: (meterId: string) => void;
  onRequestReassign?: () => void;
  onReassignOperator?: (zoneId: string, userId: string, note?: string) => Promise<void>;
}

export const ZoneDrawer: React.FC<ZoneDrawerProps> = ({
  zone,
  availableOperators = [],
  onClose,
  onSelectMeter,
  onRequestReassign,
  onReassignOperator,
}) => {
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(zone.assignedUser?.id || '');
  const [reassignNote, setReassignNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  const handleStartReassign = () => {
    setSelectedUserId(zone.assignedUser?.id || '');
    setReassignNote('');
    setReassignError(null);
    setReassignSuccess(null);
    setIsReassigning(true);
    if (onRequestReassign) {
      onRequestReassign();
    }
  };

  const handleCancelReassign = () => {
    setIsReassigning(false);
    setReassignError(null);
  };

  const handleSubmitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setReassignError('Vui lòng chọn nhân sự phụ trách.');
      return;
    }
    if (!onReassignOperator) return;

    setSaving(true);
    setReassignError(null);
    try {
      await onReassignOperator(zone.id, selectedUserId, reassignNote);
      setReassignSuccess('Đã cập nhật phân công nhân sự thành công!');
      setIsReassigning(false);
      setTimeout(() => setReassignSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật phân công khu vực.';
      setReassignError(msg);
    } finally {
      setSaving(false);
    }
  };

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

        {/* Success Alert */}
        {reassignSuccess && (
          <div className="sgp-success-banner" role="status">
            <Check size={16} />
            <span>{reassignSuccess}</span>
          </div>
        )}

        {/* Responsible Person Card */}
        <div className="sgp-zone-operator-card">
          <div className="sgp-operator-header">
            <div className="sgp-operator-label">
              <UserCheck size={16} color="#0B4F75" />
              <span>Nhân sự phụ trách ca</span>
            </div>
            {onReassignOperator && !isReassigning && (
              <button
                type="button"
                className="sgp-reassign-link"
                onClick={handleStartReassign}
              >
                Thay đổi
              </button>
            )}
          </div>

          {!isReassigning ? (
            zone.assignedUser ? (
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
            )
          ) : (
            /* Reassignment Form */
            <form className="sgp-reassign-form" onSubmit={handleSubmitReassign}>
              {reassignError && (
                <div className="sgp-reassign-error">
                  <AlertCircle size={14} />
                  <span>{reassignError}</span>
                </div>
              )}

              <div className="sgp-form-group">
                <label className="sgp-form-label" htmlFor="reassign-operator-select">
                  Chọn nhân sự điều phối:
                </label>
                <select
                  id="reassign-operator-select"
                  className="sgp-form-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {availableOperators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.employee_code} - {op.full_name} ({op.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sgp-form-group">
                <label className="sgp-form-label" htmlFor="reassign-note-input">
                  Ghi chú điều phối (tùy chọn):
                </label>
                <input
                  id="reassign-note-input"
                  type="text"
                  className="sgp-form-input"
                  placeholder="Ví dụ: Điều chuyển ca trực kỹ thuật..."
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="sgp-form-actions">
                <button
                  type="button"
                  className="sgp-btn-secondary"
                  onClick={handleCancelReassign}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="sgp-btn-primary"
                  disabled={saving || !selectedUserId}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="sgp-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu phân công</span>
                  )}
                </button>
              </div>
            </form>
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
              const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];
              return (
                <div
                  key={m.id}
                  className="sgp-zone-meter-card"
                  onClick={() => onSelectMeter(m.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sgp-zm-left">
                    <span className="sgp-zm-code font-semibold">{m.meterCode}</span>
                    <span className="sgp-zm-name">{m.name}</span>
                  </div>
                  <div className="sgp-zm-right">
                    <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                      {stCfg.shortLabel}
                    </span>
                    <ChevronRight size={16} color="#74838C" />
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
