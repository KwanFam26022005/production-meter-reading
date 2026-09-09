import React from 'react';
import { MapOperationalZone, OperationalLayerType } from '../types';
import { normalizeToSvg, polygonToSvgPoints } from '../utils/mapCoordinates';

interface ZonePolygonProps {
  zone: MapOperationalZone;
  isSelected: boolean;
  isHovered: boolean;
  activeLayer: OperationalLayerType;
  onSelect: (zoneId: string) => void;
  onHover: (zoneId: string | null) => void;
}

export const ZonePolygon: React.FC<ZonePolygonProps> = ({
  zone,
  isSelected,
  isHovered,
  activeLayer,
  onSelect,
  onHover,
}) => {
  const pointsStr = polygonToSvgPoints(zone.polygon);
  const labelCoord = normalizeToSvg(zone.labelPosition);

  // Derive fill and stroke based on active layer and state
  let fillColor = 'rgba(11, 79, 117, 0.06)';
  let strokeColor = 'rgba(11, 79, 117, 0.35)';
  let strokeWidth = 1.5;

  if (activeLayer === 'PROGRESS') {
    const pct = zone.metrics.completionPercent;
    if (pct === 100) {
      fillColor = 'rgba(22, 122, 90, 0.12)';
      strokeColor = '#167A5A';
    } else if (pct > 50) {
      fillColor = 'rgba(18, 101, 143, 0.10)';
      strokeColor = '#12658F';
    } else if (pct > 0) {
      fillColor = 'rgba(217, 119, 6, 0.10)';
      strokeColor = '#D97706';
    } else {
      fillColor = 'rgba(83, 99, 109, 0.06)';
      strokeColor = '#74838C';
    }
  }

  if (isHovered) {
    fillColor = isSelected ? 'rgba(7, 59, 92, 0.18)' : 'rgba(11, 79, 117, 0.12)';
    strokeColor = '#0B4F75';
    strokeWidth = 2;
  }

  if (isSelected) {
    fillColor = 'rgba(7, 59, 92, 0.15)';
    strokeColor = '#073B5C';
    strokeWidth = 2.5;
  }

  return (
    <g className="sgp-zone-group" style={{ cursor: 'pointer' }}>
      <polygon
        points={pointsStr}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isSelected ? 'none' : '4 2'}
        strokeLinejoin="round"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zone.id);
        }}
        onMouseEnter={() => onHover(zone.id)}
        onMouseLeave={() => onHover(null)}
      />

      {/* Zone Label Plate */}
      <g
        transform={`translate(${labelCoord.x}, ${labelCoord.y})`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zone.id);
        }}
        onMouseEnter={() => onHover(zone.id)}
        onMouseLeave={() => onHover(null)}
        style={{ pointerEvents: 'all' }}
      >
        <rect
          x="-75"
          y="-13"
          width="150"
          height="26"
          rx="4"
          fill="#FFFFFF"
          stroke={isSelected ? '#073B5C' : '#D7E0E5'}
          strokeWidth={isSelected ? '1.5' : '1'}
          filter="drop-shadow(0px 2px 4px rgba(24, 36, 44, 0.08))"
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#073B5C"
          fontFamily="inherit"
        >
          {zone.shortName} · {zone.metrics.confirmedCount}/{zone.metrics.totalMeters}
        </text>
      </g>
    </g>
  );
};
