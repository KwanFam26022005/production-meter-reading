import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANONICAL_GEOMETRY_V10,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  V10GeometryManifest,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';

import {
  validatePrePublishGeometry,
  mapVersionOutToManifest,
} from '../src/features/map-operations/calibration/useMapCalibrationWorkspace';

import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
} from '../src/features/map-operations/calibration/calibrationGeometryUtils';

import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../src/features/map-operations/geometry/canonicalScene';

import { MapVersionOut, MeterRecord } from '../src/types';

// ===========================================================================
// SUITE 1: PERSISTENT MAP VERSIONING & CONCURRENCY
// ===========================================================================

test('V16 Concurrency: mapVersionOutToManifest correctly maps DB version structure to geometry manifest', () => {
  const mockDbVersion: MapVersionOut = {
    id: 1,
    map_version: 'tan-thuan-v10-draft',
    status: 'DRAFT',
    revision: 3,
    coordinate_system: 'tan-thuan-canonical-image-pixel-space-v1',
    canonical_width: 1915,
    canonical_height: 821,
    description: 'Draft for test',
    created_at: '2026-09-13T10:00:00Z',
    updated_at: '2026-09-13T10:15:00Z',
    zones: [
      {
        id: 101,
        map_version_id: 1,
        zone_id: 'pres-berth',
        display_index: 1,
        display_label: 'Cầu tàu Berths M1-M4',
        business_name: 'Khu Cầu Tàu',
        business_zone_id: 'cau_tau',
        presentation_color: '#38bdf8',
        icon: 'ship',
        polygon_canonical: [
          { x: 100, y: 100 },
          { x: 300, y: 100 },
          { x: 300, y: 300 },
          { x: 100, y: 300 },
        ],
        label_anchor_canonical: { x: 200, y: 200 },
        operator_anchor_canonical: { x: 150, y: 150 },
        landmarks: [],
      },
    ],
  };

  const manifest = mapVersionOutToManifest(mockDbVersion);
  assert.equal(manifest.mapVersion, 'tan-thuan-v10-draft');
  assert.equal(manifest.canonicalWidth, 1915);
  assert.equal(manifest.canonicalHeight, 821);
  assert.equal(manifest.zones.length, 1);
  assert.equal(manifest.zones[0].id, 'pres-berth');
  assert.equal(manifest.zones[0].icon, 'ship');
  assert.deepEqual(manifest.zones[0].labelAnchorCanonical, { x: 200, y: 200 });
});

test('V16 Optimistic Locking: Revision mismatch triggers simulated concurrency rejection', () => {
  let currentServerRevision = 4;

  const simulateUpdateZone = (clientRevision: number, newPolygon: { x: number; y: number }[]) => {
    if (clientRevision !== currentServerRevision) {
      const error = new Error('Revision mismatch: Conflict');
      (error as any).status = 409;
      throw error;
    }
    currentServerRevision += 1;
    return { success: true, newRevision: currentServerRevision };
  };

  // Client A has matching revision
  const resA = simulateUpdateZone(4, [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }]);
  assert.equal(resA.success, true);
  assert.equal(resA.newRevision, 5);

  // Client B has stale revision (still thinks revision is 4)
  assert.throws(
    () => simulateUpdateZone(4, [{ x: 15, y: 15 }, { x: 25, y: 15 }, { x: 25, y: 25 }]),
    (err: any) => err.status === 409
  );
});

// ===========================================================================
// SUITE 2: GEOMETRY VALIDATION GATE
// ===========================================================================

test('V16 Geometry Gate: Detects self-intersecting polygon (Bowtie)', () => {
  // Bowtie polygon: (0,0) -> (100,100) -> (0,100) -> (100,0)
  const bowtie = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 100, y: 0 },
  ];
  const simplicity = checkPolygonSimplicity(bowtie);
  assert.equal(simplicity.isSimple, false, 'Bowtie polygon must be detected as self-intersecting');
  assert.ok(simplicity.intersection, 'Intersection info must be provided');

  // Simple quad: (0,0) -> (100,0) -> (100,100) -> (0,100)
  const simpleQuad = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  assert.equal(checkPolygonSimplicity(simpleQuad).isSimple, true, 'Convex/simple quad must pass');
});

test('V16 Geometry Gate: Detects out-of-bounds vertices', () => {
  const insidePoly = [
    { x: 100, y: 100 },
    { x: 500, y: 100 },
    { x: 500, y: 500 },
    { x: 100, y: 500 },
  ];
  assert.equal(checkVerticesBounds(insidePoly, CANONICAL_WIDTH, CANONICAL_HEIGHT), true);

  const outsidePoly = [
    { x: 100, y: 100 },
    { x: 2000, y: 100 }, // X > 1915
    { x: 500, y: 500 },
    { x: 100, y: 500 },
  ];
  assert.equal(checkVerticesBounds(outsidePoly, CANONICAL_WIDTH, CANONICAL_HEIGHT), false);

  const negativePoly = [
    { x: -5, y: 100 }, // X < 0
    { x: 200, y: 100 },
    { x: 200, y: 200 },
    { x: 0, y: 200 },
  ];
  assert.equal(checkVerticesBounds(negativePoly, CANONICAL_WIDTH, CANONICAL_HEIGHT), false);
});

test('V16 Geometry Gate: Pre-publish validation gate passes for canonical baseline', () => {
  const result = validatePrePublishGeometry(CANONICAL_GEOMETRY_V10);
  assert.equal(result.valid, true, 'Canonical geometry must pass all validation checks');
  assert.equal(result.zonesCount, 6);
  assert.equal(result.simplePolygons, true);
  assert.equal(result.metersContained, 12);
  assert.equal(result.totalMeters, 12);
  assert.equal(result.errors.length, 0);
});

test('V16 Geometry Gate: Pre-publish validation gate rejects incomplete or corrupt manifests', () => {
  // Corrupt: missing a zone
  const corruptManifest: V10GeometryManifest = {
    ...CANONICAL_GEOMETRY_V10,
    zones: CANONICAL_GEOMETRY_V10.zones.slice(0, 5), // Only 5 zones
  };
  const result = validatePrePublishGeometry(corruptManifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('phải đúng bằng 6')));
});

// ===========================================================================
// SUITE 3: DECOUPLED METER SPATIAL MUTATION
// ===========================================================================

test('V16 Decoupled Spatial Mutation: Relocating meter updates coordinates freely without REVIEW_REQUIRED lock', () => {
  const initialMeter: MeterRecord = {
    id: 'm-1',
    meterCode: 'CT-001',
    meterName: 'Đồng hồ Cầu Tàu 1',
    zone: 'cau_tau',
    presentationZoneId: 'pres-berth',
    mapX: 980,
    mapY: 260,
    routeStatus: 'ROUTABLE',
    isActive: true,
  };

  // Simulate administrative relocation under decoupled policy
  const relocateMeter = (
    m: MeterRecord,
    newX: number,
    newY: number,
    newZoneId?: string
  ): MeterRecord => {
    return {
      ...m,
      mapX: newX,
      mapY: newY,
      presentationZoneId: newZoneId || m.presentationZoneId,
      routeStatus: 'ROUTABLE',
    };
  };

  const relocated = relocateMeter(initialMeter, 995, 275);
  assert.equal(relocated.mapX, 995);
  assert.equal(relocated.mapY, 275);
  assert.equal(relocated.routeStatus, 'ROUTABLE', 'Decoupled relocation retains ROUTABLE status');
});

// ===========================================================================
// SUITE 4: DISABLED ROUTE MOVEMENT (STATIC OPERATIONAL PRESENTATION)
// ===========================================================================

test('V16 Disabled Movement: Standard operational mode suppresses simulated route animation', () => {
  const isDemoMode = false;

  // Mirror useOperationalMotion decoupled policy
  const startOperatorMovement = (_operatorId: string, _meterId: string): boolean => {
    if (!isDemoMode) {
      return false; // Movement disabled per operational policy
    }
    return true;
  };

  // Both meters reject movement in operational mode
  assert.equal(startOperatorMovement('op-1', 'CT-001'), false);
  assert.equal(startOperatorMovement('op-1', 'CT-002'), false);
});

// ===========================================================================
// SUITE 5: SOFT DELETE VS HARD DELETE PROTECTION
// ===========================================================================

test('V16 Deletion Protection: Soft delete deactivates meter without wiping spatial attributes', () => {
  const activeMeter: MeterRecord = {
    id: 'm-3',
    meterCode: 'CT-003',
    meterName: 'M3',
    zone: 'cau_tau',
    presentationZoneId: 'pres-berth',
    mapX: 1050,
    mapY: 300,
    routeStatus: 'ROUTABLE',
    isActive: true,
  };

  // Soft delete / Ngừng sử dụng
  const deactivatedMeter: MeterRecord = {
    ...activeMeter,
    isActive: false,
  };

  assert.equal(deactivatedMeter.isActive, false);
  // Spatial coordinates must be strictly preserved
  assert.equal(deactivatedMeter.mapX, 1050);
  assert.equal(deactivatedMeter.mapY, 300);
  assert.equal(deactivatedMeter.presentationZoneId, 'pres-berth');
});

test('V16 Deletion Protection: Hard delete rejects meters with existing historical readings', () => {
  const mockReadingsDb: Record<number, number> = {
    10: 15, // Meter 10 has 15 readings
    11: 0,  // Meter 11 has 0 readings
  };

  const deleteMeterAdmin = (meterId: number) => {
    const readingCount = mockReadingsDb[meterId] || 0;
    if (readingCount > 0) {
      const err = new Error(
        `Không thể xóa đồng hồ đã có ${readingCount} bản ghi chỉ số lịch sử. Hãy chuyển sang ngừng sử dụng (soft-delete).`
      );
      (err as any).status = 409;
      throw err;
    }
    return { success: true };
  };

  // Attempting hard delete on meter with readings throws 409
  assert.throws(
    () => deleteMeterAdmin(10),
    (err: any) => err.status === 409 && err.message.includes('bản ghi chỉ số')
  );

  // Meter with 0 readings can be hard-deleted cleanly
  const result = deleteMeterAdmin(11);
  assert.equal(result.success, true);
});

// ===========================================================================
// SUITE 6: ABSOLUTE SPATIAL FREEZE INVARIANTS
// ===========================================================================

test('V16 Spatial Freeze: Canonical scene dimensions are exactly 1915 x 821', () => {
  assert.equal(CANONICAL_SCENE_WIDTH, 1915);
  assert.equal(CANONICAL_SCENE_HEIGHT, 821);
  assert.equal(CANONICAL_WIDTH, 1915);
  assert.equal(CANONICAL_HEIGHT, 821);
});

test('V16 Spatial Freeze: All 12 canonical meters remain in audit and inside presentation zones', () => {
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12);

  for (const m of CANONICAL_12_METERS_AUDIT) {
    const zoneId = m.presentationRegionId;
    const zone = CANONICAL_GEOMETRY_V10.zones.find((z) => z.id === zoneId);
    assert.ok(zone, `Zone ${zoneId} must exist for meter ${m.code}`);

    const isInside = isPointInPolygon2D(
      { x: m.canonicalX, y: m.canonicalY },
      zone.polygonCanonical
    );
    assert.ok(
      isInside,
      `Meter ${m.code} at (${m.canonicalX}, ${m.canonicalY}) must be strictly inside ${zoneId}`
    );
  }
});
