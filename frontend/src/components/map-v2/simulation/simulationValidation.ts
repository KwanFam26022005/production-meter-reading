/**
 * Saigon Port Map V2 — Unified Simulation Infrastructure Validation Engine
 * Deterministic audit of networks, nodes, edges, meters, zones, and people.
 *
 * Implements Section 31: 17 Mandatory Validation Gates.
 */

import { LAYOUT_B2 } from '../utilityDemoLayout';
import {
  ACTIVE_SIMULATION_METERS,
  LEGACY_SIMULATION_METERS,
} from './meterRegistry';
import {
  UNIFIED_UTILITY_NETWORKS,
  ELECTRICITY_NETWORK_ID,
  WATER_NETWORK_ID,
} from './utilityRegistry';
import {
  getMeterHostNodeId,
  getHostNodeMeterCode,
  resolveMeterNetworkPath,
} from './simulationRelationships';
import {
  UnifiedSimulationValidationResult,
  UnifiedSimulationValidationMetrics,
} from './types';

const MAP_WIDTH = 1536;
const MAP_HEIGHT = 1024;
const FROZEN_CROSSING = { x: 740, y: 520 };

export function validateUnifiedSimulationInfrastructure(): UnifiedSimulationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodes = LAYOUT_B2.nodes;
  const edges = LAYOUT_B2.edges;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(edges.map((e) => [e.id, e]));

  // GATE 1: Every network has exactly one source
  for (const net of UNIFIED_UTILITY_NETWORKS) {
    if (net.id !== ELECTRICITY_NETWORK_ID && net.id !== WATER_NETWORK_ID) {
      errors.push(`Gate 1 Failed: Unexpected network ID ${net.id}`);
    }
    const netNodes = nodes.filter((n) =>
      net.utility === 'ELECTRICITY' ? n.utilityType === 'ELECTRICITY' : n.utilityType === 'WATER'
    );
    const sourceNodes = netNodes.filter((n) => n.isSource);
    if (sourceNodes.length !== 1) {
      errors.push(`Gate 1 Failed: Network ${net.id} has ${sourceNodes.length} source nodes (expected 1).`);
    } else if (sourceNodes[0].id !== net.sourceNodeId) {
      errors.push(`Gate 1 Failed: Network ${net.id} source ID mismatch: ${sourceNodes[0].id} vs ${net.sourceNodeId}.`);
    }
  }

  // GATE 2: Every active simulation meter has exactly one host
  for (const m of ACTIVE_SIMULATION_METERS) {
    const hostId = getMeterHostNodeId(m.meterCode);
    if (!hostId) {
      errors.push(`Gate 2 Failed: Active simulation meter ${m.meterCode} has no host node.`);
    }
  }

  // GATE 3: Electricity meters only attach to electricity nodes
  for (const m of ACTIVE_SIMULATION_METERS.filter((x) => x.utility === 'ELECTRICITY')) {
    const hostId = getMeterHostNodeId(m.meterCode);
    if (hostId) {
      const hostNode = nodeMap.get(hostId);
      if (!hostNode) {
        errors.push(`Gate 3 Failed: Host node ${hostId} for meter ${m.meterCode} does not exist.`);
      } else if (hostNode.utilityType !== 'ELECTRICITY') {
        errors.push(`Gate 3 Failed: Electricity meter ${m.meterCode} attached to ${hostNode.utilityType} node ${hostId}.`);
      }
    }
  }

  // GATE 4: Water meters only attach to water nodes
  for (const m of ACTIVE_SIMULATION_METERS.filter((x) => x.utility === 'WATER')) {
    const hostId = getMeterHostNodeId(m.meterCode);
    if (hostId) {
      const hostNode = nodeMap.get(hostId);
      if (!hostNode) {
        errors.push(`Gate 4 Failed: Host node ${hostId} for meter ${m.meterCode} does not exist.`);
      } else if (hostNode.utilityType !== 'WATER') {
        errors.push(`Gate 4 Failed: Water meter ${m.meterCode} attached to ${hostNode.utilityType} node ${hostId}.`);
      }
    }
  }

  // GATE 5: Every host node exists
  for (const m of ACTIVE_SIMULATION_METERS) {
    if (m.hostNodeId && !nodeMap.has(m.hostNodeId)) {
      errors.push(`Gate 5 Failed: Meter ${m.meterCode} references nonexistent host node ${m.hostNodeId}.`);
    }
  }

  // GATE 6: Every referenced edge exists in layout
  for (const net of UNIFIED_UTILITY_NETWORKS) {
    for (const edgeId of net.edgeIds) {
      if (!edgeMap.has(edgeId)) {
        errors.push(`Gate 6 Failed: Network ${net.id} references nonexistent edge ${edgeId}.`);
      }
    }
  }

  // GATE 7: Every edge references valid nodes
  for (const e of edges) {
    if (!nodeMap.has(e.sourceNodeId)) {
      errors.push(`Gate 7 Failed: Edge ${e.id} references nonexistent source node ${e.sourceNodeId}.`);
    }
    if (!nodeMap.has(e.targetNodeId)) {
      errors.push(`Gate 7 Failed: Edge ${e.id} references nonexistent target node ${e.targetNodeId}.`);
    }
  }

  // GATE 8: Every active meter reaches its network source
  for (const m of ACTIVE_SIMULATION_METERS) {
    const path = resolveMeterNetworkPath(m.meterCode);
    if (!path) {
      errors.push(`Gate 8 Failed: Meter ${m.meterCode} failed to resolve upstream path to source.`);
    } else {
      const expectedSource = m.utility === 'ELECTRICITY' ? 'SIM-EXT-GRID' : 'SIM-CITY-WATER';
      if (path.sourceNodeId !== expectedSource) {
        errors.push(`Gate 8 Failed: Meter ${m.meterCode} traced to source ${path.sourceNodeId} (expected ${expectedSource}).`);
      }
      if (path.orderedNodeIds.length < 2) {
        errors.push(`Gate 8 Failed: Meter ${m.meterCode} trace path has fewer than 2 nodes (${path.orderedNodeIds.length}).`);
      }
    }
  }

  // GATE 9: No active meter is graph-orphaned
  let orphanedCount = 0;
  for (const m of ACTIVE_SIMULATION_METERS) {
    const hostId = getMeterHostNodeId(m.meterCode);
    if (!hostId || !nodeMap.has(hostId)) {
      orphanedCount++;
    }
  }
  if (orphanedCount > 0) {
    errors.push(`Gate 9 Failed: ${orphanedCount} active simulation meters are graph-orphaned.`);
  }

  // GATE 10: All active meter codes are unique
  const meterCodeSet = new Set<string>();
  for (const m of ACTIVE_SIMULATION_METERS) {
    if (meterCodeSet.has(m.meterCode)) {
      errors.push(`Gate 10 Failed: Duplicate active meter code ${m.meterCode}.`);
    }
    meterCodeSet.add(m.meterCode);
  }

  // GATE 11: All network node coordinates are finite numbers
  for (const n of nodes) {
    if (!Number.isFinite(n.displayX) || !Number.isFinite(n.displayY)) {
      errors.push(`Gate 11 Failed: Node ${n.id} coordinates are non-finite: [${n.displayX}, ${n.displayY}].`);
    }
  }

  // GATE 12: All B2 coordinates are inside 1536 x 1024
  for (const n of nodes) {
    if (n.displayX < 0 || n.displayX > MAP_WIDTH || n.displayY < 0 || n.displayY > MAP_HEIGHT) {
      errors.push(`Gate 12 Failed: Node ${n.id} coordinate [${n.displayX}, ${n.displayY}] out of bounds [0..${MAP_WIDTH}, 0..${MAP_HEIGHT}].`);
    }
  }

  // GATE 13: CT-* legacy meters never enter active B2 mapping
  for (const leg of LEGACY_SIMULATION_METERS) {
    const host = getMeterHostNodeId(leg.meterCode);
    if (host !== null) {
      errors.push(`Gate 13 Failed: Legacy meter ${leg.meterCode} has host node ${host} in active B2 mapping.`);
    }
    const trace = resolveMeterNetworkPath(leg.meterCode);
    if (trace !== null) {
      errors.push(`Gate 13 Failed: Legacy meter ${leg.meterCode} resolved active trace path.`);
    }
  }

  // GATE 14: Simulated topology never receives AUTHORITATIVE provenance
  for (const net of UNIFIED_UTILITY_NETWORKS) {
    if ((net.provenance as string) === 'AUTHORITATIVE') {
      errors.push(`Gate 14 Failed: Network ${net.id} has AUTHORITATIVE provenance (must be SIMULATED).`);
    }
  }
  for (const m of ACTIVE_SIMULATION_METERS) {
    if ((m.provenance as string) === 'AUTHORITATIVE') {
      errors.push(`Gate 14 Failed: Active simulation meter ${m.meterCode} has AUTHORITATIVE provenance.`);
    }
    if (m.verifiedPhysicalCoordinate !== null) {
      errors.push(`Gate 14 Failed: Active simulation meter ${m.meterCode} has non-null verifiedPhysicalCoordinate.`);
    }
  }

  // GATE 15: Host <-> meter mappings are bijective for active hosts
  for (const m of ACTIVE_SIMULATION_METERS) {
    if (m.hostNodeId) {
      const reverseMeter = getHostNodeMeterCode(m.hostNodeId);
      if (reverseMeter !== m.meterCode) {
        errors.push(`Gate 15 Failed: Bijective mismatch for ${m.meterCode} -> ${m.hostNodeId} -> ${reverseMeter}.`);
      }
    }
  }

  // GATE 16: All cross-layer references resolve
  for (const n of nodes) {
    if (n.meterCode) {
      const activeMeter = ACTIVE_SIMULATION_METERS.find((m) => m.meterCode === n.meterCode);
      if (!activeMeter) {
        errors.push(`Gate 16 Failed: Node ${n.id} references unknown meter code ${n.meterCode}.`);
      }
    }
  }

  // GATE 17: No Map V1 coordinate is required by the unified runtime model
  for (const m of ACTIVE_SIMULATION_METERS) {
    if (m.simulationCoordinate && m.simulationCoordinate.coordinateSystem !== 'MAP_V2') {
      errors.push(`Gate 17 Failed: Meter ${m.meterCode} coordinate system is ${m.simulationCoordinate.coordinateSystem} (must be MAP_V2).`);
    }
  }

  const metrics: UnifiedSimulationValidationMetrics = {
    networkCount: UNIFIED_UTILITY_NETWORKS.length,
    activeSimulationMeterCount: ACTIVE_SIMULATION_METERS.length,
    legacySimulationMeterCount: LEGACY_SIMULATION_METERS.length,
    electricityMeterCount: ACTIVE_SIMULATION_METERS.filter((x) => x.utility === 'ELECTRICITY').length,
    waterMeterCount: ACTIVE_SIMULATION_METERS.filter((x) => x.utility === 'WATER').length,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    orphanedMeterCount: orphanedCount,
    uniqueB2Crossing: FROZEN_CROSSING,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics,
  };
}
