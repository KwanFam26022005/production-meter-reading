import React from 'react';
import { MapMeterItem } from '../types';
import { normalizedToCanonicalScene } from '../geometry/canonicalScene';

interface MeterLayerProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  exceptionsOnly: boolean;
  zoomLevel: number;
  isAssetMode?: boolean;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
  exceptionFocus?: boolean;
}

/**
 * MeterLayer — Restrained HighTopo Operational Meter Markers
 *
 * Visual Rules (Section 13):
 * - Small core (r=3.5) with thin ring (r=7.5)
 * - Semantic colors:
 *   * Confirmed: green (#10B981)
 *   * Due: blue (#0284C7)
 *   * Review: amber (#F59E0B)
 *   * Overdue: red (#DC2626)
 *   * Pending: slate (#94A3B8)
 *   * Inactive: gray (#CBD5E1)
 * - CT-code label pill ONLY shown on:
 *   * hover
 *   * selected
 *   * exception (overdue/review)
 *   * high zoom (> 1.4)
 * - Dimmed during exception focus if healthy.
 */
export const MeterLayer: React.FC<MeterLayerProps> = ({
  meters,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  zoomLevel: _zoomLevel,
  onSelectMeter,
  onHoverMeter,
  exceptionFocus = false,
}) => {
  return (
    <g className="sgp-meter-layer" aria-label="Lớp điểm công tơ tác nghiệp">
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

        // Coordinates resolution: explicit presentation transform
        const { x, y } = normalizedToCanonicalScene(m.coordinates);

        // Semantic Colors per Section 13
        let coreFill = '#10B981';  // Confirmed: green
        let ringStroke = '#10B981';
        let ringClass = '';

        if (isOverdue) {
          coreFill = '#DC2626';     // Overdue: red
          ringStroke = '#DC2626';
          ringClass = 'sgp-pulse-ring';
        } else if (isReview) {
          coreFill = '#F59E0B';     // Review: amber
          ringStroke = '#F59E0B';
          ringClass = 'sgp-pulse-ring-amber';
        } else if (m.semanticState === 'DUE') {
          coreFill = '#0284C7';     // Due: blue
          ringStroke = '#38BDF8';
        } else if (m.semanticState === 'PENDING') {
          coreFill = '#94A3B8';     // Pending: slate
          ringStroke = '#CBD5E1';
        } else if (m.semanticState === 'INACTIVE') {
          coreFill = '#CBD5E1';     // Inactive: gray
          ringStroke = '#E2E8F0';
        }

        // Radii: small core and thin ring
        const coreRadius = isHovered || isSelected ? 4.5 : 3.5;
        const ringRadius = isHovered || isSelected ? 9.5 : 7.5;

        // CT-code label visibility rule:
        // ONLY show code when selected or hovered (clean map per approved design)
        const showCodePill = isSelected || isHovered;

        // Dim normal markers during exception focus
        const isDimmed = exceptionFocus && !isException;

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
            opacity={isDimmed ? 0.22 : 1}
            style={{ transition: 'opacity 300ms ease, transform 180ms ease' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeter(m.id);
            }}
            onMouseEnter={() => onHoverMeter(m.id)}
            onMouseLeave={() => onHoverMeter(null)}
            tabIndex={0}
            role="button"
            aria-label={`${m.meterCode}, ${m.stateLabel || m.semanticState}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMeter(m.id);
              }
            }}
          >
            {/* Pulsing ring for exceptions */}
            {isException && (
              <circle
                cx={0}
                cy={0}
                r={14}
                fill="none"
                stroke={ringStroke}
                strokeWidth={1.5}
                className={ringClass}
              />
            )}

            {/* Selection focus halo */}
            {isSelected && (
              <circle
                cx={0}
                cy={0}
                r={16}
                fill="none"
                stroke="var(--ops-accent, #0E7490)"
                strokeWidth={2}
                strokeDasharray="3 3"
                opacity={0.8}
              />
            )}

            {/* Outer thin ring */}
            <circle
              cx={0}
              cy={0}
              r={ringRadius}
              fill="none"
              stroke={ringStroke}
              strokeWidth={1.2}
              opacity={0.85}
            />

            {/* Core dot */}
            <circle
              cx={0}
              cy={0}
              r={coreRadius}
              fill={coreFill}
              stroke="#FFFFFF"
              strokeWidth={1.2}
            />

            {/* CT-Code Pill (conditionally displayed per approved design: below marker) */}
            {showCodePill && (
              <g
                transform="translate(0, 15)"
                pointerEvents="none"
                className="sgp-meter-pill-group"
              >
                <rect
                  x={-24}
                  y={-2}
                  width={48}
                  height={15}
                  rx={4}
                  fill={isOverdue ? '#DC2626' : isReview ? '#F59E0B' : '#0F172A'}
                  fillOpacity={0.92}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.3))"
                />
                <text
                  x={0}
                  y={9}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={8.5}
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  letterSpacing="0.02em"
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
