import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { RosterViewMode } from './types';

interface RosterToolbarProps {
  currentDateLabel: string;
  viewMode: RosterViewMode;
  onViewModeChange: (mode: RosterViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenAutoPattern: () => void;
  onRefresh: () => void;
  exportUrl: string;
  loading: boolean;
}

export const RosterToolbar: React.FC<RosterToolbarProps> = ({
  currentDateLabel,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onOpenAutoPattern,
  onRefresh,
  exportUrl,
  loading,
}) => {
  return (
    <div className="admin-roster-toolbar">
      {/* LEFT: Stepper & View Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Date Window Stepper */}
        <div className="admin-roster-stepper">
          <button
            type="button"
            onClick={onPrev}
            className="admin-btn-secondary"
            style={{ height: '30px', padding: '0 8px', border: 'none' }}
            aria-label="Khoảng thời gian trước"
            title="Lùi thời gian"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ minWidth: '120px', textAlign: 'center' }}>{currentDateLabel}</span>
          <button
            type="button"
            onClick={onNext}
            className="admin-btn-secondary"
            style={{ height: '30px', padding: '0 8px', border: 'none' }}
            aria-label="Khoảng thời gian sau"
            title="Tiến thời gian"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="roster-view-mode-group" role="group" aria-label="Chế độ xem lịch">
          <button
            type="button"
            onClick={() => onViewModeChange('WEEK')}
            className={`roster-view-mode-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('TWO_WEEK')}
            className={`roster-view-mode-btn ${viewMode === 'TWO_WEEK' ? 'active' : ''}`}
          >
            2 tuần
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('MONTH')}
            className={`roster-view-mode-btn ${viewMode === 'MONTH' ? 'active' : ''}`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('COVERAGE')}
            className={`roster-view-mode-btn ${viewMode === 'COVERAGE' ? 'active' : ''}`}
          >
            Coverage
          </button>
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="admin-roster-actions">
        <button
          type="button"
          onClick={onOpenAutoPattern}
          className="admin-btn-secondary"
          title="Áp dụng chu kỳ 3 ca 4 kíp cảng biển tự động"
          style={{ borderColor: 'var(--sgp-brand-600)', color: 'var(--sgp-brand-800)', fontWeight: 650 }}
        >
          <Sparkles size={15} style={{ color: 'var(--sgp-brand-600)' }} />
          <span>Tạo lịch theo chu kỳ</span>
        </button>

        <a
          href={exportUrl}
          download
          className="admin-btn-secondary"
          title="Tải bảng phân ca Excel / CSV"
        >
          <Download size={15} />
          <span>Xuất Excel / CSV</span>
        </a>

        <button
          type="button"
          onClick={onRefresh}
          className="admin-btn-refresh"
          title="Tải lại dữ liệu từ máy chủ"
          aria-label="Tải lại dữ liệu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};
