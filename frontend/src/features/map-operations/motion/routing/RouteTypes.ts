/**
 * RouteTypes — Canonical Operational Route Graph Type System (V15B)
 *
 * Defines the core spatial routing contracts:
 * - Route nodes following physical corridors (roads, junctions, access points)
 * - Route edges with deterministic Euclidean distance costs
 * - Canonical zone routing graphs strictly tied to the active map contract
 */

export interface CanonicalPoint {
  x: number;
  y: number;
}

export type RouteNodeType =
  | 'operator-start'
  | 'road'
  | 'junction'
  | 'meter-access'
  | 'gate'
  | 'service-point';

export interface RouteNode {
  id: string;
  zoneId: string;
  canonical: CanonicalPoint;
  type: RouteNodeType;
  label?: string;
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  bidirectional: boolean;
  weight?: number;
}

export interface ZoneRouteGraph {
  schemaVersion: string;
  mapVersion: string;
  coordinateSystem: string;
  zoneId: string;
  nodes: RouteNode[];
  edges: RouteEdge[];
  operatorStartNodeId: string;
  meterAccess: Record<string, string>; // meterId -> routeNodeId
}

export interface PlannedRoute {
  zoneId: string;
  startNodeId: string;
  targetNodeId: string;
  meterId?: string;
  nodeIds: string[];
  points: CanonicalPoint[];
  totalDistance: number;
}
