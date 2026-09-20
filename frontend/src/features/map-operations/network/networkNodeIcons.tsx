import React from 'react';
import type { AssetType, UtilityType, AssetVerificationStatus } from '../../assets/types';

export interface NodeVisualProps {
  type: AssetType | 'METER' | 'SOURCE';
  code: string;
  name: string;
  utilityType?: UtilityType;
  verificationStatus?: AssetVerificationStatus;
  statusState?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  isSelected?: boolean;
  isHovered?: boolean;
  isTraced?: boolean;
  isDimmed?: boolean;
  isVerified?: boolean;
  meterType?: 'ELECTRICITY' | 'WATER';
  readingValue?: string | number;
  size?: number;
}

/**
 * Returns distinct visual color tokens for utilities and statuses (Saigon Port Design System)
 */
export const getUtilityColor = (utility: UtilityType | 'OTHER' | undefined): {
  core: string;
  casing: string;
  fill: string;
  border: string;
} => {
  if (utility === 'WATER') {
    return {
      core: '#12658F', // --sgp-brand-600
      casing: '#FFFFFF', // Neutral contrast casing
      fill: '#073B5C', // --sgp-brand-800 base
      border: '#FFFFFF', // Clean white border
    };
  }
  // Default Electricity
  return {
    core: '#073B5C', // --sgp-brand-800
    casing: '#FFFFFF', // Neutral contrast casing
    fill: '#073B5C', // --sgp-brand-800 base
    border: '#FFFFFF', // Clean white border
  };
};

export const getStatusHaloColor = (
  statusState: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' = 'NORMAL'
): { stroke: string; badge: string } => {
  switch (statusState) {
    case 'CRITICAL':
      return { stroke: '#B43A3A', badge: '#B43A3A' }; // --sgp-danger
    case 'WARNING':
      return { stroke: '#A86200', badge: '#A86200' }; // --sgp-warning
    case 'OFFLINE':
      return { stroke: '#74838C', badge: '#74838C' }; // --sgp-ink-muted
    case 'NORMAL':
    default:
      return { stroke: 'transparent', badge: 'transparent' };
  }
};

/**
 * 2D High-Contrast Vector Glyphs for Port Digital-Twin Overlay
 * Renders distinct silhouette for each technical node category.
 */
export const NetworkNodeGlyph: React.FC<{
  type: AssetType | 'METER' | 'SOURCE';
  utilityType?: UtilityType;
  color: string;
  size?: number;
}> = ({ type, utilityType, color, size = 16 }) => {
  const s = size;
  const half = s / 2;

  switch (type) {
    case 'SUBSTATION':
      // High-voltage substation: Shield box with lightning bolt
      return (
        <g stroke={color} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x={-half + 2} y={-half + 2} width={s - 4} height={s - 4} rx={3} />
          <path d="M 0 -4 L -3 1 L 1 1 L -1 5" fill="none" stroke={color} strokeWidth={2} />
        </g>
      );

    case 'TRANSFORMER':
      // Dual intersecting induction coils (schematic transformer symbol)
      return (
        <g stroke={color} fill="none" strokeWidth={1.8}>
          <circle cx={-half * 0.32} cy={0} r={half * 0.56} />
          <circle cx={half * 0.32} cy={0} r={half * 0.56} />
        </g>
      );

    case 'SWITCHBOARD':
      // Main distribution panel: Cabinet with 3 busbars
      return (
        <g stroke={color} fill="none" strokeWidth={1.7} strokeLinecap="round">
          <rect x={-half + 3} y={-half + 3} width={s - 6} height={s - 6} rx={2} />
          <line x1={-half + 5} y1={-half * 0.35} x2={half - 5} y2={-half * 0.35} />
          <line x1={-half + 5} y1={0} x2={half - 5} y2={0} />
          <line x1={-half + 5} y1={half * 0.35} x2={half - 5} y2={half * 0.35} />
        </g>
      );

    case 'FEEDER':
      // Feeder: Central bus with outgoing distribution arrows
      return (
        <g stroke={color} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={0} cy={0} r={half * 0.42} fill={color} fillOpacity={0.4} />
          <path d={`M 0 ${-half + 3} L 0 ${half - 3}`} />
          <path d={`M ${-half + 3} 0 L ${half - 3} 0`} />
          <circle cx={0} cy={0} r={half - 3} strokeDasharray="3 2" />
        </g>
      );

    case 'PUMP':
      // Centrifugal pump: circle with spiral discharge nozzle
      return (
        <g stroke={color} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={-1} cy={1} r={half * 0.6} />
          <path d={`M ${half * 0.45} ${-half * 0.25} L ${half - 2} ${-half + 3} L ${half - 2} 1`} />
          <circle cx={-1} cy={1} r={2} fill={color} />
        </g>
      );

    case 'WATER_POINT':
    case 'FIRE_WATER_POINT':
      // Water tap / hydrant / flow point
      return (
        <g stroke={color} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {/* Water droplet / valve icon */}
          <path d="M 0 -5 C -3 -1, -4 2, -4 4 C -4 6.2, -2.2 8, 0 8 C 2.2 8, 4 6.2, 4 4 C 4 2, 3 -1, 0 -5 Z" fill={color} fillOpacity={0.3} />
          <circle cx={0} cy={4} r={1.5} fill={color} />
        </g>
      );

    case 'QUAY_CRANE':
      // Gantry Quay Crane profile
      return (
        <g stroke={color} fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M -7 7 L -4 -4 L 5 -4 L 8 7" />
          <path d="M -7 -4 L 9 -4" />
          <path d="M -1 -4 L -1 4" strokeWidth={1.3} />
          <rect x={-3} y={3} width={4} height={3} fill={color} fillOpacity={0.6} />
        </g>
      );

    case 'RTG':
      // RTG Container Gantry arch
      return (
        <g stroke={color} fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M -6 7 L -6 -5 L 6 -5 L 6 7" />
          <line x1={-6} y1={-1} x2={6} y2={-1} strokeWidth={1.3} />
          <rect x={-3} y={1} width={6} height={3} rx={1} fill={color} fillOpacity={0.6} />
        </g>
      );

    case 'SOURCE':
      // Power / Water Utility Grid Inlet
      return (
        <g stroke={color} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="0,-7 6,-2 4,6 -4,6 -6,-2" fill={color} fillOpacity={0.25} />
          {utilityType === 'WATER' ? (
            <path d="M 0 -3 C -1.5 0, -2 1.5, -2 3 C -2 4.1, -1.1 5, 0 5 C 1.1 5, 2 4.1, 2 3 C 2 1.5, 1.5 0, 0 -3 Z" fill={color} />
          ) : (
            <path d="M 0 -4 L -2 0 L 1 0 L -1 4" fill="none" stroke={color} strokeWidth={1.6} />
          )}
        </g>
      );

    case 'METER':
      // Precision circular dial gauge with needle
      return (
        <g stroke={color} fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={0} cy={0} r={half * 0.75} />
          <path d={`M ${-half * 0.45} ${half * 0.25} A ${half * 0.55} ${half * 0.55} 0 1 1 ${half * 0.45} ${half * 0.25}`} strokeWidth={1.2} strokeDasharray="1.5 1.5" />
          <line x1={0} y1={0} x2={half * 0.4} y2={-half * 0.4} stroke={color} strokeWidth={1.6} />
          <circle cx={0} cy={0} r={1.5} fill={color} />
        </g>
      );

    default:
      // General equipment / facility
      return (
        <g stroke={color} fill="none" strokeWidth={1.7} strokeLinecap="round">
          <rect x={-half + 3} y={-half + 3} width={s - 6} height={s - 6} rx={2} />
          <circle cx={0} cy={0} r={half * 0.3} fill={color} fillOpacity={0.3} />
        </g>
      );
  }
};

/**
 * Composite Map-Native Node Marker with Dark Glass Backing,
 * Luminous Status Halo, Equipment Glyph, and Smart Micro-Label.
 */
export const NetworkNodeMarker: React.FC<NodeVisualProps & {
  x: number;
  y: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({
  type,
  code,
  name: _name,
  utilityType = 'ELECTRICITY',
  verificationStatus = 'VERIFIED',
  statusState = 'NORMAL',
  isSelected = false,
  isHovered = false,
  isTraced: _isTraced = false,
  isDimmed = false,
  isVerified = true,
  x,
  y,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isMeter = type === 'METER';
  const statusHalo = getStatusHaloColor(statusState);

  // Footprint dimensions: meters are compact circles (26px), assets are 32px rounded-boxes
  const nodeRadius = isMeter ? 13 : 16;
  const glyphSize = isMeter ? 15 : 18;

  // Unverified assets have amber dashed styling
  const isUnverified = !isVerified && verificationStatus !== 'VERIFIED' && verificationStatus !== 'SIMULATION_APPROVED';

  // Active / Selected emphasis
  const baseOpacity = isDimmed ? 0.22 : 1.0;

  return (
    <g
      className={`sgp-network-node ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      data-asset-code={code}
      transform={`translate(${x}, ${y})`}
      opacity={baseOpacity}
      style={{
        cursor: 'pointer',
        transition: 'opacity 220ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 1. SELECTION / FOCUS RING (CRISP MARITIME CASING, ZERO GLOW) */}
      {isSelected && (
        <>
          <circle
            cx={0}
            cy={0}
            r={nodeRadius + 7}
            fill="none"
            stroke="#073B5C"
            strokeWidth={2.2}
          />
          <circle
            cx={0}
            cy={0}
            r={nodeRadius + 4.8}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </>
      )}
      {!isSelected && isHovered && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 5}
          fill="none"
          stroke="#0B4F75"
          strokeWidth={1.5}
        />
      )}
      {!isSelected && (statusState === 'CRITICAL' || statusState === 'WARNING') && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 5}
          fill="none"
          stroke={statusHalo.stroke}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      )}

      {/* 2. HIGH-CONTRAST BASE FOOTPRINT: DISTINCT METER CIRCLE VS ASSET ROUNDED BOX */}
      {isMeter ? (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius}
          fill="#073B5C"
          stroke={isUnverified ? '#A86200' : '#FFFFFF'}
          strokeWidth={1.8}
          strokeDasharray={isUnverified ? '3 2' : 'none'}
        />
      ) : (
        <rect
          x={-nodeRadius}
          y={-nodeRadius}
          width={nodeRadius * 2}
          height={nodeRadius * 2}
          rx={type === 'SUBSTATION' || type === 'SOURCE' ? 4 : 6}
          fill="#073B5C"
          stroke={isUnverified ? '#A86200' : '#FFFFFF'}
          strokeWidth={1.8}
          strokeDasharray={isUnverified ? '3 2' : 'none'}
        />
      )}

      {/* 3. HARDWARE SILHOUETTE GLYPH */}
      <NetworkNodeGlyph
        type={type}
        utilityType={utilityType}
        color={isUnverified ? '#FFF4DF' : '#FFFFFF'}
        size={glyphSize}
      />

      {/* 4. STATUS INDICATOR DOT (Top-Right, amber for warning, red for critical) */}
      {statusState !== 'NORMAL' && (
        <circle
          cx={nodeRadius - 2}
          cy={-nodeRadius + 2}
          r={3.5}
          fill={statusHalo.badge}
          stroke="#FFFFFF"
          strokeWidth={1.2}
        />
      )}

      {/* 5. VERIFICATION UNAPPROVED BADGE (if unverified) */}
      {isUnverified && (
        <g transform={`translate(${-nodeRadius + 3}, ${nodeRadius - 3})`}>
          <circle cx={0} cy={0} r={3.2} fill="#A86200" stroke="#FFFFFF" strokeWidth={0.8} />
          <text
            x={0}
            y={2}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={5}
            fontWeight="bold"
          >
            ?
          </text>
        </g>
      )}

      {/* 6. PROGRESSIVE SMART MICRO-LABEL */}
      {(isSelected || isHovered) && (
        <g
          transform={`translate(0, ${nodeRadius + 14})`}
          pointerEvents="none"
          style={{ zIndex: 100 }}
        >
          {/* Label Backdrop Pill */}
          <rect
            x={-(code.length * 3.8 + 10)}
            y={-10}
            width={code.length * 7.6 + 20}
            height={20}
            rx={4}
            fill="#073B5C"
            stroke="#FFFFFF"
            strokeWidth={1}
          />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={10.5}
            fontWeight={600}
            letterSpacing={0.2}
            fontFamily="Be Vietnam Pro, system-ui, -apple-system, sans-serif"
          >
            {code}
          </text>
        </g>
      )}
    </g>
  );
};
