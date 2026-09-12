/**
 * Centralized Command Bar Model Derivation (V13.2)
 *
 * Section 4-10:
 * - Full Collapse Mode: EXPANDED vs COLLAPSED
 * - In COLLAPSED: toolbar collapses to single floating avatar control [P]
 * - In EXPANDED: toolbar includes temporal, view-toggle, search, filter, status, overflow, profile, collapse
 * - Branding REMOVED: Port logo, CẢNG TÂN THUẬN, and subtitles removed (provided by sidebar)
 * - Legend REMOVED: Managed exclusively by bottom map info [i] button
 * - Fullscreen REMOVED: Completely eliminated from product
 * - Map Overflow: Refresh, Export CSV, Calibration (Admin only)
 * - List Overflow: Refresh, Export CSV, Analytics
 * - Invariant: primaryActionIds ∩ overflowActionIds = ∅
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
  isCollapsed?: boolean;
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
  // Identity (Removed in V13.2 Section 5)
  showIdentity: boolean;
  compactIdentity: boolean;

  // Center temporal & view controls
  showTemporalGroup: boolean;
  showViewSwitch: boolean;

  // Primary Tools (Section 7)
  showSearch: boolean;
  showFilter: boolean;
  filterBadgeCount: number;
  showTelemetry: boolean;
  compactTelemetry: boolean;

  // Direct icons removed from toolbar
  showAnalyticsButton: boolean;
  showLegendButton: boolean;
  showFullscreenButton: boolean;

  // Secondary & overflow
  showOverflowMenu: boolean;
  showProfileChip: boolean;
  showCompactToggle: boolean;
  showCollapseToggle: boolean;
  isCompact: boolean;
  isCollapsed: boolean;

  // Dynamic overflow list
  overflowItems: OverflowMenuItem[];

  // Action Registry IDs partition (Invariant: primary ∩ overflow = ∅)
  primaryActionIds: string[];
  overflowActionIds: string[];
}

/**
 * Authoritative Command Action Registry (V13.2 Section 8-10)
 * Note: 'legend' and 'fullscreen' are permanently removed from toolbar & overflow.
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
    id: 'collapse',
    label: 'Thu gọn thanh công cụ',
    scopes: ['map', 'list'],
    priority: 95,
    preferredPlacement: 'primary',
    canShow: (ctx) => !ctx.isCalibrationActive && ctx.viewMode !== 'calibration',
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
    scopes: ['list'], // Only in overflow for List mode
    priority: 60,
    preferredPlacement: 'overflow',
    canShow: (ctx) => ctx.viewMode === 'list',
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
    isCollapsed = false,
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
      showCollapseToggle: false,
      isCompact: false,
      isCollapsed: false,
      overflowItems: [],
      primaryActionIds: [],
      overflowActionIds: [],
    };
  }

  // Section 4: Full Collapse Mode (Avatar control only)
  if (isCollapsed) {
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
      showCollapseToggle: false,
      isCompact: true,
      isCollapsed: true,
      overflowItems: [],
      primaryActionIds: ['profile'], // Single avatar button in collapsed state
      overflowActionIds: [],
    };
  }

  const isNarrow = viewportWidth < 1280;
  const isTablet = viewportWidth < 1024;
  const effectiveCompact = isCompact || isTablet;
  const isMapMode = viewMode === 'map';

  // Section 7: Primary controls in expanded mode
  const showSearch = true;
  const showFilter = true;
  const showTelemetry = !isTablet;
  const compactTelemetry = effectiveCompact || isNarrow;
  const showProfileChip = !isTablet;
  const showCollapseToggle = true;

  // Section 7, 8, 9: Permanently removed from primary bar
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
  primaryActionIds.push('collapse');

  // Section 10 & 12: Build context-aware overflow menu
  const overflowItems: OverflowMenuItem[] = [
    { id: 'refresh', label: 'Làm mới dữ liệu', category: 'action' },
    { id: 'export-csv', label: 'Xuất CSV', category: 'action' },
  ];

  if (isMapMode) {
    // Section 10: Legend and Fullscreen REMOVED from overflow
    // Admin-only calibration entry preserved in overflow for Map view
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
    showIdentity: false, // Section 5: Branding completely removed from command bar
    compactIdentity: true,
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
    showCompactToggle: false, // Replaced by full collapse toggle
    showCollapseToggle,
    isCompact: effectiveCompact,
    isCollapsed: false,
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
