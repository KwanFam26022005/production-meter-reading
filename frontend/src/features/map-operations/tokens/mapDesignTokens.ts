/**
 * V7.1 Map Design Tokens & Z-Index Contract
 * Centralized constants for spatial UI consistency across all states.
 */

export const MAP_TOKENS = {
  headerHeight: 56,
  surfaceRadius: 16,
  hudHeight: 48,
  inspectorWidth: 312,
  railWidth: 360,
  railWidth1366: 340,
  railWidth1024: 320,
  overlayGap: 16,
  safePadding: {
    top: 96,
    left: 32,
    bottom: 64,
    rightBrowse: 32,
    rightInspect: 352,
    rightDetails: 392,
  },
  shadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  transitionFast: '180ms ease',
  transitionMedium: '280ms cubic-bezier(0.16, 1, 0.3, 1)',
  cameraDuration: 300,
} as const;

export const MAP_Z_INDEX = {
  baseMap: 0,
  zones: 10,
  meters: 20,
  operators: 30,
  zoneLabels: 35,
  hover: 40,
  selectedEntity: 50,
  mapHud: 60,
  spatialInspector: 70,
  detailRail: 80,
  dialog: 90,
  toast: 100,
} as const;

/**
 * V8.1 Calm Contrast Design Tokens (Section 13 & 14)
 * Low-chrome maritime operational UI surfaces.
 */
export const MAP_CALM_CONTRAST_TOKENS = {
  chromeMist: 'rgba(255, 255, 255, 0.72)',
  chromeMistStrong: 'rgba(255, 255, 255, 0.88)',
  hudDark: 'rgba(15, 23, 42, 0.78)',
  hudDarkHover: 'rgba(15, 23, 42, 0.90)',
  borderSoft: 'rgba(15, 23, 42, 0.10)',
  borderSoftDark: 'rgba(255, 255, 255, 0.20)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  shadowSoft: '0 4px 16px rgba(0, 0, 0, 0.08)',
} as const;

export const CALM_CONTRAST_TOKENS = {
  '--map-chrome-mist': 'rgba(255, 255, 255, 0.72)',
  '--map-chrome-mist-strong': 'rgba(255, 255, 255, 0.88)',
  '--map-hud-dark': 'rgba(15, 23, 42, 0.78)',
  '--map-hud-dark-hover': 'rgba(15, 23, 42, 0.90)',
  '--map-border-soft': 'rgba(15, 23, 42, 0.10)',
  '--map-text-primary': '#0F172A',
  '--map-text-secondary': '#475569',
  '--map-shadow-soft': '0 4px 16px rgba(0, 0, 0, 0.08)',
} as const;

export const MAP_CHROME_TOKENS = MAP_CALM_CONTRAST_TOKENS;

/**
 * V9 Smoked Maritime Map-Native HUD Tokens (Section 16 & 17)
 * Shared design token language across all floating HUD surfaces:
 * - Top application bar
 * - Left search/filter actions
 * - Right telemetry strip
 * - Bottom-left timeline/round HUD
 * - Bottom-right legend & fullscreen controls
 */
export const MAP_HUD_TOKENS = {
  surface: 'rgba(6, 29, 42, 0.78)',
  surfaceHover: 'rgba(6, 29, 42, 0.88)',
  surfaceSubtle: 'rgba(255, 255, 255, 0.06)',
  surfaceSubtleHover: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  textPrimary: 'rgba(248, 250, 252, 0.94)',
  textSecondary: 'rgba(203, 213, 225, 0.82)',
  textMuted: 'rgba(148, 163, 184, 0.70)',
  backdropFilter: 'blur(16px) saturate(115%)',
  shadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
  accentTeal: '#0E7490',
  accentCyan: '#06B6D4',
  accentActiveBg: 'rgba(6, 182, 212, 0.22)',
} as const;

export const MAP_HUD_CSS_VARS = {
  '--sgp-hud-surface': MAP_HUD_TOKENS.surface,
  '--sgp-hud-surface-hover': MAP_HUD_TOKENS.surfaceHover,
  '--sgp-hud-surface-subtle': MAP_HUD_TOKENS.surfaceSubtle,
  '--sgp-hud-surface-subtle-hover': MAP_HUD_TOKENS.surfaceSubtleHover,
  '--sgp-hud-border': MAP_HUD_TOKENS.border,
  '--sgp-hud-border-subtle': MAP_HUD_TOKENS.borderSubtle,
  '--sgp-hud-text': MAP_HUD_TOKENS.textPrimary,
  '--sgp-hud-secondary': MAP_HUD_TOKENS.textSecondary,
  '--sgp-hud-muted': MAP_HUD_TOKENS.textMuted,
  '--sgp-hud-backdrop': MAP_HUD_TOKENS.backdropFilter,
  '--sgp-hud-shadow': MAP_HUD_TOKENS.shadow,
} as const;
