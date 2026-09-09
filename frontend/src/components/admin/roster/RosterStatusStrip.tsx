import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Edit3,
  CheckCircle2,
} from 'lucide-react';

interface RosterStatusStripProps {
  coveragePercent: number;
  totalConflicts: number;
  pendingLeavesCount: number;
  pendingChangesCount: number;
  onOpenConflicts: () => void;
  onJumpToLeaves: () => void;
}

export const RosterStatusStrip: React.FC<RosterStatusStripProps> = ({
  coveragePercent,
  totalConflicts,
  pendingLeavesCount,
  pendingChangesCount,
  onOpenConflicts,
  onJumpToLeaves,
}) => {
  const coverageClass =
    coveragePercent >= 95 ? 'status-ok' : coveragePercent >= 80 ? 'status-warning' : 'status-danger';

  const systemCheckTooltip = `Hệ thống tự động kiểm tra:
• Độ phủ nhân sự C1/C2/C3 tối thiểu
• Lịch nghỉ phép đã phê duyệt
• Thời gian nghỉ giữa các ca (nghỉ chuyển ca)
• Trạng thái phân ca bất thường`;

  return (
    <div className="roster-status-strip" role="status" aria-label="Tình trạng phân ca hiện tại">
      <div className="roster-status-items">
        {/* Coverage Percentage */}
        <div className={`roster-status-item ${coverageClass}`}>
          <ShieldCheck size={16} />
          <span>
            Độ phủ 24/7: <strong>{coveragePercent}%</strong>
          </span>
        </div>

        <span style={{ color: 'var(--sgp-border-strong)' }}>|</span>

        {/* Actionable Conflicts (P2.5) */}
        <button
          type="button"
          onClick={onOpenConflicts}
          className={`roster-status-btn-conflict ${totalConflicts > 0 ? 'has-issues' : 'clean'}`}
          title={
            totalConflicts > 0
              ? `Phát hiện ${totalConflicts} vấn đề cần xử lý. Bấm để xem chi tiết và đi tới vị trí xung đột.`
              : 'Lịch phân ca không có xung đột. Bấm để kiểm tra chi tiết.'
          }
        >
          <AlertTriangle size={15} />
          <span>
            Xung đột: <strong>{totalConflicts}</strong>
          </span>
          {totalConflicts > 0 && <span className="conflict-tag-badge">Chi tiết</span>}
        </button>

        <span style={{ color: 'var(--sgp-border-strong)' }}>|</span>

        {/* Pending Leaves */}
        <button
          type="button"
          onClick={onJumpToLeaves}
          className="roster-status-btn-clean"
          style={{ color: pendingLeavesCount > 0 ? '#B45309' : 'var(--sgp-ink)' }}
          title="Bấm để xem danh sách đơn xin nghỉ phép chờ duyệt"
        >
          <Clock size={15} />
          <span>
            Phép chờ duyệt: <strong>{pendingLeavesCount}</strong>
          </span>
        </button>

        <span style={{ color: 'var(--sgp-border-strong)' }}>|</span>

        {/* Draft Changes */}
        <div
          className="roster-status-item"
          style={{ color: pendingChangesCount > 0 ? '#D97706' : 'var(--sgp-ink-secondary)' }}
        >
          <Edit3 size={15} />
          <span>
            Thay đổi nháp: <strong>{pendingChangesCount}</strong>
          </span>
        </div>
      </div>

      {/* P2.9: Deterministic validation indicator (No AI buzzwords) */}
      <div
        className="roster-system-status-pill"
        title={systemCheckTooltip}
        tabIndex={0}
        role="note"
        aria-label={systemCheckTooltip}
      >
        <CheckCircle2 size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
        <span>Kiểm tra lịch tự động đang bật</span>
      </div>
    </div>
  );
};
