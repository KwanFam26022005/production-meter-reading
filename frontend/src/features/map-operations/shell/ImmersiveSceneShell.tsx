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

import { AdaptiveCommandBar } from '../command/AdaptiveCommandBar';
import { SceneControlHUD } from './SceneControlHUD';
import { OperationalListView } from './OperationalListView';
import { OperationalScene } from '../scene/OperationalScene';
import { isCalibrationModeActive } from '../calibration/MapCalibrationOverlay';
import type { MapCalibrationWorkspace } from '../calibration/useMapCalibrationWorkspace';
import { UnifiedContextSurface, type UnifiedContextType } from '../context/UnifiedContextSurface';
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
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;

  hasMeterBack?: boolean;
  meterBackLabel?: string;
  onMeterBack?: () => void;

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
  searchQuery = '',
  onSearchQueryChange,

  hasMeterBack = false,
  meterBackLabel,
  onMeterBack,

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
  onToggleExceptionFocus: _onToggleExceptionFocus,
  activeFocusType,
  onFocusTypeChange: _onFocusTypeChange,

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
  onResetPin: _onResetPin,
  isSubmittingPlacement = false,
  placementError = null,

}) => {
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const rounds = dashboardData?.round_progress || [];
  const isCalibrationActive = viewMode === 'calibration' || isCalibrationModeActive();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.zoneId && filters.zoneId !== 'ALL') count++;
    if (filters.status && filters.status !== 'ALL') count++;
    if (filters.operatorId && filters.operatorId !== 'ALL') count++;
    return count;
  }, [filters]);

  const operationalStates = useMemo(() => {
    return projectAllZonesOperationalState(mapZones, mapMeters);
  }, [mapZones, mapMeters]);

  // Derive single active contextual surface type (Invariant: at most 1 visible)
  const activeContextType: UnifiedContextType | null = useMemo(() => {
    if (isCalibrationActive) return null;
    if (analyticsOpen) return 'analytics';
    if (mapMode === 'placement') return 'workflow';
    if (selectedEntity?.type === 'zone') {
      return detailView === 'zone' ? 'zone-meters' : 'zone-summary';
    }
    if (selectedEntity?.type === 'meter') return 'meter-detail';
    if (selectedEntity?.type === 'operator') return 'operator-detail';
    return null;
  }, [isCalibrationActive, analyticsOpen, mapMode, selectedEntity, detailView]);

  const handleCloseContext = React.useCallback(() => {
    if (activeContextType === 'analytics') {
      onSetAnalyticsOpen(false);
    } else if (activeContextType === 'workflow') {
      if (onCancelPlacement) onCancelPlacement();
      else onClearSelection();
    } else {
      onClearSelection();
    }
  }, [activeContextType, onSetAnalyticsOpen, onCancelPlacement, onClearSelection]);

  const { hasContextBack, contextBackLabel, handleContextBack } = useMemo(() => {
    if (activeContextType === 'zone-meters') {
      return {
        hasContextBack: true,
        contextBackLabel: 'Tổng quan khu vực',
        handleContextBack: onBackToInspector || onClearSelection,
      };
    }
    if (activeContextType === 'meter-detail') {
      return {
        hasContextBack: Boolean(hasMeterBack),
        contextBackLabel: meterBackLabel || 'Quay lại',
        handleContextBack: onMeterBack || onClearSelection,
      };
    }
    if (activeContextType === 'workflow') {
      return {
        hasContextBack: true,
        contextBackLabel: 'Hủy tác vụ',
        handleContextBack: onCancelPlacement || onClearSelection,
      };
    }
    return {
      hasContextBack: false,
      contextBackLabel: undefined,
      handleContextBack: undefined,
    };
  }, [activeContextType, onBackToInspector, onClearSelection, hasMeterBack, meterBackLabel, onMeterBack, onCancelPlacement]);

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
            activeFilterCount={activeFilterCount}
          />
        )}

        {/* ============================================================ */}
        {/* LAYER C: ADAPTIVE COMMAND BAR + MAP-ONLY VIEWPORT CONTROLS   */}
        {/* ============================================================ */}
        {!isCalibrationActive && (
          <>
            <AdaptiveCommandBar
              user={user}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              rounds={rounds}
              selectedRoundId={selectedRoundId}
              onSelectRound={onSelectRound}
              currentRoundTime={overallKpis.currentRoundTime}
              overallKpis={overallKpis}
              filters={filters}
              onApplyFilters={onApplyFilters}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange || (() => {})}
              mapMeters={mapMeters}
              mapZones={mapZones}
              availableOperators={availableOperators}
              onSelectMeter={onSelectMeter}
              onSelectZone={onSelectZone}
              onSelectOperator={onSelectOperator}
              onRefresh={onRefresh}
              isLoading={isLoading}
              onExportCsv={onExportCsv}
              onOpenAnalytics={() => onSetAnalyticsOpen(true)}
              onOpenCalibration={onOpenCalibration}
              onToggleLegend={() => setIsLegendOpen((prev) => !prev)}
              isLegendOpen={isLegendOpen}
            />

            {/* Viewport controls strictly unmounted in List mode (Section 5) */}
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
          </>
        )}

        {/* ============================================================ */}
        {/* LAYER D: UNIFIED CONTEXT SURFACE (Normalized Rail)           */}
        {/* Invariant: At most 1 contextual surface is ever visible!     */}
        {/* Suppressed in calibration workspace (?mapCalibration=1)      */}
        {/* ============================================================ */}
        {!isCalibrationActive && activeContextType && (
          <UnifiedContextSurface
            contextType={activeContextType}
            theme={viewMode === 'list' ? 'light' : 'dark'}
            zone={selectedZone}
            zoneState={selectedZone ? operationalStates[selectedZone.id] : undefined}
            allMeters={mapMeters}
            meter={selectedMeter}
            operator={
              selectedOperatorSummary
                ? availableOperators.find((u) => u.id === selectedOperatorSummary.operatorId)
                : undefined
            }
            operatorSummary={selectedOperatorSummary}
            dashboardData={dashboardData}
            zones={mapZones}
            placementContext={
              placementContext
                ? {
                    targetZoneId: placementContext.targetZoneId,
                    targetZoneName: placementContext.targetZoneName,
                    isRelocating: placementContext.isRelocating,
                    meterId: placementContext.meterId,
                    meterCode: placementContext.meterCode,
                    meterName: placementContext.meterName,
                    meterType: placementContext.meterType,
                    pinnedCoords: placementContext.pinnedCoords,
                  }
                : null
            }
            isSubmittingPlacement={isSubmittingPlacement}
            placementError={placementError}
            hasBack={hasContextBack}
            backLabel={contextBackLabel}
            onBack={handleContextBack}
            onClose={handleCloseContext}
            onSelectMeter={onSelectMeter}
            onSelectZone={onSelectZone}
            onSelectOperator={onSelectOperator}
            onInspectReading={onInspectReading}
            onMorphToZoneMeters={() => (onOpenDetails ? onOpenDetails('zone') : onSetDetailOpen(true))}
            onMorphToZoneSummary={onBackToInspector}
            onStartPlacement={onAddMeterToZone}
            onStartRelocation={onRelocateMeter}
            onUpdatePlacement={onUpdatePlacementContext}
            onConfirmPlacement={onConfirmPlacement}
            onCancelPlacement={onCancelPlacement}
          />
        )}
    </main>
  </div>
);
};
