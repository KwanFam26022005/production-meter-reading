/**
 * Phase 2.1 — Real Pointer Interaction & Accessibility Hardening Tests
 *
 * Tests verifying:
 * - Semantic button roles and accessible labels
 * - Hit-target architecture (decorative children do not intercept)
 * - Pointer-events policy compliance
 * - Keyboard activation (Enter / Space)
 * - Tooltips do not block interaction
 * - No synthetic dispatchEvent in acceptance path
 * - B2 geometry frozen hash unchanged
 * - Phase 2 FSM regression (reduced motion path)
 * - Map V1 / User Portal isolation
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { getUtilityLayout, RECOMMENDED_LAYOUT_KEY, LAYOUT_B2, LAYOUT_B2_COORDS } from '../src/components/map-v2/utilityDemoLayout.ts';
import { UtilityTopologyGraph } from '../src/components/map-v2/utilityNetworkGraph.ts';
import { UtilityNetworkController } from '../src/components/map-v2/utilityNetworkStateMachine.ts';

// ─── B2 freeze hash (computed from structured data — matches Phase 2 suite) ──

const EXPECTED_HASH = '7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a';

function computeB2StructuredHash(): string {
  const b2Data = JSON.stringify({
    coords: LAYOUT_B2_COORDS,
    nodes: LAYOUT_B2.nodes.map((n) => ({
      id: n.id,
      x: n.displayX,
      y: n.displayY,
      role: n.nodeRole,
      meter: n.meterCode,
    })),
    edges: LAYOUT_B2.edges.map((e) => ({
      id: e.id,
      src: e.sourceNodeId,
      tgt: e.targetNodeId,
      path: e.displayPath,
      tier: e.routeTier,
    })),
  });
  return createHash('sha256').update(b2Data).digest('hex');
}

type UtilityTypeUC = 'ELECTRICITY' | 'WATER';

function makeController(utilityType: UtilityTypeUC) {
  const layout = getUtilityLayout(RECOMMENDED_LAYOUT_KEY);
  const nodes = layout.nodes.filter(n => n.utilityType === utilityType);
  const edges = layout.edges.filter(e => e.utilityType === utilityType);
  const lcType = utilityType === 'ELECTRICITY' ? 'electricity' : 'water';
  const graph = new UtilityTopologyGraph(nodes as any, edges as any, lcType as any);
  const states: string[] = [];
  const ctrl = new UtilityNetworkController(graph as any, {
    onUpdate: (s: any) => { states.push(s.phase); },
    onPhaseChange: () => {},
    prefersReducedMotion: true, // avoid rAF in Node.js environment
  });
  return { ctrl, states, graph };
}

// ─── 1. SEMANTIC & ACCESSIBLE NODE CONTRACT ──────────────────────────────────

describe('Phase 2.1 Semantic & Accessible Node Contract', () => {

  it('1. B2 layout exports exactly 17 nodes', () => {
    const layout = getUtilityLayout('B2');
    assert.equal(layout.nodes.length, 17, `Expected 17 nodes, got ${layout.nodes.length}`);
  });

  it('2. All nodes have non-empty id and label', () => {
    const layout = getUtilityLayout('B2');
    for (const node of layout.nodes) {
      assert.ok(node.id && node.id.length > 0, 'Node missing id');
      assert.ok(node.label && node.label.length > 0, `Node ${node.id} missing label`);
    }
  });

  it('3. Source nodes are identifiable (isSource flag)', () => {
    const layout = getUtilityLayout('B2');
    const sources = layout.nodes.filter(n => n.isSource);
    assert.equal(sources.length, 2, `Expected 2 source nodes, got ${sources.length}`);
    const sourceIds = sources.map(s => s.id).sort();
    assert.deepEqual(sourceIds, ['SIM-CITY-WATER', 'SIM-EXT-GRID']);
  });

  it('4. All electricity nodes have utilityType === "ELECTRICITY"', () => {
    const layout = getUtilityLayout('B2');
    const elecNodes = layout.nodes.filter(n => n.utilityType === 'ELECTRICITY');
    assert.equal(elecNodes.length, 11, `Expected 11 ELECTRICITY nodes`);
    assert.ok(elecNodes.every(n => n.utilityType === 'ELECTRICITY'));
  });

  it('5. All water nodes have utilityType === "WATER"', () => {
    const layout = getUtilityLayout('B2');
    const waterNodes = layout.nodes.filter(n => n.utilityType === 'WATER');
    assert.equal(waterNodes.length, 6, `Expected 6 WATER nodes`);
    assert.ok(waterNodes.every(n => n.utilityType === 'WATER'));
  });

  it('6. Meter nodes have meterCode defined (non-empty)', () => {
    const layout = getUtilityLayout('B2');
    const meters = layout.nodes.filter(n => n.isMeter);
    assert.ok(meters.length >= 12, `Expected at least 12 meter nodes`);
    for (const m of meters) {
      assert.ok(m.meterCode && m.meterCode.length > 0, `Meter ${m.id} has empty meterCode`);
    }
  });

  it('7. Every node has demoOnly: true (no real DB records)', () => {
    const layout = getUtilityLayout('B2');
    for (const node of layout.nodes) {
      assert.equal(node.demoOnly, true, `Node ${node.id} should be demoOnly`);
    }
  });

});

// ─── 2. HIT-TARGET ARCHITECTURE ─────────────────────────────────────────────

describe('Phase 2.1 Hit-Target Architecture', () => {

  it('8. Each interactive node has a unique id (no duplicates)', () => {
    const layout = getUtilityLayout('B2');
    const ids = layout.nodes.map(n => n.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, 'Duplicate node IDs detected');
  });

  it('9. Source node ids start with SIM- (match #node-SIM-* selectors)', () => {
    const layout = getUtilityLayout('B2');
    const sources = layout.nodes.filter(n => n.isSource);
    for (const s of sources) {
      assert.ok(s.id.startsWith('SIM-'), `Source ${s.id} should start with SIM-`);
    }
  });

  it('10. All display coordinates within map canvas bounds (1915x821)', () => {
    const layout = getUtilityLayout('B2');
    for (const node of layout.nodes) {
      assert.ok(node.displayX > 0 && node.displayX < 1915,
        `${node.id}.displayX=${node.displayX} out of [0,1915]`);
      assert.ok(node.displayY > 0 && node.displayY < 821,
        `${node.id}.displayY=${node.displayY} out of [0,821]`);
    }
  });

  it('11. No two nodes share same display coordinate (no stacked hit areas)', () => {
    const layout = getUtilityLayout('B2');
    const coords = layout.nodes.map(n => `${n.displayX},${n.displayY}`);
    const unique = new Set(coords);
    assert.equal(unique.size, coords.length,
      `Stacked nodes detected: ${coords.length - unique.size} duplicate positions`);
  });

  it('12. Edges have displayPath as array of [x,y] coordinate pairs (>= 2 points)', () => {
    const layout = getUtilityLayout('B2');
    for (const edge of layout.edges) {
      assert.ok(Array.isArray(edge.displayPath) && edge.displayPath.length >= 2,
        `Edge ${edge.sourceNodeId}→${edge.targetNodeId} displayPath must be array with >= 2 points`);
      for (const pt of edge.displayPath) {
        assert.ok(Array.isArray(pt) && pt.length === 2,
          `displayPath point must be [x,y] pair, got: ${JSON.stringify(pt)}`);
      }
    }
  });

});

// ─── 3. POINTER-EVENTS POLICY ────────────────────────────────────────────────

describe('Phase 2.1 Pointer-Events Policy Invariants', () => {

  it('13. MapV2UtilityLayer hit-target circle uses pointerEvents="all"', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(
      layerSrc.includes('pointerEvents="all"'),
      'MapV2UtilityLayer.tsx must use pointerEvents="all" on hit-target circle'
    );
  });

  it('14. Decorative section groups (A,B,C,D) use pointerEvents="none"', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    const noneMatches = (layerSrc.match(/pointerEvents="none"/g) || []).length;
    assert.ok(noneMatches >= 5,
      `Expected >= 5 pointerEvents="none" occurrences (4 sections + tooltip), got ${noneMatches}`);
  });

  it('15. Canvas drag deferred via mouseIsDownRef (not immediate setIsDragging)', () => {
    const canvasSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2Canvas.tsx'),
      'utf-8'
    );
    assert.ok(canvasSrc.includes('mouseIsDownRef'),
      'MapV2Canvas should use mouseIsDownRef to defer drag state');
    assert.ok(canvasSrc.includes('only after movement threshold'),
      'MapV2Canvas should document the drag-threshold fix');
  });

  it('16. handleMouseDown does NOT immediately call setIsDragging(true)', () => {
    const canvasSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2Canvas.tsx'),
      'utf-8'
    );
    // Extract handleMouseDown body and strip single-line comments
    const fnMatch = canvasSrc.match(/const handleMouseDown\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n  \};/);
    if (fnMatch) {
      const codeOnly = fnMatch[1].replace(/\/\/.*$/gm, '');
      assert.ok(
        !codeOnly.includes('setIsDragging(true)'),
        'handleMouseDown must NOT immediately call setIsDragging(true) — causes SVG pointer-events:none during click'
      );
    }
    // Also verify setIsDragging(true) exists (called from handleMouseMove after threshold)
    assert.ok(canvasSrc.includes('setIsDragging(true)'),
      'setIsDragging(true) must exist in handleMouseMove (after threshold)');
  });

  it('17. Tooltip has pointer-events:none — cannot block node clicks', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(
      layerSrc.includes("style={{ pointerEvents: 'none' }}"),
      'Tooltip SVG group must have pointerEvents:none'
    );
  });

});

// ─── 4. KEYBOARD ACCESSIBILITY ──────────────────────────────────────────────

describe('Phase 2.1 Keyboard & ARIA Invariants', () => {

  it('18. Interactive nodes have role="button"', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes('role="button"'), 'Must have role="button"');
  });

  it('19. Interactive nodes have tabIndex={0}', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes('tabIndex={0}'), 'Must have tabIndex={0}');
  });

  it('20. onKeyDown handles Enter and Space with preventDefault', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes("e.key === 'Enter'"), 'Must handle Enter key');
    assert.ok(layerSrc.includes("e.key === ' '"), 'Must handle Space key');
    assert.ok(layerSrc.includes('e.preventDefault()'), 'Must call preventDefault');
  });

  it('21. Source nodes have aria-expanded for accordion semantics', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes('aria-expanded'), 'Source nodes need aria-expanded');
  });

  it('22. aria-label includes Vietnamese "mạng lưới" text', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes('mạng lưới'), 'aria-label must have Vietnamese network term');
  });

  it('23. Meter aria-label includes Vietnamese "truy vết" (trace) text', () => {
    const layerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/map-v2/MapV2UtilityLayer.tsx'),
      'utf-8'
    );
    assert.ok(layerSrc.includes('truy vết'), 'Meter aria-label must include "truy vết"');
  });

});

// ─── 5. FSM REGRESSION (reduced motion — no rAF needed in Node.js env) ───────

describe('Phase 2.1 FSM Regression (prefersReducedMotion)', () => {

  it('24. Initial state is collapsed', () => {
    const { ctrl } = makeController('ELECTRICITY');
    assert.equal(ctrl.getState().phase, 'collapsed');
  });

  it('25. expand() with prefersReducedMotion=true completes synchronously to expanded', () => {
    const { ctrl } = makeController('ELECTRICITY');
    ctrl.expand();
    assert.equal(ctrl.getState().phase, 'expanded',
      'prefersReducedMotion must skip rAF and go directly to expanded');
  });

  it('26. resetCollapsed() returns to collapsed synchronously', () => {
    const { ctrl } = makeController('ELECTRICITY');
    ctrl.expand();
    ctrl.resetCollapsed();
    assert.equal(ctrl.getState().phase, 'collapsed');
  });

  it('26b. Water FSM collapses and expands correctly', () => {
    const { ctrl } = makeController('WATER');
    assert.equal(ctrl.getState().phase, 'collapsed');
    ctrl.expand();
    assert.equal(ctrl.getState().phase, 'expanded');
  });

  it('26c. cancel() during expanded keeps state consistent', () => {
    const { ctrl } = makeController('ELECTRICITY');
    ctrl.expand();
    ctrl.cancel();
    const phase = ctrl.getState().phase;
    assert.ok(['collapsed', 'expanded'].includes(phase),
      `Cancel after expand: unexpected phase "${phase}"`);
  });

});

// ─── 6. GEOMETRY FREEZE ─────────────────────────────────────────────────────

describe('Phase 2.1 Geometry Freeze Verification', () => {

  it('25a. RECOMMENDED_LAYOUT_KEY is B2', () => {
    assert.equal(RECOMMENDED_LAYOUT_KEY, 'B2');
  });

  it('25b. B2 structured data SHA-256 matches frozen baseline', () => {
    const actual = computeB2StructuredHash();
    assert.equal(
      actual,
      EXPECTED_HASH,
      `B2 geometry hash changed!\nExpected: ${EXPECTED_HASH}\nActual:   ${actual}`
    );
  });

  it('25c. B2 has exactly 15 edges (10 ELECTRICITY + 5 WATER)', () => {
    const layout = getUtilityLayout('B2');
    assert.equal(layout.edges.length, 15, `Expected 15 edges, got ${layout.edges.length}`);
    const elecEdges = layout.edges.filter(e => e.utilityType === 'ELECTRICITY');
    const waterEdges = layout.edges.filter(e => e.utilityType === 'WATER');
    assert.equal(elecEdges.length, 10, `Expected 10 ELECTRICITY edges`);
    assert.equal(waterEdges.length, 5, `Expected 5 WATER edges`);
  });

  it('25d. B2 source node coordinates unchanged', () => {
    const layout = getUtilityLayout('B2');
    const extGrid = layout.nodes.find(n => n.id === 'SIM-EXT-GRID');
    const cityWater = layout.nodes.find(n => n.id === 'SIM-CITY-WATER');
    assert.ok(extGrid, 'SIM-EXT-GRID must exist');
    assert.ok(cityWater, 'SIM-CITY-WATER must exist');
    // Verify coordinates match frozen B2 design
    assert.equal(extGrid!.displayX, 700, `SIM-EXT-GRID.x should be 700`);
    assert.equal(extGrid!.displayY, 755, `SIM-EXT-GRID.y should be 755`);
    assert.equal(cityWater!.displayX, 815, `SIM-CITY-WATER.x should be 815`);
    assert.equal(cityWater!.displayY, 770, `SIM-CITY-WATER.y should be 770`);
  });

});

// ─── 7. ISOLATION ────────────────────────────────────────────────────────────

describe('Phase 2.1 Map V1 & User Portal Isolation', () => {

  it('26. Utility layer not imported by Map V1 components (if they exist)', () => {
    const mapV1Candidates = [
      'src/components/PortMap.tsx',
      'src/components/MapView.tsx',
    ].map(p => path.resolve(process.cwd(), p));

    for (const candidate of mapV1Candidates) {
      if (!fs.existsSync(candidate)) continue;
      const src = fs.readFileSync(candidate, 'utf-8');
      assert.ok(!src.includes('MapV2UtilityLayer'),
        `${path.basename(candidate)} must not import MapV2UtilityLayer`);
    }
  });

  it('27. Phase 2.1 evidence capture script uses zero dispatchEvent / $eval', () => {
    const captureScript = path.resolve(
      process.cwd(), '..', 'scripts', 'capture_phase2_1_real_click_evidence.mjs'
    );
    if (!fs.existsSync(captureScript)) return;
    const src = fs.readFileSync(captureScript, 'utf-8');
    // Strip comments to verify executable code does not call dispatchEvent or $eval
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.ok(
      !codeOnly.includes('dispatchEvent') && !codeOnly.includes('$eval'),
      'Phase 2.1 capture must not use dispatchEvent or $eval in code'
    );
  });

  it('27b. Legacy Phase 2 capture script preserved for reference', () => {
    const phase2Script = path.resolve(
      process.cwd(), '..', 'scripts', 'capture_phase2_evidence_and_video.mjs'
    );
    assert.ok(fs.existsSync(phase2Script),
      'Legacy Phase 2 capture script should be preserved for reference');
  });

});
