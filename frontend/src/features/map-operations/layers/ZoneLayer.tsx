import React, { useMemo } from 'react';
import { SPATIAL_ZONE_PRESENTATIONS } from '../geometry/operationalGeometry';
import { projectAllZonesOperationalState } from '../state/operationalProjection';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { OperationalZone } from '../operational-map/OperationalZone';
import { calculateSpatialEmphasis } from '../state/spatialVisualEmphasis';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';

interface ZoneLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  exceptionFocus?: boolean;
  selectedOperatorId?: string;
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  onSelectZone: (zoneId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
}

/**
 * ZoneLayer — 6-Zone Spatial Operations Layer (V7 Visual Contract)
 *
 * Renders the 6 approved presentation zones matching tan-thuan-approved-zoning.png:
 * 1. Cầu cảng (Blue/cyan)
 * 2. Bãi container phía Tây (Orange)
 * 3. Bãi container trung tâm (Coral/red)
 * 4. Kho / CFS phía Đông (Yellow)
 * 5. Khu kỹ thuật / Dịch vụ (Teal/green)
 * 6. Cổng chính (Purple)
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
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
  onSelectZone,
  onHoverZone,
}) => {
  const operationalStates = useMemo(() => {
    return projectAllZonesOperationalState(zones, meters);
  }, [zones, meters]);

  // Active entity for emphasis resolution
  const activeSelectedEntity = selectedEntity || (
    selectedZoneId
      ? { type: 'zone' as const, id: selectedZoneId }
      : selectedOperatorId
      ? { type: 'operator' as const, id: selectedOperatorId }
      : null
  );

  return (
    <g className="sgp-zone-layer" aria-label="Lớp khu vực tác nghiệp">
      {SPATIAL_ZONE_PRESENTATIONS.map((geom) => {
        const opState = operationalStates[geom.presentationId] || operationalStates[geom.businessZoneId];
        if (!opState) return null;

        const isSelected =
          activeSelectedEntity?.type === 'zone'
            ? activeSelectedEntity.id === geom.presentationId || activeSelectedEntity.id === geom.businessZoneId
            : selectedZoneId === geom.presentationId || selectedZoneId === geom.businessZoneId;
        const isHovered =
          hoveredZoneId === geom.presentationId || hoveredZoneId === geom.businessZoneId;

        const emphasis = calculateSpatialEmphasis({
          mode,
          selectedEntity: activeSelectedEntity,
          targetPlacementZoneId,
          entityType: 'zone',
          entityId: geom.presentationId,
          zoneId: geom.presentationId,
          assignedOperatorId: opState?.operator?.id,
          assignedZoneIds: opState?.operator ? [geom.presentationId] : [],
        });

        // Dim logic per V7 Visual Contract
        let isDimmed = emphasis < 0.5;
        if (selectedOperatorId && opState.operator?.id !== selectedOperatorId) {
          isDimmed = true;
        } else if ((exceptionsOnly || exceptionFocus) && opState.health === 'HEALTHY' && !isSelected) {
          isDimmed = true;
        }

        return (
          <OperationalZone
            key={geom.presentationId}
            geometry={geom}
            operationalState={opState}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            activeLayer={activeLayer}
            onSelect={(id) => onSelectZone(id)}
            onHover={onHoverZone}
          />
        );
      })}
    </g>
  );
};
