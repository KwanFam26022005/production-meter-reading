import React, { useState, useMemo } from 'react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { OperationsToolbar } from './components/OperationsToolbar';
import { OperationsStatusStrip } from './components/OperationsStatusStrip';
import { OperationsFilters } from './components/OperationsFilters';
import { DigitalTwinCanvas } from './digital-twin/DigitalTwinCanvas';
import { CameraCommand } from './digital-twin/DigitalTwinCameraController';
import { MapControls } from './components/MapControls';
import { MapLegend } from './components/MapLegend';
import { ZoneDrawer } from './components/ZoneDrawer';
import { MeterDrawer } from './components/MeterDrawer';
import { ExceptionDrawer } from './components/ExceptionDrawer';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SEMANTIC_STATE_CONFIG } from './utils/mapStatus';
import { X, ExternalLink } from 'lucide-react';

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

  // Phase 4: 2D/3D View Mode, Camera Command, and Drawers
  const [is2D, setIs2D] = useState<boolean>(false);
  const [isExceptionDrawerOpen, setIsExceptionDrawerOpen] = useState<boolean>(false);
  const [isTableDrawerOpen, setIsTableDrawerOpen] = useState<boolean>(false);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

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

  // Handle focus on a specific meter: smoothly moves 3D/2D camera and opens meter drawer
  const handleFocusMeter = (meterId: string) => {
    selectMeter(meterId);
    setCameraCommand({
      type: 'METER',
      id: meterId,
      timestamp: Date.now(),
    });

    const m = mapMeters.find((item) => item.id === meterId);
    if (m) {
      // Also update 2D fallback viewport
      setViewport({
        zoom: 1.4,
        panX: -(m.coordinates.x * 1000 * 1.4 - 500),
        panY: -(m.coordinates.y * 650 * 1.4 - 325),
      });
    }
  };

  // Handle focus on a specific zone: smoothly centers camera on zone centroid and opens zone drawer
  const handleFocusZone = (zoneId: string) => {
    selectZone(zoneId);
    setCameraCommand({
      type: 'ZONE',
      id: zoneId,
      timestamp: Date.now(),
    });
  };

  // Handle resetting camera to whole port aerial/top-down perspective
  const handleResetView = () => {
    resetView();
    setCameraCommand({
      type: 'RESET',
      timestamp: Date.now(),
    });
  };

  // Handle navigation from ExceptionDrawer: flies to meter and selects it
  const handleNavigateToException = (meterId: string) => {
    setIsExceptionDrawerOpen(false);
    handleFocusMeter(meterId);
  };

  if (loading && !dashboardData && mapMeters.length === 0) {
    return (
      <div className="sgp-map-loading-container">
        <LoadingState message="Đang kết nối không gian số 3D và tải dữ liệu công tơ Cảng Sài Gòn..." />
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
      {/* 1. TOP TOOLBAR: Presentation switch, 2D/3D toggle, Date picker, Layer select, Exception drawer trigger */}
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
        is2D={is2D}
        onToggle2D={() => setIs2D((prev) => !prev)}
        onOpenExceptions={() => setIsExceptionDrawerOpen(true)}
        onToggleTable={() => setIsTableDrawerOpen((prev) => !prev)}
        isTableOpen={isTableDrawerOpen}
      />

      {/* 2. OPERATIONAL STATUS STRIP: Summary KPIs (interactive cards open ExceptionDrawer) */}
      <OperationsStatusStrip
        totalMeters={overallKpis.total}
        confirmedCount={overallKpis.confirmed}
        completionPercent={overallKpis.percent}
        reviewCount={overallKpis.review}
        overdueCount={overallKpis.overdue}
        dueCount={overallKpis.due}
        pendingCount={overallKpis.pending}
        onOpenExceptions={() => setIsExceptionDrawerOpen(true)}
      />

      {/* 3. FILTER BAR: Search, Zone, Status, Type */}
      <OperationsFilters
        filters={filters}
        zones={mapZones}
        onFilterChange={setFilters}
        filteredCount={filteredMeters.length}
        totalCount={mapMeters.length}
      />

      {/* 4. MAIN OPERATIONAL WORKSPACE: 3D/2D Digital Twin Full-Canvas (~80-85% viewport) */}
      <div className="sgp-map-workspace">
        <div className="sgp-map-canvas-area">
          <DigitalTwinCanvas
            zones={mapZones}
            meters={filteredMeters}
            selectedZoneId={selection.selectedZoneId}
            selectedMeterId={selection.selectedMeterId}
            hoveredZoneId={selection.hoveredZoneId}
            hoveredMeterId={selection.hoveredMeterId}
            activeLayer={activeLayer}
            exceptionsOnly={filters.exceptionsOnly}
            is2D={is2D}
            cameraCommand={cameraCommand}
            onSelectZone={handleFocusZone}
            onSelectMeter={handleFocusMeter}
            onHoverZone={setHoveredZone}
            onHoverMeter={setHoveredMeter}
            onClearSelection={() => {
              selectZone(null);
              closeDrawer();
            }}
            onCameraCommandFinished={() => setCameraCommand(null)}
            viewport={viewport}
            onViewportChange={setViewport}
          />

          {/* Floating Zoom / Pan / Reset Controls */}
          <MapControls
            zoom={viewport.zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={handleResetView}
          />

          {/* Floating Semantic State Legend */}
          <MapLegend />
        </div>

        {/* RIGHT SIDE DETAIL DRAWER: Zone / Reassign */}
        {(selection.drawerType === 'zone' || selection.drawerType === 'reassign') && selectedZone && (
          <ZoneDrawer
            zone={selectedZone}
            availableOperators={availableOperators}
            onClose={closeDrawer}
            onSelectMeter={handleFocusMeter}
            onRequestReassign={openReassignDrawer}
            onReassignOperator={reassignOperator}
          />
        )}

        {/* RIGHT SIDE DETAIL DRAWER: Meter Reading & Details */}
        {selection.drawerType === 'meter' && selectedMeter && (
          <MeterDrawer
            meter={selectedMeter}
            onClose={closeDrawer}
            onInspectReading={onInspectReading}
          />
        )}

        {/* EXCEPTION SLIDE-OVER DRAWER */}
        <ExceptionDrawer
          isOpen={isExceptionDrawerOpen}
          meters={mapMeters}
          onClose={() => setIsExceptionDrawerOpen(false)}
          onNavigateToMeter={handleNavigateToException}
        />
      </div>

      {/* 5. ON-DEMAND LINKED DATA LIST (Slide-up Drawer / Bottom Sheet) */}
      {isTableDrawerOpen && (
        <div className="sgp-linked-list-drawer" role="dialog" aria-label="Bảng dữ liệu công tơ">
          <div className="sgp-linked-list-header">
            <div className="sgp-linked-list-title-group">
              <span className="sgp-linked-list-title">Danh mục công tơ tác nghiệp</span>
              <span className="sgp-linked-list-count font-tabular">
                ({filteredMeters.length} thiết bị)
              </span>
              {filters.zoneId !== 'ALL' && selectedZone && (
                <span className="sgp-linked-zone-badge">· {selectedZone.name}</span>
              )}
            </div>
            <div className="sgp-linked-list-actions">
              {onSwitchToLegacy && (
                <button
                  type="button"
                  className="sgp-table-switch-legacy-btn"
                  onClick={onSwitchToLegacy}
                  title="Chuyển sang giao diện quản trị đầy đủ"
                >
                  <span>Chế độ chi tiết</span>
                  <ExternalLink size={13} />
                </button>
              )}
              <button
                type="button"
                className="sgp-drawer-close-btn"
                onClick={() => setIsTableDrawerOpen(false)}
                aria-label="Đóng bảng dữ liệu"
              >
                <X size={18} />
              </button>
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
                          Định vị 3D
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
