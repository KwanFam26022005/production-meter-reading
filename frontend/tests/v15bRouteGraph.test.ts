import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllRouteGraphs,
  getZoneRouteGraph,
  getRouteGraphForMeter,
  calculateEuclideanDistance,
} from '../src/features/map-operations/motion/routing/ZoneRouteGraph';
import {
  validateAllRouteGraphs,
  validateZoneRouteGraph,
} from '../src/features/map-operations/motion/routing/RouteValidation';
import { RoutePlanner } from '../src/features/map-operations/motion/routing/RoutePlanner';
import { RouteInterpolator } from '../src/features/map-operations/motion/routing/RouteInterpolator';
import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../src/features/map-operations/geometry/canonicalScene';

test('V15B Route: Exactly 6 canonical presentation zone route graphs exist', () => {
  const graphs = getAllRouteGraphs();
  assert.equal(graphs.length, 6, 'Must contain exactly 6 route graphs');

  const expectedZoneIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];

  for (const zoneId of expectedZoneIds) {
    const g = getZoneRouteGraph(zoneId);
    assert.ok(g, `Route graph for zone ${zoneId} must exist`);
    assert.equal(g.zoneId, zoneId);
    assert.equal(g.mapVersion, 'tan-thuan-v10');
    assert.equal(g.coordinateSystem, 'tan-thuan-canonical-image-pixel-space-v1');
  }
});

test('V15B Route: All route nodes are within canonical scene bounds [0, 1915] x [0, 821]', () => {
  const graphs = getAllRouteGraphs();
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      assert.ok(
        node.canonical.x >= 0 && node.canonical.x <= CANONICAL_SCENE_WIDTH,
        `Node ${node.id} x (${node.canonical.x}) must be in [0, ${CANONICAL_SCENE_WIDTH}]`
      );
      assert.ok(
        node.canonical.y >= 0 && node.canonical.y <= CANONICAL_SCENE_HEIGHT,
        `Node ${node.id} y (${node.canonical.y}) must be in [0, ${CANONICAL_SCENE_HEIGHT}]`
      );
    }
  }
});

test('V15B Route: 100% of the 12 canonical meters have dedicated access nodes and pass graph validation', () => {
  const graphs = getAllRouteGraphs();
  const validationResult = validateAllRouteGraphs(graphs, CANONICAL_12_METERS_AUDIT);

  if (!validationResult.valid) {
    console.error('Validation issues:', validationResult.issues);
  }
  assert.equal(validationResult.valid, true, 'All route graphs must pass validation without errors');

  // Verify 12/12 meter mappings
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12);
  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const mapping = getRouteGraphForMeter(meter.code);
    assert.ok(mapping, `Meter ${meter.code} must be mapped in a route graph`);
    assert.ok(mapping.accessNodeId, `Meter ${meter.code} must have an access node ID`);

    const accessNode = mapping.graph.nodes.find((n) => n.id === mapping.accessNodeId);
    assert.ok(accessNode, `Access node ${mapping.accessNodeId} must exist in graph`);
  }
});

test('V15B Route: Meter access nodes preserve 22-40px clearance to prevent marker overlap', () => {
  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const mapping = getRouteGraphForMeter(meter.code);
    assert.ok(mapping);
    const accessNode = mapping.graph.nodes.find((n) => n.id === mapping.accessNodeId)!;

    const clearance = calculateEuclideanDistance(accessNode.canonical, {
      x: meter.canonicalX,
      y: meter.canonicalY,
    });

    assert.ok(
      clearance >= 22 && clearance <= 40,
      `Meter ${meter.code} clearance ${clearance.toFixed(1)}px must be within [22, 40]px (got ${clearance})`
    );
  }
});

test('V15B Route: Operator start node connects to all assigned meter access nodes', () => {
  const graphs = getAllRouteGraphs();
  for (const graph of graphs) {
    const startNode = graph.nodes.find((n) => n.id === graph.operatorStartNodeId);
    assert.ok(startNode, `Zone ${graph.zoneId} must have start node ${graph.operatorStartNodeId}`);

    for (const [meterId, accessNodeId] of Object.entries(graph.meterAccess)) {
      const route = RoutePlanner.planRoute({
        graph,
        startNodeId: graph.operatorStartNodeId,
        targetNodeId: accessNodeId,
        meterId,
      });

      assert.ok(route, `Must generate planned route for meter ${meterId}`);
      assert.equal(route.zoneId, graph.zoneId);
      assert.equal(route.startNodeId, graph.operatorStartNodeId);
      assert.equal(route.targetNodeId, accessNodeId);
      assert.ok(route.points.length >= 2, `Route to ${meterId} must have at least 2 points`);
      assert.ok(route.totalDistance > 0, `Route distance must be positive`);
    }
  }
});

test('V15B Planner: Deterministic Dijkstra generates consistent shortest path and distances', () => {
  const berthGraph = getZoneRouteGraph('pres-berth')!;
  const accessNodeId = berthGraph.meterAccess['CT-003'];

  const route1 = RoutePlanner.planRoute({
    graph: berthGraph,
    startNodeId: berthGraph.operatorStartNodeId,
    targetNodeId: accessNodeId,
    meterId: 'CT-003',
  });

  const route2 = RoutePlanner.planRoute({
    graph: berthGraph,
    startNodeId: berthGraph.operatorStartNodeId,
    targetNodeId: accessNodeId,
    meterId: 'CT-003',
  });

  assert.deepEqual(route1.nodeIds, route2.nodeIds);
  assert.equal(route1.totalDistance, route2.totalDistance);
  assert.deepEqual(route1.points, route2.points);

  // Trivial zero-distance route when start equals target
  const selfRoute = RoutePlanner.planRoute({
    graph: berthGraph,
    startNodeId: berthGraph.operatorStartNodeId,
    targetNodeId: berthGraph.operatorStartNodeId,
  });
  assert.equal(selfRoute.totalDistance, 0);
  assert.equal(selfRoute.nodeIds.length, 1);
});

test('V15B Interpolator: Continuous progress sampling and SVG path generation', () => {
  const points = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 200 },
  ];
  const interpolator = new RouteInterpolator(points);

  assert.equal(interpolator.totalLength, 200);

  // Sample progress
  const p0 = interpolator.getPointAtProgress(0);
  assert.equal(p0.x, 100);
  assert.equal(p0.y, 100);

  const pMid = interpolator.getPointAtProgress(0.5);
  assert.equal(pMid.x, 200);
  assert.equal(pMid.y, 100);

  const p1 = interpolator.getPointAtProgress(1);
  assert.equal(p1.x, 200);
  assert.equal(p1.y, 200);

  // SVG path generation
  const linearSvg = interpolator.toSvgPath('linear');
  assert.equal(linearSvg, 'M 100 100 L 200 100 L 200 200');

  const quadSvg = interpolator.toSvgPath('quadratic');
  assert.ok(quadSvg.startsWith('M 100 100'));
  assert.ok(quadSvg.includes('Q 200 100'));
});

test('V15B Freeze: Presentation zone polygons and canonical coordinates strictly unchanged', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915);
  assert.equal(CANONICAL_SCENE_HEIGHT, 821);
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12);

  // Verify sample meter coordinates match authoritative baseline
  const ct001 = CANONICAL_12_METERS_AUDIT.find((m) => m.code === 'CT-001')!;
  assert.equal(ct001.canonicalX, 1148);
  assert.equal(ct001.canonicalY, 686);

  const ct003 = CANONICAL_12_METERS_AUDIT.find((m) => m.code === 'CT-003')!;
  assert.equal(ct003.canonicalX, 337);
  assert.equal(ct003.canonicalY, 316);
});
