/**
 * Phase 2.1 Root Cause Diagnostic — Real Pointer Failure Analysis
 * Tests page.locator().click() vs dispatchEvent, captures elementFromPoint data.
 */
import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-utility-phase2-1-interaction-hardening', 'evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function loginAndNavigate(page) {
  await page.goto('http://localhost:5174/operations.html?tab=map_v2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) { await mapV2Tab.click(); await page.waitForTimeout(1000); }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() !== 'debug') console.log('BROWSER:', msg.text()); });

  await loginAndNavigate(page);

  // Select electricity utility
  await page.click('button:has-text("Điện")');
  await page.waitForTimeout(600);

  // ─── TEST 1: Real Playwright locator().click() on the <g> root ─────────────
  console.log('\n=== TEST 1: locator().click() on #node-SIM-EXT-GRID ===');
  try {
    await page.locator('#node-SIM-EXT-GRID').click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    const nodesAfter = await page.$$eval('.utility-node', ns => ns.map(n => n.id));
    console.log('SUCCESS — visible nodes:', nodesAfter.length);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'diag-01-real-click-success.png') });
  } catch (err) {
    console.log('FAIL — real click threw:', err.message.split('\n')[0]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'diag-01-real-click-fail.png') });
  }

  // Reload for clean slate
  await loginAndNavigate(page);
  await page.click('button:has-text("Điện")');
  await page.waitForTimeout(600);

  // ─── TEST 2: elementFromPoint at center of #node-SIM-EXT-GRID ──────────────
  console.log('\n=== TEST 2: elementFromPoint analysis ===');
  const nodeBox = await page.locator('#node-SIM-EXT-GRID').boundingBox();
  console.log('BoundingBox of #node-SIM-EXT-GRID:', JSON.stringify(nodeBox));

  const hitInfo = await page.evaluate(({ x, y }) => {
    const cx = x;
    const cy = y;
    const results = [];
    // Sample a 5x5 grid across the node bounding box
    for (let dx = -0.3; dx <= 0.3; dx += 0.3) {
      for (let dy = -0.3; dy <= 0.3; dy += 0.3) {
        const el = document.elementFromPoint(cx + dx * (cx * 0), cy + dy * (cy * 0));
        if (el) {
          results.push({
            sampleX: Math.round(cx), sampleY: Math.round(cy),
            tagName: el.tagName,
            id: el.id || null,
            className: (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || null),
            pointerEvents: window.getComputedStyle(el).pointerEvents,
            parentId: el.parentElement?.id || null,
            parentTag: el.parentElement?.tagName || null,
            nearestButtonId: el.closest('[role="button"]')?.id || null,
          });
        }
      }
    }
    return results[0]; // first sample
  }, { x: nodeBox.x + nodeBox.width / 2, y: nodeBox.y + nodeBox.height / 2 });

  console.log('elementFromPoint at node center:', JSON.stringify(hitInfo, null, 2));

  // Also sample multiple points
  const gridHits = await page.evaluate(({ box }) => {
    const results = [];
    const offsets = [-15, -8, 0, 8, 15];
    for (const dx of offsets) {
      for (const dy of offsets) {
        const el = document.elementFromPoint(
          box.x + box.width / 2 + dx,
          box.y + box.height / 2 + dy
        );
        if (el) {
          results.push({
            dx, dy,
            tagName: el.tagName,
            id: el.id || null,
            pointerEvents: window.getComputedStyle(el).pointerEvents,
            nearestButtonId: el.closest('[role="button"]')?.id || null,
            pathToRoot: (() => {
              const chain = [];
              let cur = el;
              let depth = 0;
              while (cur && depth < 6) {
                chain.push(`${cur.tagName}#${cur.id || ''}[${(cur.className && cur.className.baseVal !== undefined) ? cur.className.baseVal : (cur.className || '')}]`);
                cur = cur.parentElement;
                depth++;
              }
              return chain.join(' > ');
            })(),
          });
        }
      }
    }
    return results;
  }, { box: nodeBox });

  // Find which elements block the click at center
  const centerHit = gridHits.find(h => h.dx === 0 && h.dy === 0);
  console.log('\nCenter elementFromPoint (dx=0, dy=0):', JSON.stringify(centerHit, null, 2));

  // Check what Playwright actually targets when locator().click() runs
  const clickTargetInfo = await page.evaluate(() => {
    // Listen for next click event to see actual target
    return new Promise(resolve => {
      const el = document.querySelector('#node-SIM-EXT-GRID');
      if (!el) { resolve({ error: 'no element' }); return; }
      const handler = (e) => {
        el.removeEventListener('click', handler);
        resolve({
          target: { tag: e.target.tagName, id: e.target.id || null, class: (e.target.className && e.target.className.baseVal !== undefined) ? e.target.className.baseVal : String(e.target.className) },
          currentTarget: { tag: e.currentTarget.tagName, id: e.currentTarget.id || null },
          pointer: e.pointerType || 'unknown',
          isTrusted: e.isTrusted,
        });
      };
      // Capture on the <g> itself
      el.addEventListener('click', handler, { once: true });
      // Simulate real click via page
      setTimeout(() => resolve({ timeout: true }), 3000);
    });
  });

  // Playwright real click to populate the above listener
  try {
    await page.locator('#node-SIM-EXT-GRID').click({ timeout: 4000 });
  } catch (_) {}
  await page.waitForTimeout(200);
  console.log('\nClick event capture on #node-SIM-EXT-GRID:', JSON.stringify(clickTargetInfo, null, 2));

  // Check SVG pointer-events on the <g> and children
  const pointerEventsAudit = await page.evaluate(() => {
    const g = document.querySelector('#node-SIM-EXT-GRID');
    if (!g) return { error: 'not found' };
    const results = [{ tag: g.tagName, id: g.id, pointerEvents: window.getComputedStyle(g).pointerEvents }];
    for (const child of g.children) {
      results.push({
        tag: child.tagName, id: child.id || null,
        class: (child.className && child.className.baseVal !== undefined) ? child.className.baseVal : String(child.className),
        pointerEvents: window.getComputedStyle(child).pointerEvents,
        childCount: child.children.length,
      });
      for (const grandchild of child.children) {
        results.push({
          tag: `  └${grandchild.tagName}`, id: grandchild.id || null,
          class: (grandchild.className && grandchild.className.baseVal !== undefined) ? grandchild.className.baseVal : String(grandchild.className),
          pointerEvents: window.getComputedStyle(grandchild).pointerEvents,
        });
      }
    }
    return results;
  });
  console.log('\nPointer-events audit for #node-SIM-EXT-GRID subtree:');
  for (const item of pointerEventsAudit) {
    console.log(`  ${item.tag}${item.id ? '#' + item.id : ''}${item.class ? '.' + item.class.slice(0, 30) : ''}: pointer-events=${item.pointerEvents}`);
  }

  // Check if SVG parent <g> has pointer-events from canvas transform
  const svgGroupAudit = await page.evaluate(() => {
    const layer = document.querySelector('#layer-utility-demo');
    if (!layer) return 'layer not found';
    const svgRoot = layer.closest('svg');
    const mainGroup = layer.closest('g[transform]');
    return {
      svgPointerEvents: svgRoot ? window.getComputedStyle(svgRoot).pointerEvents : null,
      mainGroupPointerEvents: mainGroup ? window.getComputedStyle(mainGroup).pointerEvents : null,
      layerPointerEvents: window.getComputedStyle(layer).pointerEvents,
      svgStyle: svgRoot ? svgRoot.getAttribute('style') : null,
    };
  });
  console.log('\nSVG + parent groups pointer-events:', JSON.stringify(svgGroupAudit, null, 2));

  // Write full grid hits to JSON for documentation
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'hit-test-grid-data.json'),
    JSON.stringify({ nodeBox, centerHit, hitInfo, gridHits, pointerEventsAudit, svgGroupAudit }, null, 2)
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'diag-02-hit-test-state.png') });
  await browser.close();
  console.log('\n=== Diagnostic complete. Data written to', EVIDENCE_DIR, '===');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
