/**
 * Saigon Port Map V2 — Utility Network Registry
 * Formalizes B2 electricity and water networks as auditable simulation entities.
 *
 * CANONICAL REPOSITORY TRUTH:
 * - Electricity: 11 nodes, 10 edges, source SIM-EXT-GRID, 8 active SIM meters
 * - Water: 6 nodes, 5 edges, source SIM-CITY-WATER, 4 active SIM meters
 * - Coordinates: referenced directly from frozen LAYOUT_B2 (NO duplicated coordinate arrays)
 */

import { LAYOUT_B2, UtilityDisplayNode } from '../utilityDemoLayout';
import {
  UnifiedUtilityNetwork,
  UnifiedSimulationNode,
  UtilityKind,
  SimulationNodeRole,
} from './types';

export const ELECTRICITY_NETWORK_ID = 'SIM-ELECTRICITY-B2';
export const WATER_NETWORK_ID = 'SIM-WATER-B2';

export const SIM_ELECTRICITY_B2_NETWORK: UnifiedUtilityNetwork = {
  id: ELECTRICITY_NETWORK_ID,
  name: 'Mạng điện mô phỏng B2',
  utility: 'ELECTRICITY',
  provenance: 'SIMULATED',
  sourceNodeId: 'SIM-EXT-GRID',
  nodeIds: [
    'SIM-EXT-GRID',
    'SIM-SS-01',
    'SIM-TR-01',
    'SIM-MDB-01',
    'SIM-FDR-TECH',
    'SIM-FDR-WEST',
    'SIM-YDB-W01',
    'SIM-FDR-BERTH',
    'SIM-FDR-CENTER',
    'SIM-YDB-C01',
    'SIM-FDR-CFS',
  ],
  edgeIds: [
    'E-B2-01',
    'E-B2-02',
    'E-B2-03',
    'E-B2-04',
    'E-B2-05',
    'E-B2-06',
    'E-B2-07',
    'E-B2-08',
    'E-B2-09',
    'E-B2-10',
  ],
  description: 'Hệ thống tiếp nhận 110kV EVN và phân phối nội bộ Cảng Tân Thuận (Mô phỏng B2)',
};

export const SIM_WATER_B2_NETWORK: UnifiedUtilityNetwork = {
  id: WATER_NETWORK_ID,
  name: 'Mạng nước mô phỏng B2',
  utility: 'WATER',
  provenance: 'SIMULATED',
  sourceNodeId: 'SIM-CITY-WATER',
  nodeIds: [
    'SIM-CITY-WATER',
    'SIM-WIN-01',
    'SIM-WJ-01',
    'SIM-FP-01',
    'SIM-WP-B01',
    'SIM-WP-CFS-01',
  ],
  edgeIds: [
    'W-B2-01',
    'W-B2-02',
    'W-B2-03',
    'W-B2-04',
    'W-B2-05',
  ],
  description: 'Hệ thống tiếp nhận Sawaco và mạng phân phối cấp nước, PCCC Cảng Tân Thuận (Mô phỏng B2)',
};

export const UNIFIED_UTILITY_NETWORKS: readonly UnifiedUtilityNetwork[] = [
  SIM_ELECTRICITY_B2_NETWORK,
  SIM_WATER_B2_NETWORK,
];

export function getUnifiedUtilityNetworks(): UnifiedUtilityNetwork[] {
  return [...UNIFIED_UTILITY_NETWORKS];
}

export function getUnifiedUtilityNetwork(id: string): UnifiedUtilityNetwork | undefined {
  return UNIFIED_UTILITY_NETWORKS.find((n) => n.id === id);
}

export function getUnifiedUtilityNetworkByKind(kind: UtilityKind): UnifiedUtilityNetwork {
  if (kind === 'ELECTRICITY') return SIM_ELECTRICITY_B2_NETWORK;
  return SIM_WATER_B2_NETWORK;
}

export function mapNodeRole(node: UtilityDisplayNode): SimulationNodeRole {
  if (node.isSource) return 'SOURCE';
  if (node.meterCode) return 'METER_HOST';
  if (node.isDistributionNode) return 'DISTRIBUTION';
  return 'BRANCH';
}

/**
 * Builds canonical simulation node records from the frozen B2 layout.
 * References geometry from LAYOUT_B2 without duplicating coordinate values.
 */
export function buildUnifiedSimulationNodes(): UnifiedSimulationNode[] {
  return LAYOUT_B2.nodes.map((n) => {
    const networkId = n.utilityType === 'ELECTRICITY' ? ELECTRICITY_NETWORK_ID : WATER_NETWORK_ID;
    const role = mapNodeRole(n);

    return {
      id: n.id,
      label: n.label,
      utility: n.utilityType as UtilityKind,
      role,
      networkId,
      zoneId: n.zoneId,
      hostedMeterCode: n.meterCode || null,
      isSource: n.isSource,
      isMeterHost: !!n.meterCode,
      depth: n.depth,
      provenance: 'SIMULATED',
      coordinates: {
        x: n.displayX,
        y: n.displayY,
        coordinateSystem: 'MAP_V2',
        provenance: 'SIMULATED',
      },
    };
  });
}
