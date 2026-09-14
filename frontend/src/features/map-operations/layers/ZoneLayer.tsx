import React, { useMemo } from 'react';
import { projectAllZonesOperationalState } from '../state/operationalProjection';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { OperationalZone } from '../operational-map/OperationalZone';
import { calculateSpatialEmphasis } from '../state/spatialVisualEmphasis';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';
import type { SpatialZonePresentation } from '../geometry/operationalGeometry';
import { useMapConfiguration } from '../providers/useMapConfiguration';
import { createDegradedFallbackConfiguration, adaptMapConfiguration } from '../adapters/mapConfigurationAdapter';

interface ZoneLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  presentationZones?: SpatialZonePresentation[];
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
 * ZoneLayer — Spatial Operations Layer (V16A Published Authority Contract)
 *
 * Renders presentation zones derived from the active published MapVersion
 * served by MapConfigurationProvider.
 *
 * Decoupled from static TypeScript bundled geometry.
 */
export const ZoneLayer: React.FC<ZoneLayerProps> = ({
  zones,
  meters,
  presentationZones: propPresentationZones,
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
  // Safe consumption of authoritative configuration provider
  let contextPresentationZones: SpatialZonePresentation[] | undefined;
  try {
    const mapConfig = useMapConfiguration();
    contextPresentationZones = mapConfig.presentationZones;
  } catch {
    // Provider not mounted in current hierarchy (e.g. isolated test)
  }

  const effectiveZones = useMemo(() => {
    if (propPresentationZones && propPresentationZones.length > 0) {
      return propPresentationZones;
    }
    if (contextPresentationZones && contextPresentationZones.length > 0) {
      return contextPresentationZones;
    }
    const fallbackConfig = createDegradedFallbackConfiguration();
    return adaptMapConfiguration(fallbackConfig).presentationZones;
  }, [propPresentationZones, contextPresentationZones]);

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
      {effectiveZones.map((geom) => {
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
