import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { AdminDashboardRoundProgress } from '../../../types';

interface RoundTimelineProps {
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  selectedRoundId?: string;
  onSelectRound?: (roundId: string) => void;
}

export const RoundTimeline: React.FC<RoundTimelineProps> = ({
  rounds,
  currentRoundTime,
  currentRoundStatus,
  selectedRoundId,
  onSelectRound,
}) => {
  if (!rounds || rounds.length === 0) {
    // Graceful fallback when round progress list is empty
    return (
      <div className="sgp-round-timeline-bar empty">
        <div className="sgp-rtl-summary">
          <Clock size={14} color="#0B4F75" />
          <span className="sgp-rtl-title">
            {currentRoundTime ? `Ca tác nghiệp: ${currentRoundTime}` : 'Tiến độ theo ca'}
          </span>
          {currentRoundStatus && (
            <span className="sgp-rtl-badge status">{currentRoundStatus}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sgp-round-timeline-bar" role="region" aria-label="Tiến độ ca tác nghiệp trong ngày">
      <div className="sgp-rtl-label">
        <Clock size={14} color="#0B4F75" />
        <span>Ca trực:</span>
      </div>

      <div className="sgp-rtl-track">
        {rounds.map((r, idx) => {
          const isSelected = selectedRoundId === r.round_id;
          const isCurrent = r.timing_state === 'CURRENT';
          const isPast = r.timing_state === 'PAST';

          const timingBadgeClass = isCurrent
            ? 'current'
            : isPast
            ? 'past'
            : 'upcoming';

          return (
            <React.Fragment key={r.round_id}>
              {idx > 0 && (
                <div
                  className={`sgp-rtl-connector ${isPast ? 'completed' : ''}`}
                />
              )}
              <button
                type="button"
                className={`sgp-rtl-node ${timingBadgeClass} ${
                  isSelected ? 'selected' : ''
                }`}
                onClick={() => onSelectRound && onSelectRound(r.round_id)}
                title={`Ca ${r.scheduled_time} · Tiến độ: ${r.completion_percent}% (${r.confirmed}/${r.total_meters})`}
              >
                <div className="sgp-rtl-node-dot">
                  {isPast && <CheckCircle2 size={10} color="#FFFFFF" />}
                  {isCurrent && <div className="sgp-rtl-pulse-dot" />}
                  {!isPast && !isCurrent && <div className="sgp-rtl-empty-dot" />}
                </div>
                <div className="sgp-rtl-node-info">
                  <span className="sgp-rtl-time font-tabular font-semibold">
                    {r.scheduled_time}
                  </span>
                  <span className="sgp-rtl-pct font-tabular">
                    {r.completion_percent}%
                  </span>
                </div>
                {isCurrent && currentRoundStatus && (
                  <span className="sgp-rtl-current-tag">{currentRoundStatus}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
