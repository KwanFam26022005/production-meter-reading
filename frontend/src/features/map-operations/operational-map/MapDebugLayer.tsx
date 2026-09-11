import React, { useMemo } from 'react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import {
  OPERATIONAL_ZONES_GEOMETRY,
  getZoneOperatorAnchor,
  isPointInZone,
} from '../geometry/operationalGeometry';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_MAP_VERSION,
  CANONICAL_12_METERS_AUDIT,
  normalizedToCanonicalScene,
} from '../geometry/canonicalScene';

interface MapDebugLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
}

/**
 * MapDebugLayer — Diagnostics Overlay activated via ?mapDebug=1 (Section 21)
 *
 * Shows:
 * 1. Canonical Scene Bounds (0, 0, 1664, 932)
 * 2. Operational Zone Polygons & Vertices
 * 3. 12-Meter Calibration Audit (Code, Zone, X/Y, Landmark, PASS/FAIL inside polygon)
 * 4. Operator Anchors, assigned zones, and progress ring checks
 * 5. Compact Diagnostic HUD Summary
 */
export const MapDebugLayer: React.FC<MapDebugLayerProps> = ({ meters }) => {
  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mapDebug') === '1';
  }, []);

  if (!isDebug) return null;

  // Evaluate 12/12 calibration gate dynamically
  const auditResults = CANONICAL_12_METERS_AUDIT.map((audit) => {
    const liveMeter = meters.find((m) => m.meterCode === audit.code);
    const coords = liveMeter
      ? normalizedToCanonicalScene(liveMeter.coordinates)
      : { x: audit.canonicalX, y: audit.canonicalY };

    const zoneGeom = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === audit.businessZoneId);
    const inside = zoneGeom ? isPointInZone(coords.x, coords.y, zoneGeom) : false;

    return {
      code: audit.code,
      zoneId: audit.businessZoneId,
      coords,
      landmark: audit.nearestLandmark,
      pass: inside,
    };
  });

  const passCount = auditResults.filter((r) => r.pass).length;

  return (
    <g className="sgp-map-debug-layer" pointerEvents="none">
      {/* 1. CANONICAL SCENE BOUNDS (1664 x 932) */}
      <rect
        x={2}
        y={2}
        width={CANONICAL_SCENE_WIDTH - 4}
        height={CANONICAL_SCENE_HEIGHT - 4}
        fill="none"
        stroke="#06B6D4"
        strokeWidth={2}
        strokeDasharray="8 6"
        opacity={0.7}
      />
      <text
        x={12}
        y={24}
        fill="#06B6D4"
        fontSize={13}
        fontFamily="monospace"
        fontWeight="bold"
      >
        [CANONICAL SCENE: {CANONICAL_SCENE_WIDTH}x{CANONICAL_SCENE_HEIGHT} v={CANONICAL_MAP_VERSION} · CALIBRATION: {passCount}/12 PASS]
      </text>

      {/* 2. ZONE POLYGONS & VERTICES */}
      {OPERATIONAL_ZONES_GEOMETRY.map((zone) => {
        const opAnchor = getZoneOperatorAnchor(zone.id);
        const anchorInside = isPointInZone(opAnchor.x, opAnchor.y, zone);

        return (
          <g key={`debug-zone-${zone.id}`}>
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
              <circle r={8} fill="none" stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={2} />
              <line x1={-10} y1={0} x2={10} y2={0} stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={1.5} />
              <line x1={0} y1={-10} x2={0} y2={10} stroke={anchorInside ? '#059669' : '#DC2626'} strokeWidth={1.5} />
              <rect
                x={14}
                y={-14}
                width={120}
                height={22}
                fill="#0F172A"
                opacity={0.88}
                rx={3}
              />
              <text x={18} y={1} fill="#38BDF8" fontSize={9} fontFamily="monospace" fontWeight="bold">
                OP:{zone.id} [{anchorInside ? 'PASS' : 'FAIL'}]
              </text>
            </g>
          </g>
        );
      })}

      {/* 3. METER AUDIT VERIFICATION LABELS */}
      {auditResults.map(({ code, zoneId, coords, landmark, pass }) => (
        <g key={`debug-meter-${code}`} transform={`translate(${coords.x}, ${coords.y})`}>
          <circle r={10} fill="none" stroke={pass ? '#10B981' : '#EF4444'} strokeWidth={1.5} />
          <rect
            x={12}
            y={-18}
            width={130}
            height={26}
            fill="#0F172A"
            opacity={0.9}
            rx={3}
            stroke={pass ? '#10B981' : '#EF4444'}
            strokeWidth={1}
          />
          <text x={16} y={-6} fill="#F8FAFC" fontSize={8.5} fontFamily="monospace" fontWeight="bold">
            {code} · {landmark}
          </text>
          <text x={16} y={4} fill={pass ? '#34D399' : '#F87171'} fontSize={8} fontFamily="monospace">
            {zoneId} [{pass ? 'PASS' : 'FAIL'}] ({coords.x},{coords.y})
          </text>
        </g>
      ))}
    </g>
  );
};
