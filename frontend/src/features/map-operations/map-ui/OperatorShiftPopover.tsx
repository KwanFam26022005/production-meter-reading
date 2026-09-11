import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, Clock, CheckCircle2, ChevronRight, User } from 'lucide-react';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';

export interface OperatorShiftPopoverProps {
  summary: OperatorShiftSummary | null;
  onClose: () => void;
  onSelectZone?: (zoneId: string) => void;
}

/**
 * OperatorShiftPopover — Level 2 floating contextual surface for an active operator marker.
 *
 * Displays:
 * - Operator name, employee code, and shift window (Ca 1 / 2 / 3)
 * - Overall shift completion rate across all assigned zones (0-100%)
 * - Issue counts (Quá hạn / Cần kiểm tra)
 * - Breakdown by assigned zone with fast navigation
 * - Dismissable via ESC, outside click, or explicit close button
 */
export const OperatorShiftPopover: React.FC<OperatorShiftPopoverProps> = ({
  summary,
  onClose,
  onSelectZone,
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

  const initial = summary.fullName?.trim()?.charAt(0)?.toUpperCase();
  const hasOverdue = summary.overdueMeters > 0;
  const hasReview = summary.reviewMeters > 0;
  const hasIssues = hasOverdue || hasReview;

  return (
    <aside
      ref={popoverRef}
      className="sgp-operator-shift-popover font-sans"
      role="dialog"
      aria-label={`Tiến độ ca trực của ${summary.fullName}`}
    >
      {/* 1. HEADER: Avatar, Name, Employee Code, Shift Tag, Close Button */}
      <div className="sgp-shift-popover-header">
        <div className="sgp-shift-user-row">
          <div className="sgp-shift-avatar-disc" aria-hidden="true">
            {initial ? (
              <span>{initial}</span>
            ) : (
              <User size={16} color="#FFFFFF" />
            )}
          </div>
          <div className="sgp-shift-user-info">
            <div className="sgp-shift-name-wrap">
              <span className="sgp-shift-name">{summary.fullName}</span>
              {summary.employeeCode && (
                <span className="sgp-shift-code font-tabular">({summary.employeeCode})</span>
              )}
            </div>
            <div className="sgp-shift-tag-row">
              <span className="sgp-shift-pill">
                {summary.shiftLabel || `Ca ${summary.shiftCode || '1'}`}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="sgp-shift-close-btn"
          onClick={onClose}
          aria-label="Đóng thông tin ca trực"
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. OVERALL SHIFT PROGRESS */}
      <div className="sgp-shift-progress-section">
        <div className="sgp-shift-section-title">TIẾN ĐỘ CA TRỰC</div>
        <div className="sgp-shift-progress-stat font-tabular">
          <strong className="sgp-shift-pct">{summary.progressPct}%</strong>
          <span className="sgp-shift-stat-detail">
            · {summary.completedMeters}/{summary.totalAssignedMeters} công tơ hoàn tất
          </span>
        </div>
        <div
          className="sgp-shift-prog-track"
          role="progressbar"
          aria-valuenow={summary.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ hoàn thành ca trực"
        >
          <div
            className="sgp-shift-prog-fill"
            style={{ width: `${Math.min(summary.progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. EXCEPTION BADGES */}
      <div className="sgp-shift-issues-row font-tabular">
        {hasIssues ? (
          <>
            <span
              className={`sgp-shift-issue-badge overdue ${
                hasOverdue ? 'active' : 'zero'
              }`}
            >
              {hasOverdue && <AlertCircle size={13} />}
              <span>{summary.overdueMeters} Quá hạn</span>
            </span>
            <span
              className={`sgp-shift-issue-badge review ${
                hasReview ? 'active' : 'zero'
              }`}
            >
              <span>{summary.reviewMeters} Cần kiểm tra</span>
            </span>
          </>
        ) : (
          <span className="sgp-shift-issue-badge ok">
            <CheckCircle2 size={13} />
            <span>Không có ngoại lệ trong ca</span>
          </span>
        )}
      </div>

      {/* 4. CURRENT ROUND */}
      <div className="sgp-shift-round-row font-tabular">
        <Clock size={13} className="sgp-shift-round-icon" />
        <span>Lượt hiện tại · {summary.currentRoundLabel || '11:00'}</span>
      </div>

      {/* 5. ASSIGNED ZONES BREAKDOWN */}
      <div className="sgp-shift-zones-section">
        <div className="sgp-shift-section-title">
          KHU VỰC PHỤ TRÁCH ({summary.zoneBreakdown?.length || 0})
        </div>
        <div className="sgp-shift-zone-list">
          {summary.zoneBreakdown?.map((zone) => {
            const zonePct =
              zone.total > 0 ? Math.round((zone.completed / zone.total) * 100) : 0;
            return (
              <div key={zone.zoneId} className="sgp-shift-zone-item">
                <div className="sgp-shift-zone-main">
                  <span className="sgp-shift-zone-name">{zone.zoneName}</span>
                  <span className="sgp-shift-zone-stat font-tabular">
                    {zone.completed}/{zone.total} ({zonePct}%)
                  </span>
                </div>
                <div className="sgp-shift-zone-sub">
                  <div className="sgp-shift-zone-track">
                    <div
                      className="sgp-shift-zone-fill"
                      style={{ width: `${Math.min(zonePct, 100)}%` }}
                    />
                  </div>
                  {onSelectZone && (
                    <button
                      type="button"
                      className="sgp-shift-zone-inspect-btn"
                      onClick={() => {
                        onSelectZone(zone.zoneId);
                        onClose();
                      }}
                      title={`Mở khu vực ${zone.zoneName}`}
                      aria-label={`Mở khu vực ${zone.zoneName}`}
                    >
                      <span>Xem khu</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
