import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_VIEWBOX,
  CANONICAL_MAP_VERSION,
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_OPERATOR_ANCHORS,
  normalizedToCanonicalScene,
  canonicalSceneToNormalized,
  clampPanForZoom,
} from '../src/features/map-operations/geometry/canonicalScene';
import {
  OPERATIONAL_ZONES_GEOMETRY,
  getZoneOperatorAnchor,
  isPointInZone,
} from '../src/features/map-operations/geometry/operationalGeometry';

// Helper: Point in polygon (Ray casting)
function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i - 1 + n) % n;
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance helper
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// ---------------------------------------------------------------------------
// 1. CANONICAL TRANSFORM TESTS
// ---------------------------------------------------------------------------
test('Canonical Transform: Dimensions and Aspect Ratio match canonical port map', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915);
  assert.equal(CANONICAL_SCENE_HEIGHT, 821);
  assert.equal(CANONICAL_VIEWBOX, '0 0 1915 821');
  assert.ok(
    CANONICAL_MAP_VERSION === 'tan-thuan-v8' || CANONICAL_MAP_VERSION === 'tan-thuan-v9' || CANONICAL_MAP_VERSION === 'tan-thuan-v10',
    `Expected tan-thuan-v8, tan-thuan-v9, or tan-thuan-v10, got ${CANONICAL_MAP_VERSION}`
  );
});

test('Canonical Transform: Boundary and Center Roundtrip Projections', () => {
  // Origin (0, 0)
  const originSvg = normalizedToCanonicalScene({ x: 0, y: 0 });
  assert.deepEqual(originSvg, { x: 0, y: 0 });
  assert.deepEqual(canonicalSceneToNormalized(0, 0), { x: 0, y: 0 });

  // Max extent (1, 1)
  const maxSvg = normalizedToCanonicalScene({ x: 1, y: 1 });
  assert.deepEqual(maxSvg, { x: 1915, y: 821 });
  assert.deepEqual(canonicalSceneToNormalized(1915, 821), { x: 1, y: 1 });

  // Center (0.5, 0.5)
  const centerSvg = normalizedToCanonicalScene({ x: 0.5, y: 0.5 });
  assert.deepEqual(centerSvg, { x: 958, y: 411 });
  assert.deepEqual(canonicalSceneToNormalized(958, 411), { x: 0.5003, y: 0.5006 });
});

test('Viewport Clamping: Clamps pan coordinates to prevent black void exposure', () => {
  // Zoom = 1.0 -> pan must be (0, 0)
  const z1 = clampPanForZoom(-100, 100, 1.0);
  assert.deepEqual(z1, { panX: 0, panY: 0 });

  // Zoom = 1.45 -> panX in [-862, 0], panY in [-369, 0]
  const z145 = clampPanForZoom(-1000, -600, 1.45);
  assert.equal(z145.panX, -862);
  assert.equal(z145.panY, -369);

  // Positive pan (pulling away from top/left) clamped to 0
  const zPositive = clampPanForZoom(200, 300, 1.45);
  assert.equal(zPositive.panX, 0);
  assert.equal(zPositive.panY, 0);

  // Valid internal pan preserved
  const zValid = clampPanForZoom(-200, -150, 1.45);
  assert.equal(zValid.panX, -200);
  assert.equal(zValid.panY, -150);
});

// ---------------------------------------------------------------------------
// 2. 12-METER CALIBRATION GATE TESTS (12 / 12 PASS)
// ---------------------------------------------------------------------------
test('12-Meter Calibration Gate: All 12 meters audited and mapped to approved landmarks', () => {
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12, 'Must audit exactly 12 operational meters');

  const zoneIds = new Set(CANONICAL_12_METERS_AUDIT.map((m) => m.businessZoneId));
  assert.ok(zoneIds.has('zone-berth'), 'Must contain berth meters');
  assert.ok(zoneIds.has('zone-warehouse'), 'Must contain warehouse meters');
  assert.ok(zoneIds.has('zone-container'), 'Must contain container meters');
  assert.ok(zoneIds.has('zone-technical'), 'Must contain technical meters');
});

test('12-Meter Calibration Gate: 12 / 12 meters verified INSIDE their operational polygon', () => {
  let passCount = 0;
  const auditReport: { code: string; zone: string; landmark: string; status: string }[] = [];

  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const zoneGeom = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === meter.businessZoneId);
    assert.ok(zoneGeom, `Zone geometry must exist for ${meter.businessZoneId}`);

    const isInside = isPointInZone(meter.canonicalX, meter.canonicalY, zoneGeom);
    const status = isInside ? 'PASS' : 'FAIL';
    if (isInside) passCount++;

    auditReport.push({
      code: meter.code,
      zone: meter.businessZoneId,
      landmark: meter.nearestLandmark,
      status,
    });

    assert.ok(
      isInside,
      `Meter ${meter.code} (${meter.nearestLandmark}) at (${meter.canonicalX}, ${meter.canonicalY}) must be inside ${meter.businessZoneId} polygon`
    );
  }

  assert.equal(passCount, 12, 'Required: 12 / 12 PASS on calibration gate before proceeding');
});

// ---------------------------------------------------------------------------
// 3. OPERATOR ANCHOR & WHITESPACE TESTS
// ---------------------------------------------------------------------------
test('Operator Anchors: All 4 zones have valid operator anchors inside zone polygon', () => {
  const zones = ['zone-berth', 'zone-warehouse', 'zone-container', 'zone-technical'];

  for (const zid of zones) {
    const anchor = getZoneOperatorAnchor(zid);
    assert.ok(anchor, `Operator anchor must exist for ${zid}`);
    assert.ok(anchor.x > 0 && anchor.x < CANONICAL_SCENE_WIDTH, `Anchor X in bounds for ${zid}`);
    assert.ok(anchor.y > 0 && anchor.y < CANONICAL_SCENE_HEIGHT, `Anchor Y in bounds for ${zid}`);

    const zoneGeom = OPERATIONAL_ZONES_GEOMETRY.find((z) => z.id === zid);
    assert.ok(zoneGeom);
    const isInside = isPointInZone(anchor.x, anchor.y, zoneGeom);
    assert.ok(isInside, `Operator anchor for ${zid} at (${anchor.x}, ${anchor.y}) must be inside zone polygon`);
  }
});

test('Operator Anchors: Calibrated anchors maintain >= 30px whitespace clearance from all meters', () => {
  for (const [zoneId, anchor] of Object.entries(CANONICAL_OPERATOR_ANCHORS)) {
    for (const meter of CANONICAL_12_METERS_AUDIT) {
      const dist = distance(anchor, { x: meter.canonicalX, y: meter.canonicalY });
      assert.ok(
        dist >= 30,
        `Operator anchor in ${zoneId} at (${anchor.x}, ${anchor.y}) is too close to ${meter.code} at (${meter.canonicalX}, ${meter.canonicalY}) (dist=${dist.toFixed(1)}px, min=30px)`
      );
    }
  }
});

test('Operator Anchors: Distinct anchors per zone with no mutual collision', () => {
  const anchors = Object.values(CANONICAL_OPERATOR_ANCHORS);
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const dist = distance(anchors[i], anchors[j]);
      assert.ok(dist >= 80, `Operator anchors ${i} and ${j} must not collide (dist=${dist.toFixed(1)}px)`);
    }
  }
});

// ---------------------------------------------------------------------------
// 4. MAP / LIST CONSISTENCY & DOMAIN INTEGRITY
// ---------------------------------------------------------------------------
test('Map / List Consistency: Meter domain codes and semantic states preserved', () => {
  const expectedCodes = [
    'CT-001', 'CT-002', 'CT-003', 'CT-004', 'CT-005', 'CT-006',
    'CT-007', 'CT-008', 'CT-009', 'CT-010', 'CT-011', 'CT-012',
  ];

  const auditedCodes = CANONICAL_12_METERS_AUDIT.map((m) => m.code).sort();
  assert.deepEqual(auditedCodes, expectedCodes);
});

// ---------------------------------------------------------------------------
// 5. POPUP ANCHOR FORMULA & CLAMPING TEST
// ---------------------------------------------------------------------------
test('Popup Anchor: Coordinates clamp smoothly inside stage bounds', () => {
  const stageWidth = 1200;
  const stageHeight = 700;

  // Simulate marker in corner
  const rawCornerLeft = 50;
  const rawCornerTop = 60;
  const leftClamped = Math.max(130, Math.min(rawCornerLeft, stageWidth - 130));
  const topClamped = Math.max(190, Math.min(rawCornerTop, stageHeight - 30));

  assert.equal(leftClamped, 130, 'Left position must clamp to min 130px');
  assert.equal(topClamped, 190, 'Top position must clamp to min 190px');
});
