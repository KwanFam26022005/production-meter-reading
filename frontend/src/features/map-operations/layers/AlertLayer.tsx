import React from 'react';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';

interface AlertLayerProps {
  isActive: boolean;
  issueCount: number;
}

/**
 * AlertLayer — Visual Atmospheric Focus for Exception Mode (Section 14)
 *
 * When active:
 * - Dims unrelated scene context with a soft, transparent navy-tinted veil
 * - Keeps operational exceptions, problem zones, and operator badges dominant
 * - Never replaces the scene with a table
 */
export const AlertLayer: React.FC<AlertLayerProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <g className="sgp-alert-focus-layer" pointerEvents="none">
      {/* Soft atmospheric dimming veil over background */}
      <rect
        x={0}
        y={0}
        width={CANONICAL_SCENE_WIDTH}
        height={CANONICAL_SCENE_HEIGHT}
        fill="#071E2D"
        opacity={0.20}
        style={{ transition: 'opacity 300ms ease' }}
      />
    </g>
  );
};
