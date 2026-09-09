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
  let opacity = 1.0;

  // Custom label text per active layer
  let plateText = `${zone.shortName} · ${zone.metrics.confirmedCount}/${zone.metrics.totalMeters}`;
  let plateTextColor = '#073B5C';

  if (activeLayer === 'PROGRESS') {
    const pct = zone.metrics.completionPercent;
    plateText = `${zone.shortName} · ${pct}%`;
    if (pct === 100) {
      fillColor = 'rgba(22, 122, 90, 0.16)';
      strokeColor = '#167A5A';
      plateTextColor = '#167A5A';
    } else if (pct > 50) {
      fillColor = 'rgba(18, 101, 143, 0.14)';
      strokeColor = '#12658F';
      plateTextColor = '#12658F';
    } else if (pct > 0) {
      fillColor = 'rgba(217, 119, 6, 0.12)';
      strokeColor = '#D97706';
      plateTextColor = '#D97706';
    } else {
      fillColor = 'rgba(83, 99, 109, 0.06)';
      strokeColor = '#74838C';
      plateTextColor = '#53636D';
    }
  } else if (activeLayer === 'OWNERSHIP') {
    fillColor = 'rgba(11, 79, 117, 0.09)';
    strokeColor = '#0B4F75';
    const operatorName = zone.assignedUser?.fullName
      ? zone.assignedUser.fullName.split(' ').slice(-2).join(' ')
      : 'Chưa gán';
    plateText = `${zone.shortName} · ${operatorName}`;
  } else if (activeLayer === 'EXCEPTIONS') {
    const excCount = zone.metrics.reviewCount + zone.metrics.overdueCount;
    if (excCount > 0) {
      fillColor = 'rgba(180, 35, 24, 0.14)';
      strokeColor = '#B42318';
      strokeWidth = 2.5;
      plateText = `! ${zone.shortName} · ${excCount} ngoại lệ`;
      plateTextColor = '#B42318';
    } else {
      fillColor = 'rgba(83, 99, 109, 0.03)';
      strokeColor = '#D7E0E5';
      opacity = 0.45;
      plateText = `${zone.shortName} · Chuẩn`;
      plateTextColor = '#74838C';
    }
  } else if (activeLayer === 'WORKLOAD') {
    fillColor = 'rgba(7, 59, 92, 0.08)';
    strokeColor = '#073B5C';
    plateText = `${zone.shortName} · ${zone.metrics.totalMeters} công tơ`;
  }

  if (isHovered) {
    fillColor = isSelected ? 'rgba(7, 59, 92, 0.20)' : 'rgba(11, 79, 117, 0.14)';
    strokeColor = '#0B4F75';
    strokeWidth = 2;
    opacity = 1.0;
  }

  if (isSelected) {
    fillColor = 'rgba(7, 59, 92, 0.18)';
    strokeColor = '#073B5C';
    strokeWidth = 2.5;
    opacity = 1.0;
  }

  const plateWidth = Math.max(140, plateText.length * 7.5 + 24);

  return (
    <g className="sgp-zone-group" opacity={opacity} style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}>
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
          x={-plateWidth / 2}
          y="-13"
          width={plateWidth}
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
          fill={plateTextColor}
          fontFamily="inherit"
        >
          {plateText}
        </text>
      </g>
    </g>
  );
};
