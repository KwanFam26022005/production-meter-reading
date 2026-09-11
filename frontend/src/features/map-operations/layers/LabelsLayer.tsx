import React from 'react';

interface LabelsLayerProps {
  zoomLevel?: number;
  selectedZoneId?: string | null;
  hoveredZoneId?: string | null;
}

/**
 * LabelsLayer — Zone typography is now directly rendered as frosted identity badge pills
 * inside OperationalZone matching tan-thuan-approved-zoning.png.
 * Preserved as an empty layer for interface compatibility without duplicate text clutter.
 */
export const LabelsLayer: React.FC<LabelsLayerProps> = () => {
  return null;
};

