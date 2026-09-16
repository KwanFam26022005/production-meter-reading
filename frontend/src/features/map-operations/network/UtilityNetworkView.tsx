/**
 * UtilityNetworkView — Production Schematic Utility Topology UX/UI (Phase V16E)
 *
 * Implements the V16E Network & Topology Contract:
 * 1. Primary question: "Thiết bị được kết nối / cấp nguồn như thế nào?"
 * 2. Visual design: Maritime Operational Minimalism (off-white #F6F8F9 canvas, navy #073B5C / #0B4F75,
 *    cyan-blue #12658F for water, neutral amber dashed for unverified, zero moving particles or neon).
 * 3. Verified-only by default: Calms users with truthful empty state if 0 verified connections exist.
 * 4. Admin preview toggle: "Hiển thị giả thuyết chưa xác minh" renders unverified connections with amber dashed styling.
 * 5. Interactive tracing: "Nguồn cấp" (upstream) and "Cấp đến" (downstream) with 200ms calm dimming of unrelated nodes.
 * 6. Synchronized selection: Clicking any node selects asset across Map, Context Surface, and Network.
 * 7. Zero-dependency layered DAG layout: Fast, deterministic, cycle-safe single-line schematic.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from 'lucide-react';
import type { Asset, AssetConnection, UtilityType } from '../../assets/types';

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
}

type TraceMode = 'ALL' | 'UPSTREAM' | 'DOWNSTREAM';

interface LayoutNode {
  asset: Asset;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  isVerified: boolean;
}

interface LayoutEdge {
  connection: AssetConnection;
  pathD: string;
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  isVerified: boolean;
  isElectricity: boolean;
  isWater: boolean;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 68;
const HORIZONTAL_GAP = 48;
const VERTICAL_GAP = 96;
const PADDING = 64;

export const UtilityNetworkView: React.FC<UtilityNetworkViewProps> = ({
  nodes,
  edges,
  selectedAssetId,
  onSelectAsset,
  selectedUtility = 'ALL',
  onSelectUtility,
  showUnverified = false,
  onToggleShowUnverified,
  isLoading = false,
  onRefresh,
  canManageVerification = false,
  onOpenVerificationReview,
  onSwitchToMap,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Local Controls
  const [traceMode, setTraceMode] = useState<TraceMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 1. Filtered Nodes and Edges based on Utility and Verification Policy
  const { filteredNodes, filteredEdges, verifiedEdgeCount } = useMemo(() => {
    // Edge filtering
    let activeEdges = edges.filter((e) => {
      // Verification policy
      if (!showUnverified && e.verification_status !== 'VERIFIED') {
        return false;
      }
      // Utility filtering
      if (selectedUtility !== 'ALL' && e.utility_type !== selectedUtility) {
        return false;
      }
      return true;
    });

    const verifiedCount = edges.filter((e) => e.verification_status === 'VERIFIED').length;

    // Node filtering
    let activeNodes = nodes.filter((n) => {
      if (n.lifecycle_status === 'RETIRED' || n.verification_status === 'REJECTED') {
        return false;
      }
      if (!showUnverified && n.verification_status !== 'VERIFIED') {
        return false;
      }
      return true;
    });

    // If edges exist, ensure connected nodes are prioritized
    const connectedNodeIds = new Set<string>();
    activeEdges.forEach((e) => {
      connectedNodeIds.add(e.source_asset_id);
      connectedNodeIds.add(e.target_asset_id);
    });

    // If search query is entered
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      activeNodes = activeNodes.filter(
        (n) => n.code.toLowerCase().includes(q) || n.name.toLowerCase().includes(q)
      );
    }

    return {
      filteredNodes: activeNodes,
      filteredEdges: activeEdges,
      verifiedEdgeCount: verifiedCount,
    };
  }, [nodes, edges, selectedUtility, showUnverified, searchQuery]);

  // 2. Trace Path Calculation (Upstream / Downstream from Selected Asset)
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    if (!selectedAssetId || traceMode === 'ALL') {
      return { highlightedNodeIds: null, highlightedEdgeIds: null };
    }

    const nodeIds = new Set<string>([selectedAssetId]);
    const edgeIds = new Set<string>();

    if (traceMode === 'UPSTREAM' || traceMode === 'ALL') {
      // Traverse backwards (target -> source)
      const queue = [selectedAssetId];
      const visited = new Set<string>([selectedAssetId]);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        filteredEdges.forEach((e) => {
          if (e.target_asset_id === curr && !visited.has(e.source_asset_id)) {
            visited.add(e.source_asset_id);
            nodeIds.add(e.source_asset_id);
            edgeIds.add(e.id);
            queue.push(e.source_asset_id);
          } else if (e.target_asset_id === curr && visited.has(e.source_asset_id)) {
            edgeIds.add(e.id);
          }
        });
      }
    }

    if (traceMode === 'DOWNSTREAM' || traceMode === 'ALL') {
      // Traverse forwards (source -> target)
      const queue = [selectedAssetId];
      const visited = new Set<string>([selectedAssetId]);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        filteredEdges.forEach((e) => {
          if (e.source_asset_id === curr && !visited.has(e.target_asset_id)) {
            visited.add(e.target_asset_id);
            nodeIds.add(e.target_asset_id);
            edgeIds.add(e.id);
            queue.push(e.target_asset_id);
          } else if (e.source_asset_id === curr && visited.has(e.target_asset_id)) {
            edgeIds.add(e.id);
          }
        });
      }
    }

    return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [selectedAssetId, traceMode, filteredEdges]);

  // 3. Layered DAG Layout Computation
  const { layoutNodes, layoutEdges, contentWidth, contentHeight } = useMemo(() => {
    if (filteredNodes.length === 0) {
      return { layoutNodes: [], layoutEdges: [], contentWidth: 800, contentHeight: 600 };
    }

    const nodeMap = new Map<string, Asset>();
    filteredNodes.forEach((n) => nodeMap.set(n.id, n));

    // Calculate In-Degrees & Out-Degrees
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    filteredNodes.forEach((n) => {
      inDegree.set(n.id, 0);
      outgoing.set(n.id, []);
    });

    filteredEdges.forEach((e) => {
      if (nodeMap.has(e.source_asset_id) && nodeMap.has(e.target_asset_id)) {
        inDegree.set(e.target_asset_id, (inDegree.get(e.target_asset_id) || 0) + 1);
        outgoing.get(e.source_asset_id)?.push(e.target_asset_id);
      }
    });

    // Layer assignment: Topological ranking (longest path from source)
    const layerMap = new Map<string, number>();
    const queue: string[] = [];

    // Root nodes (inDegree === 0) start at layer 0
    filteredNodes.forEach((n) => {
      if ((inDegree.get(n.id) || 0) === 0) {
        layerMap.set(n.id, 0);
        queue.push(n.id);
      }
    });

    // BFS forward propagation with cycle detection limit
    const visitedCount = new Map<string, number>();
    while (queue.length > 0) {
      const u = queue.shift()!;
      const uLayer = layerMap.get(u) || 0;
      const neighbors = outgoing.get(u) || [];

      for (const v of neighbors) {
        const vLayer = layerMap.get(v) ?? -1;
        if (uLayer + 1 > vLayer) {
          layerMap.set(v, uLayer + 1);
        }
        const count = (visitedCount.get(v) || 0) + 1;
        visitedCount.set(v, count);
        if (count < 10) {
          queue.push(v);
        }
      }
    }

    // Default layer 0 for any unranked nodes
    filteredNodes.forEach((n) => {
      if (!layerMap.has(n.id)) {
        layerMap.set(n.id, 0);
      }
    });

    // Group nodes by layer
    const layers: Asset[][] = [];
    filteredNodes.forEach((n) => {
      const l = layerMap.get(n.id) || 0;
      while (layers.length <= l) layers.push([]);
      layers[l].push(n);
    });

    // Sort nodes within each layer deterministically (by asset_type then code)
    layers.forEach((layer) => {
      layer.sort((a, b) => {
        if (a.asset_type !== b.asset_type) return a.asset_type.localeCompare(b.asset_type);
        return a.code.localeCompare(b.code);
      });
    });

    // Compute coordinate positions
    const layoutNodeMap = new Map<string, LayoutNode>();
    let maxLayerWidth = 0;

    layers.forEach((layerNodes, layerIndex) => {
      const layerTotalWidth = layerNodes.length * NODE_WIDTH + Math.max(0, layerNodes.length - 1) * HORIZONTAL_GAP;
      if (layerTotalWidth > maxLayerWidth) maxLayerWidth = layerTotalWidth;
    });

    const canvasWidth = Math.max(900, maxLayerWidth + PADDING * 2);

    layers.forEach((layerNodes, layerIndex) => {
      const layerTotalWidth = layerNodes.length * NODE_WIDTH + Math.max(0, layerNodes.length - 1) * HORIZONTAL_GAP;
      const startX = (canvasWidth - layerTotalWidth) / 2;
      const y = PADDING + layerIndex * (NODE_HEIGHT + VERTICAL_GAP);

      layerNodes.forEach((asset, nodeIndex) => {
        const x = startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP);
        const lNode: LayoutNode = {
          asset,
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          layer: layerIndex,
          isVerified: asset.verification_status === 'VERIFIED',
        };
        layoutNodeMap.set(asset.id, lNode);
      });
    });

    const totalHeight = PADDING * 2 + layers.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;

    // Compute edge layout paths (smooth orthogonal cubic beziers)
    const edgesList: LayoutEdge[] = [];
    filteredEdges.forEach((conn) => {
      const src = layoutNodeMap.get(conn.source_asset_id);
      const tgt = layoutNodeMap.get(conn.target_asset_id);
      if (!src || !tgt) return;

      const sx = src.x + src.width / 2;
      const sy = src.y + src.height;
      const tx = tgt.x + tgt.width / 2;
      const ty = tgt.y;

      // Vertical bezier curve
      const deltaY = Math.abs(ty - sy);
      const cpOffsetY = Math.max(24, deltaY * 0.45);
      const pathD = `M ${sx} ${sy} C ${sx} ${sy + cpOffsetY}, ${tx} ${ty - cpOffsetY}, ${tx} ${ty}`;

      edgesList.push({
        connection: conn,
        pathD,
        sourceNode: src,
        targetNode: tgt,
        isVerified: conn.verification_status === 'VERIFIED',
        isElectricity: conn.utility_type === 'ELECTRICITY',
        isWater: conn.utility_type === 'WATER',
      });
    });

    return {
      layoutNodes: Array.from(layoutNodeMap.values()),
      layoutEdges: edgesList,
      contentWidth: canvasWidth,
      contentHeight: Math.max(600, totalHeight),
    };
  }, [filteredNodes, filteredEdges]);

  // Handle Pan & Zoom
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setTraceMode('ALL');
  }, []);

  // Zoom to fit or center selected node if any
  useEffect(() => {
    if (selectedAssetId && containerRef.current) {
      const selNode = layoutNodes.find((n) => n.asset.id === selectedAssetId);
      if (selNode) {
        const rect = containerRef.current.getBoundingClientRect();
        const targetX = rect.width / 2 - (selNode.x + selNode.width / 2) * zoom;
        const targetY = rect.height / 2 - (selNode.y + selNode.height / 2) * zoom;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [selectedAssetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empty State Check: No verified edges exist and preview is off
  const showEmptyState = layoutEdges.length === 0;

  return (
    <div
      ref={containerRef}
      className="sgp-utility-network-root"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#F6F8F9',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ============================================================ */}
      {/* 1. TOP OPERATIONAL CONTROLS TOOLBAR                          */}
      {/* ============================================================ */}
      <div
        className="sgp-network-toolbar"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Utility Type Selector & Trace Mode */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: '4px 8px',
            border: '1px solid #D7E0E5',
            boxShadow: '0 1px 3px rgba(7, 59, 92, 0.05)',
          }}
        >
          {/* Utility Selector */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: 6,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => onSelectUtility && onSelectUtility('ALL')}
              style={{
                border: 'none',
                backgroundColor: selectedUtility === 'ALL' ? '#073B5C' : 'transparent',
                color: selectedUtility === 'ALL' ? '#FFFFFF' : '#475569',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 150ms ease',
              }}
            >
              <Layers size={13} />
              <span>Tất cả</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectUtility && onSelectUtility('ELECTRICITY')}
              style={{
                border: 'none',
                backgroundColor: selectedUtility === 'ELECTRICITY' ? '#073B5C' : 'transparent',
                color: selectedUtility === 'ELECTRICITY' ? '#FFFFFF' : '#475569',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 150ms ease',
              }}
            >
              <Zap size={13} />
              <span>Điện lực</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectUtility && onSelectUtility('WATER')}
              style={{
                border: 'none',
                backgroundColor: selectedUtility === 'WATER' ? '#12658F' : 'transparent',
                color: selectedUtility === 'WATER' ? '#FFFFFF' : '#475569',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 150ms ease',
              }}
            >
              <Droplets size={13} />
              <span>Cấp nước</span>
            </button>
          </div>

          <div style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />

          {/* Trace Controls (active when an asset is selected) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>Dòng chảy:</span>
            <button
              type="button"
              disabled={!selectedAssetId}
              onClick={() => setTraceMode('ALL')}
              style={{
                border: 'none',
                backgroundColor: traceMode === 'ALL' ? '#E2E8F0' : 'transparent',
                color: selectedAssetId ? '#0F172A' : '#94A3B8',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                cursor: selectedAssetId ? 'pointer' : 'not-allowed',
              }}
              title="Xem toàn bộ mạng lưới"
            >
              Toàn mạng
            </button>
            <button
              type="button"
              disabled={!selectedAssetId}
              onClick={() => setTraceMode('UPSTREAM')}
              style={{
                border: 'none',
                backgroundColor: traceMode === 'UPSTREAM' ? '#073B5C' : 'transparent',
                color: traceMode === 'UPSTREAM' ? '#FFFFFF' : selectedAssetId ? '#0F172A' : '#94A3B8',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                cursor: selectedAssetId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
              title="Truy vết nguồn cấp ngược dòng (Upstream)"
            >
              <ArrowUpRight size={12} />
              <span>Nguồn cấp</span>
            </button>
            <button
              type="button"
              disabled={!selectedAssetId}
              onClick={() => setTraceMode('DOWNSTREAM')}
              style={{
                border: 'none',
                backgroundColor: traceMode === 'DOWNSTREAM' ? '#073B5C' : 'transparent',
                color: traceMode === 'DOWNSTREAM' ? '#FFFFFF' : selectedAssetId ? '#0F172A' : '#94A3B8',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                cursor: selectedAssetId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
              title="Truy vết phụ tải xuôi dòng (Downstream)"
            >
              <ArrowDownRight size={12} />
              <span>Cấp đến</span>
            </button>
          </div>
        </div>

        {/* Right: Unverified Preview Toggle & Viewport Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          {/* Admin Unverified Toggle */}
          {canManageVerification && onToggleShowUnverified && (
            <button
              type="button"
              onClick={() => onToggleShowUnverified(!showUnverified)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: showUnverified ? '#FEF3C7' : '#FFFFFF',
                border: showUnverified ? '1px solid #D97706' : '1px solid #D7E0E5',
                color: showUnverified ? '#92400E' : '#475569',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(7, 59, 92, 0.05)',
                transition: 'all 150ms ease',
              }}
              title="Bật / tắt giả thuyết mạng lưới chưa xác minh"
            >
              {showUnverified ? <Eye size={14} color="#D97706" /> : <EyeOff size={14} />}
              <span>{showUnverified ? 'Đang hiện dữ liệu chờ xác minh' : 'Hiển thị dữ liệu chờ xác minh'}</span>
            </button>
          )}

          {/* Reset Zoom / Pan */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #D7E0E5',
              boxShadow: '0 1px 3px rgba(7, 59, 92, 0.05)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Phóng to"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Thu nhỏ"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Đặt lại góc nhìn"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN SVG SCHEMATIC CANVAS                                 */}
      {/* ============================================================ */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <svg
          width="100%"
          height="100%"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <defs>
            {/* Direction Arrow Markers */}
            <marker
              id="arrow-electric-verified"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#073B5C" />
            </marker>
            <marker
              id="arrow-water-verified"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#12658F" />
            </marker>
            <marker
              id="arrow-unverified"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
            </marker>
          </defs>

          {/* World Transformed Group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid Pattern Background for Precision Engineering Feel */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E6ECEF" strokeWidth="0.8" />
            </pattern>
            <rect
              x={-2000}
              y={-2000}
              width={contentWidth + 4000}
              height={contentHeight + 4000}
              fill="url(#grid)"
              opacity={0.7}
            />

            {/* --- EDGES LAYER --- */}
            {layoutEdges.map((edge) => {
              const isSelectedSource = selectedAssetId === edge.connection.source_asset_id;
              const isSelectedTarget = selectedAssetId === edge.connection.target_asset_id;
              const isHighlighted = highlightedEdgeIds ? highlightedEdgeIds.has(edge.connection.id) : true;
              const isDimmed = highlightedEdgeIds !== null && !isHighlighted;

              const strokeColor = edge.isVerified
                ? edge.isWater
                  ? '#12658F'
                  : '#073B5C'
                : '#D97706';

              const strokeWidth = isSelectedSource || isSelectedTarget || isHighlighted ? 2.5 : 1.8;
              const strokeDash = edge.isVerified ? 'none' : '5,4';
              const markerId = edge.isVerified
                ? edge.isWater
                  ? 'url(#arrow-water-verified)'
                  : 'url(#arrow-electric-verified)'
                : 'url(#arrow-unverified)';

              return (
                <g
                  key={`edge-${edge.connection.id}`}
                  style={{
                    opacity: isDimmed ? 0.2 : 1,
                    transition: 'opacity 200ms ease, stroke-width 150ms ease',
                  }}
                >
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    markerEnd={edge.connection.connection_type === 'SUPPLIES' ? markerId : undefined}
                  />
                  {/* Utility indicator glyph near midpoint */}
                  <circle
                    cx={(edge.sourceNode.x + edge.sourceNode.width / 2 + edge.targetNode.x + edge.targetNode.width / 2) / 2}
                    cy={(edge.sourceNode.y + edge.sourceNode.height + edge.targetNode.y) / 2}
                    r={3}
                    fill={strokeColor}
                  />
                </g>
              );
            })}

            {/* --- NODES LAYER --- */}
            {layoutNodes.map((node) => {
              const isSelected = selectedAssetId === node.asset.id;
              const isHighlighted = highlightedNodeIds ? highlightedNodeIds.has(node.asset.id) : true;
              const isDimmed = highlightedNodeIds !== null && !isHighlighted;

              return (
                <g
                  key={`node-${node.asset.id}`}
                  className="sgp-network-node"
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.22 : 1,
                    transition: 'opacity 200ms ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectAsset) onSelectAsset(node.asset.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.asset.code}: ${node.asset.name}`}
                >
                  {/* Selected Node Halo */}
                  {isSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={node.width + 8}
                      height={node.height + 8}
                      rx={10}
                      fill="none"
                      stroke="#073B5C"
                      strokeWidth={2.5}
                    />
                  )}

                  {/* Node Container Card */}
                  <rect
                    x={0}
                    y={0}
                    width={node.width}
                    height={node.height}
                    rx={6}
                    fill="#FFFFFF"
                    stroke={
                      isSelected
                        ? '#073B5C'
                        : node.isVerified
                        ? '#D7E0E5'
                        : '#F59E0B'
                    }
                    strokeWidth={isSelected ? 2 : 1.2}
                    strokeDasharray={node.isVerified ? 'none' : '4,3'}
                    filter="drop-shadow(0 1px 2px rgba(7, 59, 92, 0.06))"
                  />

                  {/* Header Strip: Code & Type */}
                  <text
                    x={12}
                    y={22}
                    fill="#073B5C"
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.asset.code}
                  </text>

                  {/* Verification Pill / Icon */}
                  {node.isVerified ? (
                    <g transform={`translate(${node.width - 24}, 11)`}>
                      <circle cx={6} cy={6} r={6} fill="#E2F4E9" />
                      <path
                        d="M 3.5 6 L 5.5 8 L 8.5 4"
                        fill="none"
                        stroke="#0D9488"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : (
                    <g transform={`translate(${node.width - 24}, 11)`}>
                      <circle cx={6} cy={6} r={6} fill="#FEF3C7" />
                      <circle cx={6} cy={6} r={2} fill="#D97706" />
                    </g>
                  )}

                  {/* Asset Type Sub-label */}
                  <text
                    x={12}
                    y={37}
                    fill="#64748B"
                    fontSize={10}
                    fontWeight={500}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.asset.asset_type}
                  </text>

                  {/* Asset Name (Truncated) */}
                  <text
                    x={12}
                    y={54}
                    fill="#0F172A"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.asset.name.length > 22
                      ? `${node.asset.name.substring(0, 20)}...`
                      : node.asset.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ============================================================ */}
        {/* 3. CALM TRUTHFUL EMPTY STATE                                 */}
        {/* ============================================================ */}
        {showEmptyState && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(246, 248, 249, 0.95)',
              padding: 24,
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#E6ECEF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#073B5C',
                marginBottom: 16,
              }}
            >
              <Layers size={24} />
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#073B5C',
                margin: '0 0 8px 0',
              }}
            >
              Chưa có kết nối mạng lưới đã xác minh
            </h3>
            <p
              style={{
                fontSize: 13,
                color: '#64748B',
                maxWidth: 420,
                lineHeight: 1.5,
                margin: '0 0 20px 0',
              }}
            >
              Hệ thống tuân thủ nguyên tắc không suy đoán hạ tầng thực địa. Chỉ các liên kết nguồn
              và phụ tải đã qua đối soát kỹ thuật mới được xuất hiện trên sơ đồ đơn tuyến này.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {canManageVerification && onToggleShowUnverified && (
                <button
                  type="button"
                  onClick={() => onToggleShowUnverified(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D97706',
                    color: '#92400E',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={14} color="#D97706" />
                  <span>Hiển thị dữ liệu chờ xác minh</span>
                </button>
              )}

              {onSwitchToMap && (
                <button
                  type="button"
                  onClick={onSwitchToMap}
                  style={{
                    backgroundColor: '#073B5C',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Quay lại Bản đồ không gian
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. FOOTER STATUS TELEMETRY                                   */}
      {/* ============================================================ */}
      <div
        style={{
          height: 32,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #D7E0E5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: 11,
          color: '#64748B',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>
            Thiết bị:{' '}
            <strong style={{ color: '#0F172A' }}>{filteredNodes.length}</strong>
          </span>
          <span>
            Kết nối:{' '}
            <strong style={{ color: '#0F172A' }}>{filteredEdges.length}</strong>
          </span>
          <span>
            Đã xác minh:{' '}
            <strong style={{ color: '#0D9488' }}>{verifiedEdgeCount}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedAssetId && (
            <span>
              Đang chọn:{' '}
              <strong style={{ color: '#073B5C' }}>
                {nodes.find((n) => n.id === selectedAssetId)?.code || selectedAssetId}
              </strong>
            </span>
          )}
          <span style={{ color: '#94A3B8' }}>• Kéo chuột để di chuyển • Lăn để phóng to</span>
        </div>
      </div>
    </div>
  );
};
