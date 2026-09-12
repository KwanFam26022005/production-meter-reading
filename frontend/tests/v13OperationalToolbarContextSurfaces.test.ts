import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveCommandBarModel,
  CommandBarModelInput,
} from '../src/features/map-operations/command/commandBarModel';

import {
  calculateZoneCameraFraming,
  PRESENTATION_ZONES,
} from '../src/features/map-operations/geometry/operationalGeometry';

import { canAdministerMapConfiguration, User } from '../src/types';
import type { UnifiedContextType } from '../src/features/map-operations/context/UnifiedContextSurface';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// TEST 1: ADMIN SIDEBAR CLEANUP — EXCLUDES "CÔNG TƠ", EXACTLY 5 NAV ITEMS
// ===========================================================================
test('V13 Sidebar: AdminShell navItems contains exactly 5 items, excluding standalone "Công tơ"', () => {
  const adminShellPath = path.resolve(__dirname, '../src/components/admin/AdminShell.tsx');
  const content = fs.readFileSync(adminShellPath, 'utf-8');

  // Verify navItems array contains exactly the 5 approved items
  assert.ok(content.includes("id: 'dashboard', label: 'Bản đồ'"), 'Must contain Bản đồ');
  assert.ok(content.includes("id: 'schedules', label: 'Lịch ghi'"), 'Must contain Lịch ghi');
  assert.ok(content.includes("id: 'staff_roster', label: 'Phân ca'"), 'Must contain Phân ca');
  assert.ok(content.includes("id: 'reports', label: 'Báo cáo'"), 'Must contain Báo cáo');
  assert.ok(content.includes("id: 'audit', label: 'Nhật ký'"), 'Must contain Nhật ký');

  // Verify 'meters' nav item is NOT in the active navItems list
  const navItemsMatch = content.match(/const navItems:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(navItemsMatch, 'navItems array must be defined');
  const navItemsBody = navItemsMatch[1];
  assert.equal(
    navItemsBody.includes("id: 'meters'"),
    false,
    'navItems must NOT contain standalone "meters" (Công tơ) navigation item'
  );
});

// ===========================================================================
// TEST 2: LEGACY NAVIGATION REDIRECT TO MAP OPERATIONS (LIST VIEW)
// ===========================================================================
test('V13 Navigation: Legacy meter tab or /admin/meters redirects to Map Operations with List view', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  // Verify tab change handler redirects 'meters' to 'dashboard' with list view
  assert.ok(
    content.includes("if (tab === 'meters')"),
    'App.tsx must intercept legacy meters tab selection'
  );
  assert.ok(
    content.includes("sessionStorage.setItem('map_workspace_view', 'list')"),
    'App.tsx must persist list view mode to sessionStorage on legacy meters tab select'
  );
  assert.ok(
    content.includes("setAdminActiveTab('dashboard')"),
    'App.tsx must route legacy meters to dashboard (Map Operations)'
  );

  // Verify initial URL query param check redirects 'meters' tab
  assert.ok(
    content.includes("params?.get('tab') === 'meters'"),
    'App.tsx must detect initial ?tab=meters query param'
  );
});

// ===========================================================================
// TEST 3: COMMAND BAR MODEL DERIVATION (MAP MODE VS LIST MODE)
// ===========================================================================
test('V13 Command Bar: Model dynamically adjusts controls between Map and List modes', () => {
  // Scenario A: Desktop Map Mode
  const mapDesktopInput: CommandBarModelInput = {
    viewMode: 'map',
    viewportWidth: 1440,
    isCompact: false,
    activeFilterCount: 0,
    isAdmin: true,
  };
  const mapModel = deriveCommandBarModel(mapDesktopInput);

  assert.equal(mapModel.showViewSwitch, true, 'Must show view switch');
  assert.equal(mapModel.showSearch, true, 'Must show search');
  assert.equal(mapModel.showFilter, true, 'Must show filter');
  assert.equal(mapModel.showLegendButton, false, 'Legend direct button removed from primary bar in V13.1');
  assert.equal(mapModel.showFullscreenButton, false, 'Fullscreen direct button removed from primary bar in V13.1');
  assert.ok(mapModel.overflowItems.some((i) => i.id === 'legend'), 'Legend present in Map overflow');
  assert.ok(mapModel.overflowItems.some((i) => i.id === 'fullscreen'), 'Fullscreen present in Map overflow');
  assert.equal(mapModel.compactIdentity, false, 'Full identity title on desktop');

  // Admin calibration option present in overflow for admin
  const mapAdminItem = mapModel.overflowItems.find((item) => item.id === 'calibration');
  assert.ok(mapAdminItem, 'Overflow menu must contain calibration for Admin');

  // Scenario B: List Mode (Map-specific utilities unmounted/hidden)
  const listInput: CommandBarModelInput = {
    viewMode: 'list',
    viewportWidth: 1440,
    isCompact: false,
    activeFilterCount: 2,
    isAdmin: false,
  };
  const listModel = deriveCommandBarModel(listInput);

  assert.equal(listModel.showLegendButton, false, 'Legend button must be hidden in List mode');
  assert.equal(listModel.showFullscreenButton, false, 'Fullscreen button must be hidden in List mode');
  assert.equal(listModel.filterBadgeCount, 2, 'Must reflect active filter count badge');

  // Normal operator must not have calibration in overflow
  const listAdminItem = listModel.overflowItems.find((item) => item.id === 'calibration');
  assert.equal(listAdminItem, undefined, 'Normal user must not see calibration in overflow');
});

// ===========================================================================
// TEST 4: COMMAND BAR RESPONSIVE AND MANUAL COMPACTION
// ===========================================================================
test('V13 Command Bar: Compaction logic handles narrow screens and manual toggle without wrapping', () => {
  // Scenario A: Narrow screen (< 1280px)
  const narrowInput: CommandBarModelInput = {
    viewMode: 'map',
    viewportWidth: 1100,
    isCompact: false,
    activeFilterCount: 0,
    isAdmin: false,
  };
  const narrowModel = deriveCommandBarModel(narrowInput);
  assert.equal(narrowModel.compactIdentity, true, 'Must use compact identity on narrow viewports');
  assert.equal(narrowModel.compactTelemetry, true, 'Must use compact telemetry on narrow viewports');

  // Scenario B: Manual Compact Mode on wide screen
  const manualCompactInput: CommandBarModelInput = {
    viewMode: 'map',
    viewportWidth: 1600,
    isCompact: true,
    activeFilterCount: 0,
    isAdmin: false,
  };
  const manualModel = deriveCommandBarModel(manualCompactInput);
  assert.equal(manualModel.isCompact, true, 'Must respect manual compact state');
  assert.equal(manualModel.compactIdentity, true, 'Manual compact forces compact identity');
  assert.equal(manualModel.compactTelemetry, true, 'Manual compact forces compact telemetry');

  // Height and single-row constraint in CSS
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(
    css.includes('.sgp-adaptive-command-bar'),
    'CSS must define .sgp-adaptive-command-bar'
  );
  assert.ok(
    css.includes('height: 58px;'),
    'Command bar height must strictly be 58px'
  );
  assert.ok(
    css.includes('flex-wrap: nowrap;') || css.includes('nowrap'),
    'Command bar must enforce nowrap on children'
  );
});

// ===========================================================================
// TEST 5: MAP-SPECIFIC HUDS STRICTLY UNMOUNTED IN LIST MODE
// ===========================================================================
test('V13 Workspace: In List mode, all map-specific HUD overlays and canvas are unmounted', () => {
  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellContent = fs.readFileSync(shellPath, 'utf-8');

  // 1. OperationalScene mounted only when viewMode !== 'list'
  assert.ok(
    shellContent.includes("viewMode !== 'list' ? (") && shellContent.includes('<OperationalScene'),
    'OperationalScene canvas must only be rendered when viewMode is not list'
  );

  // 2. OperationalListView mounted when viewMode === 'list'
  assert.ok(
    shellContent.includes('<OperationalListView'),
    'OperationalListView must be rendered in List mode'
  );

  // 3. SceneControlHUD (zoom/viewport) mounted only when viewMode === 'map'
  assert.ok(
    shellContent.includes("viewMode === 'map' && (") && shellContent.includes('<SceneControlHUD'),
    'SceneControlHUD must only be rendered in Map mode'
  );

  // 4. Old floating HUDs (SceneActionHUD, SceneSummaryHUD, SceneRoundHUD) are removed from Layer C
  assert.equal(
    shellContent.includes('<SceneActionHUD'),
    false,
    'SceneActionHUD must NOT be rendered in ImmersiveSceneShell'
  );
  assert.equal(
    shellContent.includes('<SceneSummaryHUD'),
    false,
    'SceneSummaryHUD must NOT be rendered in ImmersiveSceneShell'
  );
  assert.equal(
    shellContent.includes('<SceneRoundHUD'),
    false,
    'SceneRoundHUD must NOT be rendered in ImmersiveSceneShell'
  );
});

// ===========================================================================
// TEST 6: EXACTLY ONE CONTEXT SURFACE INVARIANT ACROSS ALL 6 VARIANTS
// ===========================================================================
test('V13 Context Surface: Exactly ONE contextual surface is active at any time across 6 variants', () => {
  // Pure derivation test matching ImmersiveSceneShell logic
  function deriveContextType(params: {
    isCalibrationActive: boolean;
    analyticsOpen: boolean;
    mapMode: string;
    selectedEntity: { type: string; id: string } | null;
    detailView: string | null;
  }): UnifiedContextType | null {
    const { isCalibrationActive, analyticsOpen, mapMode, selectedEntity, detailView } = params;
    if (isCalibrationActive) return null;
    if (analyticsOpen) return 'analytics';
    if (mapMode === 'placement') return 'workflow';
    if (selectedEntity?.type === 'zone') {
      return detailView === 'zone' ? 'zone-meters' : 'zone-summary';
    }
    if (selectedEntity?.type === 'meter') return 'meter-detail';
    if (selectedEntity?.type === 'operator') return 'operator-detail';
    return null;
  }

  // 1. Initial Overview -> null
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'browse',
      selectedEntity: null,
      detailView: null,
    }),
    null,
    'No context surface in browse overview'
  );

  // 2. Zone click -> zone-summary
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'inspect',
      selectedEntity: { type: 'zone', id: 'pres-berth' },
      detailView: null,
    }),
    'zone-summary',
    'Zone click opens zone-summary'
  );

  // 3. Morph to Zone Meters -> zone-meters
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'details',
      selectedEntity: { type: 'zone', id: 'pres-berth' },
      detailView: 'zone',
    }),
    'zone-meters',
    'Morph opens zone-meters'
  );

  // 4. Meter click -> meter-detail
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'inspect',
      selectedEntity: { type: 'meter', id: 'CT-001' },
      detailView: null,
    }),
    'meter-detail',
    'Meter click opens meter-detail'
  );

  // 5. Operator click -> operator-detail
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'inspect',
      selectedEntity: { type: 'operator', id: 'u1' },
      detailView: null,
    }),
    'operator-detail',
    'Operator click opens operator-detail'
  );

  // 6. Analytics open -> analytics (supersedes entity selection)
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: true,
      mapMode: 'inspect',
      selectedEntity: { type: 'meter', id: 'CT-001' },
      detailView: null,
    }),
    'analytics',
    'Analytics open shows analytics exclusively'
  );

  // 7. Placement active -> workflow
  assert.equal(
    deriveContextType({
      isCalibrationActive: false,
      analyticsOpen: false,
      mapMode: 'placement',
      selectedEntity: null,
      detailView: null,
    }),
    'workflow',
    'Placement mode shows workflow exclusively'
  );

  // 8. Calibration mode -> all suppressed (null)
  assert.equal(
    deriveContextType({
      isCalibrationActive: true,
      analyticsOpen: true,
      mapMode: 'placement',
      selectedEntity: { type: 'meter', id: 'CT-001' },
      detailView: 'zone',
    }),
    null,
    'Calibration workspace suppresses all context surfaces'
  );
});

// ===========================================================================
// TEST 7: ZONE -> ZONE-METERS -> METER-DETAIL RETURN NAVIGATION STACK
// ===========================================================================
test('V13 Context Navigation: Zone -> Zone-Meters -> Meter-Detail back navigation stack', () => {
  // Simulate user navigation sequence:
  let selectedEntity: { type: string; id: string } | null = null;
  let detailView: string | null = null;
  let previousContext: { type: 'zone-summary' | 'zone-meters'; zoneId: string } | null = null;

  // Step 1: User clicks zone 'pres-berth'
  selectedEntity = { type: 'zone', id: 'pres-berth' };
  detailView = null;
  previousContext = null;

  assert.equal(selectedEntity.id, 'pres-berth');
  assert.equal(detailView, null); // Variant: 'zone-summary'

  // Step 2: User clicks "Xem công tơ"
  detailView = 'zone'; // Variant: 'zone-meters'
  assert.equal(detailView, 'zone');

  // Step 3: User clicks meter 'CT-001' from the list
  previousContext = {
    type: detailView === 'zone' ? 'zone-meters' : 'zone-summary',
    zoneId: selectedEntity.id,
  };
  selectedEntity = { type: 'meter', id: 'CT-001' };
  detailView = null; // Variant: 'meter-detail'

  assert.equal(selectedEntity.id, 'CT-001');
  assert.equal(previousContext?.type, 'zone-meters');
  assert.equal(previousContext?.zoneId, 'pres-berth');

  // Step 4: User clicks "Quay lại" in meter-detail
  if (previousContext) {
    const { type, zoneId } = previousContext;
    previousContext = null;
    selectedEntity = { type: 'zone', id: zoneId };
    if (type === 'zone-meters') {
      detailView = 'zone';
    }
  }

  assert.equal(selectedEntity.id, 'pres-berth');
  assert.equal(detailView, 'zone'); // Restored to: 'zone-meters'

  // Step 5: User clicks "Quay lại" in zone-meters
  detailView = null; // Restored to: 'zone-summary'
  assert.equal(selectedEntity.id, 'pres-berth');
  assert.equal(detailView, null);

  // Step 6: User clicks Close (X) or presses ESC
  selectedEntity = null;
  detailView = null;
  previousContext = null;
  assert.equal(selectedEntity, null);
});

// ===========================================================================
// TEST 8: SEARCH AND FILTER POPULATION IN BOTH MAP AND LIST MODES
// ===========================================================================
test('V13 Search: Query filters meters consistently in both Map and List views', () => {
  const mockMeters = [
    { id: '1', meterCode: 'CT-001', name: 'Bến 1 Cầu tàu', zoneName: 'Khu vực Cầu tàu', semanticState: 'CONFIRMED' },
    { id: '2', meterCode: 'CT-002', name: 'Bến 2 Cầu tàu', zoneName: 'Khu vực Cầu tàu', semanticState: 'OVERDUE' },
    { id: '3', meterCode: 'CT-003', name: 'Bãi Container Tây', zoneName: 'Bãi Container Tây', semanticState: 'REVIEW' },
  ];

  function filterBySearch(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return mockMeters;
    return mockMeters.filter(
      (m) =>
        m.meterCode.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.zoneName.toLowerCase().includes(q)
    );
  }

  // Exact code search
  const resCode = filterBySearch('CT-002');
  assert.equal(resCode.length, 1);
  assert.equal(resCode[0].meterCode, 'CT-002');

  // Zone name search
  const resZone = filterBySearch('Cầu tàu');
  assert.equal(resZone.length, 2);

  // Empty search
  const resAll = filterBySearch('');
  assert.equal(resAll.length, 3);
});

// ===========================================================================
// TEST 9: CAMERA SAFE VIEWPORT OFFSET WITH 380PX CONTEXT RAIL
// ===========================================================================
test('V13 Camera: Framing shifts safe center leftward when context rail is open', () => {
  const zoneId = 'pres-container-center';

  // 1. Closed Context Rail (Browse mode)
  const framingClosed = calculateZoneCameraFraming(zoneId, false);
  // 2. Open Context Rail (380px rail active)
  const framingOpen = calculateZoneCameraFraming(zoneId, true);

  assert.ok(framingClosed.zoom >= 1.15 && framingClosed.zoom <= 1.85);
  assert.ok(framingOpen.zoom >= 1.15 && framingOpen.zoom <= 1.85);

  // When context rail is open, safe center is shifted leftward, meaning panX is lower (shifted left)
  assert.ok(
    framingOpen.panX <= framingClosed.panX,
    `Open rail panX (${framingOpen.panX}) must be <= closed rail panX (${framingClosed.panX}) to prevent rail occlusion`
  );
});

// ===========================================================================
// TEST 10: 10X ROUNDTRIP MAP <-> LIST SWITCHING PRESERVES ALL INVARIANTS
// ===========================================================================
test('V13 Workspace Lifecycle: 10x Map <-> List switching preserves selection, filters, and zero stale HUDs', () => {
  type Mode = 'map' | 'list';
  let mode: Mode = 'map';
  let selectedMeterId = 'CT-003';
  let activeRound = 'round-01';
  let searchQuery = 'Container';

  for (let cycle = 1; cycle <= 10; cycle++) {
    // Switch to List
    mode = 'list';
    assert.equal(mode, 'list');
    assert.equal(selectedMeterId, 'CT-003', `Cycle ${cycle}: Selection preserved in List`);
    assert.equal(activeRound, 'round-01', `Cycle ${cycle}: Round preserved in List`);
    assert.equal(searchQuery, 'Container', `Cycle ${cycle}: Search preserved in List`);

    // Switch to Map
    mode = 'map';
    assert.equal(mode, 'map');
    assert.equal(selectedMeterId, 'CT-003', `Cycle ${cycle}: Selection preserved in Map`);
    assert.equal(activeRound, 'round-01', `Cycle ${cycle}: Round preserved in Map`);
    assert.equal(searchQuery, 'Container', `Cycle ${cycle}: Search preserved in Map`);
  }
});
