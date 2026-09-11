import React from 'react';
import type { OperationalLayerType } from '../types';
import { MapViewportControls } from '../operational-map/MapViewportControls';

interface SceneControlHUDProps {
  zoom: number;
  activeLayer?: OperationalLayerType;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

/**
 * SceneControlHUD — Bottom-Right Viewport Controls (Phase U5)
 *
 * Hosts:
 * - MapViewportControls (GPS Crosshair, Zoom In, Zoom Out, Fullscreen)
 */
export const SceneControlHUD: React.FC<SceneControlHUDProps> = ({
  zoom,
  activeLayer: _activeLayer,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div className="sgp-scene-control-hud" role="region" aria-label="Điều khiển góc nhìn bản đồ">
      <MapViewportControls
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    </div>
  );
};
