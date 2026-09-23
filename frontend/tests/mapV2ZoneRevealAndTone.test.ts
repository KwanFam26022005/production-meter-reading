import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

function calcSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function pointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i];
    const [xj, yj] = vs[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// -----------------------------------------------------------------------------
// SCENARIO 1: Zone Anchors Configuration & Geometry Invariants
// -----------------------------------------------------------------------------
test('Scenario 1: Zone anchors are defined for all 7 polygons and strictly inside geometry', async () => {
  const anchorsModule = await import('../src/components/map-v2/zoneAnchors.js').catch(async () => {
    return await import('../src/components/map-v2/zoneAnchors.ts');
  });
  const { ZONE_ANCHORS, getZoneAnchor, computeZoneBoundingRadius } = anchorsModule;

  assert.equal(ZONE_ANCHORS.length, 7, 'Must define exactly 7 zone anchors for the 7 canonical polygons');

  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const expectedZoneIds = [
    'ZONE_QUAY',
    'ZONE_GENERAL',
    'ZONE_CONTAINER',
    'BLDG_KHO_1',
    'BLDG_KHO_2',
    'BLDG_KHO_4',
    'ZONE_ADMIN',
  ];

  for (const zoneId of expectedZoneIds) {
    const anchor = getZoneAnchor(zoneId);
    assert.ok(anchor, `Anchor for ${zoneId} must exist`);
    assert.equal(anchor.zoneId, zoneId);
    assert.ok(anchor.label.length > 0, 'Anchor must have non-empty label');
    assert.ok(anchor.code.length > 0, 'Anchor must have short identification code');
    assert.ok(anchor.description.length > 0, 'Anchor must have descriptive text');

    // Find matching polygon in canonical JSON
    const poly = data.polygons.find((p: { id: string }) => p.id === zoneId);
    assert.ok(poly, `Polygon ${zoneId} must exist in manifest`);

    // Verify anchor point is strictly inside polygon boundaries
    const isInside = pointInPolygon(anchor.point, poly.vertices);
    assert.equal(
      isInside,
      true,
      `Anchor [${anchor.point[0]}, ${anchor.point[1]}] for ${zoneId} must reside strictly inside polygon vertices`
    );

    // Verify bounding radius calculation produces valid positive radius
    const radius = computeZoneBoundingRadius(poly.vertices, anchor.point);
    assert.ok(radius > 50 && radius < 1500, `Bounding radius for ${zoneId} must be realistic, got ${radius}`);
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 2: Operational View Mode Invariant (Hidden-by-default geometry & Hotspots)
// -----------------------------------------------------------------------------
test('Scenario 2: Operational view mode defaults to hidden clutter with interactive hotspots', () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  // Default interactionMode is 'operational'
  assert.ok(
    workspaceContent.includes("useState<MapV2InteractionMode>('operational')"),
    "Default interactionMode must be 'operational'"
  );

  // Operational toggle button exists
  assert.ok(
    workspaceContent.includes("setInteractionMode('operational')"),
    "Workspace must provide button to switch to 'operational' mode"
  );
  assert.ok(
    workspaceContent.includes('<span>Vận hành</span>'),
    "Workspace must render 'Vận hành' segmented button"
  );

  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Verify layer-zone-anchors is rendered when showAnchors is true
  assert.ok(
    canvasContent.includes('id="layer-zone-anchors"'),
    'Canvas must render zone anchors group'
  );
  assert.ok(
    canvasContent.includes('map-v2-anchor-radar'),
    'Anchor markers must include radar pulse wave indicator'
  );
  assert.ok(
    canvasContent.includes('map-v2-anchor-badge'),
    'Anchor markers must include core badge'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Zone Reveal Animation Contract
// -----------------------------------------------------------------------------
test('Scenario 3: Zone reveal animation contract uses SVG clipPath, ripple wave, and smooth transitions', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Verify reveal clipPath definition and usage
  assert.ok(
    canvasContent.includes('id={`v2-reveal-clip-${activeRevealedPolygon.id}`}'),
    'Canvas must create dynamic SVG clipPath for selected polygon'
  );
  assert.ok(
    canvasContent.includes('map-v2-reveal-circle'),
    'Reveal clipPath must use animated circle element'
  );
  assert.ok(
    canvasContent.includes('map-v2-reveal-wave'),
    'Canvas must render animated energy ripple wavefront'
  );
  assert.ok(
    canvasContent.includes('clipPath={`url(#v2-reveal-clip-${activeRevealedPolygon.id})`}'),
    'Revealed zone group must bind to the dynamic reveal clipPath'
  );

  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Verify keyframe definitions in CSS
  assert.ok(
    cssContent.includes('@keyframes mapV2RevealCircle'),
    'CSS must define @keyframes mapV2RevealCircle'
  );
  assert.ok(
    cssContent.includes('@keyframes mapV2RevealWave'),
    'CSS must define @keyframes mapV2RevealWave'
  );
  assert.ok(
    cssContent.includes('0.45s') || cssContent.includes('450ms') || cssContent.includes('0.42s'),
    'Reveal animation duration must be between 250ms and 600ms'
  );
  assert.ok(
    cssContent.includes('cubic-bezier'),
    'Reveal animation must use smooth cubic-bezier easing'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Technical Inspection Mode Preservation
// -----------------------------------------------------------------------------
test('Scenario 4: Technical inspection mode renders full geometry and opens coordinate inspector', () => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  // Technical mode button exists
  assert.ok(
    workspaceContent.includes("setInteractionMode('technical')"),
    "Workspace must provide button to switch to 'technical' mode"
  );
  assert.ok(
    workspaceContent.includes('<span>Kiểm tra</span>'),
    "Workspace must render 'Kiểm tra' segmented button"
  );

  // Inspector panel mounted when in technical mode or entity selected
  assert.ok(
    workspaceContent.includes('<MapV2InspectionPanel'),
    'Workspace must render MapV2InspectionPanel for geometry inspection'
  );

  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // In technical mode, all polygons and polylines are rendered
  assert.ok(
    canvasContent.includes('!isOperational && visibility.zones'),
    'All operational zones are rendered simultaneously in technical mode'
  );
  assert.ok(
    canvasContent.includes('!isOperational && visibility.buildings'),
    'All building polygons are rendered simultaneously in technical mode'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Tone Layer V2 / Neon Mode Invariant
// -----------------------------------------------------------------------------
test('Scenario 5: Tone Layer V2 / Neon mode is supported with ingested asset and cyber styling', () => {
  // Verify reference asset ingestion
  const layer2AssetPath = path.resolve(
    __dirname,
    '../src/components/map-v2/assets/map-version3-layer2.png'
  );
  assert.ok(
    fs.existsSync(layer2AssetPath),
    'map-version3-layer2.png must be ingested in map-v2 assets'
  );

  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  // Tone mode toggles exist
  assert.ok(
    workspaceContent.includes("setToneMode('technical')"),
    'Workspace must support switching to Chuẩn kỹ thuật tone mode'
  );
  assert.ok(
    workspaceContent.includes("setToneMode('neon')"),
    'Workspace must support switching to Neon số (Layer 2) tone mode'
  );
  assert.ok(
    workspaceContent.includes('<span>Neon số</span>'),
    'Workspace toolbar must show Neon số button'
  );

  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Neon glow filters in SVG defs
  assert.ok(
    canvasContent.includes('neon-cyan'),
    'SVG defs must include neon cyan glow filter'
  );
  assert.ok(
    canvasContent.includes('neon-magenta'),
    'SVG defs must include neon magenta glow filter'
  );
  assert.ok(
    canvasContent.includes('map-v2-basemap-neon'),
    'Canvas must apply map-v2-basemap-neon class in neon mode'
  );

  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Neon CSS rules
  assert.ok(
    cssContent.includes('.map-v2-container.tone-neon'),
    'CSS must define .map-v2-container.tone-neon dark theme container'
  );
  assert.ok(
    cssContent.includes('.map-v2-basemap-neon'),
    'CSS must define .map-v2-basemap-neon filter'
  );
  assert.ok(
    cssContent.includes('#00f0ff'),
    'Neon mode must utilize electric cyan #00f0ff'
  );
  assert.ok(
    cssContent.includes('#ff2a85'),
    'Neon mode must utilize magenta #ff2a85 accent'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 6: Layer Management Supports All 6 Layers
// -----------------------------------------------------------------------------
test('Scenario 6: Layer visibility controls exist for all 6 layers including anchors', () => {
  const layersPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layersPath, 'utf-8');

  assert.ok(content.includes('baseMap'), 'baseMap layer control must exist');
  assert.ok(content.includes('zones'), 'zones layer control must exist');
  assert.ok(content.includes('buildings'), 'buildings layer control must exist');
  assert.ok(content.includes('roadsAndBoundaries'), 'roadsAndBoundaries layer control must exist');
  assert.ok(content.includes('gates'), 'gates layer control must exist');
  assert.ok(content.includes('anchors'), 'anchors layer control must exist');
  assert.ok(content.includes('Điểm neo phân khu'), 'Label for anchors layer must be present');
});

// -----------------------------------------------------------------------------
// SCENARIO 7: Shared Transform Coordinate Space & Zero Drift
// -----------------------------------------------------------------------------
test('Scenario 7: Single transform group guarantees zero drift for all layers and modes', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(content.includes('CANVAS_WIDTH = 1536'));
  assert.ok(content.includes('CANVAS_HEIGHT = 1024'));
  assert.ok(
    content.includes('transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}'),
    'Canvas must house base image, SVG polygons, polylines, and anchors inside single shared transform group'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Bundle Isolation & Safety
// -----------------------------------------------------------------------------
test('Scenario 8: UserApp does not import or leak Map V2 components or assets', () => {
  const userAppPath = path.resolve(__dirname, '../src/apps/user/UserApp.tsx');
  const userContent = fs.readFileSync(userAppPath, 'utf-8');

  assert.equal(
    userContent.includes('MapV2'),
    false,
    'UserApp.tsx must not import MapV2'
  );
  assert.equal(
    userContent.includes('map-version3-layer2'),
    false,
    'UserApp.tsx must not import map-version3-layer2.png'
  );
  assert.equal(
    userContent.includes('zoneAnchors'),
    false,
    'UserApp.tsx must not import zoneAnchors'
  );
});
