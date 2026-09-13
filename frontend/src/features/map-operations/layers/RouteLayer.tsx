import React, { useMemo } from 'react';
import { PlannedRoute } from '../motion/routing/RouteTypes';
import { RouteInterpolator } from '../motion/routing/RouteInterpolator';
import { getAllRouteGraphs } from '../motion/routing/ZoneRouteGraph';
import { usePrefersReducedMotion } from '../motion/motionStates';

export interface RouteLayerProps {
  selectedZoneId?: string | null;
  selectedOperatorId?: string | null;
  activePlannedRoute?: PlannedRoute | null;
  debugRoutes?: boolean;
  isMoving?: boolean;
}

/**
 * RouteLayer — Spatial Operational Route Visual Layer (V15B / V15C)
 *
 * Visual Rules (Section 43, 72):
 * - Default overview: Routes hidden to maintain maritime calmness
 * - Selected operator: Displays subtle dashed cyan route corridor
 * - stroke: #06B6D4 (operational cyan)
 * - strokeDasharray: 4 6
 * - opacity: 0.55 (restrained, non-distracting)
 * - Debug mode (?showRoutes=1): Renders full corridor graph topology for QA
 */
export const RouteLayer: React.FC<RouteLayerProps> = ({
  selectedZoneId: _selectedZoneId,
  selectedOperatorId,
  activePlannedRoute,
  debugRoutes = false,
  isMoving = false,
}) => {
  const reducedMotion = usePrefersReducedMotion();



  // Compute SVG path for active planned route
  const activeRoutePath = useMemo(() => {
    if (!activePlannedRoute || activePlannedRoute.points.length < 2) return null;
    const interpolator = new RouteInterpolator(activePlannedRoute.points);
    return interpolator.toSvgPath('quadratic');
  }, [activePlannedRoute]);

  // If debug mode is active, render full graph network
  if (debugRoutes) {
    const allGraphs = getAllRouteGraphs();
    return (
      <g className="sgp-route-debug-layer" aria-label="Lớp hiển thị tuyến đường gỡ lỗi">
        {allGraphs.map((graph) => {
          const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
          return (
            <g key={graph.zoneId} className={`sgp-route-graph-${graph.zoneId}`}>
              {/* Edges */}
              {graph.edges.map((edge) => {
                const p1 = nodeMap.get(edge.from)?.canonical;
                const p2 = nodeMap.get(edge.to)?.canonical;
                if (!p1 || !p2) return null;
                return (
                  <line
                    key={edge.id}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#0284C7"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const isStart = node.type === 'operator-start';
                const isAccess = node.type === 'meter-access';
                return (
                  <g key={node.id} transform={`translate(${node.canonical.x}, ${node.canonical.y})`}>
                    <circle
                      r={isStart ? 5.5 : isAccess ? 4.5 : 3.5}
                      fill={isStart ? '#10B981' : isAccess ? '#F59E0B' : '#38BDF8'}
                      stroke="#0F172A"
                      strokeWidth={1.5}
                    />
                    <text
                      y={-6}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize={8}
                      fontFamily="monospace"
                      opacity={0.85}
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  }

  // Normal mode: only render active route for selected operator
  if (!selectedOperatorId || !activeRoutePath) {
    return null;
  }

  return (
    <g className="sgp-route-layer" aria-label="Tuyến tác nghiệp nhân viên vận hành">
      {/* Active planned route corridor */}
      <path
        d={activeRoutePath}
        fill="none"
        stroke="#06B6D4"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 6"
        strokeOpacity={0.55}
        className={isMoving && !reducedMotion ? 'sgp-active-route-moving' : ''}
        style={{
          transition: 'stroke-dashoffset 200ms linear',
        }}
      />
    </g>
  );
};
