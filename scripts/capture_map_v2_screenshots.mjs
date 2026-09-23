import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2', 'screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\5e2f3100-3d5a-4b3f-944d-743a9beedcd6\\screenshots';

for (const d of [OUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function saveScreenshot(page, filename) {
  const p1 = path.join(OUT_DIR, filename);
  const p2 = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Starting Playwright for Map V2 visual acceptance capture...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // -------------------------------------------------------------
  // VIEWPORT 1: 1920 x 1080
  // -------------------------------------------------------------
  const context1920 = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
  });
  const page1920 = await context1920.newPage();

  console.log('Navigating to http://localhost:5173/operations.html?tab=map_v2 ...');
  await page1920.goto('http://localhost:5173/operations.html?tab=map_v2');
  await page1920.waitForTimeout(2500);

  // Login if necessary
  const isLogin = await page1920.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page1920.fill('#employeeCode', '52300119');
    await page1920.fill('#password', 'Admin123456!');
    await page1920.click('button[type="submit"]');
    await page1920.waitForTimeout(3000);
  }

  // Ensure Map V2 tab is selected
  const mapV2Btn = await page1920.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Btn) {
    await mapV2Btn.click();
    await page1920.waitForTimeout(2000);
  }

  await page1920.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page1920.waitForTimeout(1500);

  // 1. Full 1920x1080 Map V2
  await saveScreenshot(page1920, '01-map-v2-1920x1080.png');

  // 2. Open layers popover
  const layersBtn = await page1920.$('button:has-text("Lớp hiển thị")');
  if (layersBtn) {
    await layersBtn.click();
    await page1920.waitForTimeout(600);
    await saveScreenshot(page1920, '02-map-v2-layers-popover.png');
    // Close popover
    await layersBtn.click();
    await page1920.waitForTimeout(400);
  }

  // 3. Click ZONE_QUAY to inspect
  await page1920.evaluate(() => {
    document.getElementById('v2-poly-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page1920.waitForTimeout(800);
  await saveScreenshot(page1920, '03-map-v2-inspection-panel.png');

  // 4. Click ROAD_BACKLAND to inspect inflection notice
  await page1920.evaluate(() => {
    document.getElementById('v2-line-ROAD_BACKLAND')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page1920.waitForTimeout(800);
  await saveScreenshot(page1920, '04-map-v2-road-backland-inspection.png');

  // 5. Navigate back to Map V1 (Bản đồ) to confirm it is 100% intact
  const mapV1Btn = await page1920.$('button:has-text("Bản đồ"), button[data-tab="dashboard"]');
  if (mapV1Btn) {
    await mapV1Btn.click();
    await page1920.waitForTimeout(2000);
    await saveScreenshot(page1920, '05-map-v1-intact.png');
  }

  await context1920.close();

  // -------------------------------------------------------------
  // VIEWPORT 2: 1440 x 900
  // -------------------------------------------------------------
  const context1440 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.0,
  });
  const page1440 = await context1440.newPage();
  await page1440.goto('http://localhost:5173/operations.html?tab=map_v2');
  await page1440.waitForTimeout(2500);

  const isLogin1440 = await page1440.$('#employeeCode');
  if (isLogin1440) {
    await page1440.fill('#employeeCode', '52300119');
    await page1440.fill('#password', 'Admin123456!');
    await page1440.click('button[type="submit"]');
    await page1440.waitForTimeout(3000);
  }

  const mapV2Btn1440 = await page1440.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Btn1440) {
    await mapV2Btn1440.click();
    await page1440.waitForTimeout(2000);
  }

  await page1440.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page1440.waitForTimeout(1500);

  // 6. Full 1440x900 Map V2
  await saveScreenshot(page1440, '06-map-v2-1440x900.png');

  // 7. Click Gate A marker
  await page1440.evaluate(() => {
    document.getElementById('v2-marker-GATE_A')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page1440.waitForTimeout(800);
  await saveScreenshot(page1440, '07-map-v2-gate-inspection-1440x900.png');

  await context1440.close();
  await browser.close();

  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
