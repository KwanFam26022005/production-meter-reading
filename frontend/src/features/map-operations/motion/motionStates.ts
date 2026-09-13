import { useState, useEffect } from 'react';
import type { MeterSemanticState } from '../types';
import type { SelectedEntity } from '../state/useMapStateMachine';

/**
 * V15A Explicit Marker Motion States
 *
 * Distinct motion states decoupled from raw business domain strings.
 */
export type MeterMotionState =
  | 'pending'
  | 'approaching'
  | 'reading'
  | 'completed'
  | 'overdue'
  | 'review'
  | 'selected';

export type OperatorMotionState =
  | 'idle'
  | 'moving'
  | 'arriving'
  | 'reading'
  | 'completed'
  | 'issue'
  | 'selected';

export interface ResolveMeterMotionParams {
  domainStatus?: MeterSemanticState | string;
  currentRound?: string;
  selectedEntity?: SelectedEntity;
  isSelected?: boolean;
  meterId?: string;
  isApproaching?: boolean;
  isReading?: boolean;
  issueState?: {
    isOverdue?: boolean;
    isReview?: boolean;
    hasIssue?: boolean;
  } | boolean;
  activeWorkflowState?: 'idle' | 'approaching' | 'reading' | 'completed' | 'review' | 'overdue' | string;
  operatorActivity?: {
    operatorId?: string;
    targetMeterId?: string;
    state?: 'idle' | 'moving' | 'arriving' | 'reading' | 'completed' | string;
  } | null;
  preferSemanticState?: boolean;
}

export interface ResolveOperatorMotionParams {
  operatorId?: string;
  selectedEntity?: SelectedEntity;
  isSelected?: boolean;
  currentRound?: string;
  issueState?: {
    issueCount?: number;
    hasOverdue?: boolean;
    hasReview?: boolean;
  } | number | boolean;
  activeWorkflowState?: 'idle' | 'moving' | 'arriving' | 'reading' | 'completed' | 'issue' | string;
  operatorActivity?: {
    state?: 'idle' | 'moving' | 'arriving' | 'reading' | 'completed' | string;
    targetMeterId?: string;
  } | null;
  progressPct?: number;
  preferSemanticState?: boolean;
}

/**
 * Deterministically resolves a meter's operational motion state.
 * Keeps visual motion states separate from business domain states.
 */
export function resolveMeterMotionState(params: ResolveMeterMotionParams): MeterMotionState {
  const {
    domainStatus,
    selectedEntity,
    isSelected,
    meterId,
    isApproaching,
    isReading,
    issueState,
    activeWorkflowState,
    operatorActivity,
    preferSemanticState = false,
  } = params;

  // 1. Dynamic reading state (active operational reading in progress)
  const isTargetOfOperator = Boolean(
    operatorActivity &&
    meterId &&
    operatorActivity.targetMeterId === meterId
  );

  if (
    isReading ||
    activeWorkflowState === 'reading' ||
    (isTargetOfOperator && operatorActivity?.state === 'reading') ||
    domainStatus === 'READING'
  ) {
    return 'reading';
  }

  // 2. Approaching state (operator assigned and moving toward this meter)
  if (
    isApproaching ||
    activeWorkflowState === 'approaching' ||
    (isTargetOfOperator &&
      (operatorActivity?.state === 'moving' || operatorActivity?.state === 'arriving'))
  ) {
    return 'approaching';
  }

  // 3. Selection state evaluation
  const entityIsSelected = Boolean(
    isSelected ||
    (selectedEntity && meterId && selectedEntity.type === 'meter' && selectedEntity.id === meterId)
  );

  if (entityIsSelected && !preferSemanticState) {
    return 'selected';
  }

  // 4. Overdue issue state
  const isOverdue =
    domainStatus === 'OVERDUE' ||
    (typeof issueState === 'object' && issueState?.isOverdue) ||
    activeWorkflowState === 'overdue';

  if (isOverdue) {
    return 'overdue';
  }

  // 5. Review issue state
  const isReview =
    domainStatus === 'REVIEW' ||
    (typeof issueState === 'object' && issueState?.isReview) ||
    activeWorkflowState === 'review';

  if (isReview) {
    return 'review';
  }

  // 6. If selection was deferred due to preferSemanticState but no issue was present
  if (entityIsSelected) {
    return 'selected';
  }

  // 7. Completed state
  if (
    domainStatus === 'CONFIRMED' ||
    domainStatus === 'COMPLETED' ||
    activeWorkflowState === 'completed'
  ) {
    return 'completed';
  }

  // 8. Default pending state
  return 'pending';
}

/**
 * Deterministically resolves an operator's operational motion state.
 */
export function resolveOperatorMotionState(params: ResolveOperatorMotionParams): OperatorMotionState {
  const {
    operatorId,
    selectedEntity,
    isSelected,
    issueState,
    activeWorkflowState,
    operatorActivity,
    progressPct,
    preferSemanticState = false,
  } = params;

  // 1. Dynamic reading state
  if (activeWorkflowState === 'reading' || operatorActivity?.state === 'reading') {
    return 'reading';
  }

  // 2. Moving / arriving states
  if (activeWorkflowState === 'arriving' || operatorActivity?.state === 'arriving') {
    return 'arriving';
  }
  if (activeWorkflowState === 'moving' || operatorActivity?.state === 'moving') {
    return 'moving';
  }

  // 3. Selection evaluation
  const entityIsSelected = Boolean(
    isSelected ||
    (selectedEntity && operatorId && selectedEntity.type === 'operator' && selectedEntity.id === operatorId)
  );

  if (entityIsSelected && !preferSemanticState) {
    return 'selected';
  }

  // 4. Completed state
  if (activeWorkflowState === 'completed' || (progressPct !== undefined && progressPct >= 100)) {
    return 'completed';
  }

  // 5. Issue state
  const issueCount =
    typeof issueState === 'number'
      ? issueState
      : typeof issueState === 'object' && issueState !== null
      ? (issueState.issueCount ?? (issueState.hasOverdue || issueState.hasReview ? 1 : 0))
      : issueState === true
      ? 1
      : 0;

  if (issueCount > 0 || activeWorkflowState === 'issue') {
    return 'issue';
  }

  // Deferred selection
  if (entityIsSelected) {
    return 'selected';
  }

  // 6. Idle state
  return 'idle';
}

/**
 * MotionStateResolver interface contract for central state machine integration.
 */
export const MotionStateResolver = {
  resolveMeter: resolveMeterMotionState,
  resolveOperator: resolveOperatorMotionState,
};

/**
 * React hook to observe prefers-reduced-motion media query.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  return prefersReducedMotion;
}
