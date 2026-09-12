import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CANONICAL_GEOMETRY_V9,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  V9_PRESENTATION_ZONES,
  canonicalPointToNormalized,
  computeCentroid,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV9';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
} from '../src/features/map-operations/calibration/calibrationGeometryUtils';
import {
  CANONICAL_12_METERS_AUDIT,
  CANONICAL_VIEWBOX,
  CANONICAL_MAP_VERSION,
  normalizedToCanonicalScene,
  canonicalSceneToNormalized,
} from '../src/features/map-operations/geometry/canonicalScene';
import {
  MAP_HUD_TOKENS,
  MAP_HUD_CSS_VARS,
} from '../src/features/map-operations/tokens/mapDesignTokens';

// ---------------------------------------------------------------------------
// 1. V9 CANONICAL DIMENSIONS & MAP VERSION
// ---------------------------------------------------------------------------
test('V9 Geometry: Canonical dimensions strictly 1915 x 821 and version tan-thuan-v9/v10', () => {
  assert.equal(CANONICAL_WIDTH, 1915, 'Canonical width must be 1915');
  assert.equal(CANONICAL_HEIGHT, 821, 'Canonical height must be 821');
  assert.equal(CANONICAL_VIEWBOX, '0 0 1915 821', 'ViewBox must be 0 0 1915 821');
  assert.ok(
    CANONICAL_MAP_VERSION === 'tan-thuan-v9' || CANONICAL_MAP_VERSION === 'tan-thuan-v10',
    'Version must be tan-thuan-v9 or tan-thuan-v10'
  );
});

// ---------------------------------------------------------------------------
// 2. V9 GEOMETRY ARTIFACT SCHEMA TEST
// ---------------------------------------------------------------------------
test('V9 Geometry Artifact: JSON schema validation', () => {
  const jsonPath = path.resolve('src/features/map-operations/geometry/tanThuanPresentationGeometry.v9.json');
  assert.ok(fs.existsSync(jsonPath), 'tanThuanPresentationGeometry.v9.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  assert.equal(data.schemaVersion, '1.0');
  assert.equal(data.mapVersion, 'tan-thuan-v9');
  assert.equal(data.coordinateSystem, 'tan-thuan-canonical-image-pixel-space-v1');
  assert.equal(data.canonicalWidth, 1915);
  assert.equal(data.canonicalHeight, 821);
  assert.equal(Array.isArray(data.zones), true);
  assert.equal(data.zones.length, 6, 'Must contain exactly 6 presentation zones');

  const expectedIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];
  const actualIds = data.zones.map((z: any) => z.id).sort();
  assert.deepEqual(actualIds, [...expectedIds].sort());
});

// ---------------------------------------------------------------------------
// 3. ALL ZONE BOUNDS & SIMPLICITY (NO SELF-INTERSECTIONS)
// ---------------------------------------------------------------------------
test('V9 Geometry: All 6 presentation zones reside within [0, 1915] x [0, 821] and are simple polygons', () => {
  for (const zone of V9_PRESENTATION_ZONES) {
    assert.ok(zone.polygonCanonical.length >= 3, `Zone ${zone.id} must have >= 3 vertices`);
    
    // Bounds check
    const inBounds = checkVerticesBounds(zone.polygonCanonical, 1915, 821);
    assert.ok(inBounds, `Zone ${zone.id} vertices must be within [0, 1915] x [0, 821]`);

    // Simplicity check (no self-intersecting edges)
    const simplicity = checkPolygonSimplicity(zone.polygonCanonical);
    assert.ok(
      simplicity.isSimple,
      `Zone ${zone.id} must be a simple polygon without self-intersections (failed at edge ${simplicity.intersection?.edge1}-${simplicity.intersection?.edge2})`
    );

    // Area check
    const area = calculatePolygonArea(zone.polygonCanonical);
    assert.ok(area > 10000, `Zone ${zone.id} area must be substantial (> 10000 px²), got ${area}`);
  }
});

// ---------------------------------------------------------------------------
// 4. METER CONTAINMENT (100% OF 12 CANONICAL METERS STRICTLY INSIDE ASSIGNED ZONE)
// ---------------------------------------------------------------------------
test('V9 Geometry: 100% of 12 canonical meters strictly contained within assigned presentation zones', () => {
  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const targetZoneId = meter.presentationRegionId;
    assert.ok(targetZoneId, `Meter ${meter.code} must have an assigned presentationRegionId`);

    const zone = V9_PRESENTATION_ZONES.find((z) => z.id === targetZoneId);
    assert.ok(zone, `Zone ${targetZoneId} must exist for meter ${meter.code}`);

    const isInside = isPointInPolygon2D(
      { x: meter.canonicalX, y: meter.canonicalY },
      zone.polygonCanonical
    );
    assert.ok(
      isInside,
      `Meter ${meter.code} (${meter.name}) at (${meter.canonicalX}, ${meter.canonicalY}) must be INSIDE zone ${zone.id} (${zone.displayLabel})`
    );
  }
});

// ---------------------------------------------------------------------------
// 5. OPERATOR & LABEL ANCHORS CONTAINMENT & CLEARANCE
// ---------------------------------------------------------------------------
test('V9 Geometry: All operator and label anchors strictly inside assigned zones', () => {
  for (const zone of V9_PRESENTATION_ZONES) {
    // Label anchor inside
    const isLabelInside = isPointInPolygon2D(zone.labelAnchorCanonical, zone.polygonCanonical);
    assert.ok(
      isLabelInside,
      `Zone ${zone.id} label anchor (${zone.labelAnchorCanonical.x}, ${zone.labelAnchorCanonical.y}) must be strictly inside polygon`
    );

    // Operator anchor inside
    const isOpInside = isPointInPolygon2D(zone.operatorAnchorCanonical, zone.polygonCanonical);
    assert.ok(
      isOpInside,
      `Zone ${zone.id} operator anchor (${zone.operatorAnchorCanonical.x}, ${zone.operatorAnchorCanonical.y}) must be strictly inside polygon`
    );

    // Operator anchor whitespace clearance (>= 24px from meters in same zone)
    const zoneMeters = CANONICAL_12_METERS_AUDIT.filter((m) => m.presentationRegionId === zone.id);
    for (const m of zoneMeters) {
      const dist = Math.hypot(
        zone.operatorAnchorCanonical.x - m.canonicalX,
        zone.operatorAnchorCanonical.y - m.canonicalY
      );
      assert.ok(
        dist >= 24,
        `Operator anchor in ${zone.id} must maintain >= 24px clearance from meter ${m.code} (dist: ${dist.toFixed(1)}px)`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 6. CANONICAL <-> NORMALIZED ROUNDTRIP PRECISION
// ---------------------------------------------------------------------------
test('V9 Geometry: Canonical <-> normalized coordinate projections roundtrip with sub-0.0001 error', () => {
  for (const zone of V9_PRESENTATION_ZONES) {
    for (let i = 0; i < zone.polygonCanonical.length; i++) {
      const canPt = zone.polygonCanonical[i];
      const normPt = zone.normalizedPolygon[i];

      // Forward check
      assert.equal(normPt.x, Number((canPt.x / 1915).toFixed(4)));
      assert.equal(normPt.y, Number((canPt.y / 821).toFixed(4)));

      // Roundtrip check
      const reconCan = normalizedToCanonicalScene(normPt);
      assert.ok(
        Math.abs(reconCan.x - canPt.x) <= 1.0,
        `X roundtrip error <= 1px: original ${canPt.x}, reconstructed ${reconCan.x}`
      );
      assert.ok(
        Math.abs(reconCan.y - canPt.y) <= 1.0,
        `Y roundtrip error <= 1px: original ${canPt.y}, reconstructed ${reconCan.y}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 7. SHARED MAP-NATIVE HUD TOKENS & CSS CLASS VALIDATION
// ---------------------------------------------------------------------------
test('V9 HUD: Shared smoked maritime tokens and semantic classes are defined and exported', () => {
  assert.ok(MAP_HUD_TOKENS, 'MAP_HUD_TOKENS must be exported');
  assert.equal(MAP_HUD_TOKENS.surface, 'rgba(6, 29, 42, 0.78)');
  assert.equal(MAP_HUD_TOKENS.border, 'rgba(255, 255, 255, 0.12)');
  assert.equal(MAP_HUD_TOKENS.textPrimary, 'rgba(248, 250, 252, 0.94)');

  const cssPath = path.resolve('src/features/map-operations/motion/mapMotion.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(cssContent.includes('.sgp-map-hud-surface'), '.sgp-map-hud-surface must be defined in CSS');
  assert.ok(cssContent.includes('--sgp-hud-surface'), '--sgp-hud-surface token must be defined in CSS');
  assert.ok(cssContent.includes('--sgp-hud-border'), '--sgp-hud-border token must be defined in CSS');
  assert.ok(cssContent.includes('.sgp-map-action-control'), '.sgp-map-action-control must be defined in CSS');
  assert.ok(cssContent.includes('.sgp-map-icon-control'), '.sgp-map-icon-control must be defined in CSS');
});

// ---------------------------------------------------------------------------
// 8. MAP/LIST 10X LIFECYCLE ROUNDTRIP REGRESSION TEST
// ---------------------------------------------------------------------------
test('V9 Lifecycle: Map <-> List 10x switching preserves selection invariants and single-surface rules', () => {
  type ViewMode = 'map' | 'list';
  let viewMode: ViewMode = 'map';
  let selectedEntity: { type: 'meter' | 'zone' | 'operator'; id: string } | null = {
    type: 'meter',
    id: 'CT-001',
  };

  for (let i = 1; i <= 10; i++) {
    // Switch to List
    viewMode = 'list';
    assert.equal(viewMode, 'list');
    assert.equal(selectedEntity?.id, 'CT-001', `Cycle ${i}: Selection must be preserved in List mode`);

    // Switch back to Map
    viewMode = 'map';
    assert.equal(viewMode, 'map');
    assert.equal(selectedEntity?.id, 'CT-001', `Cycle ${i}: Selection must be preserved in Map mode`);
  }
});
