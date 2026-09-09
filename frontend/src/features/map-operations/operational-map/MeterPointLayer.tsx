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
  isAssetMode: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
}

/**
 * MeterPointLayer — Renders meter markers on the 2.5:1 SVG canvas
 *
 * Visual Priority Hierarchy (Phase 6A):
 * - NORMAL / CONFIRMED: Small neutral-green dot (r=3.5), calm and non-competing
 * - NORMAL / PENDING / DUE: Small neutral-slate dot (r=3.5)
 * - EXCEPTION (OVERDUE/REVIEW): Prominent larger marker (r=7.5) with warning halo & exclamation
 * - SELECTED: Highlight ring + code label displayed
 * - Meter labels: ONLY shown on hover, selected, or exception state. Never permanent clutter.
 */
export const MeterPointLayer: React.FC<MeterPointLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  zoomLevel: _zoomLevel,
  isAssetMode: _isAssetMode,
  onSelectMeter,
  onHoverMeter,
}) => {
  return (
    <g className="sgp-meter-points-layer">
      {meters.map((m) => {
        const isSelected = m.id === selectedMeterId;
        const isHovered = m.id === hoveredMeterId;
        const isException =
          m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW';

        // Filter: Exceptions only mode
        if (exceptionsOnly && !isException) {
          return null;
        }

        // Coordinates resolution
        const customCoord = OPERATIONAL_METER_COORDINATES[m.meterCode];
        const norm = customCoord || m.coordinates;
        const { x, y } = normalizedToSvg(norm);

        const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];

        // Decluttering logic:
        // Show meter code ONLY when hovered, selected, or in exception state
        const showLabel = isHovered || isSelected || isException;

        // Visual radius & styling based on state
        let r = 3.5;
        let fillColor = '#94A3B8'; // default pending/due neutral slate
        let strokeColor = '#FFFFFF';
        let strokeW = 1.2;

        if (m.semanticState === 'CONFIRMED') {
          r = 3.5;
          fillColor = '#10B981'; // quiet neutral-green
        } else if (isException) {
          r = 7.5;
          fillColor = stCfg.style.fill;
          strokeColor = '#FFFFFF';
          strokeW = 1.8;
        }

        if (isSelected) {
          r = 8.5;
          fillColor = isException ? stCfg.style.fill : '#073B5C';
          strokeColor = '#FFFFFF';
          strokeW = 2;
        }

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
                r={15}
                fill="none"
                stroke={stCfg.style.stroke}
                strokeWidth={2}
                className="sgp-marker-pulse"
              />
            )}

            {isSelected && (
              <circle
                r={17}
                fill="none"
                stroke="#073B5C"
                strokeWidth={2.5}
                strokeDasharray="4 2"
              />
            )}

            {/* 2. Main Marker Body */}
            <circle
              r={r}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeW}
              filter={
                isException || isSelected
                  ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))'
                  : 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))'
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

            {/* 3. Conditional Tooltip / Label */}
            {showLabel && (
              <g
                transform={`translate(0, ${-(r + 14)})`}
                pointerEvents="none"
                className="sgp-meter-label-tag"
              >
                {/* Background pill */}
                <rect
                  x={-28}
                  y={-9}
                  width={56}
                  height={17}
                  rx={3.5}
                  fill={isSelected ? '#073B5C' : isException ? stCfg.style.fill : '#1E293B'}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                />
                {/* Pointer arrow triangle */}
                <polygon
                  points="-4,8 4,8 0,11"
                  fill={isSelected ? '#073B5C' : isException ? stCfg.style.fill : '#1E293B'}
                />
                <text
                  x={0}
                  y={3}
                  fill="#FFFFFF"
                  fontSize={8.5}
                  fontWeight={700}
                  letterSpacing={0.3}
                  textAnchor="middle"
                  className="font-tabular"
                >
                  {m.meterCode}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
