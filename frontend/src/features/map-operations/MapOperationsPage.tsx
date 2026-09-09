import React, { useMemo } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { OperationsToolbar } from './components/OperationsToolbar';
import { OperationsStatusStrip } from './components/OperationsStatusStrip';
import { OperationsFilters } from './components/OperationsFilters';
import { PortMap } from './components/PortMap';
import { MapControls } from './components/MapControls';
import { MapLegend } from './components/MapLegend';
import { ZoneDrawer } from './components/ZoneDrawer';
import { MeterDrawer } from './components/MeterDrawer';
import { ExceptionList } from './components/ExceptionList';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SEMANTIC_STATE_CONFIG } from './utils/mapStatus';

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
    loading,
    error,
    refresh,
  } = useMapOperations();

  const {
    selection,
    activeLayer,
    setActiveLayer,
    filters,
    setFilters,
    viewport,
    setViewport,
    selectZone,
    selectMeter,
    setHoveredZone,
    setHoveredMeter,
    closeDrawer,
    openReassignDrawer,
    toggleExceptionsOnly,
    zoomIn,
    zoomOut,
    resetView,
  } = useMapSelection();

  // Filtered meters based on user inputs
  const filteredMeters = useMemo(() => {
    return filterMeters(mapMeters, filters);
  }, [mapMeters, filters]);

  // Selected Zone Object
  const selectedZone = useMemo(() => {
    if (!selection.selectedZoneId) return null;
    return mapZones.find((z) => z.id === selection.selectedZoneId) || null;
  }, [mapZones, selection.selectedZoneId]);

  // Selected Meter Object
  const selectedMeter = useMemo(() => {
    if (!selection.selectedMeterId) return null;
    return mapMeters.find((m) => m.id === selection.selectedMeterId) || null;
  }, [mapMeters, selection.selectedMeterId]);

  // Handle focus on a specific meter (center map viewport around meter coordinates)
  const handleFocusMeter = (meterId: string) => {
    selectMeter(meterId);
    const m = mapMeters.find((item) => item.id === meterId);
    if (m) {
      // Smoothly zoom in slightly and center
      setViewport({
        zoom: 1.4,
        panX: -(m.coordinates.x * 1000 * 1.4 - 500),
        panY: -(m.coordinates.y * 650 * 1.4 - 325),
      });
    }
  };

  if (loading && !dashboardData && mapMeters.length === 0) {
    return (
      <div className="sgp-map-loading-container">
        <LoadingState message="Đang kết nối sơ đồ số và tải dữ liệu công tơ Cảng Sài Gòn..." />
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
    <div className="sgp-map-page-root">
      {/* 1. TOP TOOLBAR: Mode switch, Date picker, Layer select, Exception toggle */}
      <OperationsToolbar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode="map"
        onViewModeChange={(mode) => {
          if (mode === 'legacy' && onSwitchToLegacy) {
            onSwitchToLegacy();
          }
        }}
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        exceptionsOnly={filters.exceptionsOnly}
        onToggleExceptionsOnly={toggleExceptionsOnly}
        exceptionsCount={overallKpis.exceptionsCount}
        currentRoundTime={overallKpis.currentRoundTime}
        currentRoundStatus={overallKpis.currentRoundStatus}
        onRefresh={refresh}
        isLoading={loading}
      />

      {/* 2. OPERATIONAL STATUS STRIP: Summary KPIs */}
      <OperationsStatusStrip
        totalMeters={overallKpis.total}
        confirmedCount={overallKpis.confirmed}
        completionPercent={overallKpis.percent}
        reviewCount={overallKpis.review}
        overdueCount={overallKpis.overdue}
        dueCount={overallKpis.due}
        pendingCount={overallKpis.pending}
      />

      {/* 3. FILTER BAR: Search, Zone, Status, Type */}
      <OperationsFilters
        filters={filters}
        zones={mapZones}
        onFilterChange={setFilters}
        filteredCount={filteredMeters.length}
        totalCount={mapMeters.length}
      />

      {/* 4. MAIN WORKSPACE: Map Canvas + Floating Controls + Side Drawer */}
      <div className="sgp-map-workspace">
        {/* MAP CANVAS CONTAINER */}
        <div className="sgp-map-canvas-area">
          <PortMap
            zones={mapZones}
            meters={filteredMeters}
            selectedZoneId={selection.selectedZoneId}
            selectedMeterId={selection.selectedMeterId}
            hoveredZoneId={selection.hoveredZoneId}
            hoveredMeterId={selection.hoveredMeterId}
            activeLayer={activeLayer}
            exceptionsOnly={filters.exceptionsOnly}
            viewport={viewport}
            onSelectZone={(zId) => selectZone(zId)}
            onSelectMeter={(mId) => handleFocusMeter(mId)}
            onHoverZone={setHoveredZone}
            onHoverMeter={setHoveredMeter}
            onClearSelection={() => {
              selectZone(null);
              closeDrawer();
            }}
            onViewportChange={setViewport}
          />

          {/* Floating Zoom / Pan Controls */}
          <MapControls
            zoom={viewport.zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
          />

          {/* Floating Semantic State Legend */}
          <MapLegend />

          {/* Bottom Exception Panel */}
          <ExceptionList
            meters={mapMeters}
            selectedMeterId={selection.selectedMeterId}
            onSelectMeter={handleFocusMeter}
          />
        </div>

        {/* RIGHT SIDE DETAIL DRAWER */}
        {selection.drawerType === 'zone' && selectedZone && (
          <ZoneDrawer
            zone={selectedZone}
            onClose={closeDrawer}
            onSelectMeter={handleFocusMeter}
            onRequestReassign={openReassignDrawer}
          />
        )}

        {selection.drawerType === 'meter' && selectedMeter && (
          <MeterDrawer
            meter={selectedMeter}
            onClose={closeDrawer}
            onInspectReading={onInspectReading}
          />
        )}
      </div>

      {/* 5. LINKED DATA LIST (Map & List Coordinated Interaction) */}
      <div className="sgp-linked-list-section">
        <div className="sgp-linked-list-header">
          <div className="sgp-linked-list-title">
            Danh mục công tơ tác nghiệp
            {filters.zoneId !== 'ALL' && selectedZone && (
              <span className="sgp-linked-zone-badge">· {selectedZone.name}</span>
            )}
          </div>
          <div className="sgp-linked-list-count font-tabular">
            {filteredMeters.length} thiết bị
          </div>
        </div>

        <div className="sgp-linked-table-wrapper">
          <table className="sgp-linked-table">
            <thead>
              <tr>
                <th>MÃ CÔNG TƠ</th>
                <th>TÊN THIẾT BỊ</th>
                <th>KHU VỰC</th>
                <th>VỊ TRÍ</th>
                <th>LOẠI</th>
                <th>TRẠNG THÁI</th>
                <th>CHỈ SỐ GẦN NHẤT</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeters.map((m) => {
                const isSelected = selection.selectedMeterId === m.id;
                const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];

                return (
                  <tr
                    key={m.id}
                    className={`sgp-table-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFocusMeter(m.id)}
                    onMouseEnter={() => setHoveredMeter(m.id)}
                    onMouseLeave={() => setHoveredMeter(null)}
                  >
                    <td className="font-semibold text-brand">
                      {m.meterCode}
                    </td>
                    <td>{m.name}</td>
                    <td>
                      <span className="sgp-table-zone-chip">{m.zoneName}</span>
                    </td>
                    <td>{m.location}</td>
                    <td>
                      <span className="sgp-table-type-chip">
                        {m.meterType === 'LCD' ? 'LCD' : 'Cơ'}
                      </span>
                    </td>
                    <td>
                      <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                        {stCfg.shortLabel}
                      </span>
                    </td>
                    <td className="font-tabular">
                      {m.latestReading?.readingValue ? (
                        <strong>{m.latestReading.readingValue} kWh</strong>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sgp-table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusMeter(m.id);
                        }}
                      >
                        Định vị
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
