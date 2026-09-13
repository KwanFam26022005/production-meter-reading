import test from 'node:test';
import assert from 'node:assert/strict';

import { MotionClock } from '../src/features/map-operations/motion/MotionClock';
import {
  OperationalMotionController,
} from '../src/features/map-operations/motion/OperationalMotionController';
import {
  getAllRouteGraphs,
  getRouteGraphForMeter,
  calculateEuclideanDistance,
} from '../src/features/map-operations/motion/routing/ZoneRouteGraph';
import { RoutePlanner } from '../src/features/map-operations/motion/routing/RoutePlanner';
import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_OPERATOR_ANCHORS,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../src/features/map-operations/geometry/canonicalScene';
import { resolveMeterMotionState, resolveOperatorMotionState } from '../src/features/map-operations/motion/motionStates';

test('V15D Lifecycle Stress: 10x Map <-> List pause/resume preserves single MotionClock and listener invariants', () => {
  const clock = MotionClock.getInstance();
  const controller = new OperationalMotionController({ mode: 'operational' });

  controller.registerOperator('op-berth', 'pres-berth', { x: 1030, y: 285 });
  controller.startMovementToMeter('op-berth', 'CT-003');

  const initialListenerCount = clock.getListenerCount();
  assert.equal(initialListenerCount, 1, 'Exactly one listener should be subscribed to MotionClock');

  for (let i = 0; i < 10; i++) {
    // Map -> List (pause)
    controller.pause();
    assert.equal(controller.getOperatorRecord('op-berth')?.state, 'PAUSED');

    // List -> Map (resume)
    controller.resume();
    assert.equal(controller.getOperatorRecord('op-berth')?.state, 'MOVING');
  }

  // Listener count must not grow across 10 transitions
  assert.equal(clock.getListenerCount(), initialListenerCount);

  controller.destroy();
});

test('V15D Lifecycle Stress: 10x start/cancel operator movement does not leak routes or corrupted state', () => {
  const controller = new OperationalMotionController();
  const anchor = { x: 525, y: 515 };
  controller.registerOperator('op-cwest', 'pres-container-west', anchor);

  for (let i = 0; i < 10; i++) {
    const started = controller.startMovementToMeter('op-cwest', 'CT-002');
    assert.equal(started, true);
    assert.equal(controller.getOperatorRecord('op-cwest')?.state, 'MOVING');

    controller.cancel('op-cwest');
    assert.equal(controller.getOperatorRecord('op-cwest')?.state, 'IDLE');
    assert.equal(controller.getOperatorRecord('op-cwest')?.targetMeterId, null);
  }

  controller.reset({ 'op-cwest': anchor });
  assert.deepEqual(controller.getOperatorRecord('op-cwest')?.currentPosition, anchor);

  controller.destroy();
});

test('V15D Motion Density Audit: Pending, completed, and idle entities exhibit ZERO unneeded loops', () => {
  // 1. Pending meter -> static
  const pendingState = resolveMeterMotionState({
    domainStatus: 'ASSIGNED',
    meterId: 'CT-001',
    isSelected: false,
    operatorActivity: null,
  });
  assert.equal(pendingState, 'pending');

  // 2. Confirmed / Completed meter -> completed (static check glyph, no loop)
  const completedState = resolveMeterMotionState({
    domainStatus: 'CONFIRMED',
    meterId: 'CT-001',
    isSelected: false,
    operatorActivity: null,
  });
  assert.equal(completedState, 'completed');

  // 3. Idle operator -> idle (no motion loop)
  const idleState = resolveOperatorMotionState({
    operatorId: 'op-1',
    isSelected: false,
    progressPct: 50,
    operatorActivity: null,
  });
  assert.equal(idleState, 'idle');
});

test('V15D 12-Meter Workflow Route Audit: 100% of meters are routable with valid corridor distance', () => {
  const graphs = getAllRouteGraphs();
  assert.equal(graphs.length, 6);

  const routeAuditResults: {
    meterId: string;
    zoneId: string;
    accessNodeId: string;
    distance: number;
    clearance: number;
  }[] = [];

  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const mapping = getRouteGraphForMeter(meter.code);
    assert.ok(mapping, `Meter ${meter.code} must be mapped`);

    const route = RoutePlanner.planRoute({
      graph: mapping.graph,
      startNodeId: mapping.graph.operatorStartNodeId,
      targetNodeId: mapping.accessNodeId,
      meterId: meter.code,
    });

    assert.ok(route.totalDistance > 0, `Distance to ${meter.code} must be > 0`);
    assert.ok(route.points.length >= 2, `Route to ${meter.code} must have at least 2 points`);

    const accessNode = mapping.graph.nodes.find((n) => n.id === mapping.accessNodeId)!;
    const clearance = calculateEuclideanDistance(accessNode.canonical, {
      x: meter.canonicalX,
      y: meter.canonicalY,
    });

    assert.ok(
      clearance >= 22 && clearance <= 40,
      `Clearance for ${meter.code} must be within 22-40px (got ${clearance})`
    );

    routeAuditResults.push({
      meterId: meter.code,
      zoneId: mapping.graph.zoneId,
      accessNodeId: mapping.accessNodeId,
      distance: route.totalDistance,
      clearance: Math.round(clearance * 10) / 10,
    });
  }

  assert.equal(routeAuditResults.length, 12);
});

test('V15D Multi-Operator Concurrency: 6 operators simultaneously simulate independent workflows', () => {
  const clock = MotionClock.getInstance();
  const controller = new OperationalMotionController({ mode: 'demo' });

  const testOps = [
    { opId: 'op-berth', zoneId: 'pres-berth', anchor: { x: 1030, y: 285 }, target: 'CT-003' },
    { opId: 'op-cwest', zoneId: 'pres-container-west', anchor: { x: 525, y: 515 }, target: 'CT-002' },
    { opId: 'op-ccenter', zoneId: 'pres-container-center', anchor: { x: 1278, y: 455 }, target: 'CT-011' },
    { opId: 'op-cfseast', zoneId: 'pres-cfs-east', anchor: { x: 1838, y: 445 }, target: 'CT-006' },
    { opId: 'op-tech', zoneId: 'pres-technical', anchor: { x: 1100, y: 740 }, target: 'CT-001' },
    { opId: 'op-gate', zoneId: 'pres-gate', anchor: { x: 1790, y: 580 }, target: 'CT-010' },
  ];

  for (const { opId, zoneId, anchor, target } of testOps) {
    controller.registerOperator(opId, zoneId, anchor);
    const started = controller.startMovementToMeter(opId, target);
    assert.equal(started, true);
    assert.equal(controller.getOperatorRecord(opId)?.state, 'MOVING');
  }

  // Advance time
  clock.manualTick(1000);

  // All 6 operators must still be in MOVING state and have moved away from start anchor
  for (const { opId, anchor } of testOps) {
    const rec = controller.getOperatorRecord(opId)!;
    assert.equal(rec.state, 'MOVING');
    assert.notDeepEqual(rec.currentPosition, anchor);
  }

  controller.destroy();
});

test('V15D Absolute Spatial Freeze: Zero mutations to canonical dimensions, meters, or operator anchors', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915);
  assert.equal(CANONICAL_SCENE_HEIGHT, 821);

  // 12 meters
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12);
  const ct001 = CANONICAL_12_METERS_AUDIT.find((m) => m.code === 'CT-001')!;
  assert.equal(ct001.canonicalX, 1148);
  assert.equal(ct001.canonicalY, 686);

  const ct012 = CANONICAL_12_METERS_AUDIT.find((m) => m.code === 'CT-012')!;
  assert.equal(ct012.canonicalX, 1402);
  assert.equal(ct012.canonicalY, 424);

  // Operator anchors
  assert.deepEqual(CANONICAL_OPERATOR_ANCHORS['zone-berth'], { x: 1030, y: 285 });
  assert.deepEqual(CANONICAL_OPERATOR_ANCHORS['zone-technical'], { x: 1100, y: 740 });
});
