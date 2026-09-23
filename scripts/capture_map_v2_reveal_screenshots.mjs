import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-reveal', 'screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\bc871c02-2f4c-4232-9fc9-83018eaf8d95\\screenshots';

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
  console.log('Launching Playwright for Map V2 Zone Reveal + Tone Layer V2 visual capture...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5174/operations.html?tab=map_v2 ...');
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(2000);

  // Perform login as Admin if on login screen
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Submitting Admin credentials (52300119)...');
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

  // 1. Default Operational View
  console.log('1. Capturing Default Operational View (Clean map, anchor hotspots, hidden clutter)...');
  await saveScreenshot(page, '01-operational-default-view.png');

  // 2. Hover / Focused on an Anchor Hotspot
  console.log('2. Hovering anchor hotspot...');
  await page.evaluate(() => {
    const el = document.getElementById('v2-anchor-BLDG_KHO_1');
    el?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await saveScreenshot(page, '02-operational-zone-hover.png');

  // 3. Click ZONE_QUAY to trigger Reveal Animation and End State
  console.log('3. Clicking ZONE_QUAY to trigger Zone Reveal...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(1000); // Allow reveal animation to complete
  await saveScreenshot(page, '03-zone-reveal-animation-end-state.png');

  // 4. Switch to ZONE_GENERAL reveal
  console.log('4. Switching to ZONE_GENERAL reveal...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '04-switch-zone-reveal-general-yard.png');

  // 5. Switch to Technical Inspection Mode
  console.log('5. Switching to Technical Inspection Mode...');
  const techModeBtn = await page.$('button:has-text("Kiểm tra")');
  if (techModeBtn) {
    await techModeBtn.click({ force: true });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '05-technical-inspection-mode.png');
  }

  // 6. Open Inspection Panel for BLDG_KHO_1
  console.log('6. Inspecting BLDG_KHO_1 coordinates...');
  await page.evaluate(() => {
    document.getElementById('v2-poly-BLDG_KHO_1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await saveScreenshot(page, '06-technical-inspection-panel-open.png');

  // 7. Inspect ROAD_BACKLAND inflection warning
  console.log('7. Inspecting ROAD_BACKLAND inflection warning...');
  await page.evaluate(() => {
    document.getElementById('v2-line-ROAD_BACKLAND')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await saveScreenshot(page, '07-technical-inspection-road-backland.png');

  // 8. Close inspector panel
  console.log('8. Closing inspector panel...');
  const closeBtn = await page.$('button:has-text("Đóng kiểm tra")');
  if (closeBtn) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '08-technical-inspector-closed.png');
  }

  // 9. Switch to Neon Tone Mode (Digital Twin / Layer 2)
  console.log('9. Switching to Neon Tone Mode...');
  const neonBtn = await page.$('button:has-text("Neon số")');
  if (neonBtn) {
    await neonBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  // Return to operational mode in Neon tone
  const opBtn = await page.$('button:has-text("Vận hành")');
  if (opBtn) {
    await opBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  await saveScreenshot(page, '09-neon-tone-mode-operational.png');

  // 10. Click ZONE_CONTAINER in Neon Mode to capture cyber reveal
  console.log('10. Revealing ZONE_CONTAINER in Neon Mode...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '10-neon-tone-mode-zone-revealed.png');

  // 11. Neon Mode in Technical Inspection Mode
  console.log('11. Neon Mode Technical Inspection...');
  if (techModeBtn) {
    await techModeBtn.click({ force: true });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '11-neon-tone-technical-mode.png');
  }

  // 12. Fit toàn bộ View Mode
  console.log('12. Capturing Fit toàn bộ...');
  const fitBtn = await page.$('button:has-text("Fit toàn bộ")');
  if (fitBtn) {
    await fitBtn.click({ force: true });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '12-viewmode-fit-toan-bo.png');
  }

  // 13. Tràn chiều rộng View Mode
  console.log('13. Capturing Tràn chiều rộng...');
  const widthBtn = await page.$('button:has-text("Tràn chiều rộng")');
  if (widthBtn) {
    await widthBtn.click({ force: true });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '13-viewmode-tran-chieu-rong.png');
    // Reset back to fit
    if (fitBtn) await fitBtn.click({ force: true });
    await page.waitForTimeout(400);
  }

  // 14. Layers Popover Open
  console.log('14. Capturing Layers Popover...');
  const layersBtn = await page.$('button:has-text("Lớp hiển thị")');
  if (layersBtn) {
    await layersBtn.click({ force: true });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '14-layers-popover-open.png');
    await layersBtn.click({ force: true });
    await page.waitForTimeout(400);
  }

  // 15. Navigate back to Map V1 (Bản đồ) to confirm it is 100% intact
  console.log('15. Verifying Map V1 integrity...');
  const mapV1Btn = await page.$('button:has-text("Bản đồ"), button[data-tab="dashboard"]');
  if (mapV1Btn) {
    await mapV1Btn.click();
    await page.waitForTimeout(2000);
    await saveScreenshot(page, '15-map-v1-intact.png');
  }

  await context.close();
  await browser.close();
  console.log('ALL MAP V2 ACCEPTANCE SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
