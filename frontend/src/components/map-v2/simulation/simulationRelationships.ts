/**
 * Saigon Port Map V2 — Simulation Relationship Engine
 * Single source of truth for:
 * 1. Meter -> Host Node lookup
 * 2. Host Node -> Meter reverse lookup
 * 3. Meter -> Network lookup
 * 4. Meter -> Zone lookup
 * 5. Meter -> Upstream Network Source Trace (reusing UtilityTopologyGraph)
 *
 * INVARIANTS:
 * - Exactly 12 active simulation meters have host relationships.
 * - CT-* legacy meters NEVER resolve to any active B2 host node or network.
 * - Reuses existing UtilityTopologyGraph engine — NO duplicated graph traversal logic.
 */

import { ACTIVE_SIMULATION_METERS } from './meterRegistry';
import {
  ELECTRICITY_NETWORK_ID,
  WATER_NETWORK_ID,
  buildUnifiedSimulationNodes,
} from './utilityRegistry';
import {
  MeterNetworkPathResult,
  UnifiedSimulationRelationships,
  UnifiedSimulationNode,
  UtilityKind,
} from './types';
import { UtilityTopologyGraph } from '../utilityNetworkGraph';
import { LAYOUT_B2 } from '../utilityDemoLayout';

// Build bidirectional lookup maps once as canonical cache
const METER_TO_HOST = new Map<string, string>();
const HOST_TO_METER = new Map<string, string>();
const METER_TO_NETWORK = new Map<string, string>();
const METER_TO_UTILITY = new Map<string, UtilityKind>();
const METER_TO_ZONE = new Map<
  string,
  { presentationZoneId: string | null; businessZoneId: string | null }
>();

for (const m of ACTIVE_SIMULATION_METERS) {
  if (m.hostNodeId) {
    METER_TO_HOST.set(m.meterCode, m.hostNodeId);
    HOST_TO_METER.set(m.hostNodeId, m.meterCode);
  }
  if (m.networkId) {
    METER_TO_NETWORK.set(m.meterCode, m.networkId);
  }
  METER_TO_UTILITY.set(m.meterCode, m.utility);
  METER_TO_ZONE.set(m.meterCode, {
    presentationZoneId: m.presentationZoneId,
    businessZoneId: m.businessZoneId,
  });
}

/**
 * Returns host node ID for an active simulation meter code.
 * Returns null for legacy meters or unknown codes.
 */
export function getMeterHostNodeId(meterCode: string): string | null {
  return METER_TO_HOST.get(meterCode) || null;
}

/**
 * Returns hosted meter code for a B2 network node ID.
 * Returns null if node is not a meter host.
 */
export function getHostNodeMeterCode(nodeId: string): string | null {
  return HOST_TO_METER.get(nodeId) || null;
}

/**
 * Returns the network ID ('SIM-ELECTRICITY-B2' | 'SIM-WATER-B2') for a meter code.
 */
export function getMeterNetworkId(meterCode: string): string | null {
  return METER_TO_NETWORK.get(meterCode) || null;
}

/**
 * Returns the utility kind ('ELECTRICITY' | 'WATER') for a meter code.
 */
export function getMeterUtility(meterCode: string): UtilityKind | null {
  return METER_TO_UTILITY.get(meterCode) || null;
}

/**
 * Returns presentation and business zone identifiers for a meter code.
 */
export function getMeterZone(
  meterCode: string
): { presentationZoneId: string | null; businessZoneId: string | null } | null {
  return METER_TO_ZONE.get(meterCode) || null;
}

// Lazy-instantiated canonical graphs for trace resolution
let cachedElecGraph: UtilityTopologyGraph | null = null;
let cachedWaterGraph: UtilityTopologyGraph | null = null;

function getCanonicalElecGraph(): UtilityTopologyGraph {
  if (!cachedElecGraph) {
    cachedElecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
  }
  return cachedElecGraph;
}

function getCanonicalWaterGraph(): UtilityTopologyGraph {
  if (!cachedWaterGraph) {
    cachedWaterGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'WATER');
  }
  return cachedWaterGraph;
}

/**
 * Resolves full upstream topological path from a simulation meter to its network source.
 * Reuses UtilityTopologyGraph without duplicate path maps.
 */
export function resolveMeterNetworkPath(
  meterCode: string,
  customElecGraph?: UtilityTopologyGraph,
  customWaterGraph?: UtilityTopologyGraph
): MeterNetworkPathResult | null {
  const hostNodeId = getMeterHostNodeId(meterCode);
  if (!hostNodeId) return null;

  const utility = getMeterUtility(meterCode);
  if (!utility) return null;

  const isElec = utility === 'ELECTRICITY';
  const networkId = isElec ? ELECTRICITY_NETWORK_ID : WATER_NETWORK_ID;
  const graph = isElec
    ? customElecGraph || getCanonicalElecGraph()
    : customWaterGraph || getCanonicalWaterGraph();

  const trace = graph.resolveTracePath(meterCode);
  if (!trace) return null;

  return {
    meterCode,
    hostNodeId,
    networkId,
    utility,
    sourceNodeId: trace.sourceNodeId,
    orderedNodeIds: trace.pathNodeIds,
    orderedEdgeIds: trace.pathEdgeIds,
    totalHops: trace.pathEdgeIds.length,
  };
}

/**
 * Builds all unified simulation relationships for the current model.
 */
export function buildUnifiedSimulationRelationships(
  elecGraph?: UtilityTopologyGraph,
  waterGraph?: UtilityTopologyGraph
): UnifiedSimulationRelationships {
  const nodes = buildUnifiedSimulationNodes();
  const hostToNode = new Map<string, UnifiedSimulationNode>();
  for (const n of nodes) {
    if (n.isMeterHost) {
      hostToNode.set(n.id, n);
    }
  }

  const meterNetworkPaths = new Map<string, MeterNetworkPathResult>();
  for (const m of ACTIVE_SIMULATION_METERS) {
    const path = resolveMeterNetworkPath(m.meterCode, elecGraph, waterGraph);
    if (path) {
      meterNetworkPaths.set(m.meterCode, path);
    }
  }

  return {
    meterToHost: new Map(METER_TO_HOST),
    hostToMeter: new Map(HOST_TO_METER),
    meterToNetwork: new Map(METER_TO_NETWORK),
    meterToZone: new Map(METER_TO_ZONE),
    hostToNode,
    meterNetworkPaths,
  };
}
