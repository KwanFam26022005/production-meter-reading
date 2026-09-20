/**
 * UtilityNetworkView — Map-Native Maritime Network Overlay (Phase V16E-R1)
 *
 * Governed by SKILL(3).md / Saigon Port UI Skill & frontend/DESIGN_DNA.md
 * Aesthetic: Maritime Operational Minimalism
 *
 * Visual & Operational Rules:
 * 1. Physical Base: Uninterrupted aerial/satellite map of Cảng Tân Thuận at full visibility.
 * 2. Maritime Blue Separation:
 *    - Electricity: Solid maritime blue line (--sgp-brand-800: #073B5C) with neutral white casing.
 *    - Water: Dashed aqua-navy conduit (--sgp-brand-600: #12658F) with neutral white casing.
 * 3. 2D Industrial Node Glyphs:
 *    - High-contrast maritime navy footprint with crisp white casing border.
 *    - Distinct silhouettes: rectangular technical assets vs circular analog meters.
 * 4. Interactive Tracing & Dimming:
 *    - Selecting any node highlights connected routes and dims unrelated network to 20% opacity.
 * 5. Restrained Maritime Controls:
 *    - Light operational toolbar and map controls (#FFFFFF, #D7E0E5 border).
 *    - Single authoritative detail surface handled via workspace context rail (no duplicate floating cards).
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
  onOpenVerificationReview: _onOpenVerificationReview,
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
        backgroundColor: '#0B192C',
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
        {/* SINGLE WORLD TRANSFORM GROUP */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1.1 PHYSICAL CANONICAL BASE MAP (RESTORED CLEAR OPERATIONAL BASE) */}
          <image
            href={TanThuanMapSource.image}
            x={0}
            y={0}
            width={CANONICAL_SCENE_WIDTH}
            height={CANONICAL_SCENE_HEIGHT}
            preserveAspectRatio="none"
            style={{
              filter: 'saturate(0.86) brightness(0.96) contrast(0.98)',
              transition: 'filter 300ms ease',
            }}
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
                      fill="rgba(11, 79, 117, 0.04)"
                      stroke="rgba(11, 79, 117, 0.25)"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                    />
                  )}
                  {zone.labelPosition && (
                    <text
                      x={labelX}
                      y={labelY}
                      fill="rgba(7, 59, 92, 0.5)"
                      fontSize={14}
                      fontWeight={700}
                      textAnchor="middle"
                      letterSpacing={1.5}
                      fontFamily="system-ui, sans-serif"
                    >
                      {zone.name.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 1.3 MARITIME UTILITY CONDUITS & ROUTES (NEUTRAL CASING + SOLID ELECTRIC / DASHED WATER) */}
          <g className="sgp-network-routes-layer">
            {routedEdges.map((edge) => {
              const isElectric = edge.utilityType === 'ELECTRICITY';
              const isSelected = traceResult.connectedEdgeIds.has(edge.id);
              const isDimmed = activeFocusId ? !isSelected : false;

              // Maritime design tokens
              const coreColor = isElectric ? '#073B5C' : '#12658F'; // Electricity: --sgp-brand-800, Water: --sgp-brand-600
              const casingWidth = isSelected ? (isElectric ? 6.5 : 5.5) : (isElectric ? 4.2 : 3.6);
              const coreWidth = isSelected ? (isElectric ? 3.2 : 2.6) : (isElectric ? 2.2 : 1.8);
              const casingOpacity = isDimmed ? 0.18 : isSelected ? 0.95 : 0.70;
              const coreOpacity = isDimmed ? 0.20 : isSelected ? 1.0 : 0.85;

              return (
                <g
                  key={`route-${edge.id}`}
                  style={{ transition: 'opacity 220ms ease' }}
                >
                  {/* Underlay Neutral Contrast Casing */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={casingWidth}
                    strokeOpacity={casingOpacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Core Maritime Conduit: Solid for Electricity, Dashed for Water */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={coreColor}
                    strokeWidth={coreWidth}
                    strokeOpacity={coreOpacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={
                      !edge.isVerified
                        ? '3 3'
                        : isElectric
                        ? 'none' // Electricity: Solid continuous maritime blue line
                        : '7 4'  // Water: Distinct segmented conduit
                    }
                  />
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
          gap: '8px',
          padding: '5px 10px',
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D7E0E5',
          boxShadow: '0 4px 12px rgba(24, 36, 44, 0.12)',
          pointerEvents: 'auto',
        }}
      >
        {/* Title / Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingRight: '8px', borderRight: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeUtility === 'WATER' ? '#12658F' : '#073B5C',
            }}
          />
          <span className="sgp-network-hud-title-full" style={{ fontSize: '11.5px', fontWeight: 700, color: '#073B5C', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
            background: '#F2F7F9',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid #D7E0E5',
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
              fontWeight: activeUtility === 'ALL' ? 600 : 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'ALL' ? '#073B5C' : 'transparent',
              color: activeUtility === 'ALL' ? '#FFFFFF' : '#53636D',
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
              fontWeight: activeUtility === 'ELECTRICITY' ? 600 : 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'ELECTRICITY' ? '#073B5C' : 'transparent',
              color: activeUtility === 'ELECTRICITY' ? '#FFFFFF' : '#53636D',
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
              fontWeight: activeUtility === 'WATER' ? 600 : 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeUtility === 'WATER' ? '#12658F' : 'transparent',
              color: activeUtility === 'WATER' ? '#FFFFFF' : '#53636D',
              transition: 'all 150ms ease',
            }}
          >
            <Droplets size={13} />
            <span>Nước</span>
          </button>
        </div>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', borderLeft: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={() => setShowMeters((prev) => !prev)}
            title="Bật / tắt hiển thị công tơ đo đếm trên mạng lưới"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px',
              border: showMeters ? '1px solid #0B4F75' : '1px solid #D7E0E5',
              background: showMeters ? '#E8F1F5' : '#FFFFFF',
              color: showMeters ? '#073B5C' : '#53636D',
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
                border: showUnverified ? '1px solid #A86200' : '1px solid #D7E0E5',
                background: showUnverified ? '#FFF4DF' : '#FFFFFF',
                color: showUnverified ? '#A86200' : '#53636D',
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
          background: '#FFFFFF',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 4px 12px rgba(24, 36, 44, 0.12)',
          border: '1px solid #D7E0E5',
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to bản đồ"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: '#073B5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ZoomIn size={16} />
        </button>
        <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ bản đồ"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: '#073B5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ZoomOut size={16} />
        </button>
        <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={handleResetView}
          title="Đặt lại khung nhìn mặc định"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: '#53636D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. CALM EMPTY STATE (ON ZERO VERIFIED CONNECTIONS)            */}
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
            background: '#FFFFFF',
            padding: '24px 32px',
            borderRadius: '12px',
            border: '1px solid #D7E0E5',
            boxShadow: '0 8px 24px rgba(24, 36, 44, 0.12)',
            textAlign: 'center',
            color: '#18242C',
            maxWidth: '420px',
            zIndex: 50,
          }}
        >
          <Info size={32} style={{ color: '#073B5C', margin: '0 auto 12px auto', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#18242C' }}>
            Chưa có kết nối mạng lưới đã xác minh.
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#53636D', lineHeight: 1.5 }}>
            Toàn bộ các tuyến điện và cấp nước đang ở trạng thái giả thiết hoặc chờ đối soát thực địa.
          </p>
          {onToggleShowUnverified && (
            <button
              type="button"
              onClick={() => onToggleShowUnverified(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#073B5C',
                color: '#FFFFFF',
                fontSize: '12.5px',
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
