import React from 'react';
import { MapMeterItem } from '../types';
import { normalizedToOperationalSvg } from '../geometry/operationalGeometry';

interface MeterPointLayerProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  exceptionsOnly: boolean;
  zoomLevel: number;
  isAssetMode: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
  exceptionFocus?: boolean;
}

/**
 * MeterPointLayer — Renders meter markers on the 2.5:1 SVG canvas
 *
 * Matching authoritative Figma frames 2:2 & 2:104:
 * - Normal meters: Calm solid dots (Green #10B981 for confirmed, Slate #94A3B8 for pending/due)
 * - Review meters: Amber dot #F59E0B
 * - Overdue / Exception meters: Red dot #DC2626 + Prominent Red Pill Callout with meterCode
 * - Selected meter: Distinct focus halo ring
 */
export const MeterPointLayer: React.FC<MeterPointLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  onSelectMeter,
  onHoverMeter,
  exceptionFocus = false,
}) => {
  return (
    <g className="sgp-meter-points-layer" aria-label="Lớp điểm công tơ tác nghiệp">
      {meters.map((m) => {
        const isSelected = m.id === selectedMeterId;
        const isHovered = m.id === hoveredMeterId;
        const isOverdue = m.semanticState === 'OVERDUE';
        const isReview = m.semanticState === 'REVIEW';
        const isException = isOverdue || isReview;

        // Filter: Exceptions only mode
        if (exceptionsOnly && !isException) {
          return null;
        }

        // Coordinates resolution: direct domain projection from database / API
        const { x, y } = normalizedToOperationalSvg(m.coordinates);

        // Semantic Asset Marker Colors
        let coreFill = '#10B981'; // green default (confirmed)
        let ringStroke = '#10B981';
        let ringClass = '';

        if (isOverdue) {
          coreFill = '#DC2626';
          ringStroke = '#DC2626';
          ringClass = 'sgp-pulse-ring';
        } else if (isReview) {
          coreFill = '#F59E0B';
          ringStroke = '#F59E0B';
          ringClass = 'sgp-pulse-ring-amber';
        } else if (m.semanticState === 'DUE') {
          coreFill = '#94A3B8';
          ringStroke = '#CBD5E1';
        } else if (m.semanticState === 'PENDING') {
          coreFill = '#CBD5E1';
          ringStroke = '#E2E8F0';
        } else if (m.semanticState === 'INACTIVE') {
          coreFill = '#E2E8F0';
          ringStroke = '#F1F5F9';
        }

        // Radii: normal vs hovered/selected
        const coreRadius = isHovered || isSelected ? 4.5 : 3.5;
        const ringRadius = isHovered || isSelected ? 9.5 : 7.5;

        // Contextual label: shown on hover or selection (not permanently cluttering the canvas)
        const showPill = isSelected || isHovered;

        return (
          <g
            key={m.id}
            id={`meter-marker-${m.id}`}
            data-meter-code={m.meterCode}
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
            tabIndex={0}
            role="button"
            aria-label={`${m.meterCode}, ${m.name}, ${m.stateLabel}`}
            opacity={exceptionFocus && !isException && !isSelected ? 0.2 : 1}
            style={{ transition: 'opacity 250ms ease' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMeter(m.id);
              }
            }}
          >
            {/* 1. SELECTION DOUBLE-RING FOCUS (when selected) */}
            {isSelected && (
              <circle
                r={15}
                fill="none"
                stroke="var(--ops-accent, #0E7490)"
                strokeWidth={2}
                strokeOpacity={0.35}
                className="sgp-marker-halo"
              />
            )}

            {/* 2. INDUSTRIAL ASSET MARKER: THIN OUTER STATUS RING */}
            <circle
              r={ringRadius}
              fill="none"
              stroke={ringStroke}
              strokeWidth={isException ? 1.8 : 1.2}
              strokeOpacity={isException ? 0.9 : 0.45}
              className={ringClass}
              style={{ transition: 'r 220ms ease, stroke 220ms ease' }}
            />

            {/* 3. INDUSTRIAL ASSET MARKER: INNER SEMANTIC CORE */}
            <circle
              r={coreRadius}
              fill={coreFill}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.18))"
              style={{ transition: 'r 220ms ease, fill 220ms ease' }}
            />

            {/* 4. CONTEXTUAL CALLOUT PILL (shown on hover/selected per industrial asset spec) */}
            {showPill && (
              <g
                transform="translate(0, -20)"
                pointerEvents="none"
                className="sgp-meter-callout-pill"
              >
                {/* Capsule pill background */}
                <rect
                  x={-27}
                  y={-9}
                  width={54}
                  height={18}
                  rx={9}
                  fill={isOverdue ? '#DC2626' : isSelected ? '#073B5C' : '#0F172A'}
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.22))"
                />
                {/* Pointer beak */}
                <polygon
                  points="-3,9 3,9 0,12"
                  fill={isOverdue ? '#DC2626' : isSelected ? '#073B5C' : '#0F172A'}
                />
                {/* Meter Code Label */}
                <text
                  x={0}
                  y={3.5}
                  fill="#FFFFFF"
                  fontSize={9.5}
                  fontWeight={800}
                  letterSpacing={0.2}
                  textAnchor="middle"
                  fontFamily="system-ui, -apple-system, sans-serif"
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
