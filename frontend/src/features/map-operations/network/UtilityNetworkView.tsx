/**
 * UtilityNetworkView — Progressive Schematic Topology Explorer (V16E-S2-R1)
 *
 * Implements the V16E-S2-R1 Network Comprehension Redesign:
 * 1. Progressive Disclosure: Level 1 (Collapsed overview by default) -> Level 2 (Expanded feeder branch)
 * 2. 4-Tier Node Hierarchy: Tier 1 (Source/Grid), Tier 2 (Transformer/MDB), Tier 3 (Feeder/Switchboard), Tier 4 (Load/Endpoint)
 * 3. Schematic Orthogonal Edge Routing: Vertical trunks, horizontal bus, vertical drops. Zero crossing in overview.
 * 4. Upstream / Downstream Trace: Exact upstream chain highlighting with 0.20 opacity dimming for unrelated nodes.
 * 5. Informational Breadcrumb: E.g. "Nguồn điện › MDB-01 › FDR-WEST › RTG-W01"
 * 6. Clean toolbar: [Điện] [Nước], [Toàn mạng] [Nguồn cấp] [Cấp đến], [Thu gọn tất cả], [Fit] [−] [+]
 * 7. Loop-safe Water network architecture.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Zap,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderMinus,
} from 'lucide-react';
import type { Asset, AssetConnection, UtilityType } from '../../assets/types';
import { formatAssetTypeVn } from '../../devices/DevicesWorkspacePage';
import {
  SgpButton,
  SgpSegmentedControl,
} from '../../../components/ui/SgpPrimitives';

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

interface SchematicNode {
  asset: Asset;
  tier: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  width: number;
  height: number;
  childCount: number;
  isFeeder: boolean;
  isExpanded?: boolean;
}

interface OrthogonalEdge {
  id: string;
  sourceId: string;
  targetId: string;
  pathD: string;
  isElectricity: boolean;
  isWater: boolean;
}

export const UtilityNetworkView: React.FC<UtilityNetworkViewProps> = ({
  nodes,
  edges,
  selectedAssetId,
  onSelectAsset,
  selectedUtility = 'ELECTRICITY',
  onSelectUtility,
  showUnverified: _showUnverified = false,
  isLoading: _isLoading = false,
  onSwitchToMap,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. Local State: Trace Mode, Pan, Zoom, Expanded Feeders
  const [traceMode, setTraceMode] = useState<TraceMode>('ALL');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Progressive Disclosure: set of expanded feeder asset codes/ids
  const [expandedFeederIds, setExpandedFeederIds] = useState<Set<string>>(() => new Set());

  // Automatically expand feeder branch if a selected asset belongs to it
  useEffect(() => {
    if (!selectedAssetId) return;

    // Find parent feeders for this asset
    const parentFeederIds = new Set<string>();
    const findParents = (currId: string) => {
      edges.forEach((e) => {
        if (e.target_asset_id === currId) {
          const src = nodes.find((n) => n.id === e.source_asset_id);
          if (src?.asset_type === 'FEEDER' || src?.code.startsWith('SIM-FDR-')) {
            parentFeederIds.add(src.id);
          } else {
            findParents(e.source_asset_id);
          }
        }
      });
    };
    findParents(selectedAssetId);

    if (parentFeederIds.size > 0) {
      setExpandedFeederIds((prev) => {
        const next = new Set(prev);
        parentFeederIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedAssetId, edges, nodes]);

  // Toggle single feeder
  const toggleFeeder = useCallback((feederId: string) => {
    setExpandedFeederIds((prev) => {
      const next = new Set(prev);
      if (next.has(feederId)) {
        next.delete(feederId);
      } else {
        next.add(feederId);
      }
      return next;
    });
  }, []);

  // Collapse all feeders
  const collapseAllFeeders = useCallback(() => {
    setExpandedFeederIds(new Set());
  }, []);

  // 2. Active Utility Filtering
  const activeUtility: UtilityType = selectedUtility === 'WATER' ? 'WATER' : 'ELECTRICITY';

  // 3. Trace Calculation (Upstream & Downstream)
  const { highlightedNodeIds, highlightedEdgeIds, upstreamBreadcrumb } = useMemo(() => {
    if (!selectedAssetId) {
      return { highlightedNodeIds: null, highlightedEdgeIds: null, upstreamBreadcrumb: [] };
    }

    const nodeIds = new Set<string>([selectedAssetId]);
    const edgeIds = new Set<string>();
    const chain: Asset[] = [];

    const selectedAsset = nodes.find((n) => n.id === selectedAssetId);
    if (selectedAsset) chain.push(selectedAsset);

    if (traceMode === 'UPSTREAM' || traceMode === 'ALL') {
      // Traverse backwards (target -> source)
      const queue = [selectedAssetId];
      const visited = new Set<string>([selectedAssetId]);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        edges.forEach((e) => {
          if (e.target_asset_id === curr && !visited.has(e.source_asset_id)) {
            visited.add(e.source_asset_id);
            nodeIds.add(e.source_asset_id);
            edgeIds.add(e.id);
            const parent = nodes.find((n) => n.id === e.source_asset_id);
            if (parent) chain.unshift(parent);
            queue.push(e.source_asset_id);
          } else if (e.target_asset_id === curr && visited.has(e.source_asset_id)) {
            edgeIds.add(e.id);
          }
        });
      }
    }

    if (traceMode === 'DOWNSTREAM') {
      // Traverse forwards (source -> target)
      const queue = [selectedAssetId];
      const visited = new Set<string>([selectedAssetId]);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        edges.forEach((e) => {
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

    return {
      highlightedNodeIds: traceMode === 'ALL' ? null : nodeIds,
      highlightedEdgeIds: traceMode === 'ALL' ? null : edgeIds,
      upstreamBreadcrumb: chain,
    };
  }, [selectedAssetId, traceMode, edges, nodes]);

  // 4. Layout Generation: Deterministic Schematic Topology
  const { schematicNodes, orthogonalEdges, sceneWidth, sceneHeight } = useMemo(() => {
    const nodeMap = new Map<string, Asset>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const sNodes: SchematicNode[] = [];
    const oEdges: OrthogonalEdge[] = [];

    if (activeUtility === 'ELECTRICITY') {
      // ELECTRICITY SCHEMATIC HIERARCHY
      // Trunk Spine: EXT-GRID -> SS-01 -> TR-01 -> MDB-01
      const extGrid = nodes.find((n) => n.code === 'SIM-EXT-GRID') || nodes.find((n) => n.asset_type === 'OTHER' && !n.code.includes('WATER'));
      const ss01 = nodes.find((n) => n.code === 'SIM-SS-01') || nodes.find((n) => n.asset_type === 'SUBSTATION');
      const tr01 = nodes.find((n) => n.code === 'SIM-TR-01') || nodes.find((n) => n.asset_type === 'TRANSFORMER');
      const mdb01 = nodes.find((n) => n.code === 'SIM-MDB-01') || nodes.find((n) => n.asset_type === 'SWITCHBOARD' && n.code.includes('MDB'));

      // 5 Feeder nodes
      const feeders = nodes.filter(
        (n) => n.asset_type === 'FEEDER' || n.code.startsWith('SIM-FDR-')
      ).sort((a, b) => a.code.localeCompare(b.code));

      // Calculate child count for each feeder
      const getDescendantCount = (rootId: string): number => {
        let count = 0;
        const queue = [rootId];
        const visited = new Set<string>([rootId]);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          edges.forEach((e) => {
            if (e.source_asset_id === curr && !visited.has(e.target_asset_id)) {
              visited.add(e.target_asset_id);
              count += 1;
              queue.push(e.target_asset_id);
            }
          });
        }
        return count;
      };

      // Scene Dimensions
      const CANVAS_WIDTH = 1500;
      const CENTER_X = CANVAS_WIDTH / 2;

      // Spine vertical layout
      let curY = 40;

      if (extGrid) {
        sNodes.push({
          asset: extGrid,
          tier: 1,
          x: CENTER_X - 110,
          y: curY,
          width: 220,
          height: 64,
          childCount: 0,
          isFeeder: false,
        });
        curY += 104;
      }

      if (ss01) {
        sNodes.push({
          asset: ss01,
          tier: 1,
          x: CENTER_X - 110,
          y: curY,
          width: 220,
          height: 64,
          childCount: 0,
          isFeeder: false,
        });
        // Edge: Grid -> SS-01
        if (extGrid) {
          oEdges.push({
            id: 'e-grid-ss',
            sourceId: extGrid.id,
            targetId: ss01.id,
            pathD: `M ${CENTER_X} ${40 + 64} L ${CENTER_X} ${curY}`,
            isElectricity: true,
            isWater: false,
          });
        }
        curY += 104;
      }

      if (tr01) {
        sNodes.push({
          asset: tr01,
          tier: 2,
          x: CENTER_X - 105,
          y: curY,
          width: 210,
          height: 60,
          childCount: 0,
          isFeeder: false,
        });
        // Edge: SS-01 -> TR-01
        if (ss01) {
          oEdges.push({
            id: 'e-ss-tr',
            sourceId: ss01.id,
            targetId: tr01.id,
            pathD: `M ${CENTER_X} ${curY - 104 + 64} L ${CENTER_X} ${curY}`,
            isElectricity: true,
            isWater: false,
          });
        }
        curY += 100;
      }

      if (mdb01) {
        sNodes.push({
          asset: mdb01,
          tier: 2,
          x: CENTER_X - 105,
          y: curY,
          width: 210,
          height: 60,
          childCount: feeders.length,
          isFeeder: false,
        });
        // Edge: TR-01 -> MDB-01
        if (tr01) {
          oEdges.push({
            id: 'e-tr-mdb',
            sourceId: tr01.id,
            targetId: mdb01.id,
            pathD: `M ${CENTER_X} ${curY - 100 + 60} L ${CENTER_X} ${curY}`,
            isElectricity: true,
            isWater: false,
          });
        }
        curY += 60; // MDB bottom
      }

      // Horizontal Bus Distribution for Feeders
      const mdbBottomY = curY;
      const busY = mdbBottomY + 36;
      const feederY = busY + 36;

      const numFeeders = Math.max(1, feeders.length);
      const feederSpacing = 280;
      const totalFeederWidth = (numFeeders - 1) * feederSpacing;
      const feederStartX = CENTER_X - totalFeederWidth / 2;

      // Vertical drop from MDB to Bus
      oEdges.push({
        id: 'e-mdb-bus',
        sourceId: mdb01?.id || 'mdb',
        targetId: 'bus',
        pathD: `M ${CENTER_X} ${mdbBottomY} L ${CENTER_X} ${busY}`,
        isElectricity: true,
        isWater: false,
      });

      // Horizontal Bus Trunk
      const firstFeederX = feederStartX;
      const lastFeederX = feederStartX + (numFeeders - 1) * feederSpacing;
      oEdges.push({
        id: 'e-bus-trunk',
        sourceId: 'bus',
        targetId: 'bus',
        pathD: `M ${firstFeederX} ${busY} L ${lastFeederX} ${busY}`,
        isElectricity: true,
        isWater: false,
      });

      let maxExpandedY = feederY + 70;

      feeders.forEach((feeder, idx) => {
        const fX = feederStartX + idx * feederSpacing;
        const childCount = getDescendantCount(feeder.id);
        const isExpanded = expandedFeederIds.has(feeder.id);

        sNodes.push({
          asset: feeder,
          tier: 3,
          x: fX - 100,
          y: feederY,
          width: 200,
          height: 64,
          childCount,
          isFeeder: true,
          isExpanded,
        });

        // Drop line from Bus to Feeder
        oEdges.push({
          id: `e-bus-fdr-${feeder.id}`,
          sourceId: mdb01?.id || 'mdb',
          targetId: feeder.id,
          pathD: `M ${fX} ${busY} L ${fX} ${feederY}`,
          isElectricity: true,
          isWater: false,
        });

        // IF EXPANDED: Render downstream intermediate & load nodes
        if (isExpanded) {
          // Direct children of this feeder
          const directChildEdges = edges.filter((e) => e.source_asset_id === feeder.id);
          const directChildren = directChildEdges
            .map((e) => nodeMap.get(e.target_asset_id))
            .filter((n): n is Asset => Boolean(n));

          let childY = feederY + 104;

          directChildren.forEach((childNode, cIdx) => {
            const childX = fX + (cIdx - (directChildren.length - 1) / 2) * 170;

            sNodes.push({
              asset: childNode,
              tier: childNode.asset_type === 'SWITCHBOARD' ? 3 : 4,
              x: childX - 85,
              y: childY,
              width: 170,
              height: 54,
              childCount: 0,
              isFeeder: false,
            });

            // Orthogonal drop line from Feeder to Child
            oEdges.push({
              id: `e-${feeder.id}-${childNode.id}`,
              sourceId: feeder.id,
              targetId: childNode.id,
              pathD: `M ${fX} ${feederY + 64} L ${fX} ${childY - 20} L ${childX} ${childY - 20} L ${childX} ${childY}`,
              isElectricity: true,
              isWater: false,
            });

            // Grandchildren (e.g. YDB -> RTGs)
            const grandchildEdges = edges.filter((e) => e.source_asset_id === childNode.id);
            const grandchildren = grandchildEdges
              .map((e) => nodeMap.get(e.target_asset_id))
              .filter((n): n is Asset => Boolean(n));

            if (grandchildren.length > 0) {
              const gcY = childY + 90;
              grandchildren.forEach((gcNode, gcIdx) => {
                const gcX = childX + (gcIdx - (grandchildren.length - 1) / 2) * 160;

                sNodes.push({
                  asset: gcNode,
                  tier: 4,
                  x: gcX - 80,
                  y: gcY,
                  width: 160,
                  height: 52,
                  childCount: 0,
                  isFeeder: false,
                });

                oEdges.push({
                  id: `e-${childNode.id}-${gcNode.id}`,
                  sourceId: childNode.id,
                  targetId: gcNode.id,
                  pathD: `M ${childX} ${childY + 54} L ${childX} ${gcY - 18} L ${gcX} ${gcY - 18} L ${gcX} ${gcY}`,
                  isElectricity: true,
                  isWater: false,
                });

                if (gcY + 70 > maxExpandedY) maxExpandedY = gcY + 70;
              });
            } else {
              if (childY + 70 > maxExpandedY) maxExpandedY = childY + 70;
            }
          });
        }
      });

      return {
        schematicNodes: sNodes,
        orthogonalEdges: oEdges,
        sceneWidth: CANVAS_WIDTH,
        sceneHeight: Math.max(760, maxExpandedY + 40),
      };
    } else {
      // WATER SCHEMATIC HIERARCHY
      // City Water -> Water Intake (WIN-01) -> Main Junction (WJ-01) -> 4 Endpoints
      const CANVAS_WIDTH = 1200;
      const CENTER_X = CANVAS_WIDTH / 2;

      const cityWater = nodes.find((n) => n.code === 'SIM-CITY-WATER');
      const intake = nodes.find((n) => n.code === 'SIM-WIN-01');
      const junction = nodes.find((n) => n.code === 'SIM-WJ-01');

      let curY = 40;

      if (cityWater) {
        sNodes.push({
          asset: cityWater,
          tier: 1,
          x: CENTER_X - 110,
          y: curY,
          width: 220,
          height: 64,
          childCount: 0,
          isFeeder: false,
        });
        curY += 100;
      }

      if (intake) {
        sNodes.push({
          asset: intake,
          tier: 2,
          x: CENTER_X - 105,
          y: curY,
          width: 210,
          height: 60,
          childCount: 0,
          isFeeder: false,
        });
        if (cityWater) {
          oEdges.push({
            id: 'e-city-intake',
            sourceId: cityWater.id,
            targetId: intake.id,
            pathD: `M ${CENTER_X} ${40 + 64} L ${CENTER_X} ${curY}`,
            isElectricity: false,
            isWater: true,
          });
        }
        curY += 100;
      }

      if (junction) {
        sNodes.push({
          asset: junction,
          tier: 2,
          x: CENTER_X - 105,
          y: curY,
          width: 210,
          height: 60,
          childCount: 4,
          isFeeder: false,
        });
        if (intake) {
          oEdges.push({
            id: 'e-intake-junc',
            sourceId: intake.id,
            targetId: junction.id,
            pathD: `M ${CENTER_X} ${curY - 100 + 60} L ${CENTER_X} ${curY}`,
            isElectricity: false,
            isWater: true,
          });
        }
        curY += 60;
      }

      // Water Distribution Bus
      const juncBottomY = curY;
      const busY = juncBottomY + 36;
      const waterEndpointY = busY + 36;

      // 4 Water Branches
      const waterBranches = [
        nodes.find((n) => n.code === 'SIM-WP-B01'),
        nodes.find((n) => n.code === 'SIM-WP-CFS-01'),
        nodes.find((n) => n.code === 'SIM-WP-TECH-01'),
        nodes.find((n) => n.code === 'SIM-FP-01'),
      ].filter((n): n is Asset => Boolean(n));

      const branchSpacing = 240;
      const totalBranchWidth = (waterBranches.length - 1) * branchSpacing;
      const startX = CENTER_X - totalBranchWidth / 2;

      // Vertical drop from Junction to Bus
      oEdges.push({
        id: 'e-junc-bus',
        sourceId: junction?.id || 'wj',
        targetId: 'bus',
        pathD: `M ${CENTER_X} ${juncBottomY} L ${CENTER_X} ${busY}`,
        isElectricity: false,
        isWater: true,
      });

      // Horizontal Bus Line
      const firstX = startX;
      const lastX = startX + (waterBranches.length - 1) * branchSpacing;
      oEdges.push({
        id: 'e-water-bus-line',
        sourceId: 'bus',
        targetId: 'bus',
        pathD: `M ${firstX} ${busY} L ${lastX} ${busY}`,
        isElectricity: false,
        isWater: true,
      });

      let maxWaterY = waterEndpointY + 70;

      waterBranches.forEach((wb, idx) => {
        const bX = startX + idx * branchSpacing;
        const isFirePump = wb.code === 'SIM-FP-01';

        sNodes.push({
          asset: wb,
          tier: 3,
          x: bX - 95,
          y: waterEndpointY,
          width: 190,
          height: 60,
          childCount: isFirePump ? 1 : 0,
          isFeeder: false,
        });

        // Drop from bus to endpoint
        oEdges.push({
          id: `e-wbus-${wb.id}`,
          sourceId: junction?.id || 'wj',
          targetId: wb.id,
          pathD: `M ${bX} ${busY} L ${bX} ${waterEndpointY}`,
          isElectricity: false,
          isWater: true,
        });

        // If Fire Pump, show connection to Fire Hydrant
        if (isFirePump) {
          const fireHdr = nodes.find((n) => n.code === 'SIM-FIRE-HDR-01');
          if (fireHdr) {
            const fhdrY = waterEndpointY + 94;
            sNodes.push({
              asset: fireHdr,
              tier: 4,
              x: bX - 85,
              y: fhdrY,
              width: 170,
              height: 52,
              childCount: 0,
              isFeeder: false,
            });

            oEdges.push({
              id: `e-fp-fhdr`,
              sourceId: wb.id,
              targetId: fireHdr.id,
              pathD: `M ${bX} ${waterEndpointY + 60} L ${bX} ${fhdrY}`,
              isElectricity: false,
              isWater: true,
            });

            if (fhdrY + 70 > maxWaterY) maxWaterY = fhdrY + 70;
          }
        }
      });

      return {
        schematicNodes: sNodes,
        orthogonalEdges: oEdges,
        sceneWidth: CANVAS_WIDTH,
        sceneHeight: Math.max(680, maxWaterY + 40),
      };
    }
  }, [activeUtility, nodes, edges, expandedFeederIds]);

  // Handle Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && e.target.closest('.sgp-net-node')) return;
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div className="sgp-network-root" role="region" aria-label="Sơ đồ mạng lưới tiện ích">
      {/* 1. CLEAN TOOLBAR (SECTION 22) */}
      <div className="sgp-network-toolbar">
        {/* Left: Utility Switch & Trace Mode */}
        <div className="flex items-center gap-3">
          <SgpSegmentedControl<'ELECTRICITY' | 'WATER'>
            size="sm"
            value={activeUtility}
            onChange={(val) => {
              onSelectUtility?.(val);
              collapseAllFeeders();
            }}
            options={[
              { id: 'ELECTRICITY', label: 'Điện', icon: <Zap size={13} className="text-amber-500" /> },
              { id: 'WATER', label: 'Nước', icon: <Droplets size={13} className="text-sky-500" /> },
            ]}
          />

          <span className="text-slate-300">|</span>

          <SgpSegmentedControl<TraceMode>
            size="sm"
            value={traceMode}
            onChange={setTraceMode}
            options={[
              { id: 'ALL', label: 'Toàn mạng' },
              { id: 'UPSTREAM', label: 'Nguồn cấp', icon: <ArrowUpRight size={13} /> },
              { id: 'DOWNSTREAM', label: 'Cấp đến', icon: <ArrowDownRight size={13} /> },
            ]}
          />

          {/* Quick Collapse All Feeders Button */}
          {activeUtility === 'ELECTRICITY' && expandedFeederIds.size > 0 && (
            <SgpButton
              variant="outline"
              size="sm"
              icon={<FolderMinus size={13} />}
              onClick={collapseAllFeeders}
              title="Thu gọn tất cả nhánh xuất tuyến về dạng tổng quan"
            >
              Thu gọn tất cả
            </SgpButton>
          )}
        </div>

        {/* Right: Zoom & Navigation Controls */}
        <div className="flex items-center gap-2">
          {onSwitchToMap && (
            <SgpButton
              variant="ghost"
              size="sm"
              onClick={onSwitchToMap}
              title="Chuyển sang bản đồ không gian"
            >
              Bản đồ
            </SgpButton>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              onClick={handleResetView}
              title="Vừa khung hình (Fit)"
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              title="Thu nhỏ (−)"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-tabular text-[11px] font-bold text-slate-700 px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              title="Phóng to (+)"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. INFORMATIONAL BREADCRUMB (SECTION 20) */}
      {selectedAssetId && upstreamBreadcrumb.length > 0 && (
        <div className="sgp-network-breadcrumb-bar">
          <span className="text-slate-500 font-semibold">Tuyến cấp nguồn:</span>
          {upstreamBreadcrumb.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <span className="text-slate-400">›</span>}
              <button
                type="button"
                onClick={() => onSelectAsset?.(item.id)}
                className={`sgp-network-breadcrumb-node hover:underline ${
                  item.id === selectedAssetId ? 'text-sky-700 font-bold' : ''
                }`}
              >
                {item.code}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 3. SCHEMATIC CANVAS */}
      <div
        ref={containerRef}
        className="sgp-network-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{ display: 'block' }}
          viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 1. Orthogonal Edges */}
            {orthogonalEdges.map((edge) => {
              const isHighlighted = highlightedEdgeIds ? highlightedEdgeIds.has(edge.id) : true;
              const opacity = isHighlighted ? 1 : 0.20;

              return (
                <path
                  key={edge.id}
                  d={edge.pathD}
                  fill="none"
                  stroke={edge.isWater ? '#0284c7' : '#0369a1'}
                  className={edge.isWater ? 'sgp-net-bus-water' : 'sgp-net-bus-branch'}
                  style={{
                    opacity,
                    transition: 'opacity 180ms ease',
                  }}
                />
              );
            })}

            {/* 2. Schematic Nodes */}
            {schematicNodes.map((sNode) => {
              const isSelected = sNode.asset.id === selectedAssetId;
              const isHighlighted = highlightedNodeIds ? highlightedNodeIds.has(sNode.asset.id) : true;
              const opacity = isHighlighted ? 1 : 0.20;

              return (
                <g
                  key={sNode.asset.id}
                  transform={`translate(${sNode.x}, ${sNode.y})`}
                  className="sgp-net-node"
                  style={{
                    opacity,
                    transition: 'opacity 180ms ease, transform 150ms ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAsset?.(sNode.asset.id);
                  }}
                >
                  {/* Node Card Container */}
                  <rect
                    width={sNode.width}
                    height={sNode.height}
                    rx={sNode.tier === 1 ? 10 : 8}
                    fill={
                      sNode.tier === 1
                        ? '#0f172a'
                        : isSelected
                        ? '#f0f9ff'
                        : '#ffffff'
                    }
                    stroke={
                      isSelected
                        ? '#0284c7'
                        : sNode.tier === 1
                        ? '#334155'
                        : '#cbd5e1'
                    }
                    strokeWidth={isSelected ? 2.5 : sNode.tier === 1 ? 2 : 1}
                    className={`sgp-net-tier${sNode.tier}`}
                  />

                  {/* Selection Indicator Badge */}
                  {isSelected && (
                    <rect
                      x={sNode.width - 20}
                      y={-6}
                      width={14}
                      height={14}
                      rx={3}
                      fill="#0284c7"
                    />
                  )}

                  {/* Node Content */}
                  <g transform="translate(12, 16)">
                    {/* Top Row: Icon + Code */}
                    <text
                      x={0}
                      y={10}
                      fontFamily="monospace"
                      fontWeight={700}
                      fontSize={sNode.tier === 1 ? 13 : sNode.tier === 4 ? 11 : 12.5}
                      fill={sNode.tier === 1 ? '#ffffff' : '#0f172a'}
                    >
                      {sNode.asset.code}
                    </text>

                    {/* Middle Row: Name / Type */}
                    <text
                      x={0}
                      y={26}
                      fontSize={sNode.tier === 4 ? 10.5 : 11.5}
                      fontWeight={500}
                      fill={sNode.tier === 1 ? '#94a3b8' : '#475569'}
                    >
                      {formatAssetTypeVn(sNode.asset.asset_type)}
                    </text>

                    {/* Bottom Metadata: Child count or Expand Button */}
                    {sNode.isFeeder && (
                      <g
                        transform={`translate(${sNode.width - 92}, 16)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeeder(sNode.asset.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          width={68}
                          height={20}
                          rx={4}
                          fill={sNode.isExpanded ? '#e0f2fe' : '#f1f5f9'}
                          stroke={sNode.isExpanded ? '#7dd3fc' : '#cbd5e1'}
                        />
                        <text
                          x={34}
                          y={13}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={700}
                          fill={sNode.isExpanded ? '#0369a1' : '#475569'}
                        >
                          {sNode.isExpanded ? '− Thu gọn' : `+ ${sNode.childCount} tải`}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>Kịch bản: <strong>tan-thuan-demo-v1</strong></span>
          <span>·</span>
          <span>{activeUtility === 'ELECTRICITY' ? '24 tuyến cáp điện' : '7 tuyến ống nước'}</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Nhấp xuất tuyến để mở rộng nhánh · Nhấp thiết bị để truy vết nguồn cấp
        </div>
      </div>
    </div>
  );
};
