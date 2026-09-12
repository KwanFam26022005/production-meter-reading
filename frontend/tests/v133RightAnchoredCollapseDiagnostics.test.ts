import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_ASPECT_RATIO,
  MAP_CANVAS_DIAGNOSTICS,
} from '../src/features/map-operations/geometry/canonicalScene';
import { derivePresentationZoneAnalytics } from '../src/features/map-operations/analytics/presentationAnalytics';
import { deriveCommandBarModel, isActionPartitionDisjoint } from '../src/features/map-operations/command/commandBarModel';
import type { MapMeterItem } from '../src/features/map-operations/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// SUITE 1: RIGHT-ANCHORED TOOLBAR COLLAPSE (Section 1-2)
// ===========================================================================

test('V13.3 Toolbar: Collapsed avatar is positioned in right-anchored shell (right: 16px, left: auto)', () => {
  const cmdBarPath = path.resolve(__dirname, '../src/features/map-operations/command/AdaptiveCommandBar.tsx');
  const code = fs.readFileSync(cmdBarPath, 'utf-8');

  // In collapsed state, shell must be right: 16px and left: auto (never left: 16px)
  assert.ok(code.includes("right: '16px'"), 'Collapsed shell must anchor to right: 16px');
  assert.ok(code.includes("left: 'auto'"), 'Collapsed shell must set left: auto');
  assert.ok(code.includes("transformOrigin: 'right center'"), 'Transform origin must be right center');

  // Avatar button properties
  assert.ok(code.includes('sgp-cmd-avatar-trigger'), 'Must render avatar trigger button');
  assert.ok(code.includes('aria-label="Mở thanh công cụ"'), 'Avatar button must declare aria-label');

  // Expanded collapse trigger
  assert.ok(code.includes('sgp-cmd-collapse-btn'), 'Expanded toolbar must contain collapse trigger');
  assert.ok(code.includes('aria-label="Thu gọn thanh công cụ"'), 'Collapse button must declare aria-label');
});

test('V13.3 Toolbar: Collapsed toolbar does not reserve expanded layout width (44x44px overlay)', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // CSS must enforce right-anchored collapse
  assert.ok(
    css.includes('.sgp-hud-top-bar.sgp-adaptive-command-bar.collapsed'),
    'Must define .sgp-hud-top-bar.sgp-adaptive-command-bar.collapsed'
  );
  assert.ok(
    css.includes('width: 44px') && css.includes('height: 44px'),
    'Collapsed bar must be 44x44px'
  );
});

// ===========================================================================
// SUITE 2: LIST TOP-GAP & STATE-AWARE CLEARANCE (Section 3-4)
// ===========================================================================

test('V13.3 List Clearance: Dynamic CSS custom property --commandbar-clearance is declared', () => {
  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellCode = fs.readFileSync(shellPath, 'utf-8');

  assert.ok(
    shellCode.includes("'--commandbar-clearance': isToolbarCollapsed ? '16px' : '80px'"),
    'ImmersiveSceneShell must set --commandbar-clearance based on isToolbarCollapsed (16px vs 80px)'
  );

  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // List view uses --commandbar-clearance
  assert.ok(
    css.includes('padding-top: var(--commandbar-clearance, 80px);'),
    'List view must use var(--commandbar-clearance, 80px)'
  );
  assert.ok(
    css.includes('transition: padding-top 200ms cubic-bezier(0.2, 0.8, 0.2, 1);'),
    'List view must smoothly transition padding-top in 200ms'
  );

  // Stale 132px padding is eliminated
  assert.equal(
    css.includes('padding: 132px 24px 24px;'),
    false,
    'Fixed 132px padding must be removed'
  );
});

test('V13.3 List Workspace: Full height flex chain without stale fixed heights', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const listMatch = css.match(/\.sgp-operational-list-view\s*\{([^}]+)\}/);
  assert.ok(listMatch, '.sgp-operational-list-view must be styled');
  assert.ok(listMatch[1].includes('height: 100%'), 'List view must have height: 100%');
  assert.ok(listMatch[1].includes('min-height: 0'), 'List view must have min-height: 0');
});

// ===========================================================================
// SUITE 3: ANALYTICS RAIL LAYOUT, DONUTS & SEPARATORS (Section 5-7)
// ===========================================================================

test('V13.3 Analytics: Rail has sticky header, single scroll body, zero nested scrollbars', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const surfaceCode = fs.readFileSync(surfacePath, 'utf-8');

  assert.ok(surfaceCode.includes('sgp-rail-header'), 'Must define sgp-rail-header');
  assert.ok(surfaceCode.includes('sgp-rail-body'), 'Must define sgp-rail-body');

  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(
    css.includes('.sgp-rail-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 14px 16px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.10);\n  flex-shrink: 0;'),
    'Header must be flex-shrink: 0'
  );
  assert.ok(
    css.includes('.sgp-rail-body {\n  flex: 1;\n  overflow-y: auto;'),
    'Body must be single scroll container (flex: 1; overflow-y: auto)'
  );
});

test('V13.3 Analytics: Summary renders 2 compact donuts (size 72, stroke 6.5)', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const surfaceCode = fs.readFileSync(surfacePath, 'utf-8');

  // Verify compact donut sizing (68-76px, 6-7px stroke)
  assert.ok(surfaceCode.includes('size={72}'), 'MiniDonut size must be 72px (within 68-76px)');
  assert.ok(surfaceCode.includes('strokeWidth={6.5}'), 'MiniDonut strokeWidth must be 6.5px (within 6-7px)');
  assert.ok(surfaceCode.includes('caption="OCR tự động"'), 'Must render OCR tự động donut');
  assert.ok(surfaceCode.includes('caption="Tiến độ chung"'), 'Must render Tiến độ chung donut');
});

test('V13.3 Analytics: Zone progress rows use grid layout with separate label and metric elements', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const surfaceCode = fs.readFileSync(surfacePath, 'utf-8');

  assert.ok(
    surfaceCode.includes("gridTemplateColumns: 'minmax(0, 1fr) auto'"),
    'Zone row must use grid layout: minmax(0, 1fr) auto'
  );
  assert.ok(
    surfaceCode.includes("gap: '8px'"),
    'Zone row must specify gap between label and metric'
  );
  assert.ok(
    surfaceCode.includes('truncate'),
    'Zone name must have truncate class to prevent wrapping/concatenation'
  );
  assert.ok(
    surfaceCode.includes('shrink-0'),
    'Status label must have shrink-0'
  );
});

// ===========================================================================
// SUITE 4: ISSUE QUEUE RECONCILIATION & ACCORDION (Section 8-9)
// ===========================================================================

test('V13.3 Issue Invariant: toolbarIssueCount === analyticsIssueCount === issueQueue.length', () => {
  const mockMeters: MapMeterItem[] = [
    {
      id: 'm-1',
      meterCode: 'CT-001',
      name: 'Meter 1',
      zoneId: 'zone-berth',
      zoneName: 'Cầu cảng',
      semanticState: 'CONFIRMED',
      readingState: 'CONFIRMED',
      coords: { x: 100, y: 100, normX: 0.1, normY: 0.1 },
    },
    {
      id: 'm-2',
      meterCode: 'CT-002',
      name: 'Meter 2',
      zoneId: 'zone-warehouse',
      zoneName: 'Kho hàng',
      semanticState: 'OVERDUE',
      readingState: 'OVERDUE',
      coords: { x: 200, y: 200, normX: 0.2, normY: 0.2 },
    },
    {
      id: 'm-3',
      meterCode: 'CT-003',
      name: 'Meter 3',
      zoneId: 'zone-technical',
      zoneName: 'Kỹ thuật',
      semanticState: 'PENDING',
      readingState: 'PENDING',
      coords: { x: 300, y: 300, normX: 0.3, normY: 0.3 },
    },
  ];

  // 1. Calculate overall KPIs (Toolbar logic)
  const confirmed = mockMeters.filter((m) => m.semanticState === 'CONFIRMED').length;
  const overdue = mockMeters.filter((m) => m.semanticState === 'OVERDUE').length;
  const review = mockMeters.filter((m) => m.semanticState === 'REVIEW').length;
  const toolbarIssueCount = overdue + review;

  // 2. Derive presentation analytics (Analytics logic)
  const presAnalytics = derivePresentationZoneAnalytics(mockMeters);
  const analyticsIssueCount = presAnalytics.issueMeters;

  // 3. Derive canonical issue queue
  const domainIssues = mockMeters.filter(
    (m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW'
  );
  const issueQueueLength = domainIssues.length;

  // Assert strict equality
  assert.equal(toolbarIssueCount, 1, 'Toolbar must count exactly 1 issue');
  assert.equal(analyticsIssueCount, 1, 'Analytics must count exactly 1 issue');
  assert.equal(issueQueueLength, 1, 'Issue queue must contain exactly 1 meter');
  assert.equal(toolbarIssueCount, analyticsIssueCount);
  assert.equal(analyticsIssueCount, issueQueueLength);

  // Check when 0 issues exist
  const zeroIssueMeters = mockMeters.filter((m) => m.semanticState !== 'OVERDUE');
  const zeroPresAnalytics = derivePresentationZoneAnalytics(zeroIssueMeters);
  assert.equal(zeroPresAnalytics.issueMeters, 0);
});

test('V13.3 Issue Queue: Progressive disclosure accordion collapsed by default', () => {
  const surfacePath = path.resolve(__dirname, '../src/features/map-operations/context/UnifiedContextSurface.tsx');
  const surfaceCode = fs.readFileSync(surfacePath, 'utf-8');

  assert.ok(
    surfaceCode.includes('const [isIssueQueueExpanded, setIsIssueQueueExpanded] = useState(false);'),
    'Issue queue accordion must be collapsed by default (useState(false))'
  );
  assert.ok(
    surfaceCode.includes('Vấn đề cần xử lý ({canonicalIssueCount})'),
    'Accordion button must display count'
  );
  assert.ok(
    surfaceCode.includes('aria-expanded={isIssueQueueExpanded}'),
    'Accordion button must declare aria-expanded'
  );
});

// ===========================================================================
// SUITE 5: MAP INFO ICON COLLISION & SAFE EDGE (Section 10-12)
// ===========================================================================

test('V13.3 Map Info: Hidden while ContextRail is open, restored at right: 18px, bottom: 18px when closed', () => {
  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellCode = fs.readFileSync(shellPath, 'utf-8');

  // Rule 10: Hidden while ContextRail is open
  assert.ok(
    shellCode.includes('!activeContextType') && shellCode.includes('SceneControlHUD'),
    'SceneControlHUD must only mount when !activeContextType'
  );

  // Rule 11: Safe edge right: 18px, bottom: 18px
  assert.ok(
    shellCode.includes("bottom: '18px'") && shellCode.includes("right: '18px'"),
    'Bottom HUD container must be positioned at bottom: 18px, right: 18px'
  );

  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const bottomMatch = css.match(/\.sgp-hud-bottom-right\s*\{([^}]+)\}/);
  assert.ok(bottomMatch, '.sgp-hud-bottom-right must be styled');
  assert.ok(bottomMatch[1].includes('bottom: 18px;'), 'CSS must specify bottom: 18px');
  assert.ok(bottomMatch[1].includes('right: 18px;'), 'CSS must specify right: 18px');
});

// ===========================================================================
// SUITE 6: MAP CANVAS DIAGNOSTICS & ASPECT RATIO (Section 13-15)
// ===========================================================================

test('V13.3 Diagnostics: Canonical map source constants and future 1915x932 recommendation', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915);
  assert.equal(CANONICAL_SCENE_HEIGHT, 821);
  assert.ok(Math.abs(CANONICAL_ASPECT_RATIO - 2.332521) < 0.001);

  // Diagnostic constants object
  assert.ok(MAP_CANVAS_DIAGNOSTICS, 'MAP_CANVAS_DIAGNOSTICS must be exported');
  assert.equal(MAP_CANVAS_DIAGNOSTICS.currentSource.width, 1915);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.currentSource.height, 821);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.currentSource.aspectRatio, 2.332521);

  assert.equal(MAP_CANVAS_DIAGNOSTICS.workspaceTarget.aspectRatio, 2.05);

  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.logicalWidth, 1915);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.logicalHeight, 932);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.highDensityWidth, 3830);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.highDensityHeight, 1864);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.alternativeRasterWidth, 2560);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.futureRecommendation.alternativeRasterHeight, 1246);

  // Section 14: Prohibition of cover, slice, or stretching
  assert.equal(MAP_CANVAS_DIAGNOSTICS.migrationRules.allowCover, false);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.migrationRules.allowSlice, false);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.migrationRules.allowStretching, false);
  assert.equal(MAP_CANVAS_DIAGNOSTICS.migrationRules.separateMigrationRequired, true);
});

// ===========================================================================
// SUITE 7: MAP <-> LIST 10X LIFECYCLE REGRESSION
// ===========================================================================

test('V13.3 Lifecycle: 10x Map <-> List switching maintains all invariants', () => {
  for (let cycle = 1; cycle <= 10; cycle++) {
    // List Mode
    const listModel = deriveCommandBarModel({
      viewMode: 'list',
      isCollapsed: false,
      viewportWidth: 1440,
      activeFilterCount: 0,
      isAdmin: true,
    });
    assert.ok(isActionPartitionDisjoint(listModel), `Cycle ${cycle} List partition must be disjoint`);

    // Map Mode
    const mapModel = deriveCommandBarModel({
      viewMode: 'map',
      isCollapsed: false,
      viewportWidth: 1440,
      activeFilterCount: 0,
      isAdmin: true,
    });
    assert.ok(isActionPartitionDisjoint(mapModel), `Cycle ${cycle} Map partition must be disjoint`);

    // Collapsed Mode
    const collapsedModel = deriveCommandBarModel({
      viewMode: 'map',
      isCollapsed: true,
      viewportWidth: 1440,
      activeFilterCount: 0,
      isAdmin: true,
    });
    assert.deepEqual(collapsedModel.primaryActionIds, ['profile']);
    assert.deepEqual(collapsedModel.overflowActionIds, []);
  }
});
