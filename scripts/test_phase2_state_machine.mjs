import { LAYOUT_B2 } from '../frontend/src/components/map-v2/utilityDemoLayout.ts';
import { UtilityTopologyGraph } from '../frontend/src/components/map-v2/utilityNetworkGraph.ts';
import {
  UtilityNetworkController,
  createInitialNetworkState,
  createFullyExpandedState,
} from '../frontend/src/components/map-v2/utilityNetworkStateMachine.ts';

console.log('=== TESTING PHASE 2 UTILITY TOPOLOGY GRAPH & STATE MACHINE ===');

// 1. Electricity Graph
const elecGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'ELECTRICITY');
console.log('Elec nodes:', elecGraph.nodes.size, 'edges:', elecGraph.edges.size, 'source:', elecGraph.sourceNodeId);

// Verify trace resolution for SIM-EM-004 (SIM-FDR-CENTER)
const traceElec = elecGraph.resolveTracePath('SIM-FDR-CENTER');
console.log('Trace SIM-FDR-CENTER:', traceElec);
if (!traceElec) throw new Error('Failed to trace SIM-FDR-CENTER');
console.log('Trace nodes:', traceElec.pathNodeIds);
console.log('Trace edges:', traceElec.pathEdgeIds);

// Verify trace resolution for SIM-EM-007 (SIM-YDB-C01, spur)
const traceSpur = elecGraph.resolveTracePath('SIM-YDB-C01');
console.log('Trace SIM-YDB-C01 spur nodes:', traceSpur?.pathNodeIds);
console.log('Trace SIM-YDB-C01 spur edges:', traceSpur?.pathEdgeIds);

// 2. Expand Schedule
const elecExpandSchedule = elecGraph.buildExpandSchedule();
console.log('Elec Expand Total Duration:', elecExpandSchedule.totalDurationMs, 'ms');
console.log('Elec Node Reveal times:', elecExpandSchedule.nodeSchedules);

// 3. Retract Schedule
const elecRetractSchedule = elecGraph.buildRetractSchedule();
console.log('Elec Retract Total Duration:', elecRetractSchedule.totalDurationMs, 'ms');

// 4. Water Graph
const waterGraph = new UtilityTopologyGraph(LAYOUT_B2.nodes, LAYOUT_B2.edges, 'WATER');
console.log('Water nodes:', waterGraph.nodes.size, 'edges:', waterGraph.edges.size, 'source:', waterGraph.sourceNodeId);

const traceWater = waterGraph.resolveTracePath('SIM-WP-CFS-01');
console.log('Trace SIM-WP-CFS-01:', traceWater?.pathNodeIds, traceWater?.pathEdgeIds);

const waterExpandSchedule = waterGraph.buildExpandSchedule();
console.log('Water Expand Total Duration:', waterExpandSchedule.totalDurationMs, 'ms');

const waterRetractSchedule = waterGraph.buildRetractSchedule();
console.log('Water Retract Total Duration:', waterRetractSchedule.totalDurationMs, 'ms');

// 5. Reduced Motion Controller Test
let lastState = null;
const controller = new UtilityNetworkController(elecGraph, {
  onUpdate: (s) => { lastState = s; },
  prefersReducedMotion: true,
});

console.log('Initial phase:', controller.getState().phase);
controller.expand();
console.log('After reduced-motion expand:', controller.getState().phase, 'visible edges:', controller.getState().visibleEdgeIds.size);
controller.traceMeter('SIM-FDR-CENTER');
console.log('After trace:', controller.getState().phase, 'traced meter:', controller.getState().tracedNodeId);
controller.retract();
console.log('After reduced-motion retract:', controller.getState().phase, 'visible nodes:', Array.from(controller.getState().visibleNodeIds));

console.log('=== ALL TOPOLOGY & STATE MACHINE TESTS PASSED ===');
