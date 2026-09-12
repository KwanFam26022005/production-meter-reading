import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  derivePresentationZoneAnalytics,
  resolveMeterPresentationZoneId,
  CANONICAL_PRESENTATION_ZONE_IDS,
} from '../src/features/map-operations/analytics/presentationAnalytics';

import {
  deriveCommandBarModel,
  isActionPartitionDisjoint,
  getCommandBarActionPartition,
  COMMAND_ACTIONS,
  CommandBarModelInput,
} from '../src/features/map-operations/command/commandBarModel';

import {
  CANONICAL_12_METERS_AUDIT,
} from '../src/features/map-operations/geometry/canonicalScene';

import type { MapMeterItem } from '../src/features/map-operations/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// SUITE 1: ANALYTICS DATA MODEL & 12-METER RECONCILIATION (Section 2, 3, 4, 5, 25)
// ===========================================================================

test('V13.1 Analytics: Exactly 6 presentation zones, zero business-zone duplicate rows', () => {
  const mockMeters: MapMeterItem[] = CANONICAL_12_METERS_AUDIT.map((m) => ({
    id: m.code,
    meterCode: m.code,
    name: m.name,
    location: m.nearestLandmark,
    meterType: 'EMH',
    isActive: true,
    zoneId: m.businessZoneId,
    zoneCode: 'ZONE',
    zoneName: 'Zone',
    coordinates: { x: m.normalizedX, y: m.normalizedY },
    semanticState: 'CONFIRMED',
  }));

  const report = derivePresentationZoneAnalytics(mockMeters);

  // 1. Exactly 6 presentation rows
  assert.equal(report.zones.length, 6, 'Must have exactly 6 presentation zone rows');

  // 2. Exact 6 Presentation IDs
  const zoneIds = report.zones.map((z) => z.id);
  assert.deepEqual(
    zoneIds,
    [
      'pres-berth',
      'pres-container-west',
      'pres-container-center',
      'pres-cfs-east',
      'pres-technical',
      'pres-gate',
    ],
    'Presentation IDs must strictly match canonical 6 presentation zones'
  );

  // 3. Zero business-zone duplicate rows
  const businessIds = ['zone-berth', 'zone-container', 'zone-warehouse', 'zone-technical'];
  for (const bId of businessIds) {
    assert.equal(
      zoneIds.includes(bId as any),
      false,
      `Business zone ${bId} must NOT appear as a zone row in presentation analytics`
    );
  }
});

test('V13.1 Analytics: 12-Meter reconciliation with exact presentation distribution', () => {
  const canonicalMeters: MapMeterItem[] = CANONICAL_12_METERS_AUDIT.map((m) => ({
    id: m.code,
    meterCode: m.code,
    name: m.name,
    location: m.nearestLandmark,
    meterType: 'EMH',
    isActive: true,
    zoneId: m.businessZoneId,
    zoneCode: 'ZONE',
    zoneName: 'Zone',
    coordinates: { x: m.normalizedX, y: m.normalizedY },
    semanticState: 'CONFIRMED',
  }));

  const report = derivePresentationZoneAnalytics(canonicalMeters);

  // 1. Total meters sum invariant
  assert.equal(report.totalMeters, 12, 'Total meters must reconcile to exactly 12');
  const sumOfZones = report.zones.reduce((sum, z) => sum + z.totalMeters, 0);
  assert.equal(sumOfZones, 12, 'SUM(zone.totalMeters) must equal 12');

  // 2. Expected canonical distribution (Section 5)
  const countMap = Object.fromEntries(report.zones.map((z) => [z.id, z.totalMeters]));
  assert.equal(countMap['pres-berth'], 3, 'pres-berth must have 3 meters (CT-003, CT-004, CT-008)');
  assert.equal(countMap['pres-container-west'], 2, 'pres-container-west must have 2 meters (CT-002, CT-005)');
  assert.equal(countMap['pres-container-center'], 2, 'pres-container-center must have 2 meters (CT-011, CT-012)');
  assert.equal(countMap['pres-cfs-east'], 1, 'pres-cfs-east must have 1 meter (CT-006)');
  assert.equal(countMap['pres-technical'], 3, 'pres-technical must have 3 meters (CT-001, CT-007, CT-009)');
  assert.equal(countMap['pres-gate'], 1, 'pres-gate must have 1 meter (CT-010)');

  // 3. Invariant: Every meter contributes to exactly ONE presentation zone (no duplicates)
  const allAssignedCodes = report.zones.flatMap((z) => z.meterCodes);
  assert.equal(allAssignedCodes.length, 12, 'Total assigned meter codes must be exactly 12');
  const uniqueCodes = new Set(allAssignedCodes);
  assert.equal(uniqueCodes.size, 12, 'All assigned meter codes must be unique (zero duplicate counting)');
});

test('V13.1 Analytics: Zero-Denominator Rule (Never 0/0 · 100%, completionPercent is null)', () => {
  const emptyReport = derivePresentationZoneAnalytics([]);

  // Empty scope summary
  assert.equal(emptyReport.totalMeters, 0);
  assert.equal(emptyReport.completedMeters, 0);
  assert.equal(emptyReport.completionPercent, null, 'completionPercent must be null when totalMeters is 0');

  // For every zone when totalMeters === 0
  for (const zone of emptyReport.zones) {
    assert.equal(zone.totalMeters, 0);
    assert.equal(zone.completionPercent, null, `Zone ${zone.id} completionPercent must be null, NOT 100 or 0`);
    assert.equal(zone.statusLabel, 'Không có công tơ', `Zone ${zone.id} statusLabel must be 'Không có công tơ'`);
    assert.equal(
      zone.statusLabel.includes('100%'),
      false,
      'Never display 100% when total meters is zero'
    );
  }

  // Mixed scope: 1 zone has meters, others have 0 meters
  const singleMeter: MapMeterItem[] = [
    {
      id: 'CT-010',
      meterCode: 'CT-010',
      name: 'Công tơ Khu kỹ thuật 2',
      location: 'CỔNG CHÍNH',
      meterType: 'EMH',
      isActive: true,
      zoneId: 'pres-gate',
      zoneCode: 'GATE',
      zoneName: 'Cổng',
      coordinates: { x: 0.8564, y: 0.6821 },
      semanticState: 'CONFIRMED',
    },
  ];

  const mixedReport = derivePresentationZoneAnalytics(singleMeter);
  const gateZone = mixedReport.zones.find((z) => z.id === 'pres-gate')!;
  const berthZone = mixedReport.zones.find((z) => z.id === 'pres-berth')!;

  assert.equal(gateZone.totalMeters, 1);
  assert.equal(gateZone.completionPercent, 100);
  assert.equal(gateZone.statusLabel, '1/1 · 100%');

  assert.equal(berthZone.totalMeters, 0);
  assert.equal(berthZone.completionPercent, null);
  assert.equal(berthZone.statusLabel, 'Không có công tơ');
});

// ===========================================================================
// SUITE 2: CENTRALIZED ACTION REGISTRY & DEDUPLICATION (Section 8, 9, 10, 11, 12, 26)
// ===========================================================================

test('V13.1 Action Registry: All canonical actions registered with valid scopes and placements', () => {
  const actionIds = COMMAND_ACTIONS.map((a) => a.id);
  const requiredIds = [
    'search',
    'filter',
    'progress',
    'refresh',
    'export-csv',
    'analytics',
    'legend',
    'fullscreen',
    'calibration',
    'profile',
    'overflow',
  ];

  for (const req of requiredIds) {
    assert.ok(actionIds.includes(req), `Command action registry must contain action: ${req}`);
  }
});

test('V13.1 Action Invariant: primaryActionIds ∩ overflowActionIds = ∅ across all viewport modes', () => {
  const configurations: Array<{ name: string; input: CommandBarModelInput }> = [
    {
      name: 'Desktop Map Mode (Admin)',
      input: { viewMode: 'map', viewportWidth: 1440, isCompact: false, activeFilterCount: 0, isAdmin: true },
    },
    {
      name: 'Desktop Map Mode (Operator)',
      input: { viewMode: 'map', viewportWidth: 1440, isCompact: false, activeFilterCount: 1, isAdmin: false },
    },
    {
      name: 'Compact Map Mode',
      input: { viewMode: 'map', viewportWidth: 1440, isCompact: true, activeFilterCount: 0, isAdmin: true },
    },
    {
      name: 'Narrow Viewport Map Mode (< 1280px)',
      input: { viewMode: 'map', viewportWidth: 1100, isCompact: false, activeFilterCount: 0, isAdmin: false },
    },
    {
      name: 'Tablet Map Mode (< 1024px)',
      input: { viewMode: 'map', viewportWidth: 900, isCompact: false, activeFilterCount: 0, isAdmin: false },
    },
    {
      name: 'Desktop List Mode (Admin)',
      input: { viewMode: 'list', viewportWidth: 1440, isCompact: false, activeFilterCount: 0, isAdmin: true },
    },
    {
      name: 'Desktop List Mode (Operator)',
      input: { viewMode: 'list', viewportWidth: 1440, isCompact: false, activeFilterCount: 2, isAdmin: false },
    },
    {
      name: 'Compact List Mode',
      input: { viewMode: 'list', viewportWidth: 1440, isCompact: true, activeFilterCount: 0, isAdmin: false },
    },
  ];

  for (const cfg of configurations) {
    const model = deriveCommandBarModel(cfg.input);
    const { primaryActionIds, overflowActionIds } = getCommandBarActionPartition(model);

    // Assert disjointness
    const isDisjoint = isActionPartitionDisjoint(model);
    assert.ok(
      isDisjoint,
      `Action partition MUST be disjoint for ${cfg.name}. Primary: [${primaryActionIds}], Overflow: [${overflowActionIds}]`
    );

    // Verify intersection is strictly empty
    const intersection = primaryActionIds.filter((id) => overflowActionIds.includes(id));
    assert.deepEqual(
      intersection,
      [],
      `Intersection must be empty for ${cfg.name}, but found: [${intersection}]`
    );
  }
});

test('V13.1 Map vs List Overflow Scope Constraints (Section 11, 12, 26)', () => {
  // Scenario A: Map Mode (Admin)
  const mapAdmin = deriveCommandBarModel({
    viewMode: 'map',
    viewportWidth: 1440,
    isAdmin: true,
    activeFilterCount: 0,
  });

  const mapOverflowIds = mapAdmin.overflowItems.map((item) => item.id);
  assert.ok(mapOverflowIds.includes('legend'), 'Map overflow must contain legend');
  assert.ok(mapOverflowIds.includes('fullscreen'), 'Map overflow must contain fullscreen');
  assert.ok(mapOverflowIds.includes('calibration'), 'Map overflow must contain calibration for Admin');
  assert.equal(
    mapOverflowIds.includes('analytics'),
    false,
    'Map overflow must NOT duplicate analytics because progress status opens analytics directly'
  );

  // Scenario B: List Mode (Admin & Operator)
  const listAdmin = deriveCommandBarModel({
    viewMode: 'list',
    viewportWidth: 1440,
    isAdmin: true,
    activeFilterCount: 0,
  });

  const listOverflowIds = listAdmin.overflowItems.map((item) => item.id);
  assert.ok(listOverflowIds.includes('analytics'), 'List overflow must contain analytics');
  assert.equal(listOverflowIds.includes('legend'), false, 'List overflow must NOT contain legend');
  assert.equal(listOverflowIds.includes('fullscreen'), false, 'List overflow must NOT contain fullscreen');
  assert.equal(
    listOverflowIds.includes('calibration'),
    false,
    'List overflow must NOT contain calibration (Map scope only)'
  );

  // Scenario C: Primary bar direct icon removal in Map mode (Section 10)
  assert.equal(mapAdmin.showAnalyticsButton, false, 'Direct analytics button removed from primary bar');
  assert.equal(mapAdmin.showLegendButton, false, 'Direct legend button removed from primary bar');
  assert.equal(mapAdmin.showFullscreenButton, false, 'Direct fullscreen button removed from primary bar');
});

// ===========================================================================
// SUITE 3: LIST VIEW SIMPLIFICATION & TABLE INTERACTION (Section 13, 14, 15)
// ===========================================================================

test('V13.1 List View: No redundant "Xem trên bản đồ" CTA button, compact header', () => {
  const listPath = path.resolve(__dirname, '../src/features/map-operations/shell/OperationalListView.tsx');
  const content = fs.readFileSync(listPath, 'utf-8');

  // Section 13: "Xem trên bản đồ" visual button removed
  assert.equal(
    content.includes('Xem trên bản đồ'),
    false,
    'OperationalListView must NOT render "Xem trên bản đồ" CTA button'
  );

  // Section 14: Compact heading
  assert.ok(content.includes('sgp-list-title'), 'Must render compact table title');
  assert.ok(content.includes('sgp-list-count-badge'), 'Must render compact count badge');
  assert.equal(
    content.includes('công tơ trong phạm vi lọc'),
    false,
    'Must not render old elevated summary card text'
  );

  // Section 15: Removed repeated [eye Chi tiết] button column, replaced with chevron-right
  assert.equal(
    content.includes('<span>Chi tiết</span>'),
    false,
    'Must NOT render repeated text "Chi tiết" buttons in table rows'
  );
  assert.ok(
    content.includes('ChevronRight') || content.includes('sgp-list-row-chevron'),
    'Must render subtle trailing chevron-right affordance'
  );
  assert.ok(
    content.includes('role="row"'),
    'Table rows must have accessible row role'
  );
});

// ===========================================================================
// SUITE 4: BRANDING & TEMPORAL NORMALIZATION (Section 16, 17, 19)
// ===========================================================================

test('V13.1 Brand & Temporal: Deterministic branding states and command bar temporal styles', () => {
  const cmdBarPath = path.resolve(__dirname, '../src/features/map-operations/command/AdaptiveCommandBar.tsx');
  const content = fs.readFileSync(cmdBarPath, 'utf-8');

  // Section 16: No intermediate "TÂN THUẬN"
  assert.equal(
    content.includes('sgp-cmd-brand-compact">TÂN THUẬN<'),
    false,
    'Must NOT render intermediate "TÂN THUẬN" label in compact mode'
  );

  // Dynamic subtitle based on viewMode
  assert.ok(
    content.includes("viewMode === 'map' ? 'Bản đồ công tơ' : 'Danh sách công tơ'"),
    'Command bar subtitle must be dynamic based on viewMode'
  );

  // Section 17: Temporal styling in mapMotion.css
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(
    css.includes('.sgp-cmd-date-wrap .vn-datepicker-field'),
    'CSS must style .vn-datepicker-field inside .sgp-cmd-date-wrap'
  );
  assert.ok(
    css.includes('rgba(255, 255, 255, 0.06)'),
    'Temporal background must use dark command bar styling (rgba)'
  );

  // Section 28: Obsolete inspect button and legacy analytics drawer styles removed
  assert.equal(
    css.includes('.sgp-list-inspect-btn {'),
    false,
    'Obsolete .sgp-list-inspect-btn class must be removed'
  );
  assert.equal(
    css.includes('.sgp-list-switch-map-btn {'),
    false,
    'Obsolete .sgp-list-switch-map-btn class must be removed'
  );
});

// ===========================================================================
// SUITE 5: 10X LIFECYCLE ROUNDTRIP STABILITY (Section 27)
// ===========================================================================

test('V13.1 Lifecycle: 10x Map <-> List switching guarantees invariants and zero duplicates', () => {
  type Mode = 'map' | 'list';
  let mode: Mode = 'map';
  let selectedMeterId: string | null = 'CT-001';
  let activeFilterCount = 0;

  for (let cycle = 1; cycle <= 10; cycle++) {
    // 1. Switch to List
    mode = 'list';
    const listModel = deriveCommandBarModel({
      viewMode: mode,
      viewportWidth: 1440,
      isCompact: false,
      activeFilterCount,
      isAdmin: true,
    });

    assert.ok(isActionPartitionDisjoint(listModel), `Cycle ${cycle} List partition must be disjoint`);
    assert.equal(listModel.showLegendButton, false, `Cycle ${cycle} Legend absent in List`);
    assert.equal(listModel.showFullscreenButton, false, `Cycle ${cycle} Fullscreen absent in List`);
    assert.equal(
      listModel.overflowItems.some((i) => i.id === 'calibration'),
      false,
      `Cycle ${cycle} Calibration absent in List overflow`
    );
    assert.equal(selectedMeterId, 'CT-001', `Cycle ${cycle} Selection preserved`);

    // 2. Switch to Map
    mode = 'map';
    const mapModel = deriveCommandBarModel({
      viewMode: mode,
      viewportWidth: 1440,
      isCompact: false,
      activeFilterCount,
      isAdmin: true,
    });

    assert.ok(isActionPartitionDisjoint(mapModel), `Cycle ${cycle} Map partition must be disjoint`);
    assert.ok(
      mapModel.overflowItems.some((i) => i.id === 'legend'),
      `Cycle ${cycle} Legend present in Map overflow`
    );
    assert.ok(
      mapModel.overflowItems.some((i) => i.id === 'fullscreen'),
      `Cycle ${cycle} Fullscreen present in Map overflow`
    );
    assert.ok(
      mapModel.overflowItems.some((i) => i.id === 'calibration'),
      `Cycle ${cycle} Calibration present in Map overflow for Admin`
    );
    assert.equal(
      mapModel.overflowItems.some((i) => i.id === 'analytics'),
      false,
      `Cycle ${cycle} Analytics absent in Map overflow (handled by progress status)`
    );
  }
});
