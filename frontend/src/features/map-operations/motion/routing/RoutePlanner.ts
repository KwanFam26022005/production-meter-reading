/**
 * RoutePlanner — Deterministic Dijkstra Route Planner for Canonical Corridors (V15B)
 *
 * Finds the shortest physical route between an operator node and a target access node.
 * Uses Euclidean edge weights and deterministic tie-breaking (lexicographical node ID)
 * to prevent any runtime nondeterminism.
 */

import { ZoneRouteGraph, RouteNode, PlannedRoute, CanonicalPoint } from './RouteTypes';
import { getRouteNode, getEdgeWeight } from './ZoneRouteGraph';

export interface PlanRouteParams {
  graph: ZoneRouteGraph;
  startNodeId: string;
  targetNodeId: string;
  meterId?: string;
}

export class RoutePlanner {
  /**
   * Plans a deterministic shortest path from startNodeId to targetNodeId.
   */
  public static planRoute(params: PlanRouteParams): PlannedRoute {
    const { graph, startNodeId, targetNodeId, meterId } = params;

    const startNode = getRouteNode(graph, startNodeId);
    if (!startNode) {
      throw new Error(`[RoutePlanner] Start node not found: ${startNodeId} in zone ${graph.zoneId}`);
    }

    const targetNode = getRouteNode(graph, targetNodeId);
    if (!targetNode) {
      throw new Error(`[RoutePlanner] Target node not found: ${targetNodeId} in zone ${graph.zoneId}`);
    }

    // Trivial case: start equals target
    if (startNodeId === targetNodeId) {
      return {
        zoneId: graph.zoneId,
        startNodeId,
        targetNodeId,
        meterId,
        nodeIds: [startNodeId],
        points: [{ ...startNode.canonical }],
        totalDistance: 0,
      };
    }

    // Build adjacency list
    const nodeMap = new Map<string, RouteNode>();
    for (const node of graph.nodes) {
      nodeMap.set(node.id, node);
    }

    interface NeighborEdge {
      toId: string;
      weight: number;
    }
    const adjacency = new Map<string, NeighborEdge[]>();
    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
    }

    for (const edge of graph.edges) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) continue;

      const weight = getEdgeWeight(graph, fromNode, toNode, edge);
      adjacency.get(edge.from)?.push({ toId: edge.to, weight });
      if (edge.bidirectional) {
        adjacency.get(edge.to)?.push({ toId: edge.from, weight });
      }
    }

    // Sort neighbors deterministically by target ID
    for (const neighbors of adjacency.values()) {
      neighbors.sort((a, b) => a.toId.localeCompare(b.toId));
    }

    // Dijkstra algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const node of graph.nodes) {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    }
    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      // Pick unvisited node with smallest distance, tie-break with node ID
      let minNodeId: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const d = distances.get(nodeId)!;
        if (d < minDistance) {
          minDistance = d;
          minNodeId = nodeId;
        } else if (d === minDistance && minNodeId !== null && nodeId.localeCompare(minNodeId) < 0) {
          minNodeId = nodeId;
        }
      }

      if (minNodeId === null || minDistance === Infinity) {
        break; // Remaining nodes are unreachable
      }

      if (minNodeId === targetNodeId) {
        break; // Shortest path to target found
      }

      unvisited.delete(minNodeId);

      const neighbors = adjacency.get(minNodeId) || [];
      for (const { toId, weight } of neighbors) {
        if (!unvisited.has(toId)) continue;
        const newDist = minDistance + weight;
        const currentDist = distances.get(toId)!;
        if (newDist < currentDist) {
          distances.set(toId, newDist);
          previous.set(toId, minNodeId);
        }
      }
    }

    // Reconstruct path
    const targetDist = distances.get(targetNodeId);
    if (targetDist === undefined || targetDist === Infinity) {
      throw new Error(
        `[RoutePlanner] No valid route from ${startNodeId} to ${targetNodeId} in zone ${graph.zoneId}`
      );
    }

    const pathNodeIds: string[] = [];
    let curr: string | null = targetNodeId;
    while (curr !== null) {
      pathNodeIds.unshift(curr);
      curr = previous.get(curr) || null;
    }

    const points: CanonicalPoint[] = pathNodeIds.map((id) => {
      const node = nodeMap.get(id)!;
      return { x: node.canonical.x, y: node.canonical.y };
    });

    return {
      zoneId: graph.zoneId,
      startNodeId,
      targetNodeId,
      meterId,
      nodeIds: pathNodeIds,
      points,
      totalDistance: Math.round(targetDist * 100) / 100,
    };
  }
}
