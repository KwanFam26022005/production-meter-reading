import React from 'react';
import type { OperatorMotionState } from './motionStates';

export interface OperatorActivityEffectProps {
  motionState: OperatorMotionState;
  selected?: boolean;
  reducedMotion?: boolean;
}

/**
 * OperatorActivityEffect — V15A Reusable SVG Motion Component for Operators
 *
 * Encapsulates SVG effects for operational operator motion states:
 * - idle: Static avatar (no motion, no breathing)
 * - moving: Moving-ready subtle dashed indicator outside progress ring
 * - arriving: Arriving-ready pulse outside progress ring
 * - reading: Subtle thin cyan rotating arc outside progress ring (1.6s linear infinite)
 * - completed: Shift completed indicator
 * - issue: Static (issue badge handles entrance scale separately)
 * - selected: Cyan outer focus ring (r=18.5) and one-shot focus emphasis
 */
export const OperatorActivityEffect: React.FC<OperatorActivityEffectProps> = React.memo(({
  motionState,
  selected = false,
  reducedMotion = false,
}) => {
  const isSelected = selected || motionState === 'selected';

  return (
    <g className="sgp-op-activity-effect" pointerEvents="none">
      {/* 1. SELECTION FOCUS RING (Section 16: cyan outer focus ring r=18.5) */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={18.5}
          fill="none"
          stroke="#00E5FF"
          strokeWidth={2}
          filter="drop-shadow(0 0 6px rgba(0, 229, 255, 0.75))"
          className="sgp-op-marker-halo"
        />
      )}

      {/* 2. READING: Thin cyan rotating arc outside progress ring (Section 13) */}
      {motionState === 'reading' && (
        <g className="sgp-op-reading-group">
          <circle
            cx={0}
            cy={0}
            r={18.5}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={1.5}
            strokeDasharray="32 84"
            strokeLinecap="round"
            className={reducedMotion ? 'sgp-op-reading-arc-static' : 'sgp-op-reading-arc'}
          />
        </g>
      )}

      {/* 3. MOVING: Moving-ready indicator outside progress ring */}
      {motionState === 'moving' && !reducedMotion && (
        <circle
          cx={0}
          cy={0}
          r={18.5}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={1.2}
          strokeDasharray="16 16"
          className="sgp-op-moving-ring"
        />
      )}

      {/* 4. ARRIVING: Arriving-ready indicator outside progress ring */}
      {motionState === 'arriving' && !reducedMotion && (
        <circle
          cx={0}
          cy={0}
          r={18.5}
          fill="none"
          stroke="#06B6D4"
          strokeWidth={1.4}
          className="sgp-op-arriving-ring"
        />
      )}
    </g>
  );
});

OperatorActivityEffect.displayName = 'OperatorActivityEffect';
