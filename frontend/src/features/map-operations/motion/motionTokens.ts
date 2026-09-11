/**
 * Motion Tokens — Industrial Spatial Motion System
 *
 * Centralized timing and easing constants for the Tan Thuan Spatial Operations Console.
 * Components MUST use these tokens rather than inventing arbitrary durations.
 *
 * CSS custom property counterparts:
 *   --motion-fast, --motion-normal, --motion-focus, --motion-scene
 *   --ease-out-expo, --ease-in-out
 */

/** Duration constants in milliseconds */
export const MOTION = {
  /** Micro-interactions: button hover, icon swap */
  fast: 120,
  /** Standard transitions: color change, opacity, ring */
  normal: 220,
  /** Focus/selection transitions: zone select, popup entry */
  focus: 340,
  /** Scene-level transitions: alert mode toggle, round change */
  scene: 480,
} as const;

/** Easing functions */
export const EASING = {
  /** Fast deceleration — feels responsive for UI elements */
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Balanced — standard material-like easing */
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Linear — progress rings, data-driven animation */
  linear: 'linear',
} as const;

/**
 * Build a CSS transition string using motion tokens.
 *
 * @example
 * style={{ transition: transition('opacity') }}
 * // → "opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)"
 *
 * @example
 * style={{ transition: transition('stroke-dashoffset', 'focus', 'outExpo') }}
 * // → "stroke-dashoffset 340ms cubic-bezier(0.16, 1, 0.3, 1)"
 */
export const transition = (
  property: string,
  duration: keyof typeof MOTION = 'normal',
  easing: keyof typeof EASING = 'inOut'
): string => `${property} ${MOTION[duration]}ms ${EASING[easing]}`;

/**
 * Build a multi-property CSS transition string.
 *
 * @example
 * style={{ transition: transitions(['fill', 'stroke', 'opacity']) }}
 */
export const transitions = (
  properties: string[],
  duration: keyof typeof MOTION = 'normal',
  easing: keyof typeof EASING = 'inOut'
): string =>
  properties.map((p) => `${p} ${MOTION[duration]}ms ${EASING[easing]}`).join(', ');
