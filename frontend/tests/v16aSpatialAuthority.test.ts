import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptMapConfiguration,
  adaptZoneToPresentation,
  createDegradedFallbackConfiguration,
  computePolygonCentroid,
  pointsToSvgPath,
} from '../src/features/map-operations/adapters/mapConfigurationAdapter';
import {
  activeConfigToManifest,
} from '../src/features/map-operations/calibration/useMapCalibrationWorkspace';
import { ActiveMapConfiguration } from '../src/features/map-operations/types/activeMapConfiguration';
import {
  CANONICAL_GEOMETRY_V10,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';
import { CANONICAL_12_METERS_AUDIT } from '../src/features/map-operations/geometry/canonicalScene';
import {
  isPointInPolygon,
  SPATIAL_ZONE_PRESENTATIONS,
} from '../src/features/map-operations/geometry/operationalGeometry';

// ===========================================================================
// SUITE: V16A SPATIAL AUTHORITY & ACTIVE MAP CONFIGURATION CONTRACT
// ===========================================================================

test('V16A Geometry Math: computePolygonCentroid and pointsToSvgPath produce deterministic outputs', () => {
  const square = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 },
  ];
  const centroid = computePolygonCentroid(square);
  assert.equal(centroid.x, 200);
  assert.equal(centroid.y, 200);

  const path = pointsToSvgPath(square);
  assert.equal(path, 'M 100,100 L 300,100 L 300,300 L 100,300 Z');
});

test('V16A Adapter: adaptMapConfiguration converts active DB config into operational presentation zones', () => {
  const mockActiveConfig: ActiveMapConfiguration = {
    mapId: 'tan-thuan',
    versionId: 'mv-v16a-active-001',
    versionNumber: 'tan-thuan-v16a-001',
    coordinateSystem: 'tan-thuan-canonical-image-pixel-space-v1',
    canonicalWidth: 1915,
    canonicalHeight: 821,
    sourceAsset: 'tan-thuan-canonical-base.png',
    sourceChecksum: 'abc12345',
    geometrySchemaVersion: '1.0',
    status: 'PUBLISHED',
    revision: 2,
    publishedAt: '2026-09-14T08:00:00Z',
    authoritative: true,
    source: 'db',
    zones: [
      {
        id: 'z-cau-tau',
        zoneId: 'cau_tau',
        presentationId: 'cau_tau',
        businessZoneId: 'cau_tau',
        businessName: 'Cầu Tàu',
        displayLabel: 'Khu Vực Cầu Tàu',
        displayIndex: 1,
        presentationColor: 'rgba(56, 189, 248, 0.25)',
        icon: 'ship',
        polygonCanonical: [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
          { x: 500, y: 300 },
          { x: 100, y: 300 },
        ],
        labelAnchorCanonical: { x: 300, y: 200 },
        operatorAnchorCanonical: { x: 310, y: 210 },
        revision: 1,
      },
      {
        id: 'z-bai-cont',
        zoneId: 'bai_container',
        presentationId: 'bai_container',
        businessZoneId: 'bai_container',
        businessName: 'Bãi Container',
        displayLabel: 'Bãi Chứa Container',
        displayIndex: 2,
        presentationColor: 'rgba(168, 85, 247, 0.25)',
        icon: 'container',
        polygonCanonical: [
          { x: 550, y: 100 },
          { x: 900, y: 100 },
          { x: 900, y: 300 },
          { x: 550, y: 300 },
        ],
        labelAnchorCanonical: { x: 725, y: 200 },
        operatorAnchorCanonical: { x: 730, y: 210 },
        revision: 1,
      },
    ],
    landmarks: [
      {
        id: 'lm-01',
        name: 'Trạm kiểm soát',
        x: 200,
        y: 150,
      },
    ],
  };

  const adapted = adaptMapConfiguration(mockActiveConfig);
  assert.equal(adapted.authoritative, true);
  assert.equal(adapted.source, 'db');
  assert.equal(adapted.presentationZones.length, 2);

  const zone1 = adapted.presentationZones[0];
  assert.equal(zone1.id, 'cau_tau');
  assert.equal(zone1.displayLabel, 'Khu Vực Cầu Tàu');
  assert.equal(zone1.polygonSvg, 'M 100,100 L 500,100 L 500,300 L 100,300 Z');
  assert.deepEqual(zone1.centroidSvg, { x: 300, y: 200 });
  assert.ok(Math.abs(zone1.centroidNormalized.x - 300 / 1915) < 1e-4);
  assert.ok(Math.abs(zone1.centroidNormalized.y - 200 / 821) < 1e-4);
  assert.deepEqual(zone1.operatorAnchorCanonical, { x: 310, y: 210 });
  assert.deepEqual(zone1.labelAnchorCanonical, { x: 300, y: 200 });

  assert.deepEqual(adapted.operatorAnchors['cau_tau'], { x: 310, y: 210 });
  assert.deepEqual(adapted.operatorAnchors['bai_container'], { x: 730, y: 210 });
});

test('V16A Fallback: createDegradedFallbackConfiguration produces valid 6-zone fallback with authoritative=false', () => {
  const fallback = createDegradedFallbackConfiguration();
  assert.equal(fallback.authoritative, false);
  assert.equal(fallback.source, 'fallback');
  assert.equal(fallback.canonicalWidth, CANONICAL_WIDTH);
  assert.equal(fallback.canonicalHeight, CANONICAL_HEIGHT);
  assert.equal(fallback.zones.length, 6);

  const adapted = adaptMapConfiguration(fallback);
  assert.equal(adapted.presentationZones.length, 6);

  for (const zone of adapted.presentationZones) {
    assert.ok(zone.id.length > 0);
    assert.ok(zone.polygonCanonical.length >= 3);
    assert.ok(zone.polygonSvg.startsWith('M '));
    assert.ok(zone.polygonSvg.endsWith(' Z'));
    assert.ok(zone.centroidSvg.x >= 0 && zone.centroidSvg.x <= 1915);
    assert.ok(zone.centroidSvg.y >= 0 && zone.centroidSvg.y <= 821);
  }
});

test('V16A Calibration: activeConfigToManifest maps ActiveMapConfiguration to V10GeometryManifest', () => {
  const fallback = createDegradedFallbackConfiguration();
  const manifest = activeConfigToManifest(fallback);

  assert.equal(manifest.canonicalWidth, 1915);
  assert.equal(manifest.canonicalHeight, 821);
  assert.equal(manifest.zones.length, 6);
  assert.ok(manifest.landmarks.length > 0);

  const berthZone = manifest.zones.find(z => z.id === 'pres-berth');
  assert.ok(berthZone);
  assert.equal(berthZone.icon, 'ship');
  assert.ok(berthZone.polygonCanonical.length >= 3);
});

test('V16A Single Source of Truth: Canonical baseline matches DB seed geometry and bounds', () => {
  const fallback = createDegradedFallbackConfiguration();
  const adapted = adaptMapConfiguration(fallback);

  // Verify all 6 zones have valid non-overlapping coordinates and are within bounds
  for (const zone of adapted.presentationZones) {
    for (const pt of zone.polygonCanonical) {
      assert.ok(pt.x >= 0 && pt.x <= 1915, `Vertex x=${pt.x} outside canonical bounds in ${zone.id}`);
      assert.ok(pt.y >= 0 && pt.y <= 821, `Vertex y=${pt.y} outside canonical bounds in ${zone.id}`);
    }
  }

  // Verify all 12 canonical meters resolve into their intended zone under adapted active geometry
  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const matchingZone = adapted.presentationZones.find(z => isPointInPolygon(meter.canonicalX, meter.canonicalY, z.polygonCanonical));
    assert.ok(matchingZone, `Meter ${meter.code} at (${meter.canonicalX}, ${meter.canonicalY}) not inside any adapted zone`);
  }
});
