import React from 'react';
import type { MeterMotionState } from './motionStates';

export interface MeterActivityEffectProps {
  motionState: MeterMotionState;
  selected?: boolean;
  reducedMotion?: boolean;
}

/**
 * MeterActivityEffect — V15A Reusable SVG Motion Component for Meters
 *
 * Encapsulates SVG effects for operational meter motion states:
 * - pending: Static (no motion)
 * - approaching: 2-wave expanding target wave (r: 10px -> 22px, opacity: 0.60 -> 0, repeat 2 times only)
 * - reading: 90-120 degree circular activity arc rotating continuously outside marker (1.6s linear)
 * - completed: One-shot progress sweep around marker (300-450ms)
 * - overdue: Slow outer halo heartbeat (scale 1 -> 1.06 -> 1, opacity 0.68 -> 0.95 -> 0.68, 2.0s)
 * - review: One-shot double ring on entry, static amber marker afterwards
 * - selected: Focus expansion and cyan/white dual focus ring
 */
export const MeterActivityEffect: React.FC<MeterActivityEffectProps> = React.memo(({
  motionState,
  selected = false,
  reducedMotion = false,
}) => {
  const isSelected = selected || motionState === 'selected';

  return (
    <g className="sgp-meter-activity-effect" pointerEvents="none">
      {/* 1. SELECTION FOCUS RINGS (Section 11: cyan/white focus ring, preserved) */}
      {isSelected && (
        <g className="sgp-meter-selection-rings">
          <circle
            cx={0}
            cy={0}
            r={14}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={2}
            className="sgp-marker-selected-ring"
          />
          <circle
            cx={0}
            cy={0}
            r={16.5}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            opacity={0.9}
            filter="drop-shadow(0 0 6px rgba(0, 229, 255, 0.75))"
          />
        </g>
      )}

      {/* 2. APPROACHING: Target-wave effect (2 expanding rings, repeat 2 times only, Section 6) */}
      {motionState === 'approaching' && !reducedMotion && (
        <g className="sgp-meter-approaching-group">
          <circle
            cx={0}
            cy={0}
            r={10}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={1.5}
            className="sgp-meter-target-wave wave-1"
          />
          <circle
            cx={0}
            cy={0}
            r={10}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={1.5}
            className="sgp-meter-target-wave wave-2"
          />
        </g>
      )}

      {/* 3. READING: 90-120 degree rotating circular activity arc outside marker (Section 7) */}
      {motionState === 'reading' && (
        <g className="sgp-meter-reading-group">
          <circle
            cx={0}
            cy={0}
            r={14}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={1.8}
            strokeDasharray="26 62"
            strokeLinecap="round"
            className={reducedMotion ? 'sgp-meter-reading-arc-static' : 'sgp-meter-reading-arc'}
          />
        </g>
      )}

      {/* 4. COMPLETED: One-shot progress sweep around marker (300-450ms, Section 8) */}
      {motionState === 'completed' && !reducedMotion && (
        <g className="sgp-meter-completed-group">
          <circle
            cx={0}
            cy={0}
            r={14}
            fill="none"
            stroke="#10B981"
            strokeWidth={1.8}
            strokeDasharray="88"
            strokeLinecap="round"
            className="sgp-meter-completed-sweep"
          />
        </g>
      )}

      {/* 5. OVERDUE: Slow outer halo heartbeat only (1.8-2.2s, Section 9) */}
      {motionState === 'overdue' && (
        <g className="sgp-meter-overdue-group">
          <circle
            cx={0}
            cy={0}
            r={14}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.6}
            className={reducedMotion ? 'sgp-meter-overdue-halo-static' : 'sgp-meter-overdue-halo'}
          />
        </g>
      )}

      {/* 6. REVIEW: One-shot double ring on entry (Section 10) */}
      {motionState === 'review' && !reducedMotion && (
        <g className="sgp-meter-review-group">
          <circle
            cx={0}
            cy={0}
            r={12}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={1.5}
            className="sgp-meter-review-entry-ring ring-1"
          />
          <circle
            cx={0}
            cy={0}
            r={12}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={1.5}
            className="sgp-meter-review-entry-ring ring-2"
          />
        </g>
      )}
    </g>
  );
});

MeterActivityEffect.displayName = 'MeterActivityEffect';
