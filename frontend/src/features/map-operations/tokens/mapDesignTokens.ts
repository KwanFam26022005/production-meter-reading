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
