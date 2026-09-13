/**
 * RouteValidation — Canonical Route Graph Specification & Integrity Validator (V15B)
 *
 * Implements Section 21 & Section 28 verification gates:
 * - Zone ID, mapVersion, and coordinateSystem checks
 * - Node canonical coordinate bounds [0, 1915] x [0, 821]
 * - Graph topological integrity (no dangling edges, no duplicates)
 * - Operator start node existence and reachability
 * - 12/12 meter access mapping and 22-40px physical clearance
 */

import { ZoneRouteGraph, RouteNode } from './RouteTypes';
import { calculateEuclideanDistance } from './ZoneRouteGraph';
import { RoutePlanner } from './RoutePlanner';
import { CANONICAL_12_METERS_AUDIT, CANONICAL_SCENE_WIDTH, CANONICAL_SCENE_HEIGHT } from '../../geometry/canonicalScene';

export interface RouteValidationIssue {
  severity: 'error' | 'warning';
  zoneId: string;
  field: string;
  message: string;
}

export interface RouteValidationResult {
  valid: boolean;
  issues: RouteValidationIssue[];
  zoneStats: {
    zoneId: string;
    nodeCount: number;
    edgeCount: number;
    meterCount: number;
  }[];
}

/**
 * Validates an individual ZoneRouteGraph against canonical spatial rules.
 */
export function validateZoneRouteGraph(
  graph: ZoneRouteGraph,
  bounds = { width: CANONICAL_SCENE_WIDTH, height: CANONICAL_SCENE_HEIGHT }
): RouteValidationIssue[] {
  const issues: RouteValidationIssue[] = [];

  if (!graph.zoneId) {
    issues.push({ severity: 'error', zoneId: graph.zoneId || 'unknown', field: 'zoneId', message: 'Zone ID missing' });
  }

  if (graph.mapVersion !== 'tan-thuan-v10') {
    issues.push({
      severity: 'error',
      zoneId: graph.zoneId,
      field: 'mapVersion',
      message: `Invalid mapVersion "${graph.mapVersion}", expected "tan-thuan-v10"`,
    });
  }

  if (graph.coordinateSystem !== 'tan-thuan-canonical-image-pixel-space-v1') {
    issues.push({
      severity: 'error',
      zoneId: graph.zoneId,
      field: 'coordinateSystem',
      message: `Invalid coordinateSystem "${graph.coordinateSystem}"`,
    });
  }

  // Check unique node IDs and bounds
  const nodeIds = new Set<string>();
  const nodeMap = new Map<string, RouteNode>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        severity: 'error',
        zoneId: graph.zoneId,
        field: 'nodes',
        message: `Duplicate node ID "${node.id}"`,
      });
    }
    nodeIds.add(node.id);
    nodeMap.set(node.id, node);

    if (
      node.canonical.x < 0 ||
      node.canonical.x > bounds.width ||
      node.canonical.y < 0 ||
      node.canonical.y > bounds.height
    ) {
      issues.push({
        severity: 'error',
        zoneId: graph.zoneId,
        field: 'canonical',
        message: `Node "${node.id}" at (${node.canonical.x}, ${node.canonical.y}) out of canonical bounds [0, ${bounds.width}] x [0, ${bounds.height}]`,
      });
    }
  }

  // Check operator start node
  if (!graph.operatorStartNodeId) {
    issues.push({
      severity: 'error',
      zoneId: graph.zoneId,
      field: 'operatorStartNodeId',
      message: 'Missing operatorStartNodeId',
    });
  } else if (!nodeMap.has(graph.operatorStartNodeId)) {
    issues.push({
      severity: 'error',
      zoneId: graph.zoneId,
      field: 'operatorStartNodeId',
      message: `operatorStartNodeId "${graph.operatorStartNodeId}" does not exist in nodes`,
    });
  }

  // Check edges
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        severity: 'error',
        zoneId: graph.zoneId,
        field: 'edges',
        message: `Duplicate edge ID "${edge.id}"`,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeMap.has(edge.from)) {
      issues.push({
        severity: 'error',
        zoneId: graph.zoneId,
        field: 'edges',
        message: `Edge "${edge.id}" references non-existent "from" node "${edge.from}"`,
      });
    }
    if (!nodeMap.has(edge.to)) {
      issues.push({
        severity: 'error',
        zoneId: graph.zoneId,
        field: 'edges',
        message: `Edge "${edge.id}" references non-existent "to" node "${edge.to}"`,
      });
    }
  }

  // Check meter access nodes
  if (!graph.meterAccess || Object.keys(graph.meterAccess).length === 0) {
    issues.push({
      severity: 'error',
      zoneId: graph.zoneId,
      field: 'meterAccess',
      message: `No meterAccess defined for zone ${graph.zoneId}`,
    });
  } else {
    for (const [meterId, accessNodeId] of Object.entries(graph.meterAccess)) {
      if (!nodeMap.has(accessNodeId)) {
        issues.push({
          severity: 'error',
          zoneId: graph.zoneId,
          field: 'meterAccess',
          message: `Meter ${meterId} references non-existent access node "${accessNodeId}"`,
        });
      } else if (graph.operatorStartNodeId && nodeMap.has(graph.operatorStartNodeId)) {
        // Test reachability from operator start
        try {
          RoutePlanner.planRoute({
            graph,
            startNodeId: graph.operatorStartNodeId,
            targetNodeId: accessNodeId,
            meterId,
          });
        } catch (err: any) {
          issues.push({
            severity: 'error',
            zoneId: graph.zoneId,
            field: 'reachability',
            message: `Meter ${meterId} access node "${accessNodeId}" is unreachable from "${graph.operatorStartNodeId}": ${err.message}`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validates the complete set of route graphs against the authoritative 12 meters.
 */
export function validateAllRouteGraphs(
  graphs: ZoneRouteGraph[],
  canonicalMeters = CANONICAL_12_METERS_AUDIT
): RouteValidationResult {
  const allIssues: RouteValidationIssue[] = [];
  const zoneStats: RouteValidationResult['zoneStats'] = [];
  const seenMeters = new Map<string, string>(); // meterId -> zoneId

  for (const graph of graphs) {
    const issues = validateZoneRouteGraph(graph);
    allIssues.push(...issues);

    const meterCount = graph.meterAccess ? Object.keys(graph.meterAccess).length : 0;
    zoneStats.push({
      zoneId: graph.zoneId,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      meterCount,
    });

    if (graph.meterAccess) {
      for (const [meterId, accessNodeId] of Object.entries(graph.meterAccess)) {
        if (seenMeters.has(meterId)) {
          allIssues.push({
            severity: 'error',
            zoneId: graph.zoneId,
            field: 'meterAccess',
            message: `Meter ${meterId} is duplicated across zones (${seenMeters.get(meterId)} and ${graph.zoneId})`,
          });
        }
        seenMeters.set(meterId, graph.zoneId);

        // Check clearance against canonical coordinate
        const meterRecord = canonicalMeters.find((m) => m.code === meterId);
        if (!meterRecord) {
          allIssues.push({
            severity: 'error',
            zoneId: graph.zoneId,
            field: 'meterAccess',
            message: `Meter ${meterId} in route graph does not exist in canonical 12 meters`,
          });
        } else {
          const accessNode = graph.nodes.find((n) => n.id === accessNodeId);
          if (accessNode) {
            const clearance = calculateEuclideanDistance(accessNode.canonical, {
              x: meterRecord.canonicalX,
              y: meterRecord.canonicalY,
            });
            // Clearance target: 20-45px (nominal 22-40px per Section 74)
            if (clearance < 18 || clearance > 50) {
              allIssues.push({
                severity: 'warning',
                zoneId: graph.zoneId,
                field: 'clearance',
                message: `Meter ${meterId} clearance to access node is ${clearance.toFixed(1)}px (recommended 22-40px)`,
              });
            }
          }
        }
      }
    }
  }

  // Verify 12/12 meters are covered
  for (const meter of canonicalMeters) {
    if (!seenMeters.has(meter.code)) {
      allIssues.push({
        severity: 'error',
        zoneId: meter.presentationRegionId || 'unknown',
        field: 'meterAccess',
        message: `Canonical meter ${meter.code} (${meter.name}) is missing from all route graphs`,
      });
    }
  }

  const valid = allIssues.filter((i) => i.severity === 'error').length === 0;

  return {
    valid,
    issues: allIssues,
    zoneStats,
  };
}
