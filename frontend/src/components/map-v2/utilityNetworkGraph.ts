/**
 * Map V2 Utility Network Graph Engine — Phase 2
 * Graph Traversal, Topology Scheduling, and Trace Path Resolution
 *
 * CRITICAL INVARIANTS:
 * 1. Works STRICTLY on the frozen B2 presentation geometry (17 nodes, 15 edges).
 * 2. Uses pure graph topology traversal (parent-child dependencies) — NO spatial A* / Dijkstra.
 * 3. Supports deterministic expand and retract scheduling based on graph depth and path length.
 * 4. Zero mutations to database or layout coordinates.
 */

import { UtilityDisplayNode, UtilityDisplayEdge, UtilityType } from './utilityDemoLayout';

export interface EdgeSchedule {
  edgeId: string;
  startMs: number;
  durationMs: number;
  endMs: number;
}

export interface NodeSchedule {
  nodeId: string;
  revealMs: number;
}

export interface ScheduleResult {
  edgeSchedules: Record<string, EdgeSchedule>;
  nodeSchedules: Record<string, NodeSchedule>;
  totalDurationMs: number;
}

export interface TracePathResult {
  targetNodeId: string;
  meterCode?: string;
  sourceNodeId: string;
  pathNodeIds: string[];
  pathEdgeIds: string[];
}

/**
 * Calculate geometric length of an ordered polyline displayPath
 */
export function calculatePathLength(points: [number, number][]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    length += Math.hypot(x2 - x1, y2 - y1);
  }
  return length;
}

/**
 * In-memory directed tree representation for utility graph
 */
export class UtilityTopologyGraph {
  public readonly utilityType: UtilityType;
  public readonly nodes: Map<string, UtilityDisplayNode> = new Map();
  public readonly edges: Map<string, UtilityDisplayEdge> = new Map();
  public readonly sourceNodeId: string;
  public readonly parentEdgeMap: Map<string, UtilityDisplayEdge> = new Map(); // targetNodeId -> incoming edge
  public readonly parentNodeMap: Map<string, string> = new Map();            // childNodeId -> parentNodeId
  public readonly childrenMap: Map<string, UtilityDisplayEdge[]> = new Map(); // parentNodeId -> outgoing edges

  constructor(nodes: UtilityDisplayNode[], edges: UtilityDisplayEdge[], utilityType: UtilityType) {
    this.utilityType = utilityType;
    const filteredNodes = nodes.filter((n) => n.utilityType === utilityType);
    const filteredEdges = edges.filter((e) => e.utilityType === utilityType);

    for (const node of filteredNodes) {
      this.nodes.set(node.id, node);
      this.childrenMap.set(node.id, []);
    }

    let sourceId = '';
    for (const node of filteredNodes) {
      if (node.isSource) {
        sourceId = node.id;
        break;
      }
    }
    this.sourceNodeId = sourceId;

    for (const edge of filteredEdges) {
      this.edges.set(edge.id, edge);
      this.parentEdgeMap.set(edge.targetNodeId, edge);
      this.parentNodeMap.set(edge.targetNodeId, edge.sourceNodeId);

      const children = this.childrenMap.get(edge.sourceNodeId);
      if (children) {
        children.push(edge);
      }
    }
  }

  /**
   * Resolve logical upstream path from target node (or meter code) to root source.
   * Pure topological traversal: target -> parent -> grandparent -> ... -> source.
   */
  public resolveTracePath(targetNodeOrMeterCode: string): TracePathResult | null {
    // 1. Find the target node
    let targetNode = this.nodes.get(targetNodeOrMeterCode);
    if (!targetNode) {
      for (const n of this.nodes.values()) {
        if (n.meterCode === targetNodeOrMeterCode) {
          targetNode = n;
          break;
        }
      }
    }

    if (!targetNode) return null;

    const pathNodeIds: string[] = [targetNode.id];
    const pathEdgeIds: string[] = [];

    let currNodeId = targetNode.id;
    while (currNodeId !== this.sourceNodeId) {
      const incomingEdge = this.parentEdgeMap.get(currNodeId);
      if (!incomingEdge) {
        // Disconnected or root reached unexpectedly
        break;
      }
      pathEdgeIds.unshift(incomingEdge.id);
      currNodeId = incomingEdge.sourceNodeId;
      pathNodeIds.unshift(currNodeId);
    }

    return {
      targetNodeId: targetNode.id,
      meterCode: targetNode.meterCode,
      sourceNodeId: this.sourceNodeId,
      pathNodeIds,
      pathEdgeIds,
    };
  }

  /**
   * Build forward Expand Schedule (Source -> Main Trunk -> Distribution -> Branches -> Spurs -> Meters)
   * Ensures child edges start only when parent edge completes.
   * Concurrently schedules sibling branches!
   */
  public buildExpandSchedule(): ScheduleResult {
    const edgeSchedules: Record<string, EdgeSchedule> = {};
    const nodeSchedules: Record<string, NodeSchedule> = {};

    // Source is visible at t=0
    nodeSchedules[this.sourceNodeId] = {
      nodeId: this.sourceNodeId,
      revealMs: 0,
    };

    // Breadth-First / Depth-ordered forward scheduling
    // Queue stores: { nodeId, availableTimeMs }
    const queue: { nodeId: string; availableTimeMs: number }[] = [
      { nodeId: this.sourceNodeId, availableTimeMs: 0 },
    ];

    let maxTimeMs = 0;

    while (queue.length > 0) {
      const { nodeId, availableTimeMs } = queue.shift()!;
      const outgoingEdges = this.childrenMap.get(nodeId) || [];

      for (const edge of outgoingEdges) {
        // Calculate duration based on routeTier and pathLength (Section 9 guidelines)
        const length = calculatePathLength(edge.displayPath);
        let durationMs: number;

        if (edge.routeTier === 'TRUNK') {
          // Major trunk: ~240–350ms
          durationMs = Math.round(220 + Math.min(130, length * 0.4));
        } else if (edge.routeTier === 'BRANCH') {
          // Normal branch: ~250–380ms
          durationMs = Math.round(240 + Math.min(140, length * 0.28));
        } else {
          // Spur: ~280–380ms
          durationMs = Math.round(250 + Math.min(130, length * 0.3));
        }

        const startMs = availableTimeMs;
        const endMs = startMs + durationMs;

        edgeSchedules[edge.id] = {
          edgeId: edge.id,
          startMs,
          durationMs,
          endMs,
        };

        // Target node is revealed exactly when this edge reaches it
        nodeSchedules[edge.targetNodeId] = {
          nodeId: edge.targetNodeId,
          revealMs: endMs,
        };

        if (endMs > maxTimeMs) {
          maxTimeMs = endMs;
        }

        queue.push({
          nodeId: edge.targetNodeId,
          availableTimeMs: endMs,
        });
      }
    }

    return {
      edgeSchedules,
      nodeSchedules,
      totalDurationMs: maxTimeMs,
    };
  }

  /**
   * Build reverse Retract Schedule (Meters/Spurs -> Branches -> Distribution -> Trunk -> Source remains)
   * Follows descending graph depth.
   */
  public buildRetractSchedule(): ScheduleResult {
    const edgeSchedules: Record<string, EdgeSchedule> = {};
    const nodeSchedules: Record<string, NodeSchedule> = {};

    // Group edges by branchDepth descending
    const edgesByDepth: Map<number, UtilityDisplayEdge[]> = new Map();
    let maxDepth = 0;

    for (const edge of this.edges.values()) {
      const d = edge.branchDepth;
      if (!edgesByDepth.has(d)) {
        edgesByDepth.set(d, []);
      }
      edgesByDepth.get(d)!.push(edge);
      if (d > maxDepth) maxDepth = d;
    }

    let currentTimeMs = 0;

    // Retract tier by tier from deepest to shallowest
    for (let depth = maxDepth; depth >= 1; depth--) {
      const edgesAtDepth = edgesByDepth.get(depth) || [];
      if (edgesAtDepth.length === 0) continue;

      let tierMaxDuration = 0;

      for (const edge of edgesAtDepth) {
        // Retraction is crisp: ~160–240ms per tier
        const durationMs = 180 + (edge.routeTier === 'TRUNK' ? 40 : 0);
        const startMs = currentTimeMs;
        const endMs = startMs + durationMs;

        edgeSchedules[edge.id] = {
          edgeId: edge.id,
          startMs,
          durationMs,
          endMs,
        };

        // Target node hides at start of retract
        nodeSchedules[edge.targetNodeId] = {
          nodeId: edge.targetNodeId,
          revealMs: startMs, // hidden when currentTime reaches startMs
        };

        if (durationMs > tierMaxDuration) {
          tierMaxDuration = durationMs;
        }
      }

      currentTimeMs += tierMaxDuration;
    }

    // Source remains visible (never hides)
    nodeSchedules[this.sourceNodeId] = {
      nodeId: this.sourceNodeId,
      revealMs: Infinity,
    };

    return {
      edgeSchedules,
      nodeSchedules,
      totalDurationMs: currentTimeMs,
    };
  }
}
