import React from 'react';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapViewportState,
  OperationalLayerType,
} from '../types';
import { OperationalScene } from '../scene/OperationalScene';
import { MapViewportControls } from './MapViewportControls';
import { OperationalMapLegend } from './OperationalMapLegend';

interface OperationalMapProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  hoveredZoneId: string | null;
  hoveredMeterId: string | null;
  activeLayer?: OperationalLayerType;
  exceptionsOnly?: boolean;
  selectedOperatorId?: string;
  selectedOperatorShiftId?: string | null;
  isAssetMode?: boolean;
  viewport: MapViewportState;
  currentRoundTime?: string;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectOperator?: (operatorId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onViewportChange: (viewport: MapViewportState) => void;
  exceptionFocus?: boolean;
}

/**
 * OperationalMap — Master Container coordinating OperationalScene and overlay controls.
 *
 * Replaces synthetic schematic drawing with the canonical physical scene:
 * - Approved physical port map image as base scene
 * - Vector operational overlays aligned inside single 1664x932 coordinate space
 * - Zero duplicated static SVG geometry
 */
export const OperationalMap: React.FC<OperationalMapProps> = ({
  zones,
  meters,
  selectedZoneId,
  selectedMeterId,
  hoveredZoneId,
  hoveredMeterId,
  activeLayer = 'STATUS',
  exceptionsOnly = false,
  selectedOperatorId,
  selectedOperatorShiftId,
  isAssetMode = false,
  viewport,
  currentRoundTime,
  onSelectZone,
  onSelectMeter,
  onSelectOperator,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onViewportChange,
  exceptionFocus = false,
}) => {
  const handleZoomIn = () => {
    const nextZoom = Math.min(viewport.zoom + 0.15, 3.0);
    onViewportChange({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(viewport.zoom - 0.15, 0.6);
    onViewportChange({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  };

  const handleResetView = () => {
    onViewportChange({ zoom: 1.0, panX: 0, panY: 0 });
  };

  return (
    <div
      className="sgp-operational-map-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Master Operational Scene */}
      <OperationalScene
        zones={zones}
        meters={meters}
        selectedZoneId={selectedZoneId}
        selectedMeterId={selectedMeterId}
        hoveredZoneId={hoveredZoneId}
        hoveredMeterId={hoveredMeterId}
        activeLayer={activeLayer}
        exceptionsOnly={exceptionsOnly}
        selectedOperatorId={selectedOperatorId}
        selectedOperatorShiftId={selectedOperatorShiftId}
        isAssetMode={isAssetMode}
        viewport={viewport}
        currentRoundTime={currentRoundTime}
        exceptionFocus={exceptionFocus}
        onSelectZone={onSelectZone}
        onSelectMeter={onSelectMeter}
        onSelectOperator={onSelectOperator}
        onHoverZone={onHoverZone}
        onHoverMeter={onHoverMeter}
        onClearSelection={onClearSelection}
        onViewportChange={onViewportChange}
      />

      {/* Floating Viewport Navigation Controls — bottom-right */}
      <MapViewportControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Collapsed Chú giải legend — bottom-right, stacked above controls */}
      <OperationalMapLegend activeLayer={activeLayer} />
    </div>
  );
};
