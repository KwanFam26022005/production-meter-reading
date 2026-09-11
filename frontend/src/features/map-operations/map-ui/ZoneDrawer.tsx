import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Box,
} from 'lucide-react';
import { MapMeterItem, MapOperationalZone } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import { User } from '../../../types';
import { OperatorIconButton } from './OperatorIconButton';
import { OperatorProgressPopover } from './OperatorProgressPopover';
import { deriveOperatorOperationalSummary } from '../utils/deriveOperatorOperationalSummary';

interface ZoneDrawerProps {
  zone: MapOperationalZone;
  allMeters?: MapMeterItem[];
  currentRoundTime?: string;
  availableOperators?: User[];
  onClose: () => void;
  onSelectMeter: (meterId: string) => void;
  onRequestReassign?: () => void;
  onReassignOperator?: (zoneId: string, userId: string, note?: string) => Promise<void>;
  onViewIn3D?: () => void;
}

export const ZoneDrawer: React.FC<ZoneDrawerProps> = ({
  zone,
  allMeters,
  currentRoundTime,
  availableOperators = [],
  onClose,
  onSelectMeter,
  onRequestReassign,
  onReassignOperator,
  onViewIn3D,
}) => {
  const [operatorPopoverOpen, setOperatorPopoverOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(zone.assignedUser?.id || '');
  const [reassignNote, setReassignNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);
  const operatorAnchorRef = useRef<HTMLDivElement | null>(null);

  // Purely derived operator summary — calculated from effective zone/meter state
  const operatorSummary = useMemo(() => {
    return deriveOperatorOperationalSummary(zone, allMeters, currentRoundTime);
  }, [zone, allMeters, currentRoundTime]);

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

  const zoneMeters = zone.meters || [];
  const activeMeters = zoneMeters.filter((m) => m.isActive);
  const totalDisplay = activeMeters.length > 0 ? activeMeters.length : zoneMeters.length;

  return (
    <aside className="sgp-side-drawer sgp-zone-drawer" aria-label="Chi tiết khu vực tác nghiệp">
      {/* Header — includes Zone Name, Code Tag, Operator Icon Button, and Close Button */}
      <div className="sgp-drawer-header">
        <div className="sgp-drawer-title-group">
          <div className="sgp-drawer-tag-row">
            <span className="sgp-drawer-tag">{zone.code}</span>
          </div>
          <h2 className="sgp-drawer-title">{zone.name}</h2>
        </div>
        <div className="sgp-drawer-actions">
          {onViewIn3D && (
            <button
              type="button"
              className="sgp-drawer-3d-btn"
              onClick={onViewIn3D}
              title="Xem không gian 3D của phân khu này"
            >
              <Box size={13} />
              <span>Xem 3D</span>
            </button>
          )}

          {/* Operator Icon Button — Affordance for responsible operator per Figma 2:363 */}
          <div className="sgp-operator-icon-wrap" ref={operatorAnchorRef}>
            <OperatorIconButton
              operator={zone.assignedUser}
              isOpen={operatorPopoverOpen}
              onClick={() => setOperatorPopoverOpen((v) => !v)}
            />
            {operatorPopoverOpen && (
              <OperatorProgressPopover
                summary={operatorSummary}
                onClose={() => setOperatorPopoverOpen(false)}
                onRequestReassign={onReassignOperator ? handleStartReassign : undefined}
                anchorRef={operatorAnchorRef}
              />
            )}
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
      </div>

      {/* Content Body */}
      <div className="sgp-drawer-body">
        {/* Description if present */}
        {zone.description && (
          <p className="sgp-zone-desc">{zone.description}</p>
        )}

        {/* Success Alert */}
        {reassignSuccess && (
          <div className="sgp-success-banner" role="status">
            <Check size={16} />
            <span>{reassignSuccess}</span>
          </div>
        )}

        {/* Reassignment Form — only visible when explicitly initiated */}
        {isReassigning && (
          <div className="sgp-zone-operator-card reassign-active">
            <form className="sgp-reassign-form" onSubmit={handleSubmitReassign}>
              <div className="sgp-reassign-form-title">Phân công nhân sự phụ trách</div>
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
          </div>
        )}

        {/* Operational Progress Metrics: Completed / Total & Progress Bar */}
        <div className="sgp-zone-metrics-block">
          <div className="sgp-metrics-head">
            <span className="sgp-metrics-title">Tiến độ khu vực</span>
            <span className="sgp-metrics-pct font-tabular">
              <strong>{zone.metrics.completionPercent}%</strong> · {zone.metrics.confirmedCount}/{totalDisplay} công tơ
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
              <span className="sgp-stat-lbl">Cần kiểm tra</span>
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
            Danh sách công tơ ({zoneMeters.length})
          </h3>
          <div className="sgp-zone-meter-list">
            {zoneMeters.map((m) => {
              const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];
              return (
                <div
                  key={m.id}
                  className="sgp-zone-meter-card"
                  onClick={() => onSelectMeter(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMeter(m.id);
                    }
                  }}
                  aria-label={`Công tơ ${m.meterCode}, ${m.name}, trạng thái: ${stCfg.label}`}
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
