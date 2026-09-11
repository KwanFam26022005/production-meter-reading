import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_MAP_VERSION,
  canonicalSceneToNormalized,
  normalizedToCanonicalScene,
} from '../src/features/map-operations/geometry/canonicalScene';
import {
  SPATIAL_ZONE_PRESENTATIONS,
  BUSINESS_ZONES_GEOMETRY,
  isPointInPolygon,
  isPointInPresentationZone,
  isPointInBusinessZone,
  getZoneBoundingBox,
  calculateZoneCameraFraming,
  getPresentationsForBusinessZone,
  resolveToBusinessZoneId,
} from '../src/features/map-operations/geometry/operationalGeometry';

// ---------------------------------------------------------------------------
// 1. 6 PRESENTATION ZONES VALIDITY
// ---------------------------------------------------------------------------
test('V7 Spatial: Exactly 6 presentation zones calibrated against canonical V2', () => {
  assert.equal(SPATIAL_ZONE_PRESENTATIONS.length, 6);

  const presentationIds = SPATIAL_ZONE_PRESENTATIONS.map((p) => p.presentationId).sort();
  const expectedIds = [
    'pres-berth',
    'pres-cfs-east',
    'pres-container-center',
    'pres-container-west',
    'pres-gate',
    'pres-technical',
  ];
  assert.deepEqual(presentationIds, expectedIds);
});

test('V7 Spatial: All presentation polygon vertices within 1915x821 bounds', () => {
  for (const pres of SPATIAL_ZONE_PRESENTATIONS) {
    assert.ok(
      pres.pointsSvg.length >= 3,
      `Zone ${pres.presentationId} must have at least 3 polygon points`
    );

    for (const pt of pres.pointsSvg) {
      assert.ok(
        pt.x >= 0 && pt.x <= CANONICAL_SCENE_WIDTH,
        `Point x=${pt.x} out of bounds in ${pres.presentationId}`
      );
      assert.ok(
        pt.y >= 0 && pt.y <= CANONICAL_SCENE_HEIGHT,
        `Point y=${pt.y} out of bounds in ${pres.presentationId}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 2. MAPPING TO 4 AUTHORITATIVE BUSINESS ZONES
// ---------------------------------------------------------------------------
test('V7 Spatial: Presentation zones map deterministically to 4 business zones', () => {
  assert.equal(resolveToBusinessZoneId('pres-berth'), 'zone-berth');
  assert.equal(resolveToBusinessZoneId('pres-container-west'), 'zone-warehouse');
  assert.equal(resolveToBusinessZoneId('pres-container-center'), 'zone-container');
  assert.equal(resolveToBusinessZoneId('pres-cfs-east'), 'zone-warehouse');
  assert.equal(resolveToBusinessZoneId('pres-technical'), 'zone-technical');
  assert.equal(resolveToBusinessZoneId('pres-gate'), 'zone-technical');

  // Business zones list presentations
  const whPres = getPresentationsForBusinessZone('zone-warehouse');
  assert.equal(whPres.length, 2);
  assert.ok(whPres.some((p) => p.presentationId === 'pres-container-west'));
  assert.ok(whPres.some((p) => p.presentationId === 'pres-cfs-east'));

  const techPres = getPresentationsForBusinessZone('zone-technical');
  assert.equal(techPres.length, 2);
  assert.ok(techPres.some((p) => p.presentationId === 'pres-technical'));
  assert.ok(techPres.some((p) => p.presentationId === 'pres-gate'));
});

// ---------------------------------------------------------------------------
// 3. ZERO PAIRWISE OVERLAP VERIFICATION
// ---------------------------------------------------------------------------
test('V7 Spatial: Presentation zones have pairwise non-overlapping centroids', () => {
  for (let i = 0; i < SPATIAL_ZONE_PRESENTATIONS.length; i++) {
    const zoneA = SPATIAL_ZONE_PRESENTATIONS[i];
    for (let j = 0; j < SPATIAL_ZONE_PRESENTATIONS.length; j++) {
      if (i === j) continue;
      const zoneB = SPATIAL_ZONE_PRESENTATIONS[j];

      // Centroid of zoneA must NOT be inside zoneB polygon
      const centroidAInB = isPointInPolygon(zoneA.centroidSvg, zoneB.pointsSvg);
      assert.equal(
        centroidAInB,
        false,
        `Centroid of ${zoneA.presentationId} (${zoneA.centroidSvg.x}, ${zoneA.centroidSvg.y}) must not be inside ${zoneB.presentationId}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 4. POINT-IN-POLYGON PLACEMENT VALIDATION
// ---------------------------------------------------------------------------
test('V7 Spatial: Point-in-polygon correctly identifies inside vs outside coordinates', () => {
  // Inside tests
  assert.ok(isPointInBusinessZone({ x: 920, y: 320 }, 'zone-berth'), 'Berth centroid must be inside zone-berth');
  assert.ok(isPointInBusinessZone({ x: 1170, y: 440 }, 'zone-container'), 'CY center must be inside zone-container');
  assert.ok(isPointInBusinessZone({ x: 440, y: 470 }, 'zone-warehouse'), 'Warehouse west must be inside zone-warehouse');
  assert.ok(isPointInBusinessZone({ x: 1680, y: 380 }, 'zone-warehouse'), 'CFS East must be inside zone-warehouse');
  assert.ok(isPointInBusinessZone({ x: 1100, y: 750 }, 'zone-technical'), 'Technical south must be inside zone-technical');
  assert.ok(isPointInBusinessZone({ x: 1680, y: 590 }, 'zone-technical'), 'Gate must be inside zone-technical');

  // Outside tests: Point in river/water (x: 100, y: 100)
  assert.equal(isPointInBusinessZone({ x: 100, y: 100 }, 'zone-berth'), false);
  assert.equal(isPointInBusinessZone({ x: 100, y: 100 }, 'zone-container'), false);
  assert.equal(isPointInBusinessZone({ x: 100, y: 100 }, 'zone-warehouse'), false);
  assert.equal(isPointInBusinessZone({ x: 100, y: 100 }, 'zone-technical'), false);

  // Cross-zone test: Point inside Berth must be outside Technical
  assert.equal(isPointInBusinessZone({ x: 920, y: 320 }, 'zone-technical'), false);
  assert.equal(isPointInBusinessZone({ x: 920, y: 320 }, 'zone-container'), false);
});

// ---------------------------------------------------------------------------
// 5. 2D CAMERA FRAMING CALCULATOR
// ---------------------------------------------------------------------------
test('V7 Spatial: calculateZoneCameraFraming produces valid 2D pan/zoom values', () => {
  const zones = ['zone-berth', 'zone-warehouse', 'zone-container', 'zone-technical'];

  for (const zid of zones) {
    const framing = calculateZoneCameraFraming(zid);
    assert.ok(framing.zoom >= 1.15 && framing.zoom <= 1.85, `Zoom for ${zid} must be in [1.15, 1.85], got ${framing.zoom}`);

    // Bounding box of zone
    const bbox = getZoneBoundingBox(zid);
    assert.ok(bbox.width > 0, `Width for ${zid} must be positive`);
    assert.ok(bbox.height > 0, `Height for ${zid} must be positive`);

    // Verify center is approximately at screen center after transform
    const projectedCenterX = framing.panX + bbox.centerX * framing.zoom;
    const projectedCenterY = framing.panY + bbox.centerY * framing.zoom;

    // Tolerance ± 5px due to rounding
    assert.ok(
      Math.abs(projectedCenterX - CANONICAL_SCENE_WIDTH / 2) < 5,
      `Projected center X ${projectedCenterX} should be near screen center ${CANONICAL_SCENE_WIDTH / 2}`
    );
    assert.ok(
      Math.abs(projectedCenterY - CANONICAL_SCENE_HEIGHT / 2) < 5,
      `Projected center Y ${projectedCenterY} should be near screen center ${CANONICAL_SCENE_HEIGHT / 2}`
    );
  }
});

// ---------------------------------------------------------------------------
// 6. METER PLACEMENT & RELOCATION COORDINATE CONTRACT
// ---------------------------------------------------------------------------
test('V7 Spatial: Normalized coordinates roundtrip accurately on V2 map', () => {
  const candidateNorm = { x: 0.6115, y: 0.5323 };
  const scenePt = normalizedToCanonicalScene(candidateNorm);
  assert.equal(scenePt.x, 1171);
  assert.equal(scenePt.y, 437);

  const backNorm = canonicalSceneToNormalized(scenePt.x, scenePt.y);
  assert.equal(backNorm.x, candidateNorm.x);
  assert.equal(backNorm.y, candidateNorm.y);
});
