import React, { useEffect, useRef } from 'react';
import { X, Clock, User as UserIcon } from 'lucide-react';
import type { OperatorOperationalSummary } from '../utils/deriveOperatorOperationalSummary';

interface OperatorProgressPopoverProps {
  summary: OperatorOperationalSummary | null;
  onClose: () => void;
  onRequestReassign?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * OperatorProgressPopover — Contextual popover for responsible operator matching Figma Frame 9:8
 *
 * Visual layout:
 * 1. User Header: Avatar disc, Full name, Role & Zone context, Close button
 * 2. TIẾN ĐỘ PHỤ TRÁCH: `X% · completed/total công tơ hoàn tất` & progress bar
 * 3. Side-by-side metric tiles:
 *    - Left tile (Red): Quá hạn count
 *    - Right tile (Yellow/Neutral): Cần kiểm tra count
 * 4. Footer: Clock icon + "Lượt hiện tại · 11:00" & helper text
 */
export const OperatorProgressPopover: React.FC<OperatorProgressPopoverProps> = ({
  summary,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [onClose]);

  if (!summary) return null;

  const roleText = summary.role || 'Nhân viên phụ trách';
  const contextLine = `${roleText} · ${summary.zoneName}`;
  const roundText = summary.currentRoundLabel || 'Lượt hiện tại · 11:00';

  return (
    <aside
      ref={popoverRef}
      className="sgp-operator-popover figma-9-8"
      role="dialog"
      aria-label={`Tiến độ phụ trách: ${summary.fullName}`}
    >
      {/* 1. HEADER: User avatar, name, zone context, and close button */}
      <div className="sgp-pop-header">
        <div className="sgp-pop-avatar-circle">
          <UserIcon size={20} color="#FFFFFF" />
        </div>
        <div className="sgp-pop-user-text">
          <h3 className="sgp-pop-user-name">{summary.fullName}</h3>
          <p className="sgp-pop-user-context">{contextLine}</p>
        </div>
        <button
          type="button"
          className="sgp-pop-close-btn"
          onClick={onClose}
          aria-label="Đóng thông tin nhân sự"
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. TIẾN ĐỘ PHỤ TRÁCH */}
      <div className="sgp-pop-progress-section">
        <div className="sgp-pop-section-label">TIẾN ĐỘ PHỤ TRÁCH</div>
        <div className="sgp-pop-stat-line font-tabular">
          <strong>{summary.progressPct}%</strong> · {summary.completedMeters}/{summary.totalAssignedMeters} công tơ hoàn tất
        </div>
        <div
          className="sgp-pop-prog-track"
          role="progressbar"
          aria-valuenow={summary.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="sgp-pop-prog-fill"
            style={{ width: `${Math.min(summary.progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. SIDE-BY-SIDE METRIC TILES (Figma 9:8) */}
      <div className="sgp-pop-metric-tiles font-tabular">
        {/* Left Tile: Quá hạn */}
        <div className={`sgp-pop-tile overdue ${summary.overdueMeters > 0 ? 'has-issues' : ''}`}>
          <span className="sgp-pop-tile-num">{summary.overdueMeters}</span>
          <span className="sgp-pop-tile-label">Quá hạn</span>
        </div>

        {/* Right Tile: Cần kiểm tra */}
        <div className={`sgp-pop-tile review ${summary.reviewMeters > 0 ? 'has-issues' : ''}`}>
          <span className="sgp-pop-tile-num">{summary.reviewMeters}</span>
          <span className="sgp-pop-tile-label">Cần kiểm tra</span>
        </div>
      </div>

      {/* 4. FOOTER: Current round & helper info */}
      <div className="sgp-pop-footer font-tabular">
        <div className="sgp-pop-round-line">
          <Clock size={13} className="sgp-pop-clock-icon" />
          <span>{roundText}</span>
        </div>
        <p className="sgp-pop-helper-note">
          Cập nhật tiến độ theo dữ liệu công tơ trong khu vực
        </p>
      </div>
    </aside>
  );
};
