import React from 'react';
import {
  PHYSICAL_CONTAINER_YARDS,
  PHYSICAL_PORT_LAND,
  PHYSICAL_QUAY,
  PHYSICAL_RIVER,
  PHYSICAL_ROADS,
  PHYSICAL_TECHNICAL_STRUCTURES,
  PHYSICAL_WAREHOUSES,
} from '../geometry/physicalScene';

/**
 * PortFootprint — SVG Physical Backdrop for Tan Thuan Port
 *
 * Renders the elongated, desaturated physical features:
 * - Saigon River with gentle water ripples
 * - Main land footprint with concrete quay edge
 * - Moored vessel silhouette along Berth 2
 * - Warehouses, Container yard blocks, Technical area, Main gate
 * - Arterial road network
 *
 * All fills and strokes use calm, low-saturation tones so operational
 * status information visually dominates.
 */
export const PortFootprint: React.FC = () => {
  const landPointsStr = PHYSICAL_PORT_LAND.points
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <g className="sgp-physical-backdrop" pointerEvents="none">
      {/* 1. SAIGON RIVER */}
      <path
        d={PHYSICAL_RIVER.path}
        fill={PHYSICAL_RIVER.color}
        stroke={PHYSICAL_RIVER.edgeColor}
        strokeWidth={1.5}
      />
      {PHYSICAL_RIVER.ripples.map((rip, idx) => (
        <path
          key={`rip-${idx}`}
          d={rip.d}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={rip.opacity}
        />
      ))}
      <text
        x={650}
        y={45}
        fill="#5A7D94"
        fontSize={14}
        fontWeight={700}
        letterSpacing={4}
        textAnchor="middle"
        opacity={0.8}
      >
        {PHYSICAL_RIVER.label}
      </text>

      {/* 2. PORT LAND FOOTPRINT */}
      <polygon
        points={landPointsStr}
        fill={PHYSICAL_PORT_LAND.fillColor}
        stroke={PHYSICAL_PORT_LAND.strokeColor}
        strokeWidth={1.5}
      />

      {/* 3. CONCRETE QUAY APRON & BERTHS */}
      <rect
        x={PHYSICAL_QUAY.rect.x}
        y={PHYSICAL_QUAY.rect.y}
        width={PHYSICAL_QUAY.rect.width}
        height={PHYSICAL_QUAY.rect.height}
        fill={PHYSICAL_QUAY.concreteFill}
        stroke="#BDCBD4"
        strokeWidth={1}
      />
      {/* Crane rails line */}
      <line
        x1={PHYSICAL_QUAY.rect.x}
        y1={PHYSICAL_QUAY.rect.y + 12}
        x2={PHYSICAL_QUAY.rect.x + PHYSICAL_QUAY.rect.width}
        y2={PHYSICAL_QUAY.rect.y + 12}
        stroke={PHYSICAL_QUAY.railStroke}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      {/* Mooring Bollards */}
      {PHYSICAL_QUAY.bollards.map((b, idx) => (
        <circle
          key={`bollard-${idx}`}
          cx={b.x}
          cy={b.y}
          r={2.5}
          fill="#475569"
        />
      ))}
      {/* Berth Labels */}
      {PHYSICAL_QUAY.berths.map((berth) => (
        <text
          key={berth.id}
          x={berth.x}
          y={berth.y}
          fill="#475569"
          fontSize={11}
          fontWeight={700}
          letterSpacing={1.5}
          textAnchor="middle"
          opacity={0.7}
        >
          {berth.name}
        </text>
      ))}

      {/* Moored Cargo Ship */}
      <path
        d={PHYSICAL_QUAY.mooredShip.path}
        fill={PHYSICAL_QUAY.mooredShip.fill}
      />
      <rect
        x={PHYSICAL_QUAY.mooredShip.superstructure.x}
        y={PHYSICAL_QUAY.mooredShip.superstructure.y}
        width={PHYSICAL_QUAY.mooredShip.superstructure.width}
        height={PHYSICAL_QUAY.mooredShip.superstructure.height}
        fill={PHYSICAL_QUAY.mooredShip.superstructure.fill}
        rx={2}
      />
      <text
        x={835}
        y={108}
        fill="#FFFFFF"
        fontSize={9}
        fontWeight={700}
        letterSpacing={1}
        textAnchor="middle"
        opacity={0.9}
      >
        {PHYSICAL_QUAY.mooredShip.label}
      </text>

      {/* 4. INTERNAL ROAD NETWORK */}
      {PHYSICAL_ROADS.map((road) => (
        <path
          key={road.id}
          d={road.d}
          fill="none"
          stroke="#E2E8ED"
          strokeWidth={road.strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {/* Road edge subtle markings */}
      {PHYSICAL_ROADS.map((road) => (
        <path
          key={`sub-${road.id}`}
          d={road.d}
          fill="none"
          stroke="#D2DCE3"
          strokeWidth={1}
          strokeDasharray="8 8"
        />
      ))}

      {/* 5. WAREHOUSES (WEST SECTOR) */}
      {PHYSICAL_WAREHOUSES.map((wh) => (
        <g key={wh.id} opacity={0.85}>
          <rect
            x={wh.rect.x}
            y={wh.rect.y}
            width={wh.rect.width}
            height={wh.rect.height}
            fill="#EAF0F4"
            stroke="#BDCBD4"
            strokeWidth={1.2}
            rx={3}
          />
          {/* Subtle loading bay doors */}
          <line
            x1={wh.rect.x + 10}
            y1={wh.rect.y + wh.rect.height}
            x2={wh.rect.x + wh.rect.width - 10}
            y2={wh.rect.y + wh.rect.height}
            stroke="#94A3B8"
            strokeWidth={3}
          />
          <text
            x={wh.rect.x + wh.rect.width / 2}
            y={wh.rect.y + 22}
            fill="#334155"
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
          >
            {wh.code}
          </text>
          <text
            x={wh.rect.x + wh.rect.width / 2}
            y={wh.rect.y + 38}
            fill="#64748B"
            fontSize={9.5}
            textAnchor="middle"
          >
            {wh.subTitle}
          </text>
        </g>
      ))}

      {/* 6. CONTAINER YARDS (EAST SECTOR) */}
      {PHYSICAL_CONTAINER_YARDS.map((cy) => (
        <g key={cy.id} opacity={0.85}>
          <rect
            x={cy.rect.x}
            y={cy.rect.y}
            width={cy.rect.width}
            height={cy.rect.height}
            fill="#EDF2F6"
            stroke="#CBD5E1"
            strokeWidth={1.2}
            rx={3}
          />
          {/* Grid lines representing container slots */}
          {Array.from({ length: cy.rows - 1 }).map((_, rIdx) => {
            const yPos = cy.rect.y + ((rIdx + 1) * cy.rect.height) / cy.rows;
            return (
              <line
                key={`cy-r-${rIdx}`}
                x1={cy.rect.x + 4}
                y1={yPos}
                x2={cy.rect.x + cy.rect.width - 4}
                y2={yPos}
                stroke="#D8E2E8"
                strokeWidth={1}
              />
            );
          })}
          {Array.from({ length: cy.cols - 1 }).map((_, cIdx) => {
            const xPos = cy.rect.x + ((cIdx + 1) * cy.rect.width) / cy.cols;
            return (
              <line
                key={`cy-c-${cIdx}`}
                x1={xPos}
                y1={cy.rect.y + 4}
                x2={xPos}
                y2={cy.rect.y + cy.rect.height - 4}
                stroke="#D8E2E8"
                strokeWidth={1}
              />
            );
          })}
          <text
            x={cy.rect.x + 12}
            y={cy.rect.y + 16}
            fill="#475569"
            fontSize={10}
            fontWeight={700}
          >
            {cy.code}
          </text>
        </g>
      ))}

      {/* 7. TECHNICAL AREA STRUCTURES */}
      {PHYSICAL_TECHNICAL_STRUCTURES.map((tech) => (
        <g key={tech.id} opacity={0.85}>
          <rect
            x={tech.rect.x}
            y={tech.rect.y}
            width={tech.rect.width}
            height={tech.rect.height}
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth={1}
            rx={2}
          />
          <text
            x={tech.rect.x + tech.rect.width / 2}
            y={tech.rect.y + tech.rect.height / 2 + 3}
            fill="#475569"
            fontSize={8.5}
            fontWeight={700}
            textAnchor="middle"
          >
            {tech.name}
          </text>
        </g>
      ))}
    </g>
  );
};
