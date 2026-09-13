/**
 * OperationalMotionController — Master Operator Workflow Animation & Route Controller (V15C)
 *
 * Implements the operational state machine:
 * IDLE -> MOVING -> ARRIVING -> READING -> COMPLETED -> (MOVING | IDLE)
 *
 * Performance Contract:
 * - Single MotionClock subscription
 * - Decouples frame position updates from React top-level state
 * - Automatic pause during tab hidden, Map-to-List transitions, and calibration
 */

import { CanonicalPoint, PlannedRoute } from './routing/RouteTypes';
import { getZoneRouteGraph, getRouteGraphForMeter } from './routing/ZoneRouteGraph';
import { RoutePlanner } from './routing/RoutePlanner';
import { RouteInterpolator } from './routing/RouteInterpolator';
import { MotionClock } from './MotionClock';

export type OperatorWorkflowMotionState =
  | 'IDLE'
  | 'MOVING'
  | 'ARRIVING'
  | 'READING'
  | 'COMPLETED'
  | 'PAUSED';

export interface OperatorWorkflowRecord {
  operatorId: string;
  zoneId: string;
  state: OperatorWorkflowMotionState;
  targetMeterId: string | null;
  plannedRoute: PlannedRoute | null;
  interpolator: RouteInterpolator | null;
  routeDurationMs: number;
  routeElapsedMs: number;
  stateElapsedMs: number;
  currentPosition: CanonicalPoint;
  lastCompletedMeterId?: string | null;
  previousState?: OperatorWorkflowMotionState;
}

export type MotionMode = 'operational' | 'demo';

export interface ControllerOptions {
  mode?: MotionMode;
  visualSpeed?: number; // px per second, default 120
  settleDurationMs?: number; // default 200
  readingDurationMs?: number; // demo reading duration, default 2000
  completionDwellMs?: number; // dwell before next route, default 400
}

export const VISUAL_SPEED = 120;
export const MIN_ROUTE_DURATION = 1600;
export const MAX_ROUTE_DURATION = 5000;

export function calculateRouteDuration(distance: number, speed: number = VISUAL_SPEED): number {
  if (distance <= 0) return MIN_ROUTE_DURATION;
  const rawDuration = (distance / speed) * 1000;
  return Math.max(MIN_ROUTE_DURATION, Math.min(MAX_ROUTE_DURATION, rawDuration));
}

/**
 * Applies subtle ease-in / ease-out without bounce or corridor overshoot.
 */
export function easeRouteProgress(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  // Smooth cubic S-curve (Hermite interpolation)
  return clamped * clamped * (3 - 2 * clamped);
}

export class OperationalMotionController {
  private mode: MotionMode = 'operational';
  private visualSpeed: number = VISUAL_SPEED;
  private settleDurationMs: number = 200;
  private readingDurationMs: number = 2000;
  private completionDwellMs: number = 400;

  private operators = new Map<string, OperatorWorkflowRecord>();
  private clockUnsubscribe: (() => void) | null = null;
  private stateChangeListeners = new Set<() => void>();
  private frameListeners = new Set<() => void>();
  private isPaused: boolean = false;

  constructor(options: ControllerOptions = {}) {
    if (options.mode) this.mode = options.mode;
    if (options.visualSpeed) this.visualSpeed = options.visualSpeed;
    if (options.settleDurationMs) this.settleDurationMs = options.settleDurationMs;
    if (options.readingDurationMs) this.readingDurationMs = options.readingDurationMs;
    if (options.completionDwellMs) this.completionDwellMs = options.completionDwellMs;

    this.startClock();
  }

  private startClock(): void {
    if (this.clockUnsubscribe) return;
    const clock = MotionClock.getInstance();
    this.clockUnsubscribe = clock.subscribe(this.onTick);
  }

  public setMode(mode: MotionMode): void {
    this.mode = mode;
  }

  public getMode(): MotionMode {
    return this.mode;
  }

  /**
   * Registers or updates an operator with a default starting anchor.
   */
  public registerOperator(operatorId: string, zoneId: string, startAnchor: CanonicalPoint): OperatorWorkflowRecord {
    let record = this.operators.get(operatorId);
    if (!record) {
      record = {
        operatorId,
        zoneId,
        state: 'IDLE',
        targetMeterId: null,
        plannedRoute: null,
        interpolator: null,
        routeDurationMs: 0,
        routeElapsedMs: 0,
        stateElapsedMs: 0,
        currentPosition: { ...startAnchor },
      };
      this.operators.set(operatorId, record);
    }
    return record;
  }

  public getOperatorRecord(operatorId: string): OperatorWorkflowRecord | undefined {
    return this.operators.get(operatorId);
  }

  public getAllOperators(): OperatorWorkflowRecord[] {
    return Array.from(this.operators.values());
  }

  /**
   * Plans and starts movement for an operator towards a target meter along canonical corridors.
   */
  public startMovementToMeter(operatorId: string, targetMeterId: string): boolean {
    const record = this.operators.get(operatorId);
    if (!record) return false;

    const meterMapping = getRouteGraphForMeter(targetMeterId);
    if (!meterMapping) return false;

    const graph = getZoneRouteGraph(record.zoneId);
    if (!graph) return false;

    // Find closest starting node: either startNodeId or target's access node from previous run
    const startNodeId = graph.operatorStartNodeId;
    const targetNodeId = meterMapping.accessNodeId;

    try {
      const plannedRoute = RoutePlanner.planRoute({
        graph,
        startNodeId,
        targetNodeId,
        meterId: targetMeterId,
      });

      const interpolator = new RouteInterpolator(plannedRoute.points);
      const durationMs = calculateRouteDuration(plannedRoute.totalDistance, this.visualSpeed);

      record.state = 'MOVING';
      record.targetMeterId = targetMeterId;
      record.plannedRoute = plannedRoute;
      record.interpolator = interpolator;
      record.routeDurationMs = durationMs;
      record.routeElapsedMs = 0;
      record.stateElapsedMs = 0;
      record.currentPosition = { ...plannedRoute.points[0] };

      this.notifyStateChange();
      return true;
    } catch (err) {
      console.warn(`[MotionController] Failed to plan route for operator ${operatorId} to ${targetMeterId}:`, err);
      return false;
    }
  }

  /**
   * Manually completes a reading (in operational mode when domain completes reading).
   */
  public completeReading(operatorId: string, completedMeterId: string): void {
    const record = this.operators.get(operatorId);
    if (!record) return;

    if (record.targetMeterId === completedMeterId || record.state === 'READING') {
      record.state = 'COMPLETED';
      record.stateElapsedMs = 0;
      record.lastCompletedMeterId = completedMeterId;
      this.notifyStateChange();
    }
  }

  /**
   * Master clock tick handler called on every RAF frame.
   */
  private onTick = (deltaMs: number): void => {
    if (this.isPaused) return;

    let stateChanged = false;
    let frameUpdated = false;

    for (const record of this.operators.values()) {
      if (record.state === 'PAUSED' || record.state === 'IDLE') {
        continue;
      }

      record.stateElapsedMs += deltaMs;

      if (record.state === 'MOVING') {
        record.routeElapsedMs += deltaMs;
        const progress = Math.min(1, record.routeElapsedMs / record.routeDurationMs);
        const easedT = easeRouteProgress(progress);

        if (record.interpolator) {
          record.currentPosition = record.interpolator.getPointAtProgress(easedT);
          frameUpdated = true;
        }

        if (progress >= 1) {
          record.state = 'ARRIVING';
          record.stateElapsedMs = 0;
          stateChanged = true;
        }
      } else if (record.state === 'ARRIVING') {
        if (record.stateElapsedMs >= this.settleDurationMs) {
          record.state = 'READING';
          record.stateElapsedMs = 0;
          stateChanged = true;
        }
      } else if (record.state === 'READING') {
        // In demo mode, reading completes automatically after readingDurationMs
        if (this.mode === 'demo' && record.stateElapsedMs >= this.readingDurationMs) {
          record.state = 'COMPLETED';
          record.stateElapsedMs = 0;
          record.lastCompletedMeterId = record.targetMeterId;
          stateChanged = true;
        }
      } else if (record.state === 'COMPLETED') {
        if (record.stateElapsedMs >= this.completionDwellMs) {
          // After completion dwell, operator returns to IDLE unless demo mode auto-routes
          record.state = 'IDLE';
          record.targetMeterId = null;
          record.plannedRoute = null;
          record.interpolator = null;
          stateChanged = true;
        }
      }
    }

    if (frameUpdated) {
      this.notifyFrame();
    }
    if (stateChanged) {
      this.notifyStateChange();
    }
  };

  /**
   * Pauses all motion (e.g. when entering calibration or switching to List mode).
   */
  public pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    for (const record of this.operators.values()) {
      if (record.state !== 'IDLE' && record.state !== 'PAUSED') {
        record.previousState = record.state;
        record.state = 'PAUSED';
      }
    }
    this.notifyStateChange();
  }

  /**
   * Resumes paused motion.
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    for (const record of this.operators.values()) {
      if (record.state === 'PAUSED') {
        record.state = record.previousState || 'IDLE';
        record.previousState = undefined;
      }
    }
    this.notifyStateChange();
  }

  /**
   * Cancels active route for a given operator or all operators.
   */
  public cancel(operatorId?: string): void {
    if (operatorId) {
      const record = this.operators.get(operatorId);
      if (record) {
        record.state = 'IDLE';
        record.targetMeterId = null;
        record.plannedRoute = null;
        record.interpolator = null;
        record.routeElapsedMs = 0;
      }
    } else {
      for (const record of this.operators.values()) {
        record.state = 'IDLE';
        record.targetMeterId = null;
        record.plannedRoute = null;
        record.interpolator = null;
        record.routeElapsedMs = 0;
      }
    }
    this.notifyStateChange();
  }

  /**
   * Resets all operators to their initial anchor positions.
   */
  public reset(anchors?: Record<string, CanonicalPoint>): void {
    this.cancel();
    if (anchors) {
      for (const [opId, anchor] of Object.entries(anchors)) {
        const record = this.operators.get(opId);
        if (record) {
          record.currentPosition = { ...anchor };
        }
      }
    }
    this.notifyStateChange();
  }

  public subscribeStateChange(listener: () => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  public subscribeFrame(listener: () => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  private notifyStateChange(): void {
    for (const listener of Array.from(this.stateChangeListeners)) {
      listener();
    }
  }

  private notifyFrame(): void {
    for (const listener of Array.from(this.frameListeners)) {
      listener();
    }
  }

  public destroy(): void {
    if (this.clockUnsubscribe) {
      this.clockUnsubscribe();
      this.clockUnsubscribe = null;
    }
    this.stateChangeListeners.clear();
    this.frameListeners.clear();
    this.operators.clear();
  }
}
