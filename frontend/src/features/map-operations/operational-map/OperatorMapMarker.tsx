import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';

export interface OperatorMapMarkerProps {
  summary: OperatorShiftSummary;
  x: number;
  y: number;
  isSelected?: boolean;
  isDimmed?: boolean;
  emphasis?: number;
  zoomLevel?: number;
  zoneName?: string;
  isZoneFocused?: boolean;
  onClick: (operatorId: string) => void;
}

/**
 * OperatorMapMarker — V13.4 Spatial Marker Implementation
 *
 * Rules:
 * - CIRCLE footprint: Overview 30-34px (nominal 32px), Zone focus 32-36px, Selected 36-40px
 * - White separation ring: rgba(255,255,255,0.90) 1.5px
 * - Outer circular shift progress ring (track rgba(255,255,255,0.22), progress teal/cyan #06B6D4)
 * - Stroke-dashoffset transition: 280ms ease-out (no looping)
 * - Inner dark avatar disc (#0B192C) with bold initials
 * - Issue badge (top-right) ONLY when issue count > 0; does not cover initials
 * - Hit target: >= 44px
 * - Screen-size normalization: lodScale / cameraZoom
 */
export const OperatorMapMarker: React.FC<OperatorMapMarkerProps> = React.memo(({
  summary,
  x,
  y,
  isSelected = false,
  isDimmed = false,
  emphasis,
  zoomLevel = 1,
  zoneName,
  isZoneFocused = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // V13.4 Operator LOD & Sizing:
  // OVERVIEW: 30–34px (target 32px, lodScale = 1.0)
  // ZONE_FOCUS: 32–36px (target 34px, lodScale = 1.0625)
  // ENTITY_FOCUS: 36–40px (target 38px, lodScale = 1.1875)
  const operatorLod: 'OVERVIEW' | 'ZONE_FOCUS' | 'ENTITY_FOCUS' = isSelected
    ? 'ENTITY_FOCUS'
    : isZoneFocused
    ? 'ZONE_FOCUS'
    : 'OVERVIEW';

  const lodScale = operatorLod === 'OVERVIEW' ? 1.0 : operatorLod === 'ZONE_FOCUS' ? 1.0625 : 1.1875;
  const safeZoom = Math.max(0.1, zoomLevel);
  const presentationScale = lodScale / safeZoom;

  // SVG circular geometry: base outer diameter = 32px (r = 16px)
  const ringRadius = 13.5;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~84.82px
  const clampedProgress = Math.max(0, Math.min(100, summary.progressPct));
  const strokeOffset = ringCircumference - (clampedProgress / 100) * ringCircumference;

  // Extract initials (e.g. "Nguyễn Văn An" -> "NA", "Đặng Văn B" -> "DB")
  const nameParts = summary.fullName?.trim().split(/\s+/) || [];
  const initial =
    nameParts.length >= 2
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
      : summary.fullName?.trim().charAt(0).toUpperCase() || 'NV';

  const hasOverdue = summary.overdueMeters > 0;
  const issueCount = summary.overdueMeters + summary.reviewMeters;

  // Accessible descriptive label per Section 19:
  // "Nguyễn Văn An, phụ trách Cầu cảng, 67 phần trăm hoàn tất"
  const accessibleLabel = `${summary.fullName || 'Nhân viên vận hành'}, phụ trách ${
    zoneName || 'khu vực'
  }, ${summary.progressPct} phần trăm hoàn tất${issueCount > 0 ? `, ${issueCount} vấn đề cần xử lý` : ''}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick(summary.operatorId);
    }
  };

  return (
    <g
      className={`sgp-operator-map-marker ${isSelected ? 'selected' : ''} ${
        isHovered ? 'hovered' : ''
      } lod-${operatorLod.toLowerCase()}`}
      transform={`translate(${x}, ${y}) scale(${presentationScale})`}
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel}
      aria-haspopup="dialog"
      aria-expanded={isSelected}
      cursor="pointer"
      opacity={emphasis !== undefined ? emphasis : isDimmed ? 0.25 : 1}
      style={{ transition: 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(summary.operatorId);
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 0. Invisible Touch Target Area (Guarantees >= 44px hit target across all LODs and camera zooms) */}
      <circle cx={0} cy={0} r={22 / lodScale} fill="transparent" pointerEvents="all" />

      {/* Visual Content Group */}
      <g className="sgp-op-visual-content">
        {/* 1. SELECTION / FOCUS HALO */}
        {isSelected && (
          <circle
            cx={0}
            cy={0}
            r={18.5}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={2}
            filter="drop-shadow(0 0 6px rgba(0, 229, 255, 0.75))"
            className="sgp-op-marker-halo"
          />
        )}

        {/* 2. WHITE SEPARATION RING (Section 12: white separation ring against aerial map) */}
        <circle
          cx={0}
          cy={0}
          r={15.5}
          fill="#0F172A"
          stroke="rgba(255, 255, 255, 0.90)"
          strokeWidth={1.5}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 15, 25, 0.40))' }}
        />

        {/* 3. PROGRESS RING TRACK (Section 13: track rgba(255,255,255,.18-.24)) */}
        <circle
          cx={0}
          cy={0}
          r={ringRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={2.8}
        />

        {/* 4. PROGRESS RING INDICATOR (Section 13: operational teal/cyan #06B6D4, animate 250-300ms ease-out) */}
        <circle
          cx={0}
          cy={0}
          r={ringRadius}
          fill="none"
          stroke={isSelected ? '#38BDF8' : '#06B6D4'}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={ringCircumference}
          strokeDashoffset={strokeOffset}
          transform="rotate(-90)"
          style={{ transition: 'stroke-dashoffset 280ms ease-out' }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />

        {/* 5. INNER AVATAR DISC (Dark Circle with Initials) */}
        <circle
          cx={0}
          cy={0}
          r={10.5}
          fill="#0B192C"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={1}
        />

        {initial ? (
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={9.5}
            fontWeight={700}
            fontFamily="system-ui, -apple-system, sans-serif"
            pointerEvents="none"
            letterSpacing="0.04em"
          >
            {initial}
          </text>
        ) : (
          <g transform="translate(-5, -5)">
            <User size={10} color="#FFFFFF" />
          </g>
        )}

        {/* 6. ISSUE BADGE: RENDER ONLY WHEN ISSUE COUNT > 0 (Section 14: does not cover initials) */}
        {issueCount > 0 && (
          <g transform="translate(11, -11)" className="sgp-op-badge" pointerEvents="none">
            <circle
              cx={0}
              cy={0}
              r={5.5}
              fill={hasOverdue ? '#EF4444' : '#F59E0B'}
              stroke="#FFFFFF"
              strokeWidth={1}
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
            />
            <text
              x={0}
              y={2.5}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={7.5}
              fontWeight={800}
              fontFamily="system-ui, sans-serif"
            >
              {issueCount > 9 ? '9+' : issueCount}
            </text>
          </g>
        )}
      </g>

      {/* 7. MINIMAL HOVER TOOLTIP */}
      {isHovered && !isSelected && (
        <g transform="translate(0, -24)" pointerEvents="none" className="sgp-op-hover-tooltip">
          <rect
            x={-75}
            y={-11}
            width={150}
            height={22}
            rx={4}
            fill="#0B192C"
            fillOpacity={0.94}
            stroke="rgba(255, 255, 255, 0.20)"
            strokeWidth={1}
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
          />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={10}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            {summary.fullName} ({initial}) · {summary.progressPct}% ca
          </text>
        </g>
      )}
    </g>
  );
});

OperatorMapMarker.displayName = 'OperatorMapMarker';


