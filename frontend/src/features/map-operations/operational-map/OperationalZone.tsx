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

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL HIERARCHY RULE:
//   HEALTHY → quiet neutral rendering — progress label only, no bold chrome
//   ATTENTION → amber border + warning label card
//   CRITICAL  → red dashed border + alert card
// ─────────────────────────────────────────────────────────────────────────────

function getHealthVisual(health: 'HEALTHY' | 'ATTENTION' | 'CRITICAL', overdue: number, review: number) {
  if (health === 'CRITICAL') {
    return {
      border: '#EF4444',
      borderOpacity: 0.9,
      strokeWidth: 2.5,
      strokeDash: '8 4',
      fillColor: 'rgba(254, 242, 242, 0.30)',
      showCard: true,
      cardBg: '#FEF2F2',
      cardBorder: '#FECACA',
      alertText: `⚠ ${overdue} quá hạn`,
      alertColor: '#991B1B',
    };
  }
  if (health === 'ATTENTION') {
    return {
      border: '#F59E0B',
      borderOpacity: 0.85,
      strokeWidth: 2,
      strokeDash: undefined,
      fillColor: 'rgba(255, 251, 235, 0.25)',
      showCard: true,
      cardBg: '#FFFBEB',
      cardBorder: '#FDE68A',
      alertText: `⚠ ${review} cần duyệt`,
      alertColor: '#92400E',
    };
  }
  // HEALTHY — minimal decoration
  return {
    border: 'rgba(11, 79, 117, 0.22)',
    borderOpacity: 1,
    strokeWidth: 1.5,
    strokeDash: undefined,
    fillColor: 'rgba(248, 250, 252, 0.18)',
    showCard: false,
    cardBg: 'transparent',
    cardBorder: 'transparent',
    alertText: '',
    alertColor: '',
  };
}

export const OperationalZone: React.FC<OperationalZoneProps> = ({
  geometry,
  operationalState,
  isSelected,
  isHovered,
  isDimmed,
  activeLayer,
  onSelect,
  onHover,
}) => {
  const { progressPct, completed, totalMeters, health, overdue, review, operator } =
    operationalState;

  const vis = getHealthVisual(health, overdue, review);

  // Selected state always uses navy highlight
  const strokeColor = isSelected ? '#073B5C' : vis.border;
  const strokeWidth = isSelected ? 3 : isHovered ? vis.strokeWidth + 0.8 : vis.strokeWidth;
  const fillColor = isSelected
    ? 'rgba(7, 59, 92, 0.06)'
    : isHovered
    ? 'rgba(248, 250, 252, 0.30)'
    : vis.fillColor;
  const strokeDash = isSelected ? undefined : vis.strokeDash;

  // Centroid position — used for compact label
  const cx = geometry.centroidSvg.x;
  const cy = geometry.centroidSvg.y;

  // ── Compact inline label (always shown) ──
  // Format: "CẦU CẢNG\n100% · 3/3"
  // Width ~130px, minimal chrome
  const labelLine1 = geometry.shortName.toUpperCase();
  const labelLine2 = `${progressPct}% · ${completed}/${totalMeters}`;

  // Card dimensions for problem states
  const CARD_W = 140;
  const CARD_H = vis.showCard ? 58 : 38;

  return (
    <g
      className={`sgp-operational-zone ${health.toLowerCase()} ${isSelected ? 'selected' : ''} ${
        isHovered ? 'hovered' : ''
      }`}
      opacity={isDimmed ? 0.18 : 1}
      style={{ transition: 'opacity 0.25s ease' }}
    >
      {/* 1. ZONE BOUNDARY POLYGON */}
      <path
        d={geometry.polygonSvg}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        cursor="pointer"
        style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
        onClick={() => onSelect(geometry.id)}
        onMouseEnter={() => onHover(geometry.id)}
        onMouseLeave={() => onHover(null)}
      />

      {/* 2. COMPACT ZONE LABEL — always rendered, max 130px wide */}
      <g
        transform={`translate(${cx - CARD_W / 2}, ${cy - CARD_H / 2})`}
        cursor="pointer"
        onClick={() => onSelect(geometry.id)}
        onMouseEnter={() => onHover(geometry.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Label background — only add white card for problem states or selected */}
        {(vis.showCard || isSelected || isHovered) && (
          <rect
            width={CARD_W}
            height={CARD_H}
            rx={6}
            fill={isSelected ? '#FFFFFF' : vis.showCard ? vis.cardBg : 'rgba(255,255,255,0.82)'}
            stroke={isSelected ? '#073B5C' : vis.showCard ? vis.cardBorder : 'rgba(203,213,225,0.7)'}
            strokeWidth={isSelected ? 2 : 1}
            filter={vis.showCard || isSelected ? 'drop-shadow(0 2px 6px rgba(7,59,92,0.10))' : undefined}
          />
        )}

        {/* Zone short name */}
        <text
          x={CARD_W / 2}
          y={vis.showCard || isSelected || isHovered ? 16 : 10}
          fill={isSelected ? '#073B5C' : health === 'HEALTHY' ? '#334155' : '#0F172A'}
          fontSize={10}
          fontWeight={700}
          letterSpacing={0.5}
          textAnchor="middle"
        >
          {labelLine1}
        </text>

        {/* Progress & fraction — on same or next line */}
        <text
          x={CARD_W / 2}
          y={vis.showCard || isSelected || isHovered ? 31 : 24}
          fill={progressPct === 100 ? '#065F46' : '#475569'}
          fontSize={9.5}
          fontWeight={progressPct === 100 ? 600 : 500}
          className="font-tabular"
          textAnchor="middle"
        >
          {labelLine2}
        </text>

        {/* Alert text — only for ATTENTION / CRITICAL */}
        {vis.showCard && (
          <text
            x={CARD_W / 2}
            y={47}
            fill={vis.alertColor}
            fontSize={9.5}
            fontWeight={700}
            textAnchor="middle"
          >
            {vis.alertText}
          </text>
        )}

        {/* Ownership layer override — always show operator when OWNERSHIP layer active */}
        {activeLayer === 'OWNERSHIP' && !vis.showCard && (
          <text
            x={CARD_W / 2}
            y={38}
            fill="#475569"
            fontSize={9}
            textAnchor="middle"
          >
            {operator?.fullName ? `👤 ${operator.fullName}` : '—'}
          </text>
        )}
      </g>
    </g>
  );
};
