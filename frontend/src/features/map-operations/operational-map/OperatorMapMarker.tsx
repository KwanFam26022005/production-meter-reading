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
  onClick: (operatorId: string) => void;
}

/**
 * OperatorMapMarker — V7 Visual Contract Implementation
 *
 * Rules:
 * - CIRCLE footprint: 32-36px visual footprint (r=16, d=32px)
 * - Initials inside dark circle (#0F172A)
 * - Outer circular shift progress ring (0-100%)
 * - Issue badge (top-right) ONLY when issue count > 0 (Red overdue / Amber review)
 * - NO permanent large percentage pills (clutter-free physical scene)
 * - Hover tooltip reveals full name and progress %
 * - Opacity 25% when dimmed (another zone is selected)
 */
export const OperatorMapMarker: React.FC<OperatorMapMarkerProps> = React.memo(({
  summary,
  x,
  y,
  isSelected = false,
  isDimmed = false,
  emphasis,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // SVG circular geometry: r=15.5 -> outer footprint ~34px
  const ringRadius = 15.5;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~97.39px
  const clampedProgress = Math.max(0, Math.min(100, summary.progressPct));
  const strokeOffset = ringCircumference - (clampedProgress / 100) * ringCircumference;

  // Extract initials (e.g. "Đặng Văn B" -> "DB", "Trần Thị C" -> "TC", or single initial fallback)
  const nameParts = summary.fullName?.trim().split(/\s+/) || [];
  const initial =
    nameParts.length >= 2
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
      : summary.fullName?.trim().charAt(0).toUpperCase() || 'NV';

  const hasOverdue = summary.overdueMeters > 0;
  const hasReview = summary.reviewMeters > 0;
  const issueCount = summary.overdueMeters + summary.reviewMeters;

  // Accessible descriptive label
  const issueDesc = hasOverdue
    ? `${summary.overdueMeters} quá hạn`
    : hasReview
    ? `${summary.reviewMeters} cần kiểm tra`
    : 'tiến độ bình thường';

  const accessibleLabel = `${summary.fullName} (${initial}), tiến độ ca ${summary.progressPct}%, ${issueDesc}`;

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
      }`}
      transform={`translate(${x}, ${y})`}
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
      {/* 0. 44x44 px Invisible Touch Target */}
      <circle cx={0} cy={0} r={22} fill="transparent" pointerEvents="all" />

      {/* 1. SELECTION / HOVER HALO */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={21}
          fill="none"
          stroke="#00A3FF"
          strokeWidth={2}
          strokeOpacity={0.8}
          filter="drop-shadow(0 0 6px rgba(0, 163, 255, 0.6))"
          className="sgp-op-marker-halo"
        />
      )}

      {/* 2. BACKGROUND DISC & PROGRESS TRACK */}
      <circle
        cx={0}
        cy={0}
        r={ringRadius}
        fill="#0F172A"
        stroke="#1E293B"
        strokeWidth={2.6}
      />

      {/* Dynamic progress ring circle */}
      <circle
        cx={0}
        cy={0}
        r={ringRadius}
        fill="none"
        stroke={isSelected ? '#38BDF8' : '#0284C7'}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeDasharray={ringCircumference}
        strokeDashoffset={strokeOffset}
        transform="rotate(-90)"
        style={{ transition: 'stroke-dashoffset 340ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* 3. INNER AVATAR DISC (Dark Circle with Initials) */}
      <circle
        cx={0}
        cy={0}
        r={12}
        fill="#0B192C"
        stroke="#1E293B"
        strokeWidth={1}
      />

      {initial ? (
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={10.5}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          pointerEvents="none"
          letterSpacing="0.04em"
        >
          {initial}
        </text>
      ) : (
        <g transform="translate(-6, -6)">
          <User size={12} color="#FFFFFF" />
        </g>
      )}

      {/* 4. EXCEPTION BADGE: RENDER ONLY WHEN ISSUE COUNT > 0 */}
      {issueCount > 0 && (
        <g transform="translate(12, -12)" className="sgp-op-badge">
          <circle
            cx={0}
            cy={0}
            r={6.5}
            fill={hasOverdue ? '#EF4444' : '#F59E0B'}
            stroke="#0B192C"
            strokeWidth={1.5}
            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
          />
          <text
            x={0}
            y={2.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={8}
            fontWeight={800}
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {issueCount > 9 ? '9+' : issueCount}
          </text>
        </g>
      )}

      {/* 5. MINIMAL HOVER TOOLTIP */}
      {isHovered && !isSelected && (
        <g transform="translate(0, -26)" pointerEvents="none" className="sgp-op-hover-tooltip">
          <rect
            x={-75}
            y={-11}
            width={150}
            height={22}
            rx={4}
            fill="#0B192C"
            fillOpacity={0.94}
            stroke="#1E293B"
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


