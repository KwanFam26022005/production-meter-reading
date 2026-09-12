import React, { useMemo } from 'react';
import type { AdminDashboardResponse, User, MapWorkspaceView } from '../../../types';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapFilterOptions,
  MapViewportState,
} from '../types';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';
import { projectAllZonesOperationalState } from '../state/operationalProjection';

import { SceneHeaderHUD } from './SceneHeaderHUD';
import { SceneTopControls } from './SceneTopControls';
import { SceneActionHUD } from './SceneActionHUD';
import { SceneSummaryHUD } from './SceneSummaryHUD';
import { SceneRoundHUD } from './SceneRoundHUD';
import { SceneControlHUD } from './SceneControlHUD';
import { OperationalListView } from './OperationalListView';
import { OperationalScene } from '../scene/OperationalScene';
import { isCalibrationModeActive } from '../calibration/MapCalibrationOverlay';
import type { MapCalibrationWorkspace } from '../calibration/useMapCalibrationWorkspace';
import { SpatialInspector, MapContextRail } from '../map-ui';
import { AnalyticsDrawer } from '../context';
import type {
  MapMode,
  SelectedEntity,
  DetailView,
  PlacementContext,
} from '../state/useMapStateMachine';

interface ImmersiveSceneShellProps {
  user?: User;
  // Data
  selectedDate: string;
  onDateChange: (date: string) => void;
  dashboardData: AdminDashboardResponse | null;
  mapMeters: MapMeterItem[];
  filteredMeters: MapMeterItem[];
  mapZones: MapOperationalZone[];
  availableOperators: User[];
  overallKpis: {
    total: number;
    confirmed: number;
    review: number;
    overdue: number;
    due: number;
    pending: number;
    percent: number;
    currentRoundTime?: string | null;
    currentRoundStatus?: string | null;
  };
  isLoading: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;

  // View Mode: Map / List / Calibration (V12)
  viewMode: MapWorkspaceView;
  onViewModeChange: (mode: MapWorkspaceView) => void;
  onOpenCalibration?: () => void;
  calibrationWorkspace?: MapCalibrationWorkspace;

  // Selection & Filters
  selectedRoundId?: string;
  onSelectRound: (roundId: string) => void;
  filters: MapFilterOptions;
  onApplyFilters: (filters: MapFilterOptions) => void;

  selection: {
    selectedZoneId: string | null;
    selectedMeterId: string | null;
    hoveredZoneId: string | null;
    hoveredMeterId: string | null;
  };
  selectedMeter?: MapMeterItem;
  selectedZone?: MapOperationalZone;
  selectedOperatorSummary?: OperatorShiftSummary | null;
  selectedOperatorShiftId?: string | null;

  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectOperator: (operatorId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onCloseOperatorPopover: () => void;

  // Viewport
  viewport: MapViewportState;
  onViewportChange: (viewport: MapViewportState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;

  // Alert Focus & Telemetry Focus
  exceptionFocus: boolean;
  onToggleExceptionFocus: () => void;
  activeFocusType: 'OVERDUE' | 'REVIEW' | 'PENDING' | null;
  onFocusTypeChange: (type: 'OVERDUE' | 'REVIEW' | 'PENDING' | null) => void;

  // Drawers & Surfaces
  detailOpen: boolean;
  onSetDetailOpen: (open: boolean) => void;
  analyticsOpen: boolean;
  onSetAnalyticsOpen: (open: boolean) => void;
  onInspectReading?: (readingId: string) => void;
  onReassignOperator?: (zoneId: string, userId: string, note?: string) => Promise<void>;
  placementSvgLayer?: React.ReactNode;
  placementCard?: React.ReactNode;
  onAddMeterToZone?: (zoneId: string) => void;
  onRelocateMeter?: (meter: MapMeterItem) => void;

  // Contextual Surface State Machine (V7.1 Architecture)
  mapMode?: MapMode;
  selectedEntity?: SelectedEntity;
  detailView?: DetailView;
  placementContext?: PlacementContext | null;
  onOpenDetails?: (view?: DetailView) => void;
  onBackToInspector?: () => void;
  onUpdatePlacementContext?: (updates: Partial<PlacementContext>) => void;
  onConfirmPlacement?: () => void;
  onCancelPlacement?: () => void;
  onResetPin?: () => void;
  isSubmittingPlacement?: boolean;
  placementError?: string | null;
}

/**
 * ImmersiveSceneShell — Unified Spatial Operations Shell (Phase U0 → U4)
 *
 * Implements the 4-layer architecture:
 * LAYER A: Base App Shell integration (.sgp-map-first-root)
 * LAYER B: Immersive Map Scene (OperationalScene) or OperationalListView
 * LAYER C: Integrated Scene HUDs (Header, Top Controls, Actions, Summary, Round, Viewport)
 * LAYER D: Contextual Details (ZoneDrawer, MeterQuickPopup, MeterDetailDrawer, OperatorShiftPopover, AnalyticsDrawer)
 */
export const ImmersiveSceneShell: React.FC<ImmersiveSceneShellProps> = ({
  user,
  selectedDate,
  onDateChange,
  dashboardData,
  mapMeters,
  filteredMeters,
  mapZones,
  availableOperators,
  overallKpis,
  isLoading,
  onRefresh,
  onExportCsv,

  viewMode,
  onViewModeChange,

  selectedRoundId,
  onSelectRound,
  filters,
  onApplyFilters,

  selection,
  selectedMeter,
  selectedZone,
  selectedOperatorSummary,
  selectedOperatorShiftId,

  onSelectZone,
  onSelectMeter,
  onSelectOperator,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onCloseOperatorPopover: _onCloseOperatorPopover,

  viewport,
  onViewportChange,
  onZoomIn,
  onZoomOut,
  onResetView,

  exceptionFocus,
  onToggleExceptionFocus,
  activeFocusType,
  onFocusTypeChange,

  detailOpen: _detailOpen,
  onSetDetailOpen,
  analyticsOpen,
  onSetAnalyticsOpen,
  onInspectReading,
  onReassignOperator: _onReassignOperator,
  placementSvgLayer,
  placementCard: _placementCard,
  onAddMeterToZone,
  onRelocateMeter,

  mapMode = 'browse',
  selectedEntity = null,
  detailView = null,
  placementContext = null,
  onOpenCalibration,
  calibrationWorkspace,
  onOpenDetails,
  onBackToInspector,
  onUpdatePlacementContext,
  onConfirmPlacement,
  onCancelPlacement,
  onResetPin,
  isSubmittingPlacement = false,
  placementError = null,

}) => {
  const issueCount = overallKpis.overdue + overallKpis.review;
  const rounds = dashboardData?.round_progress || [];
  const isCalibrationActive = viewMode === 'calibration' || isCalibrationModeActive();

  const operationalStates = useMemo(() => {
    return projectAllZonesOperationalState(mapZones, mapMeters);
  }, [mapZones, mapMeters]);

  return (
    <div className="sgp-map-first-root" role="main" aria-label="Trung tâm tác nghiệp công tơ Cảng Tân Thuận">
      {/* IMMERSIVE FULL-BLEED WORKSPACE CONTAINER */}
      <main
        className="sgp-map-first-workspace"
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* ============================================================ */}
        {/* LAYER B: PRIMARY CENTER CANVAS (MAP OR LIST)                */}
        {/* ============================================================ */}
        {viewMode !== 'list' ? (
          <OperationalScene
            zones={mapZones}
            meters={filteredMeters}
            selectedZoneId={selection.selectedZoneId}
            selectedMeterId={selection.selectedMeterId}
            hoveredZoneId={selection.hoveredZoneId}
            hoveredMeterId={selection.hoveredMeterId}
            activeLayer="STATUS"
            exceptionsOnly={false}
            exceptionFocus={exceptionFocus || Boolean(activeFocusType)}
            selectedOperatorId={filters.operatorId === 'ALL' ? undefined : filters.operatorId}
            selectedOperatorShiftId={selectedOperatorShiftId}
            currentRoundTime={overallKpis.currentRoundTime || undefined}
            viewport={viewport}
            mode={mapMode}
            selectedEntity={selectedEntity}
            targetPlacementZoneId={placementContext?.targetZoneId}
            onSelectZone={onSelectZone}
            onSelectMeter={onSelectMeter}
            onSelectOperator={onSelectOperator}
            onHoverZone={onHoverZone}
            onHoverMeter={onHoverMeter}
            onClearSelection={onClearSelection}
            onViewportChange={onViewportChange}
            placementSvgLayer={placementSvgLayer}
            viewMode={viewMode}
            isCalibrationActive={isCalibrationActive}
            calibrationWorkspace={calibrationWorkspace}
          />
        ) : (
          <OperationalListView
            meters={filteredMeters}
            selectedMeterId={selection.selectedMeterId}
            onSelectMeter={onSelectMeter}
            onInspectReading={onInspectReading}
            onSwitchToMap={() => onViewModeChange('map')}
          />
        )}

        {/* ============================================================ */}
        {/* LAYER C: INTEGRATED SCENE HUD OVERLAYS                       */}
        {/* ============================================================ */}
        {!isCalibrationActive && (
          <div className="sgp-scene-hud-container" style={{ pointerEvents: 'none' }}>
          {/* TOP BAR CLUSTER — UNIFIED MARITIME HEADER */}
          <div className="sgp-hud-top-bar" style={{ pointerEvents: 'auto' }}>
            <SceneHeaderHUD />

            <SceneTopControls
              user={user}
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              rounds={rounds}
              currentRoundTime={overallKpis.currentRoundTime}
              currentRoundStatus={overallKpis.currentRoundStatus}
              selectedRoundId={selectedRoundId}
              onSelectRound={onSelectRound}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              onRefresh={onRefresh}
              isLoading={isLoading}
              onExportCsv={onExportCsv}
              onOpenAnalytics={() => onSetAnalyticsOpen(true)}
              onOpenCalibration={onOpenCalibration}
            />
          </div>

          {/* LEFT ACTIONS HUD (Search & Filter) */}
          <div className="sgp-hud-left-actions" style={{ pointerEvents: 'auto' }}>
            <SceneActionHUD
              meters={mapMeters}
              zones={mapZones}
              operators={availableOperators}
              filters={filters}
              onApplyFilters={onApplyFilters}
              onSelectMeter={onSelectMeter}
              onSelectZone={onSelectZone}
              onSelectOperator={onSelectOperator}
            />
          </div>

          {/* RIGHT SUMMARY & TELEMETRY HUD */}
          <div className="sgp-hud-right-summary" style={{ pointerEvents: 'auto' }}>
            <SceneSummaryHUD
              totalMeters={overallKpis.total}
              confirmedCount={overallKpis.confirmed}
              overdueCount={overallKpis.overdue}
              reviewCount={overallKpis.review}
              pendingCount={overallKpis.pending}
              issueCount={issueCount}
              exceptionFocus={exceptionFocus}
              activeFocusType={activeFocusType}
              onToggleExceptionFocus={onToggleExceptionFocus}
              onFocusTypeChange={onFocusTypeChange}
              onOpenAnalytics={() => onSetAnalyticsOpen(true)}
            />
          </div>

          {/* BOTTOM LEFT: COMPACT ROUND HUD */}
          <div className="sgp-hud-bottom-left" style={{ pointerEvents: 'auto' }}>
            <SceneRoundHUD
              rounds={rounds}
              currentRoundTime={overallKpis.currentRoundTime || undefined}
              selectedRoundId={selectedRoundId}
              completionPercent={overallKpis.percent}
              onSelectRound={onSelectRound}
            />
          </div>

          {/* BOTTOM RIGHT: VIEWPORT CONTROLS & LEGEND */}
          {viewMode === 'map' && (
            <div className="sgp-hud-bottom-right" style={{ pointerEvents: 'auto' }}>
              <SceneControlHUD
                zoom={viewport.zoom}
                activeLayer="STATUS"
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onResetView={onResetView}
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* LAYER D: CONTEXTUAL SURFACES (FAMILY B & FAMILY C)           */}
      {/* Invariant: At most 1 contextual surface is ever visible!     */}
      {/* Suppressed in calibration workspace (?mapCalibration=1)      */}
      {/* ============================================================ */}

      {/* Family B: SpatialInspector (312px dark maritime frosted glass) */}
      {!isCalibrationActive && !analyticsOpen && mapMode === 'inspect' && selectedEntity && viewMode === 'map' && (
        selectedEntity.type === 'zone' && selectedZone ? (
          <SpatialInspector
            variant="zone"
            zone={selectedZone}
            zoneState={operationalStates[selectedZone.id]}
            onClose={onClearSelection}
            onOpenDetails={() => (onOpenDetails ? onOpenDetails('zone') : onSetDetailOpen(true))}
            onAddMeter={onAddMeterToZone}
          />
        ) : selectedEntity.type === 'operator' && selectedOperatorSummary ? (
          <SpatialInspector
            variant="operator"
            operator={availableOperators.find((u) => u.id === selectedOperatorSummary.operatorId)}
            operatorSummary={selectedOperatorSummary}
            onClose={onClearSelection}
            onOpenDetails={() => (onOpenDetails ? onOpenDetails('operator') : onSetDetailOpen(true))}
          />
        ) : selectedEntity.type === 'meter' && selectedMeter ? (
          <SpatialInspector
            variant="meter"
            meter={selectedMeter}
            onClose={onClearSelection}
            onOpenDetails={() => (onOpenDetails ? onOpenDetails('meter') : onSetDetailOpen(true))}
            onRelocateMeter={onRelocateMeter}
          />
        ) : null
      )}

      {/* Family C: MapContextRail (360px right rail / mobile sheet) */}
      {!isCalibrationActive && !analyticsOpen && (mapMode === 'details' || mapMode === 'placement') && (
        <MapContextRail
          variant={
            mapMode === 'placement'
              ? 'meter-placement'
              : detailView === 'zone'
              ? 'zone-detail'
              : detailView === 'operator'
              ? 'operator-detail'
              : 'meter-detail'
          }
          zone={selectedZone}
          allMeters={mapMeters}
          zoneState={selectedZone ? operationalStates[selectedZone.id] : undefined}
          operator={selectedOperatorSummary ? availableOperators.find((u) => u.id === selectedOperatorSummary.operatorId) : undefined}
          operatorSummary={selectedOperatorSummary || undefined}
          meter={selectedMeter}
          placementContext={placementContext}
          zones={mapZones}
          isSubmittingPlacement={isSubmittingPlacement}
          placementError={placementError}
          onBack={onBackToInspector || onClearSelection}
          onClose={onClearSelection}
          onSelectMeter={onSelectMeter}
          onInspectReading={onInspectReading}
          onStartPlacement={onAddMeterToZone}
          onStartRelocation={onRelocateMeter}
          onUpdatePlacement={onUpdatePlacementContext}
          onResetPin={onResetPin}
          onConfirmPlacement={onConfirmPlacement}
          onCancelPlacement={onCancelPlacement}
        />
      )}

      {/* Analytics Drawer (Opened exclusively from Header / Summary telemetry) */}
      {!isCalibrationActive && analyticsOpen && (
        <AnalyticsDrawer
          dashboardData={dashboardData}
          zones={mapZones}
          onClose={() => onSetAnalyticsOpen(false)}
          onInspectReading={onInspectReading}
          onSelectZone={(zoneId) => {
            onSetAnalyticsOpen(false);
            onSelectZone(zoneId);
          }}
        />
      )}
    </main>
  </div>
);
};
