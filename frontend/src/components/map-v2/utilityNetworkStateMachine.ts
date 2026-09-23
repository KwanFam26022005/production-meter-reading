/**
 * Map V2 Utility Network State Machine — Phase 2
 * State Transitions, Cancellation Token Engine, and rAF Animation Driver
 */

import { UtilityType } from './utilityDemoLayout';
import { UtilityTopologyGraph, TracePathResult } from './utilityNetworkGraph';

export type NetworkPhase = 'collapsed' | 'expanding' | 'expanded' | 'tracing' | 'retracting';

export interface UtilityNetworkState {
  utilityType: UtilityType;
  phase: NetworkPhase;
  tracedNodeId: string | null;
  tracedMeterCode?: string;
  tracedNodeIds: Set<string>;
  tracedEdgeIds: Set<string>;
  visibleEdgeIds: Set<string>;
  visibleNodeIds: Set<string>;
  edgeProgress: Record<string, number>; // edgeId -> 0..1 (1 = fully drawn)
  generation: number;
}

export function createInitialNetworkState(
  utilityType: UtilityType,
  sourceNodeId: string
): UtilityNetworkState {
  return {
    utilityType,
    phase: 'collapsed',
    tracedNodeId: null,
    tracedNodeIds: new Set(),
    tracedEdgeIds: new Set(),
    visibleEdgeIds: new Set(),
    visibleNodeIds: new Set([sourceNodeId]), // Only source visible initially
    edgeProgress: {},
    generation: 0,
  };
}

export function createFullyExpandedState(
  utilityType: UtilityType,
  graph: UtilityTopologyGraph,
  generation: number
): UtilityNetworkState {
  const allEdgeIds = new Set<string>();
  const allNodeIds = new Set<string>();
  const edgeProgress: Record<string, number> = {};

  for (const edgeId of graph.edges.keys()) {
    allEdgeIds.add(edgeId);
    edgeProgress[edgeId] = 1;
  }
  for (const nodeId of graph.nodes.keys()) {
    allNodeIds.add(nodeId);
  }

  return {
    utilityType,
    phase: 'expanded',
    tracedNodeId: null,
    tracedNodeIds: new Set(),
    tracedEdgeIds: new Set(),
    visibleEdgeIds: allEdgeIds,
    visibleNodeIds: allNodeIds,
    edgeProgress,
    generation,
  };
}

export interface AnimationDriverOptions {
  onUpdate: (state: UtilityNetworkState) => void;
  onPhaseChange?: (phase: NetworkPhase) => void;
  prefersReducedMotion?: boolean;
}

/**
 * Controller to drive smooth graph-derived expand and retract animations
 */
export class UtilityNetworkController {
  private currentState: UtilityNetworkState;
  private graph: UtilityTopologyGraph;
  private currentRafId: number | null = null;
  private currentGen = 0;
  private options: AnimationDriverOptions;

  constructor(
    graph: UtilityTopologyGraph,
    options: AnimationDriverOptions,
    initialPhase: NetworkPhase = 'collapsed'
  ) {
    this.graph = graph;
    this.options = options;
    if (initialPhase === 'expanded') {
      this.currentState = createFullyExpandedState(graph.utilityType, graph, 0);
    } else {
      this.currentState = createInitialNetworkState(
        graph.utilityType,
        graph.sourceNodeId
      );
    }
  }

  public getState(): UtilityNetworkState {
    return this.currentState;
  }

  public cancel(): void {
    if (this.currentRafId !== null) {
      cancelAnimationFrame(this.currentRafId);
      this.currentRafId = null;
    }
    this.currentGen++;
  }

  /**
   * Reset directly to collapsed state with clean cancellation
   */
  public resetCollapsed(): void {
    this.cancel();
    this.currentState = createInitialNetworkState(this.currentState.utilityType, this.graph.sourceNodeId);
    this.currentState.generation = this.currentGen;
    this.options.onUpdate(this.currentState);
    if (this.options.onPhaseChange) this.options.onPhaseChange('collapsed');
  }

  /**
   * Expand network from Source -> Main Trunk -> Distribution -> Branches -> Spurs -> Meters
   */
  public expand(): void {
    this.cancel();
    const tokenGen = this.currentGen;

    // If reduced motion requested, complete immediately
    if (this.options.prefersReducedMotion) {
      this.currentState = createFullyExpandedState(this.currentState.utilityType, this.graph, tokenGen);
      this.options.onUpdate(this.currentState);
      if (this.options.onPhaseChange) this.options.onPhaseChange('expanded');
      return;
    }

    const schedule = this.graph.buildExpandSchedule();
    const startTime = performance.now();

    this.currentState = {
      ...this.currentState,
      phase: 'expanding',
      tracedNodeId: null,
      tracedNodeIds: new Set(),
      tracedEdgeIds: new Set(),
      generation: tokenGen,
    };
    this.options.onUpdate(this.currentState);
    if (this.options.onPhaseChange) this.options.onPhaseChange('expanding');

    const tick = (now: number) => {
      if (this.currentGen !== tokenGen) return;

      const elapsed = now - startTime;

      if (elapsed >= schedule.totalDurationMs) {
        // Complete expand
        this.currentState = createFullyExpandedState(this.currentState.utilityType, this.graph, tokenGen);
        this.currentRafId = null;
        this.options.onUpdate(this.currentState);
        if (this.options.onPhaseChange) this.options.onPhaseChange('expanded');
        return;
      }

      // Compute intermediate progress
      const visibleEdgeIds = new Set<string>();
      const visibleNodeIds = new Set<string>([this.graph.sourceNodeId]);
      const edgeProgress: Record<string, number> = {};

      for (const [edgeId, s] of Object.entries(schedule.edgeSchedules)) {
        if (elapsed < s.startMs) {
          // not started
          edgeProgress[edgeId] = 0;
        } else if (elapsed >= s.endMs) {
          // completed
          visibleEdgeIds.add(edgeId);
          edgeProgress[edgeId] = 1;
        } else {
          // in progress
          visibleEdgeIds.add(edgeId);
          edgeProgress[edgeId] = Math.max(0, Math.min(1, (elapsed - s.startMs) / s.durationMs));
        }
      }

      for (const [nodeId, s] of Object.entries(schedule.nodeSchedules)) {
        if (elapsed >= s.revealMs) {
          visibleNodeIds.add(nodeId);
        }
      }

      this.currentState = {
        ...this.currentState,
        visibleEdgeIds,
        visibleNodeIds,
        edgeProgress,
      };
      this.options.onUpdate(this.currentState);

      this.currentRafId = requestAnimationFrame(tick);
    };

    this.currentRafId = requestAnimationFrame(tick);
  }

  /**
   * Retract network in reverse dependency order: Leaves -> Branches -> Distribution -> Trunk -> Source
   */
  public retract(): void {
    this.cancel();
    const tokenGen = this.currentGen;

    if (this.options.prefersReducedMotion) {
      this.currentState = createInitialNetworkState(this.currentState.utilityType, this.graph.sourceNodeId);
      this.currentState.generation = tokenGen;
      this.options.onUpdate(this.currentState);
      if (this.options.onPhaseChange) this.options.onPhaseChange('collapsed');
      return;
    }

    const schedule = this.graph.buildRetractSchedule();
    const startTime = performance.now();

    this.currentState = {
      ...this.currentState,
      phase: 'retracting',
      tracedNodeId: null,
      tracedNodeIds: new Set(),
      tracedEdgeIds: new Set(),
      generation: tokenGen,
    };
    this.options.onUpdate(this.currentState);
    if (this.options.onPhaseChange) this.options.onPhaseChange('retracting');

    const tick = (now: number) => {
      if (this.currentGen !== tokenGen) return;

      const elapsed = now - startTime;

      if (elapsed >= schedule.totalDurationMs) {
        // Complete retract
        this.currentState = createInitialNetworkState(this.currentState.utilityType, this.graph.sourceNodeId);
        this.currentState.generation = tokenGen;
        this.currentRafId = null;
        this.options.onUpdate(this.currentState);
        if (this.options.onPhaseChange) this.options.onPhaseChange('collapsed');
        return;
      }

      // Compute intermediate retraction
      const visibleEdgeIds = new Set<string>();
      const visibleNodeIds = new Set<string>([this.graph.sourceNodeId]);
      const edgeProgress: Record<string, number> = {};

      for (const [edgeId, s] of Object.entries(schedule.edgeSchedules)) {
        if (elapsed < s.startMs) {
          // not yet retracting, still fully drawn
          visibleEdgeIds.add(edgeId);
          edgeProgress[edgeId] = 1;
        } else if (elapsed >= s.endMs) {
          // fully retracted and hidden
          edgeProgress[edgeId] = 0;
        } else {
          // retracting backwards from 1 down to 0
          visibleEdgeIds.add(edgeId);
          const p = 1 - (elapsed - s.startMs) / s.durationMs;
          edgeProgress[edgeId] = Math.max(0, Math.min(1, p));
        }
      }

      for (const [nodeId, s] of Object.entries(schedule.nodeSchedules)) {
        if (elapsed < s.revealMs) {
          // not yet hidden
          visibleNodeIds.add(nodeId);
        }
      }

      this.currentState = {
        ...this.currentState,
        visibleEdgeIds,
        visibleNodeIds,
        edgeProgress,
      };
      this.options.onUpdate(this.currentState);

      this.currentRafId = requestAnimationFrame(tick);
    };

    this.currentRafId = requestAnimationFrame(tick);
  }

  /**
   * Trace meter target upstream to source
   */
  public traceMeter(targetNodeOrMeterCode: string): TracePathResult | null {
    const trace = this.graph.resolveTracePath(targetNodeOrMeterCode);
    if (!trace) return null;

    this.cancel();
    const tokenGen = this.currentGen;

    // All edges and nodes remain visible in trace state, but non-traced are de-emphasized
    const allEdgeIds = new Set<string>(this.graph.edges.keys());
    const allNodeIds = new Set<string>(this.graph.nodes.keys());
    const edgeProgress: Record<string, number> = {};
    for (const edgeId of allEdgeIds) {
      edgeProgress[edgeId] = 1;
    }

    this.currentState = {
      ...this.currentState,
      phase: 'tracing',
      tracedNodeId: trace.targetNodeId,
      tracedMeterCode: trace.meterCode,
      tracedNodeIds: new Set(trace.pathNodeIds),
      tracedEdgeIds: new Set(trace.pathEdgeIds),
      visibleEdgeIds: allEdgeIds,
      visibleNodeIds: allNodeIds,
      edgeProgress,
      generation: tokenGen,
    };

    this.options.onUpdate(this.currentState);
    if (this.options.onPhaseChange) this.options.onPhaseChange('tracing');

    return trace;
  }

  /**
   * Exit trace and return cleanly to expanded state
   */
  public clearTrace(): void {
    if (this.currentState.phase !== 'tracing') return;
    this.cancel();
    const tokenGen = this.currentGen;
    this.currentState = createFullyExpandedState(this.currentState.utilityType, this.graph, tokenGen);
    this.options.onUpdate(this.currentState);
    if (this.options.onPhaseChange) this.options.onPhaseChange('expanded');
  }
}
