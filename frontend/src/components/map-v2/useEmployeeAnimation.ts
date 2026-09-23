import { useState, useEffect, useRef, useMemo } from 'react';
import { SafeMovementPath, Coordinates2D } from './employeeMovement';

export interface UseEmployeeAnimationProps {
  path: SafeMovementPath;
  initialProgress?: number;
  isHovered: boolean;
  isFocused: boolean;
  isSelected: boolean;
  isManuallyPaused: boolean;
  isLayerVisible: boolean;
  isTechnicalMode: boolean;
  forcedReducedMotion?: boolean;
}

export interface UseEmployeeAnimationResult {
  currentPosition: Coordinates2D;
  isPaused: boolean;
  pauseReason: string | null;
  progress: number;
}

/**
 * Custom hook managing the subtle, ambient animation of a single employee marker.
 *
 * Implements the explicit Pause & Resume state machine:
 * - Pauses at current position (never restarts from beginning).
 * - Resumes smoothly from current progress when all pause conditions clear.
 * - Handles prefers-reduced-motion media query natively.
 * - Cancels animation frames cleanly on unmount.
 */
export function useEmployeeAnimation({
  path,
  initialProgress = 0,
  isHovered,
  isFocused,
  isSelected,
  isManuallyPaused,
  isLayerVisible,
  isTechnicalMode,
  forcedReducedMotion = false,
}: UseEmployeeAnimationProps): UseEmployeeAnimationResult {
  // Check OS-level prefers-reduced-motion
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const prefersReducedMotion = forcedReducedMotion || systemReducedMotion;

  // Determine aggregate pause state and active reason
  const { isPaused, pauseReason } = useMemo(() => {
    if (path.isStationary) {
      return { isPaused: true, pauseReason: 'stationary_zone' };
    }
    if (prefersReducedMotion) {
      return { isPaused: true, pauseReason: 'reduced_motion' };
    }
    if (isSelected) {
      return { isPaused: true, pauseReason: 'selected' };
    }
    if (isHovered) {
      return { isPaused: true, pauseReason: 'hovered' };
    }
    if (isFocused) {
      return { isPaused: true, pauseReason: 'focused' };
    }
    if (isManuallyPaused) {
      return { isPaused: true, pauseReason: 'manual_pause' };
    }
    if (!isLayerVisible) {
      return { isPaused: true, pauseReason: 'layer_hidden' };
    }
    if (isTechnicalMode) {
      return { isPaused: true, pauseReason: 'technical_mode' };
    }
    return { isPaused: false, pauseReason: null };
  }, [
    path.isStationary,
    prefersReducedMotion,
    isSelected,
    isHovered,
    isFocused,
    isManuallyPaused,
    isLayerVisible,
    isTechnicalMode,
  ]);

  // Current progress [0, 1] held in ref to avoid render loops
  const progressRef = useRef<number>(initialProgress);
  const [currentPosition, setCurrentPosition] = useState<Coordinates2D>(() =>
    path.getPositionAt(initialProgress)
  );

  const lastTimeRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // If path center changes (e.g. zone geometry recomputed), sync position
  useEffect(() => {
    setCurrentPosition(path.getPositionAt(progressRef.current));
  }, [path]);

  // Animation loop
  useEffect(() => {
    // If stationary or paused, do not run animation loop
    if (isPaused) {
      lastTimeRef.current = null;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const durationMs = Math.max(1000, path.duration * 1000);

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      } else {
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Advance progress smoothly
        const deltaProgress = delta / durationMs;
        progressRef.current = (progressRef.current + deltaProgress) % 1;

        const nextPos = path.getPositionAt(progressRef.current);
        setCurrentPosition(nextPos);
      }

      animFrameIdRef.current = requestAnimationFrame(step);
    };

    animFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPaused, path]);

  return {
    currentPosition,
    isPaused,
    pauseReason,
    progress: progressRef.current,
  };
}
