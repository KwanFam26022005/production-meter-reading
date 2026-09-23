/**
 * Saigon Port Map V2 — People Model Integration
 * Unifies the two personnel models while strictly preserving their semantic separation:
 * 1. REAL_ZONE_ASSIGNEE: Real operational backend assignment, stationary at zone anchor, NEVER GPS.
 * 2. DEMO_ANIMATED_ASSIGNEE: Illustrative zone motion, geometry-safe path, NEVER GPS.
 */

import { MapV2Employee, MAP_V2_EMPLOYEE_DISCLOSURE_TEXT, MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT } from '../employeeDataAdapter';
import { UnifiedMapPerson, MapPersonKind, DataProvenance } from './types';

export function adaptLiveEmployeeToUnifiedPerson(emp: MapV2Employee): UnifiedMapPerson {
  return {
    id: emp.id,
    code: emp.code,
    name: emp.name,
    kind: 'REAL_ZONE_ASSIGNEE' as MapPersonKind,
    zoneId: emp.zoneId,
    zoneLabel: emp.zoneLabel,
    roleTitle: emp.roleTitle,
    dutyLabel: emp.dutyLabel,
    provenance: 'AUTHORITATIVE' as DataProvenance,
    movementMode: 'STATIONARY',
    isStationary: true,
    isDemo: false,
    avatarInitials: emp.avatarInitials,
    shiftNotes: emp.shiftNotes,
    zoneMeterSummary: emp.zoneMeterSummary,
    coordinates: emp.coordinates,
    disclosure: MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT,
  };
}

export function adaptDemoEmployeeToUnifiedPerson(emp: MapV2Employee): UnifiedMapPerson {
  return {
    id: emp.id,
    code: emp.code,
    name: emp.name,
    kind: 'DEMO_ANIMATED_ASSIGNEE' as MapPersonKind,
    zoneId: emp.zoneId,
    zoneLabel: emp.zoneLabel,
    roleTitle: emp.roleTitle,
    dutyLabel: emp.dutyLabel,
    provenance: 'SIMULATED' as DataProvenance,
    movementMode: 'SIMULATED_ZONE_PATH',
    isStationary: false,
    isDemo: true,
    avatarInitials: emp.avatarInitials,
    shiftNotes: emp.shiftNotes,
    zoneMeterSummary: emp.zoneMeterSummary,
    coordinates: emp.coordinates,
    disclosure: MAP_V2_EMPLOYEE_DISCLOSURE_TEXT,
  };
}

export function buildUnifiedPeople(
  liveEmployees: MapV2Employee[] = [],
  demoEmployees: MapV2Employee[] = []
): UnifiedMapPerson[] {
  const result: UnifiedMapPerson[] = [];

  for (const emp of liveEmployees) {
    result.push(adaptLiveEmployeeToUnifiedPerson(emp));
  }
  for (const emp of demoEmployees) {
    result.push(adaptDemoEmployeeToUnifiedPerson(emp));
  }

  return result;
}
