import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useMapOperations } from './hooks/useMapOperations';
import { useMapSelection } from './hooks/useMapSelection';
import { filterMeters } from './utils/mapFilters';
import { MapHeader } from './components/MapHeader';
import { FilterPopover } from './components/FilterPopover';
import { CurrentRoundControl } from './components/CurrentRoundControl';
import { ZoneDrawer } from './map-ui/ZoneDrawer';
import { MeterQuickPopup } from './map-ui/MeterQuickPopup';
import { MeterDetailDrawer } from './map-ui/MeterDetailDrawer';
import { OperationalMap } from './operational-map/OperationalMap';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { OPERATIONAL_METER_COORDINATES } from './geometry/operationalGeometry';

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

  const [exceptionFocus, setExceptionFocus] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredMeters = useMemo(() => filterMeters(mapMeters, filters), [mapMeters, filters]);
  const selectedMeter = mapMeters.find((m) => m.id === selection.selectedMeterId);
  const selectedZone = mapZones.find((z) => z.id === selection.selectedZoneId);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return [
      ...mapMeters
        .filter((m) => [m.meterCode, m.name, m.location].some((v) => v.toLowerCase().includes(q)))
        .slice(0, 5),
      ...mapZones
        .filter((z) => [z.name, z.shortName, z.code].some((v) => v.toLowerCase().includes(q)))
        .slice(0, 4),
    ];
  }, [mapMeters, mapZones, searchQuery]);

  const clearSelection = useCallback(() => {
    selectMeter(null);
    selectZone(null);
    setDetailOpen(false);
    setSearchOpen(false);
  }, [selectMeter, selectZone]);

  // Hierarchical ESC key handling: dismiss topmost contextual surface first
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailOpen) {
          setDetailOpen(false);
        } else if (searchOpen) {
          setSearchOpen(false);
        } else if (exceptionFocus) {
          setExceptionFocus(false);
        } else {
          clearSelection();
        }
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [clearSelection, detailOpen, searchOpen, exceptionFocus]);

  const focusMeter = useCallback(
    (id: string) => {
      const meter = mapMeters.find((m) => m.id === id);
      if (!meter) return;
      selectZone(meter.zoneId);
      selectMeter(id);
      setDetailOpen(false);
      setSearchOpen(false);
      const c = OPERATIONAL_METER_COORDINATES[meter.meterCode] || meter.coordinates;
      setViewport({
        zoom: 1.45,
        panX: -(c.x * 1300 * 1.45 - 650),
        panY: -(c.y * 520 * 1.45 - 260),
      });
    },
    [mapMeters, selectMeter, selectZone, setViewport]
  );

  const focusZone = useCallback(
    (id: string) => {
      selectMeter(null);
      selectZone(id);
      setDetailOpen(false);
      setSearchOpen(false);
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

  const issueCount = overallKpis.overdue + overallKpis.review;

  return (
    <div className="sgp-map-first-root">
      {/* Compact Top Header */}
      <MapHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode="map"
        onViewModeChange={(mode) => mode === 'legacy' && onSwitchToLegacy?.()}
        onRefresh={refresh}
        isLoading={loading}
        onExportCsv={exportCsv}
      />

      {/* Main Map Workspace (occupies nearly whole viewport below header) */}
      <main className="sgp-map-first-workspace">
        <OperationalMap
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
          viewport={viewport}
          onSelectZone={focusZone}
          onSelectMeter={focusMeter}
          onHoverZone={setHoveredZone}
          onHoverMeter={setHoveredMeter}
          onClearSelection={clearSelection}
          onViewportChange={setViewport}
        />

        {/* Top HUD: Search, Filter, and Compact Exception HUD */}
        <div className="sgp-map-top-hud">
          <div className="sgp-map-action-cluster">
            <div className="sgp-search-wrap">
              <button
                type="button"
                className="sgp-map-icon-btn"
                aria-label="Tìm công tơ hoặc khu vực"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                <Search size={17} />
              </button>

              {searchOpen && (
                <div className="sgp-search-popover" role="dialog" aria-label="Tìm kiếm">
                  <div className="sgp-search-input-wrap">
                    <Search size={15} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm công tơ hoặc khu vực..."
                    />
                    <button onClick={() => setSearchOpen(false)} aria-label="Đóng tìm kiếm">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="sgp-search-results">
                    {searchResults.map((item) =>
                      'meterCode' in item ? (
                        <button key={item.id} onClick={() => focusMeter(item.id)}>
                          <strong>{item.meterCode}</strong>
                          <span>{item.name}</span>
                        </button>
                      ) : (
                        <button key={item.id} onClick={() => focusZone(item.id)}>
                          <strong>{item.name}</strong>
                          <span>{item.metrics.totalMeters} công tơ</span>
                        </button>
                      )
                    )}
                    {searchQuery && searchResults.length === 0 && (
                      <span className="sgp-search-empty">Không tìm thấy kết quả</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <FilterPopover
              filters={filters}
              zones={mapZones}
              operators={availableOperators}
              onApplyFilters={setFilters}
            />
          </div>

          {/* Compact Exception HUD (Figma 2:2 / 2:104) */}
          <button
            type="button"
            className={`sgp-exception-hud ${exceptionFocus ? 'active' : ''}`}
            onClick={() => setExceptionFocus((v) => !v)}
            aria-pressed={exceptionFocus}
          >
            {issueCount > 0 ? (
              <>
                <AlertTriangle size={15} />
                <span>{issueCount} vấn đề</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Không có ngoại lệ</span>
              </>
            )}
          </button>
        </div>

        {/* Exception Focus Bar */}
        {exceptionFocus && issueCount > 0 && (
          <div className="sgp-exception-focus-bar" role="status">
            <strong>{issueCount} vấn đề đang hiển thị</strong>
            <span>Quá hạn: {overallKpis.overdue}</span>
            <span>Cần kiểm tra: {overallKpis.review}</span>
            <button onClick={() => setExceptionFocus(false)}>Xóa lọc ngoại lệ</button>
          </div>
        )}

        {/* Level 2: Compact Anchored Meter Quick Popup (Figma 2:514) */}
        {selectedMeter && !detailOpen && (
          <MeterQuickPopup
            meter={selectedMeter}
            onDetails={() => setDetailOpen(true)}
            onClose={clearSelection}
          />
        )}

        {/* Floating Current Round Control (Figma 2:2) */}
        <CurrentRoundControl
          rounds={dashboardData?.round_progress || []}
          currentRoundTime={overallKpis.currentRoundTime}
          currentRoundStatus={overallKpis.currentRoundStatus}
          onSelectRound={(roundId) => setFilters({ ...filters, selectedRoundId: roundId })}
        />

        {/* Level 2: Contextual Zone Drawer (Figma 2:363 & 9:8) */}
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

        {/* Level 3: Explicit Full Detail Meter Detail Drawer (Figma 2:514) */}
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
