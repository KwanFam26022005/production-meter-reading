import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveCommandBarModel,
  isActionPartitionDisjoint,
  getCommandBarActionPartition,
  COMMAND_ACTIONS,
  type CommandBarModelInput,
} from '../src/features/map-operations/command/commandBarModel';

import { derivePresentationZoneAnalytics } from '../src/features/map-operations/analytics/presentationAnalytics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// SUITE 1: FULL COLLAPSE MODE & BRANDING REMOVAL (Section 4, 5, 27)
// ===========================================================================

test('V13.2 Toolbar: Collapsed state yields single avatar control and suppresses normal tools', () => {
  const collapsedModel = deriveCommandBarModel({
    viewMode: 'map',
    isCollapsed: true,
    activeFilterCount: 0,
    isAdmin: true,
  });

  assert.equal(collapsedModel.isCollapsed, true, 'Model must flag isCollapsed = true');
  assert.equal(collapsedModel.showTemporalGroup, false, 'Temporal group suppressed in collapsed state');
  assert.equal(collapsedModel.showViewSwitch, false, 'View switch suppressed in collapsed state');
  assert.equal(collapsedModel.showSearch, false, 'Search suppressed in collapsed state');
  assert.equal(collapsedModel.showFilter, false, 'Filter suppressed in collapsed state');
  assert.equal(collapsedModel.showTelemetry, false, 'Telemetry suppressed in collapsed state');
  assert.equal(collapsedModel.showOverflowMenu, false, 'Overflow suppressed in collapsed state');
  assert.deepEqual(
    collapsedModel.primaryActionIds,
    ['profile'],
    'Only profile/avatar control exists in collapsed state'
  );
  assert.deepEqual(collapsedModel.overflowActionIds, [], 'No overflow items in collapsed state');
});

test('V13.2 Toolbar: Expanded state contains temporal, view-toggle, search, filter, status, overflow, profile, collapse', () => {
  const expandedModel = deriveCommandBarModel({
    viewMode: 'map',
    isCollapsed: false,
    activeFilterCount: 1,
    isAdmin: true,
    viewportWidth: 1440,
  });

  assert.equal(expandedModel.isCollapsed, false);
  assert.equal(expandedModel.showTemporalGroup, true);
  assert.equal(expandedModel.showViewSwitch, true);
  assert.equal(expandedModel.showSearch, true);
  assert.equal(expandedModel.showFilter, true);
  assert.equal(expandedModel.showTelemetry, true);
  assert.equal(expandedModel.showOverflowMenu, true);
  assert.equal(expandedModel.showProfileChip, true);
  assert.equal(expandedModel.showCollapseToggle, true);

  // Section 5: Branding completely absent
  assert.equal(expandedModel.showIdentity, false, 'Branding must be absent from command bar');
});

test('V13.2 Source: AdaptiveCommandBar component code audit (No branding, avatar trigger with >= 44px)', () => {
  const cmdBarPath = path.resolve(__dirname, '../src/features/map-operations/command/AdaptiveCommandBar.tsx');
  const code = fs.readFileSync(cmdBarPath, 'utf-8');

  // No brand titles
  assert.equal(code.includes('sgp-cmd-brand-title'), false, 'Must not render sgp-cmd-brand-title');
  assert.equal(code.includes('sgp-cmd-logo'), false, 'Must not render sgp-cmd-logo');
  assert.equal(code.includes('sgp-cmd-title-wrap'), false, 'Must not render sgp-cmd-title-wrap');

  // Avatar trigger in collapsed state has min 44px touch target and proper aria-label
  assert.ok(code.includes('sgp-cmd-avatar-trigger'), 'Must define sgp-cmd-avatar-trigger');
  assert.ok(code.includes('aria-label="Mở thanh công cụ"'), 'Avatar button must declare aria-label="Mở thanh công cụ"');
  assert.ok(code.includes('minWidth: \'44px\''), 'Avatar button must declare minWidth 44px');
  assert.ok(code.includes('minHeight: \'44px\''), 'Avatar button must declare minHeight 44px');

  // Collapse button declared
  assert.ok(code.includes('aria-label="Thu gọn thanh công cụ"'), 'Collapse button must declare aria-label');
});

// ===========================================================================
// SUITE 2: ACTION DEDUPLICATION, LEGEND & FULLSCREEN REMOVAL (Section 7, 8, 9, 10, 26)
// ===========================================================================

test('V13.2 Actions: Legend and Fullscreen permanently removed from registry and overflow', () => {
  const actionIds = COMMAND_ACTIONS.map((a) => a.id);
  assert.equal(actionIds.includes('legend'), false, 'Legend action must NOT be in action registry');
  assert.equal(actionIds.includes('fullscreen'), false, 'Fullscreen action must NOT be in action registry');

  // Map overflow items
  const mapModel = deriveCommandBarModel({
    viewMode: 'map',
    isAdmin: true,
    activeFilterCount: 0,
  });
  const mapOverflowIds = mapModel.overflowItems.map((i) => i.id);

  assert.equal(mapOverflowIds.includes('legend'), false, 'Legend absent from Map overflow');
  assert.equal(mapOverflowIds.includes('fullscreen'), false, 'Fullscreen absent from Map overflow');
  assert.ok(mapOverflowIds.includes('refresh'), 'Refresh present in Map overflow');
  assert.ok(mapOverflowIds.includes('export-csv'), 'Export CSV present in Map overflow');
  assert.ok(mapOverflowIds.includes('calibration'), 'Admin calibration present in Map overflow');

  // Disjointness invariant
  assert.ok(isActionPartitionDisjoint(mapModel), 'Action partition must be strictly disjoint');
});

test('V13.2 Actions: Direct icons for Analytics, Legend, and Fullscreen strictly absent from toolbar', () => {
  const model = deriveCommandBarModel({
    viewMode: 'map',
    isAdmin: true,
    activeFilterCount: 0,
  });

  assert.equal(model.showAnalyticsButton, false);
  assert.equal(model.showLegendButton, false);
  assert.equal(model.showFullscreenButton, false);
});

// ===========================================================================
// SUITE 3: SHARED POPOVER ARCHITECTURE & MUTUAL EXCLUSIVITY (Section 1, 2, 3, 16, 17)
// ===========================================================================

test('V13.2 Popovers: CommandPopoverSurface component and CSS contract', () => {
  const popoverPath = path.resolve(__dirname, '../src/features/map-operations/command/CommandPopoverSurface.tsx');
  assert.ok(fs.existsSync(popoverPath), 'CommandPopoverSurface.tsx must exist');
  const code = fs.readFileSync(popoverPath, 'utf-8');

  assert.ok(code.includes('createPortal'), 'Must render via Portal');
  assert.ok(code.includes('zIndex: 60'), 'Must enforce z-index 60 per Section 24 contract');
  assert.ok(code.includes('handleKeyDown'), 'Must handle Escape key');
  assert.ok(code.includes('handleMouseDown'), 'Must handle outside click');

  // Check CSS
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');
  assert.ok(css.includes('.sgp-cmd-popover-portal'), 'CSS must define .sgp-cmd-popover-portal');
});

test('V13.2 Filter: Custom listbox implementation with zero native <select> elements', () => {
  const cmdBarPath = path.resolve(__dirname, '../src/features/map-operations/command/AdaptiveCommandBar.tsx');
  const code = fs.readFileSync(cmdBarPath, 'utf-8');

  assert.equal(code.includes('<select'), false, 'Must NOT use native <select> in command bar');
  assert.ok(code.includes('sgp-cmd-filter-chip'), 'Must render custom filter chips');
  assert.ok(code.includes('sgp-cmd-filter-list'), 'Must render custom filter option list');
  assert.ok(code.includes('Xóa lọc'), 'Must provide [Xóa lọc] reset button');
  assert.ok(code.includes('Áp dụng'), 'Must provide [Áp dụng] apply button');
});

test('V13.2 Search: Icon-only toolbar trigger without layout expansion width change', () => {
  const cmdBarPath = path.resolve(__dirname, '../src/features/map-operations/command/AdaptiveCommandBar.tsx');
  const code = fs.readFileSync(cmdBarPath, 'utf-8');

  // Toolbar search button is a standard tool button
  assert.ok(
    code.includes('onClick={() => toggleSurface(\'search\')}'),
    'Search trigger must toggle search popover surface'
  );
  assert.ok(
    code.includes('CommandPopoverSurface\n        isOpen={activeSurface === \'search\'}'),
    'Search surface must render via CommandPopoverSurface'
  );
});

// ===========================================================================
// SUITE 4: MINIMAL ANALYTICS & MINI DONUT (Section 12, 13, 14, 15)
// ===========================================================================

test('V13.2 Analytics: MiniDonut component renders lightweight SVG without external chart libraries', () => {
  const donutPath = path.resolve(__dirname, '../src/features/map-operations/analytics/MiniDonut.tsx');
  assert.ok(fs.existsSync(donutPath), 'MiniDonut.tsx component file must exist');
  const code = fs.readFileSync(donutPath, 'utf-8');

  assert.ok(code.includes('<svg'), 'MiniDonut must render SVG');
  assert.ok(code.includes('strokeDasharray'), 'Must use strokeDasharray for progress');
  assert.ok(code.includes('strokeDashoffset'), 'Must compute strokeDashoffset');
  assert.ok(code.includes('role="progressbar"'), 'Must define accessible progressbar role');
});

test('V13.2 Analytics: Layout integrates 2 MiniDonuts, inline metrics, and 6 presentation zones', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const code = fs.readFileSync(surfacePath, 'utf-8');

  assert.ok(code.includes('MiniDonut'), 'UnifiedContextSurface must import and render MiniDonut');
  assert.ok(code.includes('caption="OCR tự động"'), 'Must render OCR mini donut');
  assert.ok(code.includes('caption="Tiến độ chung"'), 'Must render overall progress mini donut');
  assert.ok(code.includes('sgp-analytics-inline-metrics'), 'Must render inline metrics row');
  assert.ok(code.includes('chỉnh sửa'), 'Inline metrics must mention user corrections');
  assert.ok(code.includes('xác nhận'), 'Inline metrics must mention confirmed count');
  assert.ok(code.includes('thủ công'), 'Inline metrics must mention manual count');
  assert.ok(code.includes('presentationAnalytics.zones.map'), 'Must render presentation zones');
});

test('V13.2 Analytics: Data logic verifies 6 presentation zones and zero-denominator rule', () => {
  const report = derivePresentationZoneAnalytics([]);
  assert.equal(report.zones.length, 6, 'Must derive exactly 6 presentation zones');
  assert.equal(report.completionPercent, null, 'Must be null for 0 meters (never 100% or fake green bar)');
  for (const z of report.zones) {
    assert.equal(z.completionPercent, null);
    assert.equal(z.statusLabel, 'Không có công tơ');
  }
});

// ===========================================================================
// SUITE 5: FULL-BLEED MAP & BOTTOM UTILITIES (Section 18, 19, 20, 21)
// ===========================================================================

test('V13.2 Map: Full-bleed container is position: absolute; inset: 0 in JSX and CSS', () => {
  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellCode = fs.readFileSync(shellPath, 'utf-8');

  assert.ok(
    shellCode.includes('style={{ position: \'absolute\', inset: 0, width: \'100%\', height: \'100%\', overflow: \'hidden\' }}'),
    'ImmersiveSceneShell workspace must be absolute inset 0'
  );

  const cssPath = path.resolve(__dirname, '../src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8').replace(/\r\n/g, '\n');
  assert.ok(
    css.includes('.sgp-map-first-workspace {\n  position: absolute !important;\n  inset: 0 !important;'),
    'CSS must enforce .sgp-map-first-workspace absolute inset 0'
  );
});

test('V13.2 / V13.3 Bottom Utilities: Viewport fullscreen removed, info [i] retained and hidden on rail open', () => {
  const hudPath = path.resolve(__dirname, '../src/features/map-operations/shell/SceneControlHUD.tsx');
  const hudCode = fs.readFileSync(hudPath, 'utf-8');

  assert.ok(hudCode.includes('OperationalMapLegend'), 'Must retain OperationalMapLegend ([i])');
  assert.equal(hudCode.includes('MapViewportControls'), false, 'MapViewportControls (fullscreen) must be absent');

  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellCode = fs.readFileSync(shellPath, 'utf-8');

  // V13.3: Hide completely when activeContextType !== null, safe edge at 18px
  assert.ok(
    shellCode.includes('!activeContextType') && shellCode.includes('SceneControlHUD'),
    'Bottom utility must be hidden when ContextRail is open'
  );
  assert.ok(
    shellCode.includes("bottom: '18px'"),
    'Bottom utility must have safe edge 18px'
  );
});

// ===========================================================================
// SUITE 6: MAP <-> LIST 10X LIFECYCLE STABILITY (Section 27)
// ===========================================================================

test('V13.2 Lifecycle: 10x Map <-> List switching preserves all invariants and absence of legacy utilities', () => {
  let mode: 'map' | 'list' = 'map';

  for (let cycle = 1; cycle <= 10; cycle++) {
    // 1. Switch to List
    mode = 'list';
    const listModel = deriveCommandBarModel({
      viewMode: mode,
      isCollapsed: false,
      viewportWidth: 1440,
      activeFilterCount: 0,
      isAdmin: true,
    });

    assert.ok(isActionPartitionDisjoint(listModel), `Cycle ${cycle} List partition must be disjoint`);
    assert.equal(listModel.overflowItems.some((i) => i.id === 'legend'), false);
    assert.equal(listModel.overflowItems.some((i) => i.id === 'fullscreen'), false);
    assert.equal(listModel.overflowItems.some((i) => i.id === 'calibration'), false);

    // 2. Switch to Map
    mode = 'map';
    const mapModel = deriveCommandBarModel({
      viewMode: mode,
      isCollapsed: false,
      viewportWidth: 1440,
      activeFilterCount: 0,
      isAdmin: true,
    });

    assert.ok(isActionPartitionDisjoint(mapModel), `Cycle ${cycle} Map partition must be disjoint`);
    assert.equal(mapModel.overflowItems.some((i) => i.id === 'legend'), false);
    assert.equal(mapModel.overflowItems.some((i) => i.id === 'fullscreen'), false);
    assert.ok(mapModel.overflowItems.some((i) => i.id === 'calibration'));
  }
});
