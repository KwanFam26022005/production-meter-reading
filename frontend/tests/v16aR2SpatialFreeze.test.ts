import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  V10GeometryManifest,
} from '../src/features/map-operations/geometry/tanThuanPresentationGeometryV10';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
} from '../src/features/map-operations/calibration/calibrationGeometryUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FREEZE_EXPORT_PATH = path.resolve(
  __dirname,
  '../../docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json'
);
const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../docs/design/map-operations/v16a-r2/V16A_R2_FREEZE_MANIFEST.json'
);
const OVERLAY_FILE_PATH = path.resolve(
  __dirname,
  '../src/features/map-operations/calibration/MapCalibrationOverlay.tsx'
);

// ===========================================================================
// SUITE: V16A-R2 SPATIAL HUMAN SIGN-OFF & GEOMETRY FREEZE
// ===========================================================================

test('V16A-R2: Frozen spatial baseline contains exactly 6 simple, bounded presentation zones', () => {
  assert.ok(fs.existsSync(FREEZE_EXPORT_PATH), 'Frozen geometry export must exist');
  const freezeData: V10GeometryManifest = JSON.parse(fs.readFileSync(FREEZE_EXPORT_PATH, 'utf-8'));

  assert.equal(freezeData.canonicalWidth, CANONICAL_WIDTH);
  assert.equal(freezeData.canonicalHeight, CANONICAL_HEIGHT);
  assert.equal(freezeData.coordinateSystem, 'tan-thuan-canonical-image-pixel-space-v1');
  assert.equal(freezeData.zones.length, 6, 'Must contain exactly 6 zones');

  const expectedZoneIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];

  for (const expId of expectedZoneIds) {
    const zone = freezeData.zones.find((z) => z.id === expId);
    assert.ok(zone, `Zone ${expId} must exist in frozen baseline`);

    const poly = zone!.polygonCanonical;
    assert.ok(poly.length >= 3, `Zone ${expId} must have >= 3 vertices`);

    // Bounds
    for (const pt of poly) {
      assert.ok(pt.x >= 0 && pt.x <= CANONICAL_WIDTH, `Vertex X out of bounds in ${expId}: ${pt.x}`);
      assert.ok(pt.y >= 0 && pt.y <= CANONICAL_HEIGHT, `Vertex Y out of bounds in ${expId}: ${pt.y}`);
    }

    // Simplicity (no self-intersection)
    const simplicity = checkPolygonSimplicity(poly);
    assert.equal(simplicity.isSimple, true, `Zone ${expId} must be simple polygon`);

    // Area
    const area = calculatePolygonArea(poly);
    assert.ok(area >= 500, `Zone ${expId} area must be >= 500 px^2 (actual: ${area})`);
  }
});

test('V16A-R2: Motion dresscode compliance — zero continuous pulse in calibration overlay', () => {
  assert.ok(fs.existsSync(OVERLAY_FILE_PATH), 'MapCalibrationOverlay file must exist');
  const overlaySource = fs.readFileSync(OVERLAY_FILE_PATH, 'utf-8');

  // Verify that indefinite repeating SVG animate tags are absent
  assert.ok(
    !overlaySource.includes('repeatCount="indefinite"'),
    'Indefinite repeating SVG animation must NOT be present in MapCalibrationOverlay'
  );
  assert.ok(
    !overlaySource.includes('<animate'),
    'Continuous pulse <animate> tags must be removed from uncontained meter halos'
  );

  // Verify presence of static review ring class and bounded transition <= 240ms
  assert.ok(
    overlaySource.includes('sgp-reconciliation-review-ring'),
    'Static amber review ring class must be used for uncontained meters'
  );
  assert.ok(
    overlaySource.includes('220ms'),
    'Review ring emphasis transition must be <= 240ms (using 220ms)'
  );
  assert.ok(
    overlaySource.includes('prefers-reduced-motion'),
    'Must respect prefers-reduced-motion media query'
  );
});

test('V16A-R2: Calibration header displays freeze state and warnings without claiming error', () => {
  const overlaySource = fs.readFileSync(OVERLAY_FILE_PATH, 'utf-8');

  // Must show "Đã xuất bản"
  assert.ok(
    overlaySource.includes('Đã xuất bản'),
    'Header must support displaying "Đã xuất bản"'
  );

  // Must support "mục cần đối soát" for reconciliation warnings
  assert.ok(
    overlaySource.includes('mục cần đối soát'),
    'Header must display "mục cần đối soát" when warnings exist'
  );

  // Must not show "Lỗi kiểm tra" when only warnings are present
  assert.ok(
    overlaySource.includes('workspace?.validationGate?.blockingErrors?.length'),
    'Error badge must be strictly conditioned on blockingErrors length > 0'
  );
});

test('V16A-R2: Meter reconciliation snapshot matches frozen baseline and preserves invariants', () => {
  const METER_RECON_PATH = path.resolve(
    __dirname,
    '../../docs/design/map-operations/v16a-r2/METER_SPATIAL_RECONCILIATION.json'
  );
  assert.ok(fs.existsSync(METER_RECON_PATH), 'Meter reconciliation snapshot must exist');

  const meters = JSON.parse(fs.readFileSync(METER_RECON_PATH, 'utf-8'));
  assert.equal(meters.length, 12, 'Must audit all 12 canonical meters');

  const validMeters = meters.filter((m: any) => m.reviewStatus === 'VALID');
  const reviewMeters = meters.filter((m: any) => m.reviewStatus === 'REVIEW_REQUIRED');

  assert.equal(validMeters.length, 7, 'Exactly 7 meters must be contained');
  assert.equal(reviewMeters.length, 5, 'Exactly 5 meters must require domain review');

  const reviewCodes = reviewMeters.map((m: any) => m.meterCode).sort();
  assert.deepEqual(reviewCodes, ['CT-001', 'CT-007', 'CT-008', 'CT-009', 'CT-010']);

  for (const m of reviewMeters) {
    assert.ok(m.notes, `Meter ${m.meterCode} must include domain review notes`);
    assert.ok(
      m.notes.includes('presentationZone assignment != physical meter position'),
      'Notes must state domain disclaimer'
    );
  }
});
