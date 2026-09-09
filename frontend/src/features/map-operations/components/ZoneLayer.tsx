import React from 'react';
import { MapOperationalZone, OperationalLayerType } from '../types';
import { ZonePolygon } from './ZonePolygon';

interface ZoneLayerProps {
  zones: MapOperationalZone[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  activeLayer: OperationalLayerType;
  onSelectZone: (zoneId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
}

export const ZoneLayer: React.FC<ZoneLayerProps> = ({
  zones,
  selectedZoneId,
  hoveredZoneId,
  activeLayer,
  onSelectZone,
  onHoverZone,
}) => {
  return (
    <g className="sgp-zone-layer">
      {zones.map((zone) => (
        <ZonePolygon
          key={zone.id}
          zone={zone}
          isSelected={selectedZoneId === zone.id}
          isHovered={hoveredZoneId === zone.id}
          activeLayer={activeLayer}
          onSelect={onSelectZone}
          onHover={onHoverZone}
        />
      ))}
    </g>
  );
};
