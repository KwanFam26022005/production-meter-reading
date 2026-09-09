import React from 'react';
import { MapMeterItem, OperationalLayerType } from '../types';
import { normalizeToSvg } from '../utils/mapCoordinates';
import { getSemanticStateStyle } from '../utils/mapStatus';

interface MeterMarkerProps {
  meter: MapMeterItem;
  isSelected: boolean;
  isHovered: boolean;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  onSelect: (meterId: string) => void;
  onHover: (meterId: string | null) => void;
}

export const MeterMarker: React.FC<MeterMarkerProps> = ({
  meter,
  isSelected,
  isHovered,
  activeLayer,
  exceptionsOnly,
  onSelect,
  onHover,
}) => {
  const coord = normalizeToSvg(meter.coordinates);
  const style = getSemanticStateStyle(meter.semanticState);

  const isException =
    meter.semanticState === 'REVIEW' || meter.semanticState === 'OVERDUE';

  // Dimming logic
  let opacity = 1;
  if ((exceptionsOnly || activeLayer === 'EXCEPTIONS') && !isException) {
    opacity = 0.2;
  }

  // Radius sizing: compact yet accessible (radius ~12-14px)
  const radius = isSelected ? 16 : isHovered ? 15 : 13;

  return (
    <g
      className={`sgp-meter-marker ${isSelected ? 'selected' : ''} ${isException ? 'exception' : ''}`}
      transform={`translate(${coord.x}, ${coord.y})`}
      opacity={opacity}
      style={{ cursor: 'pointer', transition: 'transform 0.15s ease, opacity 0.2s ease' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(meter.id);
      }}
      onMouseEnter={() => onHover(meter.id)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      aria-label={`Công tơ ${meter.meterCode} - ${meter.name} (${meter.stateLabel})`}
    >
      {/* Outer Glow / Focus Ring */}
      {(isSelected || isException) && (
        <circle
          cx="0"
          cy="0"
          r={radius + 5}
          fill="none"
          stroke={style.ring}
          strokeWidth="3"
          className={isException ? 'sgp-marker-pulse' : ''}
        />
      )}

      {/* Main Marker Badge Circle */}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill={style.fill}
        stroke="#FFFFFF"
        strokeWidth="2"
        filter="drop-shadow(0px 2px 5px rgba(10, 24, 34, 0.2))"
      />

      {/* Center Icon or Abbreviation */}
      <text
        x="0"
        y="4"
        textAnchor="middle"
        fontSize={radius >= 15 ? '9' : '8'}
        fontWeight="700"
        fill="#FFFFFF"
        fontFamily="inherit"
        style={{ pointerEvents: 'none' }}
      >
        {meter.meterCode.replace('CT-', '')}
      </text>

      {/* Compact Code Tooltip / Label */}
      <g transform={`translate(0, ${radius + 12})`} style={{ pointerEvents: 'none' }}>
        <rect
          x="-32"
          y="-9"
          width="64"
          height="18"
          rx="3"
          fill="#18242C"
          opacity="0.9"
        />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill="#FFFFFF"
          fontFamily="inherit"
        >
          {meter.meterCode}
        </text>
      </g>
    </g>
  );
};
