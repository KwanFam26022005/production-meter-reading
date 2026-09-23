import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-animated-employee-markers', 'screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\58bfd954-e284-48d8-9f11-ff47cbf9e437\\screenshots';

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
  console.log('Launching Edge for Animated Employee Markers visual acceptance...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/operations.html?tab=map_v2 ...');
  await page.goto('http://localhost:5173/operations.html?tab=map_v2');
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
  await page.waitForTimeout(1500);

  // 1. Overview Default (1920x1080)
  console.log('Capturing 01: Default Overview (1920x1080)...');
  await saveScreenshot(page, '01_map_v2_overview_default.png');

  // 2. Hover / Focus preview on DEMO_NV001
  console.log('Capturing 03: Marker Hover & Preview Card...');
  const marker = await page.$('#emp-marker-DEMO_NV001');
  if (marker) {
    await marker.hover({ force: true });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '03_map_v2_employee_marker_hover_preview.png');
  }

  // 3. Selected Marker with Inspector Open (Focus + Enter to activate selection)
  console.log('Capturing 04: Selected Marker with Inspector...');
  if (marker) {
    await marker.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.map-v2-inspector-panel', { timeout: 8000 });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '04_map_v2_employee_marker_selected_inspector.png');
  }

  // 4. Closeup on Employee Marker
  console.log('Capturing 02: Employee Marker Closeup...');
  const zoomInBtn = await page.$('button[title*="Phóng to"], button[aria-label*="Phóng to"]');
  if (zoomInBtn) {
    await zoomInBtn.click({ force: true });
    await page.waitForTimeout(400);
    await zoomInBtn.click({ force: true });
    await page.waitForTimeout(600);
  }
  await saveScreenshot(page, '02_map_v2_employee_marker_closeup.png');

  // Reset zoom back
  const fitBtn = await page.$('button[title*="Fit toàn bộ"], button:has-text("Fit toàn bộ")');
  if (fitBtn) {
    await fitBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Deselect marker by closing inspector
  const closeInspectorBtn = await page.$('.map-v2-inspector-header button');
  if (closeInspectorBtn) {
    await closeInspectorBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // 5. HUD Play/Pause Button
  console.log('Capturing 05: HUD Play/Pause Toggle...');
  const motionToggle = await page.$('.map-v2-motion-toggle');
  if (motionToggle) {
    await motionToggle.click({ force: true });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '05_map_v2_hud_motion_pause.png');
    // Resume motion
    await motionToggle.click({ force: true });
    await page.waitForTimeout(500);
  }

  // 6. Layer Manager popover
  console.log('Capturing 06: Layer Manager with Layer 7...');
  const layersBtn = await page.$('button:has-text("Lớp hiển thị")');
  if (layersBtn) {
    await layersBtn.click({ force: true });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '06_map_v2_layer_manager.png');
    await layersBtn.click({ force: true }); // Close
    await page.waitForTimeout(500);
  }

  // 7. Technical Network Simulation Mode (Markers Suppressed)
  console.log('Capturing 07: Technical Network Simulation Mode (Suppressed Markers)...');
  const elecBtn = await page.$('button[title*="lưới điện"], button[title*="điện"]');
  if (elecBtn) {
    await elecBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '07_map_v2_technical_network_mode.png');
    // Turn back off
    const offBtn = await page.$('button[title*="Tắt lớp mạng"]');
    if (offBtn) await offBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // 8. Viewport 1440x900
  console.log('Capturing 08: Viewport 1440x900...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '08_map_v2_viewport_1440x900.png');

  // 9. Viewport 1280x800
  console.log('Capturing 09: Viewport 1280x800...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '09_map_v2_viewport_1280x800.png');

  await browser.close();
  console.log('Visual acceptance capture complete!');
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
