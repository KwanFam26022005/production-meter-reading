import React, { useRef, useState, useEffect } from 'react';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapViewportState,
  OperationalLayerType,
} from '../types';
import { CANONICAL_VIEWBOX } from '../geometry/canonicalScene';
import { CanonicalBaseMap } from './CanonicalBaseMap';
import { ZoneLayer } from '../layers/ZoneLayer';
import { MeterLayer } from '../layers/MeterLayer';
import { OperatorLayer } from '../layers/OperatorLayer';
import { AlertLayer } from '../layers/AlertLayer';
import { LabelsLayer } from '../layers/LabelsLayer';
import { MapDebugLayer } from '../operational-map/MapDebugLayer';

export interface OperationalSceneProps {
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
  exceptionFocus?: boolean;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectOperator?: (operatorId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onViewportChange: (viewport: MapViewportState) => void;
}

/**
 * OperationalScene — Master Spatial Scene for Cảng Tân Thuận (Phase H1)
 *
 * Architecture:
 * - Master SVG with single viewBox="0 0 1664 932"
 * - Single world transform <g transform="translate(panX, panY) scale(zoom)">
 * - CanonicalBaseMap renders physical approved map image
 * - Vector operational overlays render in identical coordinate space
 * - Zero static SVG duplicate drawing
 * - Prevents all overlay drift on pan / zoom
 */
export const OperationalScene: React.FC<OperationalSceneProps> = ({
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
  exceptionFocus = false,
  onSelectZone,
  onSelectMeter,
  onSelectOperator,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onViewportChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Runtime diagnostic verification
  useEffect(() => {
    const operatorCount = new Set(zones.map((z) => z.assignedUser?.id).filter(Boolean)).size;
    console.log(
      `[MapOps-H1] renderer=OperationalScene canonicalVersion=tan-thuan-v1 viewBox="${CANONICAL_VIEWBOX}" zones=${zones.length} meters=${meters.length} operators=${operatorCount}`
    );
  }, [zones, meters]);

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

  // Wheel Zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    const nextZoom = Math.min(Math.max(viewport.zoom + delta, 0.6), 3.0);
    onViewportChange({
      ...viewport,
      zoom: Number(nextZoom.toFixed(2)),
    });
  };

  const issueCount = meters.filter(
    (m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW'
  ).length;

  return (
    <div
      ref={containerRef}
      className="sgp-operational-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* MASTER SVG VIEWPORT — ONE SCENE, ONE COORDINATE SYSTEM */}
      <svg
        viewBox={CANONICAL_VIEWBOX}
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
        {/* SINGLE WORLD TRANSFORM GROUP */}
        <g
          transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}
          style={{
            transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* 1. Canonical Physical Base Scene (Approved Illustration) */}
          <CanonicalBaseMap isDimmed={exceptionFocus} />

          {/* 2. Operational Zones Layer (Transparent Polygons + Exception Badges) */}
          <ZoneLayer
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

          {/* 3. Operational Meter Markers Layer */}
          <MeterLayer
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

          {/* 4. Spatial Operator Markers Layer */}
          <OperatorLayer
            zones={zones}
            meters={meters}
            selectedOperatorId={selectedOperatorShiftId}
            currentRoundTime={currentRoundTime}
            onSelectOperator={onSelectOperator || (() => {})}
          />

          {/* 5. Alert Atmospheric Layer */}
          <AlertLayer isActive={exceptionFocus} issueCount={issueCount} />

          {/* 6. Operational Labels Layer */}
          <LabelsLayer
            zoomLevel={viewport.zoom}
            selectedZoneId={selectedZoneId}
            hoveredZoneId={hoveredZoneId}
          />

          {/* 7. Diagnostic Debug Overlay (?mapDebug=1) */}
          <MapDebugLayer zones={zones} meters={meters} />
        </g>
      </svg>
    </div>
  );
};
