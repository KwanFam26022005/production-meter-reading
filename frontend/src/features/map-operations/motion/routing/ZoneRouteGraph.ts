/**
 * ZoneRouteGraph — Canonical Zone Route Graph Repository & Accessor (V15B)
 *
 * Statically imports and serves the 6 authoritative route graphs.
 * Provides deterministic distance and lookup helpers.
 */

import { ZoneRouteGraph, RouteNode, RouteEdge, CanonicalPoint } from './RouteTypes';

import berthGraph from './route-data/pres-berth.route.json';
import containerWestGraph from './route-data/pres-container-west.route.json';
import containerCenterGraph from './route-data/pres-container-center.route.json';
import cfsEastGraph from './route-data/pres-cfs-east.route.json';
import technicalGraph from './route-data/pres-technical.route.json';
import gateGraph from './route-data/pres-gate.route.json';

export const ALL_ZONE_ROUTE_GRAPHS: ZoneRouteGraph[] = [
  berthGraph as ZoneRouteGraph,
  containerWestGraph as ZoneRouteGraph,
  containerCenterGraph as ZoneRouteGraph,
  cfsEastGraph as ZoneRouteGraph,
  technicalGraph as ZoneRouteGraph,
  gateGraph as ZoneRouteGraph,
];

const ZONE_GRAPH_MAP = new Map<string, ZoneRouteGraph>(
  ALL_ZONE_ROUTE_GRAPHS.map((graph) => [graph.zoneId, graph])
);

/**
 * Returns all canonical route graphs across the 6 presentation zones.
 */
export function getAllRouteGraphs(): ZoneRouteGraph[] {
  return ALL_ZONE_ROUTE_GRAPHS;
}

/**
 * Retrieves the route graph for a specific presentation zone ID.
 */
export function getZoneRouteGraph(zoneId: string): ZoneRouteGraph | undefined {
  return ZONE_GRAPH_MAP.get(zoneId);
}

/**
 * Resolves which route graph and primary access node correspond to a given meter ID.
 */
export function getRouteGraphForMeter(meterId: string): { graph: ZoneRouteGraph; accessNodeId: string } | undefined {
  for (const graph of ALL_ZONE_ROUTE_GRAPHS) {
    if (graph.meterAccess && graph.meterAccess[meterId]) {
      return {
        graph,
        accessNodeId: graph.meterAccess[meterId],
      };
    }
  }
  return undefined;
}

/**
 * Finds a specific node inside a route graph by ID.
 */
export function getRouteNode(graph: ZoneRouteGraph, nodeId: string): RouteNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/**
 * Computes Euclidean distance between two canonical points.
 */
export function calculateEuclideanDistance(p1: CanonicalPoint, p2: CanonicalPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Resolves deterministic edge weight (Euclidean distance unless explicitly configured).
 */
export function getEdgeWeight(
  _graph: ZoneRouteGraph,
  fromNode: RouteNode,
  toNode: RouteNode,
  edge?: RouteEdge
): number {
  if (edge && edge.weight !== undefined && edge.weight > 0) {
    return edge.weight;
  }
  return calculateEuclideanDistance(fromNode.canonical, toNode.canonical);
}
