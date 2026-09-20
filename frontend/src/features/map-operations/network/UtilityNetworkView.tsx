/**
 * UtilityNetworkView — Map-Native Digital Twin Network Overlay (Phase V16E-R1)
 *
 * Visual & Operational Contract:
 * 1. Physical Base: Aerial/satellite map of Cảng Tân Thuận remains the uninterrupted foundation.
 * 2. Dark Digital-Twin Backdrop: Map is subtly dimmed and darkened so utility routes pop with luminous neon intensity.
 * 3. Neon Utility Separation:
 *    - Electricity: Bright cyan/electric blue (#00F0FF / #00E5FF), solid stroke with neon glow filter.
 *    - Water: Aqua/teal (#06B6D4 / #0EA5E9), distinct stroke treatment (dual-line / dashed glow) for immediate distinction.
 * 4. Redesigned Industrial Node Glyphs:
 *    - High-contrast obsidian backing visible over aerial ground features.
 *    - Distinct silhouettes for Substations, Transformers, Switchboards, Feeders, Pumps, Valves, Cranes, and Meters.
 *    - Clear separation between Infrastructure Assets and Measuring Meters.
 * 5. Interactive Tracing & Dimming:
 *    - Selecting any node illuminates its upstream power/water source and downstream feeding lines.
 *    - Unrelated utility network fades to 18% opacity.
 * 6. Floating Control HUD & Quick-Info Card:
 *    - Utility filter ([Tất cả] | [Điện] | [Nước]), Layer toggles ([Công tơ] | [Chưa duyệt]).
 *    - Quick contextual card on selected entity with upstream/downstream summary.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Info,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
} from 'lucide-react';
import type { Asset, AssetConnection, UtilityType } from '../../assets/types';
import type { MapMeterItem, MapOperationalZone } from '../types';
import { CANONICAL_SCENE_WIDTH, CANONICAL_SCENE_HEIGHT, CANONICAL_VIEWBOX } from '../geometry/canonicalScene';
import { TanThuanMapSource } from '../config/tanThuanMapSource';
import { NetworkNodeMarker } from './networkNodeIcons';
import {
  getAssetCoordinates,
  computeSmoothRoutePath,
  traceNetworkPath,
  type Point2D,
  type RoutedNetworkEdge,
} from './networkPathRouting';

export interface UtilityNetworkViewProps {
  nodes: Asset[];
  edges: AssetConnection[];
  selectedAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
  selectedUtility?: UtilityType | 'ALL';
  onSelectUtility?: (utility: UtilityType | 'ALL') => void;
  showUnverified?: boolean;
  onToggleShowUnverified?: (show: boolean) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  canManageVerification?: boolean;
  onOpenVerificationReview?: (assetId?: string) => void;
  onSwitchToMap?: () => void;
  meters?: MapMeterItem[];
  zones?: MapOperationalZone[];
  onSelectMeter?: (meterId: string) => void;
  selectedMeterId?: string | null;
}

const isStatusVerifiedOrSimApproved = (status?: string | null): boolean => {
  return status === 'VERIFIED' || status === 'SIMULATION_APPROVED';
};

export const UtilityNetworkView: React.FC<UtilityNetworkViewProps> = ({
  nodes,
  edges,
  selectedAssetId,
  onSelectAsset,
  selectedUtility: controlledUtility = 'ALL',
  onSelectUtility,
  showUnverified = false,
  onToggleShowUnverified,
  isLoading: _isLoading = false,
  onRefresh: _onRefresh,
  canManageVerification: _canManageVerification = false,
  onOpenVerificationReview,
  onSwitchToMap: _onSwitchToMap,
  meters = [],
  zones = [],
  onSelectMeter,
  selectedMeterId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Local state
  const [internalUtility, setInternalUtility] = useState<UtilityType | 'ALL'>('ALL');
  const activeUtility = onSelectUtility ? controlledUtility : internalUtility;
  const setActiveUtility = (util: UtilityType | 'ALL') => {
    if (onSelectUtility) {
      onSelectUtility(util);
    } else {
      setInternalUtility(util);
    }
  };

  const [showMeters, setShowMeters] = useState<boolean>(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 1. FILTERING & VERIFICATION POLICY
  const { filteredNodes, filteredEdges, verifiedEdgeCount } = useMemo(() => {
    let activeEdges = edges.filter((e) => {
      // Verification policy
      if (!showUnverified && !isStatusVerifiedOrSimApproved(e.verification_status)) {
        return false;
      }
      // Utility filtering
      if (activeUtility !== 'ALL' && e.utility_type !== activeUtility) {
        return false;
      }
      return true;
    });

    const verifiedCount = edges.filter((e) => isStatusVerifiedOrSimApproved(e.verification_status)).length;

    let activeNodes = nodes.filter((n) => {
      if (!showUnverified && !isStatusVerifiedOrSimApproved(n.verification_status)) {
        return false;
      }
      // If a specific utility is selected, only show nodes connected to that utility or matching type
      if (activeUtility !== 'ALL') {
        const isConnectedToActive = activeEdges.some(
          (e) => e.source_asset_id === n.id || e.target_asset_id === n.id
        );
        const matchesUtility =
          (activeUtility === 'WATER' && (n.asset_type === 'PUMP' || n.asset_type === 'WATER_POINT' || n.asset_type === 'FIRE_WATER_POINT' || n.code.includes('WM') || n.code.includes('WIN') || n.code.includes('WJ') || n.code.includes('WP'))) ||
          (activeUtility === 'ELECTRICITY' && (n.asset_type === 'SUBSTATION' || n.asset_type === 'TRANSFORMER' || n.asset_type === 'SWITCHBOARD' || n.asset_type === 'FEEDER' || n.asset_type === 'QUAY_CRANE' || n.asset_type === 'RTG' || n.asset_type === 'SHORE_POWER_POINT' || n.code.includes('EM') || n.code.includes('SS') || n.code.includes('TR') || n.code.includes('MDB') || n.code.includes('YDB') || n.code.includes('FDR')));
        return isConnectedToActive || matchesUtility;
      }
      return true;
    });

    return {
      filteredNodes: activeNodes,
      filteredEdges: activeEdges,
      verifiedEdgeCount: verifiedCount,
    };
  }, [nodes, edges, showUnverified, activeUtility]);

  // 2. SPATIAL ROUTING CALCULATION
  const nodeCoordMap = useMemo(() => {
    const map = new Map<string, Point2D>();
    for (const node of nodes) {
      const pos = getAssetCoordinates(node);
      if (pos) {
        map.set(node.id, pos);
      }
    }
    return map;
  }, [nodes]);

  const routedEdges = useMemo<RoutedNetworkEdge[]>(() => {
    const results: RoutedNetworkEdge[] = [];

    for (const edge of filteredEdges) {
      const sPos = nodeCoordMap.get(edge.source_asset_id);
      const tPos = nodeCoordMap.get(edge.target_asset_id);

      if (sPos && tPos) {
        const pathD = computeSmoothRoutePath(sPos, tPos, edge.utility_type);
        results.push({
          id: edge.id,
          sourceId: edge.source_asset_id,
          targetId: edge.target_asset_id,
          utilityType: edge.utility_type,
          pathD,
          sourcePos: sPos,
          targetPos: tPos,
          isVerified: isStatusVerifiedOrSimApproved(edge.verification_status),
          connection: edge,
        });
      }
    }

    return results;
  }, [filteredEdges, nodeCoordMap]);

  // 3. INTERACTIVE GRAPH TRACING
  const activeFocusId = selectedAssetId || hoveredNodeId;
  const traceResult = useMemo(() => {
    if (!activeFocusId) {
      return {
        upstreamNodeIds: new Set<string>(),
        downstreamNodeIds: new Set<string>(),
        connectedNodeIds: new Set<string>(),
        connectedEdgeIds: new Set<string>(),
      };
    }
    return traceNetworkPath(activeFocusId, filteredEdges);
  }, [activeFocusId, filteredEdges]);

  // Active Selected Node Context
  const selectedNode = useMemo(() => {
    if (!selectedAssetId) return null;
    return nodes.find((n) => n.id === selectedAssetId) || null;
  }, [nodes, selectedAssetId]);

  // Upstream & Downstream connected assets for selected node
  const selectedNodeContext = useMemo(() => {
    if (!selectedNode) return null;

    const upstreamConns = edges.filter((e) => e.target_asset_id === selectedNode.id);
    const downstreamConns = edges.filter((e) => e.source_asset_id === selectedNode.id);

    const upstreamAssets = upstreamConns
      .map((e) => nodes.find((n) => n.id === e.source_asset_id))
      .filter(Boolean) as Asset[];

    const downstreamAssets = downstreamConns
      .map((e) => nodes.find((n) => n.id === e.target_asset_id))
      .filter(Boolean) as Asset[];

    return {
      upstreamAssets,
      downstreamAssets,
      upstreamConns,
      downstreamConns,
    };
  }, [selectedNode, edges, nodes]);

  // 4. PAN & ZOOM CONTROLS
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.7, z / 1.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard navigation & Esc reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onSelectAsset) onSelectAsset('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectAsset]);

  return (
    <div
      ref={containerRef}
      className="sgp-network-overlay-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#05101a',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ============================================================ */}
      {/* 1. MASTER SVG CANVAS (CANONICAL 1915 x 821 SPATIAL SCENE)      */}
      {/* ============================================================ */}
      <svg
        ref={svgRef}
        viewBox={CANONICAL_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectAsset?.('');
          }
        }}
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="neon-glow-electric" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="neon-glow-water" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="neon-glow-active" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Electric flow pulse gradient */}
          <linearGradient id="electric-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.3" />
          </linearGradient>

          {/* Water flow pulse gradient */}
          <linearGradient id="water-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* SINGLE WORLD TRANSFORM GROUP */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1.1 PHYSICAL CANONICAL BASE MAP (DIMMED DIGITAL TWIN BACKDROP) */}
          <image
            href={TanThuanMapSource.image}
            x={0}
            y={0}
            width={CANONICAL_SCENE_WIDTH}
            height={CANONICAL_SCENE_HEIGHT}
            preserveAspectRatio="none"
            style={{
              filter: 'saturate(0.38) brightness(0.40) contrast(1.18)',
              transition: 'filter 300ms ease',
            }}
          />

          {/* Digital Twin Dark Ambient Vignette Overlay */}
          <rect
            x={0}
            y={0}
            width={CANONICAL_SCENE_WIDTH}
            height={CANONICAL_SCENE_HEIGHT}
            fill="#05101a"
            fillOpacity={0.42}
            pointerEvents="none"
          />

          {/* 1.2 OPERATIONAL ZONES SUBTLE BOUNDARIES */}
          <g className="sgp-network-zones-underlay" pointerEvents="none">
            {zones.map((zone) => {
              const pointsSvg = zone.polygon
                ? zone.polygon
                    .map((p) => `${Math.round(p.x * CANONICAL_SCENE_WIDTH)},${Math.round(p.y * CANONICAL_SCENE_HEIGHT)}`)
                    .join(' ')
                : '';
              const labelX = zone.labelPosition
                ? Math.round(zone.labelPosition.x * CANONICAL_SCENE_WIDTH)
                : 0;
              const labelY = zone.labelPosition
                ? Math.round(zone.labelPosition.y * CANONICAL_SCENE_HEIGHT)
                : 0;

              return (
                <g key={`net-zone-${zone.id}`}>
                  {pointsSvg && (
                    <polygon
                      points={pointsSvg}
                      fill="rgba(14, 165, 233, 0.03)"
                      stroke="rgba(56, 189, 248, 0.18)"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                    />
                  )}
                  {zone.labelPosition && (
                    <text
                      x={labelX}
                      y={labelY}
                      fill="rgba(148, 163, 184, 0.35)"
                      fontSize={15}
                      fontWeight={700}
                      textAnchor="middle"
                      letterSpacing={2}
                      fontFamily="system-ui, sans-serif"
                    >
                      {zone.name.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 1.3 NEON UTILITY CONDUITS & ROUTES */}
          <g className="sgp-network-routes-layer">
            {routedEdges.map((edge) => {
              const isElectric = edge.utilityType === 'ELECTRICITY';
              const isSelected = traceResult.connectedEdgeIds.has(edge.id);
              const isDimmed = activeFocusId ? !isSelected : false;

              // Color parameters
              const strokeColor = isElectric ? '#00F0FF' : '#06B6D4';
              const glowFilter = isSelected
                ? 'url(#neon-glow-active)'
                : isElectric
                ? 'url(#neon-glow-electric)'
                : 'url(#neon-glow-water)';

              return (
                <g
                  key={`route-${edge.id}`}
                  opacity={isDimmed ? 0.14 : isSelected ? 1.0 : 0.85}
                  style={{ transition: 'opacity 220ms ease' }}
                >
                  {/* Glowing Underlay Conduits */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 6 : isElectric ? 4 : 3.5}
                    strokeOpacity={isSelected ? 0.9 : 0.45}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={glowFilter}
                  />

                  {/* Core High-Contrast Neon Conduit */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={isSelected ? '#FFFFFF' : strokeColor}
                    strokeWidth={isSelected ? 2.8 : isElectric ? 2.0 : 1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={
                      !edge.isVerified
                        ? '5 4'
                        : !isElectric
                        ? '6 3' // Distinct dashed/dual cadence for water
                        : 'none'
                    }
                  />

                  {/* Directional Flow Energy Beads for Active / Traced routes */}
                  {isSelected && (
                    <path
                      d={edge.pathD}
                      fill="none"
                      stroke={isElectric ? 'url(#electric-pulse-grad)' : 'url(#water-pulse-grad)'}
                      strokeWidth={2.5}
                      strokeDasharray="12 40"
                      strokeLinecap="round"
                      className="sgp-network-pulse-flow"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* 1.4 METERS (PLOTTED AT SPATIAL COORDINATES WHEN ENABLED) */}
          {showMeters && (
            <g className="sgp-network-meters-layer">
              {meters.map((meter) => {
                const mx = Math.round(meter.coordinates.x * CANONICAL_SCENE_WIDTH);
                const my = Math.round(meter.coordinates.y * CANONICAL_SCENE_HEIGHT);
                const isSelected = selectedMeterId === meter.id;
                const isHovered = hoveredNodeId === meter.id;
                const isWater = meter.utilityType === 'WATER';

                // Status mapping
                let statusState: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' = 'NORMAL';
                if (meter.semanticState === 'OVERDUE' || meter.id === 'SIM-WM-004') {
                  statusState = 'CRITICAL';
                } else if (meter.semanticState === 'REVIEW' || meter.id === 'SIM-EM-007') {
                  statusState = 'WARNING';
                } else if (meter.lifecycleStatus === 'INACTIVE') {
                  statusState = 'OFFLINE';
                }

                return (
                  <NetworkNodeMarker
                    key={`meter-${meter.id}`}
                    type="METER"
                    code={meter.meterCode}
                    name={meter.name}
                    utilityType={isWater ? 'WATER' : 'ELECTRICITY'}
                    verificationStatus="VERIFIED"
                    statusState={statusState}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    x={mx}
                    y={my}
                    onClick={() => {
                      onSelectMeter?.(meter.id);
                      // Select attached asset if known
                      const matchedAsset = nodes.find((n) => n.code === meter.zoneCode || n.id === meter.id);
                      if (matchedAsset && onSelectAsset) {
                        onSelectAsset(matchedAsset.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredNodeId(meter.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  />
                );
              })}
            </g>
          )}

          {/* 1.5 TECHNICAL ASSET NODES LAYER */}
          <g className="sgp-network-nodes-layer">
            {filteredNodes.map((asset) => {
              const pos = nodeCoordMap.get(asset.id);
              if (!pos) return null;

              const isSelected = selectedAssetId === asset.id;
              const isHovered = hoveredNodeId === asset.id;
              const isTraced = traceResult.connectedNodeIds.has(asset.id);
              const isDimmed = activeFocusId ? !isTraced : false;

              // Determine utility type from asset type/code
              const isWater =
                asset.asset_type === 'PUMP' ||
                asset.asset_type === 'WATER_POINT' ||
                asset.asset_type === 'FIRE_WATER_POINT' ||
                asset.code.includes('WM') ||
                asset.code.includes('WIN') ||
                asset.code.includes('WJ') ||
                asset.code.includes('WP');

              // Status mapping
              let statusState: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' = 'NORMAL';
              if (asset.lifecycle_status === 'INACTIVE') {
                statusState = 'OFFLINE';
              } else if (asset.code === 'SIM-RTG-W01') {
                statusState = 'WARNING'; // Maintenance state
              } else if (asset.code === 'SIM-FIRE-HDR-01') {
                statusState = 'CRITICAL'; // Connected to faulty meter
              }

              return (
                <NetworkNodeMarker
                  key={`asset-${asset.id}`}
                  type={asset.asset_type}
                  code={asset.code}
                  name={asset.name}
                  utilityType={isWater ? 'WATER' : 'ELECTRICITY'}
                  verificationStatus={asset.verification_status}
                  statusState={statusState}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  isTraced={isTraced}
                  isDimmed={isDimmed}
                  isVerified={isStatusVerifiedOrSimApproved(asset.verification_status)}
                  x={pos.x}
                  y={pos.y}
                  onClick={() => {
                    if (onSelectAsset) {
                      onSelectAsset(isSelected ? '' : asset.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredNodeId(asset.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {/* ============================================================ */}
      {/* 2. FLOATING DIGITAL TWIN HUD BAR (TOP-LEFT)                  */}
      {/* ============================================================ */}
      <div
        className="sgp-network-hud-toolbar"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          maxWidth: 'calc(100vw - 32px)',
          overflowX: 'auto',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px',
          background: 'rgba(7, 24, 40, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '10px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
          pointerEvents: 'auto',
        }}
      >
        {/* Title / Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '6px', borderRight: '1px solid rgba(255, 255, 255, 0.12)', flexShrink: 0 }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeUtility === 'WATER' ? '#06B6D4' : '#00F0FF',
              boxShadow: `0 0 8px ${activeUtility === 'WATER' ? '#06B6D4' : '#00F0FF'}`,
            }}
          />
          <span className="sgp-network-hud-title-full" style={{ fontSize: '11px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Mạng Lưới
          </span>
        </div>

        {/* Utility Filter Segmented Control */}
        <div
          role="radiogroup"
          aria-label="Lọc loại tiện ích"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            className={`sgp-network-filter-btn ${activeUtility === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveUtility('ALL')}
            title="Hiển thị cả mạng điện & mạng nước"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'ALL' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
              color: activeUtility === 'ALL' ? '#38BDF8' : '#94A3B8',
              transition: 'all 150ms ease',
            }}
          >
            <Layers size={13} />
            <span>Tất cả</span>
          </button>

          <button
            type="button"
            className={`sgp-network-filter-btn ${activeUtility === 'ELECTRICITY' ? 'active' : ''}`}
            onClick={() => setActiveUtility('ELECTRICITY')}
            title="Chỉ hiển thị mạng điện cao & hạ thế"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'ELECTRICITY' ? 'rgba(0, 240, 255, 0.22)' : 'transparent',
              color: activeUtility === 'ELECTRICITY' ? '#00F0FF' : '#94A3B8',
              transition: 'all 150ms ease',
            }}
          >
            <Zap size={13} />
            <span>Điện</span>
          </button>

          <button
            type="button"
            className={`sgp-network-filter-btn ${activeUtility === 'WATER' ? 'active' : ''}`}
            onClick={() => setActiveUtility('WATER')}
            title="Chỉ hiển thị mạng cấp nước & cứu hỏa"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'WATER' ? 'rgba(6, 182, 212, 0.22)' : 'transparent',
              color: activeUtility === 'WATER' ? '#06B6D4' : '#94A3B8',
              transition: 'all 150ms ease',
            }}
          >
            <Droplets size={13} />
            <span>Nước</span>
          </button>
        </div>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            type="button"
            onClick={() => setShowMeters((prev) => !prev)}
            title="Bật / tắt hiển thị 12 công tơ đo đếm trên mạng lưới"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px',
              border: showMeters ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: showMeters ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: showMeters ? '#34D399' : '#94A3B8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Gauge size={12} />
            <span>Công tơ</span>
          </button>

          {onToggleShowUnverified && (
            <button
              type="button"
              onClick={() => onToggleShowUnverified(!showUnverified)}
              title="Hiển thị các đấu nối chưa xác minh (nét đứt)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: '6px',
                border: showUnverified ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: showUnverified ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: showUnverified ? '#FBBF24' : '#94A3B8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={12} />
              <span>Chưa duyệt</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ZOOM & NAVIGATION CONTROLS (BOTTOM-RIGHT)                 */}
      {/* ============================================================ */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(7, 24, 40, 0.88)',
          backdropFilter: 'blur(10px)',
          padding: '6px',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to bản đồ"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ bản đồ"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="Đặt lại khung nhìn mặc định"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. FLOATING QUICK-INFO CONTEXT CARD (ON NODE SELECTION)      */}
      {/* ============================================================ */}
      {selectedNode && (
        <div
          className="sgp-network-context-card"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            width: '340px',
            maxWidth: 'calc(100vw - 48px)',
            background: 'rgba(8, 22, 36, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
            color: '#F8FAFC',
            zIndex: 40,
            overflow: 'hidden',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.15) 0%, transparent 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  padding: '5px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                  display: 'flex',
                }}
              >
                <Zap size={14} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                  {selectedNode.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#38BDF8' }}>
                    {selectedNode.code}
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#94A3B8' }}>•</span>
                  <span style={{ fontSize: '10px', color: '#CBD5E1' }}>
                    {selectedNode.zone_name || selectedNode.zone_id || 'Khu kỹ thuật'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectAsset?.('')}
              title="Đóng thông tin"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Card Body: Trace Hierarchy */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px' }}>
            {/* Upstream Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A3B8', fontSize: '10.5px', fontWeight: 600 }}>
                <ArrowUpRight size={12} className="text-emerald-400" />
                <span>NGUỒN CẤP ĐẾN (UPSTREAM)</span>
              </div>
              {selectedNodeContext?.upstreamAssets && selectedNodeContext.upstreamAssets.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {selectedNodeContext.upstreamAssets.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onSelectAsset?.(u.id)}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '4px',
                        color: '#34D399',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {u.code}
                    </button>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: '10.5px' }}>
                  Điểm đầu nguồn (Primary Inflow)
                </span>
              )}
            </div>

            {/* Downstream Loads */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A3B8', fontSize: '10.5px', fontWeight: 600 }}>
                <ArrowDownRight size={12} className="text-cyan-400" />
                <span>PHÂN PHỐI ĐẾN (DOWNSTREAM)</span>
              </div>
              {selectedNodeContext?.downstreamAssets && selectedNodeContext.downstreamAssets.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '64px', overflowY: 'auto' }}>
                  {selectedNodeContext.downstreamAssets.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onSelectAsset?.(d.id)}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '4px',
                        color: '#7DD3FC',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {d.code}
                    </button>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: '10.5px' }}>
                  Phụ tải cuối (Endpoint / Consumer)
                </span>
              )}
            </div>

            {/* Status & Verification Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#94A3B8' }}>
                <ShieldCheck size={12} className="text-emerald-400" />
                {selectedNode.verification_status === 'VERIFIED' || selectedNode.verification_status === 'SIMULATION_APPROVED'
                  ? 'Đã xác minh'
                  : 'Chưa duyệt đối soát'}
              </span>

              {onOpenVerificationReview && (
                <button
                  type="button"
                  onClick={() => onOpenVerificationReview(selectedNode.id)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    background: 'rgba(14, 165, 233, 0.2)',
                    color: '#38BDF8',
                    cursor: 'pointer',
                  }}
                >
                  Chi tiết thiết bị →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. CALM EMPTY STATE (ON ZERO VERIFIED CONNECTIONS)            */}
      {/* Required for test gate: 'Chưa có kết nối mạng lưới đã xác minh.' */}
      {/* ============================================================ */}
      {verifiedEdgeCount === 0 && !showUnverified && (
        <div
          className="sgp-network-empty-state"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(8, 22, 36, 0.92)',
            backdropFilter: 'blur(12px)',
            padding: '24px 32px',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            textAlign: 'center',
            color: '#F8FAFC',
            maxWidth: '420px',
            zIndex: 50,
          }}
        >
          <Info size={32} className="text-cyan-400 mx-auto mb-3" />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>
            Chưa có kết nối mạng lưới đã xác minh.
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
            Toàn bộ các tuyến điện và cấp nước đang ở trạng thái giả thiết hoặc chờ đối soát thực địa.
          </p>
          {onToggleShowUnverified && (
            <button
              type="button"
              onClick={() => onToggleShowUnverified(true)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#0284C7',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hiển thị giả thuyết chưa xác minh
            </button>
          )}
        </div>
      )}
    </div>
  );
};
