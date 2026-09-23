/**
 * Saigon Port Map V2 — Unified Simulation Infrastructure Domain Model
 * Types & Contracts
 *
 * CRITICAL INVARIANTS:
 * 1. SIMULATED coordinates and topologies are never marked as AUTHORITATIVE physical field coordinates.
 * 2. Real zone assignees (REAL_ZONE_ASSIGNEE) remain stationary and truthful (NEVER GPS).
 * 3. Demo animated personnel (DEMO_ANIMATED_ASSIGNEE) remain explicitly simulated zone paths (NEVER GPS).
 * 4. Active simulation meters (12 total: 8 electricity, 4 water) are strictly partitioned from legacy CT-* meters.
 * 5. B2 presentation geometry (1536x1024) remains frozen.
 */

export type DataProvenance =
  | 'AUTHORITATIVE'
  | 'DERIVED'
  | 'SIMULATED'
  | 'LEGACY_SIMULATION';

export type UtilityKind =
  | 'ELECTRICITY'
  | 'WATER';

export type MeterLifecycle =
  | 'ACTIVE_SIMULATION'
  | 'LEGACY_SIMULATION'
  | 'FIELD_VERIFIED';

export type SimulationNodeRole =
  | 'SOURCE'
  | 'DISTRIBUTION'
  | 'BRANCH'
  | 'METER_HOST';

export interface UnifiedUtilityNetwork {
  id: string; // e.g. 'SIM-ELECTRICITY-B2' | 'SIM-WATER-B2'
  name: string;
  utility: UtilityKind;
  provenance: 'SIMULATED';
  sourceNodeId: string;
  nodeIds: string[];
  edgeIds: string[];
  description: string;
}

export interface UnifiedSimulationNode {
  id: string;
  label: string;
  utility: UtilityKind;
  role: SimulationNodeRole;
  networkId: string;
  zoneId: string;
  hostedMeterCode: string | null;
  isSource: boolean;
  isMeterHost: boolean;
  depth: number;
  provenance: 'SIMULATED';
  coordinates: {
    x: number;
    y: number;
    coordinateSystem: 'MAP_V2';
    provenance: 'SIMULATED';
  };
}

export interface UnifiedSimulationMeter {
  meterId?: string; // Database UUID if correlated from live operational overview
  meterCode: string;
  name: string;
  utility: UtilityKind;
  lifecycle: MeterLifecycle;
  provenance: DataProvenance;
  businessZoneId: string | null;
  presentationZoneId: string | null;
  networkId: string | null;
  hostNodeId: string | null;
  simulationCoordinate?: {
    x: number;
    y: number;
    coordinateSystem: 'MAP_V2';
    provenance: 'SIMULATED';
  } | null;
  verifiedPhysicalCoordinate?: {
    x: number;
    y: number;
    coordinateSystem: 'MAP_V2';
    provenance: 'AUTHORITATIVE';
  } | null;
  operational?: {
    roundId?: string | null;
    latestReading?: string | number | null;
    readingStatus?: string | null;
    readingTime?: string | null;
  };
}

export type MapPersonKind =
  | 'REAL_ZONE_ASSIGNEE'
  | 'DEMO_ANIMATED_ASSIGNEE';

export interface UnifiedMapPerson {
  id: string;
  code: string;
  name: string;
  kind: MapPersonKind;
  zoneId: string;
  zoneLabel: string;
  roleTitle: string;
  dutyLabel: string;
  provenance: DataProvenance;
  movementMode: 'STATIONARY' | 'SIMULATED_ZONE_PATH';
  isStationary: boolean;
  isDemo: boolean;
  avatarInitials: string;
  shiftNotes?: string;
  zoneMeterSummary?: string;
  coordinates?: [number, number];
  disclosure: string;
}

export interface MeterNetworkPathResult {
  meterCode: string;
  hostNodeId: string;
  networkId: string;
  utility: UtilityKind;
  sourceNodeId: string;
  orderedNodeIds: string[];
  orderedEdgeIds: string[];
  totalHops: number;
}

export interface UnifiedSimulationRelationships {
  meterToHost: Map<string, string>;
  hostToMeter: Map<string, string>;
  meterToNetwork: Map<string, string>;
  meterToZone: Map<string, { presentationZoneId: string | null; businessZoneId: string | null }>;
  hostToNode: Map<string, UnifiedSimulationNode>;
  meterNetworkPaths: Map<string, MeterNetworkPathResult>;
}

export interface UnifiedSimulationValidationMetrics {
  networkCount: number;
  activeSimulationMeterCount: number;
  legacySimulationMeterCount: number;
  electricityMeterCount: number;
  waterMeterCount: number;
  nodeCount: number;
  edgeCount: number;
  orphanedMeterCount: number;
  uniqueB2Crossing: { x: number; y: number };
}

export interface UnifiedSimulationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: UnifiedSimulationValidationMetrics;
}

export interface UnifiedSimulationState {
  networks: UnifiedUtilityNetwork[];
  nodes: UnifiedSimulationNode[];
  edges: any[];
  meters: UnifiedSimulationMeter[];
  people: UnifiedMapPerson[];
  relationships: UnifiedSimulationRelationships;
  validation: UnifiedSimulationValidationResult;
}
