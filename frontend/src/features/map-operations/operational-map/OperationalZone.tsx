import React from 'react';
import { SpatialZonePresentation } from '../geometry/operationalGeometry';
import { ZoneOperationalState } from '../state/operationalProjection';
import { OperationalLayerType } from '../types';

interface OperationalZoneProps {
  geometry: SpatialZonePresentation & { id?: string };
  operationalState: ZoneOperationalState;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  activeLayer: OperationalLayerType;
  onSelect: (zoneId: string) => void;
  onHover: (zoneId: string | null) => void;
}

/**
 * SVG Icons matching approved zoning spec:
 * ship, container, warehouse, gear, gate
 */
const ZoneGlyph: React.FC<{ icon: SpatialZonePresentation['icon'] }> = ({ icon }) => {
  switch (icon) {
    case 'ship':
      return (
        <g>
          <path
            d="M -7 2 L -5 6 L 5 6 L 7 2 L 6 0 L -6 0 Z"
            fill="currentColor"
          />
          <path
            d="M -2 0 L -2 -4 L 2 -4 L 2 0"
            fill="currentColor"
          />
          <line x1="0" y1="-4" x2="0" y2="-6" stroke="currentColor" strokeWidth="1.2" />
        </g>
      );
    case 'container':
      return (
        <g>
          <rect
            x="-7"
            y="-5"
            width="14"
            height="10"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <line x1="-2.5" y1="-5" x2="-2.5" y2="5" stroke="currentColor" strokeWidth="1" />
          <line x1="2.5" y1="-5" x2="2.5" y2="5" stroke="currentColor" strokeWidth="1" />
        </g>
      );
    case 'warehouse':
      return (
        <g>
          <path
            d="M -7 4 L -7 -1 L 0 -6 L 7 -1 L 7 4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M -2.5 4 L -2.5 0 L 2.5 0 L 2.5 4 Z"
            fill="currentColor"
          />
        </g>
      );
    case 'gear':
      return (
        <g>
          <circle cx="0" cy="0" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M 0 -6 L 0 6 M -6 0 L 6 0 M -4.2 -4.2 L 4.2 4.2 M -4.2 4.2 L 4.2 -4.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );
    case 'gate':
      return (
        <g>
          <path
            d="M -6 6 L -6 -4 L 6 -4 L 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <line x1="-6" y1="0" x2="6" y2="0" stroke="currentColor" strokeWidth="1.1" />
          <line x1="-1.5" y1="-4" x2="-1.5" y2="6" stroke="currentColor" strokeWidth="1.1" />
          <line x1="1.5" y1="-4" x2="1.5" y2="6" stroke="currentColor" strokeWidth="1.1" />
        </g>
      );
    default:
      return <circle cx="0" cy="0" r="4" fill="currentColor" />;
  }
};

/**
 * OperationalZone — V7 Visual Contract Implementation
 *
 * Visual Rules:
 * - Physical map remains dominant.
 * - Fills:
 *   * Default: 8-14% translucent theme tint
 *   * Hover: 15-20% theme tint
 *   * Selected: 28-30% full contextual emphasis
 * - Strokes:
 *   * Default: 2.2px crisp theme boundary color
 *   * Hover: 2.8px with theme glow
 *   * Selected: 3.2px with strong theme glow
 * - Centered Zone Identity Badge:
 *   * Frosted capsule pill matching tan-thuan-approved-zoning.png
 *   * SVG Zone Icon + Zone Name
 * - Floating Exception Badge (`⚠️ N`) if issueCount > 0
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
  const zoneKey = geometry.presentationId || geometry.id || operationalState.zoneId;
  const { totalMeters, overdue, review } = operationalState;
  const issueCount = overdue + review;
  const health = operationalState.health;

  // Semantic presentation color from design tokens
  const primaryColor = geometry.primaryColor || geometry.boundaryColor || '#0284C7';
  const glowColor = geometry.glowColor || '#38BDF8';
  const badgeBg = geometry.badgeBg || 'rgba(7, 26, 43, 0.90)';
  const badgeBorder = geometry.badgeBorder || primaryColor;
  const badgeText = geometry.badgeText || '#E0F2FE';

  // V9 Dual-Stroke & Zone Opacity States (Section 14 & 15)
  // Layer A: Soft Halo (fill = none, stroke ~4px, stroke-opacity ~0.12-0.18)
  // Layer B: Structural Edge & State Fill (fill 0.045-0.20, stroke ~1.4-1.8px, stroke-opacity ~0.78-0.88)
  let haloStrokeOpacity = 0.15;
  let haloStrokeWidth = 4.0;

  let fillOpacity = 0.055; // Overview: 0.045–0.065
  let structuralBorderOpacity = 0.82; // 0.78–0.88
  let structuralBorderWidth = 1.6; // 1.4–1.8px

  if (isSelected) {
    haloStrokeOpacity = 0.22;
    haloStrokeWidth = 4.5;
    fillOpacity = 0.18; // Selected: 0.16–0.20
    structuralBorderOpacity = 0.95;
    structuralBorderWidth = 2.0;
  } else if (isHovered) {
    haloStrokeOpacity = 0.18;
    haloStrokeWidth = 4.0;
    fillOpacity = 0.10; // Hover: 0.09–0.12
    structuralBorderOpacity = 0.88;
    structuralBorderWidth = 1.8;
  } else if (isDimmed) {
    haloStrokeOpacity = 0.08;
    haloStrokeWidth = 3.5;
    fillOpacity = 0.035; // Inactive non-selected during focus: 0.025–0.045
    structuralBorderOpacity = 0.35;
    structuralBorderWidth = 1.4;
  }

  // Pill label text (Section 12: Map renders shortLabel)
  const labelText = geometry.shortLabel || geometry.name || operationalState.name;
  const pillWidth = Math.max(120, labelText.length * 7.5 + 46);
  const pillX = geometry.labelPositionSvg?.x ?? geometry.centroidSvg.x;
  const pillY = geometry.labelPositionSvg?.y ?? geometry.centroidSvg.y;

  // Exception badge position: placed right below or next to the identity pill
  const badgeX = geometry.exceptionBadgeSvg?.x ?? pillX;
  const badgeY = geometry.exceptionBadgeSvg?.y ?? (pillY + 28);

  return (
    <g
      className={`sgp-operational-zone ${isSelected ? 'selected' : ''} ${
        isHovered ? 'hovered' : ''
      } ${health.toLowerCase()}`}
      data-zone-id={zoneKey}
      tabIndex={0}
      role="button"
      aria-label={`${labelText}, ${totalMeters} công tơ, ${issueCount} vấn đề`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(zoneKey);
        }
      }}
    >
      {/* LAYER A — SOFT HALO (Section 14: soft exterior halo, fill=none) */}
      <path
        d={geometry.polygonSvg}
        fill="none"
        stroke={primaryColor}
        strokeOpacity={haloStrokeOpacity}
        strokeWidth={haloStrokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        style={{
          transition: 'stroke-opacity 240ms ease, stroke-width 240ms ease',
        }}
      />

      {/* LAYER B — STRUCTURAL EDGE & FILL (Section 14: crisp edge + calm state fill) */}
      <path
        d={geometry.polygonSvg}
        fill={primaryColor}
        fillOpacity={fillOpacity}
        stroke={primaryColor}
        strokeOpacity={structuralBorderOpacity}
        strokeWidth={structuralBorderWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        cursor="pointer"
        style={{
          transition: 'fill-opacity 240ms ease, stroke-opacity 240ms ease, stroke-width 240ms ease',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zoneKey);
        }}
        onMouseEnter={() => onHover(zoneKey)}
        onMouseLeave={() => onHover(null)}
      />

      {/* 2. CENTERED ZONE IDENTITY BADGE PILL (tan-thuan-approved-zoning.png) */}
      <g
        className="sgp-zone-identity-pill"
        transform={`translate(${pillX}, ${pillY})`}
        cursor="pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zoneKey);
        }}
        onMouseEnter={() => onHover(zoneKey)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Frosted glass capsule background */}
        <rect
          x={-pillWidth / 2}
          y={-13}
          width={pillWidth}
          height={26}
          rx={13}
          fill={badgeBg}
          stroke={isSelected ? glowColor : isHovered ? glowColor : badgeBorder}
          strokeWidth={isSelected ? 2 : 1.2}
          filter={
            isSelected
              ? `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 4px 10px rgba(0,0,0,0.5))`
              : isHovered
              ? `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 3px 8px rgba(0,0,0,0.4))`
              : 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))'
          }
          style={{ transition: 'all 200ms ease' }}
        />

        {/* Zone Icon Glyph */}
        <g
          transform={`translate(${-pillWidth / 2 + 15}, 0)`}
          style={{ color: isSelected || isHovered ? '#FFFFFF' : badgeBorder }}
        >
          <ZoneGlyph icon={geometry.icon} />
        </g>

        {/* Zone Name Label */}
        <text
          x={-pillWidth / 2 + 28}
          y={4}
          fill={isSelected || isHovered ? '#FFFFFF' : badgeText}
          fontSize={11.5}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.02em"
          pointerEvents="none"
        >
          {labelText}
        </text>
      </g>

      {/* 3. FLOATING EXCEPTION BADGE (Figma 2:104)
          Rendered when the zone has any overdue or review meters
      */}
      {issueCount > 0 && (
        <g
          className="sgp-zone-exception-badge"
          transform={`translate(${badgeX}, ${badgeY})`}
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(zoneKey);
          }}
          onMouseEnter={() => onHover(zoneKey)}
          onMouseLeave={() => onHover(null)}
          aria-label={`${issueCount} vấn đề trong ${geometry.shortName}`}
        >
          {/* Capsule pill background */}
          <rect
            x={-24}
            y={-11}
            width={48}
            height={22}
            rx={11}
            fill="#FFFBEB"
            stroke="#FDE68A"
            strokeWidth={1.2}
            filter="drop-shadow(0 2px 6px rgba(180, 83, 9, 0.25))"
          />
          {/* Warning Icon (SVG glyph) */}
          <g transform="translate(-16, -6)">
            <path
              d="M 6,1 L 11.5,10 L 0.5,10 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth={0.8}
            />
            <line x1={6} y1={4} x2={6} y2={7} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
            <circle cx={6} cy={8.8} r={0.7} fill="#FFFFFF" />
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
