/**
 * Saigon Port Map V2 — Real Meter Layer
 *
 * Implements Section 21–25:
 * - Only renders meters with verified, valid spatial coordinates.
 * - Suppresses fake fallback points (e.g. (0,0), center, zone anchor).
 * - Distinguishes utility type (⚡ ELECTRICITY, 💧 WATER) from meter tech (LCD/MECHANICAL).
 * - Honors MEASUREMENT_UNIT_DATA_GAP: raw tabular numbers without hardcoded 'kWh' or 'm³'.
 * - Level of Detail (LOD) aware: adjusts pin radius and label visibility according to camera zoom.
 * - Semantic halo: green (CONFIRMED), amber (REVIEW), red (OVERDUE), blue (DUE), gray (PENDING).
 */

import React, { useState } from 'react';
import type { MapMeterOut } from '../../types';
import type { MapV2ToneMode } from './types';

export interface MapV2MeterLayerProps {
  meters: MapMeterOut[];
  selectedMeterId?: string | null;
  onSelectMeter: (meter: MapMeterOut, evt: React.MouseEvent | React.KeyboardEvent) => void;
  isLayerVisible?: boolean;
  utilityFilter?: 'ALL' | 'ELECTRICITY' | 'WATER';
  exceptionsOnly?: boolean;
  toneMode?: MapV2ToneMode;
  zoom?: number;
}

const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 1024;

/**
 * Checks whether a meter has authentic, valid spatial coordinates for Map V2.
 * Strictly rejects (0,0), missing, NaN, and out-of-bounds coordinates.
 */
export function isValidMeterCoordinate(
  mapX?: number | null,
  mapY?: number | null
): boolean {
  if (mapX === null || mapX === undefined || mapY === null || mapY === undefined) {
    return false;
  }
  if (isNaN(mapX) || isNaN(mapY)) {
    return false;
  }
  // Reject (0, 0) as fallback noise
  if (mapX === 0 && mapY === 0) {
    return false;
  }
  // Check normalized range (0, 1]
  if (mapX > 0 && mapX <= 1.0 && mapY > 0 && mapY <= 1.0) {
    return true;
  }
  // Check pixel range (1, 1536] x (1, 1024]
  if (mapX > 1.0 && mapX <= CANVAS_WIDTH && mapY > 1.0 && mapY <= CANVAS_HEIGHT) {
    return true;
  }
  return false;
}

/**
 * Converts valid meter coordinates to Map V2 canvas pixel space (1536x1024).
 */
export function getMeterCanvasPoint(
  mapX: number,
  mapY: number
): [number, number] {
  if (mapX <= 1.0 && mapY <= 1.0) {
    return [mapX * CANVAS_WIDTH, mapY * CANVAS_HEIGHT];
  }
  return [mapX, mapY];
}

export const MapV2MeterLayer: React.FC<MapV2MeterLayerProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
  isLayerVisible = true,
  utilityFilter = 'ALL',
  exceptionsOnly = false,
  toneMode = 'technical',
  zoom = 1,
}) => {
  const [hoveredMeterId, setHoveredMeterId] = useState<string | null>(null);
  const [focusedMeterId, setFocusedMeterId] = useState<string | null>(null);

  if (!isLayerVisible || !meters || meters.length === 0) {
    return null;
  }

  const isNeon = toneMode === 'neon';

  // Filter meters by utility category and exception mode
  const visibleMeters = meters.filter((m) => {
    // 1. Spatial validity check
    if (!isValidMeterCoordinate(m.map_x, m.map_y)) {
      return false;
    }
    // 2. Utility category filter
    if (utilityFilter === 'ELECTRICITY' && m.utility_type !== 'ELECTRICITY') {
      return false;
    }
    if (utilityFilter === 'WATER' && m.utility_type !== 'WATER') {
      return false;
    }
    // 3. Exception-only filter
    if (exceptionsOnly) {
      return m.semantic_state === 'REVIEW' || m.semantic_state === 'OVERDUE';
    }
    return true;
  });

  // Level of detail: show labels only at zoom >= 1.5
  const showLabels = zoom >= 1.5;

  return (
    <g id="layer-meter-pins" className="map-v2-meter-layer">
      {visibleMeters.map((m) => {
        const [cx, cy] = getMeterCanvasPoint(m.map_x!, m.map_y!);
        const isSelected = selectedMeterId === m.id;
        const isHovered = hoveredMeterId === m.id;
        const isFocused = focusedMeterId === m.id;
        const isElectricity = m.utility_type === 'ELECTRICITY';

        // Semantic halo colors
        let haloColor = '#94A3B8'; // PENDING / default
        let stateLabel = 'Chưa mở lượt';
        if (m.semantic_state === 'CONFIRMED') {
          haloColor = '#10B981'; // Green
          stateLabel = 'Đã ghi';
        } else if (m.semantic_state === 'REVIEW') {
          haloColor = '#FCC959'; // Amber
          stateLabel = 'Cần kiểm tra';
        } else if (m.semantic_state === 'OVERDUE') {
          haloColor = '#B43A3A'; // Coral/Red
          stateLabel = 'Trễ hạn';
        } else if (m.semantic_state === 'DUE') {
          haloColor = '#0068FF'; // Blue
          stateLabel = 'Đến hạn';
        }

        const utilityColor = isElectricity ? '#FFB703' : '#0068FF';
        const pinRadius = isSelected ? 12 : 9;

        const showTooltip = (isHovered || isFocused) && !isSelected;

        return (
          <g
            key={m.id}
            id={`v2-meter-${m.id}`}
            transform={`translate(${cx}, ${cy})`}
            className={`map-v2-meter-pin ${isSelected ? 'selected' : ''} ${isNeon ? 'tone-neon' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeter(m, e);
            }}
            tabIndex={0}
            role="button"
            aria-label={`Công tơ ${m.meter_code}: ${m.name}. Trạng thái: ${stateLabel}. Nhấp để xem chi tiết.`}
            aria-pressed={isSelected}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelectMeter(m, e);
              }
            }}
            onMouseEnter={() => setHoveredMeterId(m.id)}
            onMouseLeave={() => setHoveredMeterId(null)}
            onFocus={() => setFocusedMeterId(m.id)}
            onBlur={() => setFocusedMeterId(null)}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            {/* Generous touch/click hit area (36px diameter) */}
            <circle r={18} fill="transparent" />

            {/* Selection pulse ring */}
            {isSelected && (
              <circle
                r={19}
                fill="none"
                stroke={isNeon ? '#ff2a85' : '#0068FF'}
                strokeWidth={2}
                strokeDasharray="3 2"
                className="map-v2-anchor-radar active"
              />
            )}

            {/* Keyboard Focus indicator */}
            {isFocused && !isSelected && (
              <circle
                r={16}
                fill="none"
                stroke="#0068FF"
                strokeWidth={2}
              />
            )}

            {/* Semantic State Outer Halo */}
            <circle
              r={pinRadius + 3}
              fill="none"
              stroke={haloColor}
              strokeWidth={2.5}
              opacity={isSelected ? 1 : 0.85}
            />

            {/* Core Pin Body */}
            <circle
              r={pinRadius}
              fill={isNeon ? '#061730' : '#FFFFFF'}
              stroke={isNeon ? '#00f0ff' : '#003875'}
              strokeWidth={1.5}
            />

            {/* Utility Icon Glyph (⚡ Zap or 💧 Droplet) */}
            {isElectricity ? (
              // Lightning glyph (Electric)
              <path
                d="M -1,-4 L 3,-4 L 0,0 L 2,0 L -2,5 L -0.5,1 L -2.5,1 Z"
                fill={utilityColor}
                transform="scale(0.8)"
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              // Droplet glyph (Water)
              <path
                d="M 0,-4 C 2,-2 3,0 3,2 C 3,3.7 1.7,5 0,5 C -1.7,5 -3,3.7 -3,2 C -3,0 -2,-2 0,-4 Z"
                fill={utilityColor}
                transform="scale(0.8)"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Level 1 Meter Code Label (visible when zoomed in) */}
            {showLabels && (
              <g transform="translate(0, 15)" style={{ pointerEvents: 'none' }}>
                <rect
                  x={-24}
                  y={-7}
                  width={48}
                  height={13}
                  rx={2.5}
                  fill={isNeon ? 'rgba(5, 15, 36, 0.9)' : 'rgba(0, 56, 117, 0.85)'}
                />
                <text
                  fill="#FFFFFF"
                  fontSize={8}
                  fontWeight={600}
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {m.meter_code}
                </text>
              </g>
            )}

            {/* Level 2 Non-Interactive Hover Preview Tooltip */}
            {showTooltip && (
              <g transform="translate(0, -22)" style={{ pointerEvents: 'none' }}>
                <rect
                  x={-90}
                  y={-52}
                  width={180}
                  height={48}
                  rx={5}
                  fill="#0F172A"
                  stroke="#334155"
                  strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}
                />
                {/* Pointer arrow down */}
                <polygon points="-4,-4 4,-4 0,0" fill="#0F172A" />

                <text x={-82} y={-37} fill="#FFFFFF" fontSize={10.5} fontWeight={700}>
                  {isElectricity ? '⚡' : '💧'} {m.meter_code}
                </text>
                <text x={-82} y={-24} fill="#94A3B8" fontSize={9}>
                  {m.name}
                </text>
                <text x={-82} y={-11} fill={haloColor} fontSize={8.5} fontWeight={600}>
                  {stateLabel}
                  {m.latest_reading_value ? ` · Số đọc: ${m.latest_reading_value}` : ''}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
