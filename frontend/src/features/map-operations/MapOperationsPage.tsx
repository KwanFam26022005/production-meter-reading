import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { normalizedToCanonicalScene, clampPanForZoom } from './geometry/canonicalScene';
import { deriveOperatorShiftSummary } from './utils/deriveOperatorShiftSummary';
import type { User } from '../../types';
import { ImmersiveSceneShell } from './shell/ImmersiveSceneShell';
import './motion/mapMotion.css';

interface MapOperationsPageProps {
  user?: User;
  onInspectReading?: (readingId: string) => void;
  onSwitchToLegacy?: () => void;
}

/**
 * MapOperationsPage — Immersive Spatial Operations Console (Phase U0 → U4)
 *
 * MAP IS THE PAGE:
 * Unified operational workspace merging Map + Overview into a single full-bleed scene.
 * All controls (temporal, search, telemetry, legend, zoom) live as integrated HUD overlays.
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
    selection,
    filters,
    setFilters,
    viewport,
    setViewport,
    selectZone,
    selectMeter,
    setHoveredZone,
    setHoveredMeter,
  } = useMapSelection();

  // View mode: 'map' | 'list' (in-place animated segmented switch)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Alert Focus & Telemetry Focus state
  const [exceptionFocus, setExceptionFocus] = useState(false);
  const [activeFocusType, setActiveFocusType] = useState<'OVERDUE' | 'REVIEW' | 'PENDING' | null>(null);

  // Drawers state
  const [detailOpen, setDetailOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedOperatorShiftId, setSelectedOperatorShiftId] = useState<string | null>(null);

  // Runtime source of truth verification object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__MAP_UI_BUILD__ = {
        phase: 'Immersive-Spatial-Console-U0-U4',
        renderer: 'OperationalScene',
        geometryVersion: 'tan-thuan-v1',
        viewBox: '0 0 1664 932',
        zones: mapZones.length,
        meters: mapMeters.length,
        viewMode,
        timestamp: new Date().toISOString(),
      };
    }
  }, [mapZones, mapMeters, viewMode]);

  // Filtered meters with active focus support
  const filteredMeters = useMemo(() => {
    let list = filterMeters(mapMeters, filters);

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
  }, [mapMeters, filters, activeFocusType, exceptionFocus]);

  const selectedMeter = mapMeters.find((m) => m.id === selection.selectedMeterId);
  const selectedZone = mapZones.find((z) => z.id === selection.selectedZoneId);

  // Derive Shift Summary for selected operator marker
  const selectedOperatorSummary = useMemo(() => {
    if (!selectedOperatorShiftId) return null;
    const foundZone = mapZones.find((z) => z.assignedUser?.id === selectedOperatorShiftId);
    const user =
      foundZone?.assignedUser ||
      availableOperators.find((o) => o.id === selectedOperatorShiftId);
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
  }, [selectedOperatorShiftId, mapZones, mapMeters, availableOperators, overallKpis.currentRoundTime]);

  const clearSelection = useCallback(() => {
    setSelectedOperatorShiftId(null);
    selectMeter(null);
    selectZone(null);
    setDetailOpen(false);
    setAnalyticsOpen(false);
  }, [selectMeter, selectZone]);

  const handleSelectOperator = useCallback(
    (operatorId: string) => {
      setSelectedOperatorShiftId(operatorId);
      selectZone(null);
      selectMeter(null);
      setDetailOpen(false);
      setAnalyticsOpen(false);
    },
    [selectZone, selectMeter]
  );

  // Hierarchical ESC key handling
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (analyticsOpen) {
          e.stopPropagation();
          setAnalyticsOpen(false);
        } else if (detailOpen) {
          e.stopPropagation();
          setDetailOpen(false);
        } else if (selectedOperatorShiftId) {
          e.stopPropagation();
          setSelectedOperatorShiftId(null);
        } else if (selection.selectedMeterId) {
          e.stopPropagation();
          selectMeter(null);
        } else if (selection.selectedZoneId) {
          e.stopPropagation();
          selectZone(null);
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
  }, [
    analyticsOpen,
    detailOpen,
    selectedOperatorShiftId,
    selection.selectedMeterId,
    selection.selectedZoneId,
    activeFocusType,
    exceptionFocus,
    selectMeter,
    selectZone,
  ]);

  // Tab Lifecycle: On unmount, ensure all selection & transient surfaces are cleanly reset
  useEffect(() => {
    return () => {
      setSelectedOperatorShiftId(null);
      setDetailOpen(false);
      setAnalyticsOpen(false);
      setExceptionFocus(false);
      setActiveFocusType(null);
      clearSelection();
    };
  }, [clearSelection]);

  const focusMeter = useCallback(
    (id: string) => {
      setSelectedOperatorShiftId(null);
      const meter = mapMeters.find((m) => m.id === id);
      if (!meter) return;
      selectZone(meter.zoneId);
      selectMeter(id);
      setDetailOpen(false);
      setAnalyticsOpen(false);
      const svgCoord = normalizedToCanonicalScene(meter.coordinates);
      const targetZoom = 1.45;
      const rawPanX = -(svgCoord.x * targetZoom - 832);
      const rawPanY = -(svgCoord.y * targetZoom - 466);
      const { panX, panY } = clampPanForZoom(rawPanX, rawPanY, targetZoom);
      setViewport({
        zoom: targetZoom,
        panX,
        panY,
      });
    },
    [mapMeters, selectMeter, selectZone, setViewport]
  );

  const focusZone = useCallback(
    (id: string) => {
      setSelectedOperatorShiftId(null);
      selectMeter(null);
      selectZone(id);
      setDetailOpen(false);
      setAnalyticsOpen(false);
    },
    [selectMeter, selectZone]
  );

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

  const handleZoomIn = () => {
    const nextZoom = Number(Math.min(viewport.zoom + 0.15, 3.0).toFixed(2));
    const { panX, panY } = clampPanForZoom(viewport.panX, viewport.panY, nextZoom);
    setViewport({ zoom: nextZoom, panX, panY });
  };

  const handleZoomOut = () => {
    const nextZoom = Number(Math.max(viewport.zoom - 0.15, 0.6).toFixed(2));
    const { panX, panY } = clampPanForZoom(viewport.panX, viewport.panY, nextZoom);
    setViewport({ zoom: nextZoom, panX, panY });
  };

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

      selectedRoundId={selectedRoundId || filters.selectedRoundId}
      onSelectRound={(roundId) => {
        setSelectedRoundId(roundId);
        setFilters({ ...filters, selectedRoundId: roundId });
      }}
      filters={filters}
      onApplyFilters={setFilters}

      selection={selection}
      selectedMeter={selectedMeter}
      selectedZone={selectedZone}
      selectedOperatorSummary={selectedOperatorSummary}
      selectedOperatorShiftId={selectedOperatorShiftId}

      onSelectZone={focusZone}
      onSelectMeter={focusMeter}
      onSelectOperator={handleSelectOperator}
      onHoverZone={setHoveredZone}
      onHoverMeter={setHoveredMeter}
      onClearSelection={clearSelection}
      onCloseOperatorPopover={() => setSelectedOperatorShiftId(null)}

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

      detailOpen={detailOpen}
      onSetDetailOpen={setDetailOpen}
      analyticsOpen={analyticsOpen}
      onSetAnalyticsOpen={setAnalyticsOpen}
      onInspectReading={onInspectReading}
      onReassignOperator={reassignOperator}
    />
  );
};
