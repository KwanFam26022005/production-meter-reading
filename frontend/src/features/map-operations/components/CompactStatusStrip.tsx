import React from 'react';

interface CompactStatusStripProps {
  totalMeters: number;
  confirmedCount: number;
  completionPercent: number;
  reviewCount: number;
  overdueCount: number;
  dueCount: number;
  pendingCount: number;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
}

export const CompactStatusStrip: React.FC<CompactStatusStripProps> = ({
  totalMeters,
  confirmedCount,
  completionPercent,
  reviewCount,
  overdueCount,
  dueCount,
  pendingCount,
  activeStatusFilter,
  onSelectStatusFilter,
}) => {
  const unreadCount = dueCount + pendingCount;

  const handleToggle = (targetStatus: string) => {
    if (activeStatusFilter === targetStatus) {
      onSelectStatusFilter('ALL');
    } else {
      onSelectStatusFilter(targetStatus);
    }
  };

  return (
    <div
      className="sgp-compact-status-strip"
      role="toolbar"
      aria-label="Thanh trạng thái tóm tắt"
    >
      {/* 1. Progress & Completed */}
      <button
        type="button"
        className={`sgp-css-item progress-item ${
          activeStatusFilter === 'CONFIRMED' ? 'active' : ''
        }`}
        onClick={() => handleToggle('CONFIRMED')}
        title="Lọc các công tơ đã hoàn thành"
      >
        <span className="sgp-css-progress-pct font-tabular font-bold">
          {completionPercent}%
        </span>
        <span className="sgp-css-progress-sub font-tabular">
          · {confirmedCount}/{totalMeters} hoàn tất
        </span>
      </button>

      <span className="sgp-css-divider" aria-hidden="true">|</span>

      {/* 2. Overdue */}
      <button
        type="button"
        className={`sgp-css-item overdue-item ${
          activeStatusFilter === 'OVERDUE' ? 'active' : ''
        }`}
        onClick={() => handleToggle('OVERDUE')}
        title="Lọc các công tơ quá hạn"
      >
        <span className={`sgp-css-dot overdue ${overdueCount > 0 ? 'pulse' : ''}`} />
        <span className="font-tabular font-semibold">{overdueCount}</span>
        <span>quá hạn</span>
      </button>

      <span className="sgp-css-divider" aria-hidden="true">|</span>

      {/* 3. Review */}
      <button
        type="button"
        className={`sgp-css-item review-item ${
          activeStatusFilter === 'REVIEW' ? 'active' : ''
        }`}
        onClick={() => handleToggle('REVIEW')}
        title="Lọc các công tơ cần kiểm tra"
      >
        <span className="sgp-css-dot review" />
        <span className="font-tabular font-semibold">{reviewCount}</span>
        <span>cần kiểm tra</span>
      </button>

      <span className="sgp-css-divider" aria-hidden="true">|</span>

      {/* 4. Unread / Pending */}
      <button
        type="button"
        className={`sgp-css-item pending-item ${
          activeStatusFilter === 'DUE' || activeStatusFilter === 'PENDING' ? 'active' : ''
        }`}
        onClick={() => handleToggle('DUE')}
        title="Lọc các công tơ chưa ghi nhận"
      >
        <span className="sgp-css-dot pending" />
        <span className="font-tabular font-semibold">{unreadCount}</span>
        <span>chưa ghi</span>
      </button>
    </div>
  );
};
