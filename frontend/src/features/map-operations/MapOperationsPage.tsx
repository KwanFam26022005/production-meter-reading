import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { deriveOperatorShiftSummary } from './utils/deriveOperatorShiftSummary';
import type { User } from '../../types';
import type { MapMeterItem } from './types';
import { ImmersiveSceneShell } from './shell/ImmersiveSceneShell';
import {
  resolveToBusinessZoneId,
  getZoneOperatorAnchor,
} from './geometry/operationalGeometry';
import { normalizedToCanonicalScene } from './geometry/canonicalScene';
import {
  useSpatialPlacement,
  SpatialPlacementSvgLayer,
} from './placement/SpatialPlacementOverlay';
import { createAdminMeter, updateAdminMeter } from '../../services/api';
import { useMapStateMachine, DetailView } from './state/useMapStateMachine';
import { focusEntity } from './services/mapCameraService';
import { useMapCalibrationWorkspace } from './calibration/useMapCalibrationWorkspace';
import './motion/mapMotion.css';

interface MapOperationsPageProps {
  user?: User;
  onInspectReading?: (readingId: string) => void;
  onSwitchToLegacy?: () => void;
}

/**
 * MapOperationsPage — Immersive Spatial Operations Console (V7.1 Consistency Architecture)
 *
 * Implements the centralized state machine:
 * - SelectedEntity = { type: 'zone' | 'operator' | 'meter', id } | null
 * - MapMode = 'browse' | 'inspect' | 'details' | 'placement'
 * - Invariant: Max 1 selection, Max 1 contextual surface (Inspector or ContextRail)
 * - Safe viewport padding ensures camera framing keeps entities unobstructed.
 */
export const MapOperationsPage: React.FC<MapOperationsPageProps> = ({
  user,
  onInspectReading,
  onSwitchToLegacy: _onSwitchToLegacy,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    selectedRoundId,
    setSelectedRoundId,
    dashboardData,
    mapMeters,
    mapZones,
    overallKpis,
    availableOperators,
    loading,
    error,
    refresh,
    reassignOperator,
  } = useMapOperations();

  const {
    filters,
    setFilters,
    viewport,
    setViewport,
  } = useMapSelection();

  // Centralized UI State Machine
  const mapState = useMapStateMachine();

  // Centralized Map Workspace & Calibration View (V12)
  const calibrationWorkspace = useMapCalibrationWorkspace('map', () => {
    setAnalyticsOpen(false);
    mapState.resetToBrowse();
  });
  const viewMode = calibrationWorkspace.workspaceView;
  const setViewMode = calibrationWorkspace.setWorkspaceView;

  // Search Query state (unified across Map and List modes)
  const [searchQuery, setSearchQuery] = useState('');

  // Context Surface Navigation History (Zone -> Zone-Meters -> Meter-Detail)
  const [previousContext, setPreviousContext] = useState<{
    type: 'zone-summary' | 'zone-meters';
    zoneId: string;
  } | null>(null);

  // Alert Focus & Telemetry Focus state
  const [exceptionFocus, setExceptionFocus] = useState(false);
  const [activeFocusType, setActiveFocusType] = useState<'OVERDUE' | 'REVIEW' | 'PENDING' | null>(null);

  // Analytics Drawer (opened only via top controls or summary telemetry)
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Placement hook integration
  const placement = useSpatialPlacement({
    isActive: mapState.mode === 'placement',
    targetZoneId: mapState.placementContext?.targetZoneId || 'zone-container',
    targetZoneName: mapState.placementContext?.targetZoneName || 'Khu vực Bãi Container (CY)',
    meterCode: mapState.placementContext?.meterCode,
    meterName: mapState.placementContext?.meterName,
    meterType: mapState.placementContext?.meterType,
    isRelocating: mapState.placementContext?.isRelocating || false,
    existingMeterId: mapState.placementContext?.meterId,
    onConfirmPlacement: async (coords) => {
      if (!mapState.placementContext) return;
      const ctx = mapState.placementContext;
      if (ctx.isRelocating && ctx.meterId) {
        await updateAdminMeter(ctx.meterId, {
          map_x: coords.normX,
          map_y: coords.normY,
          zone_id: ctx.targetZoneId,
        });
      } else {
        await createAdminMeter({
          meter_code: ctx.meterCode || 'CT-013',
          name: ctx.meterName || 'Công tơ mới',
          meter_type: ctx.meterType || 'LCD',
          map_x: coords.normX,
          map_y: coords.normY,
          zone_id: ctx.targetZoneId,
        });
      }
      mapState.resetToBrowse();
      await refresh();
      setViewport({ zoom: 1.0, panX: 0, panY: 0 });
    },
    onCancel: () => {
      mapState.cancelPlacement();
      setViewport({ zoom: 1.0, panX: 0, panY: 0 });
    },
  });

  const activePlacementContext = useMemo(() => {
    if (!mapState.placementContext) return null;
    return {
      ...mapState.placementContext,
      pinnedCoords: placement.pinnedCoords,
    };
  }, [mapState.placementContext, placement.pinnedCoords]);

  // Runtime source of truth verification object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__MAP_UI_BUILD__ = {
        phase: 'V7.1-Map-UI-Consistency',
        renderer: 'OperationalScene',
        geometryVersion: 'tan-thuan-v2',
        viewBox: '0 0 1915 821',
        zones: mapZones.length,
        meters: mapMeters.length,
        viewMode,
        mode: mapState.mode,
        selectedEntity: mapState.selectedEntity,
        detailView: mapState.detailView,
        placementActive: mapState.mode === 'placement',
        timestamp: new Date().toISOString(),
      };
    }
  }, [mapZones, mapMeters, viewMode, mapState.mode, mapState.selectedEntity, mapState.detailView]);

  // Filtered meters with active focus and search query support
  const filteredMeters = useMemo(() => {
    let list = filterMeters(mapMeters, filters);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.meterCode.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.zoneName?.toLowerCase().includes(q) ||
          m.zoneId?.toLowerCase().includes(q)
      );
    }

    if (activeFocusType === 'OVERDUE') {
      list = list.filter((m) => m.semanticState === 'OVERDUE');
    } else if (activeFocusType === 'REVIEW') {
      list = list.filter((m) => m.semanticState === 'REVIEW');
    } else if (activeFocusType === 'PENDING') {
      list = list.filter((m) => m.semanticState === 'PENDING');
    } else if (exceptionFocus) {
      list = list.filter((m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW');
    }

    return list;
  }, [mapMeters, filters, searchQuery, activeFocusType, exceptionFocus]);

  // Selected Entity resolutions
  const selectedMeter = useMemo(() => {
    if (mapState.selectedEntity?.type !== 'meter') return undefined;
    return mapMeters.find((m) => m.id === mapState.selectedEntity?.id);
  }, [mapMeters, mapState.selectedEntity]);

  const selectedZone = useMemo(() => {
    const zoneId =
      mapState.selectedEntity?.type === 'zone'
        ? mapState.selectedEntity.id
        : mapState.placementContext?.targetZoneId;
    if (!zoneId) return undefined;
    const bId = resolveToBusinessZoneId(zoneId);
    return mapZones.find((z) => z.id === zoneId || z.id === bId);
  }, [mapZones, mapState.selectedEntity, mapState.placementContext]);

  const selectedOperatorSummary = useMemo(() => {
    if (mapState.selectedEntity?.type !== 'operator') return null;
    const opId = mapState.selectedEntity.id;
    const foundZone = mapZones.find((z) => z.assignedUser?.id === opId);
    const user =
      foundZone?.assignedUser ||
      availableOperators.find((o) => o.id === opId);
    if (!user) return null;
    const opObj = {
      id: user.id,
      fullName: 'fullName' in user ? user.fullName : (user as any).full_name || '',
      employeeCode: 'employeeCode' in user ? user.employeeCode : (user as any).employee_code,
    };
    return deriveOperatorShiftSummary(
      opObj,
      mapZones,
      mapMeters,
      overallKpis.currentRoundTime || undefined
    );
  }, [mapState.selectedEntity, mapZones, mapMeters, availableOperators, overallKpis.currentRoundTime]);

  const clearSelection = useCallback(() => {
    setPreviousContext(null);
    mapState.resetToBrowse();
    setAnalyticsOpen(false);
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  }, [mapState.resetToBrowse, setViewport]);

  const handleSelectOperator = useCallback(
    (operatorId: string) => {
      if (mapState.mode === 'placement') return;
      setPreviousContext(null);
      mapState.selectOperator(operatorId);
      setAnalyticsOpen(false);
      const foundZone = mapZones.find((z) => z.assignedUser?.id === operatorId);
      const anchor = foundZone ? getZoneOperatorAnchor(foundZone.id) : undefined;
      const framing = focusEntity({
        entity: { type: 'operator', id: operatorId },
        mode: 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
        entityCoords: anchor,
      });
      setViewport(framing);
    },
    [mapState, mapZones, setViewport]
  );

  const focusMeter = useCallback(
    (id: string) => {
      if (mapState.mode === 'placement') return;
      if (mapState.selectedEntity?.type === 'zone') {
        setPreviousContext({
          type: mapState.detailView === 'zone' ? 'zone-meters' : 'zone-summary',
          zoneId: mapState.selectedEntity.id,
        });
      }
      mapState.selectMeter(id);
      setAnalyticsOpen(false);
      const m = mapMeters.find((meter) => meter.id === id);
      const sceneCoord = m ? normalizedToCanonicalScene(m.coordinates) : undefined;
      const framing = focusEntity({
        entity: { type: 'meter', id },
        mode: 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
        entityCoords: sceneCoord,
      });
      setViewport(framing);
    },
    [mapState, mapMeters, setViewport]
  );

  const focusZone = useCallback(
    (id: string) => {
      if (mapState.mode === 'placement') return;
      setPreviousContext(null);
      mapState.selectZone(id);
      setAnalyticsOpen(false);
      const framing = focusEntity({
        entity: { type: 'zone', id },
        mode: 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
      });
      setViewport(framing);
    },
    [mapState, setViewport]
  );

  const handleBackFromMeter = useCallback(() => {
    if (previousContext) {
      const { type, zoneId } = previousContext;
      setPreviousContext(null);
      mapState.selectZone(zoneId);
      if (type === 'zone-meters') {
        mapState.openDetails('zone');
      }
      const framing = focusEntity({
        entity: { type: 'zone', id: zoneId },
        mode: type === 'zone-meters' ? 'details' : 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
      });
      setViewport(framing);
    } else {
      clearSelection();
    }
  }, [previousContext, mapState, setViewport, clearSelection]);

  const handleOpenDetails = useCallback(
    (view?: DetailView) => {
      mapState.openDetails(view);
      setAnalyticsOpen(false);
      if (mapState.selectedEntity) {
        let entityCoords: { x: number; y: number } | undefined;
        if (mapState.selectedEntity.type === 'meter') {
          const m = mapMeters.find((meter) => meter.id === mapState.selectedEntity?.id);
          if (m) entityCoords = normalizedToCanonicalScene(m.coordinates);
        } else if (mapState.selectedEntity.type === 'operator') {
          const foundZone = mapZones.find((z) => z.assignedUser?.id === mapState.selectedEntity?.id);
          if (foundZone) entityCoords = getZoneOperatorAnchor(foundZone.id);
        }
        const framing = focusEntity({
          entity: mapState.selectedEntity,
          mode: 'details',
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
          viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
          entityCoords,
        });
        setViewport(framing);
      }
    },
    [mapState, mapMeters, mapZones, setViewport]
  );

  const handleBackToInspector = useCallback(() => {
    const sel = mapState.selectedEntity;
    if (sel) {
      let entityCoords: { x: number; y: number } | undefined;
      if (sel.type === 'meter') {
        const m = mapMeters.find((meter) => meter.id === sel.id);
        if (m) entityCoords = normalizedToCanonicalScene(m.coordinates);
        mapState.selectMeter(sel.id);
      } else if (sel.type === 'operator') {
        const foundZone = mapZones.find((z) => z.assignedUser?.id === sel.id);
        if (foundZone) entityCoords = getZoneOperatorAnchor(foundZone.id);
        mapState.selectOperator(sel.id);
      } else if (sel.type === 'zone') {
        mapState.selectZone(sel.id);
      }
      const framing = focusEntity({
        entity: sel,
        mode: 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
        entityCoords,
      });
      setViewport(framing);
    } else {
      mapState.resetToBrowse();
      setViewport({ zoom: 1.0, panX: 0, panY: 0 });
    }
  }, [mapState, mapMeters, mapZones, setViewport]);

  const handleStartPlacement = useCallback(
    (zoneId?: string) => {
      const targetId = zoneId || 'zone-container';
      const targetZoneObj = mapZones.find((z) => z.id === targetId);
      const targetName = targetZoneObj ? targetZoneObj.name : 'Khu vực Bãi Container (CY)';

      setAnalyticsOpen(false);
      mapState.startPlacement(targetId, targetName);

      const framing = focusEntity({
        entity: { type: 'zone', id: targetId },
        mode: 'placement',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
      });
      setViewport(framing);
    },
    [mapZones, mapState, setViewport]
  );

  const handleStartRelocation = useCallback(
    (meter: MapMeterItem) => {
      const targetId = meter.zoneId || 'zone-container';
      const targetZoneObj = mapZones.find((z) => z.id === targetId);
      const targetName = targetZoneObj ? targetZoneObj.name : 'Khu vực Bãi Container (CY)';

      setAnalyticsOpen(false);
      mapState.startRelocation({
        id: meter.id,
        meterCode: meter.meterCode,
        name: meter.name,
        zoneId: targetId,
        targetZoneName: targetName,
      });

      const framing = focusEntity({
        entity: { type: 'zone', id: targetId },
        mode: 'placement',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
      });
      setViewport(framing);
    },
    [mapZones, mapState, setViewport]
  );

  const handleConfirmPlacementFromRail = useCallback(async () => {
    if (!placement.pinnedCoords || !mapState.placementContext) return;
    const coords = placement.pinnedCoords;
    const ctx = mapState.placementContext;
    if (ctx.isRelocating && ctx.meterId) {
      await updateAdminMeter(ctx.meterId, {
        map_x: coords.normX,
        map_y: coords.normY,
        zone_id: ctx.targetZoneId,
      });
    } else {
      await createAdminMeter({
        meter_code: ctx.meterCode || 'CT-013',
        name: ctx.meterName || 'Công tơ mới',
        meter_type: ctx.meterType || 'LCD',
        map_x: coords.normX,
        map_y: coords.normY,
        zone_id: ctx.targetZoneId,
      });
    }
    mapState.resetToBrowse();
    await refresh();
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  }, [placement.pinnedCoords, mapState, refresh, setViewport]);

  const handleCancelPlacement = useCallback(() => {
    mapState.cancelPlacement();
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  }, [mapState, setViewport]);

  // Hierarchical ESC key handling
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (analyticsOpen) {
          e.stopPropagation();
          setAnalyticsOpen(false);
        } else if (mapState.mode !== 'browse') {
          e.stopPropagation();
          mapState.handleEsc();
          if (mapState.mode === 'inspect') {
            setViewport({ zoom: 1.0, panX: 0, panY: 0 });
          }
        } else if (activeFocusType) {
          e.stopPropagation();
          setActiveFocusType(null);
        } else if (exceptionFocus) {
          e.stopPropagation();
          setExceptionFocus(false);
        }
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [analyticsOpen, mapState, setViewport, activeFocusType, exceptionFocus]);

  // Tab Lifecycle: On unmount, ensure all selection & transient surfaces are cleanly reset
  const clearSelectionRef = React.useRef(clearSelection);
  clearSelectionRef.current = clearSelection;

  useEffect(() => {
    return () => {
      setAnalyticsOpen(false);
      setExceptionFocus(false);
      setActiveFocusType(null);
      clearSelection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = useCallback(() => {
    const rows = filteredMeters.map((m) =>
      [m.meterCode, m.name, m.zoneName, m.stateLabel, m.latestReading?.readingValue || ''].join(',')
    );
    const blob = new Blob(
      ['Mã công tơ,Tên,Khu vực,Trạng thái,Chỉ số\n' + rows.join('\n')],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cong-to-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredMeters, selectedDate]);

  if (loading && !dashboardData && mapMeters.length === 0) {
    return (
      <div className="sgp-map-loading-container">
        <LoadingState message="Đang tải trung tâm tác nghiệp Cảng Tân Thuận..." />
      </div>
    );
  }

  if (error && mapMeters.length === 0) {
    return (
      <div className="sgp-map-error-container">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  const handleZoomIn = () => {};
  const handleZoomOut = () => {};

  const handleResetView = () => {
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  };

  return (
    <ImmersiveSceneShell
      user={user}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      dashboardData={dashboardData}
      mapMeters={mapMeters}
      filteredMeters={filteredMeters}
      mapZones={mapZones}
      availableOperators={availableOperators}
      overallKpis={overallKpis}
      isLoading={loading}
      onRefresh={refresh}
      onExportCsv={exportCsv}

      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onOpenCalibration={calibrationWorkspace.openMapCalibration}
      calibrationWorkspace={calibrationWorkspace}

      selectedRoundId={selectedRoundId || filters.selectedRoundId}
      onSelectRound={(roundId) => {
        setSelectedRoundId(roundId);
        setFilters({ ...filters, selectedRoundId: roundId });
      }}
      filters={filters}
      onApplyFilters={setFilters}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      hasMeterBack={Boolean(previousContext)}
      meterBackLabel={previousContext?.type === 'zone-meters' ? 'Danh sách công tơ' : 'Tổng quan khu vực'}
      onMeterBack={handleBackFromMeter}

      selection={{
        selectedZoneId: mapState.selectedEntity?.type === 'zone' ? mapState.selectedEntity.id : null,
        selectedMeterId: mapState.selectedEntity?.type === 'meter' ? mapState.selectedEntity.id : null,
        hoveredZoneId: mapState.hoveredEntity?.type === 'zone' ? mapState.hoveredEntity.id : null,
        hoveredMeterId: mapState.hoveredEntity?.type === 'meter' ? mapState.hoveredEntity.id : null,
      }}
      selectedMeter={selectedMeter}
      selectedZone={selectedZone}
      selectedOperatorSummary={selectedOperatorSummary}
      selectedOperatorShiftId={mapState.selectedEntity?.type === 'operator' ? mapState.selectedEntity.id : null}

      onSelectZone={focusZone}
      onSelectMeter={focusMeter}
      onSelectOperator={handleSelectOperator}
      onHoverZone={(zoneId) => mapState.setHoveredEntity(zoneId ? { type: 'zone', id: zoneId } : null)}
      onHoverMeter={(meterId) => mapState.setHoveredEntity(meterId ? { type: 'meter', id: meterId } : null)}
      onClearSelection={clearSelection}
      onCloseOperatorPopover={() => mapState.resetToBrowse()}

      viewport={viewport}
      onViewportChange={setViewport}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onResetView={handleResetView}

      exceptionFocus={exceptionFocus}
      onToggleExceptionFocus={() => {
        setActiveFocusType(null);
        setExceptionFocus((v) => !v);
      }}
      activeFocusType={activeFocusType}
      onFocusTypeChange={(type) => {
        setActiveFocusType(type);
        if (type) setExceptionFocus(false);
      }}

      detailOpen={mapState.mode === 'details'}
      onSetDetailOpen={(open) => {
        if (open) mapState.openDetails();
        else mapState.resetToBrowse();
      }}
      analyticsOpen={analyticsOpen}
      onSetAnalyticsOpen={(open) => {
        if (open) mapState.resetToBrowse();
        setAnalyticsOpen(open);
      }}
      onInspectReading={onInspectReading}
      onReassignOperator={reassignOperator}

      // V7.1 State Machine Props
      mapMode={mapState.mode}
      selectedEntity={mapState.selectedEntity}
      detailView={mapState.detailView}
      placementContext={activePlacementContext}
      onOpenDetails={handleOpenDetails}
      onBackToInspector={handleBackToInspector}
      onUpdatePlacementContext={mapState.updatePlacementContext}
      onConfirmPlacement={handleConfirmPlacementFromRail}
      onCancelPlacement={handleCancelPlacement}
      onResetPin={placement.handleResetPin}
      isSubmittingPlacement={placement.isSubmitting}
      placementError={placement.error}

      placementSvgLayer={
        mapState.mode === 'placement' ? (
          <SpatialPlacementSvgLayer
            isActive={mapState.mode === 'placement'}
            targetZoneId={mapState.placementContext?.targetZoneId || 'zone-container'}
            targetZoneName={mapState.placementContext?.targetZoneName || 'Khu vực Bãi Container (CY)'}
            pinnedCoords={placement.pinnedCoords}
            activeCanonical={placement.activeCanonical}
            isCurrentInside={placement.isCurrentInside}
            onSvgMouseMove={placement.handleSvgMouseMove}
            onSvgClick={placement.handleSvgClick}
          />
        ) : undefined
      }
      onAddMeterToZone={handleStartPlacement}
      onRelocateMeter={handleStartRelocation}
    />
  );
};
