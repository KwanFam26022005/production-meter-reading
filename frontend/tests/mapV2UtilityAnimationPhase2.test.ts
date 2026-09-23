import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAYOUT_B2,
  LAYOUT_B2_COORDS,
  RECOMMENDED_LAYOUT_KEY,
} from '../src/components/map-v2/utilityDemoLayout.ts';
import {
  UtilityTopologyGraph,
  calculatePathLength,
} from '../src/components/map-v2/utilityNetworkGraph.ts';
import {
  UtilityNetworkController,
  createInitialNetworkState,
  createFullyExpandedState,
} from '../src/components/map-v2/utilityNetworkStateMachine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// SUITE 1: FROZEN GEOMETRY INVARIANTS & INTEGRITY (SECTION 36)
// -----------------------------------------------------------------------------
test('Suite 1: Frozen B2 Geometry & Presentation Checksum remain 100% unchanged', async () => {
  assert.equal(RECOMMENDED_LAYOUT_KEY, 'B2', 'Recommended layout must be B2');

  const b2Data = JSON.stringify({
    coords: LAYOUT_B2_COORDS,
    nodes: LAYOUT_B2.nodes.map((n) => ({
      id: n.id,
      x: n.displayX,
      y: n.displayY,
      role: n.nodeRole,
      meter: n.meterCode,
    })),
    edges: LAYOUT_B2.edges.map((e) => ({
      id: e.id,
      src: e.sourceNodeId,
      tgt: e.targetNodeId,
      path: e.displayPath,
      tier: e.routeTier,
    })),
  });

  const hash = crypto.createHash('sha256').update(b2Data).digest('hex');
  const EXPECTED_HASH = '7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a';

  assert.equal(hash, EXPECTED_HASH, 'Frozen B2 Presentation Checksum must strictly match');

  // Verify node counts
  const elecMeters = LAYOUT_B2.nodes.filter((n) => n.isMeter && n.utilityType === 'ELECTRICITY');
  const waterMeters = LAYOUT_B2.nodes.filter((n) => n.isMeter && n.utilityType === 'WATER');
  assert.equal(elecMeters.length, 8, 'Must have exactly 8 active electricity demo meters');
  assert.equal(waterMeters.length, 4, 'Must have exactly 4 active water demo meters');

  // No legacy meters (CT-001..012)
  for (let i = 1; i <= 12; i++) {
    const legacy = `CT-${String(i).padStart(3, '0')}`;
    assert.equal(LAYOUT_B2.nodes.some((n) => n.id === legacy || n.meterCode === legacy), false);
  }

  // Obstacle avoidance
  const jsonPath = path.resolve(__dirname, '../src/components/map-v2/data/tan_thuan_1_zones_edited.json');
  const mapData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const gates = (mapData.markers as any[]).filter((m) => ['GATE_A', 'GATE_B'].includes(m.id));

  for (const gate of gates) {
    const [gx, gy] = gate.point as [number, number];
    for (const node of LAYOUT_B2.nodes) {
      const dist = Math.hypot(node.displayX - gx, node.displayY - gy);
      assert.ok(dist >= 20, `Node ${node.id} must be at least 20px from ${gate.id}`);
    }
  }
});

// -----------------------------------------------------------------------------
// SUITE 2: TOPOLOGY GRAPH & UPSTREAM TRACE RESOLUTION (SECTION 35)
// -----------------------------------------------------------------------------
test('Suite 2: Graph topology traversal resolves exact upstream chains without A*/Dijkstra', async () => {
  const elecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
  const waterGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'WATER');

  // Test 11 & 12: Meter click resolves correct chain
  // Test SIM-EM-004 (SIM-FDR-CENTER)
  const traceCenter = elecGraph.resolveTracePath('SIM-FDR-CENTER');
  assert.ok(traceCenter, 'Must resolve trace path for SIM-FDR-CENTER');
  assert.equal(traceCenter.sourceNodeId, 'SIM-EXT-GRID');
  assert.deepEqual(traceCenter.pathNodeIds, [
    'SIM-EXT-GRID',
    'SIM-SS-01',
    'SIM-TR-01',
    'SIM-MDB-01',
    'SIM-FDR-CENTER',
  ]);
  assert.deepEqual(traceCenter.pathEdgeIds, ['E-B2-01', 'E-B2-02', 'E-B2-03', 'E-B2-08']);

  // Test deep spur: SIM-EM-007 (SIM-YDB-C01, depth 5)
  const traceReefer = elecGraph.resolveTracePath('SIM-YDB-C01');
  assert.ok(traceReefer);
  assert.deepEqual(traceReefer.pathNodeIds, [
    'SIM-EXT-GRID',
    'SIM-SS-01',
    'SIM-TR-01',
    'SIM-MDB-01',
    'SIM-FDR-CENTER',
    'SIM-YDB-C01',
  ]);
  assert.deepEqual(traceReefer.pathEdgeIds, ['E-B2-01', 'E-B2-02', 'E-B2-03', 'E-B2-08', 'E-B2-09']);

  // Test water trace: SIM-WM-002 (SIM-WP-B01, quay water)
  const traceQuayWater = waterGraph.resolveTracePath('SIM-WP-B01');
  assert.ok(traceQuayWater);
  assert.equal(traceQuayWater.sourceNodeId, 'SIM-CITY-WATER');
  assert.deepEqual(traceQuayWater.pathNodeIds, ['SIM-CITY-WATER', 'SIM-WIN-01', 'SIM-WJ-01', 'SIM-WP-B01']);
  assert.deepEqual(traceQuayWater.pathEdgeIds, ['W-B2-01', 'W-B2-02', 'W-B2-04']);
});

// -----------------------------------------------------------------------------
// SUITE 3: EXPAND SCHEDULER & DEPTH-ORDERED REVEAL (SECTION 35.1..7)
// -----------------------------------------------------------------------------
test('Suite 3: Expand scheduler obeys depth precedence, concurrent siblings, and node reveal order', async () => {
  const elecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
  const schedule = elecGraph.buildExpandSchedule();

  // Test 5: Expansion follows graph depth
  assert.equal(schedule.nodeSchedules['SIM-EXT-GRID'].revealMs, 0, 'Source must be visible at t=0');
  assert.ok(
    schedule.nodeSchedules['SIM-SS-01'].revealMs > 0,
    'SIM-SS-01 must reveal after incoming edge'
  );
  assert.ok(
    schedule.nodeSchedules['SIM-TR-01'].revealMs > schedule.nodeSchedules['SIM-SS-01'].revealMs,
    'SIM-TR-01 must reveal after SIM-SS-01'
  );
  assert.ok(
    schedule.nodeSchedules['SIM-MDB-01'].revealMs > schedule.nodeSchedules['SIM-TR-01'].revealMs,
    'SIM-MDB-01 must reveal after SIM-TR-01'
  );

  // Test 6: Sibling branches reveal concurrently from SIM-MDB-01
  const mdbRevealTime = schedule.nodeSchedules['SIM-MDB-01'].revealMs;
  const edgeTechStart = schedule.edgeSchedules['E-B2-04'].startMs;
  const edgeWestStart = schedule.edgeSchedules['E-B2-05'].startMs;
  const edgeBerthStart = schedule.edgeSchedules['E-B2-07'].startMs;
  const edgeCenterStart = schedule.edgeSchedules['E-B2-08'].startMs;
  const edgeCfsStart = schedule.edgeSchedules['E-B2-10'].startMs;

  assert.equal(edgeTechStart, mdbRevealTime, 'E-04 must start exactly when parent MDB-01 is reached');
  assert.equal(edgeWestStart, mdbRevealTime, 'E-05 must start concurrently at MDB-01 reveal');
  assert.equal(edgeBerthStart, mdbRevealTime, 'E-07 must start concurrently at MDB-01 reveal');
  assert.equal(edgeCenterStart, mdbRevealTime, 'E-08 must start concurrently at MDB-01 reveal');
  assert.equal(edgeCfsStart, mdbRevealTime, 'E-10 must start concurrently at MDB-01 reveal');

  // Test 7: Meters do not appear before their upstream path reaches them
  for (const edge of LAYOUT_B2.edges.filter((e) => e.utilityType === 'ELECTRICITY')) {
    const targetNodeId = edge.targetNodeId;
    const edgeEndMs = schedule.edgeSchedules[edge.id].endMs;
    const nodeRevealMs = schedule.nodeSchedules[targetNodeId].revealMs;
    assert.equal(
      nodeRevealMs,
      edgeEndMs,
      `Node ${targetNodeId} must reveal exactly when incoming edge ${edge.id} reaches it`
    );
  }

  // Duration in target range ~1.2–2.0s
  assert.ok(
    schedule.totalDurationMs >= 1200 && schedule.totalDurationMs <= 2000,
    `Total duration ${schedule.totalDurationMs}ms must be within 1.2–2.0s`
  );
});

// -----------------------------------------------------------------------------
// SUITE 4: RETRACT SCHEDULER & REVERSE DEPENDENCY (SECTION 35.8..10)
// -----------------------------------------------------------------------------
test('Suite 4: Retract scheduler follows reverse graph depth and ends with source only', async () => {
  const elecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
  const retractSchedule = elecGraph.buildRetractSchedule();

  // Test 9: Retract follows descending graph depth
  const spurEdgeSchedule = retractSchedule.edgeSchedules['E-B2-06']; // depth 5
  const branchEdgeSchedule = retractSchedule.edgeSchedules['E-B2-05']; // depth 4
  const trunkEdgeSchedule = retractSchedule.edgeSchedules['E-B2-01']; // depth 1

  assert.ok(
    spurEdgeSchedule.startMs < branchEdgeSchedule.startMs,
    'Depth 5 spur must retract before depth 4 branch'
  );
  assert.ok(
    branchEdgeSchedule.startMs < trunkEdgeSchedule.startMs,
    'Depth 4 branch must retract before depth 1 trunk'
  );

  // Test 10: Retract ends with source only
  assert.equal(
    retractSchedule.nodeSchedules['SIM-EXT-GRID'].revealMs,
    Infinity,
    'Source node must never be hidden during retract'
  );

  // Retract total duration in reasonable range (0.8–1.4s)
  assert.ok(
    retractSchedule.totalDurationMs >= 700 && retractSchedule.totalDurationMs <= 1400,
    `Retract duration ${retractSchedule.totalDurationMs}ms in range`
  );
});

// -----------------------------------------------------------------------------
// SUITE 5: NETWORK CONTROLLER STATE TRANSITIONS & REDUCED MOTION (SECTION 35.1..20)
// -----------------------------------------------------------------------------
test('Suite 5: Controller handles rapid input, trace switching, mode reset, and reduced motion', async () => {
  const elecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
  const waterGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'WATER');

  // Test 1 & 2: Starts collapsed
  let elecUpdatedState: any = null;
  const elecController = new UtilityNetworkController(elecGraph, {
    onUpdate: (s) => { elecUpdatedState = s; },
    prefersReducedMotion: true,
  });

  let waterUpdatedState: any = null;
  const waterController = new UtilityNetworkController(waterGraph, {
    onUpdate: (s) => { waterUpdatedState = s; },
    prefersReducedMotion: true,
  });

  assert.equal(elecController.getState().phase, 'collapsed');
  assert.equal(waterController.getState().phase, 'collapsed');
  assert.deepEqual(Array.from(elecController.getState().visibleNodeIds), ['SIM-EXT-GRID']);
  assert.deepEqual(Array.from(waterController.getState().visibleNodeIds), ['SIM-CITY-WATER']);

  // Test 3, 4, 20: Expand in reduced motion immediately reaches expanded
  elecController.expand();
  assert.equal(elecController.getState().phase, 'expanded');
  assert.equal(elecController.getState().visibleEdgeIds.size, 10, 'All 10 electricity edges visible');
  assert.equal(elecController.getState().visibleNodeIds.size, 11, 'All 11 electricity nodes visible');

  // Test 18: Electricity and Water states are independent in BOTH mode
  assert.equal(waterController.getState().phase, 'collapsed', 'Water remains collapsed when electricity expands');

  // Test 11, 12, 13: Meter click enters trace
  const traceResult = elecController.traceMeter('SIM-FDR-BERTH');
  assert.ok(traceResult);
  assert.equal(elecController.getState().phase, 'tracing');
  assert.equal(elecController.getState().tracedNodeId, 'SIM-FDR-BERTH');
  assert.equal(elecController.getState().tracedMeterCode, 'SIM-EM-002');
  assert.ok(elecController.getState().tracedEdgeIds.has('E-B2-07'), 'Trace path must contain E-B2-07');
  assert.ok(!elecController.getState().tracedEdgeIds.has('E-B2-05'), 'E-B2-05 must NOT be in trace path');

  // Test 14: Selecting meter B replaces meter A trace cleanly
  elecController.traceMeter('SIM-YDB-C01');
  assert.equal(elecController.getState().phase, 'tracing');
  assert.equal(elecController.getState().tracedNodeId, 'SIM-YDB-C01');
  assert.equal(elecController.getState().tracedMeterCode, 'SIM-EM-008');
  assert.ok(elecController.getState().tracedEdgeIds.has('E-B2-09'), 'New trace contains E-B2-09');

  // Test 15: Retract / Collapse clears trace
  elecController.retract();
  assert.equal(elecController.getState().phase, 'collapsed');
  assert.equal(elecController.getState().tracedNodeId, null);
  assert.deepEqual(Array.from(elecController.getState().visibleNodeIds), ['SIM-EXT-GRID']);

  // Test 16 & 17: resetCollapsed clears all state immediately
  elecController.expand();
  assert.equal(elecController.getState().phase, 'expanded');
  elecController.resetCollapsed();
  assert.equal(elecController.getState().phase, 'collapsed');
  assert.equal(elecController.getState().visibleEdgeIds.size, 0);

  // Test 19: Rapid repeated interactions leave deterministic final state
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) elecController.expand();
    else elecController.retract();
  }
  assert.equal(elecController.getState().phase, 'collapsed');
  assert.equal(elecController.getState().visibleEdgeIds.size, 0);
  assert.deepEqual(Array.from(elecController.getState().visibleNodeIds), ['SIM-EXT-GRID']);
});
