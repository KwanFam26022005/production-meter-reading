import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// -----------------------------------------------------------------------------
// 1 & 2: Shared Date & Round Subscription via OperationalWorkspaceContext
// -----------------------------------------------------------------------------
test('Requirement 1 & 2: Map V2 subscribes to shared selectedDate and selectedRoundId from OperationalWorkspaceContext', async () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const content = fs.readFileSync(workspacePath, 'utf-8');

  // Verify subscription to shared context
  assert.ok(
    content.includes('useOperationalWorkspace()'),
    'MapV2Workspace must consume useOperationalWorkspace()'
  );
  assert.ok(
    content.includes('selectedDate'),
    'MapV2Workspace must consume selectedDate from context'
  );
  assert.ok(
    content.includes('selectedRoundId'),
    'MapV2Workspace must consume selectedRoundId from context'
  );

  // Verify fetch triggers on date/round change
  assert.ok(
    content.includes('fetchOverviewData(selectedDate, selectedRoundId)'),
    'Must trigger fetchOverviewData with shared selectedDate and selectedRoundId'
  );
  assert.ok(
    content.includes('[selectedDate, selectedRoundId'),
    'useEffect dependency array must include selectedDate and selectedRoundId'
  );
});

// -----------------------------------------------------------------------------
// 3: Non-Blocking Error Degradation (Geometry preserved on API failure)
// -----------------------------------------------------------------------------
test('Requirement 3: Non-blocking error handling preserves canvas geometry in degraded mode', () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const content = fs.readFileSync(workspacePath, 'utf-8');

  // Check error state capture without geometry clearing
  assert.ok(
    content.includes('setOverviewError'),
    'Must store error message for user feedback'
  );
  assert.ok(
    content.includes('className="map-v2-degraded-banner"') || content.includes('role="alert"'),
    'Must render non-blocking degraded error banner'
  );
  assert.ok(
    content.includes('<MapV2Canvas'),
    'MapV2Canvas remains mounted even in degraded error mode'
  );
});

// -----------------------------------------------------------------------------
// 4: Stable Zone Business ID Mapping
// -----------------------------------------------------------------------------
test('Requirement 4: Stable ID mapping between presentation zones and SQLite business zones', async () => {
  const { CANONICAL_MAP_V2_ZONE_MAPPING } = await import(
    '../src/components/map-v2/zoneMapping.js'
  ).catch(async () => import('../src/components/map-v2/zoneMapping.ts'));

  assert.ok(CANONICAL_MAP_V2_ZONE_MAPPING, 'CANONICAL_MAP_V2_ZONE_MAPPING must be exported');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['ZONE_QUAY'], 'zone-berth');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['ZONE_CONTAINER'], 'zone-container');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['ZONE_GENERAL'], 'zone-warehouse');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['BLDG_KHO_1'], 'zone-warehouse');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['BLDG_KHO_2'], 'zone-warehouse');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['BLDG_KHO_4'], 'zone-warehouse');
  assert.equal(CANONICAL_MAP_V2_ZONE_MAPPING['ZONE_ADMIN'], 'zone-technical');
});

// -----------------------------------------------------------------------------
// 5, 6, 7, 8: Truthful Zone Status Model (NO_DATA, NOT_DUE, OVERDUE, REVIEW, NORMAL)
// -----------------------------------------------------------------------------
test('Requirement 5, 6, 7, 8: computeZoneOperationalStatus produces truthful statuses', async () => {
  const { computeZoneOperationalStatus } = await import(
    '../src/components/map-v2/zoneMapping.js'
  ).catch(async () => import('../src/components/map-v2/zoneMapping.ts'));

  // 5. NO_DATA when no zone or 0 meters — never false 0%
  const noData1 = computeZoneOperationalStatus(null, 'OPEN');
  assert.equal(noData1.status, 'NO_DATA');
  assert.equal(noData1.statusLabel, 'Chưa mở lượt');
  assert.equal(noData1.hasNoMeters, true);

  const noData2 = computeZoneOperationalStatus({ id: 'z1', code: 'Z1', name: 'Z1', total_meters: 0 } as any, 'OPEN');
  assert.equal(noData2.status, 'NO_DATA');

  // 6. NOT_DUE when round is UPCOMING — never overdue
  const notDue = computeZoneOperationalStatus(
    { id: 'z1', code: 'Z1', name: 'Z1', total_meters: 10, overdue_count: 5 } as any,
    'UPCOMING'
  );
  assert.equal(notDue.status, 'NOT_DUE');
  assert.equal(notDue.statusLabel, 'Lịch dự kiến');

  // 7. OVERDUE when round has overdue meters
  const overdue = computeZoneOperationalStatus(
    { id: 'z1', code: 'Z1', name: 'Z1', total_meters: 10, overdue_count: 2, review_count: 0 } as any,
    'CLOSED'
  );
  assert.equal(overdue.status, 'OVERDUE');
  assert.ok(overdue.statusLabel.includes('trễ hạn'), 'Status label must mention trễ hạn');

  // 8. REVIEW when round has review items
  const review = computeZoneOperationalStatus(
    { id: 'z1', code: 'Z1', name: 'Z1', total_meters: 10, overdue_count: 0, review_count: 3 } as any,
    'OPEN'
  );
  assert.equal(review.status, 'REVIEW');
  assert.ok(review.statusLabel.includes('kiểm tra'), 'Status label must mention kiểm tra');

  // NORMAL when all confirmed
  const normal = computeZoneOperationalStatus(
    { id: 'z1', code: 'Z1', name: 'Z1', total_meters: 10, confirmed_count: 10, overdue_count: 0, review_count: 0 } as any,
    'OPEN'
  );
  assert.equal(normal.status, 'NORMAL');
  assert.ok(normal.statusLabel.includes('Đã xác nhận'), 'Status label must mention Đã xác nhận');
});

// -----------------------------------------------------------------------------
// 9: Single-Round Progress Denominator (Truthful single-round labeling)
// -----------------------------------------------------------------------------
test('Requirement 9: formatZoneProgressText produces single-round progress description', async () => {
  const { formatZoneProgressText } = await import(
    '../src/components/map-v2/zoneMapping.js'
  ).catch(async () => import('../src/components/map-v2/zoneMapping.ts'));

  const emptyText = formatZoneProgressText({ status: 'NO_DATA', totalMeters: 0, confirmedCount: 0, hasNoMeters: true } as any);
  assert.equal(emptyText, 'Chưa mở lượt đọc');

  const progressText = formatZoneProgressText({ status: 'NORMAL', totalMeters: 12, confirmedCount: 8, hasNoMeters: false } as any);
  assert.equal(progressText, 'Đã ghi 8 / 12 công tơ trong lượt');
});

// -----------------------------------------------------------------------------
// 10, 11, 12: Stationary Zone Assignee Markers & Truthful Disclosures
// -----------------------------------------------------------------------------
test('Requirement 10, 11, 12: Real staff markers are stationary at anchors with explicit no-GPS disclosure', async () => {
  const { buildLiveZoneEmployees, MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT } = await import(
    '../src/components/map-v2/employeeDataAdapter.js'
  ).catch(async () => import('../src/components/map-v2/employeeDataAdapter.ts'));

  const mockZones = [
    {
      id: 'zone-berth',
      code: 'ZONE_BERTH',
      name: 'Cầu Cảng',
      assigned_user: {
        id: 'emp-101',
        employee_code: 'NV001',
        full_name: 'Nguyễn Văn A',
        avatar_url: null,
      },
      total_meters: 10,
      confirmed_count: 4,
    },
  ];

  const employees = buildLiveZoneEmployees(mockZones as any);
  assert.equal(employees.length, 1);
  const emp = employees[0];

  // 10. Stationary flag and duration
  assert.equal(emp.isStationary, true, 'Real assignee must have isStationary: true');
  assert.equal(emp.isDemo, false, 'Real assignee must have isDemo: false');

  // 11. Disclosure text explicitly disclaims GPS
  assert.ok(
    MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT.includes('không phải vị trí GPS'),
    'Disclosure text must state: không phải vị trí GPS'
  );
  assert.ok(
    MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT.includes('Vị trí cố định tại điểm neo'),
    'Disclosure text must state: Vị trí cố định tại điểm neo'
  );

  // 12. No personal completion percentage attribution
  const inspectionPanelPath = path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx');
  const panelContent = fs.readFileSync(inspectionPanelPath, 'utf-8');
  assert.ok(
    !panelContent.includes('hiệu suất nhân viên') && !panelContent.includes('hoàn thành công việc cá nhân'),
    'Inspector must not attribute zone completion to personal employee workload'
  );
});

// -----------------------------------------------------------------------------
// 13 & 14: Real Meter Spatial Validation & Missing Coordinate Protection
// -----------------------------------------------------------------------------
test('Requirement 13 & 14: isValidMeterCoordinate rejects invalid coordinates without placing at (0,0)', async () => {
  const { isValidMeterCoordinate } = await import(
    '../src/components/map-v2/MapV2MeterLayer.js'
  ).catch(async () => import('../src/components/map-v2/MapV2MeterLayer.ts'));

  // Invalid: missing coordinates
  assert.equal(isValidMeterCoordinate(null, null), false);
  assert.equal(isValidMeterCoordinate(undefined, undefined), false);

  // Invalid: (0, 0)
  assert.equal(isValidMeterCoordinate(0, 0), false);

  // Invalid: NaN or Infinity
  assert.equal(isValidMeterCoordinate(NaN, 500), false);
  assert.equal(isValidMeterCoordinate(500, Infinity), false);

  // Invalid: out-of-bounds (> 1536x1024)
  assert.equal(isValidMeterCoordinate(2000, 500), false);
  assert.equal(isValidMeterCoordinate(500, 1500), false);

  // Valid canonical port coordinates
  assert.equal(isValidMeterCoordinate(650, 280), true);
  assert.equal(isValidMeterCoordinate(0.45, 0.35), true); // normalized 0..1

  // 14. Missing coordinate toast notification in workspace
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');
  assert.ok(
    workspaceContent.includes('chưa xác định vị trí trên Map V2'),
    'Workspace must notify when focused meter lacks spatial coordinates'
  );
});

// -----------------------------------------------------------------------------
// 15: MEASUREMENT_UNIT_DATA_GAP Honored (No hardcoded kWh/m³ next to values)
// -----------------------------------------------------------------------------
test('Requirement 15: MEASUREMENT_UNIT_DATA_GAP — Raw tabular numbers without hardcoded kWh or m³', () => {
  const meterLayerPath = path.resolve(__dirname, '../src/components/map-v2/MapV2MeterLayer.tsx');
  const meterLayerContent = fs.readFileSync(meterLayerPath, 'utf-8');

  // Strip comments before checking for forbidden unit strings
  const codeWithoutComments = meterLayerContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert.ok(
    !codeWithoutComments.includes('kWh') && !codeWithoutComments.includes('m³') && !codeWithoutComments.includes('m3'),
    'MapV2MeterLayer must NOT hardcode kWh or m³ unit suffixes in code or JSX'
  );

  const panelPath = path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx');
  const panelContent = fs.readFileSync(panelPath, 'utf-8');
  assert.ok(
    panelContent.includes("fontVariantNumeric: 'tabular-nums lining-nums'"),
    'Inspector must render reading hero with tabular lining numbers'
  );
});

// -----------------------------------------------------------------------------
// 16: Separate Utility vs Meter Technology
// -----------------------------------------------------------------------------
test('Requirement 16: Utility type (ELECTRICITY/WATER) is distinct from meter tech (MECHANICAL/ELECTRONIC)', () => {
  const panelPath = path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx');
  const panelContent = fs.readFileSync(panelPath, 'utf-8');

  // Utility row and Tech row exist independently
  assert.ok(
    panelContent.includes('Loại năng lượng'),
    'Inspector must identify utility classification (Điện năng / Cấp nước)'
  );
  assert.ok(
    panelContent.includes('Công nghệ mặt số'),
    'Inspector must identify meter technology (Điện tử / Cơ khí)'
  );
});

// -----------------------------------------------------------------------------
// 17 & 18: Additive locateOnMap Contract & Legacy Dashboard Preservation
// -----------------------------------------------------------------------------
test('Requirement 17 & 18: locateOnMap defaults to dashboard; explicit locateOnMapV2 targets map_v2', () => {
  const contextPath = path.resolve(__dirname, '../src/context/OperationalWorkspaceContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf-8');

  // 17. Default target must remain 'dashboard' for 100% legacy Map V1 compatibility
  assert.ok(
    contextContent.includes("options?.target ?? 'dashboard'"),
    'locateOnMap must default to dashboard to protect legacy Map V1'
  );

  // 18. Explicit locateOnMapV2 targets map_v2
  assert.ok(
    contextContent.includes('locateOnMapV2'),
    'OperationalWorkspaceContext must export additive locateOnMapV2 method'
  );
  assert.ok(
    contextContent.includes("locateOnMap(entity, { target: 'map_v2' })"),
    'locateOnMapV2 must explicitly pass { target: map_v2 }'
  );
});

// -----------------------------------------------------------------------------
// 19: Frozen B2 Hash Baseline Invariant
// -----------------------------------------------------------------------------
test('Requirement 19: B2 freeze hash baseline remains unchanged', async () => {
  const EXPECTED_HASH = '7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a';

  const { LAYOUT_B2, LAYOUT_B2_COORDS, RECOMMENDED_LAYOUT_KEY } = await import(
    '../src/components/map-v2/utilityDemoLayout.js'
  ).catch(async () => import('../src/components/map-v2/utilityDemoLayout.ts'));

  assert.equal(RECOMMENDED_LAYOUT_KEY, 'B2', 'RECOMMENDED_LAYOUT_KEY must be B2');

  const b2Data = JSON.stringify({
    coords: LAYOUT_B2_COORDS,
    nodes: LAYOUT_B2.nodes.map((n: any) => ({ id: n.id, x: n.displayX, y: n.displayY, role: n.nodeRole, meter: n.meterCode })),
    edges: LAYOUT_B2.edges.map((e: any) => ({ id: e.id, src: e.sourceNodeId, tgt: e.targetNodeId, path: e.displayPath, tier: e.routeTier }))
  });
  const hash = crypto.createHash('sha256').update(b2Data).digest('hex');
  assert.equal(hash, EXPECTED_HASH, 'Calculated B2 layout hash must match canonical freeze hash');
});

// -----------------------------------------------------------------------------
// 20: Keyboard Accessibility & WCAG Standards
// -----------------------------------------------------------------------------
test('Requirement 20: Full keyboard accessibility & WCAG support in Map V2', () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  const panelPath = path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx');
  const panelContent = fs.readFileSync(panelPath, 'utf-8');

  const layersPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const layersContent = fs.readFileSync(layersPath, 'utf-8');

  // Escape key closes inspector and popovers
  assert.ok(panelContent.includes("e.key === 'Escape'"), 'Inspector must support Escape key');
  assert.ok(layersContent.includes("e.key === 'Escape'"), 'Layers popover must support Escape key');
  assert.ok(workspaceContent.includes("e.key === 'Escape'"), 'Workspace must support Escape key');

  // ARIA attributes and roles
  assert.ok(panelContent.includes('aria-label'), 'Inspector must provide aria-label');
  assert.ok(layersContent.includes('role="checkbox"'), 'Layers items must have role="checkbox"');
  assert.ok(layersContent.includes('aria-checked'), 'Layers items must have aria-checked');
});
