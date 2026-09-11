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

        // Dot colors per Figma 2:2 & 2:104
        let dotFill = '#10B981'; // green default (confirmed)
        if (isOverdue) {
          dotFill = '#DC2626'; // red
        } else if (isReview) {
          dotFill = '#F59E0B'; // amber
        } else if (m.semanticState === 'PENDING' || m.semanticState === 'DUE') {
          dotFill = '#94A3B8'; // neutral slate
        }

        const dotRadius = 4.5;
        // In Figma 2:104, all overdue meters display their red callout pill
        const showPill = isOverdue || isSelected || isHovered;

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
            opacity={exceptionFocus && !isException && !isSelected ? 0.3 : 1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMeter(m.id);
              }
            }}
          >
            {/* 1. SELECTION HALO */}
            {isSelected && (
              <circle
                r={14}
                fill="none"
                stroke="#0284C7"
                strokeWidth={2.5}
                strokeOpacity={0.4}
                className="sgp-marker-halo"
              />
            )}

            {/* 2. BASE METER DOT */}
            <circle
              r={dotRadius}
              fill={dotFill}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
            />

            {/* 3. FIGMA RED CALLOUT PILL (Frames 2:104 & 2:514)
                Displays floating red pill directly above the overdue or selected meter
            */}
            {showPill && (
              <g
                transform="translate(0, -18)"
                pointerEvents="none"
                className="sgp-meter-callout-pill"
              >
                {/* Red or Navy capsule pill */}
                <rect
                  x={-27}
                  y={-9}
                  width={54}
                  height={18}
                  rx={9}
                  fill={isOverdue ? '#DC2626' : isSelected ? '#073B5C' : '#1E293B'}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                />
                {/* Pointer beak */}
                <polygon
                  points="-3,9 3,9 0,12"
                  fill={isOverdue ? '#DC2626' : isSelected ? '#073B5C' : '#1E293B'}
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
