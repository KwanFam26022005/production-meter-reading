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
import { UtilityNetworkView } from '../network/UtilityNetworkView';
import { AssetContextSurface } from '../context/AssetContextSurface';
import type { Asset, AssetConnection, UtilityType } from '../../assets/types';
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

  // Infrastructure Assets & Network Topology (Phase V16E)
  assets?: Asset[];
  assetConnections?: AssetConnection[];
  selectedAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
  onClearSelectedAsset?: () => void;
  selectedUtility?: UtilityType | 'ALL';
  onSelectUtility?: (utility: UtilityType | 'ALL') => void;
  showUnverifiedAssets?: boolean;
  onToggleShowUnverifiedAssets?: (show: boolean) => void;
  isNetworkLoading?: boolean;
  onRefreshNetwork?: () => void;
  canManageVerification?: boolean;
  onOpenVerificationReview?: (assetId?: string) => void;
  onOpenAssetDetails?: (assetId: string, assetCode?: string) => void;
  onSwitchToMapAndCenterAsset?: (asset: Asset) => void;
  suppressFloatingCommandBar?: boolean;
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
  onZoomIn: _onZoomIn,
  onZoomOut: _onZoomOut,
  onResetView: _onResetView,

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

  // Infrastructure Assets & Network Topology (Phase V16E)
  assets,
  assetConnections,
  selectedAssetId,
  onSelectAsset,
  onClearSelectedAsset,
  selectedUtility = 'ALL',
  onSelectUtility,
  showUnverifiedAssets = false,
  onToggleShowUnverifiedAssets,
  isNetworkLoading = false,
  onRefreshNetwork,
  canManageVerification = false,
  onOpenVerificationReview,
  onOpenAssetDetails,
  onSwitchToMapAndCenterAsset,
  suppressFloatingCommandBar = false,
}) => {
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = React.useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cmd_bar_collapsed') === '1';
    } catch {
      return false;
    }
  });
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
  const activeContextType: UnifiedContextType | 'asset-detail' | null = useMemo(() => {
    if (isCalibrationActive) return null;
    if (analyticsOpen) return 'analytics';
    if (mapMode === 'placement') return 'workflow';
    if (selectedAssetId) return 'asset-detail';
    if (selectedEntity?.type === 'zone') {
      return detailView === 'zone' ? 'zone-meters' : 'zone-summary';
    }
    if (selectedEntity?.type === 'meter') return 'meter-detail';
    if (selectedEntity?.type === 'operator') return 'operator-detail';
    return null;
  }, [isCalibrationActive, analyticsOpen, mapMode, selectedAssetId, selectedEntity, detailView]);

  const handleCloseContext = React.useCallback(() => {
    if (activeContextType === 'analytics') {
      onSetAnalyticsOpen(false);
    } else if (activeContextType === 'workflow') {
      if (onCancelPlacement) onCancelPlacement();
      else onClearSelection();
    } else if (activeContextType === 'asset-detail') {
      if (onClearSelectedAsset) onClearSelectedAsset();
      else onClearSelection();
    } else {
      onClearSelection();
    }
  }, [activeContextType, onSetAnalyticsOpen, onCancelPlacement, onClearSelectedAsset, onClearSelection]);

  // Global Escape priority stack (V13.2 Section 25)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority 1 (command popovers) handles its own Escape and stopPropagation
        // Priority 2: close active context surface
        if (activeContextType) {
          handleCloseContext();
        } else if (selection.selectedZoneId || selection.selectedMeterId) {
          // Priority 3: clear spatial selection
          onClearSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContextType, handleCloseContext, selection, onClearSelection]);

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
    <div
      className="sgp-map-first-root"
      role="main"
      aria-label="Trung tâm tác nghiệp công tơ Cảng Tân Thuận"
      style={
        {
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          '--commandbar-clearance': isToolbarCollapsed ? '16px' : '80px',
        } as React.CSSProperties
      }
    >
      {/* IMMERSIVE FULL-BLEED WORKSPACE CONTAINER (V13.2 Section 18) */}
      <main
        className="sgp-map-first-workspace"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* ============================================================ */}
        {/* LAYER B: PRIMARY CENTER CANVAS (MAP, NETWORK, OR LIST)       */}
        {/* ============================================================ */}
        {viewMode !== 'list' ? (
          viewMode === 'network' ? (
            <UtilityNetworkView
              nodes={assets || []}
              edges={assetConnections || []}
              selectedAssetId={selectedAssetId}
              onSelectAsset={onSelectAsset}
              selectedUtility={selectedUtility}
              onSelectUtility={onSelectUtility}
              showUnverified={showUnverifiedAssets}
              onToggleShowUnverified={onToggleShowUnverifiedAssets}
              isLoading={isNetworkLoading}
              onRefresh={onRefreshNetwork}
              canManageVerification={canManageVerification}
              onOpenVerificationReview={onOpenVerificationReview}
              onSwitchToMap={() => onViewModeChange('map')}
              meters={filteredMeters}
              zones={mapZones}
              onSelectMeter={onSelectMeter}
              selectedMeterId={selection.selectedMeterId}
            />
          ) : (
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
              assets={assets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={onSelectAsset}
              showUnverifiedAssets={showUnverifiedAssets}
            />
          )
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
        {!isCalibrationActive && !suppressFloatingCommandBar && (
          <>
            <AdaptiveCommandBar
              user={user}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              isCollapsed={isToolbarCollapsed}
              onToggleCollapse={setIsToolbarCollapsed}
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
              onOpenAnalytics={() => onSetAnalyticsOpen(activeContextType !== 'analytics')}
              isAnalyticsOpen={activeContextType === 'analytics'}
              onOpenCalibration={onOpenCalibration}
              onToggleLegend={() => setIsLegendOpen((prev) => !prev)}
              isLegendOpen={isLegendOpen}
            />

            {/* Viewport controls strictly unmounted in List mode AND when ContextRail is open (V13.3 Section 10-11) */}
            {viewMode === 'map' && (
              !activeContextType ? (
                <div
                  className="sgp-hud-bottom-right"
                  style={{
                    position: 'absolute',
                    bottom: '18px',
                    right: '18px',
                    zIndex: 35,
                    pointerEvents: 'auto',
                  }}
                >
                  <SceneControlHUD />
                </div>
              ) : null
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* LAYER D: UNIFIED CONTEXT SURFACE (Normalized Rail)           */}
        {/* Invariant: At most 1 contextual surface is ever visible!     */}
        {/* Suppressed in calibration workspace (?mapCalibration=1)      */}
        {/* ============================================================ */}
        {!isCalibrationActive && activeContextType === 'asset-detail' && selectedAssetId && (
          <AssetContextSurface
            assetId={selectedAssetId}
            initialAsset={assets?.find((a) => a.id === selectedAssetId)}
            onClose={handleCloseContext}
            onSelectMeter={onSelectMeter}
            onSelectAsset={onSelectAsset}
            onSwitchToMapAndCenter={(asset) => {
              if (onSwitchToMapAndCenterAsset) {
                onSwitchToMapAndCenterAsset(asset);
              } else {
                onViewModeChange('map');
              }
            }}
            onSwitchToNetworkAndFocus={(id) => {
              onViewModeChange('network');
              if (onSelectAsset) onSelectAsset(id);
            }}
            onOpenVerificationReview={onOpenVerificationReview}
            onOpenAssetDetails={onOpenAssetDetails}
            canManageVerification={canManageVerification}
          />
        )}

        {!isCalibrationActive && activeContextType && activeContextType !== 'asset-detail' && (
          <UnifiedContextSurface
            contextType={activeContextType}
            theme={viewMode === 'list' ? 'light' : 'dark'}
            user={user}
            onRefreshData={async () => onRefresh()}
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
