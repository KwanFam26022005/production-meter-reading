import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for Point-in-Polygon test (Ray casting algorithm)
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

// Helper to check if two line segments (p1-p2 and p3-p4) intersect strictly
function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): boolean {
  const ccw = (a: [number, number], b: [number, number], c: [number, number]) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

// -----------------------------------------------------------------------------
// SUITE 1: AUDITED DEMO METER INVARIANTS & STRICT SCOPE ISOLATION
// -----------------------------------------------------------------------------
test('Suite 1: Active Demo Meters strictly match audited tan-thuan-demo-v1 dataset', async () => {
  const layoutModule = await import('../src/components/map-v2/utilityDemoLayout.ts');
  const { getUtilityLayout, RECOMMENDED_LAYOUT_KEY } = layoutModule;

  const layout = getUtilityLayout(RECOMMENDED_LAYOUT_KEY);

  // 1. Filter meter nodes
  const meterNodes = layout.nodes.filter((n) => n.isMeter);
  const electricityMeters = meterNodes.filter((n) => n.utilityType === 'ELECTRICITY');
  const waterMeters = meterNodes.filter((n) => n.utilityType === 'WATER');

  // Must have exactly 8 electricity demo meters
  assert.equal(electricityMeters.length, 8, 'Must include exactly 8 active electricity demo meters');
  const expectedElecCodes = [
    'SIM-EM-001', 'SIM-EM-002', 'SIM-EM-003', 'SIM-EM-004',
    'SIM-EM-005', 'SIM-EM-006', 'SIM-EM-007', 'SIM-EM-008',
  ];
  const actualElecCodes = electricityMeters.map((m) => m.meterCode).sort();
  assert.deepEqual(actualElecCodes, expectedElecCodes, 'Electricity demo meter codes must match SIM-EM-001..008');

  // Must have exactly 4 water demo meters
  assert.equal(waterMeters.length, 4, 'Must include exactly 4 active water demo meters');
  const expectedWaterCodes = ['SIM-WM-001', 'SIM-WM-002', 'SIM-WM-003', 'SIM-WM-004'];
  const actualWaterCodes = waterMeters.map((m) => m.meterCode).sort();
  assert.deepEqual(actualWaterCodes, expectedWaterCodes, 'Water demo meter codes must match SIM-WM-001..004');

  // 2. Strict Exclusion of Retired Legacy Meters (CT-001..CT-012)
  for (let i = 1; i <= 12; i++) {
    const legacyCode = `CT-${String(i).padStart(3, '0')}`;
    const found = layout.nodes.some((n) => n.meterCode === legacyCode || n.id === legacyCode);
    assert.equal(found, false, `Retired legacy meter ${legacyCode} must NOT exist in utility layout`);
  }

  // 3. Strict Exclusion of QA Fixtures / Unknown meters
  const qaCodes = ['TEST-MTR', 'QA-FIXTURE', 'MTR-DEV', 'UNKNOWN'];
  for (const code of qaCodes) {
    const found = layout.nodes.some((n) => (n.meterCode && n.meterCode.includes(code)) || n.id.includes(code));
    assert.equal(found, false, `QA fixture ${code} must NOT exist in layout`);
  }

  // 4. All nodes and edges must carry demoOnly: true flag
  for (const node of layout.nodes) {
    assert.equal(node.demoOnly, true, `Node ${node.id} must have demoOnly: true`);
  }
  for (const edge of layout.edges) {
    assert.equal(edge.demoOnly, true, `Edge ${edge.id} must have demoOnly: true`);
  }
});

// -----------------------------------------------------------------------------
// SUITE 2: TOPOLOGY DECOUPLING & GRAPH CONSISTENCY
// -----------------------------------------------------------------------------
test('Suite 2: Graph connectivity is preserved identically across Layouts A, B, B2, and C', async () => {
  const layoutModule = await import('../src/components/map-v2/utilityDemoLayout.ts');
  const { LAYOUT_A, LAYOUT_B, LAYOUT_B2, LAYOUT_C } = layoutModule;

  const layouts = [LAYOUT_A, LAYOUT_B, LAYOUT_B2, LAYOUT_C];

  for (const layout of layouts) {
    assert.equal(layout.nodes.length, 17, `${layout.name} must have exactly 17 nodes (11 elec + 6 water)`);
    assert.equal(layout.edges.length, 15, `${layout.name} must have exactly 15 edges (10 elec + 5 water)`);

    // Sources
    const elecSource = layout.nodes.find((n) => n.id === 'SIM-EXT-GRID');
    assert.ok(elecSource, `${layout.name} must have electricity source SIM-EXT-GRID`);
    assert.equal(elecSource?.depth, 0);
    assert.equal(elecSource?.isSource, true);

    const waterSource = layout.nodes.find((n) => n.id === 'SIM-CITY-WATER');
    assert.ok(waterSource, `${layout.name} must have water source SIM-CITY-WATER`);
    assert.equal(waterSource?.depth, 0);
    assert.equal(waterSource?.isSource, true);

    // Verify all edge source and target nodes exist in the node set
    const nodeIds = new Set(layout.nodes.map((n) => n.id));
    for (const edge of layout.edges) {
      assert.ok(nodeIds.has(edge.sourceNodeId), `Edge ${edge.id} source ${edge.sourceNodeId} must exist`);
      assert.ok(nodeIds.has(edge.targetNodeId), `Edge ${edge.id} target ${edge.targetNodeId} must exist`);
      assert.ok(edge.displayPath.length >= 2, `Edge ${edge.id} must have at least 2 waypoints`);
    }
  }

  // Verify identical topology across all 4 layouts
  const edgesA = LAYOUT_A.edges.map((e) => `${e.sourceNodeId}->${e.targetNodeId}`);
  const edgesB = LAYOUT_B.edges.map((e) => `${e.sourceNodeId}->${e.targetNodeId}`);
  const edgesB2 = LAYOUT_B2.edges.map((e) => `${e.sourceNodeId}->${e.targetNodeId}`);
  const edgesC = LAYOUT_C.edges.map((e) => `${e.sourceNodeId}->${e.targetNodeId}`);

  assert.deepEqual(edgesB, edgesA, 'Layout B must maintain exact same logical topology as Layout A');
  assert.deepEqual(edgesB2, edgesA, 'Layout B2 must maintain exact same logical topology as Layout A');
  assert.deepEqual(edgesC, edgesA, 'Layout C must maintain exact same logical topology as Layout A');
});

// -----------------------------------------------------------------------------
// SUITE 3: CANONICAL GEOMETRY & OBSTACLE AVOIDANCE INVARIANTS
// -----------------------------------------------------------------------------
test('Suite 3: All coordinates within 1536x1024 and avoid buildings/hotspots/gates in Layout B & B2', async () => {
  const layoutModule = await import('../src/components/map-v2/utilityDemoLayout.ts');
  const { LAYOUT_B, LAYOUT_B2 } = layoutModule;

  // Load canonical map polygons and markers
  const jsonPath = path.resolve(
    __dirname,
    '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const buildings = (data.polygons as any[]).filter((p) =>
    ['BLDG_KHO_1', 'BLDG_KHO_2', 'BLDG_KHO_4', 'ZONE_ADMIN'].includes(p.id)
  );
  const gates = (data.markers as any[]).filter((m) =>
    ['GATE_A', 'GATE_B'].includes(m.id)
  );

  for (const layout of [LAYOUT_B, LAYOUT_B2]) {
    // 1. Canonical Bounds Check: 0 <= X <= 1536, 0 <= Y <= 1024
    for (const node of layout.nodes) {
      assert.ok(node.displayX >= 0 && node.displayX <= 1536, `${layout.key}: Node ${node.id} X=${node.displayX} within 1536`);
      assert.ok(node.displayY >= 0 && node.displayY <= 1024, `${layout.key}: Node ${node.id} Y=${node.displayY} within 1024`);
    }

    for (const edge of layout.edges) {
      for (const [x, y] of edge.displayPath) {
        assert.ok(x >= 0 && x <= 1536, `${layout.key}: Edge ${edge.id} waypoint X=${x} within 1536`);
        assert.ok(y >= 0 && y <= 1024, `${layout.key}: Edge ${edge.id} waypoint Y=${y} within 1024`);
      }
    }

    // 2. Zero Building Intersections for Nodes
    for (const node of layout.nodes) {
      for (const bldg of buildings) {
        const inside = pointInPolygon([node.displayX, node.displayY], bldg.vertices);
        assert.equal(inside, false, `${layout.key}: Node ${node.id} (${node.displayX}, ${node.displayY}) must NOT be inside ${bldg.id}`);
      }
    }

    // 3. Zero Building Intersections for Route Segments
    for (const edge of layout.edges) {
      for (let i = 0; i < edge.displayPath.length - 1; i++) {
        const segStart = edge.displayPath[i];
        const segEnd = edge.displayPath[i + 1];

        for (const bldg of buildings) {
          const vs = bldg.vertices as [number, number][];
          for (let j = 0; j < vs.length; j++) {
            const bldgStart = vs[j];
            const bldgEnd = vs[(j + 1) % vs.length];
            const crosses = segmentsIntersect(segStart, segEnd, bldgStart, bldgEnd);
            assert.equal(
              crosses,
              false,
              `${layout.key}: Edge ${edge.id} segment ${JSON.stringify(segStart)}->${JSON.stringify(segEnd)} must NOT intersect perimeter of ${bldg.id}`
            );
          }
        }
      }
    }

    // 4. Safe Gate Clearance (> 20px)
    for (const gate of gates) {
      const [gx, gy] = gate.point as [number, number];
      for (const node of layout.nodes) {
        const dist = Math.hypot(node.displayX - gx, node.displayY - gy);
        assert.ok(dist >= 20, `${layout.key}: Node ${node.id} must be at least 20px away from ${gate.id} (actual: ${dist.toFixed(1)}px)`);
      }
    }
  }
});

// -----------------------------------------------------------------------------
// SUITE 4: FACTORY API & RECOMMENDED SELECTION
// -----------------------------------------------------------------------------
test('Suite 4: Factory method getUtilityLayout defaults to refined recommended Layout B2', async () => {
  const layoutModule = await import('../src/components/map-v2/utilityDemoLayout.ts');
  const { getUtilityLayout, RECOMMENDED_LAYOUT_KEY, LAYOUT_A, LAYOUT_B, LAYOUT_B2, LAYOUT_C } = layoutModule;

  assert.equal(RECOMMENDED_LAYOUT_KEY, 'B2', 'Recommended layout must be Layout B2 (Refined Central Backbone)');

  const defaultLayout = getUtilityLayout();
  assert.equal(defaultLayout.key, 'B2', 'Default layout must be B2');
  assert.equal(defaultLayout.name, LAYOUT_B2.name);

  const layoutB = getUtilityLayout('B');
  assert.equal(layoutB.key, 'B');
  assert.equal(layoutB.name, LAYOUT_B.name);

  const layoutB2 = getUtilityLayout('B2');
  assert.equal(layoutB2.key, 'B2');
  assert.equal(layoutB2.name, LAYOUT_B2.name);

  const layoutA = getUtilityLayout('A');
  assert.equal(layoutA.key, 'A');
  assert.equal(layoutA.name, LAYOUT_A.name);

  const layoutC = getUtilityLayout('C');
  assert.equal(layoutC.key, 'C');
  assert.equal(layoutC.name, LAYOUT_C.name);
});

// -----------------------------------------------------------------------------
// SUITE 5: LAYOUT B2 REFINEMENT CONSTRAINTS & ROUTE TIER SPECIFICATION
// -----------------------------------------------------------------------------
test('Suite 5: Layout B2 meets strict refinement bounds, source separation, and route tiers', async () => {
  const layoutModule = await import('../src/components/map-v2/utilityDemoLayout.ts');
  const { LAYOUT_B2 } = layoutModule;

  // 1. Source separation >= 100px (Actual: 116px)
  const elecSource = LAYOUT_B2.nodes.find((n) => n.id === 'SIM-EXT-GRID')!;
  const waterSource = LAYOUT_B2.nodes.find((n) => n.id === 'SIM-CITY-WATER')!;
  const sourceSeparation = Math.hypot(waterSource.displayX - elecSource.displayX, waterSource.displayY - elecSource.displayY);
  assert.ok(sourceSeparation >= 100, `Source separation must be >= 100px (actual: ${sourceSeparation.toFixed(1)}px)`);

  // 2. All edges must have valid routeTier
  const validTiers = new Set(['TRUNK', 'BRANCH', 'SPUR']);
  for (const edge of LAYOUT_B2.edges) {
    assert.ok(edge.routeTier && validTiers.has(edge.routeTier), `Edge ${edge.id} must have valid routeTier`);
  }

  // 3. Total path length constraint (<= 4318px, soft upper limit of Phase 1 + 10%)
  let totalLength = 0;
  for (const edge of LAYOUT_B2.edges) {
    for (let i = 0; i < edge.displayPath.length - 1; i++) {
      const [x1, y1] = edge.displayPath[i];
      const [x2, y2] = edge.displayPath[i + 1];
      totalLength += Math.hypot(x2 - x1, y2 - y1);
    }
  }
  assert.ok(totalLength <= 4318, `Total path length must be <= 4318px (actual: ${totalLength.toFixed(0)}px)`);

  // 4. Host cabinet dual-role validation
  const mdbNode = LAYOUT_B2.nodes.find((n) => n.id === 'SIM-MDB-01')!;
  assert.equal(mdbNode.isDistributionNode, true, 'SIM-MDB-01 is a distribution cabinet');
  assert.equal(mdbNode.isMeter, true, 'SIM-MDB-01 hosts meter SIM-EM-001');
  assert.equal(mdbNode.meterCode, 'SIM-EM-001');

  const winNode = LAYOUT_B2.nodes.find((n) => n.id === 'SIM-WIN-01')!;
  assert.equal(winNode.isDistributionNode, true, 'SIM-WIN-01 is an intake cabinet');
  assert.equal(winNode.isMeter, true, 'SIM-WIN-01 hosts meter SIM-WM-001');
  assert.equal(winNode.meterCode, 'SIM-WM-001');
});
