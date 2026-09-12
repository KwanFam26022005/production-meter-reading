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
 * SceneSummaryHUD — Low-Surface Telemetry Rail (V10 Minimal HUD)
 *
 * Normal example:
 * ✓ Bình thường   11/12 hoàn tất   1 quá hạn   [chart-icon]
 *
 * - The rail itself is very subtle/transparent smoked background
 * - Normal metrics are neutral/muted
 * - Only abnormal metrics receive semantic color (red overdue, amber review)
 * - "Phân tích" is a sleek icon button with tooltip "Phân tích vận hành"
 */
export const SceneSummaryHUD: React.FC<SceneSummaryHUDProps> = ({
  totalMeters,
  confirmedCount,
  overdueCount,
  reviewCount,
  pendingCount: _pendingCount,
  issueCount,
  exceptionFocus,
  activeFocusType,
  onToggleExceptionFocus,
  onFocusTypeChange,
  onOpenAnalytics,
}) => {
  return (
    <div className="sgp-scene-summary-hud" role="region" aria-label="Tóm tắt tác nghiệp">
      {/* LOW-SURFACE TELEMETRY RAIL */}
      <div className="sgp-telemetry-rail" role="group" aria-label="Số liệu tác nghiệp nhanh">
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
              <AlertTriangle size={13} className="sgp-telemetry-icon text-amber-400 animate-pulse" />
              <span className="text-amber-300 font-semibold">{issueCount} vấn đề</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="sgp-telemetry-icon text-emerald-400" />
              <span>Bình thường</span>
            </>
          )}
        </button>

        <span className="sgp-telemetry-divider" aria-hidden="true" />

        {/* 2. Confirmed Progress (Neutral/Muted) */}
        <div className="sgp-telemetry-item item-confirmed font-tabular text-slate-300" title="Công tơ đã ghi nhận">
          <span>{confirmedCount}/{totalMeters} hoàn tất</span>
        </div>

        {/* 3. Overdue Filter Trigger (Semantic Red) */}
        {overdueCount > 0 && (
          <>
            <span className="sgp-telemetry-divider" aria-hidden="true" />
            <button
              type="button"
              className={`sgp-telemetry-item item-overdue font-tabular ${
                activeFocusType === 'OVERDUE' ? 'active-focus' : ''
              }`}
              onClick={() => onFocusTypeChange?.(activeFocusType === 'OVERDUE' ? null : 'OVERDUE')}
              title="Nhấn để lọc các công tơ quá hạn"
            >
              <span className="chip-dot dot-rose" />
              <span className="text-rose-400 font-semibold">{overdueCount} quá hạn</span>
            </button>
          </>
        )}

        {/* 4. Review Filter Trigger (Semantic Amber) */}
        {reviewCount > 0 && (
          <>
            <span className="sgp-telemetry-divider" aria-hidden="true" />
            <button
              type="button"
              className={`sgp-telemetry-item item-review font-tabular ${
                activeFocusType === 'REVIEW' ? 'active-focus' : ''
              }`}
              onClick={() => onFocusTypeChange?.(activeFocusType === 'REVIEW' ? null : 'REVIEW')}
              title="Nhấn để lọc các công tơ cần kiểm tra"
            >
              <span className="chip-dot dot-amber" />
              <span className="text-amber-400 font-semibold">{reviewCount} kiểm tra</span>
            </button>
          </>
        )}

        {/* 5. Active Focus Reset Button */}
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

        {/* 6. On-Demand Analytics Action (Icon-Only Chart Button) */}
        {onOpenAnalytics && (
          <>
            <span className="sgp-telemetry-divider" aria-hidden="true" />
            <button
              type="button"
              className="sgp-telemetry-action sgp-map-icon-action"
              onClick={onOpenAnalytics}
              title="Phân tích vận hành"
              aria-label="Phân tích vận hành"
            >
              <BarChart2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
