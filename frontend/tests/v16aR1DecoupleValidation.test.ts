import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validatePrePublishGeometry,
} from '../src/features/map-operations/calibration/useMapCalibrationWorkspace';
import {
  CANONICAL_GEOMETRY_V10,
  V10GeometryManifest,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';

// ===========================================================================
// SUITE: V16A-R1 DECOUPLE MAP GEOMETRY CALIBRATION FROM METER CONTAINMENT
// ===========================================================================

test('V16A-R1 Baseline: Canonical geometry passes validation with zero errors and zero warnings', () => {
  const result = validatePrePublishGeometry(CANONICAL_GEOMETRY_V10);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.blockingErrors.length, 0);
  assert.equal(result.warningIssues.length, 0);
  assert.equal(result.simplePolygons, true);
  assert.equal(result.anchorsValid, true);
});

test('V16A-R1 Decoupled Meters: Meter outside zone is a WARNING and does NOT block valid (valid === true)', () => {
  // Shrink pres-berth polygon so that meters fall outside
  const shrunkenZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0], // pres-berth
    polygonCanonical: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ],
    labelAnchorCanonical: { x: 150, y: 150 },
    operatorAnchorCanonical: { x: 160, y: 160 },
  };

  const manifestWithOutsideMeters: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [shrunkenZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };

  const result = validatePrePublishGeometry(manifestWithOutsideMeters);

  // Structural geometry is valid -> valid MUST be true!
  assert.equal(result.valid, true, 'Geometry must remain valid even when meters are outside');
  assert.equal(result.blockingErrors.length, 0, 'No blocking errors for meter containment');
  assert.equal(result.errors.length, 0, 'errors array must be empty');

  // Meter containment is reported as a WARNING
  assert.ok(result.warnings.length > 0, 'Warnings must be present for uncontained meters');
  assert.ok(result.warningIssues.length > 0, 'Warning issues must be populated');

  const meterIssues = result.warningIssues.filter(
    (i) => i.code === 'METER_OUTSIDE_PRESENTATION_ZONE'
  );
  assert.ok(meterIssues.length > 0, 'Must contain METER_OUTSIDE_PRESENTATION_ZONE issue');
  assert.equal(meterIssues[0].severity, 'WARNING');
  assert.equal(meterIssues[0].entityType, 'METER');
});

test('V16A-R1 Decoupled Anchors: Anchor outside polygon is a WARNING and does NOT block valid (valid === true)', () => {
  // Label anchor outside
  const outsideLabelZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    labelAnchorCanonical: { x: 50, y: 50 }, // outside pres-berth
  };
  const manifestOutsideLabel: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [outsideLabelZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const resultLabel = validatePrePublishGeometry(manifestOutsideLabel);
  assert.equal(resultLabel.valid, true, 'Anchor outside must not block valid');
  assert.equal(resultLabel.anchorsValid, false);
  assert.equal(resultLabel.blockingErrors.length, 0);
  assert.ok(resultLabel.warningIssues.some((i) => i.code === 'ANCHOR_OUTSIDE_POLYGON'));

  // Operator anchor outside
  const outsideOpZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    operatorAnchorCanonical: { x: 10, y: 10 }, // outside pres-berth
  };
  const manifestOutsideOp: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [outsideOpZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const resultOp = validatePrePublishGeometry(manifestOutsideOp);
  assert.equal(resultOp.valid, true, 'Operator anchor outside must not block valid');
  assert.equal(resultOp.anchorsValid, false);
  assert.equal(resultOp.blockingErrors.length, 0);
  assert.ok(resultOp.warningIssues.some((i) => i.code === 'ANCHOR_OUTSIDE_POLYGON'));
});

test('V16A-R1 Structural Geometry Invariant: Non-simple polygon (self-intersection) BLOCKS (valid === false)', () => {
  const selfIntersectingZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    polygonCanonical: [
      { x: 100, y: 100 },
      { x: 300, y: 300 },
      { x: 300, y: 100 },
      { x: 100, y: 300 },
    ],
  };
  const badPolyManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [selfIntersectingZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const result = validatePrePublishGeometry(badPolyManifest);
  assert.equal(result.valid, false, 'Self-intersecting polygon must fail validation');
  assert.equal(result.simplePolygons, false);
  assert.ok(result.blockingErrors.some((i) => i.code === 'POLYGON_SELF_INTERSECTION'));
  assert.ok(result.errors.length > 0);
});

test('V16A-R1 Structural Geometry Invariant: Out-of-bounds vertices BLOCK (valid === false)', () => {
  const outOfBoundsZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    polygonCanonical: [
      { x: -50, y: 100 }, // out of bounds
      { x: 300, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 300 },
    ],
  };
  const badBoundsManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [outOfBoundsZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };
  const result = validatePrePublishGeometry(badBoundsManifest);
  assert.equal(result.valid, false, 'Out of bounds vertices must fail validation');
  assert.ok(result.blockingErrors.some((i) => i.code === 'VERTEX_OUT_OF_BOUNDS'));
  assert.ok(result.errors.length > 0);
});

test('V16A-R1 Acceptance Scenario: Cầu Cảng reshaped to 18 vertices with 1 uncontained meter allows Apply & Publish', () => {
  // Simulate Cầu Cảng with 18 vertices, valid area, simple polygon
  // One meter outside and anchors outside due to boundary adjustment
  const berth18Vertices = [
    { x: 650, y: 15 },
    { x: 700, y: 18 },
    { x: 750, y: 22 },
    { x: 800, y: 28 },
    { x: 850, y: 35 },
    { x: 900, y: 45 },
    { x: 950, y: 55 },
    { x: 1000, y: 68 },
    { x: 1050, y: 82 },
    { x: 1100, y: 98 },
    { x: 1120, y: 120 },
    { x: 1100, y: 140 },
    { x: 1000, y: 130 },
    { x: 900, y: 110 },
    { x: 800, y: 90 },
    { x: 720, y: 70 },
    { x: 660, y: 45 },
    { x: 640, y: 25 },
  ];

  const reshapedBerthZone = {
    ...CANONICAL_GEOMETRY_V10.zones[0],
    polygonCanonical: berth18Vertices,
  };

  const reshapedManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: [reshapedBerthZone, ...CANONICAL_GEOMETRY_V10.zones.slice(1)],
  };

  const result = validatePrePublishGeometry(reshapedManifest);

  // Crucial test: Polygon is simple and within bounds -> valid MUST be true!
  assert.equal(result.valid, true, 'Reshaped zone with 18 vertices MUST be valid for Apply and Publish');
  assert.equal(result.blockingErrors.length, 0);
  assert.equal(result.errors.length, 0);

  // Warnings are captured for meter and/or anchor
  assert.ok(result.warnings.length > 0, 'Warnings must be reported for reconciliation');
  assert.ok(result.warningIssues.some((i) => i.severity === 'WARNING'));
});
