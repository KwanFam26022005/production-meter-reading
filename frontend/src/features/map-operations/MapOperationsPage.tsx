import React, { useState, useMemo, useCallback } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { MapHeader } from './components/MapHeader';
import { CompactStatusStrip } from './components/CompactStatusStrip';
import { UnifiedOperationsPanel } from './components/UnifiedOperationsPanel';
import { OperationalMap } from './operational-map/OperationalMap';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

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

  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined);

  // Filtered meters based on multi-select / search / zone / operator
  const filteredMeters = useMemo(() => {
    return filterMeters(mapMeters, filters);
  }, [mapMeters, filters]);

  // Handle focus / select meter
  const handleSelectMeter = useCallback(
    (meterId: string | null) => {
      selectMeter(meterId);
      if (!meterId) return;

      const m = mapMeters.find((item) => item.id === meterId);
      if (m) {
        // If the meter has a zone, ensure zone is also selected
        if (m.zoneId && selection.selectedZoneId !== m.zoneId) {
          selectZone(m.zoneId);
        }
        // Smoothly center the map on the selected meter
        setViewport({
          zoom: 1.45,
          panX: -(m.coordinates.x * 1300 * 1.45 - 650),
          panY: -(m.coordinates.y * 520 * 1.45 - 260),
        });
      }
    },
    [mapMeters, selection.selectedZoneId, selectMeter, selectZone, setViewport]
  );

  // Handle focus / select zone
  const handleSelectZone = useCallback(
    (zoneId: string | null) => {
      selectZone(zoneId);
      if (!zoneId) {
        selectMeter(null);
      }
    },
    [selectZone, selectMeter]
  );

  // Handle clearing selections when user clicks on empty SVG background
  const handleClearSelection = useCallback(() => {
    selectZone(null);
    selectMeter(null);
  }, [selectZone, selectMeter]);

  // CSV Export for administrative reporting
  const handleExportCsv = useCallback(() => {
    if (filteredMeters.length === 0) return;

    const headers = [
      'Mã công tơ',
      'Tên thiết bị',
      'Khu vực',
      'Vị trí',
      'Loại công tơ',
      'Trạng thái',
      'Chỉ số gần nhất (kWh)',
      'Thời điểm ghi',
      'Người ghi',
    ];

    const rows = filteredMeters.map((m) => [
      m.meterCode,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.zoneName.replace(/"/g, '""')}"`,
      `"${m.location.replace(/"/g, '""')}"`,
      m.meterType === 'LCD' ? 'Điện tử (LCD)' : 'Cơ khí',
      m.stateLabel,
      m.latestReading?.readingValue ?? '',
      m.latestReading?.serverTimestamp ?? '',
      m.latestReading?.recordedBy ?? '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_cao_cong_to_Tan_Thuan_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredMeters, selectedDate]);

  if (loading && !dashboardData && mapMeters.length === 0) {
    return (
      <div className="sgp-map-loading-container">
        <LoadingState message="Đang kết nối sơ đồ vận hành Cảng Tân Thuận..." />
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

  return (
    <div className="sgp-unified-console-root">
      {/* 1. COMPACT UNIFIED HEADER */}
      <MapHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode="map"
        onViewModeChange={(mode) => {
          if (mode === 'legacy' && onSwitchToLegacy) {
            onSwitchToLegacy();
          }
        }}
        onRefresh={refresh}
        isLoading={loading}
        onExportCsv={handleExportCsv}
      />

      {/* 2. COMPACT LINEAR STATUS STRIP */}
      <CompactStatusStrip
        totalMeters={overallKpis.total}
        confirmedCount={overallKpis.confirmed}
        completionPercent={overallKpis.percent}
        reviewCount={overallKpis.review}
        overdueCount={overallKpis.overdue}
        dueCount={overallKpis.due}
        pendingCount={overallKpis.pending}
        activeStatusFilter={filters.status}
        onSelectStatusFilter={(status) => setFilters({ ...filters, status })}
      />

      {/* 3. MAIN CONSOLE LAYOUT: Left Operations Panel (280px) + Right Map Canvas (dominant) */}
      <div className="sgp-unified-console-body">
        {/* LEFT COLUMN: 280px UNIFIED OPERATIONS PANEL */}
        <UnifiedOperationsPanel
          zones={mapZones}
          meters={mapMeters}
          filteredMeters={filteredMeters}
          selectedZoneId={selection.selectedZoneId}
          selectedMeterId={selection.selectedMeterId}
          filters={filters}
          operators={availableOperators}
          rounds={dashboardData?.round_progress || []}
          currentRoundTime={overallKpis.currentRoundTime}
          currentRoundStatus={overallKpis.currentRoundStatus}
          selectedRoundId={selectedRoundId}
          onSelectZone={handleSelectZone}
          onSelectMeter={handleSelectMeter}
          onFilterChange={setFilters}
          onSelectRound={setSelectedRoundId}
          onInspectReading={onInspectReading}
          onReassignOperator={async (zoneId, userId, note) => {
            await reassignOperator(zoneId, userId, note);
          }}
        />

        {/* RIGHT COLUMN: DOMINANT OPERATIONAL MAP CANVAS */}
        <div className="sgp-unified-map-area">
          <OperationalMap
            zones={mapZones}
            meters={filteredMeters}
            selectedZoneId={selection.selectedZoneId}
            selectedMeterId={selection.selectedMeterId}
            hoveredZoneId={selection.hoveredZoneId}
            hoveredMeterId={selection.hoveredMeterId}
            activeLayer="STATUS"
            exceptionsOnly={filters.exceptionsOnly}
            selectedOperatorId={filters.operatorId === 'ALL' ? undefined : filters.operatorId}
            viewport={viewport}
            onSelectZone={handleSelectZone}
            onSelectMeter={handleSelectMeter}
            onHoverZone={setHoveredZone}
            onHoverMeter={setHoveredMeter}
            onClearSelection={handleClearSelection}
            onViewportChange={setViewport}
          />
        </div>
      </div>
    </div>
  );
};
