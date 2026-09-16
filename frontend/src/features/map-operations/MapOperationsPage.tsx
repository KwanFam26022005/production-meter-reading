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
import { useMapStateMachine, DetailView } from './state/useMapStateMachine';
import { focusEntity } from './services/mapCameraService';
import { useMapCalibrationWorkspace } from './calibration/useMapCalibrationWorkspace';
import { MapConfigurationProvider, useMapConfiguration } from './providers/MapConfigurationProvider';
import {
  createAdminMeter,
  updateAdminMeter,
  relocateAdminMeter,
  getAdminAssetNetwork,
} from '../../services/api';
import type { Asset, AssetConnection, UtilityType } from '../assets/types';
import { canAdministerMapConfiguration } from '../../types';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import { OperationalWorkspaceHeader } from '../workspace/OperationalWorkspaceHeader';
import { MapInlineDrawers } from './components/MapInlineDrawers';
import { Boxes, ClipboardCheck } from 'lucide-react';
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
const MapOperationsPageContent: React.FC<MapOperationsPageProps> = ({
  user,
  onInspectReading,
  onSwitchToLegacy: _onSwitchToLegacy,
}) => {
  const mapConfig = useMapConfiguration();
  let workspace: ReturnType<typeof useOperationalWorkspace> | null = null;
  try {
    workspace = useOperationalWorkspace();
  } catch {
    workspace = null;
  }

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

  // Centralized Map Workspace & Calibration View (V12) with V16A Active Config invalidation
  const calibrationWorkspace = useMapCalibrationWorkspace(
    'map',
    () => {
      setAnalyticsOpen(false);
      mapState.resetToBrowse();
    },
    () => {
      mapConfig.refetch();
    }
  );
  const viewMode = calibrationWorkspace.workspaceView;
  const setViewMode = calibrationWorkspace.setWorkspaceView;

  // Search Query state (unified across Map and List modes)
  const [searchQuery, setSearchQuery] = useState('');
  const [inlineDrawer, setInlineDrawer] = useState<'assets' | 'verification' | null>(null);

  // Synchronize top workspace utility filter with map selected utility
  useEffect(() => {
    if (workspace && workspace.utilityFilter) {
      if (workspace.utilityFilter === 'ELECTRICITY' || workspace.utilityFilter === 'WATER') {
        setSelectedUtility(workspace.utilityFilter);
      }
    }
  }, [workspace?.utilityFilter]);

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

  // Phase V16E: Infrastructure Asset & Utility Network Topology State
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('asset') || null;
    }
    return null;
  });

  const [selectedUtility, setSelectedUtility] = useState<UtilityType | 'ALL'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const u = params.get('utility');
      if (u === 'ELECTRICITY' || u === 'WATER' || u === 'ALL') return u as UtilityType | 'ALL';
    }
    return 'ELECTRICITY';
  });

  const [showUnverifiedAssets, setShowUnverifiedAssets] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('showUnverified') === '1';
    }
    return false;
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetConnections, setAssetConnections] = useState<AssetConnection[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);

  // Network & Asset data fetching
  const fetchNetworkData = useCallback(async () => {
    try {
      setNetworkLoading(true);
      const data = await getAdminAssetNetwork({
        utility_type: selectedUtility !== 'ALL' ? selectedUtility : undefined,
        verified_only: !showUnverifiedAssets,
      });
      setAssets(data.nodes);
      setAssetConnections(data.edges);
    } catch (err) {
      console.warn('[MapOps] Failed to fetch asset network data:', err);
    } finally {
      setNetworkLoading(false);
    }
  }, [selectedUtility, showUnverifiedAssets]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // URL synchronization for viewMode, asset, utility, showUnverified
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (viewMode === 'map') {
        params.delete('view');
      } else {
        params.set('view', viewMode);
      }

      if (selectedAssetId) {
        params.set('asset', selectedAssetId);
      } else {
        params.delete('asset');
      }

      if (selectedUtility === 'ALL') {
        params.delete('utility');
      } else {
        params.set('utility', selectedUtility);
      }

      if (showUnverifiedAssets) {
        params.set('showUnverified', '1');
      } else {
        params.delete('showUnverified');
      }

      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, [viewMode, selectedAssetId, selectedUtility, showUnverifiedAssets]);

  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    mapState.resetToBrowse();
    setAnalyticsOpen(false);
  }, [mapState]);

  const handleClearSelectedAsset = useCallback(() => {
    setSelectedAssetId(null);
  }, []);

  const handleSwitchToMapAndCenterAsset = useCallback((targetAsset: Asset) => {
    setViewMode('map');
    if (targetAsset.map_x !== null && targetAsset.map_y !== null) {
      const sceneCoord = normalizedToCanonicalScene({ x: targetAsset.map_x, y: targetAsset.map_y });
      const framing = focusEntity({
        entity: { type: 'meter', id: targetAsset.id },
        mode: 'inspect',
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
        entityCoords: sceneCoord,
      });
      setViewport(framing);
    }
  }, [setViewMode, setViewport]);

  // Respond to focusedEntity from OperationalWorkspace
  useEffect(() => {
    if (!workspace?.focusedEntity) return;
    const fe = workspace.focusedEntity;
    if (fe.type === 'asset') {
      handleSelectAsset(fe.id);
      const targetAsset = assets.find((a) => a.id === fe.id || a.code === fe.code);
      if (targetAsset && targetAsset.map_x !== null && targetAsset.map_y !== null) {
        handleSwitchToMapAndCenterAsset(targetAsset);
      }
    } else if (fe.type === 'meter') {
      const targetMeter = mapMeters.find((m) => m.id === fe.id || m.meterCode === fe.code);
      if (targetMeter) {
        mapState.selectMeter(targetMeter.id);
        setViewMode('map');
        const sceneCoord = normalizedToCanonicalScene(targetMeter.coordinates);
        const framing = focusEntity({
          entity: { type: 'meter', id: targetMeter.id },
          mode: 'inspect',
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
          viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
          entityCoords: sceneCoord,
        });
        setViewport(framing);
      }
    }
  }, [workspace?.focusedEntity, assets, mapMeters, handleSelectAsset, handleSwitchToMapAndCenterAsset, mapState, setViewport, setViewMode]);

  // Placement initial coordinates for relocating meter
  const selectedMeterCoord = useMemo(() => {
    if (mapState.placementContext?.isRelocating && mapState.placementContext.meterId) {
      const m = mapMeters.find((meter) => meter.id === mapState.placementContext?.meterId);
      if (m) {
        return normalizedToCanonicalScene(m.coordinates);
      }
    }
    return null;
  }, [mapState.placementContext, mapMeters]);

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
    initialCoordinates: selectedMeterCoord,
    cameraViewport: viewport,
    onConfirmPlacement: async (coords, details) => {
      if (!mapState.placementContext) return;
      const ctx = mapState.placementContext;
      if (ctx.isRelocating && ctx.meterId) {
        await relocateAdminMeter(ctx.meterId, {
          map_x: coords.normX,
          map_y: coords.normY,
        });
        if (details?.name && details.name !== ctx.meterName) {
          await updateAdminMeter(ctx.meterId, {
            name: details.name,
          });
        }
      } else {
        await createAdminMeter({
          meter_code: details?.meterCode || ctx.meterCode || 'CT-013',
          name: details?.name || ctx.meterName || 'Công tơ mới',
          meter_type: details?.meterType || ctx.meterType || 'LCD',
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
    setSelectedAssetId(null);
    setPreviousContext(null);
    mapState.resetToBrowse();
    setAnalyticsOpen(false);
    setViewport({ zoom: 1.0, panX: 0, panY: 0 });
  }, [mapState.resetToBrowse, setViewport]);

  const handleSelectOperator = useCallback(
    (operatorId: string) => {
      if (mapState.mode === 'placement') return;
      setSelectedAssetId(null);
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
      setSelectedAssetId(null);
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
      setSelectedAssetId(null);
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
    await placement.handleConfirm();
  }, [placement]);

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
    <div className="sgp-map-first-root" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      <OperationalWorkspaceHeader
        currentTab="dashboard"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        extraActions={
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`sgp-uwh-hud-toggle ${inlineDrawer === 'assets' ? 'active' : ''}`}
              onClick={() => setInlineDrawer((prev) => (prev === 'assets' ? null : 'assets'))}
              title="Mở danh mục 32 thiết bị hạ tầng ngay trên bản đồ"
            >
              <Boxes size={14} />
              <span>Thiết bị ({assets.length})</span>
            </button>
            <button
              type="button"
              className={`sgp-uwh-hud-toggle ${inlineDrawer === 'verification' ? 'active' : ''}`}
              onClick={() => setInlineDrawer((prev) => (prev === 'verification' ? null : 'verification'))}
              title="Xem nhanh các mục cần đối soát"
            >
              <ClipboardCheck size={14} />
              <span>Đối soát</span>
            </button>
          </div>
        }
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
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

          // Infrastructure Assets & Network Topology (Phase V16E)
          assets={assets}
          assetConnections={assetConnections}
          selectedAssetId={selectedAssetId}
          onSelectAsset={handleSelectAsset}
          onClearSelectedAsset={handleClearSelectedAsset}
          selectedUtility={selectedUtility}
          onSelectUtility={setSelectedUtility}
          showUnverifiedAssets={showUnverifiedAssets}
          onToggleShowUnverifiedAssets={setShowUnverifiedAssets}
          isNetworkLoading={networkLoading}
          onRefreshNetwork={fetchNetworkData}
          canManageVerification={canAdministerMapConfiguration(user)}
          onOpenVerificationReview={(id) => {
            if (workspace) {
              workspace.openVerification(id);
            } else {
              window.location.href = `/admin?tab=verification${id ? '&asset=' + id : ''}`;
            }
          }}
          onOpenAssetDetails={(id, code) => {
            if (workspace) {
              workspace.openAssetDetails(id, code);
            }
          }}
          onSwitchToMapAndCenterAsset={handleSwitchToMapAndCenterAsset}
        />
        <MapInlineDrawers
          assets={assets}
          activeDrawer={inlineDrawer}
          onClose={() => setInlineDrawer(null)}
          onLocateAsset={(asset) => {
            handleSelectAsset(asset.id);
            setInlineDrawer(null);
          }}
        />
      </div>
    </div>
  );
};

export const MapOperationsPage: React.FC<MapOperationsPageProps> = (props) => (
  <MapConfigurationProvider>
    <MapOperationsPageContent {...props} />
  </MapConfigurationProvider>
);

