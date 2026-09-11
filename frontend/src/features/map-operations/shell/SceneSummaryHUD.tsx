import React from 'react';
import { AlertTriangle, CheckCircle2, BarChart2, X } from 'lucide-react';

interface SceneSummaryHUDProps {
  totalMeters: number;
  confirmedCount: number;
  overdueCount: number;
  reviewCount: number;
  pendingCount: number;
  issueCount: number;
  exceptionFocus: boolean;
  activeFocusType?: 'ALL_ISSUES' | 'OVERDUE' | 'REVIEW' | 'PENDING' | null;
  onToggleExceptionFocus: () => void;
  onFocusTypeChange?: (type: 'OVERDUE' | 'REVIEW' | 'PENDING' | null) => void;
  onOpenAnalytics?: () => void;
}

/**
 * SceneSummaryHUD — Right HUD: Compact Telemetry & Alert Focus (Section 5, 6 & 9)
 *
 * Merges the large legacy overview cards into sleek, contextual HUD chips:
 * - [ 9/12 Hoàn tất ]: Completion progress
 * - [ 3 Quá hạn ]: Overdue count, click triggers overdue focus
 * - [ 1 Cần kiểm tra ]: Review count, click triggers review focus
 * - [ 2 Chưa ghi ]: Pending count, click filters pending
 * - [ Phân tích ]: Opens AnalyticsDrawer on demand
 */
export const SceneSummaryHUD: React.FC<SceneSummaryHUDProps> = ({
  totalMeters,
  confirmedCount,
  overdueCount,
  reviewCount,
  pendingCount,
  issueCount,
  exceptionFocus,
  activeFocusType,
  onToggleExceptionFocus,
  onFocusTypeChange,
  onOpenAnalytics,
}) => {
  return (
    <div className="sgp-scene-summary-hud" role="region" aria-label="Tóm tắt tác nghiệp">
      {/* 1. EXCEPTION SUMMARY PILL */}
      <button
        type="button"
        className={`sgp-summary-pill-btn ${issueCount > 0 ? 'has-issues' : 'all-healthy'} ${
          exceptionFocus ? 'focus-active' : ''
        }`}
        onClick={onToggleExceptionFocus}
        title={
          issueCount > 0
            ? `${issueCount} vấn đề cần xử lý. Nhấn để bật/tắt chế độ tập trung.`
            : 'Tất cả công tơ trong trạng thái bình thường'
        }
        aria-pressed={exceptionFocus}
      >
        {issueCount > 0 ? (
          <>
            <AlertTriangle size={14} className="sgp-summary-icon text-amber-500 animate-pulse" />
            <span className="font-semibold">{issueCount} vấn đề cần xử lý</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="sgp-summary-icon text-emerald-500" />
            <span>Không có ngoại lệ</span>
          </>
        )}
      </button>

      {/* 2. COMPACT TELEMETRY CHIPS ROW */}
      <div className="sgp-telemetry-chips-row" role="group" aria-label="Số liệu tác nghiệp nhanh">
        {/* Confirmed chip */}
        <div className="sgp-telemetry-chip chip-confirmed font-tabular" title="Công tơ đã ghi nhận">
          <span className="chip-dot" />
          <span>{confirmedCount}/{totalMeters} hoàn tất</span>
        </div>

        {/* Overdue chip */}
        {overdueCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-chip chip-overdue font-tabular ${
              activeFocusType === 'OVERDUE' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'OVERDUE' ? null : 'OVERDUE')}
            title="Nhấn để lọc các công tơ quá hạn"
          >
            <span className="chip-dot" />
            <span>{overdueCount} quá hạn</span>
          </button>
        )}

        {/* Review chip */}
        {reviewCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-chip chip-review font-tabular ${
              activeFocusType === 'REVIEW' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'REVIEW' ? null : 'REVIEW')}
            title="Nhấn để lọc các công tơ cần kiểm tra"
          >
            <span className="chip-dot" />
            <span>{reviewCount} kiểm tra</span>
          </button>
        )}

        {/* Pending chip */}
        {pendingCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-chip chip-pending font-tabular ${
              activeFocusType === 'PENDING' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'PENDING' ? null : 'PENDING')}
            title="Nhấn để lọc các công tơ chưa ghi"
          >
            <span className="chip-dot" />
            <span>{pendingCount} chưa ghi</span>
          </button>
        )}

        {/* On-demand Analytics trigger */}
        {onOpenAnalytics && (
          <button
            type="button"
            className="sgp-telemetry-chip chip-analytics"
            onClick={onOpenAnalytics}
            title="Mở phân tích chất lượng ghi nhận & tiến độ chi tiết"
          >
            <BarChart2 size={12} className="inline mr-1 text-cyan-600" />
            <span>Phân tích</span>
          </button>
        )}
      </div>

      {/* 3. ACTIVE FOCUS BANNER (When any focus is active) */}
      {(exceptionFocus || activeFocusType) && (
        <div className="sgp-focus-indicator-banner" role="status">
          <span>
            {activeFocusType === 'OVERDUE'
              ? `Đang lọc ${overdueCount} công tơ quá hạn`
              : activeFocusType === 'REVIEW'
              ? `Đang lọc ${reviewCount} công tơ cần kiểm tra`
              : activeFocusType === 'PENDING'
              ? `Đang lọc ${pendingCount} công tơ chưa ghi`
              : `Đang tập trung ${issueCount} ngoại lệ`}
          </span>
          <button
            type="button"
            className="sgp-focus-clear-mini-btn"
            onClick={() => {
              if (activeFocusType) onFocusTypeChange?.(null);
              if (exceptionFocus) onToggleExceptionFocus();
            }}
            title="Xóa tập trung"
            aria-label="Xóa tập trung"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
