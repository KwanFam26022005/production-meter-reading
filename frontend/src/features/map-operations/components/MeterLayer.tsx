import React from 'react';
import { MapMeterItem, OperationalLayerType } from '../types';
import { MeterMarker } from './MeterMarker';

interface MeterLayerProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
}

export const MeterLayer: React.FC<MeterLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  activeLayer,
  exceptionsOnly,
  onSelectMeter,
  onHoverMeter,
}) => {
  return (
    <g className="sgp-meter-layer">
      {meters.map((m) => (
        <MeterMarker
          key={m.id}
          meter={m}
          isSelected={selectedMeterId === m.id}
          isHovered={hoveredMeterId === m.id}
          activeLayer={activeLayer}
          exceptionsOnly={exceptionsOnly}
          onSelect={onSelectMeter}
          onHover={onHoverMeter}
        />
      ))}
    </g>
  );
};
