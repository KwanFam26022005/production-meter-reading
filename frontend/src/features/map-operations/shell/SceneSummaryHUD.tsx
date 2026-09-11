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
      {/* COHERENT UNIFIED TELEMETRY CLUSTER */}
      <div className="sgp-telemetry-cluster" role="group" aria-label="Số liệu tác nghiệp nhanh">
        {/* 1. Overall Exception / Healthy State Indicator */}
        <button
          type="button"
          className={`sgp-telemetry-item item-exception ${issueCount > 0 ? 'has-issues' : 'all-healthy'} ${
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
              <AlertTriangle size={13} className="sgp-telemetry-icon text-amber-500 animate-pulse" />
              <span>{issueCount} vấn đề</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="sgp-telemetry-icon text-emerald-500" />
              <span>Bình thường</span>
            </>
          )}
        </button>

        <span className="sgp-telemetry-divider" aria-hidden="true" />

        {/* 2. Confirmed Progress */}
        <div className="sgp-telemetry-item item-confirmed font-tabular" title="Công tơ đã ghi nhận">
          <span className="chip-dot dot-emerald" />
          <span>{confirmedCount}/{totalMeters} hoàn tất</span>
        </div>

        {/* 3. Overdue Filter Trigger */}
        {overdueCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-item item-overdue font-tabular ${
              activeFocusType === 'OVERDUE' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'OVERDUE' ? null : 'OVERDUE')}
            title="Nhấn để lọc các công tơ quá hạn"
          >
            <span className="chip-dot dot-rose" />
            <span>{overdueCount} quá hạn</span>
          </button>
        )}

        {/* 4. Review Filter Trigger */}
        {reviewCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-item item-review font-tabular ${
              activeFocusType === 'REVIEW' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'REVIEW' ? null : 'REVIEW')}
            title="Nhấn để lọc các công tơ cần kiểm tra"
          >
            <span className="chip-dot dot-amber" />
            <span>{reviewCount} kiểm tra</span>
          </button>
        )}

        {/* 5. Pending Filter Trigger */}
        {pendingCount > 0 && (
          <button
            type="button"
            className={`sgp-telemetry-item item-pending font-tabular ${
              activeFocusType === 'PENDING' ? 'active-focus' : ''
            }`}
            onClick={() => onFocusTypeChange?.(activeFocusType === 'PENDING' ? null : 'PENDING')}
            title="Nhấn để lọc các công tơ chưa ghi"
          >
            <span className="chip-dot dot-slate" />
            <span>{pendingCount} chưa ghi</span>
          </button>
        )}

        {/* 6. Active Focus Reset Button */}
        {(exceptionFocus || activeFocusType) && (
          <button
            type="button"
            className="sgp-telemetry-item item-reset"
            onClick={() => {
              if (exceptionFocus) onToggleExceptionFocus();
              onFocusTypeChange?.(null);
            }}
            title="Xóa chế độ tập trung cảnh báo"
            aria-label="Xóa bộ lọc tập trung"
          >
            <X size={12} />
            <span>Xóa lọc</span>
          </button>
        )}

        {/* 7. On-Demand Analytics Drawer Trigger */}
        {onOpenAnalytics && (
          <>
            <span className="sgp-telemetry-divider" aria-hidden="true" />
            <button
              type="button"
              className="sgp-telemetry-item item-analytics chip-analytics"
              onClick={onOpenAnalytics}
              title="Mở bảng phân tích chất lượng dữ liệu OCR và tiến độ"
              aria-label="Mở bảng phân tích"
            >
              <BarChart2 size={13} className="text-cyan-600" />
              <span>Phân tích</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
