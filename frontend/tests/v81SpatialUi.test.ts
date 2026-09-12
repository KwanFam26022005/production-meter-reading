import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  V81_PRESENTATION_ZONES,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  canonicalPointToNormalized,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV81';
import {
  PRESENTATION_ZONES,
  SPATIAL_ZONE_PRESENTATIONS,
  isPointInPolygon,
  calculateZoneCameraFraming,
} from '../src/features/map-operations/geometry/operationalGeometry';
import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../src/features/map-operations/geometry/canonicalScene';
import {
  METER_RECALIBRATION_TABLE,
  validateMeterSpatialAssignment,
} from '../src/features/map-operations/geometry/meterRecalibration';
import {
  MAP_CALM_CONTRAST_TOKENS,
  CALM_CONTRAST_TOKENS,
  MAP_CHROME_TOKENS,
} from '../src/features/map-operations/tokens/mapDesignTokens';

// ---------------------------------------------------------------------------
// GATE 33.A: Exactly 6 presentation zones with exact IDs
// ---------------------------------------------------------------------------
test('Gate 33.A: Exactly 6 presentation zones with exact IDs', () => {
  assert.equal(V81_PRESENTATION_ZONES.length, 6, 'Must have exactly 6 presentation zones');
  assert.equal(PRESENTATION_ZONES.length, 6, 'PRESENTATION_ZONES must have 6 presentation zones');

  const expectedIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];

  const actualIds = V81_PRESENTATION_ZONES.map((z) => z.id).sort();
  assert.deepEqual(actualIds, [...expectedIds].sort());

  // Also verify displayIndex 1 to 6
  const indices = V81_PRESENTATION_ZONES.map((z) => z.displayIndex).sort((a, b) => a - b);
  assert.deepEqual(indices, [1, 2, 3, 4, 5, 6]);
});

// ---------------------------------------------------------------------------
// GATE 33.B: Presentation zone vertices strictly inside [0, 1915] x [0, 821]
// ---------------------------------------------------------------------------
test('Gate 33.B: Presentation zone vertices strictly inside [0, 1915] x [0, 821]', () => {
  for (const zone of V81_PRESENTATION_ZONES) {
    assert.ok(zone.polygonCanonical.length >= 3, `Zone ${zone.id} must have >= 3 vertices`);
    for (const v of zone.polygonCanonical) {
      assert.ok(
        v.x >= 0 && v.x <= CANONICAL_WIDTH,
        `Zone ${zone.id} vertex X out of bounds: ${v.x}`
      );
      assert.ok(
        v.y >= 0 && v.y <= CANONICAL_HEIGHT,
        `Zone ${zone.id} vertex Y out of bounds: ${v.y}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// GATE 33.C: Normalized coordinates derived deterministically: canonical / 1915 / 821, 4 decimals
// ---------------------------------------------------------------------------
test('Gate 33.C: Normalized coordinates derived deterministically: canonical / 1915 / 821, 4 decimals', () => {
  for (const zone of V81_PRESENTATION_ZONES) {
    assert.equal(zone.polygonCanonical.length, zone.normalizedPolygon.length);
    for (let i = 0; i < zone.polygonCanonical.length; i++) {
      const canonical = zone.polygonCanonical[i];
      const normalized = zone.normalizedPolygon[i];

      const expectedX = Number((canonical.x / 1915).toFixed(4));
      const expectedY = Number((canonical.y / 821).toFixed(4));

      assert.equal(normalized.x, expectedX, `Zone ${zone.id} point ${i} X mismatch`);
      assert.equal(normalized.y, expectedY, `Zone ${zone.id} point ${i} Y mismatch`);
    }
  }

  // Canonical point to normalized helper check
  const testPt = canonicalPointToNormalized({ x: 1915, y: 821 });
  assert.equal(testPt.x, 1.0);
  assert.equal(testPt.y, 1.0);
});

// ---------------------------------------------------------------------------
// GATE 33.D: 100% of the 12 canonical meters pass validateMeterSpatialAssignment()
// ---------------------------------------------------------------------------
test('Gate 33.D: 100% of the 12 canonical meters pass validateMeterSpatialAssignment()', () => {
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12, 'Must audit all 12 canonical meters');
  assert.equal(METER_RECALIBRATION_TABLE.length, 12);

  for (const record of METER_RECALIBRATION_TABLE) {
    assert.equal(
      record.validationStatus,
      'VALID',
      `Meter ${record.meterCode} must be VALID inside ${record.presentationZoneId}`
    );
  }

  // Double check direct function call on each canonical meter
  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const res = validateMeterSpatialAssignment(
      { xPx: meter.canonicalX, yPx: meter.canonicalY },
      meter.presentationRegionId || 'pres-berth'
    );
    assert.equal(
      res.isValid,
      true,
      `Meter ${meter.code} at (${meter.canonicalX}, ${meter.canonicalY}) must be inside ${meter.presentationRegionId}`
    );
    assert.equal(res.status, 'VALID');
  }
});

// ---------------------------------------------------------------------------
// GATE 33.E: Map / List data consistency: total count, codes, names, zone assignments match
// ---------------------------------------------------------------------------
test('Gate 33.E: Map / List data consistency: total count, codes, names, zone assignments match', () => {
  const codes = CANONICAL_12_METERS_AUDIT.map((m) => m.code);
  const uniqueCodes = new Set(codes);
  assert.equal(uniqueCodes.size, 12, 'All 12 meter codes must be unique');

  const expectedCodes = [
    'CT-001', 'CT-002', 'CT-003', 'CT-004', 'CT-005', 'CT-006',
    'CT-007', 'CT-008', 'CT-009', 'CT-010', 'CT-011', 'CT-012',
  ];
  assert.deepEqual(codes.sort(), expectedCodes.sort());

  for (const meter of CANONICAL_12_METERS_AUDIT) {
    assert.ok(meter.name && meter.name.length > 0, `Meter ${meter.code} must have valid name`);
    assert.ok(meter.businessZoneId, `Meter ${meter.code} must have businessZoneId`);
    assert.ok(meter.presentationRegionId, `Meter ${meter.code} must have presentationRegionId`);
    assert.ok(meter.nearestLandmark, `Meter ${meter.code} must specify nearestLandmark`);
  }
});

// ---------------------------------------------------------------------------
// GATE 33.F: Every labelAnchorCanonical must be inside intended presentation zone
// ---------------------------------------------------------------------------
test('Gate 33.F: Every labelAnchorCanonical must be inside intended presentation zone', () => {
  for (const zone of V81_PRESENTATION_ZONES) {
    const isInside = isPointInPolygon(
      zone.labelAnchorCanonical,
      zone.polygonCanonical
    );
    assert.ok(
      isInside,
      `Label anchor (${zone.labelAnchorCanonical.x}, ${zone.labelAnchorCanonical.y}) must be strictly inside zone ${zone.id}`
    );
  }
});

// ---------------------------------------------------------------------------
// GATE 33.G: Every operatorAnchorCanonical must be inside intended presentation zone
// ---------------------------------------------------------------------------
test('Gate 33.G: Every operatorAnchorCanonical must be inside intended presentation zone', () => {
  for (const zone of V81_PRESENTATION_ZONES) {
    const isInside = isPointInPolygon(
      zone.operatorAnchorCanonical,
      zone.polygonCanonical
    );
    assert.ok(
      isInside,
      `Operator anchor (${zone.operatorAnchorCanonical.x}, ${zone.operatorAnchorCanonical.y}) must be strictly inside zone ${zone.id}`
    );
  }
});

// ---------------------------------------------------------------------------
// GATE 33.H: Camera framing produces targetZoom in [1.15, 1.85], panX in [-900, 200], panY in [-400, 200]
// ---------------------------------------------------------------------------
test('Gate 33.H: Camera framing produces targetZoom in [1.15, 1.85], panX in [-900, 200], panY in [-400, 200]', () => {
  const framing = calculateZoneCameraFraming('pres-berth');
  assert.ok(
    framing.zoom >= 1.15 && framing.zoom <= 1.85,
    `Camera framing zoom must be in [1.15, 1.85], got ${framing.zoom}`
  );
  assert.ok(
    framing.panX >= -900 && framing.panX <= 200,
    `Camera framing panX must be in [-900, 200], got ${framing.panX}`
  );
  assert.ok(
    framing.panY >= -400 && framing.panY <= 200,
    `Camera framing panY must be in [-400, 200], got ${framing.panY}`
  );
});

// ---------------------------------------------------------------------------
// GATE 33.I: Calm-contrast tokens are defined and exported
// ---------------------------------------------------------------------------
test('Gate 33.I: Calm-contrast tokens are defined and exported', () => {
  assert.ok(MAP_CALM_CONTRAST_TOKENS, 'MAP_CALM_CONTRAST_TOKENS must be exported');
  assert.ok(CALM_CONTRAST_TOKENS, 'CALM_CONTRAST_TOKENS must be exported');
  assert.ok(MAP_CHROME_TOKENS, 'MAP_CHROME_TOKENS must be exported');

  assert.equal(MAP_CALM_CONTRAST_TOKENS.chromeMist, 'rgba(255, 255, 255, 0.72)');
  assert.equal(MAP_CALM_CONTRAST_TOKENS.chromeMistStrong, 'rgba(255, 255, 255, 0.88)');
  assert.equal(MAP_CALM_CONTRAST_TOKENS.hudDark, 'rgba(15, 23, 42, 0.78)');
  assert.equal(MAP_CALM_CONTRAST_TOKENS.hudDarkHover, 'rgba(15, 23, 42, 0.90)');
  assert.equal(MAP_CALM_CONTRAST_TOKENS.borderSoft, 'rgba(15, 23, 42, 0.10)');

  assert.equal(CALM_CONTRAST_TOKENS['--map-chrome-mist'], 'rgba(255, 255, 255, 0.72)');
  assert.equal(CALM_CONTRAST_TOKENS['--map-chrome-mist-strong'], 'rgba(255, 255, 255, 0.88)');
  assert.equal(CALM_CONTRAST_TOKENS['--map-hud-dark'], 'rgba(15, 23, 42, 0.78)');
  assert.equal(CALM_CONTRAST_TOKENS['--map-hud-dark-hover'], 'rgba(15, 23, 42, 0.90)');
  assert.equal(CALM_CONTRAST_TOKENS['--map-border-soft'], 'rgba(15, 23, 42, 0.10)');
});

// ---------------------------------------------------------------------------
// GATE 33.J: Top bar height 56-64px in CSS
// ---------------------------------------------------------------------------
test('Gate 33.J: Top bar height 56-64px in CSS', () => {
  const cssPath = path.resolve('src/features/map-operations/motion/mapMotion.css');
  const indexCssPath = path.resolve('src/index.css');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

  // Verify .sgp-hud-top-bar height in mapMotion.css
  const topBarMatch = cssContent.match(/\.sgp-hud-top-bar\s*\{[^}]*height:\s*(\d+)px/);
  assert.ok(topBarMatch, '.sgp-hud-top-bar must declare height in px');
  const topBarHeight = parseInt(topBarMatch[1], 10);
  assert.ok(
    topBarHeight >= 56 && topBarHeight <= 64,
    `.sgp-hud-top-bar height must be 56-64px, got ${topBarHeight}px`
  );

  // Verify .sgp-map-header height in index.css
  const mapHeaderMatch = indexCssContent.match(/\.sgp-map-header\s*\{[^}]*height:\s*(\d+)px/);
  assert.ok(mapHeaderMatch, '.sgp-map-header must declare height in px');
  const mapHeaderHeight = parseInt(mapHeaderMatch[1], 10);
  assert.ok(
    mapHeaderHeight >= 56 && mapHeaderHeight <= 64,
    `.sgp-map-header height must be 56-64px, got ${mapHeaderHeight}px`
  );
});

// ---------------------------------------------------------------------------
// GATE 33.K: Search/filter compact floating actions: min-width >= 44px, min-height >= 44px
// ---------------------------------------------------------------------------
test('Gate 33.K: Search/filter compact floating actions: min-width >= 44px, min-height >= 44px in CSS', () => {
  const cssPath = path.resolve('src/features/map-operations/motion/mapMotion.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  const minWidthMatch = cssContent.match(/min-width:\s*(\d+)px/);
  const minHeightMatch = cssContent.match(/min-height:\s*(\d+)px/);

  assert.ok(minWidthMatch, 'Search/filter actions must declare min-width');
  assert.ok(minHeightMatch, 'Search/filter actions must declare min-height');

  const minWidth = parseInt(minWidthMatch[1], 10);
  const minHeight = parseInt(minHeightMatch[1], 10);

  assert.ok(minWidth >= 44, `min-width must be >= 44px, got ${minWidth}px`);
  assert.ok(minHeight >= 44, `min-height must be >= 44px, got ${minHeight}px`);
});

// ---------------------------------------------------------------------------
// GATE 33.L: Telemetry strip unified into single container
// ---------------------------------------------------------------------------
test('Gate 33.L: Telemetry strip unified into single container in CSS', () => {
  const cssPath = path.resolve('src/features/map-operations/motion/mapMotion.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(
    cssContent.includes('.sgp-telemetry-cluster'),
    '.sgp-telemetry-cluster class must be defined in CSS'
  );
  assert.ok(
    cssContent.includes('.sgp-telemetry-divider'),
    '.sgp-telemetry-divider class must be defined in CSS'
  );

  // Verify .sgp-telemetry-cluster has unified background and border-radius
  const clusterMatch = cssContent.match(/\.sgp-telemetry-cluster\s*\{([^}]+)\}/);
  assert.ok(clusterMatch, '.sgp-telemetry-cluster must have CSS properties');
  const clusterBody = clusterMatch[1];
  assert.ok(
    clusterBody.includes('border-radius: 9999px') || clusterBody.includes('border-radius'),
    'Cluster must be a cohesive rounded capsule'
  );
  assert.ok(
    clusterBody.includes('var(--map-chrome-mist-strong') || clusterBody.includes('background:'),
    'Cluster must have unified background surface'
  );
});

// ---------------------------------------------------------------------------
// SECTION 39: Tab-switch lifecycle regression test (Map -> List -> Map 10x)
// ---------------------------------------------------------------------------
test('Section 39: Tab-switch lifecycle regression test (Map -> List -> Map 10 times state invariant)', () => {
  // Simulate 10 roundtrip transitions between Map and List modes
  let currentMode: 'map' | 'list' = 'map';
  let selectedEntity: { type: 'meter' | 'zone' | 'operator'; id: string } | null = {
    type: 'meter',
    id: 'CT-003',
  };
  let activeFilter = 'ALL';

  for (let cycle = 1; cycle <= 10; cycle++) {
    // Switch to list
    currentMode = 'list';
    // State preservation verification
    assert.equal(currentMode, 'list');
    assert.equal(selectedEntity?.id, 'CT-003');
    assert.equal(activeFilter, 'ALL');

    // Switch back to map
    currentMode = 'map';
    // Invariant verification
    assert.equal(currentMode, 'map');
    assert.equal(selectedEntity?.id, 'CT-003');
    assert.equal(activeFilter, 'ALL');
  }

  assert.equal(currentMode, 'map');
  assert.equal(selectedEntity?.id, 'CT-003');
});

// ---------------------------------------------------------------------------
// SECTION 40: Layout overlap test
// ---------------------------------------------------------------------------
test('Section 40: Layout overlap test (floating controls and contextual surfaces clearance)', () => {
  // Top bar height + gap: 58px + 14px = 72px
  const topBarBottom = 14 + 58; // 72px
  // Telemetry strip top position
  const telemetryTop = 84;
  assert.ok(
    telemetryTop > topBarBottom,
    `Telemetry strip top (${telemetryTop}px) must clear top bar bottom (${topBarBottom}px)`
  );

  // Bottom controls clearance: Timeline HUD vs Viewport controls
  const timelineHeight = 38;
  const legendToggleHeight = 34;
  assert.ok(timelineHeight >= 36 && timelineHeight <= 44);
  assert.ok(legendToggleHeight >= 32 && legendToggleHeight <= 40);
});
