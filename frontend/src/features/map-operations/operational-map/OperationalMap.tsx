import React, { useRef, useState, useCallback } from 'react';
import {
  MapMeterItem,
  MapOperationalZone,
  MapViewportState,
  OperationalLayerType,
} from '../types';
import { FIT_VIEWBOX } from '../geometry/physicalScene';
import { PortFootprint } from './PortFootprint';
import { ZoneOperationalLayer } from './ZoneOperationalLayer';
import { MeterPointLayer } from './MeterPointLayer';
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
  isAssetMode?: boolean;
  viewport: MapViewportState;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onViewportChange: (viewport: MapViewportState) => void;
  exceptionFocus?: boolean;
}

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
  isAssetMode = false,
  viewport,
  onSelectZone,
  onSelectMeter,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onViewportChange,
  exceptionFocus = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan / Drag Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onViewportChange({
      ...viewport,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom — centered on cursor position for better UX
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.min(Math.max(viewport.zoom + delta, 0.6), 3.0);
    onViewportChange({
      ...viewport,
      zoom: Number(nextZoom.toFixed(2)),
    });
  };

  const handleZoomIn = useCallback(() => {
    const nextZoom = Math.min(viewport.zoom + 0.15, 3.0);
    onViewportChange({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  }, [viewport, onViewportChange]);

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(viewport.zoom - 0.15, 0.6);
    onViewportChange({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  }, [viewport, onViewportChange]);

  const handleResetView = useCallback(() => {
    onViewportChange({ zoom: 1.0, panX: 0, panY: 0 });
  }, [onViewportChange]);

  return (
    <div
      ref={containerRef}
      className="sgp-operational-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#E8F0F5',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* MASTER SVG VIEWPORT
          viewBox is derived from getOperationalMapBounds() — geometry-fit, not hard-coded pixels.
          preserveAspectRatio="xMidYMid meet" ensures the port is centered vertically
          inside whatever container height is available.
          User pan/zoom is applied as a transform on the inner <g> group.
      */}
      <svg
        viewBox={FIT_VIEWBOX}
        className="sgp-operational-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClearSelection();
          }
        }}
      >
        <g
          transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
        >
          {/* 1. Physical Backdrop: River, Land, Quay, Roads, Warehouses, Container blocks */}
          <PortFootprint />

          {/* 2. Operational Zones Layer */}
          <ZoneOperationalLayer
            zones={zones}
            meters={meters}
            selectedZoneId={selectedZoneId}
            hoveredZoneId={hoveredZoneId}
            activeLayer={activeLayer}
            exceptionsOnly={exceptionsOnly}
            exceptionFocus={exceptionFocus}
            selectedOperatorId={selectedOperatorId}
            onSelectZone={onSelectZone}
            onHoverZone={onHoverZone}
          />

          {/* 3. Meters Layer (Decluttered in Operational Mode, Prominent in Asset Mode) */}
          <MeterPointLayer
            meters={meters}
            selectedMeterId={selectedMeterId}
            hoveredMeterId={hoveredMeterId}
            exceptionsOnly={exceptionsOnly}
            zoomLevel={viewport.zoom}
            isAssetMode={isAssetMode}
            onSelectMeter={onSelectMeter}
            onHoverMeter={onHoverMeter}
            exceptionFocus={exceptionFocus}
          />
        </g>
      </svg>

      {/* Floating Viewport Navigation Controls — positioned inside map, bottom-right */}
      <MapViewportControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Collapsed ⓘ Chú giải legend — bottom-right, above controls */}
      <OperationalMapLegend activeLayer={activeLayer} />
    </div>
  );
};
