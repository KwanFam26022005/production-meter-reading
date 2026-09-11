/**
 * Motion Tokens — Immersive Spatial Operations Console (Section 14)
 *
 * Centralized timing and easing constants for the Tan Thuan Spatial Operations Console.
 * Fast = 120ms, Normal = 180ms, Medium = 240ms, Slow = 320ms.
 * Easing: standard = cubic-bezier(0.4, 0, 0.2, 1), enter = ease-out, exit = ease-in.
 */

/** Duration constants in milliseconds */
export const MOTION = {
  /** Micro-interactions: button hover, icon swap */
  fast: 120,
  /** Standard transitions: color change, opacity, pill slide */
  normal: 180,
  /** Focus/selection transitions: zone select, popup entry */
  medium: 240,
  /** Scene-level transitions: alert mode toggle, round change, drawer entry */
  slow: 320,
} as const;

/** Easing functions */
export const EASING = {
  /** Standard material-like curve for general transitions */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Enter curve for menus, popovers, and drawers */
  enter: 'ease-out',
  /** Exit curve for dismissed overlays */
  exit: 'ease-in',
  /** Smooth deceleration for context surfaces */
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Linear progression for progress rings */
  linear: 'linear',
} as const;

/**
 * Build a CSS transition string using motion tokens.
 *
 * @example
 * style={{ transition: transition('opacity', 'normal', 'standard') }}
 * // → "opacity 180ms cubic-bezier(0.4, 0, 0.2, 1)"
 */
export const transition = (
  property: string,
  duration: keyof typeof MOTION = 'normal',
  easing: keyof typeof EASING = 'standard'
): string => `${property} ${MOTION[duration]}ms ${EASING[easing]}`;

/**
 * Build a multi-property CSS transition string.
 */
export const transitions = (
  properties: string[],
  duration: keyof typeof MOTION = 'normal',
  easing: keyof typeof EASING = 'standard'
): string =>
  properties.map((p) => `${p} ${MOTION[duration]}ms ${EASING[easing]}`).join(', ');
