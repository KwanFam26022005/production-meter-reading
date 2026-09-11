import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, Clock, UserCheck } from 'lucide-react';
import type { OperatorOperationalSummary } from '../utils/deriveOperatorOperationalSummary';

interface OperatorProgressPopoverProps {
  summary: OperatorOperationalSummary | null;
  onClose: () => void;
  onRequestReassign?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const OperatorProgressPopover: React.FC<OperatorProgressPopoverProps> = ({
  summary,
  onClose,
  onRequestReassign,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape & click outside
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

  if (!summary) {
    return (
      <div
        ref={popoverRef}
        className="sgp-operator-popover"
        role="dialog"
        aria-label="Thông tin nhân sự phụ trách"
      >
        <div className="sgp-popover-header">
          <div className="sgp-popover-user-block">
            <span className="sgp-popover-name">Chưa phân công</span>
            <span className="sgp-popover-context">Khu vực chưa có nhân sự phụ trách</span>
          </div>
          <button
            type="button"
            className="sgp-popover-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng thông tin"
          >
            <X size={15} />
          </button>
        </div>
        {onRequestReassign && (
          <div className="sgp-popover-action-row">
            <button
              type="button"
              className="sgp-btn-primary sgp-btn-sm"
              onClick={() => {
                onClose();
                onRequestReassign();
              }}
            >
              Phân công nhân sự
            </button>
          </div>
        )}
      </div>
    );
  }

  const roleText = summary.role || 'Nhân viên phụ trách';
  const contextLine = `${roleText} · ${summary.zoneName}`;
  const roundText = summary.currentRoundLabel || 'Lượt hiện tại · 11:00';

  return (
    <aside
      ref={popoverRef}
      className="sgp-operator-popover"
      role="dialog"
      aria-label={`Tiến độ phụ trách: ${summary.fullName}`}
    >
      {/* HEADER: Full name, role context, zone, and close button */}
      <div className="sgp-popover-header">
        <div className="sgp-popover-user-block">
          <div className="sgp-popover-name-row">
            <span className="sgp-popover-name">{summary.fullName}</span>
            {summary.employeeCode && (
              <span className="sgp-popover-code font-tabular">({summary.employeeCode})</span>
            )}
          </div>
          <span className="sgp-popover-context">{contextLine}</span>
        </div>
        <button
          type="button"
          className="sgp-popover-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng thông tin nhân sự"
        >
          <X size={15} />
        </button>
      </div>

      {/* PROGRESS: Tiến độ phụ trách */}
      <div className="sgp-popover-progress-block">
        <div className="sgp-popover-section-label">TIẾN ĐỘ PHỤ TRÁCH</div>
        <div className="sgp-popover-progress-stat font-tabular">
          <strong>{summary.progressPct}%</strong> · {summary.completedMeters}/{summary.totalAssignedMeters} công tơ hoàn tất
        </div>
        <div
          className="sgp-popover-prog-track"
          role="progressbar"
          aria-valuenow={summary.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ hoàn thành công việc"
        >
          <div
            className="sgp-popover-prog-fill"
            style={{ width: `${Math.min(summary.progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* ISSUES: Quá hạn / Cần kiểm tra badges */}
      <div className="sgp-popover-issues-row">
        <span
          className={`sgp-popover-issue-badge overdue ${
            summary.overdueMeters > 0 ? 'active' : 'zero'
          } font-tabular`}
        >
          {summary.overdueMeters > 0 && <AlertCircle size={13} />}
          <span>{summary.overdueMeters} Quá hạn</span>
        </span>
        <span
          className={`sgp-popover-issue-badge review ${
            summary.reviewMeters > 0 ? 'active' : 'zero'
          } font-tabular`}
        >
          <span>{summary.reviewMeters} Cần kiểm tra</span>
        </span>
      </div>

      {/* CURRENT ROUND */}
      <div className="sgp-popover-round-row font-tabular">
        <Clock size={13} className="sgp-popover-round-icon" />
        <span>{roundText}</span>
      </div>

      {/* Optional Safe Action for Reassigning */}
      {onRequestReassign && (
        <div className="sgp-popover-footer">
          <button
            type="button"
            className="sgp-popover-reassign-btn"
            onClick={() => {
              onClose();
              onRequestReassign();
            }}
          >
            <UserCheck size={13} />
            <span>Thay đổi phân công</span>
          </button>
        </div>
      )}
    </aside>
  );
};
