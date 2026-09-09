import React from 'react';
import { MapOperationalZone, OperationalLayerType } from '../../types';
import { ZoneMesh } from './ZoneMesh';

interface ZoneLayer3DProps {
  zones: MapOperationalZone[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  activeLayer: OperationalLayerType;
  onSelectZone: (zoneId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
}

export const ZoneLayer3D: React.FC<ZoneLayer3DProps> = ({
  zones,
  selectedZoneId,
  hoveredZoneId,
  activeLayer,
  onSelectZone,
  onHoverZone,
}) => {
  return (
    <group>
      {zones.map((zone) => (
        <ZoneMesh
          key={zone.id}
          zone={zone}
          isSelected={selectedZoneId === zone.id}
          isHovered={hoveredZoneId === zone.id}
          activeLayer={activeLayer}
          onSelect={onSelectZone}
          onHover={onHoverZone}
        />
      ))}
    </group>
  );
};
