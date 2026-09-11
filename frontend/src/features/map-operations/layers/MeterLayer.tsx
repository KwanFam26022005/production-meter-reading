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

        // Semantic Colors per V7 Spec (04_MARKER_SYSTEM.md Section 17)
        let coreFill = '#10B981'; // CONFIRMED: Emerald Green
        let ringStroke = '#10B981';
        let ringClass = '';

        if (isOverdue) {
          coreFill = '#EF4444'; // OVERDUE: Critical Red
          ringStroke = '#EF4444';
          ringClass = 'sgp-pulse-ring';
        } else if (isReview) {
          coreFill = '#F59E0B'; // REVIEW: Amber Warning
          ringStroke = '#F59E0B';
          ringClass = 'sgp-pulse-ring-amber';
        } else if (m.semanticState === 'DUE') {
          coreFill = '#0284C7'; // DUE: Operational Blue
          ringStroke = '#38BDF8';
        } else if (m.semanticState === 'PENDING') {
          coreFill = '#64748B'; // PENDING: Neutral Slate
          ringStroke = '#94A3B8';
        } else if (m.semanticState === 'INACTIVE') {
          coreFill = '#94A3B8'; // INACTIVE: Muted Gray
          ringStroke = '#CBD5E1';
        }

        // CT-code label visibility rule: ONLY show code when selected or hovered
        const showCodePill = isSelected || isHovered;

        // Dim normal markers during exception focus
        const isDimmed = exceptionFocus && !isException && !isSelected;

        const accessibleLabel = `${m.meterCode}, ${m.zoneName || 'Khu vực tác nghiệp'}, ${
          m.stateLabel || m.semanticState
        }`;

        return (
          <g
            key={m.id}
            id={`meter-marker-${m.id}`}
            data-meter-code={m.meterCode}
            className={`sgp-meter-point ${isSelected ? 'selected' : ''} ${
              isException ? 'exception' : ''
            } ${isHovered ? 'hovered' : ''}`}
            transform={`translate(${x}, ${y})`}
            cursor="pointer"
            opacity={isDimmed ? 0.22 : 1}
            style={{ transition: 'opacity 280ms ease, transform 180ms ease' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeter(m.id);
            }}
            onMouseEnter={() => onHoverMeter(m.id)}
            onMouseLeave={() => onHoverMeter(null)}
            tabIndex={0}
            role="button"
            aria-label={accessibleLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMeter(m.id);
              }
            }}
          >
            {/* 0. 48x48 px Invisible Touch Target Area (Section 25 Accessibility) */}
            <rect
              x={-24}
              y={-24}
              width={48}
              height={48}
              fill="transparent"
              pointerEvents="all"
            />

            {/* 1. Pulsing Ring for Overdue / Review Exceptions */}
            {isException && (
              <circle
                cx={0}
                cy={0}
                r={17}
                fill="none"
                stroke={ringStroke}
                strokeWidth={isOverdue ? 2.0 : 1.8}
                className={ringClass}
              />
            )}

            {/* 2. Selection Focus Halo (r=22) */}
            {isSelected && (
              <circle
                cx={0}
                cy={0}
                r={22}
                fill="none"
                stroke="var(--ops-accent, #0E7490)"
                strokeWidth={2.5}
                strokeDasharray="4 3"
                opacity={0.9}
                className="sgp-marker-halo"
              />
            )}

            {/* 3. White Separation Outer Halo (Hexagon r=11, stroke=3.2px) */}
            <path
              d="M 0 -11 L 9.5 -5.5 L 9.5 5.5 L 0 11 L -9.5 5.5 L -9.5 -5.5 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={isException ? 3.5 : 2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 4. Navy Structural Bezel (Industrial Hexagon Bezel) */}
            <path
              d="M 0 -10.5 L 9 -5.2 L 9 5.2 L 0 10.5 L -9 5.2 L -9 -5.2 Z"
              fill="#073B5C"
              stroke="#073B5C"
              strokeWidth={1}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
            />

            {/* 5. Semantic Core Plate */}
            <path
              d="M 0 -8.2 L 7 -4.1 L 7 4.1 L 0 8.2 L -7 4.1 L -7 -4.1 Z"
              fill={coreFill}
              stroke={coreFill}
              strokeWidth={1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 6. Primary Glyph: Industrial Analog Gauge Icon (Dial + Needle) */}
            <g pointerEvents="none">
              {/* Dial arc */}
              <path
                d="M -3.8 2 A 4.2 4.2 0 1 1 3.8 2"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.2}
                strokeLinecap="round"
              />

              {/* Needle depending on status */}
              {m.semanticState === 'INACTIVE' ? (
                <line
                  x1={-3}
                  y1={3}
                  x2={3}
                  y2={-3}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              ) : isOverdue ? (
                <line
                  x1={0}
                  y1={0.5}
                  x2={2.6}
                  y2={-2.6}
                  stroke="#FFFFFF"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              ) : isReview ? (
                <line
                  x1={0}
                  y1={0.5}
                  x2={2.2}
                  y2={-2.2}
                  stroke="#FFFFFF"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              ) : m.semanticState === 'DUE' ? (
                <line
                  x1={0}
                  y1={0.5}
                  x2={0}
                  y2={-2.8}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              ) : (
                <line
                  x1={0}
                  y1={0.5}
                  x2={2.0}
                  y2={-2.0}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              )}

              {/* Needle pivot */}
              {m.semanticState !== 'INACTIVE' && (
                <circle cx={0} cy={0.5} r={0.9} fill="#FFFFFF" />
              )}
            </g>

            {/* 7. CT-Code Callout Badge (Pill Anchored Above Marker) */}
            {showCodePill && (
              <g
                transform="translate(0, -22)"
                pointerEvents="none"
                className="sgp-meter-callout-pill"
              >
                <rect
                  x={-28}
                  y={-10}
                  width={56}
                  height={18}
                  rx={5}
                  fill={isOverdue ? '#EF4444' : isReview ? '#F59E0B' : '#073B5C'}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.35))"
                />
                <polygon
                  points="-4,8 4,8 0,12"
                  fill={isOverdue ? '#EF4444' : isReview ? '#F59E0B' : '#073B5C'}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={9}
                  fontWeight={800}
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
