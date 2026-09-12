import React from 'react';
import type { OperationalLayerType } from '../types';
import { OperationalMapLegend } from '../operational-map/OperationalMapLegend';

interface SceneControlHUDProps {
  zoom?: number;
  activeLayer?: OperationalLayerType;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
}

/**
 * SceneControlHUD — Bottom-Right Viewport Controls (V13.2 Section 19-21)
 *
 * Cleaned to retain only the single map information/legend entry [i].
 * Fullscreen / Maximize viewport buttons removed.
 */
export const SceneControlHUD: React.FC<SceneControlHUDProps> = () => {
  return (
    <div className="sgp-scene-control-hud" role="region" aria-label="Chú giải bản đồ">
      <OperationalMapLegend />
    </div>
  );
};
