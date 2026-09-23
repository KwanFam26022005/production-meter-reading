import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT_B, LAYOUT_B2 } from '../frontend/src/components/map-v2/utilityDemoLayout.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to calculate total length of a path
function calculatePathLength(points) {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    length += Math.hypot(x2 - x1, y2 - y1);
  }
  return length;
}

// Helper to count bends (points where direction changes)
function countBends(points) {
  if (points.length <= 2) return 0;
  let bends = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x1;
    const dy2 = y2 - y1;
    // Cross product to check if collinear
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 1e-4) {
      bends++;
    }
  }
  return bends;
}

// Check intersection between two segments (p1-p2 and p3-p4)
// Exclude endpoints within epsilon
function getSegmentIntersection(p1, p2, p3, p4, eps = 1e-3) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const [x4, y4] = p4;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-6) return null; // Parallel or collinear

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  // Strict interior intersection (not shared endpoints)
  if (ua > eps && ua < 1 - eps && ub > eps && ub < 1 - eps) {
    const ix = x1 + ua * (x2 - x1);
    const iy = y1 + ua * (y2 - y1);
    return [Math.round(ix * 10) / 10, Math.round(iy * 10) / 10];
  }
  return null;
}

// Find all crossings between a list of edges and another list of edges
function findCrossings(edges1, edges2, isSameSet = false) {
  const crossings = [];
  for (let i = 0; i < edges1.length; i++) {
    const e1 = edges1[i];
    const jStart = isSameSet ? i + 1 : 0;
    for (let j = jStart; j < edges2.length; j++) {
      const e2 = edges2[j];
      if (isSameSet && e1.id === e2.id) continue;

      for (let s1 = 0; s1 < e1.displayPath.length - 1; s1++) {
        const p1 = e1.displayPath[s1];
        const p2 = e1.displayPath[s1 + 1];
        for (let s2 = 0; s2 < e2.displayPath.length - 1; s2++) {
          const p3 = e2.displayPath[s2];
          const p4 = e2.displayPath[s2 + 1];

          const pt = getSegmentIntersection(p1, p2, p3, p4);
          if (pt) {
            crossings.push({
              point: pt,
              edge1: e1.id,
              edge2: e2.id,
              utility1: e1.utilityType,
              utility2: e2.utilityType,
            });
          }
        }
      }
    }
  }
  return crossings;
}

function analyzeLayout(layout) {
  const elecEdges = layout.edges.filter((e) => e.utilityType === 'ELECTRICITY');
  const waterEdges = layout.edges.filter((e) => e.utilityType === 'WATER');

  let elecLength = 0;
  let elecBends = 0;
  for (const e of elecEdges) {
    elecLength += calculatePathLength(e.displayPath);
    elecBends += countBends(e.displayPath);
  }

  let waterLength = 0;
  let waterBends = 0;
  for (const e of waterEdges) {
    waterLength += calculatePathLength(e.displayPath);
    waterBends += countBends(e.displayPath);
  }

  const sameElecCrossings = findCrossings(elecEdges, elecEdges, true);
  const sameWaterCrossings = findCrossings(waterEdges, waterEdges, true);
  const crossUtilityCrossings = findCrossings(elecEdges, waterEdges, false);

  const uniqueSpatialCrossings = [];
  const seenPts = new Set();
  for (const c of crossUtilityCrossings) {
    const key = `${c.point[0]},${c.point[1]}`;
    if (!seenPts.has(key)) {
      seenPts.add(key);
      uniqueSpatialCrossings.push({
        point: c.point,
        involvedEdges: crossUtilityCrossings.filter((x) => `${x.point[0]},${x.point[1]}` === key).map((x) => `${x.edge1} x ${x.edge2}`),
      });
    }
  }

  const elecSource = layout.nodes.find((n) => n.id === 'SIM-EXT-GRID');
  const waterSource = layout.nodes.find((n) => n.id === 'SIM-CITY-WATER');
  const sourceSeparation = elecSource && waterSource
    ? Math.hypot(waterSource.displayX - elecSource.displayX, waterSource.displayY - elecSource.displayY)
    : 0;

  return {
    key: layout.key,
    name: layout.name,
    totalNodes: layout.nodes.length,
    electricityNodes: layout.nodes.filter((n) => n.utilityType === 'ELECTRICITY').length,
    waterNodes: layout.nodes.filter((n) => n.utilityType === 'WATER').length,
    totalEdges: layout.edges.length,
    electricityEdges: elecEdges.length,
    waterEdges: waterEdges.length,
    totalLengthPx: Math.round(elecLength + waterLength),
    electricityLengthPx: Math.round(elecLength),
    waterLengthPx: Math.round(waterLength),
    totalBends: elecBends + waterBends,
    electricityBends: elecBends,
    waterBends: waterBends,
    sameUtilityCrossings: sameElecCrossings.length + sameWaterCrossings.length,
    sameElecCrossings,
    sameWaterCrossings,
    spatialCrossingPointsCount: uniqueSpatialCrossings.length,
    spatialCrossingPoints: uniqueSpatialCrossings,
    edgePairCrossingsCount: crossUtilityCrossings.length,
    crossUtilityCrossings,
    sourceSeparationPx: Math.round(sourceSeparation * 10) / 10,
    sourceCoords: {
      electricity: elecSource ? [elecSource.displayX, elecSource.displayY] : null,
      water: waterSource ? [waterSource.displayX, waterSource.displayY] : null,
    },
  };
}

const metricsB = analyzeLayout(LAYOUT_B);
const metricsB2 = analyzeLayout(LAYOUT_B2);

const comparison = {
  baseline: metricsB,
  refined: metricsB2,
  diff: {
    totalLengthDeltaPx: metricsB2.totalLengthPx - metricsB.totalLengthPx,
    totalLengthPercentChange: `${(((metricsB2.totalLengthPx - metricsB.totalLengthPx) / metricsB.totalLengthPx) * 100).toFixed(1)}%`,
    totalBendsDelta: metricsB2.totalBends - metricsB.totalBends,
    spatialCrossingsDelta: metricsB2.spatialCrossingPointsCount - metricsB.spatialCrossingPointsCount,
    sourceSeparationDeltaPx: Math.round((metricsB2.sourceSeparationPx - metricsB.sourceSeparationPx) * 10) / 10,
    sourceSeparationMultiplier: `${(metricsB2.sourceSeparationPx / metricsB.sourceSeparationPx).toFixed(2)}x`,
  },
  timestamp: new Date().toISOString(),
};

const outputPath = path.resolve(
  __dirname,
  '../docs/implementation/map-v2-utility-layout-b2/utility_layout_metrics_B_vs_B2.json'
);

fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2), 'utf-8');
console.log('Successfully written metrics comparison to:', outputPath);
console.log(JSON.stringify(comparison, null, 2));
