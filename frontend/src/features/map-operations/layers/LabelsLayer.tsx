import React from 'react';
import { OPERATIONAL_ZONES_GEOMETRY } from '../geometry/operationalGeometry';

interface LabelsLayerProps {
  zoomLevel: number;
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
}

/**
 * LabelsLayer — Restrained Operational Typography (Section 3 & 7)
 *
 * Provides subtle, high-clarity operational labels:
 * - Small and restrained so as not to obscure the canonical physical illustration
 * - Highlights active/hovered zone title
 */
export const LabelsLayer: React.FC<LabelsLayerProps> = ({
  selectedZoneId,
  hoveredZoneId,
}) => {
  return (
    <g className="sgp-operational-labels-layer" pointerEvents="none">
      {OPERATIONAL_ZONES_GEOMETRY.map((zone) => {
        const isSelected = selectedZoneId === zone.id;
        const isHovered = hoveredZoneId === zone.id;
        const isActive = isSelected || isHovered;

        return (
          <g
            key={`zone-label-${zone.id}`}
            transform={`translate(${zone.labelPositionSvg.x}, ${zone.labelPositionSvg.y})`}
            opacity={isActive ? 1 : 0.65}
            style={{ transition: 'opacity 200ms ease' }}
          >
            {/* Pill background on active state */}
            {isActive && (
              <rect
                x={-60}
                y={-14}
                width={120}
                height={22}
                rx={4}
                fill="#0F172A"
                fillOpacity={0.85}
              />
            )}
            <text
              x={0}
              y={isActive ? 2 : 0}
              textAnchor="middle"
              fill={isActive ? '#FFFFFF' : '#334155'}
              fontSize={isActive ? 11 : 9.5}
              fontWeight={700}
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="0.04em"
            >
              {zone.shortName.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
};
