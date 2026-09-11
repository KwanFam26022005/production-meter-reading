import React, { useState } from 'react';
import type { User } from '../../../types';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapFilterOptions,
} from '../types';
import { SceneSearch, SceneFilter } from '../map-ui';

interface SceneActionHUDProps {
  meters: MapMeterItem[];
  zones: MapOperationalZone[];
  operators: User[];
  filters: MapFilterOptions;
  onApplyFilters: (filters: MapFilterOptions) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectZone: (zoneId: string) => void;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * SceneActionHUD — Left HUD for Spatial Query & Filters (Section 5 & 9)
 *
 * Houses:
 * - SceneSearch: Quick search by meter code / landmark / zone
 * - SceneFilter: Filter by operational status, zone, operator, and round
 */
export const SceneActionHUD: React.FC<SceneActionHUDProps> = ({
  meters,
  zones,
  operators,
  filters,
  onApplyFilters,
  onSelectMeter,
  onSelectZone,
  onSelectOperator,
}) => {
  const [utilitySurface, setUtilitySurface] = useState<'search' | 'filter' | null>(null);

  return (
    <div className="sgp-scene-action-hud" role="region" aria-label="Tìm kiếm và bộ lọc">
      <SceneSearch
        meters={meters}
        zones={zones}
        operators={operators}
        isOpen={utilitySurface === 'search'}
        onToggle={(open) => setUtilitySurface(open ? 'search' : null)}
        onSelectMeter={onSelectMeter}
        onSelectZone={onSelectZone}
        onSelectOperator={onSelectOperator}
      />
      <SceneFilter
        filters={filters}
        zones={zones}
        operators={operators}
        isOpen={utilitySurface === 'filter'}
        onToggle={(open) => setUtilitySurface(open ? 'filter' : null)}
        onApplyFilters={onApplyFilters}
      />
    </div>
  );
};
