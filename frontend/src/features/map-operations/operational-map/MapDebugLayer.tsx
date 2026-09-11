import React, { useMemo } from 'react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import {
  OPERATIONAL_ZONES_GEOMETRY,
  normalizedToOperationalSvg,
  getZoneOperatorAnchor,
} from '../geometry/operationalGeometry';

interface MapDebugLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
}

function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i - 1 + n) % n;
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const MapDebugLayer: React.FC<MapDebugLayerProps> = ({ meters }) => {
  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mapDebug') === '1';
  }, []);

  if (!isDebug) return null;

  return (
    <g className="sgp-map-debug-layer" pointerEvents="none">
      {/* 1. Zone Bounding Boxes and Polygon Vertices */}
      {OPERATIONAL_ZONES_GEOMETRY.map((zone) => {
        const xs = zone.pointsSvg.map((p) => p.x);
        const ys = zone.pointsSvg.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const opAnchor = getZoneOperatorAnchor(zone.id);
        const anchorInside = isPointInPolygon(opAnchor.x, opAnchor.y, zone.pointsSvg);

        return (
          <g key={`debug-zone-${zone.id}`}>
            {/* Bounding box */}
            <rect
              x={minX}
              y={minY}
              width={maxX - minX}
              height={maxY - minY}
              fill="none"
              stroke="#E11D48"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <text
              x={minX + 6}
              y={minY + 12}
              fill="#E11D48"
              fontSize={10}
              fontFamily="monospace"
              fontWeight="bold"
            >
              [BBOX: {zone.id}]
            </text>

            {/* Vertices */}
            {zone.pointsSvg.map((pt, idx) => (
              <g key={`vertex-${idx}`} transform={`translate(${pt.x}, ${pt.y})`}>
                <circle r={3} fill="#E11D48" />
                <text x={4} y={-4} fill="#E11D48" fontSize={9} fontFamily="monospace">
                  P{idx}({pt.x},{pt.y})
                </text>
              </g>
            ))}

            {/* Operator Anchor Verification */}
            <g transform={`translate(${opAnchor.x}, ${opAnchor.y})`}>
              <circle r={7} fill="none" stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={2} />
              <line x1={-9} y1={0} x2={9} y2={0} stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={1.5} />
              <line x1={0} y1={-9} x2={0} y2={9} stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={1.5} />
              <rect
                x={12}
                y={-14}
                width={110}
                height={26}
                fill="#1E293B"
                opacity={0.85}
                rx={3}
              />
              <text x={16} y={-3} fill="#F8FAFC" fontSize={9} fontFamily="monospace" fontWeight="bold">
                OP:{zone.id.replace('zone-', '')}
              </text>
              <text
                x={16}
                y={8}
                fill={anchorInside ? '#34D399' : '#F87171'}
                fontSize={8}
                fontFamily="monospace"
              >
                {anchorInside ? `IN (${opAnchor.x},${opAnchor.y})` : `OUT! (${opAnchor.x},${opAnchor.y})`}
              </text>
            </g>
          </g>
        );
      })}

      {/* 2. Meter Spatial Invariant Verification Cards */}
      {meters.map((m) => {
        const { x, y } = normalizedToOperationalSvg(m.coordinates);

        // Check which geometric zone it falls into
        let geomZone = 'NONE';
        for (const zone of OPERATIONAL_ZONES_GEOMETRY) {
          if (isPointInPolygon(x, y, zone.pointsSvg)) {
            geomZone = zone.id;
            break;
          }
        }

        const pass = geomZone === m.zoneId;

        return (
          <g key={`debug-meter-${m.id}`} transform={`translate(${x}, ${y})`}>
            {/* Indicator crosshair */}
            <circle r={10} fill="none" stroke={pass ? '#10B981' : '#E11D48'} strokeWidth={1.5} strokeDasharray={pass ? undefined : '2 2'} />
            <rect
              x={-55}
              y={-54}
              width={110}
              height={44}
              rx={4}
              fill="#0F172A"
              opacity={0.92}
              stroke={pass ? '#10B981' : '#E11D48'}
              strokeWidth={1.5}
            />
            <text x={-50} y={-41} fill="#F8FAFC" fontSize={10} fontFamily="monospace" fontWeight="bold">
              {m.meterCode}
            </text>
            <text x={28} y={-41} fill={pass ? '#34D399' : '#F87171'} fontSize={9} fontFamily="monospace" fontWeight="bold">
              {pass ? 'PASS' : 'FAIL'}
            </text>
            <text x={-50} y={-29} fill="#94A3B8" fontSize={8} fontFamily="monospace">
              db:{m.zoneId.replace('zone-', '')}
            </text>
            <text x={-50} y={-19} fill={pass ? '#94A3B8' : '#FCA5A5'} fontSize={8} fontFamily="monospace">
              geo:{geomZone.replace('zone-', '')} ({x},{y})
            </text>
          </g>
        );
      })}
    </g>
  );
};
