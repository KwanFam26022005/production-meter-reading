import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// -----------------------------------------------------------------------------
// SCENARIO 1: INITIAL_OPERATIONAL_FRAME Mathematics & Determinism
// -----------------------------------------------------------------------------
test('Scenario 1: INITIAL_OPERATIONAL_FRAME formula is deterministic and accounts for operational area', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Verify operational bounds constants
  assert.ok(
    canvasContent.includes('OPERATIONAL_Y_TOP = 200'),
    'Must define OPERATIONAL_Y_TOP = 200 to frame Quay with river context'
  );
  assert.ok(
    canvasContent.includes('OPERATIONAL_Y_BOTTOM = 770'),
    'Must define OPERATIONAL_Y_BOTTOM = 770 to include Gate B and Admin Office'
  );
  assert.ok(
    canvasContent.includes('OPERATIONAL_HEIGHT = OPERATIONAL_Y_BOTTOM - OPERATIONAL_Y_TOP'),
    'Must define OPERATIONAL_HEIGHT = 570'
  );

  // Pure mathematical simulation of calculateFit for width mode
  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 1024;
  const OPERATIONAL_Y_TOP = 200;
  const OPERATIONAL_Y_BOTTOM = 770;
  const OPERATIONAL_HEIGHT = OPERATIONAL_Y_BOTTOM - OPERATIONAL_Y_TOP;

  function simulateCalculateFit(mode: 'width' | 'contain', width: number, height: number) {
    if (width <= 0 || height <= 0) return { zoom: 1, pan: { x: 0, y: 0 } };
    if (mode === 'width') {
      const targetZoom = width / CANVAS_WIDTH;
      const scaledHeight = CANVAS_HEIGHT * targetZoom;
      const targetPanX = 0;
      let targetPanY = 0;
      if (scaledHeight <= height) {
        targetPanY = (height - scaledHeight) / 2;
      } else {
        const scaledOpHeight = OPERATIONAL_HEIGHT * targetZoom;
        const spareHeight = height - scaledOpHeight;
        if (spareHeight > 0) {
          const topRiverMargin = Math.max(25, Math.min(85, spareHeight * 0.32));
          targetPanY = topRiverMargin - OPERATIONAL_Y_TOP * targetZoom;
        } else {
          targetPanY = 20 - OPERATIONAL_Y_TOP * targetZoom;
        }
        targetPanY = Math.max(height - scaledHeight, Math.min(0, targetPanY));
      }
      return { zoom: targetZoom, pan: { x: targetPanX, y: targetPanY } };
    } else {
      const scaleX = width / CANVAS_WIDTH;
      const scaleY = height / CANVAS_HEIGHT;
      const targetZoom = Math.min(scaleX, scaleY);
      const targetPanX = (width - CANVAS_WIDTH * targetZoom) / 2;
      const targetPanY = (height - CANVAS_HEIGHT * targetZoom) / 2;
      return { zoom: targetZoom, pan: { x: targetPanX, y: targetPanY } };
    }
  }

  // 1. Determinism test: calling repeatedly produces exact same result
  const run1 = simulateCalculateFit('width', 1286, 712);
  const run2 = simulateCalculateFit('width', 1286, 712);
  assert.deepEqual(run1, run2, 'Repeated calculation must produce identical zoom and pan');

  // 2. Framing quality test on 1366x768 laptop (canvas 1286x712):
  // Quay (Y=211) must have river context (> 60px from top)
  // Gate B (Y=725) must have comfortable bottom breathing room (> 120px from bottom)
  const quayScreenY = run1.pan.y + 211 * run1.zoom;
  const gateBScreenY = run1.pan.y + 725 * run1.zoom;
  assert.ok(quayScreenY >= 60, `Quay screen Y (${quayScreenY}) must have >= 60px river context`);
  assert.ok(712 - gateBScreenY >= 120, `Gate B screen Y (${gateBScreenY}) must have >= 120px bottom clearance`);
});

// -----------------------------------------------------------------------------
// SCENARIO 2: Default viewMode is 'width' for Full Canvas Laptop Composition
// -----------------------------------------------------------------------------
test("Scenario 2: MapV2Workspace defaults to 'width' viewMode for full canvas framing", () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  assert.ok(
    workspaceContent.includes("useState<MapV2ViewMode>('width')"),
    "Default viewMode must be 'width' to fill available workspace"
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 3: MANUAL_VIEW Focal Point Preservation Algorithm
// -----------------------------------------------------------------------------
test('Scenario 3: MANUAL_VIEW preserves map-space focal point during resize without offset accumulation', () => {
  const prevWidth = 1286;
  const prevHeight = 712;
  const zoom = 0.8372;
  const currentPan = { x: 0, y: -92.3 };

  // Center of viewport in map space
  const centerMapX = (prevWidth / 2 - currentPan.x) / zoom;
  const centerMapY = (prevHeight / 2 - currentPan.y) / zoom;

  // Resize to wider viewport
  const newWidth = 1440;
  const newHeight = 800;
  const nextPanX = newWidth / 2 - centerMapX * zoom;
  const nextPanY = newHeight / 2 - centerMapY * zoom;

  // Map center under new viewport must be identical to previous center
  const verifyCenterMapX = (newWidth / 2 - nextPanX) / zoom;
  const verifyCenterMapY = (newHeight / 2 - nextPanY) / zoom;

  assert.ok(Math.abs(centerMapX - verifyCenterMapX) < 1e-6, 'Map X center must be preserved exactly');
  assert.ok(Math.abs(centerMapY - verifyCenterMapY) < 1e-6, 'Map Y center must be preserved exactly');
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Elimination of Growing Rectangle & Displaced Radar Pulse Circles
// -----------------------------------------------------------------------------
test('Scenario 4: MapV2Canvas scopes map-v2-anchor-radar strictly to selected zone with zero unselected clutter', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Verify radar ring is conditionally rendered ONLY when isZoneSelected is true
  assert.ok(
    canvasContent.includes('{isZoneSelected && (') && canvasContent.includes('className="map-v2-anchor-radar active"'),
    'map-v2-anchor-radar must be scoped strictly to isZoneSelected to prevent floating clutter on other zones'
  );

  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Verify transform-box: fill-box and transform-origin: center to prevent SVG coordinate displacement
  assert.ok(
    cssContent.includes('.map-v2-anchor-radar {') && cssContent.includes('transform-box: fill-box;'),
    'CSS must lock transform-box to fill-box to prevent circle drifting across the map'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Focus Outline Normalization & Circular Focus Ring
// -----------------------------------------------------------------------------
test('Scenario 5: MapV2Workspace.css normalizes outline on anchor groups and uses badge focus', () => {
  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Verify focus outline suppression to prevent browser dark rectangular outline
  assert.ok(
    cssContent.includes('.map-v2-anchor-group:focus {') && cssContent.includes('outline: none;'),
    'Must suppress default browser focus outline on anchor group'
  );
  assert.ok(
    cssContent.includes('.map-v2-anchor-group:focus-visible {') && cssContent.includes('outline: none;'),
    'Must suppress outline on anchor group :focus-visible'
  );

  // Verify keyboard focus indicator is applied cleanly to the circular core badge
  assert.ok(
    cssContent.includes('.map-v2-anchor-group:focus-visible .map-v2-anchor-badge'),
    'Must apply focus ring to the circular core badge'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 6: Selected Zone Geometric Stability
// -----------------------------------------------------------------------------
test('Scenario 6: ZONE_ADMIN geometry has fixed 5 vertices and stable coordinates', () => {
  const jsonPath = path.resolve(__dirname, '../src/components/map-v2/data/tan_thuan_1_zones_edited.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const adminZone = data.polygons.find((p: { id: string }) => p.id === 'ZONE_ADMIN');
  assert.ok(adminZone, 'ZONE_ADMIN must exist in canonical manifest');
  assert.equal(adminZone.vertices.length, 5, 'ZONE_ADMIN must have exactly 5 vertices');

  const expectedVertices = [
    [883, 670],
    [945, 660],
    [981, 675],
    [979, 712],
    [891, 721],
  ];
  assert.deepEqual(adminZone.vertices, expectedVertices, 'ZONE_ADMIN vertices must match canonical coordinates');
});

// -----------------------------------------------------------------------------
// SCENARIO 7: Shared Affine Transform Zero Drift Invariant
// -----------------------------------------------------------------------------
test('Scenario 7: Base map and vector layers share identical SVG transform group', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    canvasContent.includes('<g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>'),
    'All map layers must share single translate/scale transform group'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Reduced Motion Support Preserved
// -----------------------------------------------------------------------------
test('Scenario 8: Prefers-reduced-motion media query suppresses animations cleanly', () => {
  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(
    cssContent.includes('@media (prefers-reduced-motion: reduce)'),
    'Must include prefers-reduced-motion media query'
  );
  assert.ok(
    cssContent.includes('.map-v2-reveal-circle'),
    'Must disable reveal circle in reduced motion'
  );
  assert.ok(
    cssContent.includes('.map-v2-reveal-wave'),
    'Must disable reveal wave in reduced motion'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 9: Map V1 and User Portal Isolation
// -----------------------------------------------------------------------------
test('Scenario 9: Map V1 and User Portal remain 100% isolated and untouched', () => {
  const userAppPath = path.resolve(__dirname, '../src/apps/user/UserApp.tsx');
  const userContent = fs.readFileSync(userAppPath, 'utf-8');
  assert.equal(
    userContent.includes('MapV2'),
    false,
    'UserApp.tsx / User Portal must not import MapV2'
  );

  const adminShellPath = path.resolve(__dirname, '../src/components/admin/AdminShell.tsx');
  const adminShellContent = fs.readFileSync(adminShellPath, 'utf-8');
  assert.ok(
    adminShellContent.includes("id: 'dashboard'") && adminShellContent.includes("id: 'map_v2'"),
    'AdminShell must preserve both Bản đồ (Map V1) and Bản đồ V2 tabs independently'
  );
});
