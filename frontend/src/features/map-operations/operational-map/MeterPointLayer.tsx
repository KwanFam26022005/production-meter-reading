import React from 'react';
import { MapMeterItem } from '../types';
import {
  OPERATIONAL_METER_COORDINATES,
  normalizedToSvg,
} from '../geometry/operationalGeometry';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface MeterPointLayerProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  exceptionsOnly: boolean;
  zoomLevel: number;
  isAssetMode?: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
}

export const MeterPointLayer: React.FC<MeterPointLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  zoomLevel,
  isAssetMode = false,
  onSelectMeter,
  onHoverMeter,
}) => {
  return (
    <g className="sgp-meter-point-layer">
      {meters.map((m) => {
        const isSelected = selectedMeterId === m.id;
        const isHovered = hoveredMeterId === m.id;
        const isException =
          m.semanticState === 'REVIEW' || m.semanticState === 'OVERDUE';

        // Dim normal meters in exception-only mode
        if (exceptionsOnly && !isException) {
          return null;
        }

        // Coordinates resolution
        const customCoord = OPERATIONAL_METER_COORDINATES[m.meterCode];
        const norm = customCoord || m.coordinates;
        const { x, y } = normalizedToSvg(norm);

        const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];

        // Decluttering logic:
        // Show meter code only when hovered, selected, exception, or at high zoom (>= 1.35)
        const showLabel =
          isHovered || isSelected || isException || zoomLevel >= 1.35 || isAssetMode;

        // Visual radius & styling
        let r = isAssetMode ? 6 : 4;
        if (isException) r = 8;
        if (isSelected) r = 9;

        return (
          <g
            key={m.id}
            className={`sgp-meter-point ${isSelected ? 'selected' : ''} ${
              isException ? 'exception' : ''
            }`}
            transform={`translate(${x}, ${y})`}
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeter(m.id);
            }}
            onMouseEnter={() => onHoverMeter(m.id)}
            onMouseLeave={() => onHoverMeter(null)}
          >
            {/* 1. Selection / Exception Pulse Halo */}
            {isException && (
              <circle
                r={16}
                fill="none"
                stroke={stCfg.style.stroke}
                strokeWidth={2}
                className="sgp-marker-pulse"
              />
            )}

            {isSelected && (
              <circle
                r={18}
                fill="none"
                stroke="#073B5C"
                strokeWidth={2.5}
                strokeDasharray="4 2"
              />
            )}

            {/* 2. Main Marker Body */}
            <circle
              r={r}
              fill={isException || isAssetMode || isSelected ? stCfg.style.fill : '#64748B'}
              stroke="#FFFFFF"
              strokeWidth={1.8}
              filter={
                isException || isSelected
                  ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))'
                  : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))'
              }
            />

            {/* Exclamation glyph on exception markers */}
            {isException && (
              <text
                x={0}
                y={3.5}
                fill="#FFFFFF"
                fontSize={10}
                fontWeight={900}
                textAnchor="middle"
                pointerEvents="none"
              >
                !
              </text>
            )}

            {/* 3. Meter Code Label / Tooltip (High contrast plate) */}
            {showLabel && (
              <g
                transform={`translate(0, ${-r - 8})`}
                pointerEvents="none"
                className="sgp-meter-label-tag"
              >
                {/* Tooltip background pill */}
                <rect
                  x={-34}
                  y={-14}
                  width={68}
                  height={17}
                  rx={4}
                  fill="#0F172A"
                  opacity={0.92}
                />
                <text
                  x={0}
                  y={-2}
                  fill="#FFFFFF"
                  fontSize={9.5}
                  fontWeight={700}
                  letterSpacing={0.5}
                  textAnchor="middle"
                  className="font-tabular"
                >
                  {m.meterCode}
                </text>
                {/* Tiny pointer triangle */}
                <polygon points="-3,3 3,3 0,6" fill="#0F172A" opacity={0.92} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
