import React, { useMemo } from 'react';
import { OPERATIONAL_ZONES_GEOMETRY } from '../geometry/operationalGeometry';
import { projectAllZonesOperationalState } from '../state/operationalProjection';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { OperationalZone } from '../operational-map/OperationalZone';

interface ZoneLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  exceptionFocus?: boolean;
  selectedOperatorId?: string;
  onSelectZone: (zoneId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
}

/**
 * ZoneLayer — Operational Zone Polygons Overlay
 *
 * Renders calibrated operational boundaries directly over the canonical base map:
 * - Almost transparent fill and quiet stroke by default to let the physical scene shine
 * - Hover / Selection highlights zone with crisp cyan/navy edge
 * - Semantic Attention (amber) and Critical (red) edge accents for operational exceptions
 * - Exception capsule badges (⚠️ N)
 */
export const ZoneLayer: React.FC<ZoneLayerProps> = ({
  zones,
  meters,
  selectedZoneId,
  hoveredZoneId,
  activeLayer,
  exceptionsOnly,
  exceptionFocus = false,
  selectedOperatorId,
  onSelectZone,
  onHoverZone,
}) => {
  const operationalStates = useMemo(() => {
    return projectAllZonesOperationalState(zones, meters);
  }, [zones, meters]);

  return (
    <g className="sgp-zone-layer" aria-label="Lớp khu vực tác nghiệp">
      {OPERATIONAL_ZONES_GEOMETRY.map((geom) => {
        const opState = operationalStates[geom.id];
        if (!opState) return null;

        const isSelected = selectedZoneId === geom.id;
        const isHovered = hoveredZoneId === geom.id;

        // Dim logic:
        let isDimmed = Boolean(selectedZoneId && selectedZoneId !== geom.id);
        if (selectedOperatorId && opState.operator?.id !== selectedOperatorId) {
          isDimmed = true;
        } else if ((exceptionsOnly || exceptionFocus) && opState.health === 'HEALTHY') {
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
