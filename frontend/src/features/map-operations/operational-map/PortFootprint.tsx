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
 * Industrial Spatial Minimalism (Hightopo Language):
 * - Physical layer at 35–60% opacity — recedes behind operational elements
 * - Saigon River with subtle horizontal texture lines
 * - Stronger quay structural edge with berth markings
 * - Sub-blocks with low-contrast fill and subtle inner stroke
 * - Roads slightly darker than ground
 * - Zone container frames as thin structural geometry
 */
export const PortFootprint: React.FC = React.memo(() => {
  const ship = PHYSICAL_RIVER.mooredShip;

  return (
    <g className="sgp-physical-backdrop" pointerEvents="none" opacity={0.88}>
      {/* 1. SAIGON RIVER (NORTH BANNER) */}
      <path
        d={PHYSICAL_RIVER.path}
        fill={PHYSICAL_RIVER.color}
        stroke={PHYSICAL_RIVER.edgeColor}
        strokeWidth={1.5}
      />

      {/* Subtle horizontal water texture lines */}
      {[28, 52, 76, 98].map((y) => (
        <line
          key={`water-tex-${y}`}
          x1={40}
          y1={y}
          x2={1260}
          y2={y}
          stroke="#B5C8D6"
          strokeWidth={0.6}
          opacity={0.3}
        />
      ))}

      {/* Mooring Guidelines in River */}
      {PHYSICAL_RIVER.guidelines.map((gl, idx) => (
        <line
          key={`gl-${idx}`}
          x1={gl.x1}
          y1={gl.y1}
          x2={gl.x2}
          y2={gl.y2}
          stroke="#A8BCCA"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
      {PHYSICAL_RIVER.mooringLines.map((ml, idx) => (
        <line
          key={`ml-${idx}`}
          x1={ml.x}
          y1={ml.y1}
          x2={ml.x}
          y2={ml.y2}
          stroke="#9CB4C4"
          strokeWidth={1.2}
          strokeDasharray="4 4"
          opacity={0.55}
        />
      ))}

      {/* River Centered Title */}
      <text
        x={650}
        y={PHYSICAL_RIVER.labelY}
        fill="#4A6A7D"
        fontSize={13}
        fontWeight={700}
        letterSpacing={4}
        textAnchor="middle"
        opacity={0.7}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {PHYSICAL_RIVER.label}
      </text>

      {/* Moored Cargo Ship (Two-tone Stadium Pill) */}
      <g className="sgp-moored-ship" opacity={0.65}>
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
          fontSize={9}
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

      {/* 3. QUAYSIDE APRON (CẦU CẢNG) — stronger structural edge */}
      <rect
        x={PHYSICAL_QUAY.rect.x}
        y={PHYSICAL_QUAY.rect.y}
        width={PHYSICAL_QUAY.rect.width}
        height={PHYSICAL_QUAY.rect.height}
        fill={PHYSICAL_QUAY.fill}
        stroke={PHYSICAL_QUAY.stroke}
        strokeWidth={1.8}
        rx={2}
      />
      {/* Berth subdivision lines */}
      {[PHYSICAL_QUAY.dividerX, 810].map((dx, i) => (
        <line
          key={`berth-div-${i}`}
          x1={dx}
          y1={PHYSICAL_QUAY.rect.y}
          x2={dx}
          y2={PHYSICAL_QUAY.rect.y + PHYSICAL_QUAY.rect.height}
          stroke="#B0C4D1"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
      ))}
      {/* Bollard reference marks along quay edge */}
      {[200, 350, 500, 650, 800, 950, 1100].map((bx) => (
        <circle
          key={`bollard-${bx}`}
          cx={bx}
          cy={PHYSICAL_QUAY.rect.y + PHYSICAL_QUAY.rect.height}
          r={2}
          fill="#94AEBB"
          opacity={0.4}
        />
      ))}
      {/* Quayside Title */}
      <text
        x={PHYSICAL_QUAY.labelPosition.x}
        y={PHYSICAL_QUAY.labelPosition.y}
        fill="#1E3A4C"
        fontSize={11}
        fontWeight={700}
        letterSpacing={1}
        textAnchor="middle"
        opacity={0.75}
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
          fill="#5A7382"
          fontSize={9}
          fontWeight={600}
          textAnchor="middle"
          opacity={0.7}
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
        opacity={0.7}
      />
      {/* Horizontal Crossroad */}
      <rect
        x={PHYSICAL_ROADS.crossroad.x}
        y={PHYSICAL_ROADS.crossroad.y}
        width={PHYSICAL_ROADS.crossroad.width}
        height={PHYSICAL_ROADS.crossroad.height}
        fill={PHYSICAL_ROADS.crossroad.fill}
        opacity={0.7}
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
        opacity={0.5}
      />
      {/* Luu Trong Lu Access Axis Label */}
      <text
        x={PHYSICAL_ROADS.axisLabelPosition.x}
        y={PHYSICAL_ROADS.axisLabelPosition.y}
        fill="#6B8290"
        fontSize={8.5}
        fontWeight={700}
        letterSpacing={0.5}
        textAnchor="middle"
        opacity={0.6}
        fontFamily="system-ui, sans-serif"
      >
        {PHYSICAL_ROADS.axisLabel}
      </text>

      {/* 5. ZONE CONTAINER FRAMES — thin structural geometry */}
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
              strokeWidth={1}
              opacity={0.5}
            />
          ) : zf.polygon ? (
            <path
              d={zf.polygon}
              fill="transparent"
              stroke="#B0C4D1"
              strokeWidth={1}
              opacity={0.5}
            />
          ) : null}
          <text
            x={zf.titlePosition.x}
            y={zf.titlePosition.y}
            fill="#2E4F62"
            fontSize={10}
            fontWeight={700}
            letterSpacing={0.8}
            textAnchor="middle"
            opacity={0.6}
            fontFamily="system-ui, sans-serif"
          >
            {zf.title}
          </text>
        </g>
      ))}

      {/* 6. PHYSICAL SUB-BLOCKS (10 UNITS) — low contrast, subtle depth */}
      {PHYSICAL_SUB_BLOCKS.map((blk) => (
        <g key={blk.id} className="sgp-sub-block">
          {/* Subtle depth shadow */}
          <rect
            x={blk.rect.x + 1}
            y={blk.rect.y + 1}
            width={blk.rect.width}
            height={blk.rect.height}
            rx={blk.rect.rx}
            fill="rgba(7, 59, 92, 0.03)"
          />
          {/* Block fill */}
          <rect
            x={blk.rect.x}
            y={blk.rect.y}
            width={blk.rect.width}
            height={blk.rect.height}
            rx={blk.rect.rx}
            fill="#ECF1F4"
            stroke="#BCC9D4"
            strokeWidth={0.8}
            opacity={0.55}
          />
          {/* Inner highlight */}
          <rect
            x={blk.rect.x + 1.5}
            y={blk.rect.y + 1.5}
            width={blk.rect.width - 3}
            height={blk.rect.height - 3}
            rx={Math.max(0, blk.rect.rx - 1.5)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={0.5}
          />
          <text
            x={blk.rect.x + 8}
            y={blk.rect.y + 14}
            fill="#5A7382"
            fontSize={8.5}
            fontWeight={700}
            opacity={0.6}
            fontFamily="system-ui, sans-serif"
          >
            {blk.name}
          </text>
        </g>
      ))}
    </g>
  );
});

PortFootprint.displayName = 'PortFootprint';
