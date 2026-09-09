import React from 'react';
import { MapMeterItem, OperationalLayerType } from '../../types';
import { MeterBeacon } from './MeterBeacon';

interface MeterBeaconLayerProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
}

export const MeterBeaconLayer: React.FC<MeterBeaconLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  activeLayer,
  exceptionsOnly,
  onSelectMeter,
  onHoverMeter,
}) => {
  return (
    <group>
      {meters.map((meter) => (
        <MeterBeacon
          key={meter.id}
          meter={meter}
          isSelected={selectedMeterId === meter.id}
          isHovered={hoveredMeterId === meter.id}
          activeLayer={activeLayer}
          exceptionsOnly={exceptionsOnly}
          onSelect={onSelectMeter}
          onHover={onHoverMeter}
        />
      ))}
    </group>
  );
};
