import type { Asset, AssetConnection, UtilityType } from '../../assets/types';
import { CANONICAL_SCENE_WIDTH, CANONICAL_SCENE_HEIGHT } from '../geometry/canonicalScene';

export interface Point2D {
  x: number;
  y: number;
}

export interface RoutedNetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  utilityType: UtilityType;
  pathD: string;
  sourcePos: Point2D;
  targetPos: Point2D;
  isVerified: boolean;
  connection: AssetConnection;
}

// Fallback boundary anchors for external utility feeds (EVN Grid & Sawaco)
export const EXTERNAL_GRID_ANCHOR: Point2D = { x: 1350, y: 720 };
export const EXTERNAL_WATER_ANCHOR: Point2D = { x: 1550, y: 560 };

/**
 * Resolves physical pixel coordinates [0..1915, 0..821] for an asset
 */
export function getAssetCoordinates(asset: Asset): Point2D | null {
  if (asset.map_x !== null && asset.map_y !== null && !isNaN(asset.map_x) && !isNaN(asset.map_y)) {
    return {
      x: Math.round(asset.map_x * CANONICAL_SCENE_WIDTH),
      y: Math.round(asset.map_y * CANONICAL_SCENE_HEIGHT),
    };
  }

  // Handle external nodes without physical port coordinates
  if (asset.code === 'SIM-EXT-GRID') {
    return EXTERNAL_GRID_ANCHOR;
  }
  if (asset.code === 'SIM-CITY-WATER') {
    return EXTERNAL_WATER_ANCHOR;
  }

  return null;
}

/**
 * Computes an aesthetically smoothed 2D digital-twin route curve between two coordinates.
 * Employs gentle S-curve bezier routing along port corridors to eliminate chaotic diagonals.
 */
export function computeSmoothRoutePath(source: Point2D, target: Point2D, _utilityType?: UtilityType): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Short distance or nearly collinear: direct clean line
  if (dist < 40 || Math.abs(dx) < 8 || Math.abs(dy) < 8) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  // S-Curve corridor routing based on dominant orientation
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal dominant corridor
    const midX = source.x + dx * 0.5;
    return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
  } else {
    // Vertical dominant corridor
    const midY = source.y + dy * 0.5;
    return `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
  }
}

/**
 * Traverses graph to find all upstream (sources) and downstream (loads) connected to an asset.
 */
export function traceNetworkPath(
  selectedAssetId: string,
  edges: AssetConnection[]
): {
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
  connectedNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
} {
  const upstreamNodes = new Set<string>();
  const downstreamNodes = new Set<string>();
  const connectedNodes = new Set<string>([selectedAssetId]);
  const connectedEdges = new Set<string>();

  // 1. Upstream BFS (traverse against direction: target -> source)
  const upQueue: string[] = [selectedAssetId];
  const upVisited = new Set<string>([selectedAssetId]);

  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    for (const e of edges) {
      if (e.target_asset_id === curr && !upVisited.has(e.source_asset_id)) {
        upVisited.add(e.source_asset_id);
        upstreamNodes.add(e.source_asset_id);
        connectedNodes.add(e.source_asset_id);
        connectedEdges.add(e.id);
        upQueue.push(e.source_asset_id);
      }
    }
  }

  // 2. Downstream BFS (traverse with direction: source -> target)
  const downQueue: string[] = [selectedAssetId];
  const downVisited = new Set<string>([selectedAssetId]);

  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    for (const e of edges) {
      if (e.source_asset_id === curr && !downVisited.has(e.target_asset_id)) {
        downVisited.add(e.target_asset_id);
        downDownstreamAdd: {
          downstreamNodes.add(e.target_asset_id);
          connectedNodes.add(e.target_asset_id);
          connectedEdges.add(e.id);
        }
        downQueue.push(e.target_asset_id);
      }
    }
  }

  return {
    upstreamNodeIds: upstreamNodes,
    downstreamNodeIds: downstreamNodes,
    connectedNodeIds: connectedNodes,
    connectedEdgeIds: connectedEdges,
  };
}
