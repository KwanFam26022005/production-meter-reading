import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface OperationsStatusStripProps {
  totalMeters: number;
  confirmedCount: number;
  completionPercent: number;
  reviewCount: number;
  overdueCount: number;
  dueCount: number;
  pendingCount: number;
  onFilterProgress?: () => void;
  onFilterConfirmed?: () => void;
  onFilterReview?: () => void;
  onFilterOverdue?: () => void;
  onFilterDue?: () => void;
  activeStatusFilter?: string;
  activeLayer?: string;
}

export const OperationsStatusStrip: React.FC<OperationsStatusStripProps> = ({
  totalMeters,
  confirmedCount,
  completionPercent,
  reviewCount,
  overdueCount,
  dueCount,
  pendingCount,
  onFilterProgress,
  onFilterConfirmed,
  onFilterReview,
  onFilterOverdue,
  onFilterDue,
  activeStatusFilter,
  activeLayer,
}) => {
  return (
    <div className="sgp-status-strip" role="toolbar" aria-label="Thanh chỉ số vận hành">
      {/* 1. Overall Progress */}
      <div
        className={`sgp-strip-card progress-card interactive ${
          activeLayer === 'PROGRESS' ? 'active-filter' : ''
        }`}
        onClick={onFilterProgress}
        title="Bấm để kích hoạt lớp Tiến độ khu vực"
        role="button"
        tabIndex={0}
      >
        <div className="sgp-strip-label">Tiến độ ca trực</div>
        <div className="sgp-strip-value-row">
          <span className="sgp-strip-value font-tabular">{completionPercent}%</span>
          <span className="sgp-strip-sub font-tabular">({confirmedCount}/{totalMeters})</span>
        </div>
        <div className="sgp-strip-progress-bar">
          <div
            className="sgp-strip-progress-fill"
            style={{ width: `${Math.min(completionPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Confirmed Stat */}
      <div
        className={`sgp-strip-card stat-card confirmed interactive ${
          activeStatusFilter === 'CONFIRMED' ? 'active-filter' : ''
        }`}
        onClick={onFilterConfirmed}
        title="Bấm để lọc các công tơ đã hoàn thành"
        role="button"
        tabIndex={0}
      >
        <div className="sgp-strip-icon-wrapper confirmed">
          <CheckCircle2 size={16} />
        </div>
        <div className="sgp-strip-stat-body">
          <span className="sgp-strip-stat-num font-tabular">{confirmedCount}</span>
          <span className="sgp-strip-stat-desc">Đã hoàn thành</span>
        </div>
      </div>

      {/* 3. Review Stat */}
      <div
        className={`sgp-strip-card stat-card review interactive ${
          activeStatusFilter === 'REVIEW' ? 'active-filter' : ''
        }`}
        onClick={onFilterReview}
        title="Bấm để lọc các công tơ cần kiểm tra lại"
        role="button"
        tabIndex={0}
      >
        <div className="sgp-strip-icon-wrapper review">
          <AlertTriangle size={16} />
        </div>
        <div className="sgp-strip-stat-body">
          <span className="sgp-strip-stat-num font-tabular">{reviewCount}</span>
          <span className="sgp-strip-stat-desc">Cần kiểm tra</span>
        </div>
      </div>

      {/* 4. Overdue Stat */}
      <div
        className={`sgp-strip-card stat-card overdue interactive ${
          activeStatusFilter === 'OVERDUE' ? 'active-filter' : ''
        }`}
        onClick={onFilterOverdue}
        title="Bấm để lọc công tơ quá hạn và mở lớp ngoại lệ"
        role="button"
        tabIndex={0}
      >
        <div className="sgp-strip-icon-wrapper overdue">
          <ShieldAlert size={16} />
        </div>
        <div className="sgp-strip-stat-body">
          <span className="sgp-strip-stat-num font-tabular">{overdueCount}</span>
          <span className="sgp-strip-stat-desc">Quá hạn lượt</span>
        </div>
      </div>

      {/* 5. In-Round Due / Pending */}
      <div
        className={`sgp-strip-card stat-card due interactive ${
          activeStatusFilter === 'DUE' ? 'active-filter' : ''
        }`}
        onClick={onFilterDue}
        title="Bấm để lọc các công tơ đến hạn ghi ca"
        role="button"
        tabIndex={0}
      >
        <div className="sgp-strip-icon-wrapper due">
          <Clock size={16} />
        </div>
        <div className="sgp-strip-stat-body">
          <span className="sgp-strip-stat-num font-tabular">{dueCount + pendingCount}</span>
          <span className="sgp-strip-stat-desc">Chờ ghi nhận</span>
        </div>
      </div>
    </div>
  );
};
