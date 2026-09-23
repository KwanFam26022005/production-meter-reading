import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UtilityLayoutConfig, UtilityType, RouteTier } from './utilityDemoLayout';
import { MapV2ToneMode } from './types';
import { UtilityTopologyGraph, calculatePathLength } from './utilityNetworkGraph';
import {
  NetworkPhase,
  UtilityNetworkState,
  UtilityNetworkController,
  createInitialNetworkState,
} from './utilityNetworkStateMachine';

export type UtilityOverlayMode = 'off' | 'electricity' | 'water' | 'both';

export interface UtilityStatusInfo {
  electricityPhase: NetworkPhase;
  waterPhase: NetworkPhase;
  activeTracedMeter?: string | null;
  activeTracedUtility?: UtilityType | null;
}

interface MapV2UtilityLayerProps {
  layout: UtilityLayoutConfig;
  utilityMode: UtilityOverlayMode;
  toneMode?: MapV2ToneMode;
  zoom?: number;
  selectedMeterCode?: string | null;
  externalTracedMeterCode?: string | null;
  onSelectMeterHost?: (nodeId: string, meterCode: string) => void;
  onStatusChange?: (status: UtilityStatusInfo) => void;
}

export const MapV2UtilityLayer: React.FC<MapV2UtilityLayerProps> = ({
  layout,
  utilityMode,
  toneMode = 'technical',
  zoom: _zoom = 1,
  selectedMeterCode = null,
  externalTracedMeterCode = null,
  onSelectMeterHost,
  onStatusChange,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Check system prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // 1. Topology Graphs (Topology Invariant)
  const elecGraph = useMemo(
    () => new UtilityTopologyGraph(layout.nodes, layout.edges, 'ELECTRICITY'),
    [layout]
  );
  const waterGraph = useMemo(
    () => new UtilityTopologyGraph(layout.nodes, layout.edges, 'WATER'),
    [layout]
  );

  // 2. Separate Network States for Electricity & Water (Independent State Machines)
  const [elecState, setElecState] = useState<UtilityNetworkState>(() =>
    createInitialNetworkState('ELECTRICITY', elecGraph.sourceNodeId)
  );
  const [waterState, setWaterState] = useState<UtilityNetworkState>(() =>
    createInitialNetworkState('WATER', waterGraph.sourceNodeId)
  );

  // Controllers
  const elecControllerRef = useRef<UtilityNetworkController | null>(null);
  const waterControllerRef = useRef<UtilityNetworkController | null>(null);

  // Initialize and attach controllers
  useEffect(() => {
    elecControllerRef.current = new UtilityNetworkController(elecGraph, {
      onUpdate: (s) => setElecState({ ...s }),
      prefersReducedMotion,
    });
    waterControllerRef.current = new UtilityNetworkController(waterGraph, {
      onUpdate: (s) => setWaterState({ ...s }),
      prefersReducedMotion,
    });

    return () => {
      elecControllerRef.current?.cancel();
      waterControllerRef.current?.cancel();
    };
  }, [elecGraph, waterGraph, prefersReducedMotion]);

  // Handle utilityMode switching and clean cancellations
  useEffect(() => {
    if (utilityMode === 'off') {
      elecControllerRef.current?.resetCollapsed();
      waterControllerRef.current?.resetCollapsed();
    } else if (utilityMode === 'electricity') {
      waterControllerRef.current?.resetCollapsed();
    } else if (utilityMode === 'water') {
      elecControllerRef.current?.resetCollapsed();
    }
  }, [utilityMode]);

  // Propagate status change to parent
  useEffect(() => {
    if (!onStatusChange) return;
    const activeTracedMeter = elecState.tracedMeterCode || waterState.tracedMeterCode || null;
    const activeTracedUtility =
      elecState.phase === 'tracing'
        ? 'ELECTRICITY'
        : waterState.phase === 'tracing'
        ? 'WATER'
        : null;

    onStatusChange({
      electricityPhase: elecState.phase,
      waterPhase: waterState.phase,
      activeTracedMeter,
      activeTracedUtility,
    });
  }, [elecState, waterState, onStatusChange]);

  // Synchronize external meter trace (from Inspector or Meter Layer)
  useEffect(() => {
    if (!externalTracedMeterCode) return;
    const isElec = externalTracedMeterCode.startsWith('SIM-EM-');
    if (isElec) {
      const c = elecControllerRef.current;
      if (!c) return;
      if (elecState.phase === 'collapsed') {
        c.expand();
      }
      c.traceMeter(externalTracedMeterCode);
    } else {
      const c = waterControllerRef.current;
      if (!c) return;
      if (waterState.phase === 'collapsed') {
        c.expand();
      }
      c.traceMeter(externalTracedMeterCode);
    }
  }, [externalTracedMeterCode]);

  if (utilityMode === 'off') {
    return null;
  }

  const isNeon = toneMode === 'neon';
  const isBoth = utilityMode === 'both';
  const showElectricity = utilityMode === 'electricity' || isBoth;
  const showWater = utilityMode === 'water' || isBoth;

  // Convert ordered coordinates to SVG Path string
  const pathToD = (pts: [number, number][]): string => {
    if (pts.length === 0) return '';
    const [start, ...rest] = pts;
    return `M ${start[0]} ${start[1]} ` + rest.map((p) => `L ${p[0]} ${p[1]}`).join(' ');
  };

  // Visual style tokens (Saigon Port Technical / Neon)
  const styleConfig = {
    electricity: {
      trunkColor: isNeon ? '#FFB703' : '#D97706',
      branchColor: isNeon ? '#FFC72C' : '#F59E0B',
      spurColor: isNeon ? '#FFE082' : '#FBBF24',
      glowColor: '#FFB703',
      badgeBg: isNeon ? '#1A1402' : '#FFFFFF',
      badgeBorder: isNeon ? '#FFB703' : '#D97706',
      iconColor: isNeon ? '#FFB703' : '#B45309',
      textColor: isNeon ? '#FFD166' : '#92400E',
    },
    water: {
      trunkColor: isNeon ? '#00F0FF' : '#0284C7',
      branchColor: isNeon ? '#38BDF8' : '#0EA5E9',
      spurColor: isNeon ? '#7DD3FC' : '#38BDF8',
      glowColor: '#00F0FF',
      badgeBg: isNeon ? '#021826' : '#FFFFFF',
      badgeBorder: isNeon ? '#00F0FF' : '#0284C7',
      iconColor: isNeon ? '#00F0FF' : '#0369A1',
      textColor: isNeon ? '#BAE6FD' : '#075985',
    },
  };

  // ---------------------------------------------------------------------------
  // INTERACTION HANDLERS
  // ---------------------------------------------------------------------------
  const handleSourceClick = (utilityType: UtilityType) => {
    if (utilityType === 'ELECTRICITY') {
      const c = elecControllerRef.current;
      if (!c) return;
      if (elecState.phase === 'collapsed') {
        c.expand();
      } else if (elecState.phase === 'expanded') {
        c.retract();
      } else if (elecState.phase === 'tracing') {
        c.clearTrace();
        c.retract();
      }
    } else {
      const c = waterControllerRef.current;
      if (!c) return;
      if (waterState.phase === 'collapsed') {
        c.expand();
      } else if (waterState.phase === 'expanded') {
        c.retract();
      } else if (waterState.phase === 'tracing') {
        c.clearTrace();
        c.retract();
      }
    }
  };

  const handleMeterClick = (nodeId: string, utilityType: UtilityType, meterCode?: string) => {
    if (meterCode && onSelectMeterHost) {
      onSelectMeterHost(nodeId, meterCode);
    }
    if (utilityType === 'ELECTRICITY') {
      const c = elecControllerRef.current;
      if (!c) return;
      if (elecState.phase === 'expanded' || elecState.phase === 'tracing') {
        if (elecState.tracedNodeId === nodeId) {
          // Toggle off trace
          c.clearTrace();
        } else {
          // Trace this meter
          c.traceMeter(nodeId);
        }
      }
    } else {
      const c = waterControllerRef.current;
      if (!c) return;
      if (waterState.phase === 'expanded' || waterState.phase === 'tracing') {
        if (waterState.tracedNodeId === nodeId) {
          c.clearTrace();
        } else {
          c.traceMeter(nodeId);
        }
      }
    }
  };

  // Find active tooltip node
  const activeHoveredOrFocusedId = hoveredNodeId || focusedNodeId;
  const activeTooltipNode = activeHoveredOrFocusedId
    ? layout.nodes.find((n) => n.id === activeHoveredOrFocusedId)
    : null;

  // Filter edges by utility and visibility
  const waterEdges = showWater
    ? layout.edges.filter((e) => e.utilityType === 'WATER' && waterState.visibleEdgeIds.has(e.id))
    : [];
  const elecEdges = showElectricity
    ? layout.edges.filter((e) => e.utilityType === 'ELECTRICITY' && elecState.visibleEdgeIds.has(e.id))
    : [];

  // Filter nodes by utility and visibility
  const waterNodes = showWater
    ? layout.nodes.filter((n) => n.utilityType === 'WATER' && (n.isSource || waterState.visibleNodeIds.has(n.id)))
    : [];
  const elecNodes = showElectricity
    ? layout.nodes.filter((n) => n.utilityType === 'ELECTRICITY' && (n.isSource || elecState.visibleNodeIds.has(n.id)))
    : [];

  return (
    <g id="layer-utility-demo" className={`map-v2-utility-layer ${isNeon ? 'tone-neon' : ''}`}>
      {/* ------------------------------------------------------------- */}
      {/* SVG Filters for Neon Glow Effect & Traced Glow                */}
      {/* ------------------------------------------------------------- */}
      {isNeon && (
        <defs>
          <filter id="utility-glow-elec" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="utility-glow-water" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. EDGES / ROUTES (Z-Order: Water first, then Electricity on top) */}
      {/* ------------------------------------------------------------- */}
      <g id="utility-edges" className="utility-routes-group">
        {/* A. WATER EDGES */}
        {waterEdges.map((edge) => {
          const cfg = styleConfig.water;
          const tier: RouteTier =
            edge.routeTier || (edge.branchDepth <= 2 ? 'TRUNK' : 'BRANCH');

          let strokeWidth = 2.7;
          let casingWidth = 4.8;
          let coreColor = cfg.branchColor;
          let lineOpacity = 0.95;

          if (tier === 'TRUNK') {
            strokeWidth = 4.0;
            casingWidth = 6.8;
            coreColor = cfg.trunkColor;
            lineOpacity = 1.0;
          } else if (tier === 'SPUR') {
            strokeWidth = 1.8;
            casingWidth = 3.4;
            coreColor = cfg.spurColor;
            lineOpacity = 0.88;
          }

          // Tracing logic
          const isTraced = waterState.phase === 'tracing' && waterState.tracedEdgeIds.has(edge.id);
          const isDimmed = waterState.phase === 'tracing' && !waterState.tracedEdgeIds.has(edge.id);

          if (isTraced) {
            strokeWidth = strokeWidth * 1.25;
            casingWidth = casingWidth + 1.8;
            lineOpacity = 1.0;
          } else if (isDimmed) {
            lineOpacity = 0.22;
          }

          const d = pathToD(edge.displayPath);
          const length = calculatePathLength(edge.displayPath);
          const progress = waterState.edgeProgress[edge.id] ?? 1;
          const isDrawing = progress < 1;
          const offset = length * (1 - progress);

          // Dasharray styling: water branches are dashed when fully drawn
          const normalDash = tier === 'BRANCH' ? '7, 4' : 'none';
          const currentDash = isDrawing ? `${length} ${length}` : normalDash;
          const currentOffset = isDrawing ? offset : 0;

          return (
            <g
              key={edge.id}
              id={`route-${edge.id}`}
              className={`utility-edge water tier-${tier.toLowerCase()} ${isTraced ? 'is-traced' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              style={{ transition: 'opacity 0.2s ease-out' }}
            >
              <path
                d={d}
                fill="none"
                stroke={isNeon ? '#050f24' : '#FFFFFF'}
                strokeWidth={casingWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={currentDash}
                strokeDashoffset={currentOffset}
                opacity={lineOpacity * (isNeon ? 0.8 : 0.85)}
              />
              <path
                d={d}
                fill="none"
                stroke={coreColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={currentDash}
                strokeDashoffset={currentOffset}
                opacity={lineOpacity}
                filter={isNeon && isTraced ? 'url(#utility-glow-water)' : undefined}
              />
            </g>
          );
        })}

        {/* B. ELECTRICITY EDGES (Overlays Water at the single crossing (740, 520)) */}
        {elecEdges.map((edge) => {
          const cfg = styleConfig.electricity;
          const tier: RouteTier =
            edge.routeTier || (edge.branchDepth <= 3 ? 'TRUNK' : edge.branchDepth === 4 ? 'BRANCH' : 'SPUR');

          let strokeWidth = 2.7;
          let casingWidth = 4.8;
          let coreColor = cfg.branchColor;
          let lineOpacity = 0.95;

          if (tier === 'TRUNK') {
            strokeWidth = 4.0;
            casingWidth = 6.8;
            coreColor = cfg.trunkColor;
            lineOpacity = 1.0;
          } else if (tier === 'SPUR') {
            strokeWidth = 1.8;
            casingWidth = 3.4;
            coreColor = cfg.spurColor;
            lineOpacity = 0.88;
          }

          // Tracing logic
          const isTraced = elecState.phase === 'tracing' && elecState.tracedEdgeIds.has(edge.id);
          const isDimmed = elecState.phase === 'tracing' && !elecState.tracedEdgeIds.has(edge.id);

          if (isTraced) {
            strokeWidth = strokeWidth * 1.25;
            casingWidth = casingWidth + 1.8;
            lineOpacity = 1.0;
          } else if (isDimmed) {
            lineOpacity = 0.22;
          }

          const d = pathToD(edge.displayPath);
          const length = calculatePathLength(edge.displayPath);
          const progress = elecState.edgeProgress[edge.id] ?? 1;
          const isDrawing = progress < 1;
          const offset = length * (1 - progress);

          const currentDash = isDrawing ? `${length} ${length}` : 'none';
          const currentOffset = isDrawing ? offset : 0;

          return (
            <g
              key={edge.id}
              id={`route-${edge.id}`}
              className={`utility-edge elec tier-${tier.toLowerCase()} ${isTraced ? 'is-traced' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              style={{ transition: 'opacity 0.2s ease-out' }}
            >
              <path
                d={d}
                fill="none"
                stroke={isNeon ? '#050f24' : '#FFFFFF'}
                strokeWidth={casingWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={currentDash}
                strokeDashoffset={currentOffset}
                opacity={lineOpacity * (isNeon ? 0.8 : 0.85)}
              />
              <path
                d={d}
                fill="none"
                stroke={coreColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={currentDash}
                strokeDashoffset={currentOffset}
                opacity={lineOpacity}
                filter={isNeon ? 'url(#utility-glow-elec)' : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 2. NODES / HUBS (Z-Order: Water Nodes then Electricity Nodes)  */}
      {/* ------------------------------------------------------------- */}
      <g id="utility-nodes" className="utility-nodes-group">
        {[...waterNodes, ...elecNodes].map((node) => {
          const isElec = node.utilityType === 'ELECTRICITY';
          const cfg = isElec ? styleConfig.electricity : styleConfig.water;
          const state = isElec ? elecState : waterState;

          const isNodeActive = hoveredNodeId === node.id || focusedNodeId === node.id;
          const isTracedNode = state.phase === 'tracing' && state.tracedNodeIds.has(node.id);
          const isTargetMeter = state.phase === 'tracing' && (state.tracedNodeId === node.id || state.tracedMeterCode === node.meterCode);
          const isSelectedMeterHost = Boolean(
            selectedMeterCode && node.meterCode && node.meterCode === selectedMeterCode
          );
          const isDimmed = state.phase === 'tracing' && !isTracedNode && !isSelectedMeterHost;

          const nodeOpacity = isDimmed ? 0.35 : 1.0;

          // Label density policy (Section 12):
          // In BOTH mode, hide meter-code labels by default; reveal on hover, focus, target meter, or selected host!
          const showMeterLabel = !isBoth || isNodeActive || isTargetMeter || isSelectedMeterHost;

          const x = node.displayX;
          const y = node.displayY;

          // Source specific collapsed hint
          const isSourceCollapsed = node.isSource && state.phase === 'collapsed';
          const isSourceExpanded = node.isSource && (state.phase === 'expanded' || state.phase === 'tracing');

          return (
            <g
              key={node.id}
              id={`node-${node.id}`}
              transform={`translate(${x}, ${y})`}
              className={`utility-node ${node.nodeRole.toLowerCase()} ${isNodeActive ? 'active hovered' : ''} ${isTargetMeter ? 'target-meter' : ''} ${isSelectedMeterHost ? 'selected-meter-host' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              style={{
                cursor: 'pointer',
                outline: 'none',
                opacity: nodeOpacity,
                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onFocus={() => setFocusedNodeId(node.id)}
              onBlur={() => setFocusedNodeId(null)}
              tabIndex={0}
              role="button"
              aria-label={
                node.isSource
                  ? isSourceCollapsed
                    ? `Nguồn ${node.label} (${node.id}) — Nhấp để mở mạng lưới ${isElec ? 'điện' : 'cấp nước'} mô phỏng`
                    : `Nguồn ${node.label} (${node.id}) — Nhấp để thu hồi mạng lưới ${isElec ? 'điện' : 'cấp nước'}`
                  : node.isMeter
                  ? isTargetMeter
                    ? `Đồng hồ ${node.meterCode} — Đang truy vết (Nhấp để xóa truy vết)`
                    : `Đồng hồ ${node.meterCode || node.id} (${node.label}) — Nhấp để truy vết tuyến nguồn`
                  : `${node.label} (${node.id})`
              }
              aria-expanded={node.isSource ? isSourceExpanded : undefined}
              onClick={() => {
                if (node.isSource) {
                  handleSourceClick(node.utilityType);
                } else if (node.isMeter) {
                  handleMeterClick(node.id, node.utilityType, node.meterCode);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (node.isSource) {
                    handleSourceClick(node.utilityType);
                  } else if (node.isMeter) {
                    handleMeterClick(node.id, node.utilityType, node.meterCode);
                  }
                }
              }}
            >
              {/* Explicit interaction hit-target — the ONLY element that should intercept pointer events.
                  All decorative children below use pointerEvents="none" so clicks always land here
                  and bubble to the parent <g> onClick handler. r=24 ensures >= 44px touch target. */}
              <circle r={24} fill="transparent" pointerEvents="all" />

              {/* A. SOURCE NODE (Diamond Symbol) — decorative, no pointer interception */}
              {node.isSource && (
                <g pointerEvents="none">
                  {/* Outer subtle glow indicator when collapsed */}
                  {isSourceCollapsed && (
                    <polygon
                      points="0,-24 24,0 0,24 -24,0"
                      fill="none"
                      stroke={cfg.badgeBorder}
                      strokeWidth={1.5}
                      strokeDasharray="4, 3"
                      opacity={0.8}
                    />
                  )}

                  {/* Outer diamond ring */}
                  <polygon
                    points="0,-18 18,0 0,18 -18,0"
                    fill={cfg.badgeBg}
                    stroke={cfg.badgeBorder}
                    strokeWidth={isNodeActive ? 3.6 : 2.8}
                    filter={isNeon ? (isElec ? 'url(#utility-glow-elec)' : 'url(#utility-glow-water)') : undefined}
                  />
                  {/* Center core */}
                  <polygon
                    points="0,-8 8,0 0,8 -8,0"
                    fill={cfg.trunkColor}
                  />

                  {/* Source Label Tag */}
                  <g transform="translate(0, 26)">
                    <rect
                      x={-44}
                      y={-10}
                      width={88}
                      height={20}
                      rx={4}
                      fill={isNeon ? '#06132b' : '#FFFFFF'}
                      stroke={cfg.badgeBorder}
                      strokeWidth={1.2}
                    />
                    <text
                      y={1}
                      fill={cfg.textColor}
                      fontSize={9.5}
                      fontWeight={700}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {node.id}
                    </text>
                  </g>

                  {/* Collapsed affordance sub-tag */}
                  {isSourceCollapsed && (
                    <g transform="translate(0, 48)">
                      <rect
                        x={-38}
                        y={-8}
                        width={76}
                        height={16}
                        rx={3}
                        fill={isNeon ? 'rgba(255, 183, 3, 0.15)' : '#FEF3C7'}
                        stroke={cfg.badgeBorder}
                        strokeWidth={0.8}
                      />
                      <text
                        y={1}
                        fill={isNeon ? '#FFD166' : '#92400E'}
                        fontSize={8}
                        fontWeight={700}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        ▶ MỞ MẠNG
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* B. PURE INFRASTRUCTURE DISTRIBUTION NODE (No Meter, e.g. SS-01, TR-01, WJ-01) — decorative */}
              {node.isDistributionNode && !node.isMeter && (
                <g pointerEvents="none">
                  <rect
                    x={-10}
                    y={-10}
                    width={20}
                    height={20}
                    rx={3.5}
                    fill={cfg.badgeBg}
                    stroke={cfg.badgeBorder}
                    strokeWidth={2}
                  />
                  <circle r={3.5} fill={cfg.trunkColor} />
                  {/* Asset Tag underneath */}
                  <text
                    y={19}
                    fill={cfg.textColor}
                    fontSize={8.5}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {node.id.replace('SIM-', '')}
                  </text>
                </g>
              )}

              {/* C. UNIFIED HOST ASSET + NESTED METER EMBLEM (MDB-01, WIN-01, FDR-*) — decorative */}
              {node.isDistributionNode && node.isMeter && (
                <g pointerEvents="none">
                  {/* Target meter halo when traced or selected */}
                  {(isTargetMeter || isSelectedMeterHost) && (
                    <circle
                      r={isSelectedMeterHost ? 21 : 19}
                      fill="none"
                      stroke={isSelectedMeterHost ? (isNeon ? '#00f0ff' : '#0068FF') : cfg.badgeBorder}
                      strokeWidth={isSelectedMeterHost ? 3.0 : 2.4}
                      strokeDasharray={isTargetMeter ? '4, 3' : undefined}
                    />
                  )}

                  {/* 1. Host Distribution Cabinet Rect (22x22px) */}
                  <rect
                    x={-11}
                    y={-11}
                    width={22}
                    height={22}
                    rx={4}
                    fill={cfg.badgeBg}
                    stroke={cfg.badgeBorder}
                    strokeWidth={isTargetMeter ? 2.8 : 2.2}
                    filter={isNeon ? (isElec ? 'url(#utility-glow-elec)' : 'url(#utility-glow-water)') : undefined}
                  />
                  {/* 2. Concentric Nested Meter Pip (R=7.5px) */}
                  <circle
                    r={7.5}
                    fill={cfg.trunkColor}
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                  {/* Inner utility glyph / core dot */}
                  <circle r={2.2} fill="#FFFFFF" />

                  {/* 3. Host Asset Label (Always readable underneath) */}
                  <text
                    y={19}
                    fill={cfg.textColor}
                    fontSize={8.5}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {node.id.replace('SIM-', '')}
                  </text>

                  {/* 4. Meter Code Tag (Contextual Disclosure: shown on hover or when single mode or when traced) */}
                  {node.meterCode && showMeterLabel && (
                    <g transform="translate(0, -19)">
                      <rect
                        x={-34}
                        y={-8}
                        width={68}
                        height={16}
                        rx={3}
                        fill={isNeon ? '#06132b' : '#FFFFFF'}
                        stroke={isTargetMeter ? cfg.badgeBorder : '#94a3b8'}
                        strokeWidth={isTargetMeter ? 1.6 : 1}
                      />
                      <text
                        y={1}
                        fill={isTargetMeter ? (isNeon ? '#FFD166' : '#B45309') : cfg.textColor}
                        fontSize={8.5}
                        fontWeight={700}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {node.meterCode}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* D. STANDALONE METER POINT (Terminal Meter, e.g. YDB-*, WP-*) — decorative */}
              {!node.isSource && !node.isDistributionNode && node.isMeter && (
                <g pointerEvents="none">
                  {/* Target meter halo when traced or selected */}
                  {(isTargetMeter || isSelectedMeterHost) && (
                    <circle
                      r={isSelectedMeterHost ? 20 : 18}
                      fill="none"
                      stroke={isSelectedMeterHost ? (isNeon ? '#00f0ff' : '#0068FF') : cfg.badgeBorder}
                      strokeWidth={isSelectedMeterHost ? 3.0 : 2.4}
                      strokeDasharray={isTargetMeter ? '4, 3' : undefined}
                    />
                  )}

                  {/* Meter Circle Core */}
                  <circle
                    r={10.5}
                    fill={cfg.badgeBg}
                    stroke={cfg.badgeBorder}
                    strokeWidth={isTargetMeter ? 2.8 : 2.2}
                    filter={isNeon ? (isElec ? 'url(#utility-glow-elec)' : 'url(#utility-glow-water)') : undefined}
                  />
                  <circle r={6} fill={cfg.trunkColor} />
                  <circle r={1.8} fill="#FFFFFF" />

                  {/* Meter Code Tag */}
                  {node.meterCode && showMeterLabel && (
                    <g transform="translate(0, 18)">
                      <rect
                        x={-34}
                        y={-8}
                        width={68}
                        height={16}
                        rx={3}
                        fill={isNeon ? '#06132b' : '#FFFFFF'}
                        stroke={isTargetMeter ? cfg.badgeBorder : '#94a3b8'}
                        strokeWidth={isTargetMeter ? 1.6 : 1}
                      />
                      <text
                        y={1}
                        fill={isTargetMeter ? (isNeon ? '#FFD166' : '#B45309') : cfg.textColor}
                        fontSize={8.5}
                        fontWeight={700}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {node.meterCode}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 3. INTERACTIVE CONTEXTUAL HOVER TOOLTIP                        */}
      {/* ------------------------------------------------------------- */}
      {activeTooltipNode && (
        <g
          id="utility-tooltip"
          transform={`translate(${activeTooltipNode.displayX}, ${activeTooltipNode.displayY - 32})`}
          style={{ pointerEvents: 'none' }}
        >
          <rect
            x={-100}
            y={-22}
            width={200}
            height={26}
            rx={5}
            fill={isNeon ? '#06132b' : '#002B5B'}
            stroke={isNeon ? '#00f0ff' : '#CBD3DA'}
            strokeWidth={1.2}
            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.18))"
          />
          <text
            y={-8}
            fill="#FFFFFF"
            fontSize={9.5}
            fontWeight={700}
            textAnchor="middle"
          >
            {activeTooltipNode.meterCode
              ? `${activeTooltipNode.meterCode} • ${activeTooltipNode.label}`
              : activeTooltipNode.label}
          </text>
          <text
            y={1}
            fill={isNeon ? '#FFD166' : '#FCC959'}
            fontSize={7.5}
            fontWeight={600}
            textAnchor="middle"
          >
            {activeTooltipNode.isSource
              ? 'Nguồn tiếp nhận [Nhấp để mở / thu hồi mạng]'
              : activeTooltipNode.isMeter
              ? '[MÔ PHỎNG] Nhấp để truy vết luồng cấp'
              : `[MÔ PHỎNG] ${activeTooltipNode.id}`}
          </text>
        </g>
      )}
    </g>
  );
};
