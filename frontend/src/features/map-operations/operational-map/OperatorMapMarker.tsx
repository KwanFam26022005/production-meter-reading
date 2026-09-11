import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';

export interface OperatorMapMarkerProps {
  summary: OperatorShiftSummary;
  x: number;
  y: number;
  isSelected?: boolean;
  onClick: (operatorId: string) => void;
}

/**
 * OperatorMapMarker — Spatial representation of a responsible operator on the operational map.
 *
 * Visual hierarchy:
 * - Inner circular avatar disc with operator initial or User icon (diameter 28px, r=14)
 * - Outer SVG circular progress ring (r=19, circumference ≈ 119.38px)
 * - Progress color: Brand Teal (#0E7490) / Active Blue (#0284C7)
 * - Track color: Neutral slate (#CBD5E1)
 * - CRITICAL RULE: Progress ring represents SHIFT PROGRESS (0-100%), NOT severity/issues.
 * - Issue badge (top-right): Red (#EF4444) for overdue count, Amber (#F59E0B) for review count.
 * - Selected state: Subtle halo ring (r=25).
 * - Full accessibility: role="button", role="progressbar", keyboard Enter/Space/Escape.
 */
export const OperatorMapMarker: React.FC<OperatorMapMarkerProps> = React.memo(({
  summary,
  x,
  y,
  isSelected = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // SVG circular geometry
  const ringRadius = 19;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~119.38
  const clampedProgress = Math.max(0, Math.min(100, summary.progressPct));
  const strokeOffset = ringCircumference - (clampedProgress / 100) * ringCircumference;

  const initial = summary.fullName?.trim()?.charAt(0)?.toUpperCase();
  const hasOverdue = summary.overdueMeters > 0;
  const hasReview = summary.reviewMeters > 0;

  // Accessible descriptive label
  const issueDesc = hasOverdue
    ? `${summary.overdueMeters} quá hạn`
    : hasReview
    ? `${summary.reviewMeters} cần kiểm tra`
    : 'không có ngoại lệ';

  const accessibleLabel = `${summary.fullName}, tiến độ ca ${summary.progressPct}%, ${issueDesc}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick(summary.operatorId);
    }
  };

  return (
    <g
      className={`sgp-operator-map-marker ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel}
      aria-haspopup="dialog"
      aria-expanded={isSelected}
      cursor="pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick(summary.operatorId);
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      {/* 1. SELECTION / HOVER HALO */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={25}
          fill="none"
          stroke="var(--ops-accent, #0E7490)"
          strokeWidth={2.5}
          strokeOpacity={0.45}
          className="sgp-op-marker-halo"
        />
      )}

      {/* 2. PROGRESS RING (SVG CIRCLES)
          CRITICAL: Ring color is strictly operational progress, not issue severity
      */}
      {/* Background track circle */}
      <circle
        cx={0}
        cy={0}
        r={ringRadius}
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth={3}
      />
      {/* Dynamic progress ring circle */}
      <circle
        cx={0}
        cy={0}
        r={ringRadius}
        fill="none"
        stroke={isSelected ? 'var(--ops-accent, #0E7490)' : '#0E7490'}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeDasharray={ringCircumference}
        strokeDashoffset={strokeOffset}
        transform="rotate(-90)"
        style={{ transition: 'stroke-dashoffset 340ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ hoàn thành ca trực"
      />

      {/* 3. INNER AVATAR DISC (r=14.5) */}
      <circle
        cx={0}
        cy={0}
        r={14.5}
        fill={isSelected ? 'var(--ops-accent, #0E7490)' : 'var(--ops-brand, #073B5C)'}
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
      {initial ? (
        <text
          x={0}
          y={4.5}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={11.5}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          pointerEvents="none"
        >
          {initial}
        </text>
      ) : (
        <g transform="translate(-7, -7)">
          <User size={14} color="#FFFFFF" />
        </g>
      )}

      {/* 4. EXCEPTION BADGE (Top-Right: cx=14, cy=-14)
          Red for Overdue, Amber for Review
      */}
      {hasOverdue ? (
        <g transform="translate(13, -13)" className="sgp-op-badge-overdue">
          <circle cx={0} cy={0} r={7.5} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={9}
            fontWeight={800}
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {summary.overdueMeters > 9 ? '9+' : summary.overdueMeters}
          </text>
        </g>
      ) : hasReview ? (
        <g transform="translate(13, -13)" className="sgp-op-badge-review">
          <circle cx={0} cy={0} r={7.5} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.5} />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={9}
            fontWeight={800}
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {summary.reviewMeters > 9 ? '9+' : summary.reviewMeters}
          </text>
        </g>
      ) : null}

      {/* 5. PERMANENT PROGRESS PILL (Approved Design) */}
      <g transform="translate(0, 24)" pointerEvents="none">
        <rect
          x={-18}
          y={-7}
          width={36}
          height={14}
          rx={7}
          fill="#0B192C"
          stroke={isSelected ? '#38BDF8' : '#0284C7'}
          strokeWidth={1.2}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
        />
        <text
          x={0}
          y={3}
          textAnchor="middle"
          fill="#38BDF8"
          fontSize={9}
          fontWeight={800}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {clampedProgress}%
        </text>
      </g>

      {/* 6. MINIMAL HOVER TOOLTIP (Figma 6D-F requirement)
          Shows: "Nguyễn Văn A · 65% tiến độ ca"
      */}
      {isHovered && !isSelected && (
        <g transform="translate(0, -32)" pointerEvents="none" className="sgp-op-hover-tooltip">
          <rect
            x={-90}
            y={-12}
            width={180}
            height={24}
            rx={4}
            fill="#0F172A"
            fillOpacity={0.92}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={10.5}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            {summary.fullName} · {summary.progressPct}% ca
          </text>
        </g>
      )}
    </g>
  );
});

OperatorMapMarker.displayName = 'OperatorMapMarker';

