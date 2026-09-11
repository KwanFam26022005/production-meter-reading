import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { MapMeterItem, MapOperationalZone } from '../types';
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
  onAddMeter?: (zoneId: string) => void;
}

/**
 * ZoneDrawer — Contextual Zone side drawer matching Figma Frame 2:363
 *
 * Visual layout:
 * 1. Header: Zone title (uppercase bold) & Close button
 * 2. Completion rate: `X / Y hoàn tất` & progress track
 * 3. PHỤ TRÁCH row: "Xem người phụ trách" text link + circular operator icon button
 * 4. Exception pill: `⚠️ N quá hạn`
 * 5. CÔNG TƠ section: Meter cards with colored dot, code, subtext, and chevron
 * 6. TÁC VỤ NHANH section: "Xem ngoại lệ trong khu vực" & "Trở về toàn cảng"
 */
export const ZoneDrawer: React.FC<ZoneDrawerProps> = ({
  zone,
  allMeters,
  currentRoundTime,
  onClose,
  onSelectMeter,
  onRequestReassign,
  onAddMeter,
}) => {
  const [operatorPopoverOpen, setOperatorPopoverOpen] = useState(false);
  const operatorAnchorRef = useRef<HTMLDivElement | null>(null);

  // Purely derived operator summary
  const operatorSummary = useMemo(() => {
    return deriveOperatorOperationalSummary(zone, allMeters, currentRoundTime);
  }, [zone, allMeters, currentRoundTime]);

  const zoneMeters = zone.meters || [];
  const activeMeters = zoneMeters.filter((m) => m.isActive);
  const totalMeters = activeMeters.length > 0 ? activeMeters.length : zoneMeters.length;
  const completedMeters = activeMeters.filter((m) => m.semanticState === 'CONFIRMED').length;
  const overdueCount = activeMeters.filter((m) => m.semanticState === 'OVERDUE').length;
  const reviewCount = activeMeters.filter((m) => m.semanticState === 'REVIEW').length;
  const progressPct = totalMeters > 0 ? Math.round((completedMeters / totalMeters) * 100) : 0;

  const displayTitle = (zone.shortName || zone.name).toUpperCase();

  // Quick action: jump to first exception meter
  const handleFocusFirstException = () => {
    const firstException = activeMeters.find(
      (m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW'
    );
    if (firstException) {
      onSelectMeter(firstException.id);
    }
  };

  return (
    <aside
      className="sgp-side-drawer sgp-zone-drawer"
      role="dialog"
      aria-label={`Chi tiết phân khu ${zone.name}`}
    >
      {/* 1. HEADER: Title and Close Button */}
      <div className="sgp-zd-header">
        <h2 className="sgp-zd-title">{displayTitle}</h2>
        <button
          type="button"
          className="sgp-zd-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng phân khu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="sgp-zd-body">
        {/* 2. COMPLETION STATS & PROGRESS TRACK */}
        <div className="sgp-zd-stat-row font-tabular">
          <span className="sgp-zd-stat-label">
            <strong>{completedMeters} / {totalMeters}</strong> hoàn tất
          </span>
        </div>
        <div
          className="sgp-zd-prog-track"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="sgp-zd-prog-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* 3. PHỤ TRÁCH ROW (Figma 2:363) */}
        <div className="sgp-zd-operator-row">
          <span className="sgp-zd-op-title">PHỤ TRÁCH</span>
          <div className="sgp-zd-op-right" ref={operatorAnchorRef}>
            <button
              type="button"
              className="sgp-zd-op-link"
              onClick={() => setOperatorPopoverOpen((v) => !v)}
            >
              Xem người phụ trách
            </button>
            <OperatorIconButton
              operator={zone.assignedUser}
              isOpen={operatorPopoverOpen}
              onClick={() => setOperatorPopoverOpen((v) => !v)}
            />
            {operatorPopoverOpen && (
              <OperatorProgressPopover
                summary={operatorSummary}
                onClose={() => setOperatorPopoverOpen(false)}
                onRequestReassign={onRequestReassign}
                anchorRef={operatorAnchorRef}
              />
            )}
          </div>
        </div>

        {/* 4. EXCEPTION PILL BADGE */}
        {overdueCount > 0 ? (
          <div className="sgp-zd-issue-pill overdue">
            <AlertTriangle size={13} />
            <span>{overdueCount} quá hạn</span>
          </div>
        ) : reviewCount > 0 ? (
          <div className="sgp-zd-issue-pill review">
            <AlertTriangle size={13} />
            <span>{reviewCount} cần kiểm tra</span>
          </div>
        ) : null}

        <hr className="sgp-zd-divider" />

        {/* 5. CÔNG TƠ SECTION */}
        <div className="sgp-zd-section">
          <div className="sgp-zd-section-title">CÔNG TƠ</div>
          <div className="sgp-zd-meter-list">
            {activeMeters.map((m) => {
              const isOverdue = m.semanticState === 'OVERDUE';
              const isReview = m.semanticState === 'REVIEW';
              const stateDotClass = isOverdue
                ? 'dot-overdue'
                : isReview
                ? 'dot-review'
                : 'dot-confirmed';

              const subtext = isOverdue
                ? 'Quá hạn'
                : isReview
                ? 'Cần kiểm tra'
                : 'Đã ghi';

              const subtextClass = isOverdue
                ? 'text-overdue'
                : isReview
                ? 'text-review'
                : 'text-confirmed';

              return (
                <button
                  key={m.id}
                  type="button"
                  className="sgp-zd-meter-card"
                  onClick={() => onSelectMeter(m.id)}
                  aria-label={`Công tơ ${m.meterCode}, ${subtext}`}
                >
                  <div className="sgp-zd-meter-left">
                    <span className={`sgp-zd-meter-dot ${stateDotClass}`} />
                    <div className="sgp-zd-meter-info">
                      <span className="sgp-zd-meter-code font-tabular">{m.meterCode}</span>
                      <span className={`sgp-zd-meter-sub ${subtextClass}`}>{subtext}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="sgp-zd-meter-arrow" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. TÁC VỤ NHANH SECTION */}
        <div className="sgp-zd-section">
          <div className="sgp-zd-section-title">TÁC VỤ NHANH</div>
          <div className="sgp-zd-actions">
            {(overdueCount > 0 || reviewCount > 0) && (
              <button
                type="button"
                className="sgp-zd-action-btn"
                onClick={handleFocusFirstException}
              >
                Xem ngoại lệ trong khu vực
              </button>
            )}
            {onAddMeter && (
              <button
                type="button"
                className="sgp-zd-action-btn"
                onClick={() => onAddMeter(zone.id)}
                style={{ borderColor: '#0284C7', color: '#0284C7', fontWeight: 600 }}
              >
                + Thêm công tơ vào khu vực
              </button>
            )}
            <button
              type="button"
              className="sgp-zd-action-btn"
              onClick={onClose}
            >
              Trở về toàn cảng
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
