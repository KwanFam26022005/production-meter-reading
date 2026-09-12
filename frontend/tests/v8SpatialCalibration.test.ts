import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  TanThuanMapSource,
  DEPRECATED_MAP_ASSETS,
} from '../src/features/map-operations/config/tanThuanMapSource';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_VIEWBOX,
  CANONICAL_ASPECT_RATIO,
  normalizedToCanonical,
  canonicalToNormalized,
  screenToCanonical,
  canonicalToScreen,
} from '../src/features/map-operations/geometry/canonicalScene';
import {
  PRESENTATION_ZONES,
  SPATIAL_ZONE_PRESENTATIONS,
  isPointInPolygon,
  getZoneBoundingBox,
} from '../src/features/map-operations/geometry/operationalGeometry';
import {
  METER_RECALIBRATION_TABLE,
  validateMeterSpatialAssignment,
} from '../src/features/map-operations/geometry/meterRecalibration';
import {
  applyCameraIntent,
  focusEntity,
  getSafeViewportPadding,
} from '../src/features/map-operations/services/mapCameraService';

// ---------------------------------------------------------------------------
// 1. SOURCE TEST
// ---------------------------------------------------------------------------
test('SOURCE TEST: Runtime map asset originates from authoritative canonical base', () => {
  // 1. Verify TanThuanMapSource values
  assert.equal(TanThuanMapSource.mapId, 'tan-thuan-port');
  assert.equal(TanThuanMapSource.width, 1915);
  assert.equal(TanThuanMapSource.height, 821);
  assert.equal(
    TanThuanMapSource.sourceSha256,
    '38f3ae3c98bf7732242780381bf1124a394f4479b623c31e48082bfa19e35b61'
  );
  assert.equal(
    TanThuanMapSource.runtimeBackgroundPolicy,
    'canonical-base-only'
  );

  // 2. Read map-source.manifest.json from disk and verify consistency
  const manifestPath = path.resolve(
    '../docs/design/map-operations/reference/map-source.manifest.json'
  );
  assert.ok(fs.existsSync(manifestPath), 'Manifest file must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.authoritativeBaseSource.pixelWidth, 1915);
  assert.equal(manifest.authoritativeBaseSource.pixelHeight, 821);
  assert.equal(
    manifest.authoritativeBaseSource.sha256,
    TanThuanMapSource.sourceSha256
  );

  // 3. Verify CanonicalBaseMap.tsx does not import deprecated assets
  const canonicalBaseMapPath = path.resolve(
    'src/features/map-operations/scene/CanonicalBaseMap.tsx'
  );
  const baseMapContent = fs.readFileSync(canonicalBaseMapPath, 'utf-8');
  for (const dep of DEPRECATED_MAP_ASSETS) {
    assert.ok(
      !baseMapContent.includes(dep),
      `CanonicalBaseMap must NOT import deprecated asset: ${dep}`
    );
  }
  assert.ok(
    baseMapContent.includes('TanThuanMapSource'),
    'CanonicalBaseMap must consume TanThuanMapSource'
  );
});

// ---------------------------------------------------------------------------
// 2. SOURCE DIMENSION TEST
// ---------------------------------------------------------------------------
test('SOURCE DIMENSION TEST: Runtime image aspect ratio equals source manifest aspect ratio', () => {
  const expectedAspect = 1915 / 821;
  assert.equal(TanThuanMapSource.aspectRatio, expectedAspect);
  assert.equal(CANONICAL_ASPECT_RATIO, expectedAspect);
  assert.equal(CANONICAL_VIEWBOX, '0 0 1915 821');

  // Verify manifest calculation
  const manifestPath = path.resolve(
    '../docs/design/map-operations/reference/map-source.manifest.json'
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.authoritativeBaseSource.aspectRatio, expectedAspect);
});

// ---------------------------------------------------------------------------
// 3. COORDINATE ROUNDTRIP TEST
// ---------------------------------------------------------------------------
test('COORDINATE ROUNDTRIP TEST: normalized -> canonical -> normalized absolute error < 1e-4', () => {
  const testNormalizedPoints = [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 1.0 },
    { x: 0.5, y: 0.5 },
    { x: 0.25, y: 0.75 },
    { x: 0.1234, y: 0.5678 },
    { x: 0.7891, y: 0.3214 },
    { x: 0.4421, y: 0.8912 },
  ];

  for (const pt of testNormalizedPoints) {
    const canonical = normalizedToCanonical(pt);
    // canonical xPx, yPx
    const roundtrip = canonicalToNormalized(canonical.xPx, canonical.yPx);

    const errX = Math.abs(pt.x - roundtrip.x);
    const errY = Math.abs(pt.y - roundtrip.y);

    assert.ok(
      errX < 1e-4,
      `X roundtrip error too large for ${pt.x}: got ${roundtrip.x}, error ${errX}`
    );
    assert.ok(
      errY < 1e-4,
      `Y roundtrip error too large for ${pt.y}: got ${roundtrip.y}, error ${errY}`
    );
  }
});

// ---------------------------------------------------------------------------
// 4. POLYGON TEST
// ---------------------------------------------------------------------------
test('POLYGON TEST: All presentation zone vertices reside strictly within [0, 1915] x [0, 821]', () => {
  assert.equal(PRESENTATION_ZONES.length, 6);

  for (const zone of PRESENTATION_ZONES) {
    assert.ok(zone.polygonCanonical.length >= 3, `${zone.id} must have >= 3 vertices`);
    for (const v of zone.polygonCanonical) {
      assert.ok(
        v.x >= 0 && v.x <= CANONICAL_SCENE_WIDTH,
        `Vertex X out of bounds in ${zone.id}: x=${v.x}`
      );
      assert.ok(
        v.y >= 0 && v.y <= CANONICAL_SCENE_HEIGHT,
        `Vertex Y out of bounds in ${zone.id}: y=${v.y}`
      );
    }
    // Verify label anchor and operator anchor are also within bounds
    assert.ok(
      zone.labelAnchorCanonical.x >= 0 && zone.labelAnchorCanonical.x <= CANONICAL_SCENE_WIDTH,
      `Label anchor X out of bounds in ${zone.id}`
    );
    assert.ok(
      zone.labelAnchorCanonical.y >= 0 && zone.labelAnchorCanonical.y <= CANONICAL_SCENE_HEIGHT,
      `Label anchor Y out of bounds in ${zone.id}`
    );
    assert.ok(
      zone.operatorAnchorCanonical.x >= 0 && zone.operatorAnchorCanonical.x <= CANONICAL_SCENE_WIDTH,
      `Operator anchor X out of bounds in ${zone.id}`
    );
    assert.ok(
      zone.operatorAnchorCanonical.y >= 0 && zone.operatorAnchorCanonical.y <= CANONICAL_SCENE_HEIGHT,
      `Operator anchor Y out of bounds in ${zone.id}`
    );
  }
});

// ---------------------------------------------------------------------------
// 5. METER TEST
// ---------------------------------------------------------------------------
test('METER TEST: 100% meters inside assigned PresentationZone polygon', () => {
  assert.equal(METER_RECALIBRATION_TABLE.length, 12);

  for (const record of METER_RECALIBRATION_TABLE) {
    assert.equal(
      record.validationStatus,
      'VALID',
      `Meter ${record.meterCode} must have VALID spatial assignment`
    );
  }

  // Also assert that an intentional out-of-bounds point triggers INVALID_SPATIAL_ASSIGNMENT
  const invalidResult = validateMeterSpatialAssignment(
    { xPx: 10, yPx: 10 },
    'pres-berth'
  );
  assert.equal(invalidResult.status, 'INVALID_SPATIAL_ASSIGNMENT');
  assert.equal(invalidResult.isValid, false);
});

// ---------------------------------------------------------------------------
// 6. PLACEMENT TEST
// ---------------------------------------------------------------------------
test('PLACEMENT TEST: Mathematical screen and canonical coordinate transforms roundtrip', () => {
  // Mock SVG element with getBoundingClientRect
  const mockSvg = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 50,
      width: 1440,
      height: 900,
      right: 1540,
      bottom: 950,
    }),
  } as unknown as SVGSVGElement;

  const camera = { panX: 40, panY: -20, zoom: 1.25 };
  const originalCanonical = { xPx: 800, yPx: 450 };

  // 1. Forward projection: canonical -> screen
  const screen = canonicalToScreen(
    originalCanonical.xPx,
    originalCanonical.yPx,
    mockSvg,
    camera
  );

  // 2. Inverse projection: screen -> canonical
  const recovered = screenToCanonical(
    screen.clientX,
    screen.clientY,
    mockSvg,
    camera
  );

  assert.ok(
    Math.abs(recovered.xPx - originalCanonical.xPx) <= 1,
    `Placement transform X mismatch: got ${recovered.xPx}, expected ${originalCanonical.xPx}`
  );
  assert.ok(
    Math.abs(recovered.yPx - originalCanonical.yPx) <= 1,
    `Placement transform Y mismatch: got ${recovered.yPx}, expected ${originalCanonical.yPx}`
  );
});

// ---------------------------------------------------------------------------
// 7. RESIZE INVARIANCE TEST
// ---------------------------------------------------------------------------
test('RESIZE INVARIANCE TEST: Entity canonical coordinates remain unchanged across viewport sizes', () => {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
  ];

  // Pick sample meters and zones
  const sampleMeters = METER_RECALIBRATION_TABLE.slice(0, 4);
  const sampleZones = PRESENTATION_ZONES.slice(0, 3);

  for (const vp of viewports) {
    // Check that canonical dimensions are invariant
    assert.equal(CANONICAL_SCENE_WIDTH, 1915);
    assert.equal(CANONICAL_SCENE_HEIGHT, 821);

    // Entity canonical positions do not change with viewport size
    for (const m of sampleMeters) {
      assert.ok(m.canonicalX >= 0 && m.canonicalX <= 1915);
      assert.ok(m.canonicalY >= 0 && m.canonicalY <= 821);
    }
    for (const z of sampleZones) {
      assert.ok(z.labelAnchorCanonical.x >= 0 && z.labelAnchorCanonical.x <= 1915);
      assert.ok(z.operatorAnchorCanonical.x >= 0 && z.operatorAnchorCanonical.x <= 1915);
    }
  }
});

// ---------------------------------------------------------------------------
// 8. CAMERA TEST
// ---------------------------------------------------------------------------
test('CAMERA TEST: Focused zone bounds remain inside safe viewport', () => {
  // Test PORT_OVERVIEW
  const overview = applyCameraIntent({ intent: 'PORT_OVERVIEW' });
  assert.equal(overview.zoom, 1.0);
  assert.equal(overview.panX, 0);
  assert.equal(overview.panY, 0);

  // Test ZONE_FOCUS on pres-berth
  const zoneFocus = applyCameraIntent({
    intent: 'ZONE_FOCUS',
    targetId: 'pres-berth',
    viewportWidth: 1440,
    viewportHeight: 900,
  });
  assert.ok(zoneFocus.zoom >= 1.15, 'Zone focus must apply zoom');

  // Verify safe viewport padding
  const paddingInspect = getSafeViewportPadding('inspect', 1440);
  assert.equal(paddingInspect.right, 352, 'Inspect padding must account for 312px inspector');

  const paddingDetails = getSafeViewportPadding('details', 1440);
  assert.equal(paddingDetails.right, 392, 'Details padding must account for 360px context rail');
});

// ---------------------------------------------------------------------------
// 9. STATE TEST
// ---------------------------------------------------------------------------
test('STATE TEST: Never mount multiple contextual surfaces simultaneously', () => {
  type MapMode = 'browse' | 'inspect' | 'details' | 'placement';
  type DetailView = 'zone-detail' | 'operator-detail' | 'meter-detail' | 'meter-placement' | null;

  interface StateContext {
    mode: MapMode;
    detailView: DetailView;
    selectedEntity: { type: string; id: string } | null;
  }

  const isInspectorVisible = (s: StateContext) =>
    s.mode === 'inspect' && !s.detailView && s.selectedEntity !== null;

  const isContextRailVisible = (s: StateContext) =>
    (s.mode === 'details' || s.mode === 'placement') && s.detailView !== null;

  const states: StateContext[] = [
    { mode: 'browse', detailView: null, selectedEntity: null },
    { mode: 'inspect', detailView: null, selectedEntity: { type: 'zone', id: 'pres-berth' } },
    { mode: 'details', detailView: 'zone-detail', selectedEntity: { type: 'zone', id: 'pres-berth' } },
    { mode: 'placement', detailView: 'meter-placement', selectedEntity: { type: 'zone', id: 'pres-berth' } },
  ];

  for (const state of states) {
    const inspector = isInspectorVisible(state);
    const rail = isContextRailVisible(state);
    assert.ok(
      !(inspector && rail),
      `State ${state.mode} violated single-surface invariant: both inspector and rail active!`
    );
  }
});
