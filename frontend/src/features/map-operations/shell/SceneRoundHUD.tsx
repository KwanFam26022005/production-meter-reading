import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';
import type { AdminDashboardRoundProgress } from '../../../types';

interface SceneRoundHUDProps {
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string;
  selectedRoundId?: string;
  completionPercent?: number;
  onSelectRound: (roundId: string) => void;
}

/**
 * SceneRoundHUD — Bottom-Left Compact Temporal HUD (Section 5, 6 & 9)
 *
 * Example: `‹ 08:00 · 75% ›`
 * - Compact pill showing current round and progress %
 * - Left/Right chevrons to step through shifts
 * - Clicking pill opens compact round picker popover
 */
export const SceneRoundHUD: React.FC<SceneRoundHUDProps> = ({
  rounds = [],
  currentRoundTime = '08:00',
  selectedRoundId,
  completionPercent = 0,
  onSelectRound,
}) => {
  const [roundMenuOpen, setRoundMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setRoundMenuOpen(false);
      }
    };
    if (roundMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roundMenuOpen]);

  const currentIdx = rounds.findIndex(
    (r) => r.round_id === selectedRoundId || r.scheduled_time === currentRoundTime
  );

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx > 0) {
      onSelectRound(rounds[currentIdx - 1].round_id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx >= 0 && currentIdx < rounds.length - 1) {
      onSelectRound(rounds[currentIdx + 1].round_id);
    }
  };

  const activeRound = rounds[currentIdx] || null;
  const displayTime = activeRound?.scheduled_time || currentRoundTime;
  const displayPct = activeRound ? Math.round(activeRound.completion_percent) : Math.round(completionPercent);

  return (
    <div className="sgp-scene-round-hud-wrap" ref={popoverRef}>
      {/* 1. SCENE DOCK: CURRENT ROUND & STEPPER */}
      <div
        className="sgp-round-scene-dock sgp-round-hud-pill"
        role="region"
        aria-label={`Lượt đọc ${displayTime}, hoàn thành ${displayPct}%. Nhấn để chuyển lượt.`}
      >
        <button
          type="button"
          className="sgp-round-nav-btn"
          onClick={handlePrev}
          disabled={currentIdx <= 0}
          title="Lượt trước"
          aria-label="Lượt trước"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div
          className="sgp-round-info-segment"
          role="button"
          tabIndex={0}
          onClick={() => setRoundMenuOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setRoundMenuOpen((prev) => !prev);
            }
          }}
          title="Nhấn để chọn lượt đọc khác"
          aria-haspopup="listbox"
          aria-expanded={roundMenuOpen}
        >
          <Clock size={12} className="sgp-round-clock text-cyan-700" aria-hidden="true" />
          <span className="sgp-round-time font-tabular">{displayTime}</span>
          <span className="sgp-round-dot">·</span>
          <span className="sgp-round-pct font-tabular">{displayPct}%</span>
        </div>

        <button
          type="button"
          className="sgp-round-nav-btn"
          onClick={handleNext}
          disabled={currentIdx < 0 || currentIdx >= rounds.length - 1}
          title="Lượt tiếp theo"
          aria-label="Lượt tiếp theo"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. EXPANDED ROUND POPOVER */}
      {roundMenuOpen && rounds.length > 0 && (
        <div className="sgp-round-picker-popover" role="listbox" aria-label="Danh sách lượt đọc trong ngày">
          <div className="sgp-round-popover-header">
            <span>CHỌN LƯỢT ĐỌC TRONG NGÀY</span>
          </div>
          <div className="sgp-round-popover-body">
            {rounds.map((r) => {
              const isSelected = r.round_id === selectedRoundId || (!selectedRoundId && r.scheduled_time === currentRoundTime);
              return (
                <button
                  key={r.round_id}
                  type="button"
                  className={`sgp-round-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectRound(r.round_id);
                    setRoundMenuOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="sgp-round-item-time-col">
                    <span className="sgp-round-item-time font-tabular">{r.scheduled_time}</span>
                    <span className="sgp-round-item-sub">{r.scheduled_local || 'Định kỳ'}</span>
                  </div>
                  <div className="sgp-round-item-stat-col">
                    <span className="sgp-round-item-stat-pct font-tabular">{Math.round(r.completion_percent)}%</span>
                    {isSelected && <Check size={14} className="sgp-round-item-check" />}
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
