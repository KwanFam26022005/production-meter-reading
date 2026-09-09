import { MapFilterOptions, MapMeterItem } from '../types';

export function filterMeters(
  meters: MapMeterItem[],
  filters: MapFilterOptions
): MapMeterItem[] {
  return meters.filter((m) => {
    // 1. Exception-only mode
    if (filters.exceptionsOnly) {
      if (m.semanticState !== 'REVIEW' && m.semanticState !== 'OVERDUE') {
        return false;
      }
    }

    // 2. Zone filter
    if (filters.zoneId && filters.zoneId !== 'ALL') {
      if (m.zoneId !== filters.zoneId) {
        return false;
      }
    }

    // 3. Status filter
    if (filters.status && filters.status !== 'ALL') {
      if (m.semanticState !== filters.status) {
        return false;
      }
    }

    // 4. Meter type filter
    if (filters.meterType && filters.meterType !== 'ALL') {
      if (m.meterType !== filters.meterType) {
        return false;
      }
    }

    // 5. Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const matchCode = m.meterCode.toLowerCase().includes(q);
      const matchName = m.name.toLowerCase().includes(q);
      const matchLoc = m.location.toLowerCase().includes(q);
      const matchZone = m.zoneName.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchLoc && !matchZone) {
        return false;
      }
    }

    return true;
  });
}
