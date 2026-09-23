/**
 * Saigon Port Map V2 — Simulation Data Adapter
 * Combines simulation identity, B2 topology, zone relationships,
 * and live operational overview state without mutating frozen B2 geometry.
 *
 * Implements Section 21: buildUnifiedSimulationState()
 */

import { LAYOUT_B2 } from '../utilityDemoLayout';
import { getUnifiedUtilityNetworks, buildUnifiedSimulationNodes } from './utilityRegistry';
import { getActiveSimulationMeters } from './meterRegistry';
import { buildUnifiedSimulationRelationships } from './simulationRelationships';
import { buildUnifiedPeople } from './peopleRegistry';
import { validateUnifiedSimulationInfrastructure } from './simulationValidation';
import {
  UnifiedSimulationState,
  UnifiedSimulationMeter,
} from './types';
import type { MapMeterOut, OperationalZoneOut } from '../../../types';
import type { MapV2Employee } from '../employeeDataAdapter';

export interface BuildSimulationStateParams {
  operationalMeters?: MapMeterOut[];
  liveEmployees?: MapV2Employee[];
  demoEmployees?: MapV2Employee[];
  operationalZones?: OperationalZoneOut[];
}

/**
 * Builds a deterministic UnifiedSimulationState combining static B2 simulation
 * contracts with live operational runtime data.
 */
export function buildUnifiedSimulationState(
  params: BuildSimulationStateParams = {}
): UnifiedSimulationState {
  const {
    operationalMeters = [],
    liveEmployees = [],
    demoEmployees = [],
  } = params;

  const networks = getUnifiedUtilityNetworks();
  const nodes = buildUnifiedSimulationNodes();
  const edges = [...LAYOUT_B2.edges];

  // Correlate live operational readings with active simulation meters
  const opMap = new Map<string, MapMeterOut>();
  for (const om of operationalMeters) {
    if (om.meter_code) {
      opMap.set(om.meter_code, om);
    }
  }

  const meters: UnifiedSimulationMeter[] = getActiveSimulationMeters().map((simMeter) => {
    const liveMatch = opMap.get(simMeter.meterCode);
    if (!liveMatch) {
      return simMeter;
    }

    return {
      ...simMeter,
      meterId: liveMatch.id,
      name: liveMatch.name || simMeter.name,
      operational: {
        roundId: null,
        latestReading: liveMatch.latest_reading_value || null,
        readingStatus: liveMatch.semantic_state || null,
        readingTime: liveMatch.latest_reading_time || null,
      },
    };
  });

  const people = buildUnifiedPeople(liveEmployees, demoEmployees);
  const relationships = buildUnifiedSimulationRelationships();
  const validation = validateUnifiedSimulationInfrastructure();

  return {
    networks,
    nodes,
    edges,
    meters,
    people,
    relationships,
    validation,
  };
}
