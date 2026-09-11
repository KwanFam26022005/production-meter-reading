import React from 'react';
import { MeterDrawer } from '../components/MeterDrawer';
import { MapMeterItem } from '../types';

export interface MeterDetailDrawerProps {
  meter: MapMeterItem;
  onClose: () => void;
  onInspectReading?: (readingId: string) => void;
  onViewIn3D?: () => void;
}

/**
 * MeterDetailDrawer — Level 3 explicit full detail drawer.
 * Displays combined operational + asset information.
 */
export const MeterDetailDrawer: React.FC<MeterDetailDrawerProps> = (props) => {
  return <MeterDrawer {...props} />;
};

export { MeterDrawer };
