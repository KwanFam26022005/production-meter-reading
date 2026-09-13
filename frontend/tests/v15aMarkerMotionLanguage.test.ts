import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveMeterMotionState,
  resolveOperatorMotionState,
  MotionStateResolver,
  MeterMotionState,
  OperatorMotionState,
} from '../src/features/map-operations/motion/motionStates';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_ASPECT_RATIO,
} from '../src/features/map-operations/geometry/canonicalScene';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// SUITE 1: MOTION STATE RESOLVERS (Section 4, 18)
// ===========================================================================

test('V15A Resolvers: resolveMeterMotionState maps domain & workflow states to explicit visual motion states', () => {
  // 1. Pending
  assert.equal(resolveMeterMotionState({ domainStatus: 'PENDING' }), 'pending');
  assert.equal(resolveMeterMotionState({ domainStatus: 'DUE' }), 'pending');
  assert.equal(resolveMeterMotionState({ domainStatus: 'INACTIVE' }), 'pending');

  // 2. Approaching
  assert.equal(resolveMeterMotionState({ activeWorkflowState: 'approaching' }), 'approaching');
  assert.equal(resolveMeterMotionState({ isApproaching: true }), 'approaching');
  assert.equal(
    resolveMeterMotionState({
      meterId: 'M-01',
      operatorActivity: { targetMeterId: 'M-01', state: 'moving' },
    }),
    'approaching'
  );

  // 3. Reading
  assert.equal(resolveMeterMotionState({ activeWorkflowState: 'reading' }), 'reading');
  assert.equal(resolveMeterMotionState({ isReading: true }), 'reading');
  assert.equal(resolveMeterMotionState({ domainStatus: 'READING' }), 'reading');
  assert.equal(
    resolveMeterMotionState({
      meterId: 'M-02',
      operatorActivity: { targetMeterId: 'M-02', state: 'reading' },
    }),
    'reading'
  );

  // 4. Completed
  assert.equal(resolveMeterMotionState({ domainStatus: 'CONFIRMED' }), 'completed');
  assert.equal(resolveMeterMotionState({ domainStatus: 'COMPLETED' }), 'completed');
  assert.equal(resolveMeterMotionState({ activeWorkflowState: 'completed' }), 'completed');

  // 5. Overdue
  assert.equal(resolveMeterMotionState({ domainStatus: 'OVERDUE' }), 'overdue');
  assert.equal(resolveMeterMotionState({ issueState: { isOverdue: true } }), 'overdue');
  assert.equal(resolveMeterMotionState({ activeWorkflowState: 'overdue' }), 'overdue');

  // 6. Review
  assert.equal(resolveMeterMotionState({ domainStatus: 'REVIEW' }), 'review');
  assert.equal(resolveMeterMotionState({ issueState: { isReview: true } }), 'review');
  assert.equal(resolveMeterMotionState({ activeWorkflowState: 'review' }), 'review');

  // 7. Selected
  assert.equal(resolveMeterMotionState({ isSelected: true }), 'selected');
  assert.equal(
    resolveMeterMotionState({
      meterId: 'M-05',
      selectedEntity: { type: 'meter', id: 'M-05' },
    }),
    'selected'
  );

  // MotionStateResolver facade
  assert.equal(MotionStateResolver.resolveMeter({ domainStatus: 'CONFIRMED' }), 'completed');
});

test('V15A Resolvers: resolveOperatorMotionState maps operator activity to explicit visual motion states', () => {
  // 1. Idle
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'idle' }), 'idle');
  assert.equal(resolveOperatorMotionState({ operatorId: 'OP-01' }), 'idle');

  // 2. Moving
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'moving' }), 'moving');
  assert.equal(
    resolveOperatorMotionState({ operatorActivity: { state: 'moving' } }),
    'moving'
  );

  // 3. Arriving
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'arriving' }), 'arriving');
  assert.equal(
    resolveOperatorMotionState({ operatorActivity: { state: 'arriving' } }),
    'arriving'
  );

  // 4. Reading
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'reading' }), 'reading');
  assert.equal(
    resolveOperatorMotionState({ operatorActivity: { state: 'reading' } }),
    'reading'
  );

  // 5. Completed
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'completed' }), 'completed');
  assert.equal(resolveOperatorMotionState({ progressPct: 100 }), 'completed');

  // 6. Issue
  assert.equal(resolveOperatorMotionState({ issueState: 2 }), 'issue');
  assert.equal(resolveOperatorMotionState({ issueState: { issueCount: 1 } }), 'issue');
  assert.equal(resolveOperatorMotionState({ activeWorkflowState: 'issue' }), 'issue');

  // 7. Selected
  assert.equal(resolveOperatorMotionState({ isSelected: true }), 'selected');
  assert.equal(
    resolveOperatorMotionState({
      operatorId: 'OP-02',
      selectedEntity: { type: 'operator', id: 'OP-02' },
    }),
    'selected'
  );

  // MotionStateResolver facade
  assert.equal(MotionStateResolver.resolveOperator({ activeWorkflowState: 'reading' }), 'reading');
});

// ===========================================================================
// SUITE 2: METER MOTION SPECIFICATIONS (Section 5-11, 17)
// ===========================================================================

test('V15A Meter Motion: Pending has no loop and hover is 120-150ms ease-out', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Hover transition duration 120-150ms ease-out
  assert.ok(css.includes('transition: transform 140ms ease-out;'), 'Hover transition must be 140ms ease-out');
  assert.ok(css.includes('transform: scale(1.09);'), 'Hover scale must be defined');

  // Pending state has NO looping animation
  assert.equal(css.includes('.sgp-meter-point.motion-pending { animation:'), false, 'Pending state must have no loop');
});

test('V15A Meter Motion: Approaching has finite 2-wave animation (radius 10px -> 22px, ~900ms, repeat 2 times only)', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Verify keyframe & iteration count
  assert.ok(css.includes('@keyframes sgpTargetWaveScale'), 'Must declare sgpTargetWaveScale keyframe');
  assert.ok(css.includes('animation: sgpTargetWaveScale 900ms ease-out 2;'), 'Target wave must run ~900ms and repeat 2 times only');
  assert.ok(css.includes('animation-fill-mode: forwards;'), 'Target wave must stop and fill forwards');
  assert.ok(css.includes('animation-delay: 450ms;'), 'Second wave must have staggered delay');

  // Verify MeterActivityEffect renders the 2 wave circles
  const effectPath = path.resolve(__dirname, '../src/features/map-operations/motion/MeterActivityEffect.tsx');
  const effectCode = fs.readFileSync(effectPath, 'utf-8');
  assert.ok(effectCode.includes('className="sgp-meter-target-wave wave-1"'));
  assert.ok(effectCode.includes('className="sgp-meter-target-wave wave-2"'));
});

test('V15A Meter Motion: Reading has rotating circular activity arc (1.4-1.8s linear) without rotating marker body', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // 1.6s linear infinite rotation on activity arc only
  assert.ok(css.includes('@keyframes sgpActivityArcRotate'), 'Must define sgpActivityArcRotate keyframe');
  assert.ok(css.includes('animation: sgpActivityArcRotate 1600ms linear infinite;'), 'Activity arc must rotate 1.6s linear infinite');

  // Meter visual content does NOT rotate
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');
  assert.equal(meterCode.includes('rotate(') && meterCode.includes('sgp-meter-visual-content'), false, 'Meter body must not rotate');

  // MeterActivityEffect renders partial circular arc (radius 14px, dasharray ~90-120 degrees)
  const effectPath = path.resolve(__dirname, '../src/features/map-operations/motion/MeterActivityEffect.tsx');
  const effectCode = fs.readFileSync(effectPath, 'utf-8');
  assert.ok(effectCode.includes('className={reducedMotion ? \'sgp-meter-reading-arc-static\' : \'sgp-meter-reading-arc\'}'));
  assert.ok(effectCode.includes('strokeDasharray="26 62"'), 'Arc must be partial 90-120 degree circular arc');
});

test('V15A Meter Motion: Completed progress sweep is one-shot (300-450ms) and reveals check glyph in emerald', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpCompletedSweep'), 'Must define sgpCompletedSweep keyframe');
  assert.ok(css.includes('animation: sgpCompletedSweep 380ms ease-out 1 forwards;'), 'Completed sweep must be one-shot (380ms within 300-450ms)');
  assert.ok(css.includes('@keyframes sgpCheckGlyphAppear'), 'Must define sgpCheckGlyphAppear keyframe');

  // MeterLayer renders check glyph when completed
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');
  assert.ok(meterCode.includes('className="sgp-meter-check-glyph"'), 'Must mount sgp-meter-check-glyph for completed meter');
  assert.ok(meterCode.includes("coreFill = '#10B981'"), 'Completed meter core must be emerald green (#10B981)');
});

test('V15A Meter Motion: Overdue slow outer halo heartbeat only affects halo (scale 1->1.06->1, 1.8-2.2s), core remains stable', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpOverdueHeartbeat'), 'Must define sgpOverdueHeartbeat keyframe');
  assert.ok(css.includes('transform: scale(1.06);'), 'Overdue heartbeat scale must be 1.06');
  assert.ok(css.includes('opacity: 0.95;'), 'Overdue heartbeat peak opacity must be 0.95');
  assert.ok(css.includes('animation: sgpOverdueHeartbeat 2000ms ease-in-out infinite;'), 'Overdue heartbeat duration must be 2000ms (within 1.8-2.2s)');

  // Only the outer halo animates, not the core
  assert.ok(css.includes('.sgp-meter-overdue-halo {'), 'Must target .sgp-meter-overdue-halo specifically');
});

test('V15A Meter Motion: Review double ring is one-shot on entry and becomes static amber', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpReviewDoubleRing'), 'Must define sgpReviewDoubleRing keyframe');
  assert.ok(css.includes('animation: sgpReviewDoubleRing 450ms ease-out 1 forwards;'), 'Review entry ring must run 1 time only and fill forwards');
  assert.ok(css.includes('.sgp-meter-review-entry-ring.ring-2'), 'Second ring has staggered delay');

  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');
  assert.ok(meterCode.includes("coreFill = '#F59E0B'"), 'Review state core must be amber (#F59E0B)');
});

test('V15A Meter Motion: Selected animation is one-shot focus expansion (0.94 -> 1.08 -> 1, 180-220ms)', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpMeterSelectedOneShot'), 'Must define sgpMeterSelectedOneShot');
  assert.ok(css.includes('animation: sgpMeterSelectedOneShot 200ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;'), 'Selected animation must be 200ms cubic-bezier one-shot');

  // Both cyan (r=14) and white (r=16.5) focus rings are present in MeterActivityEffect
  const effectPath = path.resolve(__dirname, '../src/features/map-operations/motion/MeterActivityEffect.tsx');
  const effectCode = fs.readFileSync(effectPath, 'utf-8');
  assert.ok(effectCode.includes('r={14}'));
  assert.ok(effectCode.includes('stroke="#00E5FF"'));
  assert.ok(effectCode.includes('r={16.5}'));
  assert.ok(effectCode.includes('stroke="#FFFFFF"'));
});

// ===========================================================================
// SUITE 3: OPERATOR MOTION SPECIFICATIONS (Section 12-16, 17)
// ===========================================================================

test('V15A Operator Motion: Idle operator has static avatar, progress ring visible, no motion', () => {
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  // No idle breathing keyframes applied to operator avatar disc
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');
  assert.equal(css.includes('.sgp-operator-map-marker.motion-idle { animation:'), false, 'Idle operator must have no continuous animation');

  // Progress ring remains mounted
  assert.ok(opCode.includes('strokeDasharray={ringCircumference}'), 'Progress ring must remain mounted');
});

test('V15A Operator Motion: Reading state adds thin cyan rotating arc outside progress ring without rotating avatar', () => {
  const effectPath = path.resolve(__dirname, '../src/features/map-operations/motion/OperatorActivityEffect.tsx');
  const effectCode = fs.readFileSync(effectPath, 'utf-8');

  // Thin cyan rotating arc outside progress ring (radius 18.5px, outside 15.5px white ring)
  assert.ok(effectCode.includes('r={18.5}'));
  assert.ok(effectCode.includes('stroke="#00E5FF"'));
  assert.ok(effectCode.includes('className={reducedMotion ? \'sgp-op-reading-arc-static\' : \'sgp-op-reading-arc\'}'));

  // Rotates continuously
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');
  assert.ok(css.includes('.sgp-op-reading-arc'));
  assert.ok(css.includes('animation: sgpActivityArcRotate 1600ms linear infinite;'));
});

test('V15A Operator Motion: Progress update animates stroke-dashoffset (250-300ms ease-out) without moving whole avatar', () => {
  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  // Transition is placed directly on progress ring circle style
  assert.ok(
    opCode.includes("transition: reducedMotion ? 'none' : 'stroke-dashoffset 280ms ease-out'"),
    'Progress ring stroke-dashoffset transition must be 280ms ease-out (within 250-300ms)'
  );
});

test('V15A Operator Motion: Issue badge has entrance scale animation (180-220ms) then remains static', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpBadgeEntrance'), 'Must define sgpBadgeEntrance keyframe');
  assert.ok(css.includes('transform: scale(0.75);'), 'Entrance starts at scale 0.75');
  assert.ok(css.includes('transform: scale(1.1);'), 'Entrance overshoots to 1.1');
  assert.ok(css.includes('animation: sgpBadgeEntrance 200ms ease-out 1 forwards;'), 'Entrance animation runs 1 time forwards in 200ms');

  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');
  assert.ok(opCode.includes('className="sgp-op-badge entrance"'), 'Operator issue badge mounts with entrance animation class');
});

test('V15A Operator Motion: Selected state has cyan outer focus ring and one-shot entry emphasis', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes sgpOpSelectedOneShot'), 'Must define sgpOpSelectedOneShot');
  assert.ok(
    css.includes('.sgp-operator-map-marker.selected .sgp-op-visual-content'),
    'Selected operator visual content has one-shot entry emphasis'
  );

  const effectPath = path.resolve(__dirname, '../src/features/map-operations/motion/OperatorActivityEffect.tsx');
  const effectCode = fs.readFileSync(effectPath, 'utf-8');
  assert.ok(effectCode.includes('r={18.5}'), 'Selected operator halo radius must be 18.5px');
  assert.ok(effectCode.includes('stroke="#00E5FF"'), 'Selected operator halo stroke must be cyan');
});

// ===========================================================================
// SUITE 4: REDUCED MOTION & ACCESSIBILITY (Section 19, 20)
// ===========================================================================

test('V15A Reduced Motion: prefers-reduced-motion disables all waves, heartbeats, rotating arcs, and sweeps', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Verify reduced motion block disables key marker animation classes
  assert.ok(css.includes('.sgp-meter-target-wave,'), 'Reduced motion overrides .sgp-meter-target-wave');
  assert.ok(css.includes('.sgp-meter-reading-arc,'), 'Reduced motion overrides .sgp-meter-reading-arc');
  assert.ok(css.includes('.sgp-meter-completed-sweep,'), 'Reduced motion overrides .sgp-meter-completed-sweep');
  assert.ok(css.includes('.sgp-meter-overdue-halo,'), 'Reduced motion overrides .sgp-meter-overdue-halo');
  assert.ok(css.includes('.sgp-meter-review-entry-ring,'), 'Reduced motion overrides .sgp-meter-review-entry-ring');
  assert.ok(css.includes('.sgp-op-reading-arc,'), 'Reduced motion overrides .sgp-op-reading-arc');

  // Verify component hook provides immediate fallback
  const statesPath = path.resolve(__dirname, '../src/features/map-operations/motion/motionStates.ts');
  const statesCode = fs.readFileSync(statesPath, 'utf-8');
  assert.ok(statesCode.includes('usePrefersReducedMotion'), 'Must export usePrefersReducedMotion hook');
});

test('V15A Accessibility: Multi-modal state indications with Vietnamese ARIA labels', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  // Vietnamese ARIA labels for distinct states
  assert.ok(meterCode.includes("'đang ghi'"), 'Meter ARIA includes "đang ghi" for reading');
  assert.ok(meterCode.includes("'quá hạn lượt ghi'"), 'Meter ARIA includes "quá hạn lượt ghi" for overdue');
  assert.ok(meterCode.includes("'cần kiểm tra xác nhận'"), 'Meter ARIA includes "cần kiểm tra xác nhận" for review');
  assert.ok(meterCode.includes("'đã hoàn tất'"), 'Meter ARIA includes "đã hoàn tất" for completed');
  assert.ok(meterCode.includes("'nhân viên đang tiếp cận'"), 'Meter ARIA includes "nhân viên đang tiếp cận" for approaching');

  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');
  assert.ok(opCode.includes("'đang ghi'"), 'Operator ARIA includes "đang ghi"');
  assert.ok(opCode.includes("'đang di chuyển'"), 'Operator ARIA includes "đang di chuyển"');
  assert.ok(opCode.includes("'đã hoàn tất ca'"), 'Operator ARIA includes "đã hoàn tất ca"');
});

// ===========================================================================
// SUITE 5: GEOMETRY FREEZE INVARIANTS (Section 1)
// ===========================================================================

test('V15A Geometry Freeze: Canonical dimensions and aspect ratio remain strictly unchanged', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915, 'Canonical width must remain 1915');
  assert.equal(CANONICAL_SCENE_HEIGHT, 821, 'Canonical height must remain 821');
  assert.ok(
    Math.abs(CANONICAL_ASPECT_RATIO - 1915 / 821) < 1e-6,
    'Canonical aspect ratio must remain 2.332521'
  );

  const meterLayerPath = path.resolve(__dirname, '../src/features/map-operations/layers/MeterLayer.tsx');
  const meterCode = fs.readFileSync(meterLayerPath, 'utf-8');

  // Hexagonal silhouette preserved
  assert.ok(
    meterCode.includes('d="M 0 -10 L 8.66 -5 L 8.66 5 L 0 10 L -8.66 5 L -8.66 -5 Z"'),
    'Hexagonal silhouette path must remain unchanged'
  );

  // White separation halo preserved
  assert.ok(meterCode.includes('rgba(255, 255, 255, 0.90)'), 'White halo stroke must remain unchanged');
  assert.ok(meterCode.includes('strokeWidth={1.8}'), 'Halo stroke width must remain 1.8px');

  // Touch target >= 44px preserved
  assert.ok(meterCode.includes('r={22 / lodScale}'), 'Touch target >= 44px preserved');

  const opMarkerPath = path.resolve(__dirname, '../src/features/map-operations/operational-map/OperatorMapMarker.tsx');
  const opCode = fs.readFileSync(opMarkerPath, 'utf-8');

  // Circular silhouette preserved
  assert.ok(opCode.includes('r={15.5}') && opCode.includes('<circle'), 'Circular silhouette must remain unchanged');
  assert.ok(opCode.includes('r={22 / lodScale}'), 'Touch target >= 44px preserved');
});
