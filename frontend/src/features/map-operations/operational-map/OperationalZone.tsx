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
  const { totalMeters, overdue, review, health } = operationalState;
  const issueCount = overdue + review;

  // Semantic presentation color from design tokens
  const primaryColor = geometry.primaryColor || geometry.boundaryColor || '#0284C7';
  const glowColor = geometry.glowColor || '#38BDF8';

  // V10 Dual-Stroke & Zone Opacity States (Section 36 & 37)
  // Layer A: Soft Halo (4-5px, opacity 0.10-0.16)
  // Layer B: Structural Edge (1.4-1.8px, opacity 0.75-0.88)
  // Fill opacities: default 0.045, hover 0.090, selected 0.160, dimmed 0.020
  let haloStrokeOpacity = 0.14;
  let haloStrokeWidth = 4.2;

  let fillOpacity = 0.045; // Overview: 0.035–0.055
  let structuralBorderOpacity = 0.82; // 0.75–0.88
  let structuralBorderWidth = 1.6; // 1.4–1.8px

  if (isSelected) {
    haloStrokeOpacity = 0.22;
    haloStrokeWidth = 4.8;
    fillOpacity = 0.16; // Selected: 0.14–0.18
    structuralBorderOpacity = 0.95;
    structuralBorderWidth = 2.0;
  } else if (isHovered) {
    haloStrokeOpacity = 0.18;
    haloStrokeWidth = 4.4;
    fillOpacity = 0.09; // Hover: 0.075–0.105
    structuralBorderOpacity = 0.88;
    structuralBorderWidth = 1.8;
  } else if (isDimmed) {
    haloStrokeOpacity = 0.06;
    haloStrokeWidth = 3.2;
    fillOpacity = 0.020; // Inactive non-selected during focus: <= 0.025
    structuralBorderOpacity = 0.28; // 0.20-0.35
    structuralBorderWidth = 1.4;
  }

  // Cartographic label text (Section 32: tiny color dot / index / name uppercase)
  const zoneIndex = (geometry as any).displayIndex || (operationalState as any).zoneIndex || '';
  const rawLabel = geometry.shortLabel || geometry.name || operationalState.name;
  const labelText = rawLabel.toUpperCase();
  const labelTextDisplay = zoneIndex ? `${zoneIndex}  ${labelText}` : labelText;
  const chipWidth = Math.max(90, labelTextDisplay.length * 6.6 + 26);
  const pillX = geometry.labelPositionSvg?.x ?? geometry.centroidSvg.x;
  const pillY = geometry.labelPositionSvg?.y ?? geometry.centroidSvg.y;

  // Exception badge position: placed right below the cartographic label
  const badgeX = geometry.exceptionBadgeSvg?.x ?? pillX;
  const badgeY = geometry.exceptionBadgeSvg?.y ?? (pillY + 22);

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
      {/* LAYER A — SOFT HALO (Section 36: soft exterior halo, fill=none) */}
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

      {/* LAYER B — STRUCTURAL EDGE & FILL (Section 36: crisp edge + calm state fill) */}
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

      {/* 2. CARTOGRAPHIC ZONE LABEL (Section 32: spatial annotation chip, not button) */}
      <g
        className="sgp-cartographic-zone-label"
        transform={`translate(${pillX}, ${pillY})`}
        cursor="pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zoneKey);
        }}
        onMouseEnter={() => onHover(zoneKey)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Subtle dark translucent chip (15-25% opacity) */}
        <rect
          x={-chipWidth / 2}
          y={-11}
          width={chipWidth}
          height={22}
          rx={6}
          fill={isSelected ? 'rgba(6, 29, 42, 0.88)' : isHovered ? 'rgba(6, 29, 42, 0.65)' : 'rgba(6, 29, 42, 0.35)'}
          stroke={isSelected ? glowColor : isHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.10)'}
          strokeWidth={isSelected ? 1.4 : 0.8}
          filter={
            isSelected
              ? `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`
              : 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))'
          }
          style={{ transition: 'all 180ms ease' }}
        />

        {/* Tiny zone-color dot */}
        <circle
          cx={-chipWidth / 2 + 10}
          cy={0}
          r={3}
          fill={primaryColor}
        />

        {/* Cartographic Title Text */}
        <text
          x={-chipWidth / 2 + 18}
          y={3.5}
          fill={isSelected ? '#FFFFFF' : '#F1F5F9'}
          fontSize={10}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.04em"
          pointerEvents="none"
        >
          {labelTextDisplay}
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
