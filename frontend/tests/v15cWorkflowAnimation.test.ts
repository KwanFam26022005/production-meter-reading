import test from 'node:test';
import assert from 'node:assert/strict';

import { MotionClock } from '../src/features/map-operations/motion/MotionClock';
import {
  OperationalMotionController,
  calculateRouteDuration,
  easeRouteProgress,
  MIN_ROUTE_DURATION,
  MAX_ROUTE_DURATION,
} from '../src/features/map-operations/motion/OperationalMotionController';

test('V15C MotionClock: Singleton RAF service manages listeners and frame ticks', () => {
  const clock = MotionClock.getInstance();
  assert.ok(clock, 'MotionClock instance must exist');

  let tickCount = 0;
  let receivedDelta = 0;

  const unsubscribe = clock.subscribe((deltaMs) => {
    tickCount++;
    receivedDelta = deltaMs;
  });

  assert.equal(clock.getListenerCount(), 1);

  // Trigger manual tick
  clock.manualTick(16);
  assert.equal(tickCount, 1);
  assert.equal(receivedDelta, 16);

  clock.manualTick(32);
  assert.equal(tickCount, 2);
  assert.equal(receivedDelta, 32);

  // Unsubscribe cleans up listener
  unsubscribe();
  assert.equal(clock.getListenerCount(), 0);
});

test('V15C State Machine: Full lifecycle IDLE -> MOVING -> ARRIVING -> READING -> COMPLETED -> IDLE', () => {
  const clock = MotionClock.getInstance();
  const controller = new OperationalMotionController({
    mode: 'demo',
    visualSpeed: 200, // fast for testing
    settleDurationMs: 100,
    readingDurationMs: 200,
    completionDwellMs: 100,
  });

  const opId = 'op-test-1';
  const zoneId = 'pres-berth';
  const startAnchor = { x: 1030, y: 285 };

  controller.registerOperator(opId, zoneId, startAnchor);
  let record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'IDLE');
  assert.deepEqual(record.currentPosition, startAnchor);

  // 1. IDLE -> MOVING
  const started = controller.startMovementToMeter(opId, 'CT-003');
  assert.equal(started, true);
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'MOVING');
  assert.equal(record.targetMeterId, 'CT-003');
  assert.ok(record.routeDurationMs >= MIN_ROUTE_DURATION);

  // 2. Traversal along route
  const duration = record.routeDurationMs;
  clock.manualTick(duration * 0.5);
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'MOVING');
  assert.notDeepEqual(record.currentPosition, startAnchor);

  // 3. MOVING -> ARRIVING
  clock.manualTick(duration * 0.6); // Finish route
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'ARRIVING');

  // 4. ARRIVING -> READING
  clock.manualTick(110); // Finish 100ms settle
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'READING');

  // 5. READING -> COMPLETED (in demo mode)
  clock.manualTick(220); // Finish 200ms reading
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'COMPLETED');
  assert.equal(record.lastCompletedMeterId, 'CT-003');

  // 6. COMPLETED -> IDLE
  clock.manualTick(120); // Finish 100ms dwell
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'IDLE');
  assert.equal(record.targetMeterId, null);

  controller.destroy();
});

test('V15C Pause & Resume: Pausing freezes route traversal and resumes without time explosion', () => {
  const clock = MotionClock.getInstance();
  const controller = new OperationalMotionController({
    mode: 'operational',
  });

  const opId = 'op-pause-test';
  controller.registerOperator(opId, 'pres-container-west', { x: 525, y: 515 });
  controller.startMovementToMeter(opId, 'CT-002');

  let record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'MOVING');

  // Advance 500ms
  clock.manualTick(500);
  const posMid = { ...record.currentPosition };

  // Pause
  controller.pause();
  assert.equal(record.state, 'PAUSED');

  // Ticks while paused should NOT move operator
  clock.manualTick(1000);
  assert.deepEqual(record.currentPosition, posMid);

  // Resume
  controller.resume();
  assert.equal(record.state, 'MOVING');

  // Advance after resume
  clock.manualTick(200);
  assert.notDeepEqual(record.currentPosition, posMid);

  controller.destroy();
});

test('V15C Duration Clamping & Easing: Follows speed policy without overshoot', () => {
  const shortDist = 10;
  const longDist = 10000;

  const durShort = calculateRouteDuration(shortDist);
  assert.equal(durShort, MIN_ROUTE_DURATION);

  const durLong = calculateRouteDuration(longDist);
  assert.equal(durLong, MAX_ROUTE_DURATION);

  // Easing function properties
  assert.equal(easeRouteProgress(0), 0);
  assert.equal(easeRouteProgress(1), 1);
  assert.equal(easeRouteProgress(0.5), 0.5);

  // Monotonic
  let prev = 0;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const val = easeRouteProgress(t);
    assert.ok(val >= prev, `Easing must be monotonically increasing at t=${t}`);
    prev = val;
  }
});

test('V15C Cancellation & Reset: Cleanly returns operator to responsibility anchor', () => {
  const controller = new OperationalMotionController();
  const opId = 'op-cancel-test';
  const startAnchor = { x: 1790, y: 580 };

  controller.registerOperator(opId, 'pres-gate', startAnchor);
  controller.startMovementToMeter(opId, 'CT-010');

  let record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'MOVING');

  // Cancel movement
  controller.cancel(opId);
  record = controller.getOperatorRecord(opId)!;
  assert.equal(record.state, 'IDLE');
  assert.equal(record.targetMeterId, null);
  assert.equal(record.plannedRoute, null);

  // Reset to anchor
  controller.reset({ [opId]: startAnchor });
  assert.deepEqual(record.currentPosition, startAnchor);

  controller.destroy();
});

test('V15C Multi-Operator Independence: Multiple operators operate in separate state machines', () => {
  const clock = MotionClock.getInstance();
  const controller = new OperationalMotionController();

  controller.registerOperator('op1', 'pres-berth', { x: 1030, y: 285 });
  controller.registerOperator('op2', 'pres-container-center', { x: 1278, y: 455 });

  controller.startMovementToMeter('op1', 'CT-004');
  controller.startMovementToMeter('op2', 'CT-011');

  const rec1 = controller.getOperatorRecord('op1')!;
  const rec2 = controller.getOperatorRecord('op2')!;

  assert.equal(rec1.state, 'MOVING');
  assert.equal(rec2.state, 'MOVING');
  assert.equal(rec1.targetMeterId, 'CT-004');
  assert.equal(rec2.targetMeterId, 'CT-011');

  // Single operator cancel does not affect the other
  controller.cancel('op1');
  assert.equal(rec1.state, 'IDLE');
  assert.equal(rec2.state, 'MOVING');

  controller.destroy();
});
