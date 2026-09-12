/**
 * Centralized Command Bar Model Derivation (V13.1)
 *
 * Section 8-12: Centralized Action Registry & Absolute No-Duplication Invariant
 *
 * Invariant: primaryActionIds ∩ overflowActionIds = ∅
 *
 * Desktop Map Mode:
 * - Primary bar: Brand, Temporal, Map/List switcher, Search, Filter, Progress status, Overflow, Profile.
 * - Map Overflow: Refresh, Export CSV, Legend, Fullscreen, Calibration (Admin only).
 * - Direct icons for Analytics, Legend, and Fullscreen are REMOVED from the primary bar.
 * - Progress status opens Analytics context directly.
 *
 * Desktop List Mode:
 * - Primary bar: Brand, Temporal, Map/List switcher, Search, Filter, Progress status, Overflow, Profile.
 * - List Overflow: Refresh, Export CSV, Analytics.
 * - Map-only utilities (Legend, Fullscreen, Calibration) are strictly ABSENT from List mode.
 */

import type { MapWorkspaceView } from '../../../types';

export type CommandActionScope = 'map' | 'list';
export type CommandActionPlacement = 'primary' | 'overflow';

export interface CommandAction {
  id: string;
  label: string;
  scopes: CommandActionScope[];
  priority: number;
  preferredPlacement: CommandActionPlacement;
  canShow: (context: CommandBarModelInput) => boolean;
}

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

  // Primary Tools (Section 10, 12)
  showSearch: boolean;
  showFilter: boolean;
  filterBadgeCount: number;
  showTelemetry: boolean;
  compactTelemetry: boolean;

  // Removed from primary bar in V13.1 (Moved to overflow to eliminate duplication)
  showAnalyticsButton: boolean;
  showLegendButton: boolean;
  showFullscreenButton: boolean;

  // Secondary & overflow
  showOverflowMenu: boolean;
  showProfileChip: boolean;
  showCompactToggle: boolean;
  isCompact: boolean;

  // Dynamic overflow list
  overflowItems: OverflowMenuItem[];

  // Action Registry IDs partition (Invariant: primary ∩ overflow = ∅)
  primaryActionIds: string[];
  overflowActionIds: string[];
}

/**
 * Authoritative Command Action Registry (Section 8)
 */
export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: 'search',
    label: 'Tìm kiếm',
    scopes: ['map', 'list'],
    priority: 10,
    preferredPlacement: 'primary',
    canShow: (ctx) => !ctx.isCalibrationActive && ctx.viewMode !== 'calibration',
  },
  {
    id: 'filter',
    label: 'Bộ lọc',
    scopes: ['map', 'list'],
    priority: 20,
    preferredPlacement: 'primary',
    canShow: (ctx) => !ctx.isCalibrationActive && ctx.viewMode !== 'calibration',
  },
  {
    id: 'progress',
    label: 'Tiến độ vận hành',
    scopes: ['map', 'list'],
    priority: 30,
    preferredPlacement: 'primary',
    canShow: (ctx) => {
      const isTablet = (ctx.viewportWidth ?? 1440) < 1024;
      return !ctx.isCalibrationActive && ctx.viewMode !== 'calibration' && !isTablet;
    },
  },
  {
    id: 'overflow',
    label: 'Tùy chọn khác',
    scopes: ['map', 'list'],
    priority: 80,
    preferredPlacement: 'primary',
    canShow: (ctx) => !ctx.isCalibrationActive && ctx.viewMode !== 'calibration',
  },
  {
    id: 'profile',
    label: 'Thông tin tài khoản',
    scopes: ['map', 'list'],
    priority: 90,
    preferredPlacement: 'primary',
    canShow: (ctx) => {
      const isTablet = (ctx.viewportWidth ?? 1440) < 1024;
      return !ctx.isCalibrationActive && ctx.viewMode !== 'calibration' && !isTablet;
    },
  },
  {
    id: 'refresh',
    label: 'Làm mới dữ liệu',
    scopes: ['map', 'list'],
    priority: 40,
    preferredPlacement: 'overflow',
    canShow: () => true,
  },
  {
    id: 'export-csv',
    label: 'Xuất CSV',
    scopes: ['map', 'list'],
    priority: 50,
    preferredPlacement: 'overflow',
    canShow: () => true,
  },
  {
    id: 'analytics',
    label: 'Phân tích vận hành',
    scopes: ['list'], // Only in overflow for List mode (in Map mode, progress opens analytics)
    priority: 60,
    preferredPlacement: 'overflow',
    canShow: (ctx) => ctx.viewMode === 'list',
  },
  {
    id: 'legend',
    label: 'Chú giải bản đồ',
    scopes: ['map'], // Strictly Map only
    priority: 70,
    preferredPlacement: 'overflow',
    canShow: (ctx) => ctx.viewMode === 'map',
  },
  {
    id: 'fullscreen',
    label: 'Toàn màn hình',
    scopes: ['map'], // Strictly Map only
    priority: 75,
    preferredPlacement: 'overflow',
    canShow: (ctx) => ctx.viewMode === 'map',
  },
  {
    id: 'calibration',
    label: 'Hiệu chỉnh bản đồ',
    scopes: ['map'], // Strictly Map only & Admin only
    priority: 100,
    preferredPlacement: 'overflow',
    canShow: (ctx) => ctx.viewMode === 'map' && Boolean(ctx.isAdmin),
  },
];

/**
 * Derives the active command bar model enforcing the absolute no-duplication invariant:
 * primaryActionIds ∩ overflowActionIds = ∅
 */
export function deriveCommandBarModel(input: CommandBarModelInput): CommandBarModel {
  const {
    viewMode,
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440,
    isCompact = false,
    activeFilterCount = 0,
    isAdmin = false,
    isCalibrationActive = false,
  } = input;

  // In calibration mode, normal operational command bar is unmounted/hidden
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
      primaryActionIds: [],
      overflowActionIds: [],
    };
  }

  const isNarrow = viewportWidth < 1280;
  const isTablet = viewportWidth < 1024;
  const effectiveCompact = isCompact || isTablet;

  const isMapMode = viewMode === 'map';

  // Section 10 & 12: Primary controls
  const showSearch = true;
  const showFilter = true;
  const showTelemetry = !isTablet;
  const compactTelemetry = effectiveCompact || isNarrow;
  const showProfileChip = !isTablet;

  // V13.1 Simplification: Direct icons for Analytics, Legend, and Fullscreen are REMOVED from primary bar
  const showAnalyticsButton = false;
  const showLegendButton = false;
  const showFullscreenButton = false;

  // Build primary action IDs
  const primaryActionIds: string[] = ['search', 'filter'];
  if (showTelemetry) {
    primaryActionIds.push('progress');
  }
  primaryActionIds.push('overflow');
  if (showProfileChip) {
    primaryActionIds.push('profile');
  }

  // Section 11 & 12: Build context-aware overflow menu
  const overflowItems: OverflowMenuItem[] = [
    { id: 'refresh', label: 'Làm mới dữ liệu', category: 'action' },
    { id: 'export-csv', label: 'Xuất CSV', category: 'action' },
  ];

  if (isMapMode) {
    // Section 11: Map overflow includes Legend and Fullscreen
    overflowItems.push({ id: 'legend', label: 'Chú giải bản đồ', category: 'view' });
    overflowItems.push({ id: 'fullscreen', label: 'Toàn màn hình', category: 'view' });

    // Admin-only calibration entry preserved in overflow for Map view (Section 11, 18, 19)
    if (isAdmin) {
      overflowItems.push({ id: 'calibration', label: 'Hiệu chỉnh bản đồ', category: 'admin' });
    }
  } else {
    // Section 12: List overflow includes Analytics (Legend and Fullscreen absent)
    overflowItems.push({ id: 'analytics', label: 'Phân tích vận hành', category: 'view' });
  }

  const overflowActionIds = overflowItems.map((item) => item.id);

  // SECTION 9: STRICT DEDUPLICATION ASSERTION IN DEVELOPMENT
  // primaryActionIds ∩ overflowActionIds must be EMPTY set!
  const overlap = primaryActionIds.filter((id) => overflowActionIds.includes(id));
  if (overlap.length > 0) {
    throw new Error(
      `Command bar action duplication violation: [${overlap.join(', ')}] exists in both primary and overflow!`
    );
  }

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
    showProfileChip,
    showCompactToggle: !isTablet,
    isCompact: effectiveCompact,
    overflowItems,
    primaryActionIds,
    overflowActionIds,
  };
}

/**
 * Returns the action partition for deterministic automated testing.
 */
export function getCommandBarActionPartition(model: CommandBarModel): {
  primaryActionIds: string[];
  overflowActionIds: string[];
} {
  return {
    primaryActionIds: model.primaryActionIds,
    overflowActionIds: model.overflowActionIds,
  };
}

/**
 * Validates that primary and overflow action IDs are mutually exclusive.
 */
export function isActionPartitionDisjoint(model: CommandBarModel): boolean {
  const primarySet = new Set(model.primaryActionIds);
  for (const id of model.overflowActionIds) {
    if (primarySet.has(id)) return false;
  }
  return true;
}
