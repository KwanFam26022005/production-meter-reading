import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { AdminDashboardRoundProgress } from '../../../types';

interface CurrentRoundControlProps {
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  selectedRoundId?: string;
  onSelectRound: (roundId: string) => void;
}

export const CurrentRoundControl: React.FC<CurrentRoundControlProps> = ({
  rounds,
  currentRoundTime,
  currentRoundStatus,
  selectedRoundId,
  onSelectRound,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!rounds || rounds.length === 0) {
    return (
      <div className="sgp-current-round-card empty">
        <div className="sgp-crc-header">
          <Clock size={13} color="#0B4F75" />
          <span className="sgp-crc-label">Lượt hiện tại</span>
        </div>
        <div className="sgp-crc-main">
          <span className="sgp-crc-time">
            {currentRoundTime ? `Ca ${currentRoundTime}` : 'Đang theo dõi'}
          </span>
          {currentRoundStatus && (
            <span className="sgp-crc-tag">{currentRoundStatus}</span>
          )}
        </div>
      </div>
    );
  }

  // Find active round index
  const currentIndex = selectedRoundId
    ? rounds.findIndex((r) => r.round_id === selectedRoundId)
    : rounds.findIndex((r) => r.timing_state === 'CURRENT');
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  const activeRound = rounds[activeIdx];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx > 0) {
      onSelectRound(rounds[activeIdx - 1].round_id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx < rounds.length - 1) {
      onSelectRound(rounds[activeIdx + 1].round_id);
    }
  };

  return (
    <div className="sgp-current-round-card" ref={popoverRef}>
      <div className="sgp-crc-top-row">
        <span className="sgp-crc-title">LƯỢT HIỆN TẠI</span>
        {activeRound.timing_state === 'CURRENT' && currentRoundStatus && (
          <span className="sgp-crc-status-tag">{currentRoundStatus}</span>
        )}
      </div>

      {/* Nav row: ‹ 14:00 · 83% › */}
      <div className="sgp-crc-nav-row">
        <button
          type="button"
          className="sgp-crc-arrow-btn"
          onClick={handlePrev}
          disabled={activeIdx <= 0}
          title="Lượt trước"
          aria-label="Lượt trước"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="sgp-crc-center-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Chọn lượt tác nghiệp"
          aria-expanded={isOpen}
        >
          <span className="sgp-crc-time font-tabular font-bold">
            {activeRound.scheduled_time}
          </span>
          <span className="sgp-crc-dot" aria-hidden="true">·</span>
          <span className="sgp-crc-pct font-tabular font-semibold">
            {activeRound.completion_percent}%
          </span>
        </button>

        <button
          type="button"
          className="sgp-crc-arrow-btn"
          onClick={handleNext}
          disabled={activeIdx >= rounds.length - 1}
          title="Lượt tiếp theo"
          aria-label="Lượt tiếp theo"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Sub-summary */}
      <div className="sgp-crc-sub-row font-tabular">
        <span>{activeRound.confirmed}/{activeRound.total_meters} hoàn tất</span>
        {activeRound.review > 0 && (
          <span className="sgp-crc-sub-alert">· {activeRound.review} cần duyệt</span>
        )}
      </div>

      {/* Round selector popover */}
      {isOpen && (
        <div className="sgp-crc-popover" role="dialog" aria-label="Danh sách ca trực">
          <div className="sgp-crc-popover-title">Chọn ca trực trong ngày</div>
          <div className="sgp-crc-popover-list">
            {rounds.map((r) => {
              const isSelected = r.round_id === activeRound.round_id;
              return (
                <button
                  key={r.round_id}
                  type="button"
                  className={`sgp-crc-popover-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectRound(r.round_id);
                    setIsOpen(false);
                  }}
                >
                  <div className="sgp-crc-pi-left">
                    <span className="sgp-crc-pi-time font-tabular font-semibold">
                      {r.scheduled_time}
                    </span>
                    <span className="sgp-crc-pi-state">
                      {r.timing_state === 'CURRENT'
                        ? 'Đang mở'
                        : r.timing_state === 'PAST'
                        ? 'Đã đóng'
                        : 'Lịch dự kiến'}
                    </span>
                  </div>
                  <div className="sgp-crc-pi-right font-tabular">
                    <span>{r.completion_percent}%</span>
                    {r.timing_state === 'PAST' && (
                      <CheckCircle2 size={12} color="#10B981" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
