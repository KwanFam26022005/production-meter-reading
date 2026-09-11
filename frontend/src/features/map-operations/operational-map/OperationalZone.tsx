import React from 'react';
import { OperationalZoneGeometry } from '../geometry/operationalGeometry';
import { ZoneOperationalState } from '../state/operationalProjection';
import { OperationalLayerType } from '../types';

interface OperationalZoneProps {
  geometry: OperationalZoneGeometry;
  operationalState: ZoneOperationalState;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  activeLayer: OperationalLayerType;
  onSelect: (zoneId: string) => void;
  onHover: (zoneId: string | null) => void;
}

/**
 * OperationalZone — Interactive Zone overlay matching Figma Frames 2:2, 2:104, 2:363
 *
 * Rules:
 * - Default / Healthy state is calm with no heavy chrome.
 * - Selection triggers a soft zone highlight tint (Figma 2:363).
 * - Exceptions show a floating capsule badge (`⚠️ N`) placed under the zone title (Figma 2:104).
 * - Clicking polygon or badge selects the zone.
 */
export const OperationalZone: React.FC<OperationalZoneProps> = React.memo(({
  geometry,
  operationalState,
  isSelected,
  isHovered,
  isDimmed,
  onSelect,
  onHover,
}) => {
  const { totalMeters, overdue, review } = operationalState;
  const issueCount = overdue + review;
  const health = operationalState.health; // 'HEALTHY' | 'ATTENTION' | 'CRITICAL'

  // Zone Visual States per Industrial Spatial System:
  // DEFAULT: quiet boundary, subtle fill
  // HOVER: slightly stronger edge, slight fill elevation
  // SELECTED: selected zone at full emphasis (accent border, soft tint)
  // ATTENTION: amber edge, subtle warning affordance
  // CRITICAL: red edge, semantic alert emphasis (do NOT fill entire zone bright red)
  let strokeColor = 'rgba(11, 79, 117, 0.18)';
  let strokeWidth = 1;
  let fillColor = 'rgba(11, 79, 117, 0.015)';

  if (isSelected) {
    strokeColor = 'var(--ops-accent, #0E7490)';
    strokeWidth = 2.5;
    fillColor = 'rgba(14, 116, 144, 0.08)';
  } else if (isHovered) {
    strokeColor = 'var(--ops-accent, #0E7490)';
    strokeWidth = 1.8;
    fillColor = 'rgba(14, 116, 144, 0.04)';
  } else if (health === 'CRITICAL') {
    strokeColor = 'var(--status-overdue, #DC2626)';
    strokeWidth = 1.5;
    fillColor = 'rgba(220, 38, 38, 0.035)';
  } else if (health === 'ATTENTION') {
    strokeColor = 'var(--status-review, #F59E0B)';
    strokeWidth = 1.3;
    fillColor = 'rgba(245, 158, 11, 0.025)';
  }

  const badgeX = geometry.exceptionBadgeSvg.x;
  const badgeY = geometry.exceptionBadgeSvg.y;

  return (
    <g
      className={`sgp-operational-zone ${isSelected ? 'selected' : ''} ${
        isHovered ? 'hovered' : ''
      } ${health.toLowerCase()}`}
      data-zone-id={geometry.id}
      opacity={isDimmed ? 0.30 : 1}
      style={{ transition: 'opacity 340ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      tabIndex={0}
      role="button"
      aria-label={`Khu ${geometry.shortName}, ${totalMeters} công tơ, ${issueCount} vấn đề`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(geometry.id);
        }
      }}
    >
      {/* 1. INTERACTIVE ZONE BOUNDARY POLYGON */}
      <path
        d={geometry.polygonSvg}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        cursor="pointer"
        style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(geometry.id);
        }}
        onMouseEnter={() => onHover(geometry.id)}
        onMouseLeave={() => onHover(null)}
      />

      {/* 2. FLOATING ZONE EXCEPTION BADGE (Figma 2:104)
          Rendered when the zone has any overdue or review meters
      */}
      {issueCount > 0 && (
        <g
          className="sgp-zone-exception-badge"
          transform={`translate(${badgeX}, ${badgeY})`}
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(geometry.id);
          }}
          onMouseEnter={() => onHover(geometry.id)}
          onMouseLeave={() => onHover(null)}
          aria-label={`${issueCount} vấn đề trong khu ${geometry.shortName}`}
        >
          {/* Capsule pill background */}
          <rect
            x={-24}
            y={-12}
            width={48}
            height={24}
            rx={12}
            fill="#FFFBEB"
            stroke="#FDE68A"
            strokeWidth={1.2}
            filter="drop-shadow(0 2px 4px rgba(180, 83, 9, 0.12))"
          />
          {/* Warning Icon (SVG glyph) */}
          <g transform="translate(-16, -6.5)">
            <path
              d="M 6.5,0.5 L 12.5,11 L 0.5,11 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth={0.8}
            />
            <line x1={6.5} y1={4} x2={6.5} y2={7.5} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
            <circle cx={6.5} cy={9.5} r={0.7} fill="#FFFFFF" />
          </g>
          {/* Exception Count */}
          <text
            x={6}
            y={4}
            fill="#92400E"
            fontSize={11}
            fontWeight={800}
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
          >
            {issueCount}
          </text>
        </g>
      )}
    </g>
  );
});

OperationalZone.displayName = 'OperationalZone';
