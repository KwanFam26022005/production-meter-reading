import React, { useMemo } from 'react';
import { OPERATIONAL_ZONES_GEOMETRY } from '../geometry/operationalGeometry';
import { projectAllZonesOperationalState } from '../state/operationalProjection';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { OperationalZone } from './OperationalZone';

interface ZoneOperationalLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  selectedOperatorId?: string;
  onSelectZone: (zoneId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
}

export const ZoneOperationalLayer: React.FC<ZoneOperationalLayerProps> = ({
  zones,
  meters,
  selectedZoneId,
  hoveredZoneId,
  activeLayer,
  exceptionsOnly,
  selectedOperatorId,
  onSelectZone,
  onHoverZone,
}) => {
  // Pre-calculate operational state for each zone
  const operationalStates = useMemo(() => {
    return projectAllZonesOperationalState(zones, meters);
  }, [zones, meters]);

  return (
    <g className="sgp-zone-operational-layer">
      {OPERATIONAL_ZONES_GEOMETRY.map((geom) => {
        const opState = operationalStates[geom.id];
        if (!opState) return null;

        const isSelected = selectedZoneId === geom.id;
        const isHovered = hoveredZoneId === geom.id;

        // Dim logic:
        // 1. If an operator is selected and this zone is not assigned to that operator
        // 2. If exceptionsOnly is active and this zone has 0 exceptions (health === 'HEALTHY')
        let isDimmed = false;
        if (selectedOperatorId && opState.operator?.id !== selectedOperatorId) {
          isDimmed = true;
        } else if (exceptionsOnly && opState.health === 'HEALTHY') {
          isDimmed = true;
        }

        return (
          <OperationalZone
            key={geom.id}
            geometry={geom}
            operationalState={opState}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            activeLayer={activeLayer}
            onSelect={onSelectZone}
            onHover={onHoverZone}
          />
        );
      })}
    </g>
  );
};
