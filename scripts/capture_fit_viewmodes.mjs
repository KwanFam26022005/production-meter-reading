import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DOCS_SCREENSHOTS = path.resolve(__dirname, '../docs/implementation/admin-map-v2/screenshots');
const ARTIFACT_SCREENSHOTS = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\5e2f3100-3d5a-4b3f-944d-743a9beedcd6\\screenshots';

fs.mkdirSync(DOCS_SCREENSHOTS, { recursive: true });
fs.mkdirSync(ARTIFACT_SCREENSHOTS, { recursive: true });

async function saveScreenshot(page, filename) {
  const p1 = path.join(DOCS_SCREENSHOTS, filename);
  const p2 = path.join(ARTIFACT_SCREENSHOTS, filename);
  await page.screenshot({ path: p1, fullPage: false });
  await page.screenshot({ path: p2, fullPage: false });
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Starting Playwright capture for Map V2 fit modes...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // -------------------------------------------------------------
  // 1. VIEWPORT 1920 x 1080
  // -------------------------------------------------------------
  const ctx1920 = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
  });
  const page1920 = await ctx1920.newPage();

  console.log('Navigating 1920x1080 to http://localhost:5173/operations.html?tab=map_v2 ...');
  await page1920.goto('http://localhost:5173/operations.html?tab=map_v2');
  await page1920.waitForTimeout(2500);

  // Login if necessary
  const isLogin1920 = await page1920.$('#employeeCode');
  if (isLogin1920) {
    console.log('Logging in as Admin (52300119)...');
    await page1920.fill('#employeeCode', '52300119');
    await page1920.fill('#password', 'Admin123456!');
    await page1920.click('button[type="submit"]');
    await page1920.waitForTimeout(3000);
  }

  // Ensure Map V2 tab is active
  const mapV2Btn = await page1920.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Btn) {
    await mapV2Btn.click();
    await page1920.waitForTimeout(1500);
  }

  await page1920.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page1920.waitForTimeout(1500);

  // 1. 1920x1080 Mode: Fit toàn bộ (contain)
  await page1920.click('button:has-text("Fit toàn bộ")');
  await page1920.waitForTimeout(600);
  await saveScreenshot(page1920, '01-map-v2-1920x1080-contain.png');

  // 2. 1920x1080 Mode: Tràn chiều rộng (width)
  await page1920.click('button:has-text("Tràn chiều rộng")');
  await page1920.waitForTimeout(600);
  await saveScreenshot(page1920, '02-map-v2-1920x1080-width.png');

  // 3. Open layer popover in Tràn chiều rộng mode
  const layersBtn = await page1920.$('button:has-text("Lớp hiển thị")');
  if (layersBtn) {
    await layersBtn.click();
    await page1920.waitForTimeout(500);
    await saveScreenshot(page1920, '03-map-v2-1920x1080-layers.png');
    await layersBtn.click(); // close
    await page1920.waitForTimeout(300);
  }

  // 4. Click ZONE_QUAY to inspect
  await page1920.evaluate(() => {
    document.getElementById('v2-poly-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page1920.waitForTimeout(800);
  await saveScreenshot(page1920, '04-map-v2-1920x1080-inspection.png');

  // 5. Navigate to Map V1 to confirm 100% intact
  const mapV1Btn = await page1920.$('button:has-text("Bản đồ"), button[data-tab="dashboard"]');
  if (mapV1Btn) {
    await mapV1Btn.click();
    await page1920.waitForTimeout(2000);
    await saveScreenshot(page1920, '08-map-v1-intact.png');
  }

  await ctx1920.close();

  // -------------------------------------------------------------
  // 2. VIEWPORT 1440 x 900
  // -------------------------------------------------------------
  const ctx1440 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.0,
  });
  const page1440 = await ctx1440.newPage();

  console.log('Navigating 1440x900 to http://localhost:5173/operations.html?tab=map_v2 ...');
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
    await page1440.waitForTimeout(1500);
  }

  await page1440.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page1440.waitForTimeout(1500);

  // 5. 1440x900 Mode: Fit toàn bộ (contain)
  await page1440.click('button:has-text("Fit toàn bộ")');
  await page1440.waitForTimeout(600);
  await saveScreenshot(page1440, '05-map-v2-1440x900-contain.png');

  // 6. 1440x900 Mode: Tràn chiều rộng (width)
  await page1440.click('button:has-text("Tràn chiều rộng")');
  await page1440.waitForTimeout(600);
  await saveScreenshot(page1440, '06-map-v2-1440x900-width.png');

  // 7. Click Gate A marker in 1440x900
  await page1440.evaluate(() => {
    document.getElementById('v2-marker-GATE_A')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page1440.waitForTimeout(800);
  await saveScreenshot(page1440, '07-map-v2-1440x900-gate-inspection.png');

  await ctx1440.close();
  await browser.close();
  console.log('All fit mode screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error capturing fit mode screenshots:', err);
  process.exit(1);
});
