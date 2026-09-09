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

  // Health color mapping
  const healthStyles = {
    HEALTHY: {
      border: '#10B981',
      badgeBg: '#ECFDF5',
      badgeText: '#065F46',
      badgeBorder: '#A7F3D0',
      label: '✓ Ổn định',
    },
    ATTENTION: {
      border: '#F59E0B',
      badgeBg: '#FFFBEB',
      badgeText: '#92400E',
      badgeBorder: '#FDE68A',
      label: `⚠ ${review} cần duyệt`,
    },
    CRITICAL: {
      border: '#EF4444',
      badgeBg: '#FEF2F2',
      badgeText: '#991B1B',
      badgeBorder: '#FECACA',
      label: `⚠ ${overdue} quá hạn`,
    },
  }[health];

  const strokeColor = isSelected ? '#073B5C' : healthStyles.border;
  const strokeWidth = isSelected ? 3.5 : isHovered ? 2.8 : 2;

  // Centroid card position
  const cx = geometry.centroidSvg.x;
  const cy = geometry.centroidSvg.y;

  return (
    <g
      className={`sgp-operational-zone ${isSelected ? 'selected' : ''} ${
        isHovered ? 'hovered' : ''
      }`}
      opacity={isDimmed ? 0.2 : 1}
      style={{ transition: 'opacity 0.25s ease' }}
    >
      {/* 1. ZONE BOUNDARY POLYGON */}
      <path
        d={geometry.polygonSvg}
        fill="rgba(248, 250, 252, 0.45)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={health === 'CRITICAL' ? '8 4' : undefined}
        cursor="pointer"
        onClick={() => onSelect(geometry.id)}
        onMouseEnter={() => onHover(geometry.id)}
        onMouseLeave={() => onHover(null)}
      />

      {/* 2. ZONE CENTROID OPERATIONAL KPI CARD (Crisp SVG Plate) */}
      <g
        transform={`translate(${cx - 95}, ${cy - 38})`}
        cursor="pointer"
        onClick={() => onSelect(geometry.id)}
        onMouseEnter={() => onHover(geometry.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Card Shadow & Background */}
        <rect
          width={190}
          height={76}
          rx={8}
          fill="#FFFFFF"
          stroke={isSelected ? '#073B5C' : isHovered ? '#0B4F75' : '#D7E0E5'}
          strokeWidth={isSelected ? 2 : 1.2}
          filter="drop-shadow(0 3px 8px rgba(7, 59, 92, 0.12))"
        />

        {/* Zone Name */}
        <text
          x={12}
          y={20}
          fill="#073B5C"
          fontSize={11.5}
          fontWeight={700}
          letterSpacing={0.2}
        >
          {geometry.shortName.toUpperCase()}
        </text>

        {/* Progress Bar & Ratio */}
        <g transform="translate(12, 30)">
          {/* Track */}
          <rect width={95} height={6} rx={3} fill="#E2E8F0" />
          {/* Fill */}
          <rect
            width={Math.round((progressPct / 100) * 95)}
            height={6}
            rx={3}
            fill={progressPct === 100 ? '#10B981' : '#0B4F75'}
            style={{ transition: 'width 0.4s ease' }}
          />
          {/* Progress % and Fraction */}
          <text
            x={103}
            y={7}
            fill="#1E293B"
            fontSize={10.5}
            fontWeight={700}
            className="font-tabular"
          >
            {progressPct}%
          </text>
          <text
            x={138}
            y={7}
            fill="#64748B"
            fontSize={9.5}
            className="font-tabular"
          >
            ({completed}/{totalMeters})
          </text>
        </g>

        {/* Health / Alert Pill */}
        {activeLayer !== 'OWNERSHIP' ? (
          <g transform="translate(12, 48)">
            <rect
              width={166}
              height={18}
              rx={4}
              fill={healthStyles.badgeBg}
              stroke={healthStyles.badgeBorder}
              strokeWidth={1}
            />
            <text
              x={83}
              y={13}
              fill={healthStyles.badgeText}
              fontSize={9.5}
              fontWeight={600}
              textAnchor="middle"
            >
              {healthStyles.label}
            </text>
          </g>
        ) : (
          /* Ownership Layer info */
          <g transform="translate(12, 48)">
            <rect
              width={166}
              height={18}
              rx={4}
              fill="#F1F5F9"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
            <text
              x={83}
              y={13}
              fill="#0F172A"
              fontSize={9.5}
              fontWeight={600}
              textAnchor="middle"
            >
              {operator?.fullName ? `👤 ${operator.fullName}` : 'Chưa phân công'}
            </text>
          </g>
        )}
      </g>
    </g>
  );
};
