import React from 'react';
import type { OperationalLayerType } from '../types';
import { MapViewportControls } from '../operational-map/MapViewportControls';
import { OperationalMapLegend } from '../operational-map/OperationalMapLegend';

interface SceneControlHUDProps {
  zoom?: number;
  activeLayer?: OperationalLayerType;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
}

/**
 * SceneControlHUD — Bottom-Right Viewport Controls (Phase U6)
 *
 * Hosts:
 * - OperationalMapLegend (Chú giải bản đồ)
 * - MapViewportControls (Single compact scene reset button)
 */
export const SceneControlHUD: React.FC<SceneControlHUDProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView = () => {},
}) => {
  return (
    <div className="sgp-scene-control-hud" role="region" aria-label="Điều khiển góc nhìn bản đồ">
      <OperationalMapLegend />
      <MapViewportControls
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    </div>
  );
};
