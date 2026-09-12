/**
 * Centralized Command Bar Model Derivation (V13)
 *
 * Section 9: Context-Aware Tool Model
 * Individual buttons do not independently decide their visibility.
 * The parent model owns visibility based on viewMode, context, and viewport width.
 */

import type { MapWorkspaceView } from '../../../types';

export interface CommandBarModelInput {
  viewMode: MapWorkspaceView;
  workspaceMode?: 'browse' | 'inspect' | 'details' | 'placement';
  selectedEntity?: { type: 'zone' | 'operator' | 'meter'; id: string } | null;
  contextSurface?: { type: string; entityId?: string } | null;
  viewportWidth?: number;
  isCompact?: boolean;
  activeFilterCount: number;
  analyticsOpen?: boolean;
  isCalibrationActive?: boolean;
  isAdmin?: boolean;
}

export interface OverflowMenuItem {
  id: string;
  label: string;
  category?: 'action' | 'view' | 'admin';
  disabled?: boolean;
}

export interface CommandBarModel {
  // Identity
  showIdentity: boolean;
  compactIdentity: boolean;

  // Center temporal & view controls
  showTemporalGroup: boolean;
  showViewSwitch: boolean;

  // Tools
  showSearch: boolean;
  showFilter: boolean;
  filterBadgeCount: number;
  showTelemetry: boolean;
  compactTelemetry: boolean;
  showAnalyticsButton: boolean;

  // Map-only utilities
  showLegendButton: boolean;
  showFullscreenButton: boolean;

  // Secondary & overflow
  showOverflowMenu: boolean;
  showProfileChip: boolean;
  showCompactToggle: boolean;
  isCompact: boolean;

  // Dynamic overflow list
  overflowItems: OverflowMenuItem[];
}

export function deriveCommandBarModel(input: CommandBarModelInput): CommandBarModel {
  const {
    viewMode,
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440,
    isCompact = false,
    activeFilterCount = 0,
    isAdmin = false,
    isCalibrationActive = false,
  } = input;

  // In calibration mode, the command bar is replaced by calibration chrome
  if (isCalibrationActive || viewMode === 'calibration') {
    return {
      showIdentity: false,
      compactIdentity: true,
      showTemporalGroup: false,
      showViewSwitch: false,
      showSearch: false,
      showFilter: false,
      filterBadgeCount: 0,
      showTelemetry: false,
      compactTelemetry: true,
      showAnalyticsButton: false,
      showLegendButton: false,
      showFullscreenButton: false,
      showOverflowMenu: false,
      showProfileChip: false,
      showCompactToggle: false,
      isCompact: false,
      overflowItems: [],
    };
  }

  const isNarrow = viewportWidth < 1280;
  const isTablet = viewportWidth < 1024;
  const effectiveCompact = isCompact || isTablet;

  const isMapMode = viewMode === 'map';

  // Build context-aware overflow menu items (Section 18)
  const overflowItems: OverflowMenuItem[] = [
    { id: 'refresh', label: 'Làm mới dữ liệu', category: 'action' },
    { id: 'export-csv', label: 'Xuất CSV', category: 'action' },
    { id: 'analytics', label: 'Phân tích vận hành', category: 'view' },
  ];

  if (isMapMode) {
    overflowItems.push({ id: 'legend', label: 'Chú giải bản đồ', category: 'view' });
    overflowItems.push({ id: 'fullscreen', label: 'Toàn màn hình', category: 'view' });
  }

  // Admin-only calibration entry preserved in overflow (Section 18, 19)
  if (isAdmin) {
    overflowItems.push({ id: 'calibration', label: 'Hiệu chỉnh bản đồ', category: 'admin' });
  }

  // Determine visibility of right-side tool cluster
  // In compact mode or on narrow screens, secondary actions move into overflow
  const showSearch = true; // Always available
  const showFilter = true; // Always available
  const showTelemetry = !isTablet;
  const compactTelemetry = effectiveCompact || isNarrow;
  const showAnalyticsButton = !effectiveCompact && !isNarrow;
  const showLegendButton = isMapMode && !effectiveCompact && !isNarrow;
  const showFullscreenButton = isMapMode && !effectiveCompact && viewportWidth >= 1440;

  return {
    showIdentity: true,
    compactIdentity: isNarrow || effectiveCompact,
    showTemporalGroup: true,
    showViewSwitch: true,
    showSearch,
    showFilter,
    filterBadgeCount: activeFilterCount,
    showTelemetry,
    compactTelemetry,
    showAnalyticsButton,
    showLegendButton,
    showFullscreenButton,
    showOverflowMenu: true,
    showProfileChip: !isTablet,
    showCompactToggle: !isTablet,
    isCompact: effectiveCompact,
    overflowItems,
  };
}
