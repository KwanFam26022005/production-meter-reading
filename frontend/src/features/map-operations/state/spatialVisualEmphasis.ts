/**
 * V7.1 Spatial Visual Emphasis & Dimming Contract (Section 11)
 *
 * Centralizes all visual-emphasis calculations across spatial entities:
 * zones, operators, and meters.
 * No component may invent independent dimming values.
 */

import { SelectedEntity, MapMode } from './useMapStateMachine';

export interface EntityEmphasisQuery {
  mode: MapMode;
  selectedEntity: SelectedEntity;
  targetPlacementZoneId?: string;
  // Entity to evaluate
  entityType: 'zone' | 'operator' | 'meter';
  entityId: string;
  // Relationships
  zoneId?: string;           // Zone the meter or operator belongs to
  assignedOperatorId?: string; // Operator assigned to the zone or meter
  assignedZoneIds?: string[];  // Zones assigned to the operator
}

export function calculateSpatialEmphasis(query: EntityEmphasisQuery): number {
  const {
    mode,
    selectedEntity,
    targetPlacementZoneId,
    entityType,
    entityId,
    zoneId,
    assignedOperatorId,
    assignedZoneIds = [],
  } = query;

  // In browse mode with no selection: all entities full emphasis
  if (mode === 'browse' || !selectedEntity) {
    return 1.0;
  }

  // ============================================================
  // PLACEMENT MODE
  // target zone: 1.0
  // existing meters: 0.65
  // other zones: 0.15
  // operators: 0.15
  // candidate: 1.0
  // ============================================================
  if (mode === 'placement') {
    const activeZone = targetPlacementZoneId || (selectedEntity.type === 'zone' ? selectedEntity.id : '');
    if (entityType === 'zone') {
      return entityId === activeZone ? 1.0 : 0.15;
    }
    if (entityType === 'meter') {
      return zoneId === activeZone ? 0.65 : 0.20;
    }
    if (entityType === 'operator') {
      return 0.15;
    }
    return 1.0;
  }

  // ============================================================
  // ZONE INSPECT & ZONE DETAILS
  // selected zone: 1.0
  // related operator: 1.0
  // related meters: 1.0
  // other zones: 0.35
  // other operators: 0.30
  // other meters: 0.25
  // ============================================================
  if (selectedEntity.type === 'zone') {
    const selZoneId = selectedEntity.id;
    if (entityType === 'zone') {
      return entityId === selZoneId ? 1.0 : 0.35;
    }
    if (entityType === 'operator') {
      const isRelated = zoneId === selZoneId || assignedZoneIds.includes(selZoneId);
      return isRelated ? 1.0 : 0.30;
    }
    if (entityType === 'meter') {
      return zoneId === selZoneId ? 1.0 : 0.25;
    }
  }

  // ============================================================
  // OPERATOR INSPECT & OPERATOR DETAILS
  // operator: 1.0
  // assigned meters: 1.0
  // related zones: 0.60
  // other users: 0.25
  // other meters: 0.20
  // ============================================================
  if (selectedEntity.type === 'operator') {
    const selOperatorId = selectedEntity.id;
    if (entityType === 'operator') {
      return entityId === selOperatorId ? 1.0 : 0.25;
    }
    if (entityType === 'meter') {
      return assignedOperatorId === selOperatorId ? 1.0 : 0.20;
    }
    if (entityType === 'zone') {
      const isAssigned = assignedZoneIds.includes(entityId) || assignedOperatorId === selOperatorId;
      return isAssigned ? 0.60 : 0.25;
    }
  }

  // ============================================================
  // METER INSPECT & METER DETAILS
  // meter: 1.0
  // owner (operator): 0.70
  // parent zone: 0.55
  // others: 0.20–0.30
  // ============================================================
  if (selectedEntity.type === 'meter') {
    const selMeterId = selectedEntity.id;
    if (entityType === 'meter') {
      return entityId === selMeterId ? 1.0 : 0.25;
    }
    if (entityType === 'zone') {
      return entityId === zoneId ? 0.55 : 0.25;
    }
    if (entityType === 'operator') {
      return entityId === assignedOperatorId ? 0.70 : 0.25;
    }
  }

  return 1.0;
}
