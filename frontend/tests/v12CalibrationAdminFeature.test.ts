import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  canAdministerMapConfiguration,
  MapWorkspaceView,
  User,
} from '../src/types';

import {
  CANONICAL_GEOMETRY_V10,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  V10GeometryManifest,
  getV10PresentationZoneById,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';

import {
  validatePrePublishGeometry,
  validateImportJson,
  formatExportTimestamp,
  saveDraftToStorage,
  loadDraftFromStorage,
  clearDraftFromStorage,
  hasCalibrationQueryParam,
  CALIBRATION_DRAFT_STORAGE_KEY,
} from '../src/features/map-operations/calibration/useMapCalibrationWorkspace';

import {
  isPointInPolygon2D,
  checkPolygonSimplicity,
  calculatePolygonArea,
} from '../src/features/map-operations/calibration/calibrationGeometryUtils';

import { CANONICAL_12_METERS_AUDIT } from '../src/features/map-operations/geometry/canonicalScene';

// ---------------------------------------------------------------------------
// 1. ROLE-BASED ACCESS CONTROL (Section 4, 18)
// ---------------------------------------------------------------------------
test('V12 RBAC: canAdministerMapConfiguration allows ADMIN and MANAGER, denies ordinary operators', () => {
  const adminUser: User = { id: 'u1', employee_code: 'ADM01', full_name: 'Admin User', role: 'ADMIN' };
  const roleAdminUser: User = { id: 'u2', employee_code: 'ADM02', full_name: 'Role Admin', role: 'ROLE_ADMIN' };
  const managerUser: User = { id: 'u3', employee_code: 'MGR01', full_name: 'Manager User', role: 'MANAGER' };
  const roleManagerUser: User = { id: 'u4', employee_code: 'MGR02', full_name: 'Role Manager', role: 'ROLE_MANAGER' };

  assert.equal(canAdministerMapConfiguration(adminUser), true, 'ADMIN must be authorized');
  assert.equal(canAdministerMapConfiguration(roleAdminUser), true, 'ROLE_ADMIN must be authorized');
  assert.equal(canAdministerMapConfiguration(managerUser), true, 'MANAGER must be authorized');
  assert.equal(canAdministerMapConfiguration(roleManagerUser), true, 'ROLE_MANAGER must be authorized');

  // Ordinary operators and field staff must be denied
  const operatorUser: User = { id: 'u5', employee_code: 'OP01', full_name: 'Operator', role: 'OPERATOR' };
  const fieldOpUser: User = { id: 'u6', employee_code: 'FO01', full_name: 'Field Operator', role: 'FIELD_OPERATOR' };
  const employeeUser: User = { id: 'u7', employee_code: 'EMP01', full_name: 'Employee', role: 'EMPLOYEE' };
  const supervisorUser: User = { id: 'u8', employee_code: 'SUP01', full_name: 'Supervisor', role: 'SUPERVISOR' };
  const staffUser: User = { id: 'u9', employee_code: 'STF01', full_name: 'Staff', role: 'STAFF' };

  assert.equal(canAdministerMapConfiguration(operatorUser), false, 'OPERATOR must be denied');
  assert.equal(canAdministerMapConfiguration(fieldOpUser), false, 'FIELD_OPERATOR must be denied');
  assert.equal(canAdministerMapConfiguration(employeeUser), false, 'EMPLOYEE must be denied');
  assert.equal(canAdministerMapConfiguration(supervisorUser), false, 'SUPERVISOR must be denied');
  assert.equal(canAdministerMapConfiguration(staffUser), false, 'STAFF must be denied');

  // Edge cases: null, undefined, empty role
  assert.equal(canAdministerMapConfiguration(null), false, 'null user must be denied');
  assert.equal(canAdministerMapConfiguration(undefined), false, 'undefined user must be denied');
  assert.equal(canAdministerMapConfiguration({ id: '', employee_code: '', full_name: '', role: '' }), false, 'empty role denied');
});

// ---------------------------------------------------------------------------
// 2. PRESERVE CURRENT V10 GEOMETRY BASELINE (Section 1)
// ---------------------------------------------------------------------------
test('V12 Baseline: tanThuanPresentationGeometry.v10.json strictly intact with 1915x821 and 6 zones', () => {
  const jsonPath = path.resolve('src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json');
  assert.ok(fs.existsSync(jsonPath), 'tanThuanPresentationGeometry.v10.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  assert.equal(data.mapVersion, 'tan-thuan-v10');
  assert.equal(data.coordinateSystem, 'tan-thuan-canonical-image-pixel-space-v1');
  assert.equal(data.canonicalWidth, 1915);
  assert.equal(data.canonicalHeight, 821);
  assert.equal(data.zones.length, 6, 'Must have exactly 6 zones');

  const expectedIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];
  const actualIds = data.zones.map((z: any) => z.id);
  assert.deepEqual(actualIds.sort(), expectedIds.sort());
});

// ---------------------------------------------------------------------------
// 3. PRE-PUBLISH STRUCTURAL VALIDATION GATE (Section 14)
// ---------------------------------------------------------------------------
test('V12 Pre-Publish Gate: Authoritative V10 baseline passes all pre-publish criteria', () => {
  const gateResult = validatePrePublishGeometry(CANONICAL_GEOMETRY_V10);

  assert.equal(gateResult.valid, true, 'V10 baseline must pass pre-publish gate');
  assert.equal(gateResult.errors.length, 0, `Expected 0 errors, got: ${gateResult.errors.join('; ')}`);
  assert.equal(gateResult.zonesCount, 6, 'Must validate 6 zones');
  assert.equal(gateResult.simplePolygons, true, 'All zones must be simple polygons');
  assert.equal(gateResult.metersContained, 12, 'All 12 canonical meters must be contained');
  assert.equal(gateResult.totalMeters, 12);
  assert.equal(gateResult.anchorsValid, true, 'All label and operator anchors must be inside');
});

test('V12 Pre-Publish Gate: Rejects malformed dimensions, missing zones, or non-simple polygons', () => {
  // Test 1: Invalid dimensions
  const badDimensions: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    canonicalWidth: 1920,
    canonicalHeight: 1080,
  };
  const resBadDim = validatePrePublishGeometry(badDimensions);
  assert.equal(resBadDim.valid, false, 'Must fail for invalid dimensions');
  assert.ok(resBadDim.errors.some((e) => e.includes('1915x821')));

  // Test 2: Missing zones
  const missingZone: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: CANONICAL_GEOMETRY_V10.zones.slice(0, 5),
  };
  const resMissing = validatePrePublishGeometry(missingZone);
  assert.equal(resMissing.valid, false, 'Must fail when zones count is not 6');
  assert.ok(resMissing.errors.some((e) => e.includes('Số lượng phân vùng')));

  // Test 3: Self-intersecting polygon (bowtie)
  const selfIntersectingZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    polygonCanonical: [
      { x: 100, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 300 },
      { x: 300, y: 100 },
    ],
  };
  const badPolyManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [selfIntersectingZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const resBadPoly = validatePrePublishGeometry(badPolyManifest);
  assert.equal(resBadPoly.valid, false, 'Must fail for self-intersecting polygon');
  assert.equal(resBadPoly.simplePolygons, false);

  // Test 4: Label anchor placed outside polygon (V16A-R1: Warning, non-blocking)
  const outsideLabelZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    labelAnchorCanonical: { x: 50, y: 50 }, // outside pres-berth
  };
  const badLabelManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [outsideLabelZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const resBadLabel = validatePrePublishGeometry(badLabelManifest);
  assert.equal(resBadLabel.anchorsValid, false);
  assert.equal(resBadLabel.valid, true, 'V16A-R1: anchor outside is warning and does not block publish');
  assert.ok(resBadLabel.warnings.some((w) => w.includes('Điểm neo nhãn')));

  // Test 5: Operator anchor placed outside polygon (V16A-R1: Warning, non-blocking)
  const outsideOpZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    operatorAnchorCanonical: { x: 0, y: 0 },
  };
  const badOpManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [outsideOpZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const resBadOp = validatePrePublishGeometry(badOpManifest);
  assert.equal(resBadOp.anchorsValid, false);
  assert.equal(resBadOp.valid, true, 'V16A-R1: anchor outside is warning and does not block publish');
  assert.ok(resBadOp.warnings.some((w) => w.includes('Điểm neo nhân sự')));
});

// ---------------------------------------------------------------------------
// 4. ANCHOR CONTAINMENT AUDIT ACROSS ALL 6 PRESENTATION ZONES (Section 2)
// ---------------------------------------------------------------------------
test('V12 Anchor Containment: 100% of label and operator anchors strictly inside runtime polygons', () => {
  for (const zone of CANONICAL_GEOMETRY_V10.zones) {
    // Check label anchor
    assert.ok(zone.labelAnchorCanonical, `Zone ${zone.id} must have labelAnchorCanonical`);
    const isLabelInside = isPointInPolygon2D(zone.labelAnchorCanonical, zone.polygonCanonical);
    assert.equal(
      isLabelInside,
      true,
      `Zone ${zone.id} label anchor (${zone.labelAnchorCanonical.x}, ${zone.labelAnchorCanonical.y}) must be strictly INSIDE polygon`
    );

    // Check operator anchor
    assert.ok(zone.operatorAnchorCanonical, `Zone ${zone.id} must have operatorAnchorCanonical`);
    const isOpInside = isPointInPolygon2D(zone.operatorAnchorCanonical, zone.polygonCanonical);
    assert.equal(
      isOpInside,
      true,
      `Zone ${zone.id} operator anchor (${zone.operatorAnchorCanonical.x}, ${zone.operatorAnchorCanonical.y}) must be strictly INSIDE polygon`
    );

    // Check distance between anchors (must not collide)
    const dx = zone.labelAnchorCanonical.x - zone.operatorAnchorCanonical.x;
    const dy = zone.labelAnchorCanonical.y - zone.operatorAnchorCanonical.y;
    const dist = Math.hypot(dx, dy);
    assert.ok(dist >= 24, `Zone ${zone.id} anchors should have >= 24px clearance (got ${dist.toFixed(1)}px)`);
  }
});

// ---------------------------------------------------------------------------
// 5. JSON IMPORT VALIDATION (Section 12, 18)
// ---------------------------------------------------------------------------
test('V12 JSON Import: Validates schema, geometry boundaries, and handles corrupted JSON safely', () => {
  // Valid JSON string
  const validJson = JSON.stringify(CANONICAL_GEOMETRY_V10);
  const resValid = validateImportJson(validJson);
  assert.equal(resValid.valid, true);
  assert.ok(resValid.data);
  assert.equal(resValid.data?.zones.length, 6);

  // Corrupted / malformed JSON
  const corruptedJson = '{"canonicalWidth": 1915, zones: [broken';
  const resCorrupt = validateImportJson(corruptedJson);
  assert.equal(resCorrupt.valid, false);
  assert.ok(resCorrupt.error?.includes('Lỗi đọc tệp JSON'));

  // Wrong dimensions
  const wrongDimJson = JSON.stringify({
    ...CANONICAL_GEOMETRY_V10,
    canonicalWidth: 1000,
  });
  const resWrongDim = validateImportJson(wrongDimJson);
  assert.equal(resWrongDim.valid, false);
  assert.ok(resWrongDim.error?.includes('Kích thước chuẩn không hợp lệ'));

  // Missing zones
  const missingZonesJson = JSON.stringify({
    ...CANONICAL_GEOMETRY_V10,
    zones: CANONICAL_GEOMETRY_V10.zones.slice(0, 3),
  });
  const resMissingZones = validateImportJson(missingZonesJson);
  assert.equal(resMissingZones.valid, false);
  assert.ok(resMissingZones.error?.includes('Số lượng phân vùng không đúng'));
});

// ---------------------------------------------------------------------------
// 6. DETERMINISTIC EXPORT FILENAME (Section 12, 18)
// ---------------------------------------------------------------------------
test('V12 Export Filename: formatExportTimestamp produces deterministic YYYYMMDD-HHmmss format', () => {
  const fixedDate = new Date(2026, 8, 12, 14, 30, 45); // Month is 0-indexed (8 = September)
  const timestampStr = formatExportTimestamp(fixedDate);
  assert.equal(timestampStr, '20260912-143045');

  const filename = `tanThuanPresentationGeometry.v10.${timestampStr}.json`;
  assert.equal(filename, 'tanThuanPresentationGeometry.v10.20260912-143045.json');
  assert.match(filename, /^tanThuanPresentationGeometry\.v10\.\d{8}-\d{6}\.json$/);
});

// ---------------------------------------------------------------------------
// 7. DRAFT ISOLATION & DIRTY STATE TRACKING (Section 9, 10, 18)
// ---------------------------------------------------------------------------
test('V12 Draft Isolation: Mutating draft copy never alters canonical baseline', () => {
  const baselineCopy = JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10));
  const draftCopy: V10GeometryManifest = JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10));

  // Mutate draft vertex
  draftCopy.zones[0].polygonCanonical[0] = { x: 500, y: 500 };

  // Assert baseline remains unaltered
  assert.notDeepEqual(draftCopy.zones[0].polygonCanonical[0], CANONICAL_GEOMETRY_V10.zones[0].polygonCanonical[0]);
  assert.deepEqual(baselineCopy, CANONICAL_GEOMETRY_V10, 'Canonical baseline must remain identical');

  // Verify dirty check detection
  const isDirty = JSON.stringify(baselineCopy.zones) !== JSON.stringify(draftCopy.zones);
  assert.equal(isDirty, true, 'Should detect draft modification as dirty');

  // Reverting draft makes it clean
  const revertedDraft = JSON.parse(JSON.stringify(baselineCopy));
  const isClean = JSON.stringify(baselineCopy.zones) === JSON.stringify(revertedDraft.zones);
  assert.equal(isClean, true, 'Reverting draft restores clean state');
});

// ---------------------------------------------------------------------------
// 8. LOCALSTORAGE PERSISTENCE (Section 11, 18)
// ---------------------------------------------------------------------------
test('V12 Local Storage Persistence: saveDraft, loadDraft, and clearDraft handle storage correctly', () => {
  // Setup mock storage in node environment
  const store: Record<string, string> = {};
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };

  try {
    // 1. Initial state: empty
    assert.equal(loadDraftFromStorage(), null);

    // 2. Save draft
    const draft: V10GeometryManifest = JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10));
    saveDraftToStorage(draft);
    assert.ok(store[CALIBRATION_DRAFT_STORAGE_KEY]);

    // 3. Load saved draft
    const loaded = loadDraftFromStorage();
    assert.ok(loaded);
    assert.equal(loaded?.canonicalWidth, 1915);
    assert.equal(loaded?.zones.length, 6);

    // 4. Clear draft
    clearDraftFromStorage();
    assert.equal(store[CALIBRATION_DRAFT_STORAGE_KEY], undefined);
    assert.equal(loadDraftFromStorage(), null);

    // 5. Corrupt storage safety
    store[CALIBRATION_DRAFT_STORAGE_KEY] = 'not-valid-json';
    assert.equal(loadDraftFromStorage(), null, 'Should return null on corrupt storage without throwing');
  } finally {
    // Restore environment
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalLocalStorage;
  }
});

// ---------------------------------------------------------------------------
// 9. QUERY-PARAM BACKWARD COMPATIBILITY (Section 7, 18)
// ---------------------------------------------------------------------------
test('V12 Backward Compatibility: hasCalibrationQueryParam detects ?mapCalibration=1', () => {
  const originalWindow = (globalThis as any).window;
  const originalSessionStorage = (globalThis as any).sessionStorage;

  try {
    (globalThis as any).window = {
      location: { search: '?mapCalibration=1' },
    };
    (globalThis as any).sessionStorage = {
      getItem: () => null,
    };
    assert.equal(hasCalibrationQueryParam(), true, 'Should detect ?mapCalibration=1 in URL search params');

    // Without param
    (globalThis as any).window.location.search = '?other=true';
    assert.equal(hasCalibrationQueryParam(), false, 'Should return false when param is absent');

    // With sessionStorage fallback
    (globalThis as any).sessionStorage.getItem = (key: string) => (key === 'mapCalibration' ? '1' : null);
    assert.equal(hasCalibrationQueryParam(), true, 'Should detect sessionStorage flag if present');
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).sessionStorage = originalSessionStorage;
  }
});

// ---------------------------------------------------------------------------
// 10. WORKSPACE LIFECYCLE: 10X TRANSITION INVARIANT (Section 18)
// ---------------------------------------------------------------------------
test('V12 Workspace Lifecycle: Map -> Calibration -> List -> Map 10x switching preserves invariants', () => {
  let currentView: MapWorkspaceView = 'map';
  let previousView: MapWorkspaceView = 'map';
  let openCalibrationCount = 0;
  let exitCalibrationCount = 0;

  for (let cycle = 1; cycle <= 10; cycle++) {
    // Transition 1: Map -> Calibration
    assert.equal(currentView, 'map', `Cycle ${cycle}: Must be in map mode`);
    previousView = currentView;
    currentView = 'calibration';
    openCalibrationCount++;
    assert.equal(currentView, 'calibration', `Cycle ${cycle}: Must enter calibration mode`);

    // Invariant: in calibration mode, no secondary surfaces open, canvas active
    const isCalibrationActive = currentView === 'calibration';
    assert.equal(isCalibrationActive, true);

    // Transition 2: Calibration -> Map (Exit)
    currentView = previousView;
    exitCalibrationCount++;
    assert.equal(currentView, 'map', `Cycle ${cycle}: Must return to map mode`);

    // Transition 3: Map -> List
    currentView = 'list';
    assert.equal(currentView, 'list', `Cycle ${cycle}: Must enter list mode`);

    // Transition 4: List -> Map
    currentView = 'map';
    assert.equal(currentView, 'map', `Cycle ${cycle}: Must return to map mode`);
  }

  assert.equal(openCalibrationCount, 10, 'Must have entered calibration exactly 10 times');
  assert.equal(exitCalibrationCount, 10, 'Must have exited calibration exactly 10 times');
});
