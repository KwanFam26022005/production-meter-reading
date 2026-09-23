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

// -----------------------------------------------------------------------------
// SCENARIO 1 & 2: Bản đồ V2 appears in the Operations sidebar & Navigates
// -----------------------------------------------------------------------------
test('Scenario 1 & 2: Bản đồ V2 tab is configured in AdminShell next to Bản đồ', () => {
  const adminShellPath = path.resolve(__dirname, '../src/components/admin/AdminShell.tsx');
  const content = fs.readFileSync(adminShellPath, 'utf-8');

  // Verify AdminTab type includes map_v2
  assert.ok(content.includes("'map_v2'"), 'AdminTab union type must include map_v2');

  // Verify primaryNavItems contains map_v2 with label "Bản đồ V2"
  assert.ok(
    content.includes("id: 'map_v2', label: 'Bản đồ V2'"),
    'primaryNavItems must contain map_v2 with label "Bản đồ V2"'
  );

  // Verify positioned directly adjacent to dashboard
  const dashIndex = content.indexOf("id: 'dashboard'");
  const mapV2Index = content.indexOf("id: 'map_v2'");
  assert.ok(dashIndex !== -1 && mapV2Index !== -1, 'Both dashboard and map_v2 must exist in AdminShell');
  assert.ok(mapV2Index > dashIndex, 'map_v2 must be positioned adjacent/following dashboard in navigation');

  // Verify isItemActive handles map_v2 independently
  assert.ok(
    content.includes("if (itemId === 'map_v2')"),
    'isItemActive must handle map_v2 distinctly'
  );

  // Verify OperationsApp mounts MapV2Workspace on map_v2
  const opsAppPath = path.resolve(__dirname, '../src/apps/operations/OperationsApp.tsx');
  const opsContent = fs.readFileSync(opsAppPath, 'utf-8');
  assert.ok(
    opsContent.includes("adminActiveTab === 'map_v2' && <MapV2Workspace />") ||
      opsContent.includes("<MapV2Workspace"),
    'OperationsApp must render MapV2Workspace when active tab is map_v2'
  );
  assert.ok(
    opsContent.includes("'map_v2'"),
    'OperationsApp must accept map_v2 in URL search params and sessionStorage'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 3 & 4: Map V1 remains accessible and untouched
// -----------------------------------------------------------------------------
test('Scenario 3 & 4: Map V1 components and configurations remain intact and untouched', () => {
  const mapOpsPagePath = path.resolve(
    __dirname,
    '../src/features/map-operations/MapOperationsPage.tsx'
  );
  assert.ok(fs.existsSync(mapOpsPagePath), 'MapOperationsPage.tsx for Map V1 must exist');

  const adminDashboardPath = path.resolve(__dirname, '../src/components/admin/AdminDashboard.tsx');
  const adminDashContent = fs.readFileSync(adminDashboardPath, 'utf-8');
  assert.ok(
    adminDashContent.includes('<MapOperationsPage'),
    'AdminDashboard must continue rendering MapOperationsPage for Map V1'
  );

  // Verify AdminShell retains dashboard label as "Bản đồ"
  const adminShellPath = path.resolve(__dirname, '../src/components/admin/AdminShell.tsx');
  const content = fs.readFileSync(adminShellPath, 'utf-8');
  assert.ok(
    content.includes("id: 'dashboard', label: 'Bản đồ'"),
    'Map V1 item in AdminShell must remain intact as Bản đồ'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 5: The canonical PNG is loaded and verified
// -----------------------------------------------------------------------------
test('Scenario 5: Canonical PNG asset exists, retains exact name, and matches original hash', () => {
  const originalPng = 'D:\\Users\\map-verison3.png';
  const projectPng = path.resolve(__dirname, '../src/components/map-v2/assets/map-verison3.png');

  assert.ok(fs.existsSync(projectPng), 'map-verison3.png must exist in map-v2 assets');

  const expectedSha256 = '0c9305fa156e48de5e742f260d3f3b6902623bef3c27a0be32d084e8cc9fc522';
  const actualSha256 = calcSha256(projectPng);
  assert.equal(actualSha256, expectedSha256, 'Project PNG SHA-256 must match authoritative source');

  if (fs.existsSync(originalPng)) {
    const origSha256 = calcSha256(originalPng);
    assert.equal(actualSha256, origSha256, 'Project copy must match original D:\\Users\\map-verison3.png');
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 6: The JSON loads and validates successfully
// -----------------------------------------------------------------------------
test('Scenario 6: Authoritative JSON manifest loads, matches original hash, and passes validation', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  assert.ok(fs.existsSync(jsonPath), 'tan_thuan_1_zones_edited.json must exist in map-v2 data');

  const expectedSha256 = 'ae4085172e730591975fc0e8b7795bf84ca8a18b2363c0a8acb1a259f64dc02e';
  const actualSha256 = calcSha256(jsonPath);
  assert.equal(actualSha256, expectedSha256, 'Project JSON SHA-256 must match authoritative source');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  assert.equal(data.schema, 'port-zoning-image-pixels/v1', 'Schema must be port-zoning-image-pixels/v1');
  assert.equal(data.image.width, 1536, 'Image width must be 1536');
  assert.equal(data.image.height, 1024, 'Image height must be 1024');
  assert.equal(data.image.coordinate_system, 'image-pixels');
  assert.equal(data.image.origin, 'top-left');
});

// -----------------------------------------------------------------------------
// SCENARIO 7: Seven polygons render with correct vertex counts
// -----------------------------------------------------------------------------
test('Scenario 7: Seven canonical polygons are defined with expected vertex counts', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  assert.equal(data.polygons.length, 7, 'Must have exactly 7 polygons');

  const expectedCounts: Record<string, number> = {
    ZONE_QUAY: 28,
    ZONE_GENERAL: 21,
    ZONE_CONTAINER: 24,
    BLDG_KHO_1: 4,
    BLDG_KHO_2: 4,
    BLDG_KHO_4: 4,
    ZONE_ADMIN: 5,
  };

  for (const [id, count] of Object.entries(expectedCounts)) {
    const poly = data.polygons.find((p: { id: string }) => p.id === id);
    assert.ok(poly, `Polygon ${id} must exist`);
    assert.equal(poly.vertices.length, count, `Polygon ${id} must have ${count} vertices`);
    assert.equal(poly.edges.length, count, `Polygon ${id} must have ${count} edges`);
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Six polylines render with correct topology
// -----------------------------------------------------------------------------
test('Scenario 8: Six canonical polylines are defined and PORT_BOUNDARY is closed', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  assert.equal(data.polylines.length, 6, 'Must have exactly 6 polylines');

  const boundary = data.polylines.find((p: { id: string }) => p.id === 'PORT_BOUNDARY');
  assert.ok(boundary, 'PORT_BOUNDARY must exist');
  assert.equal(boundary.closed, true, 'PORT_BOUNDARY must be closed');
  assert.equal(boundary.vertices.length, 36, 'PORT_BOUNDARY must have 36 vertices');

  const roadBackland = data.polylines.find((p: { id: string }) => p.id === 'ROAD_BACKLAND');
  assert.ok(roadBackland, 'ROAD_BACKLAND must exist');
  assert.equal(roadBackland.closed, false, 'ROAD_BACKLAND must be open');
  assert.equal(roadBackland.vertices.length, 11, 'ROAD_BACKLAND must have 11 vertices');

  // Verify ROAD_BACKLAND inflection sequence is preserved as authored
  assert.deepEqual(roadBackland.vertices[3], [382, 574]);
  assert.deepEqual(roadBackland.vertices[4], [356, 577]);
  assert.deepEqual(roadBackland.vertices[5], [540, 581]);
});

// -----------------------------------------------------------------------------
// SCENARIO 9: Gate A and Gate B render at their source coordinates
// -----------------------------------------------------------------------------
test('Scenario 9: Gate A and Gate B exist with exact source coordinates', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  assert.equal(data.markers.length, 2, 'Must have exactly 2 markers');

  const gateA = data.markers.find((m: { id: string }) => m.id === 'GATE_A');
  assert.ok(gateA, 'GATE_A must exist');
  assert.deepEqual(gateA.point, [1450, 569], 'GATE_A point must be [1450, 569]');

  const gateB = data.markers.find((m: { id: string }) => m.id === 'GATE_B');
  assert.ok(gateB, 'GATE_B must exist');
  assert.deepEqual(gateB.point, [874, 725], 'GATE_B point must be [874, 725]');
});

// -----------------------------------------------------------------------------
// SCENARIO 10: Kho 1 and Kho 2 retain original geometry and parent hierarchy
// -----------------------------------------------------------------------------
test('Scenario 10: BLDG_KHO_1 and BLDG_KHO_2 are parented under ZONE_GENERAL with 4 vertices', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const kho1 = data.polygons.find((p: { id: string }) => p.id === 'BLDG_KHO_1');
  assert.ok(kho1);
  assert.equal(kho1.parent_id, 'ZONE_GENERAL');
  assert.equal(kho1.category, 'warehouse');
  assert.equal(kho1.vertices.length, 4);

  const kho2 = data.polygons.find((p: { id: string }) => p.id === 'BLDG_KHO_2');
  assert.ok(kho2);
  assert.equal(kho2.parent_id, 'ZONE_GENERAL');
  assert.equal(kho2.category, 'warehouse');
  assert.equal(kho2.vertices.length, 4);
});

// -----------------------------------------------------------------------------
// SCENARIO 11: Kho 4 and Administration office are not reassigned
// -----------------------------------------------------------------------------
test('Scenario 11: BLDG_KHO_4 and ZONE_ADMIN have parent_id === null', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const kho4 = data.polygons.find((p: { id: string }) => p.id === 'BLDG_KHO_4');
  assert.ok(kho4);
  assert.equal(kho4.parent_id, null, 'BLDG_KHO_4 must not be parented under general yard');

  const admin = data.polygons.find((p: { id: string }) => p.id === 'ZONE_ADMIN');
  assert.ok(admin);
  assert.equal(admin.parent_id, null, 'ZONE_ADMIN must have parent_id === null');
  assert.equal(admin.category, 'administration');
  assert.equal(admin.vertices.length, 5);
});

// -----------------------------------------------------------------------------
// SCENARIO 12 & 13: Shared coordinate space and transformation locking
// -----------------------------------------------------------------------------
test('Scenario 12 & 13: MapV2Canvas locks base image and overlays in single transform group', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf-8');

  // Both image and vector groups share the same coordinate space 1536x1024
  assert.ok(content.includes('CANVAS_WIDTH = 1536'));
  assert.ok(content.includes('CANVAS_HEIGHT = 1024'));
  assert.ok(content.includes('<image'));
  assert.ok(
    content.includes('transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}'),
    'Base image and all SVG vector layers must reside in the shared transform group'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 14: Layer visibility toggling is supported
// -----------------------------------------------------------------------------
test('Scenario 14: Layer visibility controls exist for baseMap, zones, buildings, roads, and gates', () => {
  const layersPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layersPath, 'utf-8');

  assert.ok(content.includes('baseMap'));
  assert.ok(content.includes('zones'));
  assert.ok(content.includes('buildings'));
  assert.ok(content.includes('roadsAndBoundaries'));
  assert.ok(content.includes('gates'));
});

// -----------------------------------------------------------------------------
// SCENARIO 15: Map V2 does not invoke Map V1 publication APIs
// -----------------------------------------------------------------------------
test('Scenario 15: Map V2 components make zero backend publication or mutation requests', () => {
  const v2Dir = path.resolve(__dirname, '../src/components/map-v2');
  const files = fs.readdirSync(v2Dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

  for (const f of files) {
    const code = fs.readFileSync(path.join(v2Dir, f), 'utf-8');
    assert.equal(
      code.includes('/api/v1/admin/map'),
      false,
      `Map V2 component ${f} must not call /api/v1/admin/map`
    );
    assert.equal(
      code.includes('/publish'),
      false,
      `Map V2 component ${f} must not call /publish`
    );
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 16: Map V2 is absent from User Portal
// -----------------------------------------------------------------------------
test('Scenario 16: UserApp and User Portal do not import or leak Map V2 components', () => {
  const userAppPath = path.resolve(__dirname, '../src/apps/user/UserApp.tsx');
  const userContent = fs.readFileSync(userAppPath, 'utf-8');

  assert.equal(
    userContent.includes('MapV2'),
    false,
    'UserApp.tsx must not import or reference MapV2'
  );
  assert.equal(
    userContent.includes('map-verison3'),
    false,
    'UserApp.tsx must not import map-verison3.png'
  );
  assert.equal(
    userContent.includes('tan_thuan_1_zones_edited'),
    false,
    'UserApp.tsx must not import tan_thuan_1_zones_edited'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 17 & 18: Coordinate Precision and Normalization Verification
// -----------------------------------------------------------------------------
test('Scenario 17 & 18: Normalized coordinates match pixel coordinates within tolerance <= 1e-4', () => {
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const width = data.image.width;
  const height = data.image.height;

  // Check polygons
  for (const poly of data.polygons) {
    for (let i = 0; i < poly.vertices.length; i++) {
      const [x, y] = poly.vertices[i];
      const [nx, ny] = poly.normalized_vertices[i];
      const calcNx = x / width;
      const calcNy = y / height;
      assert.ok(
        Math.abs(calcNx - nx) <= 0.0001,
        `Discrepancy in ${poly.id} vertex ${i} normalized X: calc=${calcNx}, given=${nx}`
      );
      assert.ok(
        Math.abs(calcNy - ny) <= 0.0001,
        `Discrepancy in ${poly.id} vertex ${i} normalized Y: calc=${calcNy}, given=${ny}`
      );
    }
  }

  // Check markers
  for (const m of data.markers) {
    const [x, y] = m.point;
    const [nx, ny] = m.normalized_point;
    const calcNx = x / width;
    const calcNy = y / height;
    assert.ok(
      Math.abs(calcNx - nx) <= 0.0001,
      `Discrepancy in ${m.id} marker normalized X: calc=${calcNx}, given=${nx}`
    );
    assert.ok(
      Math.abs(calcNy - ny) <= 0.0001,
      `Discrepancy in ${m.id} marker normalized Y: calc=${calcNy}, given=${ny}`
    );
  }
});

// -----------------------------------------------------------------------------
// SCENARIO 19: Full-Bleed Viewport & Zero-Margin Layout for Map V2
// -----------------------------------------------------------------------------
test('Scenario 19: Full-bleed layout rules are defined for Map V2 in index.css and AdminShell', () => {
  const indexCssPath = path.resolve(__dirname, '../src/index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf-8');

  assert.ok(
    indexCss.includes('.admin-main-viewport.admin-main-viewport-map-v2') ||
      indexCss.includes('.admin-main-viewport:has(.map-v2-container)'),
    'index.css must contain full-bleed rules for Map V2'
  );

  const adminShellPath = path.resolve(__dirname, '../src/components/admin/AdminShell.tsx');
  const adminShell = fs.readFileSync(adminShellPath, 'utf-8');
  assert.ok(
    adminShell.includes('admin-main-viewport-map-v2') ||
      adminShell.includes("activeTab === 'map_v2'"),
    'AdminShell must assign full-bleed class for map_v2 activeTab'
  );

  const workspaceCssPath = path.resolve(
    __dirname,
    '../src/components/map-v2/MapV2Workspace.css'
  );
  const workspaceCss = fs.readFileSync(workspaceCssPath, 'utf-8');
  assert.ok(
    !workspaceCss.includes('height: calc(100vh - 120px);'),
    'MapV2Workspace.css must not constrain workspace-body with hardcoded 120px reduction'
  );
});

// -----------------------------------------------------------------------------
// SCENARIO 20: Two View Modes: Fit toàn bộ and Tràn chiều rộng
// -----------------------------------------------------------------------------
test('Scenario 20: Map V2 supports Fit toàn bộ (contain) and Tràn chiều rộng (width) view modes', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Verify viewMode prop and support for 'width' and 'contain'
  assert.ok(
    canvasContent.includes("mode === 'width'"),
    'MapV2Canvas must implement width-fitting mode'
  );
  assert.ok(
    canvasContent.includes('ResizeObserver'),
    'MapV2Canvas must use ResizeObserver for responsive recalculation'
  );

  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  assert.ok(
    workspaceContent.includes('Fit toàn bộ'),
    'MapV2Workspace must provide Fit toàn bộ button'
  );
  assert.ok(
    workspaceContent.includes('Tràn chiều rộng'),
    'MapV2Workspace must provide Tràn chiều rộng button'
  );
});

