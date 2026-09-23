/**
 * Saigon Port Map V2 — Zone Registry & Mapping
 * Manages relationships between Map V2 presentation zones (1536x1024)
 * and SQLite operational business zones.
 *
 * INVARIANTS:
 * - Deterministic, ID-based mappings (never fuzzy Vietnamese text matching).
 * - Distinguishes visual spatial containment from operational assignment.
 * - Missing/unmapped relationships strictly return null.
 */

import { CANONICAL_MAP_V2_ZONE_MAPPING } from '../zoneMapping';

export interface CanonicalZoneInfo {
  id: string;
  label: string;
  category: 'operational_zone' | 'warehouse' | 'administration';
  businessZoneId: string;
}

export const CANONICAL_PRESENTATION_ZONES: readonly CanonicalZoneInfo[] = [
  { id: 'ZONE_QUAY', label: 'Khu cảng sà lan', category: 'operational_zone', businessZoneId: 'zone-berth' },
  { id: 'ZONE_CONTAINER', label: 'Bãi container', category: 'operational_zone', businessZoneId: 'zone-container' },
  { id: 'ZONE_GENERAL', label: 'Bãi tổng hợp', category: 'operational_zone', businessZoneId: 'zone-warehouse' },
  { id: 'ZONE_ADMIN', label: 'VP Hành chính', category: 'administration', businessZoneId: 'zone-technical' },
  { id: 'BLDG_KHO_1', label: 'Kho 1', category: 'warehouse', businessZoneId: 'zone-warehouse' },
  { id: 'BLDG_KHO_2', label: 'Kho 2', category: 'warehouse', businessZoneId: 'zone-warehouse' },
  { id: 'BLDG_KHO_4', label: 'Kho 4', category: 'warehouse', businessZoneId: 'zone-warehouse' },
];

export const BUSINESS_TO_PRESENTATION_ZONE_MAPPING: Record<string, string> = {
  'zone-berth': 'ZONE_QUAY',
  'zone-container': 'ZONE_CONTAINER',
  'zone-warehouse': 'ZONE_GENERAL',
  'zone-technical': 'ZONE_ADMIN',
};

export function resolvePresentationZoneToBusinessZone(presentationId: string): string | null {
  if (CANONICAL_MAP_V2_ZONE_MAPPING[presentationId]) {
    return CANONICAL_MAP_V2_ZONE_MAPPING[presentationId];
  }
  const match = CANONICAL_PRESENTATION_ZONES.find((z) => z.id === presentationId);
  return match ? match.businessZoneId : null;
}

export function resolveBusinessZoneToPresentationZone(businessZoneId: string): string | null {
  return BUSINESS_TO_PRESENTATION_ZONE_MAPPING[businessZoneId] || null;
}
