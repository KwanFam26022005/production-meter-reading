import React, { useState } from 'react';
import { MapV2Employee, formatEmployeeTooltip } from './employeeDataAdapter';
import { SafeMovementPath } from './employeeMovement';
import { useEmployeeAnimation } from './useEmployeeAnimation';
import { MapV2ToneMode } from './types';

export interface MapV2EmployeeMarkerProps {
  employee: MapV2Employee;
  path: SafeMovementPath;
  isSelected: boolean;
  onSelect: (employee: MapV2Employee, evt: React.MouseEvent | React.KeyboardEvent) => void;
  isManuallyPaused?: boolean;
  isLayerVisible?: boolean;
  isTechnicalMode?: boolean;
  toneMode?: MapV2ToneMode;
  initialProgress?: number;
  zoomScale?: number;
  forcedReducedMotion?: boolean;
}

/**
 * Animated Assigned-Zone Employee Marker component for Map V2.
 *
 * Implements the approved interaction model:
 * Default (subtle movement) -> Hover/Focus (paused with preview) -> Selected (frozen with inspector).
 */
export const MapV2EmployeeMarker: React.FC<MapV2EmployeeMarkerProps> = ({
  employee,
  path,
  isSelected,
  onSelect,
  isManuallyPaused = false,
  isLayerVisible = true,
  isTechnicalMode = false,
  toneMode = 'technical',
  initialProgress = 0,
  zoomScale = 1,
  forcedReducedMotion = false,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const { currentPosition, isPaused } = useEmployeeAnimation({
    path,
    initialProgress,
    isHovered,
    isFocused,
    isSelected,
    isManuallyPaused,
    isLayerVisible,
    isTechnicalMode,
    forcedReducedMotion,
  });

  const isNeon = toneMode === 'neon';
  const [posX, posY] = currentPosition;
  const tooltipData = formatEmployeeTooltip(employee);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent map deselection
    onSelect(employee, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSelect(employee, e);
    }
  };

  // Color tokens
  const baseFill = isNeon
    ? isSelected ? '#ff2a85' : '#081734'
    : isSelected ? '#0068FF' : '#003875';

  const baseStroke = isNeon
    ? isSelected ? '#FFFFFF' : '#00f0ff'
    : isSelected ? '#FFFFFF' : '#E2E8F0';

  // Scale compensation: maintain readable touch and visual size across zoom
  const scale = zoomScale < 0.7 ? 1.15 : zoomScale > 2 ? 0.85 : 1;

  const showTooltip = (isHovered || isFocused) && !isSelected;

  return (
    <g
      id={`emp-marker-${employee.id}`}
      data-employee-id={employee.id}
      transform={`translate(${posX}, ${posY})`}
      className={`map-v2-employee-marker-group ${isSelected ? 'selected' : ''} ${isPaused ? 'paused' : ''} ${isNeon ? 'tone-neon' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Nhân viên ${employee.code}: ${employee.name}. Phân công: ${employee.zoneLabel}. Nhấn Enter để xem chi tiết.`}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* Generous touch/click hit area (48px diameter) */}
      <circle r={24} fill="transparent" style={{ pointerEvents: 'all' }} />

      <g transform={`scale(${scale})`}>
        {/* Selection beacon radar pulse when selected */}
        {isSelected && (
          <circle
            cx={0}
            cy={0}
            r={22}
            fill="none"
            stroke={isNeon ? '#ff2a85' : '#0068FF'}
            strokeWidth={2}
            strokeDasharray="4 2"
            className="map-v2-anchor-radar active"
          />
        )}

        {/* Keyboard Focus indicator ring */}
        {isFocused && !isSelected && (
          <circle
            cx={0}
            cy={0}
            r={19}
            fill="none"
            stroke="#0068FF"
            strokeWidth={2}
          />
        )}

        {/* Marker Outer Base Circle */}
        <circle
          cx={0}
          cy={0}
          r={14}
          fill={baseFill}
          stroke={baseStroke}
          strokeWidth={isSelected ? 2.5 : 1.75}
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 56, 117, 0.25))',
            transition: 'fill 0.15s ease, stroke 0.15s ease',
          }}
        />

        {/* Employee Silhouette Icon */}
        <g style={{ pointerEvents: 'none' }} fill="#FFFFFF">
          {/* Head */}
          <circle cx={0} cy={-3.5} r={3.2} />
          {/* Torso */}
          <path d="M -5.5,5.5 A 5.5,5.5 0 0,1 5.5,5.5 A 5.5,5.5 0 0,1 -5.5,5.5 Z" />
        </g>

        {/* Status Dot: Neutral teal dot denoting zone assignment */}
        <circle
          cx={10}
          cy={-10}
          r={4}
          fill={isNeon ? '#00f0ff' : '#0284C7'}
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />

        {/* Stationary Zone Badge (when stationary fallback/real assignee active) */}
        {path.isStationary && (
          <g transform="translate(0, 16)">
            <rect
              x={-24}
              y={-7}
              width={48}
              height={14}
              rx={3}
              fill="rgba(15, 23, 42, 0.85)"
              stroke="#94A3B8"
              strokeWidth={0.5}
            />
            <text
              fill="#FFFFFF"
              fontSize={8}
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {employee.isDemo ? 'CỐ ĐỊNH' : 'PHỤ TRÁCH'}
            </text>
          </g>
        )}

        {/* Level 2 Non-Interactive Contextual Preview Tooltip (SVG ForeignObject / Vector Card) */}
        {showTooltip && (
          <g transform="translate(0, -28)" style={{ pointerEvents: 'none' }}>
            <rect
              x={-110}
              y={-64}
              width={220}
              height={60}
              rx={6}
              fill="#0F172A"
              stroke="#334155"
              strokeWidth={1}
              style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}
            />
            {/* Pointer arrow down */}
            <polygon points="-5,-4 5,-4 0,1" fill="#0F172A" />

            <text x={-100} y={-47} fill="#FFFFFF" fontSize={11} fontWeight={700}>
              {tooltipData.title}
            </text>
            <text x={-100} y={-33} fill="#94A3B8" fontSize={9.5} fontWeight={500}>
              Phân khu: <tspan fill="#38BDF8">{tooltipData.zone}</tspan>
            </text>
            <text x={-100} y={-19} fill="#CBD5E1" fontSize={8} fontStyle="italic">
              {tooltipData.disclosure}
            </text>
            <text x={-100} y={-8} fill="#64748B" fontSize={8}>
              Nhấp hoặc nhấn Enter để chọn
            </text>
          </g>
        )}
      </g>
    </g>
  );
};
