import { useCallback, useState } from 'react';
import {
  MapFilterOptions,
  MapSelectionState,
  MapViewportState,
  OperationalLayerType,
} from '../types';

export function useMapSelection() {
  const [selection, setSelection] = useState<MapSelectionState>({
    selectedZoneId: null,
    selectedMeterId: null,
    hoveredZoneId: null,
    hoveredMeterId: null,
    drawerType: 'none',
  });

  const [activeLayer, setActiveLayer] = useState<OperationalLayerType>('STATUS');

  const [filters, setFilters] = useState<MapFilterOptions>({
    searchQuery: '',
    zoneId: 'ALL',
    status: 'ALL',
    meterType: 'ALL',
    exceptionsOnly: false,
  });

  const [viewport, setViewport] = useState<MapViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const selectZone = useCallback((zoneId: string | null) => {
    setSelection((prev) => ({
      ...prev,
      selectedZoneId: zoneId,
      selectedMeterId: null,
      drawerType: zoneId ? 'zone' : 'none',
    }));
    // If selecting a zone, filter meters to this zone
    if (zoneId) {
      setFilters((prev) => ({ ...prev, zoneId }));
    }
  }, []);

  const selectMeter = useCallback((meterId: string | null) => {
    setSelection((prev) => ({
      ...prev,
      selectedMeterId: meterId,
      drawerType: meterId ? 'meter' : prev.selectedZoneId ? 'zone' : 'none',
    }));
  }, []);

  const setHoveredZone = useCallback((zoneId: string | null) => {
    setSelection((prev) => ({ ...prev, hoveredZoneId: zoneId }));
  }, []);

  const setHoveredMeter = useCallback((meterId: string | null) => {
    setSelection((prev) => ({ ...prev, hoveredMeterId: meterId }));
  }, []);

  const closeDrawer = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      drawerType: 'none',
      selectedMeterId: null,
    }));
  }, []);

  const openReassignDrawer = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      drawerType: 'reassign',
    }));
  }, []);

  const toggleExceptionsOnly = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      exceptionsOnly: !prev.exceptionsOnly,
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.25, 2.5),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.25, 0.75),
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewport({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  return {
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
  };
}
