import React from 'react';
import {
  Zap,
  Clock,
  CalendarDays,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { NextShiftInfo, TodayAttendance, TodayOperationsResponse } from '../../types';
import { HomeInsight, selectPriorityInsight } from './priorityInsightLogic';

export interface InsightFeedProps {
  operations: TodayOperationsResponse | null;
  attendance: TodayAttendance | null;
  nextShift: NextShiftInfo | null;
  loadingOperations: boolean;
  loadingAttendance: boolean;
  operationsError: string | null;
  attendanceError?: string | null;
  onRetryOperations: () => void;
  onRetryAttendance?: () => void;
  onOpenMeter: () => void;
  onOpenAttendance: () => void;
  onOpenSchedule: () => void;
}

export const InsightFeed: React.FC<InsightFeedProps> = ({
  operations,
  attendance,
  nextShift,
  loadingOperations,
  loadingAttendance,
  operationsError,
  attendanceError,
  onRetryOperations,
  onRetryAttendance,
  onOpenMeter,
  onOpenAttendance,
  onOpenSchedule,
}) => {
  // 1. Loading State Skeleton
  if (loadingOperations && !operations) {
    return (
      <section className="sgp-insight-feed" aria-label="Thông tin tác nghiệp">
        <div className="sgp-compact-feed-header">VIỆC CẦN LÀM</div>
        <div className="workspace-priority-skeleton" aria-busy="true">
          <div className="skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
          <div className="skeleton-line" style={{ width: '50%' }} />
        </div>
      </section>
    );
  }

  // 2. Operations Error State
  if (operationsError) {
    return (
      <section className="sgp-insight-feed" aria-label="Thông tin tác nghiệp">
        <div className="sgp-compact-feed-header">VIỆC CẦN LÀM</div>
        <div className="workspace-priority-card-error">
          <div className="workspace-priority-error-text">
            <AlertCircle size={16} />
            <span>{operationsError}</span>
          </div>
          <button
            type="button"
            className="workspace-priority-retry-btn"
            onClick={onRetryOperations}
            aria-label="Thử lại tải dữ liệu tác nghiệp"
          >
            <RefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      </section>
    );
  }

  // 3. Resolve 1 Dynamic Priority Action + Compact Updates
  const { priority, updates } = selectPriorityInsight({
    operations,
    attendance,
    nextShift,
    loadingAttendance,
    attendanceError,
    onOpenMeter,
    onOpenAttendance,
    onOpenSchedule,
    onRetryAttendance,
  });

  const getCategoryIcon = (category: HomeInsight['category']) => {
    switch (category) {
      case 'METER':
        return <Zap size={18} strokeWidth={2.2} />;
      case 'ATTENDANCE':
        return <Clock size={18} strokeWidth={2.2} />;
      case 'SCHEDULE':
        return <CalendarDays size={18} strokeWidth={2.2} />;
      default:
        return <Zap size={18} strokeWidth={2.2} />;
    }
  };

  return (
    <section className="sgp-insight-feed" aria-label="Thông tin tác nghiệp">
      {/* ============================================================
          SECTION 1: DYNAMIC PRIORITY ACTION (HERO CARD)
          ============================================================ */}
      {priority && (
        <div className="sgp-priority-section" aria-label="Hành động ưu tiên">
          <div className="sgp-priority-eyebrow">VIỆC CẦN LÀM</div>
          <article
            className={`sgp-priority-action-card ${priority.category === 'METER' ? 'sgp-priority-action-card--meter' : 'sgp-priority-action-card--attendance'}`}
            aria-labelledby="priority-card-title"
          >
            <div className="sgp-priority-header">
              <div className="sgp-priority-icon-pill">
                {getCategoryIcon(priority.category)}
              </div>
              {priority.badge && (
                <span className={`sgp-priority-badge sgp-priority-badge--${priority.badge.variant || 'neutral'}`}>
                  {priority.badge.text}
                </span>
              )}
            </div>

            <div className="sgp-priority-content">
              <h2 id="priority-card-title" className="sgp-priority-title">
                {priority.title}
              </h2>
              <p className="sgp-priority-context">
                {priority.context}
              </p>
            </div>

            {priority.onAction && priority.ctaLabel && (
              <div className="sgp-priority-action-row">
                <button
                  type="button"
                  className="sgp-priority-cta"
                  onClick={priority.onAction}
                  aria-label={priority.ctaLabel}
                >
                  <span>{priority.ctaLabel}</span>
                  <ChevronRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}
          </article>
        </div>
      )}

      {/* ============================================================
          SECTION 2: COMPACT OPERATIONAL UPDATES
          ============================================================ */}
      {updates.length > 0 && (
        <div className="sgp-compact-feed" aria-label="Cập nhật tác nghiệp">
          <div className="sgp-compact-feed-header">CẬP NHẬT HÔM NAY</div>
          <div className="sgp-compact-group" role="list">
            {updates.map((item) => {
              const isClickable = Boolean(item.onAction);
              return (
                <div
                  key={item.id}
                  className={`sgp-compact-row ${isClickable ? 'sgp-compact-row--clickable' : ''}`}
                  onClick={item.onAction}
                  role={isClickable ? 'button' : 'listitem'}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            item.onAction?.();
                          }
                        }
                      : undefined
                  }
                  aria-label={isClickable ? `${item.title}: ${item.context}` : undefined}
                >
                  <div className={`sgp-compact-icon-wrap sgp-compact-icon-wrap--${item.category.toLowerCase()}`} aria-hidden="true">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="sgp-compact-row-body">
                    <div className="sgp-compact-row-top">
                      <span className="sgp-compact-row-title">{item.title}</span>
                      {item.badge && (
                        <span className={`sgp-compact-badge sgp-compact-badge--${item.badge.variant || 'neutral'}`}>
                          {item.badge.text}
                        </span>
                      )}
                    </div>
                    <p className="sgp-compact-row-desc">{item.context}</p>
                  </div>

                  {isClickable && (
                    <div className="sgp-compact-row-arrow" aria-hidden="true">
                      <ChevronRight size={16} strokeWidth={2} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
