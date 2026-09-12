import React from 'react';
import { MapMeterItem } from '../types';
import { normalizedToCanonicalScene } from '../geometry/canonicalScene';
import {
  isPointInPresentationZone,
  resolveToBusinessZoneId,
} from '../geometry/operationalGeometry';
import { calculateSpatialEmphasis } from '../state/spatialVisualEmphasis';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';

interface MeterLayerProps {
  meters: MapMeterItem[];
  selectedZoneId?: string | null;
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  exceptionsOnly: boolean;
  zoomLevel: number;
  isAssetMode?: boolean;
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
  exceptionFocus?: boolean;
}

/**
 * MeterLayer — V7 Visual Contract Implementation
 *
 * Visual Rules:
 * - Footprint: ROUNDED HEXAGON (compact 18-22px footprint)
 * - Center gauge dial glyph with needle
 * - NO permanent CT-code label. Label appears ONLY on hover or when selected.
 * - Selected state: Crisp white halo (r=15, stroke=2px) + CT-code callout pill.
 * - Alerts: Small triangle warning badge (red overdue, amber review).
 *   NO giant pulsing red circles wrapping meters.
 * - Zone Selection Dimming:
 *   Meters in selected zone: 100% opacity.
 *   Outside meters: 25% opacity.
 */
export const MeterLayer: React.FC<MeterLayerProps> = ({
  meters,
  selectedZoneId,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  zoomLevel: _zoomLevel,
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
  onSelectMeter,
  onHoverMeter,
  exceptionFocus = false,
}) => {
  const targetBusinessZoneId = resolveToBusinessZoneId(selectedZoneId);

  // Active entity for emphasis resolution
  const activeSelectedEntity = selectedEntity || (
    selectedMeterId
      ? { type: 'meter' as const, id: selectedMeterId }
      : selectedZoneId
      ? { type: 'zone' as const, id: selectedZoneId }
      : null
  );

  return (
    <g className="sgp-meter-layer" aria-label="Lớp điểm công tơ tác nghiệp">
      {meters.map((m) => {
        const isSelected = m.id === selectedMeterId || activeSelectedEntity?.id === m.id;
        const isHovered = m.id === hoveredMeterId;
        const isOverdue = m.semanticState === 'OVERDUE';
        const isReview = m.semanticState === 'REVIEW';
        const isException = isOverdue || isReview;

        // Filter: Exceptions only mode
        if (exceptionsOnly && !isException) {
          return null;
        }

        // Coordinates resolution: explicit presentation transform
        const sceneCoord = normalizedToCanonicalScene(m.coordinates);
        const { x, y } = sceneCoord;

        // Zone selection dimming logic per V7 Visual Contract:
        let isInsideSelectedZone = true;
        const effectiveZoneId = targetPlacementZoneId || (activeSelectedEntity?.type === 'zone' ? activeSelectedEntity.id : selectedZoneId);
        if (effectiveZoneId) {
          if (isPointInPresentationZone(sceneCoord, effectiveZoneId)) {
            isInsideSelectedZone = true;
          } else if (m.zoneId === effectiveZoneId || m.zoneId === targetBusinessZoneId) {
            isInsideSelectedZone = true;
          } else {
            isInsideSelectedZone = false;
          }
        }

        // Semantic Colors per V7 Spec
        let coreFill = '#10B981'; // CONFIRMED: Emerald Green

        if (isOverdue) {
          coreFill = '#EF4444'; // OVERDUE: Critical Red
        } else if (isReview) {
          coreFill = '#F59E0B'; // REVIEW: Amber Warning
        } else if (m.semanticState === 'DUE') {
          coreFill = '#0284C7'; // DUE: Operational Blue
        } else if (m.semanticState === 'PENDING') {
          coreFill = '#64748B'; // PENDING: Neutral Slate
        } else if (m.semanticState === 'INACTIVE') {
          coreFill = '#94A3B8'; // INACTIVE: Muted Gray
        }

        // CT-code label visibility rule: ONLY show code when selected or hovered
        const showCodePill = isSelected || isHovered;

        // Calculate centralized spatial emphasis
        let emphasis = calculateSpatialEmphasis({
          mode,
          selectedEntity: activeSelectedEntity,
          targetPlacementZoneId,
          entityType: 'meter',
          entityId: m.id,
          zoneId: m.zoneId,
        });

        // If inside selected zone was false and entity is zone, ensure dimmed
        if (effectiveZoneId && !isInsideSelectedZone && activeSelectedEntity?.type === 'zone') {
          emphasis = Math.min(emphasis, 0.25);
        }

        if (exceptionFocus && !isException && !isSelected) {
          emphasis = Math.min(emphasis, 0.20);
        }

        const accessibleLabel = `${m.meterCode}, ${m.zoneName || 'Khu vực tác nghiệp'}, ${
          m.stateLabel || m.semanticState
        }`;

        // V10 Meter Level-of-Detail (LOD) (Section 33)
        // OVERVIEW: 10–12px simplified meter glyph/dot (scale ~0.62)
        // ZONE_FOCUS: 16–18px meter marker (scale ~0.85)
        // ENTITY_FOCUS: 20–24px full marker with separation halo (scale ~1.15)
        const isSelectedMeter = m.id === selectedMeterId || activeSelectedEntity?.id === m.id;
        const isZoneFocused = Boolean(selectedZoneId || activeSelectedEntity?.type === 'zone');
        const meterLod: 'OVERVIEW' | 'ZONE_FOCUS' | 'ENTITY_FOCUS' = isSelectedMeter
          ? 'ENTITY_FOCUS'
          : isZoneFocused
          ? 'ZONE_FOCUS'
          : 'OVERVIEW';

        const lodScale = meterLod === 'OVERVIEW' ? 0.62 : meterLod === 'ZONE_FOCUS' ? 0.85 : 1.15;

        return (
          <g
            key={m.id}
            id={`meter-marker-${m.id}`}
            data-meter-code={m.meterCode}
            data-meter-lod={meterLod}
            className={`sgp-meter-point ${isSelected ? 'selected' : ''} ${
              isException ? 'exception' : ''
            } ${isHovered ? 'hovered' : ''} lod-${meterLod.toLowerCase()}`}
            transform={`translate(${x}, ${y}) scale(${lodScale})`}
            cursor="pointer"
            opacity={emphasis}
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
            {/* 0. Invisible Touch Target Area (Guarantees >= 44px hit target across all LOD scales) */}
            <circle cx={0} cy={0} r={22 / lodScale} fill="transparent" pointerEvents="all" />

            {/* 1. SELECTION WHITE HALO (V7 Contract: r=15, stroke=2px) */}
            {isSelected && (
              <circle
                cx={0}
                cy={0}
                r={15}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2}
                filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))"
                className="sgp-marker-selected-halo"
              />
            )}

            {/* 2. ALERT BADGE: Small Warning Triangle at Corner (NO giant pulsing circles) */}
            {isException && (
              <g transform="translate(7, -10)" pointerEvents="none">
                <path
                  d="M 0 -7 L 6 3 L -6 3 Z"
                  fill={isOverdue ? '#EF4444' : '#F59E0B'}
                  stroke="#FFFFFF"
                  strokeWidth={0.8}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
                />
                <line x1={0} y1={-3} x2={0} y2={-0.5} stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" />
                <circle cx={0} cy={1.5} r={0.6} fill="#FFFFFF" />
              </g>
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
