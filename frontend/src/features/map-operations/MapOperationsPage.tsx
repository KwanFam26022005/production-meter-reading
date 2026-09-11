import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { MapHeader } from './components/MapHeader';
import {
  ZoneDrawer,
  MeterQuickPopup,
  MeterDetailDrawer,
  OperatorShiftPopover,
} from './map-ui';
import { OperationalScene } from './scene/OperationalScene';
import { SceneHud } from './scene/SceneHud';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { normalizedToCanonicalScene } from './geometry/canonicalScene';
import { deriveOperatorShiftSummary } from './utils/deriveOperatorShiftSummary';
import './motion/mapMotion.css';

interface MapOperationsPageProps {
  onInspectReading?: (readingId: string) => void;
  onSwitchToLegacy?: () => void;
}

export const MapOperationsPage: React.FC<MapOperationsPageProps> = ({
  onInspectReading,
  onSwitchToLegacy,
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

  const [exceptionFocus, setExceptionFocus] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOperatorShiftId, setSelectedOperatorShiftId] = useState<string | null>(null);

  // Runtime source of truth verification object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__MAP_UI_BUILD__ = {
        phase: 'Canonical-Base-Scene-H1',
        renderer: 'OperationalScene',
        geometryVersion: 'tan-thuan-v1',
        viewBox: '0 0 1664 932',
        zones: mapZones.length,
        meters: mapMeters.length,
        operators: new Set(mapZones.map((z) => z.assignedUser?.id).filter(Boolean)).size,
        timestamp: new Date().toISOString(),
      };
    }
  }, [mapZones, mapMeters]);

  const filteredMeters = useMemo(() => filterMeters(mapMeters, filters), [mapMeters, filters]);
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
  }, [selectMeter, selectZone]);

  const handleSelectOperator = useCallback(
    (operatorId: string) => {
      setSelectedOperatorShiftId(operatorId);
      selectZone(null);
      selectMeter(null);
      setDetailOpen(false);
    },
    [selectZone, selectMeter]
  );

  // Hierarchical ESC key handling
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailOpen) {
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
        } else if (exceptionFocus) {
          e.stopPropagation();
          setExceptionFocus(false);
        }
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [
    detailOpen,
    selectedOperatorShiftId,
    selection.selectedMeterId,
    selection.selectedZoneId,
    exceptionFocus,
    selectMeter,
    selectZone,
  ]);

  // Tab Lifecycle: On unmount, ensure all selection & transient surfaces are cleanly reset
  useEffect(() => {
    return () => {
      setSelectedOperatorShiftId(null);
      setDetailOpen(false);
      setExceptionFocus(false);
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
      const svgCoord = normalizedToCanonicalScene(meter.coordinates);
      setViewport({
        zoom: 1.45,
        panX: -(svgCoord.x * 1.45 - 832),
        panY: -(svgCoord.y * 1.45 - 466),
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
        <LoadingState message="Đang tải sơ đồ cơ sở Cảng Tân Thuận..." />
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

  const issueCount = overallKpis.overdue + overallKpis.review;

  const handleZoomIn = () => {
    const nextZoom = Math.min(viewport.zoom + 0.15, 3.0);
    setViewport({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(viewport.zoom - 0.15, 0.6);
    setViewport({ ...viewport, zoom: Number(nextZoom.toFixed(2)) });
  };

  const handleResetView = () => {
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  };

  return (
    <div className="sgp-map-first-root">
      {/* Top Header with Date & Temporal Cluster */}
      <MapHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        rounds={dashboardData?.round_progress || []}
        currentRoundTime={overallKpis.currentRoundTime}
        currentRoundStatus={overallKpis.currentRoundStatus}
        selectedRoundId={selectedRoundId || filters.selectedRoundId}
        onSelectRound={(roundId) => {
          setSelectedRoundId(roundId);
          setFilters({ ...filters, selectedRoundId: roundId });
        }}
        viewMode="map"
        onViewModeChange={(mode) => mode === 'legacy' && onSwitchToLegacy?.()}
        onRefresh={refresh}
        isLoading={loading}
        onExportCsv={exportCsv}
      />

      {/* Main Map Workspace Canvas */}
      <main className="sgp-map-first-workspace" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <OperationalScene
          zones={mapZones}
          meters={filteredMeters}
          selectedZoneId={selection.selectedZoneId}
          selectedMeterId={selection.selectedMeterId}
          hoveredZoneId={selection.hoveredZoneId}
          hoveredMeterId={selection.hoveredMeterId}
          activeLayer="STATUS"
          exceptionsOnly={false}
          exceptionFocus={exceptionFocus}
          selectedOperatorId={filters.operatorId === 'ALL' ? undefined : filters.operatorId}
          selectedOperatorShiftId={selectedOperatorShiftId}
          currentRoundTime={overallKpis.currentRoundTime || undefined}
          viewport={viewport}
          onSelectZone={focusZone}
          onSelectMeter={focusMeter}
          onSelectOperator={handleSelectOperator}
          onHoverZone={setHoveredZone}
          onHoverMeter={setHoveredMeter}
          onClearSelection={clearSelection}
          onViewportChange={setViewport}
        />

        {/* Scene HUD Controls (Search/Filter, Exception summary, Round HUD, Legend & Zoom) */}
        <SceneHud
          meters={mapMeters}
          zones={mapZones}
          operators={availableOperators}
          filters={filters}
          onApplyFilters={setFilters}
          onSelectMeter={focusMeter}
          onSelectZone={focusZone}
          onSelectOperator={handleSelectOperator}
          issueCount={issueCount}
          exceptionFocus={exceptionFocus}
          onToggleExceptionFocus={() => setExceptionFocus((v) => !v)}
          rounds={dashboardData?.round_progress || []}
          currentRoundTime={overallKpis.currentRoundTime || undefined}
          selectedRoundId={selectedRoundId || filters.selectedRoundId}
          completionPercent={overallKpis.percent}
          onSelectRound={(roundId) => {
            setSelectedRoundId(roundId);
            setFilters({ ...filters, selectedRoundId: roundId });
          }}
          zoom={viewport.zoom}
          activeLayer="STATUS"
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />

        {/* Exception Focus Bar — Level 1 alert banner */}
        {exceptionFocus && (
          <div className="sgp-exception-focus-bar" role="status">
            <strong className="sgp-ef-badge">{issueCount} vấn đề</strong>
            <span>{overallKpis.overdue} quá hạn</span>
            <span>{overallKpis.review} cần kiểm tra</span>
            {overallKpis.pending > 0 && <span>{overallKpis.pending} chưa ghi</span>}
            <button
              type="button"
              className="sgp-ef-clear-btn"
              onClick={() => setExceptionFocus(false)}
              aria-label="Xóa lọc ngoại lệ"
            >
              Xóa focus
            </button>
          </div>
        )}

        {/* Level 2: Compact Anchored Meter Quick Popup */}
        {selectedMeter && !detailOpen && (
          <MeterQuickPopup
            meter={selectedMeter}
            viewport={viewport}
            onDetails={() => setDetailOpen(true)}
            onClose={clearSelection}
          />
        )}

        {/* Level 2: Spatial Operator Shift Progress Popover */}
        {selectedOperatorSummary && !selectedMeter && !selectedZone && !detailOpen && (
          <OperatorShiftPopover
            summary={selectedOperatorSummary}
            onClose={() => setSelectedOperatorShiftId(null)}
            onSelectZone={focusZone}
          />
        )}

        {/* Level 2: Contextual Zone Drawer */}
        {selectedZone && !selectedMeter && (
          <ZoneDrawer
            zone={selectedZone}
            allMeters={mapMeters}
            currentRoundTime={overallKpis.currentRoundTime || undefined}
            availableOperators={availableOperators}
            onClose={clearSelection}
            onSelectMeter={focusMeter}
            onReassignOperator={reassignOperator}
          />
        )}

        {/* Level 3: Full Detail Meter Detail Drawer */}
        {selectedMeter && detailOpen && (
          <MeterDetailDrawer
            meter={selectedMeter}
            onClose={clearSelection}
            onInspectReading={onInspectReading}
          />
        )}
      </main>
    </div>
  );
};
