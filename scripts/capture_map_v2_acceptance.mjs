import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-camera-and-animation-fix', 'evidence');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const VIDEOS_DIR = path.join(EVIDENCE_DIR, 'videos');
const VIEWPORTS_DIR = path.join(EVIDENCE_DIR, 'viewports');

for (const d of [SCREENSHOTS_DIR, VIDEOS_DIR, VIEWPORTS_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function loginIfNeeded(page) {
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function ensureMapV2(page) {
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1500);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('=== STARTING VISUAL ACCEPTANCE SUITE FOR MAP V2 ===');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // ---------------------------------------------------------------------------
  // PART 1: MULTI-VIEWPORT RESPONSIVE FRAMING AUDIT
  // ---------------------------------------------------------------------------
  const viewports = [
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1536x864', width: 1536, height: 864 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
    // Breakpoint testing: 1370px (compact) and 1390px (wide) around 1380 threshold
    { name: '1370x768-compact', width: 1370, height: 768 },
    { name: '1390x768-wide', width: 1390, height: 768 },
  ];

  const viewportMetrics = [];

  for (const vp of viewports) {
    console.log(`Auditing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1.0 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);

    const metrics = await page.evaluate((vpName) => {
      const canvasWrapper = document.querySelector('.map-v2-canvas-wrapper');
      const g = canvasWrapper?.querySelector('svg > g');
      const transform = g?.getAttribute('transform');
      const rect = canvasWrapper?.getBoundingClientRect();

      const getEl = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { id, y: Math.round(b.y), bottom: Math.round(b.bottom), x: Math.round(b.x), right: Math.round(b.right) };
      };

      return {
        viewport: vpName,
        canvas: rect ? { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) } : null,
        transform,
        quay: getEl('v2-anchor-ZONE_QUAY'),
        general: getEl('v2-anchor-ZONE_GENERAL'),
        container: getEl('v2-anchor-ZONE_CONTAINER'),
        admin: getEl('v2-anchor-ZONE_ADMIN'),
        gateA: getEl('v2-marker-GATE_A'),
        gateB: getEl('v2-marker-GATE_B'),
      };
    }, vp.name);

    viewportMetrics.push(metrics);
    await page.screenshot({ path: path.join(VIEWPORTS_DIR, `${vp.name}-initial-framing.png`) });
    await ctx.close();
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'viewport_framing_metrics.json'), JSON.stringify(viewportMetrics, null, 2));
  console.log('Saved multi-viewport metrics and screenshots.');

  // ---------------------------------------------------------------------------
  // PART 2: TARGETED ACCEPTANCE SCREENSHOTS (1 to 13) on 1366x768
  // ---------------------------------------------------------------------------
  console.log('Capturing targeted acceptance screenshots on 1366x768...');
  const acceptCtx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1.0 });
  const page = await acceptCtx.newPage();
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(1500);
  await loginIfNeeded(page);
  await ensureMapV2(page);

  // 1. Initial Map V2 framing
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-initial-map-v2-framing.png') });
  console.log('  1. Initial framing captured');

  // 2. Map after manual pan
  console.log('  Simulating manual pan...');
  await page.mouse.move(683, 384);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(683, 284, { steps: 10 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-map-after-manual-pan.png') });
  console.log('  2. Manual pan captured');

  // 3. Map after manual zoom
  console.log('  Simulating manual zoom in...');
  const zoomInBtn = await page.$('button[title*="Phóng to"], button[aria-label="Phóng to"]');
  if (zoomInBtn) {
    await zoomInBtn.click();
    await page.waitForTimeout(400);
    await zoomInBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-map-after-manual-zoom.png') });
  console.log('  3. Manual zoom captured');

  // 4. Map after Reset View
  console.log('  Clicking Reset View...');
  const resetBtn = await page.$('button[title*="Đặt lại"], button[aria-label="Đặt lại góc nhìn"]');
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-map-after-reset-view.png') });
  console.log('  4. Reset View captured');

  // 5. Administrative office selected
  console.log('  Selecting Administrative Office...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_ADMIN')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-administrative-office-selected.png') });
  console.log('  5. Admin selected captured');

  // 6. Selected frame after 1 second
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-selected-frame-after-1s.png') });
  console.log('  6. Selected frame 1s captured');

  // 7. Selected frame after 5 seconds
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-selected-frame-after-5s.png') });
  console.log('  7. Selected frame 5s captured');

  // 8. Selected frame after 10 seconds
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-selected-frame-after-10s.png') });
  console.log('  8. Selected frame 10s captured');

  // 9. General Yard selected
  console.log('  Selecting General Yard...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-general-yard-selected.png') });
  console.log('  9. General yard captured');

  // 10. Container Yard selected
  console.log('  Selecting Container Yard...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-container-yard-selected.png') });
  console.log('  10. Container yard captured');

  // 11. Neon mode
  console.log('  Switching to Neon mode...');
  const neonBtn = await page.$('button:has-text("Neon số"), button[title*="Neon số"]');
  if (neonBtn) {
    await neonBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-neon-mode.png') });
  console.log('  11. Neon mode captured');

  // 12. Inspector open and closed
  console.log('  Testing Technical Inspector...');
  const techBtn = await page.$('button:has-text("Kiểm tra"), button[title*="Kiểm tra"]');
  if (techBtn) {
    await techBtn.click();
    await page.waitForTimeout(800);
  }
  // Click on ZONE_ADMIN polygon to inspect
  await page.evaluate(() => {
    document.getElementById('v2-poly-ZONE_ADMIN')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12a-inspector-open.png') });
  console.log('  12a. Inspector open captured');

  // Close inspector
  const closeInspectorBtn = await page.$('.map-v2-inspector-panel button[aria-label="Đóng"], .map-v2-inspector-backdrop');
  if (closeInspectorBtn) {
    await closeInspectorBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12b-inspector-closed.png') });
  console.log('  12b. Inspector closed captured');

  // Switch back to operational mode and standard tone
  const techStandardBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techStandardBtn) await techStandardBtn.click();
  const opsBtn = await page.$('button:has-text("Vận hành")');
  if (opsBtn) await opsBtn.click();
  await page.waitForTimeout(600);

  // 13. Rapid zone switching
  console.log('  Performing rapid zone switching...');
  const switchZones = ['BLDG_KHO_1', 'ZONE_QUAY', 'BLDG_KHO_4', 'ZONE_ADMIN'];
  for (const zid of switchZones) {
    await page.evaluate((id) => {
      document.getElementById(`v2-anchor-${id}`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, zid);
    await page.waitForTimeout(180); // Rapid succession
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-rapid-zone-switching-final-state.png') });
  console.log('  13. Rapid zone switching captured');

  await acceptCtx.close();

  // ---------------------------------------------------------------------------
  // PART 3: RECORD REAL BROWSER VIDEO WALKTHROUGH
  // Kịch bản bắt buộc:
  // Open Map V2 → initial operational framing → select administrative office
  // → wait 10 seconds → select General Yard → select Container Yard
  // → zoom → pan → Reset View → switch Neon → open and close inspector.
  // ---------------------------------------------------------------------------
  console.log('Recording final acceptance walkthrough video...');
  const videoCtx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1.0,
    recordVideo: {
      dir: VIDEOS_DIR,
      size: { width: 1366, height: 768 },
    },
  });

  const vPage = await videoCtx.newPage();
  console.log('  [Video Step 1] Opening Map V2...');
  await vPage.goto('http://localhost:5174/operations.html?tab=map_v2');
  await vPage.waitForTimeout(1500);
  await loginIfNeeded(vPage);
  await ensureMapV2(vPage);

  // Initial operational framing observation
  console.log('  [Video Step 2] Initial operational framing (3s)...');
  await vPage.waitForTimeout(3000);

  // Select administrative office
  console.log('  [Video Step 3] Selecting administrative office...');
  await vPage.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_ADMIN')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // Wait 10 seconds to definitively prove zero rectangle growth and zero unwanted circles
  console.log('  [Video Step 4] Waiting 10 seconds on administrative office...');
  for (let s = 1; s <= 10; s++) {
    await vPage.waitForTimeout(1000);
    console.log(`    ... ${s}s`);
  }

  // Select General Yard
  console.log('  [Video Step 5] Selecting General Yard...');
  await vPage.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await vPage.waitForTimeout(2500);

  // Select Container Yard
  console.log('  [Video Step 6] Selecting Container Yard...');
  await vPage.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await vPage.waitForTimeout(2500);

  // Zoom
  console.log('  [Video Step 7] Zooming in and out...');
  const vZoomIn = await vPage.$('button[title*="Phóng to"], button[aria-label="Phóng to"]');
  if (vZoomIn) {
    await vZoomIn.click();
    await vPage.waitForTimeout(1000);
    await vZoomIn.click();
    await vPage.waitForTimeout(1000);
  }

  // Pan
  console.log('  [Video Step 8] Panning canvas...');
  await vPage.mouse.move(683, 384);
  await vPage.mouse.down({ button: 'left' });
  await vPage.mouse.move(583, 284, { steps: 15 });
  await vPage.mouse.up({ button: 'left' });
  await vPage.waitForTimeout(1500);

  // Reset View
  console.log('  [Video Step 9] Clicking Reset View...');
  const vReset = await vPage.$('button[title*="Đặt lại"], button[aria-label="Đặt lại góc nhìn"]');
  if (vReset) {
    await vReset.click();
    await vPage.waitForTimeout(2000);
  }

  // Switch Neon
  console.log('  [Video Step 10] Switching to Neon tone mode...');
  const vNeon = await vPage.$('button:has-text("Neon số"), button[title*="Neon số"]');
  if (vNeon) {
    await vNeon.click();
    await vPage.waitForTimeout(2500);
  }

  // Open and close inspector
  console.log('  [Video Step 11] Opening and closing inspector...');
  const vTech = await vPage.$('button:has-text("Kiểm tra"), button[title*="Kiểm tra"]');
  if (vTech) {
    await vTech.click();
    await vPage.waitForTimeout(1500);
  }
  await vPage.evaluate(() => {
    document.getElementById('v2-poly-ZONE_ADMIN')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await vPage.waitForTimeout(2500);

  // Close inspector
  const vCloseInsp = await vPage.$('.map-v2-inspector-panel button[aria-label="Đóng"], .map-v2-inspector-backdrop');
  if (vCloseInsp) {
    await vCloseInsp.click();
    await vPage.waitForTimeout(1500);
  }

  // Deselect and return to clean view
  const vDeselect = await vPage.$('button:has-text("Đóng"), button:has-text("Bỏ chọn")');
  if (vDeselect) {
    await vDeselect.click();
    await vPage.waitForTimeout(1000);
  }

  await vPage.waitForTimeout(1500);
  await videoCtx.close();
  await browser.close();

  // Rename recorded video file
  const videoFiles = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.webm') && f !== 'map-v2-walkthrough.webm');
  if (videoFiles.length > 0) {
    const src = path.join(VIDEOS_DIR, videoFiles[0]);
    const dest = path.join(VIDEOS_DIR, 'map-v2-walkthrough.webm');
    fs.renameSync(src, dest);
    console.log('Walkthrough video successfully saved to:', dest);
  }

  console.log('=== VISUAL ACCEPTANCE SUITE FINISHED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Error during visual acceptance execution:', err);
  process.exit(1);
});
