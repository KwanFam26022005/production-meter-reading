/**
 * Saigon Port Map V2 — Meter Registry & Legacy Isolation
 * Formalizes the 12 active simulation meters and isolates the 12 legacy CT-* meters.
 *
 * FACTUAL AUDIT (Thread 8A / 8B):
 * - 24 total meters in SQLite inventory.
 * - 12 ACTIVE SIMULATION meters (8 electricity: SIM-EM-001..008, 4 water: SIM-WM-001..004).
 * - 12 LEGACY SIMULATION meters (CT-001..012, retired from active B2 network).
 * - 0 FIELD-VERIFIED Map V2 physical coordinates.
 */

import { ACTIVE_DEMO_METERS, LAYOUT_B2_COORDS } from '../utilityDemoLayout';
import { ELECTRICITY_NETWORK_ID, WATER_NETWORK_ID } from './utilityRegistry';
import {
  UnifiedSimulationMeter,
  UtilityKind,
  MeterLifecycle,
  DataProvenance,
} from './types';

// Deterministic presentation & business zone associations for the 12 active SIM meters
const ACTIVE_METER_ZONE_MAPPING: Record<
  string,
  { presentationZoneId: string; businessZoneId: string }
> = {
  'SIM-EM-001': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
  'SIM-EM-002': { presentationZoneId: 'ZONE_QUAY', businessZoneId: 'zone-berth' },
  'SIM-EM-003': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
  'SIM-EM-004': { presentationZoneId: 'ZONE_CONTAINER', businessZoneId: 'zone-container' },
  'SIM-EM-005': { presentationZoneId: 'ZONE_CONTAINER', businessZoneId: 'zone-container' },
  'SIM-EM-006': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
  'SIM-EM-007': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
  'SIM-EM-008': { presentationZoneId: 'ZONE_CONTAINER', businessZoneId: 'zone-container' },

  'SIM-WM-001': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
  'SIM-WM-002': { presentationZoneId: 'ZONE_QUAY', businessZoneId: 'zone-berth' },
  'SIM-WM-003': { presentationZoneId: 'ZONE_CONTAINER', businessZoneId: 'zone-container' },
  'SIM-WM-004': { presentationZoneId: 'ZONE_GENERAL', businessZoneId: 'zone-warehouse' },
};

/**
 * The 12 canonical active B2 simulation meters.
 */
export const ACTIVE_SIMULATION_METERS: readonly UnifiedSimulationMeter[] = ACTIVE_DEMO_METERS.map((m) => {
  const isElec = m.utilityType === 'ELECTRICITY';
  const networkId = isElec ? ELECTRICITY_NETWORK_ID : WATER_NETWORK_ID;
  const zoneInfo = ACTIVE_METER_ZONE_MAPPING[m.meterCode] || {
    presentationZoneId: null,
    businessZoneId: null,
  };
  const coords = LAYOUT_B2_COORDS[m.hostAsset];

  return {
    meterCode: m.meterCode,
    name: m.name,
    utility: m.utilityType as UtilityKind,
    lifecycle: 'ACTIVE_SIMULATION' as MeterLifecycle,
    provenance: 'SIMULATED' as DataProvenance,
    businessZoneId: zoneInfo.businessZoneId,
    presentationZoneId: zoneInfo.presentationZoneId,
    networkId,
    hostNodeId: m.hostAsset,
    simulationCoordinate: coords
      ? {
          x: coords[0],
          y: coords[1],
          coordinateSystem: 'MAP_V2',
          provenance: 'SIMULATED',
        }
      : null,
    verifiedPhysicalCoordinate: null, // Strictly 0 verified physical coordinates on Map V2
  };
});

/**
 * The 12 legacy CT-* simulation meters.
 * Explicitly isolated: never participate in active B2 network topology or host lookups.
 */
export const LEGACY_SIMULATION_METERS: readonly UnifiedSimulationMeter[] = [
  'CT-001',
  'CT-002',
  'CT-003',
  'CT-004',
  'CT-005',
  'CT-006',
  'CT-007',
  'CT-008',
  'CT-009',
  'CT-010',
  'CT-011',
  'CT-012',
].map((code) => ({
  meterCode: code,
  name: `Công tơ kế thừa ${code}`,
  utility: 'ELECTRICITY' as UtilityKind,
  lifecycle: 'LEGACY_SIMULATION' as MeterLifecycle,
  provenance: 'LEGACY_SIMULATION' as DataProvenance,
  businessZoneId: null,
  presentationZoneId: null,
  networkId: null,
  hostNodeId: null,
  simulationCoordinate: null,
  verifiedPhysicalCoordinate: null,
}));

export function getActiveSimulationMeters(): UnifiedSimulationMeter[] {
  return [...ACTIVE_SIMULATION_METERS];
}

export function getLegacySimulationMeters(): UnifiedSimulationMeter[] {
  return [...LEGACY_SIMULATION_METERS];
}

export function getAllSimulationMeters(): UnifiedSimulationMeter[] {
  return [...ACTIVE_SIMULATION_METERS, ...LEGACY_SIMULATION_METERS];
}

export function isActiveSimulationMeter(meterCode: string): boolean {
  return ACTIVE_SIMULATION_METERS.some((m) => m.meterCode === meterCode);
}

export function isLegacySimulationMeter(meterCode: string): boolean {
  return LEGACY_SIMULATION_METERS.some((m) => m.meterCode === meterCode);
}

export function isSimulationMeter(meterCode: string): boolean {
  return isActiveSimulationMeter(meterCode) || isLegacySimulationMeter(meterCode);
}

export function getSimulationMeter(meterCode: string): UnifiedSimulationMeter | undefined {
  return getAllSimulationMeters().find((m) => m.meterCode === meterCode);
}
