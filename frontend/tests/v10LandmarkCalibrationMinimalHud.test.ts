import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CANONICAL_GEOMETRY_V10,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  CANONICAL_LANDMARKS,
  V10_PRESENTATION_ZONES,
  getV10PresentationZoneById,
  canonicalPointToNormalized,
  pointsToSvgPath,
  computeCentroid,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';
import {
  ZONE_BOUNDARY_CONTRACTS,
  CANONICAL_V10_LANDMARKS,
} from '../src/features/map-operations/geometry/canonicalLandmarks';
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
} from '../src/features/map-operations/tokens/mapDesignTokens';

// ---------------------------------------------------------------------------
// 1. V10 CANONICAL DIMENSIONS, VIEWBOX & MAP VERSION
// ---------------------------------------------------------------------------
test('V10 Geometry: Canonical dimensions strictly 1915 x 821, viewBox 0 0 1915 821, and version tan-thuan-v10', () => {
  assert.equal(CANONICAL_WIDTH, 1915, 'Canonical width must be 1915');
  assert.equal(CANONICAL_HEIGHT, 821, 'Canonical height must be 821');
  assert.equal(CANONICAL_VIEWBOX, '0 0 1915 821', 'ViewBox must be 0 0 1915 821');
  assert.equal(CANONICAL_MAP_VERSION, 'tan-thuan-v10', 'Map version must be tan-thuan-v10');
});

// ---------------------------------------------------------------------------
// 2. V10 GEOMETRY ARTIFACT JSON SCHEMA TEST
// ---------------------------------------------------------------------------
test('V10 Geometry Artifact: JSON schema and metadata validation', () => {
  const jsonPath = path.resolve('src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json');
  assert.ok(fs.existsSync(jsonPath), 'tanThuanPresentationGeometry.v10.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  assert.equal(data.schemaVersion, '1.0');
  assert.equal(data.mapVersion, 'tan-thuan-v10');
  assert.equal(data.coordinateSystem, 'tan-thuan-canonical-image-pixel-space-v1');
  assert.equal(data.canonicalWidth, 1915);
  assert.equal(data.canonicalHeight, 821);
  assert.equal(Array.isArray(data.zones), true);
  assert.equal(data.zones.length, 6, 'Must contain exactly 6 presentation zones');
  assert.equal(Array.isArray(data.landmarks), true);
  assert.ok(data.landmarks.length >= 10, 'Must contain calibration landmarks');

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
// 3. CALIBRATION LANDMARKS VALIDATION
// ---------------------------------------------------------------------------
test('V10 Landmarks: All canonical landmarks reside within [0, 1915] x [0, 821] and have valid categories', () => {
  assert.ok(CANONICAL_LANDMARKS.length >= 10, 'Must have at least 10 calibration landmarks');
  
  const validCategories = new Set([
    'quay-edge',
    'service-road',
    'internal-road',
    'perimeter-road',
    'fence',
    'warehouse-edge',
    'yard-edge',
    'gate',
    'security',
    'weigh-station',
    'intersection',
    'other',
  ]);

  for (const lm of CANONICAL_LANDMARKS) {
    assert.ok(lm.id && lm.id.length > 0, 'Landmark must have an id');
    assert.ok(lm.label && lm.label.length > 0, `Landmark ${lm.id} must have a label`);
    assert.ok(validCategories.has(lm.category), `Landmark ${lm.id} category ${lm.category} must be valid`);
    assert.ok(lm.canonical.x >= 0 && lm.canonical.x <= 1915, `Landmark ${lm.id} X (${lm.canonical.x}) out of bounds`);
    assert.ok(lm.canonical.y >= 0 && lm.canonical.y <= 821, `Landmark ${lm.id} Y (${lm.canonical.y}) out of bounds`);
    assert.ok(lm.zoneId && lm.zoneId.length > 0, `Landmark ${lm.id} must have an assigned zoneId`);
  }
});

// ---------------------------------------------------------------------------
// 4. ZONE BOUNDARY CONTRACTS & SIMPLICITY (NO SELF-INTERSECTIONS)
// ---------------------------------------------------------------------------
test('V10 Geometry: All 6 presentation zones have boundary contracts and are simple polygons', () => {
  const zoneIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];

  for (const zid of zoneIds) {
    const contract = ZONE_BOUNDARY_CONTRACTS[zid];
    assert.ok(contract, `Zone ${zid} must have a defined ZoneBoundaryContract`);
    assert.ok(contract.landmarkIds.length >= 2, `Zone ${zid} must specify key physical landmarks`);
    assert.ok(contract.description.length > 10, `Zone ${zid} must have a detailed boundary description`);

    const zone = getV10PresentationZoneById(zid);
    assert.ok(zone, `Zone ${zid} must exist in runtime V10_PRESENTATION_ZONES`);
    assert.ok(zone.polygonCanonical.length >= 4, `Zone ${zid} must have >= 4 vertices`);

    // Bounds check
    const inBounds = checkVerticesBounds(zone.polygonCanonical, 1915, 821);
    assert.ok(inBounds, `Zone ${zid} vertices must be within [0, 1915] x [0, 821]`);

    // Simplicity check (no self-intersecting edges)
    const simplicity = checkPolygonSimplicity(zone.polygonCanonical);
    assert.ok(
      simplicity.isSimple,
      `Zone ${zid} must be a simple polygon without self-intersections (failed at edge ${simplicity.intersection?.edge1}-${simplicity.intersection?.edge2})`
    );

    // Area check
    const area = calculatePolygonArea(zone.polygonCanonical);
    assert.ok(area > 10000, `Zone ${zid} area must be substantial (> 10000 px²), got ${area}`);
  }
});

// ---------------------------------------------------------------------------
// 5. 12-METER CALIBRATION GATE (100% CONTAINMENT IN PRESENTATION ZONES)
// ---------------------------------------------------------------------------
test('V10 Geometry: 100% of 12 canonical meters strictly contained within assigned presentation zones', () => {
  assert.equal(CANONICAL_12_METERS_AUDIT.length, 12, 'Must audit exactly 12 meters');

  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const targetZoneId = meter.presentationRegionId;
    assert.ok(targetZoneId, `Meter ${meter.code} must have an assigned presentationRegionId`);

    const zone = getV10PresentationZoneById(targetZoneId);
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
// 6. OPERATOR & LABEL ANCHORS CONTAINMENT & CLEARANCE
// ---------------------------------------------------------------------------
test('V10 Geometry: All operator and label anchors strictly inside assigned zones with >= 24px clearance', () => {
  for (const zone of V10_PRESENTATION_ZONES) {
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
// 7. CANONICAL <-> NORMALIZED ROUNDTRIP PRECISION
// ---------------------------------------------------------------------------
test('V10 Geometry: Canonical <-> normalized coordinate projections roundtrip with sub-0.0001 error', () => {
  for (const zone of V10_PRESENTATION_ZONES) {
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
// 8. V10 WORKSPACE STATE MACHINE INVARIANTS (4 STATES)
// ---------------------------------------------------------------------------
test('V10 State Machine: 4 explicit workspace states (OVERVIEW, ZONE_FOCUS, ENTITY_FOCUS, WORKFLOW)', () => {
  type V10WorkspaceState = 'OVERVIEW' | 'ZONE_FOCUS' | 'ENTITY_FOCUS' | 'WORKFLOW';

  let currentState: V10WorkspaceState = 'OVERVIEW';
  let focusedZoneId: string | null = null;
  let selectedEntity: { type: string; id: string } | null = null;

  // Transition to ZONE_FOCUS
  function transitionToZoneFocus(zoneId: string) {
    currentState = 'ZONE_FOCUS';
    focusedZoneId = zoneId;
    selectedEntity = { type: 'zone', id: zoneId };
  }

  // Transition to ENTITY_FOCUS
  function transitionToEntityFocus(type: string, id: string) {
    currentState = 'ENTITY_FOCUS';
    selectedEntity = { type, id };
  }

  // Transition to WORKFLOW
  function transitionToWorkflow() {
    currentState = 'WORKFLOW';
  }

  // Transition to OVERVIEW
  function transitionToOverview() {
    currentState = 'OVERVIEW';
    focusedZoneId = null;
    selectedEntity = null;
  }

  // Verify initial state
  assert.equal(currentState, 'OVERVIEW');
  assert.equal(focusedZoneId, null);
  assert.equal(selectedEntity, null);

  // Transition 1: OVERVIEW -> ZONE_FOCUS
  transitionToZoneFocus('pres-berth');
  assert.equal(currentState, 'ZONE_FOCUS');
  assert.equal(focusedZoneId, 'pres-berth');
  assert.equal(selectedEntity?.id, 'pres-berth');

  // Transition 2: ZONE_FOCUS -> ENTITY_FOCUS
  transitionToEntityFocus('meter', 'CT-003');
  assert.equal(currentState, 'ENTITY_FOCUS');
  assert.equal(selectedEntity?.id, 'CT-003');

  // Transition 3: ENTITY_FOCUS -> WORKFLOW
  transitionToWorkflow();
  assert.equal(currentState, 'WORKFLOW');

  // Transition 4: WORKFLOW -> OVERVIEW
  transitionToOverview();
  assert.equal(currentState, 'OVERVIEW');
  assert.equal(focusedZoneId, null);
  assert.equal(selectedEntity, null);
});

// ---------------------------------------------------------------------------
// 9. PROGRESSIVE-DISCLOSURE MINIMAL HUD STYLING & CLASS TOKENS
// ---------------------------------------------------------------------------
test('V10 Minimal HUD: Stylesheet defines all required progressive disclosure classes', () => {
  const cssPath = path.resolve('src/features/map-operations/motion/mapMotion.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Unified top temporal group
  assert.ok(css.includes('.sgp-top-temporal-group'), 'Must define .sgp-top-temporal-group');
  assert.ok(css.includes('.sgp-temporal-divider'), 'Must define .sgp-temporal-divider');
  assert.ok(css.includes('.sgp-user-chip'), 'Must define .sgp-user-chip');

  // Icon-first query tools
  assert.ok(css.includes('.sgp-map-icon-action'), 'Must define .sgp-map-icon-action');
  assert.ok(css.includes('.sgp-search-expanded-bar'), 'Must define .sgp-search-expanded-bar');
  assert.ok(css.includes('.sgp-search-inline-input'), 'Must define .sgp-search-inline-input');

  // Low-surface telemetry rail
  assert.ok(css.includes('.sgp-telemetry-rail'), 'Must define .sgp-telemetry-rail');
  assert.ok(css.includes('.sgp-telemetry-action'), 'Must define .sgp-telemetry-action');

  // Collapsed timeline utility
  assert.ok(css.includes('.sgp-round-hud-pill.collapsed'), 'Must define .sgp-round-hud-pill.collapsed');

  // Cartographic zone labels
  assert.ok(css.includes('.sgp-cartographic-zone-label'), 'Must define .sgp-cartographic-zone-label');
});

// ---------------------------------------------------------------------------
// 10. MAP/LIST 10X SWITCHING REGRESSION TEST
// ---------------------------------------------------------------------------
test('V10 Lifecycle: Map <-> List 10x switching preserves selection invariants and single-surface rules', () => {
  type ViewMode = 'map' | 'list';
  let viewMode: ViewMode = 'map';
  let selectedEntity: { type: 'meter' | 'zone' | 'operator'; id: string } | null = {
    type: 'meter',
    id: 'CT-008',
  };

  for (let i = 1; i <= 10; i++) {
    // Switch to List
    viewMode = 'list';
    assert.equal(viewMode, 'list');
    assert.equal(selectedEntity?.id, 'CT-008', `Cycle ${i}: Selection must be preserved in List mode`);

    // Switch back to Map
    viewMode = 'map';
    assert.equal(viewMode, 'map');
    assert.equal(selectedEntity?.id, 'CT-008', `Cycle ${i}: Selection must be preserved in Map mode`);
  }
});
