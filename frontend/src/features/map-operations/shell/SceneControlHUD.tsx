import React from 'react';
import type { OperationalLayerType } from '../types';
import { OperationalMapLegend } from '../operational-map/OperationalMapLegend';
import { MapViewportControls } from '../operational-map/MapViewportControls';

interface SceneControlHUDProps {
  zoom: number;
  activeLayer: OperationalLayerType;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

/**
 * SceneControlHUD — Bottom-Right Viewport Controls & Legend (Section 5 & 9)
 *
 * Hosts:
 * - OperationalMapLegend (stacked above controls at bottom: 148px)
 * - MapViewportControls (Zoom In, Zoom Out, Reset Fit 100%)
 */
export const SceneControlHUD: React.FC<SceneControlHUDProps> = ({
  zoom,
  activeLayer,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div className="sgp-scene-control-hud" role="region" aria-label="Điều khiển góc nhìn bản đồ">
      <OperationalMapLegend activeLayer={activeLayer} />
      <MapViewportControls
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    </div>
  );
};
