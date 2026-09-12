import React, { useRef, useEffect } from 'react';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapViewportState,
  OperationalLayerType,
} from '../types';
import { CANONICAL_VIEWBOX, CANONICAL_MAP_VERSION } from '../geometry/canonicalScene';
import {
  isCalibrationModeActive,
  useMapCalibration,
  MapCalibrationSvgLayer,
  MapCalibrationHUD,
} from '../calibration/MapCalibrationOverlay';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';
import { CanonicalBaseMap } from './CanonicalBaseMap';
import { ZoneLayer } from '../layers/ZoneLayer';
import { MeterLayer } from '../layers/MeterLayer';
import { OperatorLayer } from '../layers/OperatorLayer';
import { AlertLayer } from '../layers/AlertLayer';
import { LabelsLayer } from '../layers/LabelsLayer';
import { MapDebugLayer } from '../operational-map/MapDebugLayer';
import type { MapWorkspaceView } from '../../../types';
import type { MapCalibrationWorkspace } from '../calibration/useMapCalibrationWorkspace';

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
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectOperator?: (operatorId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onViewportChange: (viewport: MapViewportState) => void;
  placementSvgLayer?: React.ReactNode;
  placementCard?: React.ReactNode;
  viewMode?: MapWorkspaceView;
  isCalibrationActive?: boolean;
  calibrationWorkspace?: MapCalibrationWorkspace;
}

/**
 * OperationalScene — Master Spatial Scene for Cảng Tân Thuận (Phase H1)
 *
 * Architecture:
 * - Master SVG with single viewBox="0 0 1915 821"
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
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
  onSelectZone,
  onSelectMeter,
  onSelectOperator,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onViewportChange: _onViewportChange,
  placementSvgLayer,
  placementCard,
  viewMode = 'map',
  isCalibrationActive: propIsCalibrationActive,
  calibrationWorkspace,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const worldGroupRef = useRef<SVGGElement | null>(null);

  const isCalibrationActive =
    propIsCalibrationActive !== undefined
      ? propIsCalibrationActive
      : viewMode === 'calibration' || isCalibrationModeActive();

  const calibration = useMapCalibration(
    svgRef,
    worldGroupRef,
    calibrationWorkspace ? () => calibrationWorkspace.closeMapCalibration() : undefined,
    calibrationWorkspace
  );

  // Runtime diagnostic verification
  useEffect(() => {
    const operatorCount = new Set(zones.map((z) => z.assignedUser?.id).filter(Boolean)).size;
    console.log(
      `[MapOps-H1] renderer=OperationalScene canonicalVersion=${CANONICAL_MAP_VERSION} viewBox="${CANONICAL_VIEWBOX}" zones=${zones.length} meters=${meters.length} operators=${operatorCount}`
    );
  }, [zones, meters]);

  // Fixed Responsive Camera: User interaction focuses on meters, zones, operators.
  // Wheel zoom and manual zoom navigation are removed per Phase U6 specifications.
  const issueCount = meters.filter(
    (m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW'
  ).length;

  return (
    <div
      ref={containerRef}
      className="sgp-operational-map-container"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, #0B486B 0%, #0D3B56 35%, #0F2B3E 70%, #0A1C28 100%)',
        userSelect: 'none',
      }}
    >
      {/* MASTER SVG VIEWPORT — ONE SCENE, ONE COORDINATE SYSTEM */}
      <svg
        ref={svgRef}
        viewBox={CANONICAL_VIEWBOX}
        className="sgp-operational-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'default',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClearSelection();
          }
        }}
      >
        {/* SINGLE WORLD TRANSFORM GROUP */}
        <g
          ref={worldGroupRef}
          transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}
          style={{
            transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* 1. Canonical Physical Base Scene (Approved Illustration) */}
          <CanonicalBaseMap isDimmed={isCalibrationActive ? false : exceptionFocus} />

          {/* Normal Runtime Overlays: Suppressed in dedicated Calibration Workspace */}
          {!isCalibrationActive && (
            <>
              {/* 2. Operational Zones Layer (Zone fill & Zone stroke) */}
              <ZoneLayer
                zones={zones}
                meters={meters}
                selectedZoneId={selectedZoneId}
                hoveredZoneId={hoveredZoneId}
                activeLayer={activeLayer}
                exceptionsOnly={exceptionsOnly}
                exceptionFocus={exceptionFocus}
                selectedOperatorId={selectedOperatorId}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                onSelectZone={onSelectZone}
                onHoverZone={onHoverZone}
              />

              {/* 3. Operational Labels Layer (Zone Labels rendered beneath entity markers) */}
              <LabelsLayer
                zoomLevel={viewport.zoom}
                selectedZoneId={selectedZoneId}
                hoveredZoneId={hoveredZoneId}
              />

              {/* 4. Normal Meter Markers Layer (Section 17: normal meter) */}
              <MeterLayer
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedMeterId={selectedMeterId}
                hoveredMeterId={hoveredMeterId}
                exceptionsOnly={exceptionsOnly}
                zoomLevel={viewport.zoom}
                isAssetMode={isAssetMode}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                onSelectMeter={onSelectMeter}
                onHoverMeter={onHoverMeter}
                exceptionFocus={exceptionFocus}
                filterTier="normal"
              />

              {/* 5. Normal Spatial Operator Markers Layer (Section 17: operator) */}
              <OperatorLayer
                zones={zones}
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedOperatorId={selectedOperatorShiftId}
                currentRoundTime={currentRoundTime}
                zoomLevel={viewport.zoom}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                filterTier="normal"
                onSelectOperator={onSelectOperator || (() => {})}
              />

              {/* 6. Issue Entities Layer (Section 17: issue entity) */}
              <MeterLayer
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedMeterId={selectedMeterId}
                hoveredMeterId={hoveredMeterId}
                exceptionsOnly={exceptionsOnly}
                zoomLevel={viewport.zoom}
                isAssetMode={isAssetMode}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                onSelectMeter={onSelectMeter}
                onHoverMeter={onHoverMeter}
                exceptionFocus={exceptionFocus}
                filterTier="issue"
              />
              <OperatorLayer
                zones={zones}
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedOperatorId={selectedOperatorShiftId}
                currentRoundTime={currentRoundTime}
                zoomLevel={viewport.zoom}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                filterTier="issue"
                onSelectOperator={onSelectOperator || (() => {})}
              />

              {/* 7. Selected Entity Layer (Section 17: selected entity always on top) */}
              <MeterLayer
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedMeterId={selectedMeterId}
                hoveredMeterId={hoveredMeterId}
                exceptionsOnly={exceptionsOnly}
                zoomLevel={viewport.zoom}
                isAssetMode={isAssetMode}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                onSelectMeter={onSelectMeter}
                onHoverMeter={onHoverMeter}
                exceptionFocus={exceptionFocus}
                filterTier="selected"
              />
              <OperatorLayer
                zones={zones}
                meters={meters}
                selectedZoneId={selectedZoneId}
                selectedOperatorId={selectedOperatorShiftId}
                currentRoundTime={currentRoundTime}
                zoomLevel={viewport.zoom}
                mode={mode}
                selectedEntity={selectedEntity}
                targetPlacementZoneId={targetPlacementZoneId}
                filterTier="selected"
                onSelectOperator={onSelectOperator || (() => {})}
              />

              {/* 8. Alert Atmospheric Layer */}
              <AlertLayer isActive={exceptionFocus} issueCount={issueCount} />

              {/* 9. Diagnostic Debug Overlay (?mapDebug=1) */}
              <MapDebugLayer zones={zones} meters={meters} />

              {/* 10. Spatial Meter Placement & Relocation Layer (Interaction Overlay) */}
              {placementSvgLayer}
            </>
          )}

          {/* 9. Developer-Only Geometry Calibration Layer (?mapCalibration=1) */}
          {isCalibrationActive && (
            <MapCalibrationSvgLayer calibration={calibration} zoom={viewport.zoom} />
          )}
        </g>
      </svg>

      {/* Floating Placement Card (Outside SVG, within relative container) */}
      {!isCalibrationActive && placementCard}

      {/* Developer-Only Calibration HUD Panel (?mapCalibration=1) */}
      {isCalibrationActive && <MapCalibrationHUD calibration={calibration} />}
    </div>
  );
};
