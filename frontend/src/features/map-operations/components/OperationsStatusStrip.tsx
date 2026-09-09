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
  onOpenExceptions?: () => void;
}

export const OperationsStatusStrip: React.FC<OperationsStatusStripProps> = ({
  totalMeters,
  confirmedCount,
  completionPercent,
  reviewCount,
  overdueCount,
  dueCount,
  pendingCount,
  onOpenExceptions,
}) => {
  return (
    <div className="sgp-status-strip">
      {/* 1. Overall Progress */}
      <div className="sgp-strip-card progress-card">
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
      <div className="sgp-strip-card stat-card confirmed">
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
        className={`sgp-strip-card stat-card review ${onOpenExceptions ? 'interactive' : ''}`}
        onClick={onOpenExceptions}
        title={onOpenExceptions ? 'Bấm để xem danh sách cần kiểm tra' : undefined}
        role={onOpenExceptions ? 'button' : undefined}
        tabIndex={onOpenExceptions ? 0 : undefined}
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
        className={`sgp-strip-card stat-card overdue ${onOpenExceptions ? 'interactive' : ''}`}
        onClick={onOpenExceptions}
        title={onOpenExceptions ? 'Bấm để xem danh sách quá hạn' : undefined}
        role={onOpenExceptions ? 'button' : undefined}
        tabIndex={onOpenExceptions ? 0 : undefined}
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
      <div className="sgp-strip-card stat-card due">
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
