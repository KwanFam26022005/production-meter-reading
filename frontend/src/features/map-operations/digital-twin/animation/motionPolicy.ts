/**
 * Motion and animation policy respecting prefers-reduced-motion
 */
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const ANIMATION_DURATIONS = {
  zoneFocus: 650, // ms
  meterFocus: 550, // ms
  resetView: 750, // ms
  elevationTransition: 350, // ms
  beaconPulseInterval: 2400, // ms
};

/**
 * Standard cubic ease-in-out easing function for camera and spatial transitions
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smoothstep easing
 */
export function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
