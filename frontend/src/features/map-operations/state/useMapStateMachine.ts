import { useState, useCallback, useMemo } from 'react';

export type SelectedEntity =
  | { type: 'zone'; id: string }
  | { type: 'operator'; id: string }
  | { type: 'meter'; id: string }
  | null;

export type MapMode =
  | 'browse'
  | 'inspect'
  | 'details'
  | 'placement';

export type DetailView =
  | null
  | 'zone'
  | 'operator'
  | 'meter'
  | 'meter-placement';

export interface PlacementContext {
  targetZoneId: string;
  targetZoneName: string;
  isRelocating: boolean;
  meterId?: string;
  meterCode: string;
  meterName: string;
  meterType: string;
  pinnedCoords: { x: number; y: number; normX: number; normY: number } | null;
}

export interface MapUiStateMachine {
  mode: MapMode;
  selectedEntity: SelectedEntity;
  detailView: DetailView;
  hoveredEntity: SelectedEntity;
  placementContext: PlacementContext | null;
  // Actions
  selectZone: (zoneId: string | null) => void;
  selectOperator: (operatorId: string | null) => void;
  selectMeter: (meterId: string | null) => void;
  setHoveredEntity: (entity: SelectedEntity) => void;
  openDetails: (view?: DetailView) => void;
  startPlacement: (targetZoneId: string, targetZoneName: string) => void;
  startRelocation: (meter: { id: string; meterCode: string; name: string; zoneId: string; targetZoneName?: string }) => void;
  updatePlacementContext: (updates: Partial<PlacementContext>) => void;
  cancelPlacement: () => void;
  handleEsc: () => void;
  handleEmptyMapClick: () => void;
  resetToBrowse: () => void;
}

export function useMapStateMachine(): MapUiStateMachine {
  const [mode, setMode] = useState<MapMode>('browse');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [hoveredEntity, setHoveredEntityState] = useState<SelectedEntity>(null);
  const [placementContext, setPlacementContext] = useState<PlacementContext | null>(null);
  const [priorDetailView, setPriorDetailView] = useState<DetailView>(null);

  // Invariant 1: Hover never alters selectedEntity
  const setHoveredEntity = useCallback((entity: SelectedEntity) => {
    setHoveredEntityState(entity);
  }, []);

  // Invariant 2: Maximum one selected entity, click inspects entity
  const selectZone = useCallback((zoneId: string | null) => {
    if (!zoneId) {
      setMode('browse');
      setSelectedEntity(null);
      setDetailView(null);
      setPlacementContext(null);
      return;
    }
    setMode('inspect');
    setSelectedEntity({ type: 'zone', id: zoneId });
    setDetailView(null);
    setPlacementContext(null);
  }, []);

  const selectOperator = useCallback((operatorId: string | null) => {
    if (!operatorId) {
      setMode('browse');
      setSelectedEntity(null);
      setDetailView(null);
      setPlacementContext(null);
      return;
    }
    setMode('inspect');
    setSelectedEntity({ type: 'operator', id: operatorId });
    setDetailView(null);
    setPlacementContext(null);
  }, []);

  const selectMeter = useCallback((meterId: string | null) => {
    if (!meterId) {
      setMode('browse');
      setSelectedEntity(null);
      setDetailView(null);
      setPlacementContext(null);
      return;
    }
    setMode('inspect');
    setSelectedEntity({ type: 'meter', id: meterId });
    setDetailView(null);
    setPlacementContext(null);
  }, []);

  // Invariant 3: Drill-down moves inspect -> details (maximum one contextual surface)
  const openDetails = useCallback((view?: DetailView) => {
    if (view) {
      setMode('details');
      setDetailView(view);
      return;
    }
    if (selectedEntity?.type === 'zone') {
      setMode('details');
      setDetailView('zone');
    } else if (selectedEntity?.type === 'operator') {
      setMode('details');
      setDetailView('operator');
    } else if (selectedEntity?.type === 'meter') {
      setMode('details');
      setDetailView('meter');
    }
  }, [selectedEntity]);

  // Invariant 4: Placement closes inspector and previous detail view
  const startPlacement = useCallback((targetZoneId: string, targetZoneName: string) => {
    setPriorDetailView(detailView);
    setSelectedEntity({ type: 'zone', id: targetZoneId });
    setMode('placement');
    setDetailView('meter-placement');
    setPlacementContext({
      targetZoneId,
      targetZoneName,
      isRelocating: false,
      meterCode: '',
      meterName: '',
      meterType: 'LCD',
      pinnedCoords: null,
    });
  }, [detailView]);

  const startRelocation = useCallback(
    (meter: { id: string; meterCode: string; name: string; zoneId: string; targetZoneName?: string }) => {
      setPriorDetailView(detailView);
      setSelectedEntity({ type: 'meter', id: meter.id });
      setMode('placement');
      setDetailView('meter-placement');
      setPlacementContext({
        targetZoneId: meter.zoneId,
        targetZoneName: meter.targetZoneName || 'Khu vực chỉ định',
        isRelocating: true,
        meterId: meter.id,
        meterCode: meter.meterCode,
        meterName: meter.name,
        meterType: 'LCD',
        pinnedCoords: null,
      });
    },
    [detailView]
  );

  const updatePlacementContext = useCallback((updates: Partial<PlacementContext>) => {
    setPlacementContext((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const cancelPlacement = useCallback(() => {
    setPlacementContext(null);
    if (priorDetailView) {
      setMode('details');
      setDetailView(priorDetailView);
      setPriorDetailView(null);
    } else if (selectedEntity) {
      setMode('inspect');
      setDetailView(null);
    } else {
      setMode('browse');
      setDetailView(null);
    }
  }, [priorDetailView, selectedEntity]);

  // Invariant 5: ESC moves one level back
  const handleEsc = useCallback(() => {
    if (mode === 'placement') {
      cancelPlacement();
    } else if (mode === 'details') {
      setMode('inspect');
      setDetailView(null);
    } else if (mode === 'inspect') {
      setMode('browse');
      setSelectedEntity(null);
      setDetailView(null);
    }
  }, [mode, cancelPlacement]);

  // Invariant 6: Empty map click clears inspection
  const handleEmptyMapClick = useCallback(() => {
    if (mode === 'placement') {
      // In placement mode, empty click is handled by placement pinning
      return;
    }
    setMode('browse');
    setSelectedEntity(null);
    setDetailView(null);
    setPlacementContext(null);
  }, [mode]);

  const resetToBrowse = useCallback(() => {
    setMode('browse');
    setSelectedEntity(null);
    setDetailView(null);
    setPlacementContext(null);
    setPriorDetailView(null);
  }, []);

  return useMemo(() => ({
    mode,
    selectedEntity,
    detailView,
    hoveredEntity,
    placementContext,
    selectZone,
    selectOperator,
    selectMeter,
    setHoveredEntity,
    openDetails,
    startPlacement,
    startRelocation,
    updatePlacementContext,
    cancelPlacement,
    handleEsc,
    handleEmptyMapClick,
    resetToBrowse,
  }), [
    mode,
    selectedEntity,
    detailView,
    hoveredEntity,
    placementContext,
    selectZone,
    selectOperator,
    selectMeter,
    setHoveredEntity,
    openDetails,
    startPlacement,
    startRelocation,
    updatePlacementContext,
    cancelPlacement,
    handleEsc,
    handleEmptyMapClick,
    resetToBrowse,
  ]);
}
