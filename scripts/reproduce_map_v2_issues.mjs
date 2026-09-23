import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-camera-and-animation-fix', 'evidence', 'baseline');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser for reproduction analysis...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // Test at 1366x768 (standard enterprise laptop)
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1.0,
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5174/operations.html?tab=map_v2 ...');
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(2000);

  // Login if needed
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }

  // Ensure Map V2 tab is active
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Measure initial camera state
  const initialMetrics = await page.evaluate(() => {
    const canvasWrapper = document.querySelector('.map-v2-canvas-wrapper');
    const svgGroup = canvasWrapper?.querySelector('svg > g');
    const transform = svgGroup?.getAttribute('transform');
    const rect = canvasWrapper?.getBoundingClientRect();

    const getElRect = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { id, x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom, right: b.right };
    };

    return {
      canvasRect: rect ? { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom } : null,
      transform,
      gateA: getElRect('v2-marker-GATE_A'),
      gateB: getElRect('v2-marker-GATE_B'),
      adminAnchor: getElRect('v2-anchor-ZONE_ADMIN'),
      quayAnchor: getElRect('v2-anchor-ZONE_QUAY'),
      generalAnchor: getElRect('v2-anchor-ZONE_GENERAL'),
      containerAnchor: getElRect('v2-anchor-ZONE_CONTAINER'),
      kho1Anchor: getElRect('v2-anchor-BLDG_KHO_1'),
      kho2Anchor: getElRect('v2-anchor-BLDG_KHO_2'),
      kho4Anchor: getElRect('v2-anchor-BLDG_KHO_4'),
    };
  });

  console.log('Initial Metrics (1366x768):', JSON.stringify(initialMetrics, null, 2));

  // Baseline screenshot of initial framing
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-baseline-initial-framing-1366x768.png') });

  // Inspect all circles in DOM currently
  const initialCircles = await page.evaluate(() => {
    const circles = Array.from(document.querySelectorAll('circle'));
    return circles.map(c => ({
      tagName: 'circle',
      className: c.getAttribute('class') || '',
      id: c.getAttribute('id') || '',
      r: c.getAttribute('r'),
      cx: c.getAttribute('cx'),
      cy: c.getAttribute('cy'),
      parent: c.parentElement ? `${c.parentElement.tagName}#${c.parentElement.id}.${c.parentElement.className}` : null,
      computedStyle: {
        stroke: window.getComputedStyle(c).stroke,
        fill: window.getComputedStyle(c).fill,
        animation: window.getComputedStyle(c).animation,
        opacity: window.getComputedStyle(c).opacity,
      },
      rect: c.getBoundingClientRect()
    }));
  });

  console.log(`Initial circles count: ${initialCircles.length}`);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'initial_circles.json'), JSON.stringify(initialCircles, null, 2));

  // Now click on Administrative Office
  console.log('Clicking Administrative Office anchor: #v2-anchor-ZONE_ADMIN ...');
  await page.evaluate(() => {
    const anchor = document.getElementById('v2-anchor-ZONE_ADMIN');
    anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // Sample bounding box of elements at 0ms, 300ms, 600ms, 1500ms, 5000ms, 10000ms
  const intervals = [0, 300, 600, 1500, 5000, 10000];
  const samples = [];

  let startT = Date.now();
  for (let i = 0; i < intervals.length; i++) {
    const targetWait = intervals[i] - (Date.now() - startT);
    if (targetWait > 0) {
      await page.waitForTimeout(targetWait);
    }
    const elapsed = Date.now() - startT;

    const sample = await page.evaluate((elElapsed) => {
      // Find all elements that might be the "growing rectangle"
      const allElements = Array.from(document.querySelectorAll('.map-v2-container *'));
      const card = document.querySelector('.map-v2-operational-card');
      const cardRect = card ? card.getBoundingClientRect() : null;

      const adminPoly = document.getElementById('v2-poly-ZONE_ADMIN');
      const adminPolyRect = adminPoly ? adminPoly.getBoundingClientRect() : null;

      const revealWave = document.querySelector('.map-v2-reveal-wave');
      const waveRect = revealWave ? revealWave.getBoundingClientRect() : null;

      const revealCircle = document.querySelector('.map-v2-reveal-circle');
      const circleRect = revealCircle ? revealCircle.getBoundingClientRect() : null;

      const adminAnchor = document.getElementById('v2-anchor-ZONE_ADMIN');
      const adminAnchorRect = adminAnchor ? adminAnchor.getBoundingClientRect() : null;

      // Find any element with rect/outline/border
      const rectElements = Array.from(document.querySelectorAll('rect, [class*="card"], [class*="poly"], [class*="radar"], [class*="wave"]')).map(el => {
        const b = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id,
          class: el.className ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          width: Math.round(b.width * 100) / 100,
          height: Math.round(b.height * 100) / 100,
          x: Math.round(b.x * 100) / 100,
          y: Math.round(b.y * 100) / 100,
        };
      });

      return {
        elapsed: elElapsed,
        cardRect: cardRect ? { width: cardRect.width, height: cardRect.height, x: cardRect.x, y: cardRect.y } : null,
        adminPolyRect: adminPolyRect ? { width: adminPolyRect.width, height: adminPolyRect.height, x: adminPolyRect.x, y: adminPolyRect.y } : null,
        waveRect: waveRect ? { width: waveRect.width, height: waveRect.height, x: waveRect.x, y: waveRect.y } : null,
        circleRect: circleRect ? { width: circleRect.width, height: circleRect.height, x: circleRect.x, y: circleRect.y } : null,
        adminAnchorRect: adminAnchorRect ? { width: adminAnchorRect.width, height: adminAnchorRect.height } : null,
        rectElements,
      };
    }, elapsed);

    samples.push(sample);
    console.log(`Sample at ${elapsed}ms:`, {
      card: sample.cardRect,
      adminPoly: sample.adminPolyRect,
      wave: sample.waveRect,
      circle: sample.circleRect,
    });

    if (intervals[i] === 1500) {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-baseline-admin-selected-1500ms.png') });
    }
    if (intervals[i] === 10000) {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-baseline-admin-selected-10000ms.png') });
    }
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'admin_selection_samples.json'), JSON.stringify(samples, null, 2));

  // Inspect all circles when zone is selected
  const selectedCircles = await page.evaluate(() => {
    const circles = Array.from(document.querySelectorAll('circle'));
    return circles.map(c => ({
      tagName: 'circle',
      className: c.getAttribute('class') || '',
      id: c.getAttribute('id') || '',
      r: c.getAttribute('r'),
      cx: c.getAttribute('cx'),
      cy: c.getAttribute('cy'),
      parent: c.parentElement ? `${c.parentElement.tagName}#${c.parentElement.id}.${c.parentElement.className}` : null,
      computedStyle: {
        stroke: window.getComputedStyle(c).stroke,
        fill: window.getComputedStyle(c).fill,
        animation: window.getComputedStyle(c).animation,
        opacity: window.getComputedStyle(c).opacity,
      },
      rect: c.getBoundingClientRect()
    }));
  });

  console.log(`Circles count after selection: ${selectedCircles.length}`);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'selected_circles.json'), JSON.stringify(selectedCircles, null, 2));

  await browser.close();
  console.log('Reproduction analysis finished successfully.');
}

run().catch(err => {
  console.error('Error during reproduction analysis:', err);
  process.exit(1);
});
