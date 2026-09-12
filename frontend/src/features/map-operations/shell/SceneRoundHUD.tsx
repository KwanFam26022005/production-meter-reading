import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react';
import type { AdminDashboardRoundProgress } from '../../../types';

interface SceneRoundHUDProps {
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string;
  selectedRoundId?: string;
  completionPercent?: number;
  onSelectRound: (roundId: string) => void;
}

/**
 * SceneRoundHUD — Collapsed-by-Default Progressive Temporal Utility (V10)
 *
 * Collapsed:
 * [ Clock | 17:00 · 92% ]
 *
 * Interaction:
 * Click/hover expands full stepper navigation [ < | 17:00 · 92% | > | Close ]
 * Clicking the center time segment reveals all shift round points.
 */
export const SceneRoundHUD: React.FC<SceneRoundHUDProps> = ({
  rounds = [],
  currentRoundTime = '08:00',
  selectedRoundId,
  completionPercent = 0,
  onSelectRound,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [roundMenuOpen, setRoundMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setRoundMenuOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      {!isExpanded ? (
        /* 1. COLLAPSED TIMELINE PILL (Section 29) */
        <button
          type="button"
          className="sgp-round-hud-pill collapsed"
          onClick={() => setIsExpanded(true)}
          title={`Lượt đọc ${displayTime}, hoàn thành ${displayPct}%. Nhấn để mở điều hướng.`}
          aria-label={`Lượt đọc ${displayTime}, hoàn thành ${displayPct}%. Nhấn để mở điều hướng.`}
        >
          <Clock size={13} className="text-cyan-400" aria-hidden="true" />
          <span className="font-tabular font-semibold text-slate-100">{displayTime}</span>
          <span className="text-slate-400">·</span>
          <span className="font-tabular text-cyan-400 font-semibold">{displayPct}%</span>
        </button>
      ) : (
        /* 2. EXPANDED ROUND STEPPER */
        <div
          className="sgp-round-scene-dock sgp-round-hud-pill expanded"
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
            <ChevronLeft size={13} strokeWidth={2.5} />
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
            <Clock size={12} className="text-cyan-400" aria-hidden="true" />
            <span className="sgp-round-time font-tabular">{displayTime}</span>
            <span className="sgp-round-dot">·</span>
            <span className="sgp-round-pct font-tabular text-cyan-400">{displayPct}%</span>
          </div>

          <button
            type="button"
            className="sgp-round-nav-btn"
            onClick={handleNext}
            disabled={currentIdx < 0 || currentIdx >= rounds.length - 1}
            title="Lượt tiếp theo"
            aria-label="Lượt tiếp theo"
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            className="sgp-round-nav-btn close"
            onClick={() => {
              setIsExpanded(false);
              setRoundMenuOpen(false);
            }}
            title="Thu gọn thanh thời gian"
            aria-label="Thu gọn thanh thời gian"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 3. EXPANDED ROUND POPOVER */}
      {roundMenuOpen && rounds.length > 0 && (
        <div className="sgp-round-picker-popover" role="listbox" aria-label="Danh sách lượt đọc trong ngày">
          <div className="sgp-round-popover-header">
            <span>CHỌN LƯỢT ĐỌC TRONG NGÀY</span>
          </div>
          <div className="sgp-round-popover-body">
            {rounds.map((r) => {
              const isSelected =
                r.round_id === selectedRoundId ||
                (!selectedRoundId && r.scheduled_time === currentRoundTime);
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
                  <div className="sgp-round-item-meta-col">
                    <span className="sgp-round-item-pct font-tabular">
                      {Math.round(r.completion_percent)}%
                    </span>
                    {isSelected && <Check size={12} className="sgp-round-item-check text-cyan-400" />}
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
