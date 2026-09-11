import React from 'react';
import {
  PHYSICAL_PORT_LAND,
  PHYSICAL_QUAY,
  PHYSICAL_RIVER,
  PHYSICAL_ROADS,
  PHYSICAL_SUB_BLOCKS,
  PHYSICAL_ZONE_FRAMES,
} from '../geometry/physicalScene';

/**
 * PortFootprint — SVG Physical Backdrop for Tan Thuan Port
 *
 * Implements the exact aesthetic from authoritative Figma frames 2:2 & 2:104:
 * - Saigon River banner with mooring lines and two-tone "TÀU HÀNG" moored vessel
 * - Quayside apron with Cầu 1, Cầu 2, Cầu 3 berth markings
 * - Arterial roads with dashed divider and Luu Trong Lu access label
 * - 4 zone container frames (CẦU CẢNG, KHO / CFS, BÃI CONTAINER, BÃI HÀNG TỔNG HỢP)
 * - 10 physical sub-blocks (Kho B, C, D, Bãi A, A2, B1, B2, Hàng Tổng Hợp, Trạm Điện, Xưởng)
 */
export const PortFootprint: React.FC = () => {
  const ship = PHYSICAL_RIVER.mooredShip;

  return (
    <g className="sgp-physical-backdrop" pointerEvents="none">
      {/* 1. SAIGON RIVER (NORTH BANNER) */}
      <path
        d={PHYSICAL_RIVER.path}
        fill={PHYSICAL_RIVER.color}
        stroke={PHYSICAL_RIVER.edgeColor}
        strokeWidth={1.5}
      />

      {/* Mooring Guidelines in River */}
      {PHYSICAL_RIVER.guidelines.map((gl, idx) => (
        <line
          key={`gl-${idx}`}
          x1={gl.x1}
          y1={gl.y1}
          x2={gl.x2}
          y2={gl.y2}
          stroke="#B5CDDE"
          strokeWidth={1}
          opacity={0.8}
        />
      ))}
      {PHYSICAL_RIVER.mooringLines.map((ml, idx) => (
        <line
          key={`ml-${idx}`}
          x1={ml.x}
          y1={ml.y1}
          x2={ml.x}
          y2={ml.y2}
          stroke="#ADC5D4"
          strokeWidth={1.2}
          strokeDasharray="4 4"
          opacity={0.7}
        />
      ))}

      {/* River Centered Title */}
      <text
        x={650}
        y={PHYSICAL_RIVER.labelY}
        fill="#3C5A6E"
        fontSize={14}
        fontWeight={700}
        letterSpacing={4}
        textAnchor="middle"
        opacity={0.9}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {PHYSICAL_RIVER.label}
      </text>

      {/* Moored Cargo Ship (Two-tone Stadium Pill) */}
      <g className="sgp-moored-ship">
        {/* Shadow / Base */}
        <rect
          x={ship.x}
          y={ship.y}
          width={ship.width}
          height={ship.height}
          rx={ship.rx}
          fill={ship.backFill}
        />
        {/* Front Section (Left side lighter color) */}
        <path
          d={`M ${ship.x + ship.rx},${ship.y}
              L ${ship.x + ship.frontWidth},${ship.y}
              L ${ship.x + ship.frontWidth},${ship.y + ship.height}
              L ${ship.x + ship.rx},${ship.y + ship.height}
              A ${ship.rx} ${ship.rx} 0 0 1 ${ship.x},${ship.y + ship.rx}
              A ${ship.rx} ${ship.rx} 0 0 1 ${ship.x + ship.rx},${ship.y} Z`}
          fill={ship.frontFill}
        />
        {/* Label */}
        <text
          x={ship.x + ship.width / 2 + 10}
          y={ship.y + 15}
          fill="#FFFFFF"
          fontSize={9.5}
          fontWeight={700}
          letterSpacing={1}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          {ship.label}
        </text>
      </g>

      {/* 2. OUTER PORT LAND FOOTPRINT */}
      <path
        d={PHYSICAL_PORT_LAND.path}
        fill={PHYSICAL_PORT_LAND.fillColor}
        stroke={PHYSICAL_PORT_LAND.strokeColor}
        strokeWidth={1.5}
      />

      {/* 3. QUAYSIDE APRON (CẦU CẢNG) */}
      <rect
        x={PHYSICAL_QUAY.rect.x}
        y={PHYSICAL_QUAY.rect.y}
        width={PHYSICAL_QUAY.rect.width}
        height={PHYSICAL_QUAY.rect.height}
        fill={PHYSICAL_QUAY.fill}
        stroke={PHYSICAL_QUAY.stroke}
        strokeWidth={1.5}
        rx={2}
      />
      {/* Vertical divider on quay */}
      <line
        x1={PHYSICAL_QUAY.dividerX}
        y1={PHYSICAL_QUAY.rect.y}
        x2={PHYSICAL_QUAY.dividerX}
        y2={PHYSICAL_QUAY.rect.y + PHYSICAL_QUAY.rect.height}
        stroke="#CAD7E2"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      {/* Quayside Title */}
      <text
        x={PHYSICAL_QUAY.labelPosition.x}
        y={PHYSICAL_QUAY.labelPosition.y}
        fill="#1E3A4C"
        fontSize={12}
        fontWeight={700}
        letterSpacing={1}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        {PHYSICAL_QUAY.label}
      </text>
      {/* Berths Labels */}
      {PHYSICAL_QUAY.berths.map((b) => (
        <text
          key={b.id}
          x={b.x}
          y={b.y}
          fill="#475569"
          fontSize={10}
          fontWeight={600}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          {b.name}
        </text>
      ))}

      {/* 4. ARTERIAL ROADS & CENTRAL AXIS */}
      {/* Central Avenue (Vertical) */}
      <rect
        x={PHYSICAL_ROADS.centralAvenue.x}
        y={PHYSICAL_ROADS.centralAvenue.y}
        width={PHYSICAL_ROADS.centralAvenue.width}
        height={PHYSICAL_ROADS.centralAvenue.height}
        fill={PHYSICAL_ROADS.centralAvenue.fill}
      />
      {/* Horizontal Crossroad */}
      <rect
        x={PHYSICAL_ROADS.crossroad.x}
        y={PHYSICAL_ROADS.crossroad.y}
        width={PHYSICAL_ROADS.crossroad.width}
        height={PHYSICAL_ROADS.crossroad.height}
        fill={PHYSICAL_ROADS.crossroad.fill}
      />
      {/* Crossroad Center Divider */}
      <line
        x1={PHYSICAL_ROADS.centerline.x1}
        y1={PHYSICAL_ROADS.centerline.y1}
        x2={PHYSICAL_ROADS.centerline.x2}
        y2={PHYSICAL_ROADS.centerline.y2}
        stroke={PHYSICAL_ROADS.centerline.stroke}
        strokeWidth={PHYSICAL_ROADS.centerline.strokeWidth}
        strokeDasharray={PHYSICAL_ROADS.centerline.strokeDasharray}
      />
      {/* Luu Trong Lu Access Axis Label */}
      <text
        x={PHYSICAL_ROADS.axisLabelPosition.x}
        y={PHYSICAL_ROADS.axisLabelPosition.y}
        fill="#5A7382"
        fontSize={9.5}
        fontWeight={700}
        letterSpacing={0.5}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        {PHYSICAL_ROADS.axisLabel}
      </text>

      {/* 5. ZONE CONTAINER FRAMES */}
      {PHYSICAL_ZONE_FRAMES.map((zf) => (
        <g key={zf.id} className="sgp-zone-container-frame">
          {zf.rect ? (
            <rect
              x={zf.rect.x}
              y={zf.rect.y}
              width={zf.rect.width}
              height={zf.rect.height}
              rx={zf.rect.rx}
              fill="transparent"
              stroke="#B0C4D1"
              strokeWidth={1.2}
            />
          ) : zf.polygon ? (
            <path
              d={zf.polygon}
              fill="transparent"
              stroke="#B0C4D1"
              strokeWidth={1.2}
            />
          ) : null}
          <text
            x={zf.titlePosition.x}
            y={zf.titlePosition.y}
            fill="#1E3A4C"
            fontSize={11}
            fontWeight={700}
            letterSpacing={0.8}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            {zf.title}
          </text>
        </g>
      ))}

      {/* 6. PHYSICAL SUB-BLOCKS (10 UNITS) */}
      {PHYSICAL_SUB_BLOCKS.map((blk) => (
        <g key={blk.id} className="sgp-sub-block">
          <rect
            x={blk.rect.x}
            y={blk.rect.y}
            width={blk.rect.width}
            height={blk.rect.height}
            rx={blk.rect.rx}
            fill="#F6F9FA"
            stroke="#CBD9E2"
            strokeWidth={1}
          />
          <text
            x={blk.rect.x + 8}
            y={blk.rect.y + 14}
            fill="#475569"
            fontSize={9.5}
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            {blk.name}
          </text>
        </g>
      ))}
    </g>
  );
};
